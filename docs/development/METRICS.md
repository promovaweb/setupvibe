# Coletor e métricas

> Implementado na v2: processo independente, métricas locais e retenção fixa de sete dias.

## Contrato

O executável `setupvibe collector run` opera sem depender da TUI. Ele usa
`metrics.db`, enquanto instalações e operações permanecem em `setupvibe.db`.
A coleta não instala ferramentas, altera serviços nem aplica limites de recursos.
Existe somente um coletor por diretório, protegido por lock de kernel.
Diretórios distintos podem manter coletores distintos; isso duplica trabalho.

A retenção de **sete dias** é requisito definido. O intervalo de **cinco segundos**
é a escolha técnica inicial, configurável entre 1 e 3600 segundos. Não é uma
exigência de amostragem fixa. A [supervisão nativa](SUPERVISION-AGENTS.md)
instala unidades systemd/launchd; este módulo também permite execução em foreground.

## Comandos e fluxo

```bash
setupvibe collector run --interval 5 --yes
setupvibe collector run --once --yes --output json
setupvibe collector run --samples 3 --interval 1 --yes --output json
setupvibe metrics current --scope host --max-age 30 --output json
setupvibe metrics current --scope container --limit 100 --offset 0 --output json
setupvibe metrics history --scope host --from 2026-10-22T10:00:00Z --limit 100 --output json
```

Fluxo: confirmar escrita → obter lock → abrir banco e criar sessão → iniciar
host e Docker em ciclos separados → gravar amostras → limpar lotes vencidos →
aguardar próximo ciclo. SIGINT/SIGTERM encerram a execução, registram estado
`stopped` e retornam código 130. `--once` produz um ciclo do host; `--samples N`
limita os ciclos do host. O Docker encerra sua requisição em curso e não tem
garantia de observar todos os containers nesses modos limitados.

`--dry-run` não cria estado. A coleta exige `--yes`, inclusive quando não houver
terminal. A saída JSON contém somente o resultado ao término; NDJSON também
contém eventos de abertura/resultado. As amostras são consultadas no banco,
não transmitidas continuamente pelo stdout do coletor.

## Escopos e unidades

| Escopo | Recurso | Conteúdo |
| --- | --- | --- |
| `host` | `host` | CPU agregada em percentual, CPUs lógicas, RAM total/usada/disponível e swap em bytes |
| `disk` | Ponto de montagem | Capacidade/disponível em bytes; I/O por segundo quando os contadores permitem |
| `container` | ID Docker | Estado, CPU, memória bruta/cache/conjunto ativo, limite observado e origem |
| `source` | `docker` | Disponibilidade da fonte, quantidade descoberta e falhas individuais de stats |

O host usa sysinfo 0.37.2. A primeira leitura de CPU retorna `null` e
`cpu_status: warming_up`; as seguintes usam o delta entre observações. CPU
agregada do host fica na escala 0–100%. CPU do container usa delta de CPU do
container dividido pelo delta de CPU do sistema Docker, multiplicado pelo
número de CPUs e por 100. Pode ultrapassar 100% quando usa múltiplos núcleos.
Contadores reiniciados, ausentes ou intervalos interrompidos produzem `null`.

Memória do container inclui o consumo bruto e o cache informado pelo daemon.
O conjunto ativo é `max(usage - inactive_file, 0)`, usando `total_inactive_file`
quando fornecido pelo cgroup v1. Sem os dois contadores, o valor é `null`.
O limite é observado, nunca modificado. Nenhum campo Env, token ou label privada
do Docker é gravado. Nomes de containers, endpoints locais e montagens são
informações operacionais, armazenadas em arquivos privados.

Discos refletem as montagens expostas pelo sistema, não todos os dispositivos
físicos. tmpfs não faz parte da configuração sysinfo utilizada. I/O pode ser
indisponível em alguns sistemas/filesystems: `io: null` evita afirmar consumo
zero quando não houve comprovação de suporte. Montagens removidas geram uma
amostra indisponível. Um dispositivo exposto em várias montagens pode aparecer
mais de uma vez; não some esses contadores como se fossem discos distintos.

## Docker e plataformas

O coletor consulta somente contexto local com socket Unix, respeitando
`DOCKER_CONTEXT` e `DOCKER_HOST`. Usa API Docker negociada e requisições finitas.
Não cria containers nem muda permissões do socket. Docker ausente, contexto
remoto, daemon parado ou falta de acesso tornam a fonte indisponível.

O worker Docker tem conexão SQLite própria. Requisições de dois segundos podem
levar o ciclo Docker além do intervalo configurado quando há muitos containers;
isso não altera a frequência do host. Cada container recebe seu timestamp real.
No macOS, os containers pertencem à VM Docker, identificada como `docker_vm`;
as métricas nativas pertencem ao macOS. Não representam o mesmo domínio de CPU
ou memória e não devem ser somadas como se fossem equivalentes.

