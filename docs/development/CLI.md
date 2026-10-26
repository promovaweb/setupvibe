# CLI e automação

> Implementado em 2.0.0-alpha.1. Exemplos executáveis, contratos e limites estão na [referência completa](../cli/REFERENCE.md).

## Superfície disponível

São 75 comandos finais, organizados em 97 entradas de ajuda. O CLI inclui catálogo, componentes, aliases de aplicativos, atualizações, Docker/Swarm, serviços, estado, operações, coletor, métricas, diagnóstico e TUI. A [árvore extraída do executável](../cli/surface.json) é conferida por `npm run docs:check`.

O [guia de uso](../user/README.md) apresenta a preparação inicial. As páginas de domínio detalham pré-condições e resultados. CLI e TUI executam o mesmo núcleo e registram operações no mesmo banco.

## Parâmetros globais

| Flag | Tipo e padrão | Efeito |
| --- | --- | --- |
| --edition | desktop ou server; padrão compilado | Filtra componentes e valida operações |
| --output | text, json ou ndjson; text | Seleciona protocolo de stdout |
| --dry-run | booleano; false | Prévia sem mutação |
| --non-interactive | booleano; false | Declara execução sem perguntas |
| --yes | booleano; false | Autoriza a mutação explicitamente solicitada |
| --data-dir | caminho absoluto; depende do sistema | Seleciona estado privado |
| --timeout | inteiro de 1 a 86400; 300 | Limite em segundos por subprocesso |
| --target-version | versão literal ou prefixo numérico, opcional | Seleciona versão em operações mise |
| --no-color | booleano; false | Saída sem cores |
| --help, -h | ação | Exibe ajuda |
| --version, -V | ação | Exibe versão do binário |

`SETUPVIBE_EDITION` substitui a edição compilada, e `--edition` prevalece sobre ambos.
O artefato Server é compilado com `server-default`.

`SETUPVIBE_DATA_DIR` equivale ao diretório explícito, com precedência para a
flag. O CLI atualmente não usa cor em resultados. Ajuda tem descrições e
rótulos em português; marcadores automáticos de valores vêm do clap.

Consultas dispensam `--yes`. Mutações exigem essa flag, inclusive
em terminal interativo. Sem ela, a saída é 4 antes de criar diretórios.
`--non-interactive` não equivale a autorização. O CLI nunca lê /dev/tty.

## JSON e NDJSON

JSON escreve um objeto com schema_version, success e data ou error.
Erros têm code e message. Saída parcial pode ter success false e data com
resultados individuais. Mensagens de subprocesso não vazam para stdout
fora desse envelope.

NDJSON escreve eventos por linha com schema_version, event e timestamp UTC.
O fluxo comum emite started e result. Erros de parsing retornam diretamente
um evento result, pois a execução ainda não começou.
Consumidores devem aceitar eventos adicionais e campos novos no schema 1.

```json
{"schema_version":1,"success":false,"error":{"code":3,"message":"Componente indisponível nesta edição"}}
```

Em text, diagnósticos humanos usam stderr e dados usam stdout. Falha ao escrever
em um pipe fechado termina sem panic. Texto de processos externos tem controles
de terminal e formatos conhecidos de credenciais removidos. Não forneça
segredos em argv ou em opções de catálogo.

## Códigos de saída

| Código | Significado |
| --- | --- |
| 0 | Operação concluída |
| 1 | Falha de execução ou saída |
| 2 | Entrada, schema ou ID inválido |
| 3 | Operação, edição ou plataforma não suportada |
| 4 | Pré-condição, autorização ou executável ausente |
| 5 | Resultado parcial de operação em lote |
| 6 | Timeout ou recurso ocupado |
| 130 | Cancelamento |

## version

Consulta a versão canônica de Cargo.toml sem gravar estado.

```bash
setupvibe version
setupvibe --version
setupvibe --output json version
setupvibe --output ndjson version
setupvibe --edition server version
```

## doctor

Verifica alvo de plataforma e consulta versões de git, gh, docker, tailscale,
mise e brew presentes no PATH. Server omite mise/brew. Ferramenta ausente
aparece como available false; isso não inicia instalação.
O diagnóstico inclui a versão SQLite embarcada.

```bash
setupvibe doctor
setupvibe --edition server doctor
setupvibe --output json doctor --non-interactive
setupvibe --timeout 10 doctor
setupvibe --output ndjson --no-color doctor
```

## Exemplos de automação

Uma prévia Server valida restrições sem criar banco:

```bash
setupvibe --edition server --output json component install git gh --dry-run
```

Uma inicialização autorizada prepara somente os bancos:

```bash
setupvibe --non-interactive --yes --output json state init
```

Uma consulta paginada não pede confirmação:

```bash
setupvibe --output json operation list --limit 20 --offset 20
```

Uma opção fora da faixa retorna 2:

```bash
setupvibe component install redis --option port=99999 --dry-run --output json
```

Uma solicitação de componente excluído da Server retorna 3:

```bash
setupvibe --edition server component install codex --dry-run --output json
```

## Transporte de subprocessos

O executor usa executável e argv separados, sem shell implícito. stdin fica
fechado por padrão. O token de `swarm join --token-stdin` usa
pipe e é removida da saída capturada. Cada processo tem grupo próprio:
timeout e cancelamento encerram somente esse grupo.

stdout/stderr são consumidos em threads separadas, retendo no máximo 2 MiB
por canal. O resultado indica truncamento. O limite evita deadlock por pipe
cheio e crescimento ilimitado de memória.

Os testes usam executáveis Node.js descartáveis para verificar parsing, JSON,
NDJSON, redaction, stdin, timeout, SIGINT e captura volumosa. Isso valida o
transporte; não comprova o comportamento de cada fornecedor externo.
