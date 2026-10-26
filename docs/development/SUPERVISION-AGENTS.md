# Supervisão e integração com agentes

> Implementado na v2: unidades nativas, controle explícito e consultas estruturadas.

## Instalação do coletor

O coletor faz parte do executável Rust. Sua instalação copia o executável atual
para `DATA_DIR/collector/bin/setupvibe`, grava uma unidade do supervisor e a
inicia. Essa cópia permanece disponível mesmo quando a TUI ou o CLI termina.
Ela não depende do diretório de código nem de uma sessão de terminal aberta.

```bash
setupvibe collector install --interval 5 --yes
setupvibe collector status --output json
setupvibe collector configure --interval 10 --yes
setupvibe collector stop --yes
setupvibe collector start --yes
setupvibe collector restart --yes
setupvibe collector update --yes
```

`component install collector` e `component update collector` usam o mesmo
supervisor. `collector install --scope user|system` permite escolher o escopo
no Linux. A edição Desktop usa serviço do usuário por padrão; Server usa
serviço de sistema. A instalação de sistema exige root e um diretório de dados
pertencente a root; use o mesmo `--data-dir` nas consultas e operações seguintes.
Não há elevação implícita que misture dados de identidades distintas.

Exemplo Server, executado em sessão root:

```bash
setupvibe --edition server --data-dir /var/lib/setupvibe collector install --yes
setupvibe --edition server --data-dir /var/lib/setupvibe collector status --output json
```

## Plataformas e arquivos

| Plataforma/escopo | Arquivo | Gerência |
| --- | --- | --- |
| Linux usuário | `~/.config/systemd/user/setupvibe-collector.service` | `systemctl --user` |
| Linux sistema | `/etc/systemd/system/setupvibe-collector.service` | `systemctl` como root |
| macOS usuário | `~/Library/LaunchAgents/dev.setupvibe.collector.plist` | `launchctl` no domínio `gui/UID` |

Um recibo `.setupvibe.json` fica ao lado da unidade. Registra versão, intervalo,
edição, diretório, ambiente selecionado e hashes SHA-256 da unidade e executável.
Ele permite comprovar que o arquivo continua igual ao gerado. Não é uma assinatura
criptográfica contra alguém que já pode escrever nesse mesmo diretório.

Unidades externas, arquivos modificados, symlinks e destinos sem propriedade
compatível são recusados. O SetupVibe não sobrescreve ajustes manuais nem migra
um serviço para outro diretório ou escopo silenciosamente. Coexistência de
unidades de usuário e sistema exige revisão antes de alterar.

O Linux usa `Type=exec`, `Restart=on-failure`, atraso de cinco segundos,
`SuccessExitStatus=130` e encerramento do grupo de processos. A instalação
habilita o serviço. Parar o serviço interrompe a coleta nesta execução, mas não
remove a habilitação para o próximo boot ou login. Não habilitamos `linger`:
serviço de usuário depende da sessão ou de linger já configurado pelo operador.
Para coleta contínua de servidor sem sessão, use serviço de sistema.

O macOS usa LaunchAgent com `ProgramArguments`, `RunAtLoad` e `KeepAlive`.
Exige sessão gráfica disponível no domínio `gui/UID`; uma conexão SSH isolada
sem esse domínio não basta. A parada descarrega o job; o próximo login pode
carregá-lo novamente. macOS Server/LaunchDaemon não faz parte desta matriz.
Encerrar a TUI não descarrega o LaunchAgent. Nenhum comando de supervisão muda
permissões do socket Docker nem concede acesso administrativo.

## Ambiente e atualizações

As unidades usam caminhos absolutos e argumentos separados. HOME e PATH são
explícitos; o PATH inclui diretórios usuais de Docker/Homebrew. Valores explícitos
de `DOCKER_CONTEXT` e `DOCKER_HOST` são preservados, aceitando somente socket
Unix local em DOCKER_HOST. O ambiente inteiro da sessão não é copiado.

Repetir `install` preserva intervalo e ambiente registrados. Use `configure`
para alterar o intervalo. `update` substitui a cópia pelo executável SetupVibe
que executa o comando e reinicia o serviço, conservando bancos e configuração.
`updates list collector` compara a versão do recibo com a versão do CLI atual;
não afirma consultar uma release remota do coletor.

Arquivos são escritos por substituição atômica individual. A operação inteira
não é uma transação do supervisor: falha ao recarregar ou iniciar pode deixar
arquivos salvos e serviço inativo. O comando retorna erro e a operação fica no
histórico. Consulte `collector status` e os logs antes de repetir a instalação.
Uma alteração de configuração não elimina as amostras anteriores.

## Diagnóstico e prévia

```bash
setupvibe collector install --dry-run --output json
setupvibe collector render --platform linux --scope user --output json
setupvibe collector render --platform macos --output json
setupvibe collector status --output json
journalctl --user -u setupvibe-collector.service --since '10 minutes ago'
```