Container parado ou removido gera `available: false`. Falha individual de stats
gera `stats_unavailable`; falha da fonte atualiza a saúde Docker e impede tratar
a última amostra do container como atualmente disponível.

## Lacunas, suspensão e relógio

Cada execução tem `session_id`. Cada amostra registra seu instante UTC, com
milissegundos, e o intervalo usado. Diferença maior que duas vezes o intervalo
registra `gap_seconds`; retrocesso do relógio também registra `clock_reversed`
no host. O coletor não preenche períodos de suspensão, parada ou falha com zeros.
Após retomada ou reinício, CPU exige novo par válido de contadores.

`metrics current` retorna `age_seconds`, `fresh`, `available` e a saúde das
fontes. `--max-age` define o limite de atualidade, inicialmente 30 segundos.
`collector_stopped` indica encerramento observado, não um teste de existência
de PID. Após encerramento abrupto, a idade das amostras identifica desatualização;
não há garantia de um marcador de parada após SIGKILL ou queda de energia.

## Histórico, concorrência e retenção

Consultas usam conexão somente leitura, sem criar banco. Sem dados, retornam
lista vazia com os mesmos campos de paginação da consulta a um banco existente.
A consulta atual inclui `has_more: false`, `next_offset: null` e
`collector_stopped: false` quando nenhum banco existe. Isso não comprova um
coletor em execução. O histórico inclui `next_after: null`, `snapshot_id: 0`,
`retention_clamped`, `order` e `gaps` mesmo sem banco.

O histórico padrão é a última hora; `--from` e `--to` aceitam
RFC3339 com fuso. O início é limitado aos últimos sete dias e o fim ao presente.
Amostras futuras, por alteração do relógio, ficam ocultas até o relógio alcançá-las.

A paginação é por ordem de inserção, com `limit` de 1 a 1000 e `offset` opcional.
Para leitura estável, capture `snapshot_id`, `from` e `to` da primeira resposta
e reutilize-os com `--after` igual a `next_after`. Não combine avanço de cursor
com incremento de offset: a combinação de valores positivos retorna código 2
antes de acessar o banco. Cursores `after` e `snapshot-id` aceitam de zero a
9223372036854775807. Valores maiores também retornam 2 quando o banco não existe. O snapshot impede inclusão
de novas linhas entre páginas; não congela a limpeza por retenção. Dados vencidos
podem desaparecer durante uma consulta longa.

Não há agregação por janela neste comando. Consumidores podem agregar as amostras
retornadas, separando recursos e sessões e mantendo lacunas explícitas. A ordem
de inserção pode diferir da ordem temporal porque host e Docker gravam separados.

WAL permite leitores simultâneos. As escritas do host agrupam o ciclo em transação
curta; Docker grava por observação. Limpeza remove até quatro lotes de mil amostras
vencidas por ciclo. Sessões antigas são removidas em lotes de cem, preservando a
sessão ativa. Não há VACUUM automático durante a coleta; o arquivo pode conservar
espaço para reutilização. Consultas já excluem dados vencidos antes da limpeza.

## Condições de sucesso e testes

- Coletor independente registra host e encerra por sinal, liberando o lock.
- Segunda instância no mesmo diretório retorna código 6; leitores continuam funcionando.
- Docker indisponível ou com timeout não interrompe os ciclos do host.
- CPU inicial ausente não é confundida com zero; stats usam deltas verificáveis.
- Retenção, paginação estável, datas inválidas e registros futuros têm testes Node/SQLite.
- Payloads privados dos simuladores Docker não aparecem no banco nem nas respostas.

Os testes usam host Debian 13 x86_64 e comandos Docker simulados para falhas
determinísticas. Isso não equivale à homologação física no macOS ou ARM.

## Referências

- [API sysinfo 0.37.2](https://docs.rs/sysinfo/0.37.2/sysinfo/).
- [API Docker Engine 1.53](https://docs.docker.com/reference/api/engine/version/v1.53/).
- [Métricas de runtime Docker e cgroups](https://docs.docker.com/engine/containers/runmetrics/).
- [Persistência e permissões locais](STATE.md).

## Contexto Docker e retomada

O endpoint é fixado durante cada ciclo, da lista de containers até a coleta de
estatísticas. Mudança de contexto entre ciclos reinicia os deltas de CPU; não
combina contadores de endpoints distintos. Suspensão e retomada foram testadas
com SIGSTOP/SIGCONT: a primeira amostra após a lacuna contém CPU nula e
gap_seconds, sem interpolação do período ausente.