Para serviço de sistema, use `journalctl -u setupvibe-collector.service` com
permissão de leitura. No macOS, consulte `launchctl print gui/UID/dev.setupvibe.collector`
e os registros do launchd. `render` não instala nem inicia serviço; permite
inspecionar o manifesto de outra plataforma. Isso não comprova sua execução.

O status separa instalação, acesso ao gerente, estado ativo, PID, intervalo,
escopo e métricas recentes. Arquivo existente não significa processo ativo.
Processo ativo não garante Docker acessível. Uma amostra recente continua válida
como observação mesmo depois de parar o coletor, mas não é monitoramento contínuo.

## Contrato para agentes

Agentes usam o CLI com `--output json --non-interactive`. Cada resposta tem
`schema_version: 1`, `success` e `data` ou `error`. Código de saída diferente
de zero deve ser tratado antes de interpretar um resultado como sucesso.
NDJSON serve para acompanhar operações por eventos e obter o resultado final.

| Necessidade | Consulta |
| --- | --- |
| Versão e capacidades catalogadas | `version`, `catalog list`, `catalog show ID` |
| Consumo atual | `metrics current --scope host`, `disk` ou `container` |
| Série histórica | `metrics history --scope container --id ID --from RFC3339` |
| Saúde da coleta | `collector status` e saúde retornada em `metrics current` |
| Serviços, portas e persistência | `service list`, `service inspect ID` |
| Resultado de alterações | `operation list`, `operation show ID` |
| Atualizações disponíveis | `updates list ID...` |

Antes de orientar uma ação a partir de consumo, examine `collected`, a presença
da amostra, `fresh`, `available`, `age_seconds` e a saúde da fonte. Se a consulta
não contém dados, não conclua que o recurso consome zero. Para métricas Docker,
considere também o contexto e a separação entre host e VM no macOS.

Histórico tem retenção de sete dias, paginação limitada e lacunas explícitas.
Reutilize `snapshot_id`, `from` e `to`, avançando por `next_after`; o timestamp
da amostra representa a observação, não o momento da consulta. CPU inicial ou
contadores incompletos podem ser `null`. Consulte também a parte 12, Coletor e métricas.

Exemplo de consumidor Node.js, somente leitura:

```js
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execute = promisify(execFile);
const { stdout } = await execute('setupvibe', [
  '--output', 'json', '--non-interactive',
  'metrics', 'current', '--scope', 'host', '--max-age', '30',
], { timeout: 10000, maxBuffer: 1024 * 1024 });
const result = JSON.parse(stdout);
if (result.schema_version !== 1 || !result.success) {
  throw new Error('Consulta de métricas não confirmada');
}
const sample = result.data.samples[0];
if (!sample?.fresh || !sample.available) {
  console.log('Sem amostra atual disponível');
} else {
  console.log(sample.values);
}
```

O agente não precisa iniciar o coletor para consultar histórico. Para alterar
serviços, ele deve escolher um alvo, consultar propriedade/capacidades, executar
`--dry-run`, obter a autorização aplicável e só então usar `--yes`. Exemplos de
ações disponíveis: `service restart ID`, `collector restart`, instalação ou
atualização explícita de componentes. Os comandos exigem confirmação e registram
resultado; não devem ser disparados apenas porque um percentual ultrapassou
um valor escolhido pelo agente.

Observar `memory_limit_bytes` ou consumo de CPU não aplica limites. O SetupVibe
não expõe ajuste automático de cgroups, redução de réplicas por pressão ou
reinício automático de aplicativos por consumo. A política de recuperação do
supervisor vale somente para o próprio coletor.

## Condições de sucesso e validação

- Unidade renderizada valida sintaxe e preserva argumentos com espaços, `$` e `%`.
- Instalação exige confirmação; prévia não escreve arquivos.
- Unidade externa ou modificada não é controlada nem sobrescrita.
- Diretório de dados diferente do registrado não controla o serviço existente.
- Teste real em Debian 13 descartável inicia, coleta, reinicia, configura, para e atualiza pelo systemd.
- O histórico permanece após parada e os PIDs mudam após reinício.

O teste Linux usa systemd dentro de container próprio com namespace de cgroup
privado. Não monta socket Docker ou cgroup do host. O plist macOS tem validação
de formato; login gráfico e execução em macOS/ARM físicos ainda exigem homologação.

## Referências

- [Contrato de serviços systemd](https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html).
- [Criação de jobs launchd pela Apple](https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLaunchdJobs.html).
- [Gerência launchd no Terminal](https://support.apple.com/guide/terminal/apdc6c1077b-5d5d-4d35-9c19-60f2397b2369/mac).
- [Métricas e retenção](METRICS.md), [serviços Docker](DOCKER.md) e [estado local](STATE.md).
