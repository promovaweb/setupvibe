# CLI

O binário `{{bin}}` tem uma TUI, um CLI e um servidor MCP no mesmo executável. Este
manual cobre o CLI: as convenções, as options globais, o formato de saída e
cada comando com argumentos, options, efeitos, permissões, recusas e exemplos.
A referência gerada do registry, que acompanha `--skill cli`, repete a mesma
árvore de forma resumida.

## Convenções

- `{{bin}} <command> [subcommand] [arguments] [options]`.
- Options aceitam `--key value` e `--key=value`. Não há agrupamento de flags
  curtas (`-abc`).
- `--` encerra a leitura de options; o que vem depois é argument. Use `--`
  antes de argumentos que o `skills` ou outro programa precisa receber.
- Options globais valem em qualquer posição, antes ou depois do command.
- Sem argumentos, em terminal interativo, o binário abre a TUI. Sem TTY,
  imprime o help e sai com exit code 2.
- Toda saída destinada a um consumidor vai para stdout. Avisos, progresso e erros em modo
  texto vão para stderr.
- Nomes de commands, subcommands, options, arguments, keys e campos de saída
  são em inglês. Mensagens do binário também.
- Os comandos que instalam ou removem itens, criam usuários, aplicam segurança,
  escrevem a configuração do shell, migram a máquina ou configuram agentes
  aceitam `--dry-run`. O plano mostra cada etapa e cada comando sem executar
  nada.
- O valor de uma credencial nunca entra por argumento: `credentials set` lê do
  stdin ou do terminal. Tokens de `auto` têm option por compatibilidade, mas a
  forma recomendada é a variável de ambiente, que o run log mascara.

## Options globais

| Option | Efeito |
| --- | --- |
| `-h`, `--help` | Help do command atual. Exit code 0. |
| `-V`, `--version` | Imprime `{{bin}} <version>`. Exit code 0. |
| `--json` | Saída em JSON com envelope estável. Erros também saem em JSON, em stdout. |
| `--skill [topic]` | Documentação embutida. Topics: `cli`, `tui`, `mcp`, `config`, `exit-codes`, `troubleshooting`, `migration`, `inventory`, `reference`. |
| `--opencli` | Descrição OpenCLI 0.1 da árvore de commands em JSON. |
| `--no-color` | Desliga cores ANSI. `NO_COLOR=1` tem o mesmo efeito. |

O comando `docs` aceita os mesmos topics de `--skill` e mais `inventory`, e
tem `--lang` para escolher a língua.

## Saída em texto e em JSON

Texto é o padrão quando `output.format` em settings.json é `text`. Com
`--json`, ou com `output.format = json`, a saída segue este envelope:

```json
{
  "ok": true,
  "command": "{{bin}} config get",
  "data": { "key": "tui.theme", "value": "night" }
}
```

Em erro:

```json
{
  "ok": false,
  "command": "{{bin}} credentials get",
  "error": {
    "code": 4,
    "name": "CREDENTIALS",
    "message": "Credential \"x\" not found.",
    "details": { "name": "x" }
  }
}
```

O exit code do processo é sempre o mesmo de `error.code`. Leia os dois: o
envelope para a mensagem, o code para a classe da falha. A tabela completa
está em [exit-codes.md](exit-codes.md).

O comando `auto --json` acrescenta uma linha JSON por evento do run log antes
do envelope final. Consumidores desse comando leem a última linha com `ok`
como resultado e tratam as anteriores como progresso.

## Como ler as seções de comando

Cada comando tem a mesma ordem de informação: finalidade, sintaxe, tabela de
argumentos e options, saída em texto e o `data` do envelope `--json`, efeitos
persistentes, permissões, recusas com exit codes, limites e cinco exemplos.
A tabela usa `-` para o que não se aplica e `flag` para option sem valor.

Os comandos que só agrupam subcommands (`config`, `credentials`, `shell`,
`self`, `ssh`, `user` e `security`) imprimem o help e saem com 0
quando chamados sem subcommand. As seções deles mostram a finalidade do grupo
e exemplos que combinam os subcommands.

## Commands

### `{{bin}} tui`

Abre a interface de terminal no Início, com um cartão por módulo: Inventory,
User, Doctor, Logs, Tailscale, Machine e About.

#### Sintaxe

```bash
{{bin}} tui [--tab <tab>]
```

#### Argumentos e options

| Nome | Tipo | Obrigatório | Padrão | Valores |
| --- | --- | --- | --- | --- |
| `--tab` | enum | não | `tui.initialTab`, ou `overview` | `overview`, `inventory`, `user`, `doctor`, `logs`, `tailscale`, `machine`, `about` |

#### Saída

Texto: a interface. Ao fechar, nada é impresso. Com `--json`, o
envelope final traz `data = { "closed": true }`.

#### Efeitos persistentes

Nenhum arquivo é criado pela abertura. Os módulos
podem gravar `settings.json` e os arquivos de estado quando você altera uma
preferência ou executa uma ação nelas.

#### Permissões

Exige TTY em stdin e stdout. Não exige sudo nem root.

#### Recusas e exit codes

Sem TTY: `NO_TTY` (8), com a mensagem para usar
`--help`.

#### Limites

É o mesmo modo aberto por `{{bin}}` sem argumentos. `--tab`
sobrepõe a preferência apenas nesta execução.

#### Exemplos

```bash
{{bin}} tui   # abre no módulo configurado em tui.initialTab
```

```bash
{{bin}} tui --tab inventory   # começa no módulo Inventory, com a lista de itens e versões fixadas
```

```bash
{{bin}} tui --tab machine   # começa no módulo Machine, com CPU, memória, discos e rede
```

```bash
{{bin}} tui --tab doctor   # começa no módulo Doctor, com o diagnóstico da máquina
```

```bash
{{bin}} tui --tab about   # começa no módulo About, com versão, runtime e credits
```

### `{{bin}} system`

Mostra o sistema detectado, a variante da máquina, o estado da atualização e
os restos do SetupVibe 1.

#### Sintaxe

```bash
{{bin}} system [--no-update-check] [--json]
```

#### Argumentos e options

| Nome | Tipo | Obrigatório | Padrão | Valores |
| --- | --- | --- | --- | --- |
| `--no-update-check` | flag | não | ausente | presente ou ausente |

#### Saída

Texto: tabelas `System` e `Update`. `data` traz `edition`,
`system`, `id`, `name`, `version`, `arch`, `wsl`, `headless`, `publicIp`,
`variant`, `distro` quando houver, `unsupportedReason` quando houver,
`update` quando a consulta roda e `setupvibe1`. `update` traz `current`, `latest`, `minimum`, `changelog`,
`updateAvailable`, `updateRequired`, `checkedAt` e `source` (`network`,
`cache` ou `offline`).

#### Efeitos persistentes

A consulta de atualização grava o cache de seis
horas em `~/.setupvibe/state/update-check.json`. Nada mais é alterado.

#### Permissões

Nenhuma. Pode rodar como root.

#### Recusas e exit codes

Sistema sem suporte: `UNSUPPORTED_SYSTEM` (11), com
o motivo no texto e em `unsupportedReason`.

#### Limites

A consulta de rede tem timeout curto e nunca interrompe o
comando. Sem rede, `source` é `offline` e `latest` fica ausente.

#### Exemplos

```bash
{{bin}} system   # leitura rápida do sistema, da variante e da atualização
```

```bash
{{bin}} system --no-update-check   # máquina offline: não consulta a rede
```

```bash
{{bin}} system --json   # resultado completo para um agente ou script
```

```bash
{{bin}} system | grep SetupVibe   # confere se há restos do SetupVibe 1
```

```bash
{{bin}} system --json | jq '.data.update.updateAvailable'   # só o estado da atualização
```

### `{{bin}} init`

Confere os requisitos e instala os pré-requisitos: dependências de build e
mise. Também registra o init e a primeira seleção.

#### Sintaxe

```bash
{{bin}} init [--dry-run] [--verbose] [--cache-dir <dir>] [--ca-file <file>]
```

#### Argumentos e options

| Nome | Tipo | Obrigatório | Padrão | Valores |
| --- | --- | --- | --- | --- |
| `--dry-run` | flag | não | ausente | presente ou ausente |
| `--verbose` | flag | não | ausente | presente ou ausente |
| `--cache-dir` | caminho | não | `SETUPVIBE_CACHE_DIR`, depois `config.json` | pasta existente ou criada |
| `--ca-file` | caminho | não | `SETUPVIBE_CA_FILE`, depois `config.json` | arquivo PEM |

#### Saída

Texto: requisitos com ✓, ! ou ✗ e o plano executado. `data` traz
`system` e `checks`; no plano, `dryRun` e `steps`; na execução, `log` e
`results`. Cada
resultado tem `id`, `status`, `durationMs` e `message` quando houver.

#### Efeitos persistentes

Instala os itens `initOnly` e o mise. Grava
`config.json` com `edition`, `system`, `init` e, em terminal, a identidade do
Git. Cria `selection.json`, quando ainda não há seleção, com os itens que já passam
na verificação, marcados `adopted`. Cria `~/.setupvibe/` com modo 0700 e um run log em `logs/`.

#### Permissões

Recusa root. Usa sudo para pacotes do sistema. Não exige TTY,
mas só pergunta o nome e o e-mail do Git quando há terminal.

#### Recusas e exit codes

Root: `ROOT` (12). Sistema sem suporte:
`UNSUPPORTED_SYSTEM` (11). Menos de 10 GB livres no desktop ou 5 GB no
server: `DISK_SPACE` (14). Falha de rede, locale ou relógio:
`NETWORK_OR_API` (5). Etapa com falha: `PARTIAL` (10). Sudo com senha sem
terminal: `SUDO_PASSWORD` (13).

#### Limites

Depois do init, `install`, `update` e as ações da TUI que instalam
itens funcionam. Rode o init de novo quando o `doctor` apontar pré-requisito
novo. A option `--skip-network-check` existe para testes, não aparece no
`--help` e não substitui uma rede quebrada em uso real.

#### Exemplos

```bash
{{bin}} init --dry-run   # mostra requisitos e comandos sem instalar nada
```

```bash
{{bin}} init   # instala dependências de build e mise e registra o init
```

```bash
{{bin}} init --json   # resultado completo para um log de provisionamento
```

```bash
{{bin}} init --ca-file /etc/ssl/corp/ca.pem   # rede corporativa com CA própria
```

```bash
{{bin}} init --cache-dir /var/cache/setupvibe   # reaproveita downloads entre execuções
```

### `{{bin}} auto`

Instala tudo sem perguntar, para máquinas sem interface, provisionamento e
agentes. As respostas vêm de options, de variáveis `SETUPVIBE_*` ou de um
arquivo `--config`.

#### Sintaxe

```bash
{{bin}} auto [options]
```

#### Argumentos e options

| Nome | Tipo | Obrigatório | Padrão | Valores |
| --- | --- | --- | --- | --- |
| `--user` | texto | como root, sim | `SETUPVIBE_USER` | nome de usuário |
| `--ssh-key` | texto ou caminho | não | `SETUPVIBE_SSH_KEY` | chave pública ou arquivo |
| `--git-name` | texto | não | `SETUPVIBE_GIT_NAME` | nome livre |
| `--git-email` | texto | não | `SETUPVIBE_GIT_EMAIL` | e-mail |
| `--profile` | texto | não | inventory completo | nome de profile do inventory, ou `none` |
| `--only` | texto | não | `SETUPVIBE_ONLY` | ids separados por vírgula |
| `--exclude` | texto | não | `SETUPVIBE_EXCLUDE` | ids separados por vírgula |
| `--tailscale-authkey` | texto | não | `TAILSCALE_AUTHKEY` | auth key do Tailscale |
| `--manager` | flag | não | `SETUPVIBE_SWARM_MANAGER=1` | server: inicia o Swarm como manager |
| `--join` | texto | não | `SETUPVIBE_SWARM_TOKEN` | server: token de entrada no Swarm |
| `--advertise-addr` | texto | não | `SETUPVIBE_SWARM_ADVERTISE_ADDR` | endereço, como `10.0.0.1:2377` |
| `--timezone` | texto | não | `SETUPVIBE_TIMEZONE` | zona IANA, como `America/Sao_Paulo` |
| `--reboot` | flag | não | `SETUPVIBE_REBOOT=1` | presente ou ausente |
| `--keep-nopasswd` | flag | não | `SETUPVIBE_KEEP_NOPASSWD=1` | presente ou ausente |
| `--encrypted-network` | flag | não | `SETUPVIBE_SWARM_ENCRYPTED=1` | server: rede overlay cifrada |
| `--pm2-autostart` | flag | não | `SETUPVIBE_PM2_AUTOSTART=1` | presente ou ausente |
| `--tailscale-ssh` | flag | não | `SETUPVIBE_TAILSCALE_SSH=1` | presente ou ausente |
| `--config` | caminho | não | - | arquivo no formato de `config export` |
| `--plan` | caminho | não | - | arquivo JSON de saída do plano |
| `--dry-run` | flag | não | ausente | presente ou ausente |
| `--verbose` | flag | não | ausente | presente ou ausente |
| `--cache-dir` | caminho | não | `SETUPVIBE_CACHE_DIR` | pasta de cache |
| `--ca-file` | caminho | não | `SETUPVIBE_CA_FILE` | arquivo PEM |

Cada resposta segue a precedência option, variável de ambiente, arquivo
`--config`. Tokens entram apenas por variável de ambiente.

#### Saída

Texto: cada etapa com ✓, - ou ✗, o resumo, as partes puladas e o
caminho do log. `data` no plano traz `dryRun`, `system`, `items`, `skipped`,
`security` e `steps`. Na execução, traz `version`, `finishedAt`, `log`,
`system`, `items`, `skipped`, `security`, `results` e `checks`. Com `--json`,
cada evento do run log sai como uma linha JSON antes do envelope.

#### Efeitos persistentes

Instala itens e pré-requisitos, configura o shell, o
prompt e o tmux, aplica o módulo de segurança quando cabe, configura Git,
Tailscale e Swarm, grava `selection.json`, `last-run.json`, `config.json`,
`~/.config/mise/mise.lock` e os logs, e cria ou remove a regra de sudo sem
senha. Com `--reboot`, agenda a retomada em uma unit systemd ou em uma tarefa
do Windows.

#### Permissões

Como root, exige `--user`: cria o usuário e continua como ele.
Como usuário comum, exige sudo sem senha. Não pede confirmação e funciona sem
TTY. No Windows, exige PowerShell elevado.

#### Recusas e exit codes

Root sem `--user`: `ROOT` (12). Sudo com senha:
`SUDO_PASSWORD` (13). Sistema sem suporte: `UNSUPPORTED_SYSTEM` (11). Disco
insuficiente: `DISK_SPACE` (14). Rede ou relógio fora do esperado:
`NETWORK_OR_API` (5). Itens com falha: `PARTIAL` (10). Reinício pendente:
`REBOOT_PENDING` (20). Outra execução em andamento: `LOCKED` (30). Arquivo
`--config` inválido: `USAGE` (2).

#### Limites

Uma etapa com falha não interrompe as seguintes; o fechamento
lista o que falhou e o que foi pulado, inclusive partes de segurança. Itens
gráficos ficam de fora em máquina sem interface. `--plan` grava o plano e
sai sem alterar nada. `--only` e `--exclude` não substituem dependências:
elas entram mesmo quando não foram citadas. No arquivo `--config`,
`profile: "none"`, o valor gravado por `config export`, vale como base vazia:
entram os itens de `only` e os requisitos deles. Sem o campo `profile`, entra o
inventory inteiro.

#### Exemplos

```bash
{{bin}} auto --dry-run   # plano completo sem alterar a máquina
```

```bash
{{bin}} auto --user deploy --ssh-key "ssh-ed25519 AAAA..."   # como root, cria o usuário e continua como ele
```

```bash
{{bin}} auto --profile essencial --exclude docker --json   # recorte do inventory com saída para automação
```

```bash
{{bin}} auto --config setupvibe.json --reboot   # repete a seleção de outra máquina e retoma após reiniciar
```

```bash
{{bin}} auto --plan /tmp/plano.json   # grava o plano em JSON e encerra sem mudanças
```

### `{{bin}} list`

Mostra o inventory com o status de cada item nesta máquina.

#### Sintaxe

```bash
{{bin}} list [--category <id>] [--check] [--json]
```

#### Argumentos e options

| Nome | Tipo | Obrigatório | Padrão | Valores |
| --- | --- | --- | --- | --- |
| `--category` | texto | não | todas | id de categoria do inventory |
| `--check` | flag | não | ausente | presente ou ausente |

#### Saída

Texto: uma seção por categoria, com marcador, id, versão e status.
`data` traz `system` e `items`, e cada item traz `id`, `name`, `category`,
`version`, `default`, `status`, `elsewhere` quando a cópia veio de outro
gerenciador e `check` com `--check`.

#### Efeitos persistentes

Nenhum. `--check` executa os comandos de verificação
dos itens selecionados, sem instalar nem remover.

#### Permissões

Nenhuma. Não exige init.

#### Recusas e exit codes

Sistema sem suporte: `UNSUPPORTED_SYSTEM` (11).

#### Limites

O status `other` indica uma cópia fora das pastas do mise; o
caminho aparece ao lado. `gui` marca item gráfico pulado em máquina sem
interface. `--check` verifica só itens já selecionados.

#### Exemplos

```bash
{{bin}} list   # inventory completo com o status de cada item
```

```bash
{{bin}} list --category ai   # só a categoria de ferramentas de IA
```

```bash
{{bin}} list --check   # status e verificação dos itens selecionados
```

```bash
{{bin}} list --json   # resultado completo para um painel ou agente
```

```bash
{{bin}} list | grep outdated   # itens cuja versão fixada mudou
```

### `{{bin}} install`

Instala itens do inventory e as dependências, ou um app fora do inventory com
`--external`.

#### Sintaxe

```bash
{{bin}} install <items>... [options]
{{bin}} install --external <tool[@version]> [options]
```

#### Argumentos e options

| Nome | Tipo | Obrigatório | Padrão | Valores |
| --- | --- | --- | --- | --- |
| `items` | texto, variádico | sim | - | ids do inventory, ou uma ferramenta com `--external` |
| `--external` | flag | não | ausente | presente ou ausente |
| `--force` | flag | não | ausente | reinstala o que já passa na verificação |
| `--dry-run` | flag | não | ausente | presente ou ausente |
| `--verbose` | flag | não | ausente | presente ou ausente |
| `--cache-dir` | caminho | não | `SETUPVIBE_CACHE_DIR` | pasta de cache |
| `--ca-file` | caminho | não | `SETUPVIBE_CA_FILE` | arquivo PEM |

#### Saída

Texto: cada etapa e, na execução, o caminho do log. `data` traz `dryRun`, `items` e
`skipped` no plano; `log` e `results` na execução, com `checks` quando alguma
verificação falha. Com
`--external`, traz `tool` e `version`.

#### Efeitos persistentes

Instala pelo método do inventory (APT, pacman,
Homebrew, mise, Git, arquivo verificado, installer oficial, Composer ou gem).
Atualiza `selection.json` com a versão e o status. Com `--external`, grava o
app em `external.json` e fixa a versão resolvida.

#### Permissões

Usa sudo quando o método exige. Exige init concluído. Não
exige TTY.

#### Recusas e exit codes

Sem init: `CONFIG` (3). Item desconhecido ou
`--external` com mais de uma ferramenta: `USAGE` (2). Ferramenta que o mise
não conhece: `NOT_FOUND` (6). Sistema sem suporte: `UNSUPPORTED_SYSTEM` (11).
Etapa com falha ou verificação com falha: `PARTIAL` (10). Sudo com senha:
`SUDO_PASSWORD` (13).

#### Limites

O item aprovado na verificação é pulado, salvo `--force`.
Dependências entram mesmo quando não foram citadas. Uma cópia instalada por
outro gerenciador é preservada e o aviso mostra o caminho. `--external` aceita
uma ferramenta por execução.

#### Exemplos

```bash
{{bin}} install docker   # instala o Docker e as dependências
```

```bash
{{bin}} install go rust --dry-run   # mostra as etapas sem instalar
```

```bash
{{bin}} install --external terraform@1.13.4   # fixa uma ferramenta fora do inventory
```

```bash
{{bin}} install docker --force   # reinstala mesmo com a verificação atual aprovada
```

```bash
{{bin}} install node --cache-dir /var/cache/setupvibe --json   # reaproveita downloads e entrega o resultado em JSON
```

### `{{bin}} remove`

Remove itens do inventory, ou um app instalado com `install --external`.

#### Sintaxe

```bash
{{bin}} remove <items>... [options]
{{bin}} remove --external <tool> [options]
```

#### Argumentos e options

| Nome | Tipo | Obrigatório | Padrão | Valores |
| --- | --- | --- | --- | --- |
| `items` | texto, variádico | sim | - | ids do inventory, ou uma ferramenta com `--external` |
| `--external` | flag | não | ausente | presente ou ausente |
| `--include-native` | flag | não | ausente | remove pacotes do gerenciador do sistema |
| `--force` | flag | não | ausente | remove dependente ou item adotado |
| `--yes` | flag | não | ausente | não pede confirmação (`-y`) |
| `--dry-run` | flag | não | ausente | presente ou ausente |

#### Saída

Texto: cada etapa e os itens recusados com o motivo. `data` traz
`dryRun` e `refused` no plano; `log` e `results` na execução.

#### Efeitos persistentes

Remove o que foi instalado no espaço do usuário e
atualiza `selection.json`. Com `--external`, remove de `external.json`.
Pacotes nativos só saem com `--include-native`.

#### Permissões

Usa sudo para pacotes do sistema. Pede confirmação em
terminal; sem terminal, exige `--yes`.

#### Recusas e exit codes

Sem `--yes` e sem terminal: `USAGE` (2). Resposta
negativa ou Ctrl+C: `INTERRUPTED` (130). Item desconhecido ou dependente
selecionado sem `--force`: `USAGE` (2). Ferramenta externa desconhecida:
`NOT_FOUND` (6). Etapa com falha: `PARTIAL` (10). Sistema sem suporte:
`UNSUPPORTED_SYSTEM` (11).

#### Limites

Item adotado pelo init fica na máquina salvo `--force`. Um item exigido
por outro item selecionado não sai sem `--force`. Item instalado pelo init
ou pelo sistema não é removido; o motivo aparece no texto. `--dry-run` mostra
o plano e não pede confirmação.

#### Exemplos

```bash
{{bin}} remove go --yes   # remove o Go instalado pelo SetupVibe
```

```bash
{{bin}} remove docker --include-native --dry-run   # mostra o que sairia, inclusive o pacote do sistema
```

```bash
{{bin}} remove --external terraform --yes   # remove um app instalado com install --external
```

```bash
{{bin}} remove node --force --yes   # remove mesmo com outro item dependendo dele
```

```bash
{{bin}} remove go rust --yes --json   # remove dois itens e entrega o resultado em JSON
```

### `{{bin}} update`

Atualiza os itens selecionados cuja versão fixada mudou no inventory desta
versão do SetupVibe.

#### Sintaxe

```bash
{{bin}} update [--dry-run] [--verbose] [--cache-dir <dir>] [--ca-file <file>]
```

#### Argumentos e options

| Nome | Tipo | Obrigatório | Padrão | Valores |
| --- | --- | --- | --- | --- |
| `--dry-run` | flag | não | ausente | presente ou ausente |
| `--verbose` | flag | não | ausente | presente ou ausente |
| `--cache-dir` | caminho | não | `SETUPVIBE_CACHE_DIR` | pasta de cache |
| `--ca-file` | caminho | não | `SETUPVIBE_CA_FILE` | arquivo PEM |

#### Saída

Texto: cada item alterado, de qual versão para qual, e as etapas.
`data` traz `outdated`, com `id`, `from` e `to`, e, na execução, `log` e `results`,
com `checks` quando houver falha.

#### Efeitos persistentes

Reinstala os itens desatualizados e atualiza
`selection.json`. Grava um run log.

#### Permissões

Exige init concluído. Usa sudo quando o método exige.

#### Recusas e exit codes

Sem init: `CONFIG` (3). Sistema sem suporte:
`UNSUPPORTED_SYSTEM` (11). Etapa ou verificação com falha: `PARTIAL` (10).
Sudo com senha: `SUDO_PASSWORD` (13).

#### Limites

Não consulta versões novas na internet: compara a seleção com o
inventory embutido no binário. Para atualizar o binário, use `upgrade`. Item
fora do inventory não entra no `update`.

#### Exemplos

```bash
{{bin}} update --dry-run   # mostra quais itens mudariam de versão
```

```bash
{{bin}} update   # reinstala os itens cuja versão fixada mudou
```

```bash
{{bin}} update --json   # lista `from` e `to` e o resultado de cada etapa
```

```bash
{{bin}} update --cache-dir /var/cache/setupvibe   # reaproveita downloads
```

```bash
{{bin}} update --dry-run | grep '↑'   # só os itens que seriam trocados
```

### `{{bin}} check`

Verifica se os itens selecionados estão instalados nas versões fixadas.

#### Sintaxe

```bash
{{bin}} check [items]... [--json]
```

#### Argumentos e options

| Nome | Tipo | Obrigatório | Padrão | Valores |
| --- | --- | --- | --- | --- |
| `items` | texto, variádico | não | `selection.json`, ou o profile `essencial` | ids do inventory |

#### Saída

Texto: uma linha por item, com ✓ ou ✗, a saída da verificação e a
versão esperada. `data` traz `system` e `results`, e cada resultado traz `id`,
`status`, `output` e `expected`.

#### Efeitos persistentes

Nenhum. Só executa os comandos de verificação.

#### Permissões

Nenhuma além do que o próprio item exige.

#### Recusas e exit codes

Item desconhecido: `USAGE` (2). Item fora da versão
ou ausente: `PARTIAL` (10). Sistema sem suporte: `UNSUPPORTED_SYSTEM` (11).

#### Limites

Sem argumentos, usa a seleção; sem seleção, usa o profile
`essencial`. Itens `initOnly`, do módulo de segurança e não instaláveis no
sistema não entram na verificação.

#### Exemplos

```bash
{{bin}} check   # verifica toda a seleção atual
```

```bash
{{bin}} check node php --json   # verifica dois itens e entrega o resultado em JSON
```

```bash
{{bin}} check docker   # confere só o Docker e a versão fixada
```

```bash
{{bin}} check --json | jq '.data.results[] | select(.status=="fail")'   # só o que falhou
```

```bash
{{bin}} check node || echo "rode: {{bin}} install node"   # trata a falha em um script
```

### `{{bin}} shell`

Agrupa a configuração do ambiente do terminal. `apply` escreve os blocos e
`remove` tira os blocos do SetupVibe.

#### Sintaxe

```bash
{{bin}} shell <apply|remove> [--dry-run]
```

#### Argumentos e options

| Nome | Tipo | Obrigatório | Padrão | Valores |
| --- | --- | --- | --- | --- |
| (nenhum) | - | - | - | - |

Sem subcommand, imprime o help e sai com 0; com `--json`, o help vem em `data.help`.

#### Saída

Depende do subcommand. Consulte as seções `shell apply` e
`shell remove`.

#### Efeitos persistentes

Altera `~/.zshrc`, `~/.bashrc` no Omarchy e
`~/.tmux.conf`, além dos arquivos em `~/.setupvibe/shell/`.

#### Permissões

A troca do shell de login usa sudo quando necessário.

#### Recusas e exit codes

Subcommand inválido: `USAGE` (2). Falha em etapa:
`PARTIAL` (10).

#### Limites

O conteúdo fora dos marcadores não é alterado. Uma cópia do
arquivo original fica em `~/.setupvibe/backups/` antes da primeira mudança.

#### Exemplos

```bash
{{bin}} shell apply --dry-run   # mostra os arquivos e blocos que seriam escritos
```

```bash
{{bin}} shell apply   # escreve o bloco, os aliases, o preset e o tmux
```

```bash
{{bin}} shell remove   # tira somente os blocos do SetupVibe
```

```bash
{{bin}} shell apply --json   # plano e resultado em JSON
```

```bash
{{bin}} shell remove --dry-run   # confere o que sairia antes de remover
```

### `{{bin}} shell apply`

Escreve o bloco do SetupVibe no shell, os aliases, o preset do Starship e as
configurações do tmux. Também converte arquivos do SetupVibe 1 quando
encontra.

#### Sintaxe

```bash
{{bin}} shell apply [--dry-run]
```

#### Argumentos e options

| Nome | Tipo | Obrigatório | Padrão | Valores |
| --- | --- | --- | --- | --- |
| `--dry-run` | flag | não | ausente | presente ou ausente |

#### Saída

Texto: cada etapa com o resultado e o caminho do log. `data` traz
`dryRun` e `steps` no plano; `log` e `results` na execução.

#### Efeitos persistentes

Grava o bloco entre `# >>> setupvibe >>>` e
`# <<< setupvibe <<<`, os aliases em `~/.setupvibe/shell/aliases.sh` e
`aliases-agents.sh`, o preset `gruvbox-rainbow` quando não existe configuração
do Starship, o `~/.setupvibe/shell/tmux.conf` e os arquivos `.local` vazios.
Faz backup dos arquivos antes da primeira mudança. No Linux, troca o shell de
login para ZSH com `chsh`.

#### Permissões

Usa sudo no `chsh` quando necessário. Não exige TTY.

#### Recusas e exit codes

Sistema sem suporte: `UNSUPPORTED_SYSTEM` (11).
Etapa com falha: `PARTIAL` (10). Sudo com senha: `SUDO_PASSWORD` (13).

#### Limites

O bloco é substituído por inteiro a cada execução. Suas linhas
vão para `~/.zshrc.local`, `~/.bashrc.local` e `~/.tmux.conf.local`, que nunca
são sobrescritos. Alias que colide com programa, função ou alias existente é
pulado; `doctor` lista os pulados. No Omarchy, os arquivos do sistema ficam
intactos.

#### Exemplos

```bash
{{bin}} shell apply --dry-run   # plano dos blocos e arquivos
```

```bash
{{bin}} shell apply   # aplica o ambiente e os aliases
```

```bash
{{bin}} config set shell.agentAliases false && {{bin}} shell apply   # deixa os aliases de agente de fora
```

```bash
{{bin}} shell apply --json   # resultado em JSON para um agente
```

```bash
{{bin}} shell apply && exec $SHELL -l   # aplica e recarrega o shell na sessão atual
```

### `{{bin}} shell remove`

Remove os blocos do SetupVibe de `~/.zshrc`, `~/.bashrc` e `~/.tmux.conf`,
mantendo o restante dos arquivos.

#### Sintaxe

```bash
{{bin}} shell remove [--dry-run]
```

#### Argumentos e options

| Nome | Tipo | Obrigatório | Padrão | Valores |
| --- | --- | --- | --- | --- |
| `--dry-run` | flag | não | ausente | presente ou ausente |

#### Saída

Texto: cada etapa e, na execução, o caminho do log. `data` traz `dryRun` e `steps` no plano; `log`
e `results` na execução.

#### Efeitos persistentes

Apaga apenas o conteúdo entre os marcadores. Os
arquivos `.local`, os backups e os itens instalados ficam.

#### Permissões

Nenhuma além da escrita nos arquivos do seu home.

#### Recusas e exit codes

Etapa com falha: `PARTIAL` (10).

#### Limites

Não desinstala pacotes, não apaga `~/.setupvibe/` e não desfaz a
troca do shell de login. Para isso, use `self uninstall`.

#### Exemplos

```bash
{{bin}} shell remove --dry-run   # mostra o que sairia dos arquivos
```

```bash
{{bin}} shell remove   # tira os blocos e mantém o resto
```

```bash
{{bin}} shell remove && exec $SHELL -l   # tira os blocos e recarrega o shell
```

```bash
{{bin}} shell remove --json   # resultado em JSON
```

```bash
{{bin}} shell remove && {{bin}} shell apply   # reescreve o bloco do zero
```

### `{{bin}} migrate`

Move uma máquina configurada pelo SetupVibe 1 para o SetupVibe 2, preservando
as configurações.

#### Sintaxe

```bash
{{bin}} migrate [--dry-run] [--remove-legacy <items>]
```

#### Argumentos e options

| Nome | Tipo | Obrigatório | Padrão | Valores |
| --- | --- | --- | --- | --- |
| `--dry-run` | flag | não | ausente | presente ou ausente |
| `--remove-legacy` | texto | não | - | `go`, `rbenv`, `npm-global`, `nodesource` ou `all` |

#### Saída

Texto: o plano, as linhas que mudam de arquivo e as duplicidades
mantidas. `data` traz `v1`, `moved`, `removeLegacy` e `keptLegacy`; no plano, `dryRun` e
`steps`; na execução, `log` e `results`; `linuxbrewUninstall` aparece quando
houver Linuxbrew.

#### Efeitos persistentes

Faz backup do `.zshrc` e do `.tmux.conf` antigos,
move as linhas pessoais para os arquivos `.local`, escreve os blocos do
SetupVibe 2, mantém `ssh_copy_id` como atalho, registra `migratedFromV1` em
`config.json` e adota os itens já instalados em `selection.json`. Remove as
duplicidades confirmadas.

#### Permissões

Em terminal, pergunta uma vez por duplicidade. Sem terminal,
remove apenas os ids passados em `--remove-legacy`. Usa sudo quando a remoção
exige.

#### Recusas e exit codes

Valor desconhecido em `--remove-legacy`: `USAGE`
(2). Sistema sem suporte: `UNSUPPORTED_SYSTEM` (11). Etapa com falha:
`PARTIAL` (10). Sudo com senha: `SUDO_PASSWORD` (13).

#### Limites

O Linuxbrew nunca é removido, porque outras fórmulas podem
depender dele; o texto mostra o comando de desinstalação. Segredos nas linhas
movidas aparecem mascarados no plano. Sem vestígios do SetupVibe 1, o comando
termina com 0 e não altera nada.

#### Exemplos

```bash
{{bin}} migrate --dry-run   # plano, linhas que mudam e duplicidades encontradas
```

```bash
{{bin}} migrate   # converte os arquivos e pergunta sobre cada duplicidade
```

```bash
{{bin}} migrate --remove-legacy go,rbenv   # sem terminal: remove só essas duplicidades
```

```bash
{{bin}} migrate --remove-legacy all   # sem terminal: remove todas as duplicidades
```

```bash
{{bin}} migrate --json --dry-run   # plano completo em JSON
```

### `{{bin}} upgrade`

Substitui o binário pela release mais nova do canal, conferida pelo
`SHA256SUMS` e, quando o cosign está instalado, pela assinatura Sigstore.

#### Sintaxe

```bash
{{bin}} upgrade [--check] [--channel <channel>]
```

#### Argumentos e options

| Nome | Tipo | Obrigatório | Padrão | Valores |
| --- | --- | --- | --- | --- |
| `--check` | flag | não | ausente | só informa se há versão nova |
| `--channel` | enum | não | `stable` | `stable`, `beta` |

#### Saída

Texto: a versão atual, a nova e o resultado da verificação. `data`
traz `current`, `latest`, `minimum`, `changelog`, `updateAvailable`,
`updateRequired`, `checkedAt`, `source` e, quando troca, `upgraded`, `path` e
`signature` (`verified`, `skipped` ou `invalid`).

#### Efeitos persistentes

Baixa o binário da release, confere o SHA-256 e
substitui o executável no próprio caminho. Grava o cache da consulta de versão
em `~/.setupvibe/state/update-check.json`.

#### Permissões

Precisa de permissão de escrita no diretório do binário. Não
usa sudo por conta própria.

#### Recusas e exit codes

Falha de rede ou resposta inesperada:
`NETWORK_OR_API` (5). Sem permissão para trocar o arquivo: `PERMISSION` (7).
Execução a partir do código-fonte: `USAGE` (2). Plataforma sem binário na
release: `UNSUPPORTED_SYSTEM` (11). Assinatura Sigstore inválida:
`NETWORK_OR_API` (5).

#### Limites

Só troca binários compilados. A release precisa listar o arquivo
da plataforma no `SHA256SUMS`. Sem cosign, a conferência fica no SHA-256 e o
texto informa isso. O canal também pode vir de `config.json`.

#### Exemplos

```bash
{{bin}} upgrade --check   # só informa se existe versão nova
```

```bash
{{bin}} upgrade   # baixa, confere e substitui o binário
```

```bash
{{bin}} upgrade --channel beta   # acompanha o canal beta
```

```bash
{{bin}} upgrade --check --json   # estado da atualização para um script
```

```bash
sudo {{bin}} upgrade   # quando o binário está em /usr/local/bin
```

### `{{bin}} skill`

Executa o skills CLI da Vercel fixado no inventory. Os argumentos vão depois
de `--`.

#### Sintaxe

```bash
{{bin}} skill [--] <args>...
```

#### Argumentos e options

| Nome | Tipo | Obrigatório | Padrão | Valores |
| --- | --- | --- | --- | --- |
| `args` | texto, variádico | não | - | argumentos do skills CLI |

#### Saída

Texto: a saída do próprio skills CLI. `data` traz `command`,
`exitCode` e, com `--json`, `output` com o texto capturado.

#### Efeitos persistentes

Dependem do subcomando do skills. Instalação e
remoção de skills gravam nos diretórios do agente escolhido.

#### Permissões

As do skills CLI e do diretório de destino. Não exige root.

#### Recusas e exit codes

Falha do skills CLI: `GENERIC_ERROR` (1). Argumento
inválido para o binário: `USAGE` (2).

#### Limites

Usa o item `skills` quando ele está instalado; sem ele, roda
`npx skills@<versão fixada>`, que exige rede. O `--` é necessário para que
`--json` e outras options cheguem ao skills. A documentação embutida do
SetupVibe fica em `docs` e `--skill`.

#### Exemplos

```bash
{{bin}} skill -- list   # lista as skills instaladas
```

```bash
{{bin}} skill -- add promovaweb/herdrfy -g -a claude-code   # instala a skill para Claude Code
```

```bash
{{bin}} skill -- add https://github.com/promovaweb/setupvibe/tree/v2/desktop/skills/setupvibe   # instala a skill que opera o binário
```

```bash
{{bin}} skill -- update   # atualiza as skills instaladas
```

```bash
{{bin}} skill -- list --json   # guarda a saída do skills no envelope
```

### `{{bin}} report`

Gera um relatório Markdown da máquina para anexar em uma issue do GitHub, sem
segredos.

#### Sintaxe

```bash
{{bin}} report [--output <file>]
```

#### Argumentos e options

| Nome | Tipo | Obrigatório | Padrão | Valores |
| --- | --- | --- | --- | --- |
| `--output` | caminho | não | stdout | arquivo de saída |

#### Saída

Texto: o Markdown. `data` traz `markdown`. Com `--output`, o texto
é uma confirmação e o arquivo recebe o relatório.

#### Efeitos persistentes

Cria o arquivo indicado. Não altera o estado do
SetupVibe.

#### Permissões

Nenhuma. Pode rodar como root. Não exige TTY.

#### Recusas e exit codes

Falha de escrita no arquivo: `PERMISSION` (7).
Nenhuma outra recusa prevista.

#### Limites

O relatório inclui sistema, achados do doctor, itens, apps
externos, último run e as últimas linhas do log, com valores de variáveis
sensíveis mascarados. Ele não substitui o log completo quando o problema
depende de detalhe.

#### Exemplos

```bash
{{bin}} report   # imprime o relatório para copiar na issue
```

```bash
{{bin}} report --output report.md   # grava o relatório em arquivo
```

```bash
{{bin}} report --json   # entrega o Markdown no campo data
```

```bash
{{bin}} report --output report.md && gh issue create --body-file report.md   # abre a issue com o relatório
```

```bash
{{bin}} report | head -40   # lê só o começo, com sistema e versão
```

### `{{bin}} self`

Agrupa os comandos que gerenciam a própria instalação do SetupVibe.

#### Sintaxe

```bash
{{bin}} self <uninstall> [options]
```

#### Argumentos e options

| Nome | Tipo | Obrigatório | Padrão | Valores |
| --- | --- | --- | --- | --- |
| (nenhum) | - | - | - | - |

Sem subcommand, imprime o help e sai com 0; com `--json`, o help vem em `data.help`.

#### Saída

Depende do subcommand. Consulte `self uninstall`.

#### Efeitos persistentes

O subcommand remove arquivos e configurações da
máquina.

#### Permissões

Usa sudo para a regra em `/etc/sudoers.d/`.

#### Recusas e exit codes

Subcommand inválido: `USAGE` (2).

#### Limites

O grupo não tem ação própria. Use `self uninstall` com
`--dry-run` antes de remover.

#### Exemplos

```bash
{{bin}} self uninstall --dry-run   # plano de remoção sem alterar nada
```

```bash
{{bin}} self uninstall --yes   # remove o SetupVibe e mantém backups
```

```bash
{{bin}} self uninstall --yes --keep-data   # remove o binário e mantém ~/.setupvibe
```

```bash
{{bin}} self uninstall --items --yes   # remove também os itens do espaço do usuário
```

```bash
{{bin}} self --help   # lista o subcommand disponível
```

### `{{bin}} self uninstall`

Remove o SetupVibe: blocos do shell, regra de sudo, binário e estado. Backups
e volumes do Portainer ficam.

#### Sintaxe

```bash
{{bin}} self uninstall [--items] [--keep-data] [--yes] [--dry-run]
```

#### Argumentos e options

| Nome | Tipo | Obrigatório | Padrão | Valores |
| --- | --- | --- | --- | --- |
| `--items` | flag | não | ausente | remove também os itens do espaço do usuário |
| `--keep-data` | flag | não | ausente | mantém `~/.setupvibe/` |
| `--yes` | flag | não | ausente | não pede confirmação (`-y`) |
| `--dry-run` | flag | não | ausente | presente ou ausente |

#### Saída

Texto: cada etapa e o resumo. `data` traz `dryRun` e `steps` no plano; `log` e
`results` na execução.

#### Efeitos persistentes

Remove os blocos do shell, a regra
`/etc/sudoers.d/90-setupvibe-<user>`, os binários encontrados e, sem
`--keep-data`, `~/.setupvibe/`. Com `--items`, remove também os itens
selecionados no espaço do usuário.

#### Permissões

Usa sudo para a regra de sudo e para pacotes. Sem terminal,
exige `--yes`.

#### Recusas e exit codes

Sem `--yes` e sem terminal: `USAGE` (2). Resposta
negativa: `INTERRUPTED` (130). Etapa com falha: `PARTIAL` (10). Sudo com
senha: `SUDO_PASSWORD` (13).

#### Limites

Backups dos seus arquivos, volumes do Portainer e restos do
SetupVibe 1 ficam. `--keep-data` preserva estado, logs e backups. Os itens do
espaço do usuário só saem com `--items`.

#### Exemplos

```bash
{{bin}} self uninstall --dry-run   # mostra tudo o que seria removido
```

```bash
{{bin}} self uninstall --yes   # remove o SetupVibe e mantém backups e Portainer
```

```bash
{{bin}} self uninstall --yes --keep-data   # mantém o estado e os logs em ~/.setupvibe
```

```bash
{{bin}} self uninstall --items --yes   # remove também os itens instalados no espaço do usuário
```

```bash
{{bin}} self uninstall --yes --json   # resultado da remoção em JSON
```

### `{{bin}} ssh`

Agrupa os utilitários de SSH.

#### Sintaxe

```bash
{{bin}} ssh <copy-id> [options]
```

#### Argumentos e options

| Nome | Tipo | Obrigatório | Padrão | Valores |
| --- | --- | --- | --- | --- |
| (nenhum) | - | - | - | - |

Sem subcommand, imprime o help e sai com 0; com `--json`, o help vem em `data.help`.

#### Saída

Depende do subcommand. Consulte `ssh copy-id`.

#### Efeitos persistentes

O subcommand altera o `authorized_keys` do servidor
remoto.

#### Permissões

As da sessão SSH de destino.

#### Recusas e exit codes

Subcommand inválido: `USAGE` (2).

#### Limites

O grupo não tem ação própria. A chave privada nunca sai da
máquina.

#### Exemplos

```bash
{{bin}} ssh copy-id deploy@203.0.113.10   # autoriza a chave padrão no servidor
```

```bash
{{bin}} ssh copy-id deploy@host --port 2222   # usa uma porta SSH diferente
```

```bash
printf %s "$PASS" | {{bin}} ssh copy-id root@host --password-stdin   # responde a senha pelo stdin
```

```bash
{{bin}} ssh copy-id deploy@host --key ~/.ssh/id_ed25519.pub   # escolhe a chave pública
```

```bash
{{bin}} ssh copy-id deploy@host --json   # resultado da cópia em JSON
```

### `{{bin}} ssh copy-id`

Instala a sua chave pública no servidor remoto uma vez, com modos de arquivo
seguros.

#### Sintaxe

```bash
{{bin}} ssh copy-id <target> [--port <port>] [--key <file>] [--password-stdin]
```

#### Argumentos e options

| Nome | Tipo | Obrigatório | Padrão | Valores |
| --- | --- | --- | --- | --- |
| `target` | texto | sim | - | `user@host` ou `host` |
| `--port` | inteiro | não | `22` | 1 a 65535 |
| `--key` | caminho | não | primeira de `~/.ssh/id_ed25519.pub`, `id_ecdsa.pub`, `id_rsa.pub` | chave pública |
| `--password-stdin` | flag | não | ausente | lê a senha do stdin e usa `sshpass` |

#### Saída

Texto: confirmação com o arquivo da chave e o destino. `data` traz
`target`, `key` e `exitCode`.

#### Efeitos persistentes

Acrescenta a chave ao `authorized_keys` do servidor
remoto. Na máquina local, nada muda.

#### Permissões

Precisa de acesso SSH ao destino. Com `--password-stdin`,
exige `sshpass` instalado. A chave viaja pelo stdin, nunca pela linha de
comando.

#### Recusas e exit codes

Destino inválido: `USAGE` (2). Chave pública ausente
ou `sshpass` não instalado: `NOT_FOUND` (6). SSH recusou a conexão ou o
comando: `GENERIC_ERROR` (1).

#### Limites

Instala uma chave por execução. Não cria chave nova; use
`ssh-keygen -t ed25519`. Não altera a configuração do servidor além do
`authorized_keys`.

#### Exemplos

```bash
{{bin}} ssh copy-id deploy@203.0.113.10   # autoriza a chave padrão no destino
```

```bash
printf %s "$PASS" | {{bin}} ssh copy-id root@host --password-stdin   # usa sshpass com a senha vinda do stdin
```

```bash
{{bin}} ssh copy-id deploy@host --port 2222   # servidor com SSH em outra porta
```

```bash
{{bin}} ssh copy-id deploy@host --key ~/.ssh/id_ed25519.pub   # escolhe a chave pública
```

```bash
{{bin}} ssh copy-id deploy@host --json   # confirmação e exit code em JSON
```

### `{{bin}} user`

Cria o usuário de trabalho e gerencia a regra de sudo dele.

#### Sintaxe

```bash
{{bin}} user <create|nopasswd> [options]
```

#### Argumentos e options

| Nome | Tipo | Obrigatório | Padrão | Valores |
| --- | --- | --- | --- | --- |
| (nenhum) | - | - | - | - |

Sem subcommand, imprime o help e sai com 0; com `--json`, o help vem em `data.help`.

#### Saída

Depende do subcommand. Consulte `user create` e `user nopasswd`.

#### Efeitos persistentes

Cria usuário, home, grupo de sudo e regra em
`/etc/sudoers.d/`.

#### Permissões

Roda como root.

#### Recusas e exit codes

Subcommand inválido: `USAGE` (2).

#### Limites

O grupo não tem ação própria. Use `user create` antes do init na
máquina nova.

#### Exemplos

```bash
{{bin}} user create deploy --ssh-key ~/.ssh/id_ed25519.pub   # cria o usuário com a chave
```

```bash
{{bin}} user create deploy --nopasswd   # cria com sudo sem senha para automação
```

```bash
{{bin}} user nopasswd deploy   # acrescenta a regra de sudo sem senha
```

```bash
{{bin}} user nopasswd deploy --remove   # tira a regra
```

```bash
{{bin}} user create deploy --dry-run   # mostra as etapas sem criar o usuário
```

### `{{bin}} user create`

Cria o usuário de trabalho com sudo, uma chave SSH e, opcionalmente, a regra
de sudo sem senha.

#### Sintaxe

```bash
{{bin}} user create [name] [--ssh-key <key-or-file>] [--nopasswd] [--dry-run]
```

#### Argumentos e options

| Nome | Tipo | Obrigatório | Padrão | Valores |
| --- | --- | --- | --- | --- |
| `name` | texto | não | pergunta no terminal | letras minúsculas, dígitos, `-` e `_` |
| `--ssh-key` | texto ou caminho | não | - | chave pública ou arquivo |
| `--nopasswd` | flag | não | ausente | presente ou ausente |
| `--dry-run` | flag | não | ausente | presente ou ausente |

#### Saída

Texto: cada etapa e o próximo passo, que é entrar como o usuário e
rodar `init`. `data` traz `user`; no plano, `dryRun` e `steps`; na execução, `log`,
`results` e `next`.

#### Efeitos persistentes

Cria o usuário, o home, o grupo de sudo (`wheel` no
Arch e no Omarchy), o `authorized_keys` com a chave e, com `--nopasswd`, a
regra `/etc/sudoers.d/90-setupvibe-<name>` validada com `visudo -cf`. Grava
`user` e `nopasswd` em `config.json`.

#### Permissões

Exige root. Sem nome e com terminal, pergunta o nome. Não usa
sudo: já roda como root.

#### Recusas e exit codes

Nome ausente sem terminal: `USAGE` (2). Nome
inválido: `USAGE` (2). Sistema sem suporte: `UNSUPPORTED_SYSTEM` (11). Etapa
com falha: `PARTIAL` (10).

#### Limites

Cria um usuário por execução. A chave pode ser o texto da chave
pública ou um arquivo; só a primeira linha do arquivo é usada. Depois de
criar, o `init` roda como o usuário novo, não como root.

#### Exemplos

```bash
{{bin}} user create deploy --ssh-key ~/.ssh/id_ed25519.pub   # cria com a chave do arquivo
```

```bash
{{bin}} user create deploy --ssh-key "ssh-ed25519 AAAA..."   # cria com a chave no próprio argumento
```

```bash
{{bin}} user create deploy --nopasswd   # cria com sudo sem senha para automação
```

```bash
{{bin}} user create deploy --dry-run   # plano completo sem criar nada
```

```bash
{{bin}} user create deploy --json   # resultado e próximo passo em JSON
```

### `{{bin}} user nopasswd`

Acrescenta ou remove a regra de sudo sem senha do SetupVibe para um usuário.

#### Sintaxe

```bash
{{bin}} user nopasswd <name> [--remove] [--dry-run]
```

#### Argumentos e options

| Nome | Tipo | Obrigatório | Padrão | Valores |
| --- | --- | --- | --- | --- |
| `name` | texto | sim | - | nome de usuário existente |
| `--remove` | flag | não | ausente | remove a regra |
| `--dry-run` | flag | não | ausente | presente ou ausente |

#### Saída

Texto: cada etapa e, na execução, o caminho do log. `data` traz `user`; no plano,
`dryRun` e `steps`; na execução, `log` e `results`.

#### Efeitos persistentes

Cria ou apaga
`/etc/sudoers.d/90-setupvibe-<name>`. A regra é validada com `visudo -cf`
antes de entrar no lugar.

#### Permissões

Exige root ou sudo.

#### Recusas e exit codes

Etapa com falha: `PARTIAL` (10). Sudo com senha:
`SUDO_PASSWORD` (13).

#### Limites

Não cria usuário. Só mexe na regra do SetupVibe; outras regras em
`/etc/sudoers.d/` ficam intactas.

#### Exemplos

```bash
{{bin}} user nopasswd deploy   # acrescenta a regra sem senha
```

```bash
{{bin}} user nopasswd deploy --remove   # remove a regra sem senha
```

```bash
{{bin}} user nopasswd deploy --dry-run   # mostra a regra sem gravar
```

```bash
{{bin}} user nopasswd deploy --remove --dry-run   # mostra a remoção sem gravar
```

```bash
{{bin}} user nopasswd deploy --json   # resultado da regra em JSON
```

### `{{bin}} security`

Agrupa o módulo de segurança compartilhado. `apply` aplica firewall, fail2ban,
atualizações automáticas, login SSH só por chave e sincronização de horário;
`remove` desfaz o que foi aplicado.

#### Sintaxe

```bash
{{bin}} security <apply|remove> [options]
```

#### Argumentos e options

| Nome | Tipo | Obrigatório | Padrão | Valores |
| --- | --- | --- | --- | --- |
| (nenhum) | - | - | - | - |

Sem subcommand, imprime o help e sai com 0; com `--json`, o help vem em `data.help`.

#### Saída

Depende do subcommand. Consulte `security apply` e
`security remove`.

#### Efeitos persistentes

Altera UFW, fail2ban, atualizações automáticas,
`/etc/ssh/sshd_config.d/10-setupvibe.conf`, NTP e o fuso, e grava
`~/.setupvibe/state/security.json`.

#### Permissões

Usa sudo e exige root ou sudo sem senha em execução sem
terminal.

#### Recusas e exit codes

Subcommand inválido: `USAGE` (2).

#### Limites

O módulo é aplicado pelo `auto` em servidor e em desktop exposto.
Use `security apply` para aplicar sob demanda.

#### Exemplos

```bash
{{bin}} security apply --dry-run   # mostra o plano do módulo
```

```bash
{{bin}} security apply --timezone America/Sao_Paulo   # aplica com o fuso escolhido
```

```bash
{{bin}} security remove --dry-run   # mostra o que seria desfeito
```

```bash
{{bin}} security remove   # desfaz o módulo, mantendo os pacotes
```

```bash
{{bin}} security apply --json   # plano ou resultado em JSON
```

### `{{bin}} security apply`

Aplica o firewall, o fail2ban, as atualizações automáticas, o login SSH só
por chave e a sincronização de horário.

#### Sintaxe

```bash
{{bin}} security apply [--timezone <zone>] [--swarm] [--dry-run]
```

#### Argumentos e options

| Nome | Tipo | Obrigatório | Padrão | Valores |
| --- | --- | --- | --- | --- |
| `--timezone` | texto | não | fuso atual | zona IANA, como `America/Sao_Paulo` |
| `--swarm` | flag | não | ausente | server: abre as portas do Swarm |
| `--dry-run` | flag | não | ausente | presente ou ausente |

#### Saída

Texto: cada parte com ✓ ou ✗ e as partes puladas com o motivo.
`data` traz `dryRun`, `skipped` e `steps` no plano; `log` e `results` na
execução.

#### Efeitos persistentes

Configura UFW negando entrada exceto SSH (e portas
do Swarm com `--swarm`), o jail `sshd` do fail2ban, atualizações automáticas no
Debian e Ubuntu, NTP e fuso. Move o SSH para login só por chave quando o
usuário tem chave autorizada. Grava o estado anterior em
`~/.setupvibe/state/security.json` antes da primeira mudança.

#### Permissões

Exige root ou sudo. Em execução sem terminal, o sudo precisa
funcionar sem senha.

#### Recusas e exit codes

Sistema sem suporte: `UNSUPPORTED_SYSTEM` (11).
Parte com falha: `PARTIAL` (10). Sudo com senha: `SUDO_PASSWORD` (13).

#### Limites

Sem chave autorizada, a parte de SSH é pulada e o fechamento
informa isso; o SetupVibe nunca liga autenticação por senha. O primeiro
registro de estado é mantido nas execuções seguintes. Containers que publicam
porta em todas as interfaces passam pelo firewall do Docker; o `doctor`
aponta esses casos.

#### Exemplos

```bash
{{bin}} security apply --dry-run   # plano completo sem alterar nada
```

```bash
{{bin}} security apply --timezone America/Sao_Paulo   # aplica com o fuso de São Paulo
```

```bash
{{bin}} security apply --json   # partes puladas e resultados em JSON
```

```bash
{{bin}} security apply --swarm   # servidor: abre também as portas do Swarm
```

```bash
{{bin}} security apply --timezone UTC --dry-run | grep -i time   # confere só a parte de horário
```

### `{{bin}} security remove`

Desfaz o módulo de segurança a partir do estado registrado antes da aplicação.
Os pacotes continuam instalados.

#### Sintaxe

```bash
{{bin}} security remove [--dry-run]
```

#### Argumentos e options

| Nome | Tipo | Obrigatório | Padrão | Valores |
| --- | --- | --- | --- | --- |
| `--dry-run` | flag | não | ausente | presente ou ausente |

#### Saída

Texto: cada etapa e, na execução, o caminho do log. `data` traz `record`; no plano, `dryRun` e `steps`; na execução, `log` e
`results`.

#### Efeitos persistentes

Apaga o drop-in de SSH depois de `sshd -t`, o jail
do fail2ban e a configuração de atualizações automáticas. Desliga UFW e
fail2ban quando estavam desligados antes. Apaga o registro
`~/.setupvibe/state/security.json`.

#### Permissões

Exige root ou sudo.

#### Recusas e exit codes

Sem registro: `CONFIG` (3). Parte com falha:
`PARTIAL` (10). Sudo com senha: `SUDO_PASSWORD` (13).

#### Limites

Arquivos que já existiam antes do SetupVibe ficam. Os pacotes não
são removidos. Sem o registro, o comando não tenta adivinhar o estado
anterior.

#### Exemplos

```bash
{{bin}} security remove --dry-run   # mostra o que seria desfeito
```

```bash
{{bin}} security remove   # desfaz o módulo e apaga o registro
```

```bash
{{bin}} security remove --json   # resultado em JSON
```

```bash
{{bin}} security remove; echo "exit=$?"   # confere o code quando não há registro
```

```bash
{{bin}} security remove && {{bin}} doctor   # remove e confere o estado da máquina
```

### `{{bin}} about`

Mostra versão, executável, runtime, plataforma e credits.

#### Sintaxe

```bash
{{bin}} about [--json]
```

#### Argumentos e options

| Nome | Tipo | Obrigatório | Padrão | Valores |
| --- | --- | --- | --- | --- |
| (nenhum) | - | - | - | - |

#### Saída

Texto: título, descrição e as tabelas `Binary`, `Project` e
`Credits`. `data` traz `bin`, `title`, `version`, `description`, `author`,
`site`, `repository`, `license`, `executable`, `runtime`, `platform`,
`system`, `pid`, `dataDir` e `credits`.

#### Efeitos persistentes

Nenhum.

#### Permissões

Nenhuma. Pode rodar como root.

#### Recusas e exit codes

Nenhuma recusa prevista. Retorna 0.

#### Limites

`system` é um resumo de uma linha; para os detalhes, use
`system`. O `pid` muda a cada execução.

#### Exemplos

```bash
{{bin}} about   # versão, executável, runtime, plataforma e credits
```

```bash
{{bin}} about --json   # identidade completa para um agente
```

```bash
{{bin}} about | grep -i credit -A 10   # só a lista de credits
```

```bash
{{bin}} about --json | jq -r '.data.executable'   # caminho do binário em uso
```

```bash
{{bin}} about --json | jq -r '.data.version'   # versão para comparar com a release
```

### `{{bin}} config`

Lê e grava preferências em `~/.setupvibe/settings.json`.

#### Sintaxe

```bash
{{bin}} config <subcommand> [options]
```

#### Argumentos e options

| Nome | Tipo | Obrigatório | Padrão | Valores |
| --- | --- | --- | --- | --- |
| (nenhum) | - | - | - | - |

Sem subcommand, imprime o help e sai com 0; com `--json`, o help vem em `data.help`.

#### Saída

Depende do subcommand. Consulte as seções de cada um.

#### Efeitos persistentes

`set`, `unset` e `import` gravam `settings.json` com
modo 0600. `export` grava um arquivo de respostas quando recebe um caminho.

#### Permissões

Nenhuma. Chaves desconhecidas são aceitas como texto, para
extensões de projeto.

#### Recusas e exit codes

JSON inválido no arquivo: `CONFIG` (3). Falha de
leitura ou escrita: `PERMISSION` (7). Chave inexistente em `get`: `CONFIG`
(3). Subcommand inválido: `USAGE` (2).

#### Limites

Segredos não entram em `settings.json`; use `credentials`. Keys
usam notação de ponto.

#### Exemplos

```bash
{{bin}} config list   # todas as chaves com o valor efetivo
```

```bash
{{bin}} config get output.format   # valor de uma chave
```

```bash
{{bin}} config set output.format json   # grava uma preferência
```

```bash
{{bin}} config export setupvibe.json   # grava a seleção para outra máquina
```

```bash
{{bin}} config import setupvibe.json --dry-run   # confere o arquivo antes de instalar
```

### `{{bin}} config list`

Lista cada chave com o valor efetivo, juntando o arquivo com os padrões.

#### Sintaxe

```bash
{{bin}} config list [--json]
```

#### Argumentos e options

| Nome | Tipo | Obrigatório | Padrão | Valores |
| --- | --- | --- | --- | --- |
| (nenhum) | - | - | - | - |

O alias `ls` tem o mesmo efeito.

#### Saída

Texto: o caminho do arquivo e uma tabela `chave valor`. `data` traz
`file`, `exists` e `values`, com um objeto de chave para valor.

#### Efeitos persistentes

Nenhum. O arquivo não é criado.

#### Permissões

Nenhuma.

#### Recusas e exit codes

JSON inválido: `CONFIG` (3). Arquivo ilegível:
`PERMISSION` (7).

#### Limites

O valor é o efetivo, não só o que está no arquivo. `exists`
informa se o arquivo já foi criado.

#### Exemplos

```bash
{{bin}} config list   # todas as chaves efetivas
```

```bash
{{bin}} config list --json   # objeto values para um script
```

```bash
{{bin}} config list | grep tui   # só as preferências da TUI
```

```bash
{{bin}} config list --json | jq -r '.data.values["output.format"]'   # formato de saída efetivo
```

```bash
{{bin}} config list --json | jq '.data.exists'   # confere se settings.json já existe
```

### `{{bin}} config get`

Mostra o valor de uma chave.

#### Sintaxe

```bash
{{bin}} config get <key> [--json]
```

#### Argumentos e options

| Nome | Tipo | Obrigatório | Padrão | Valores |
| --- | --- | --- | --- | --- |
| `key` | texto | sim | - | chave em notação de ponto, como `output.format` |

#### Saída

Texto: o valor. Strings saem sem aspas; números, booleanos e
objetos saem em JSON. `data` traz `key` e `value`.

#### Efeitos persistentes

Nenhum.

#### Permissões

Nenhuma.

#### Recusas e exit codes

Chave inexistente: `CONFIG` (3), com a sugestão de
`config schema`. JSON inválido: `CONFIG` (3). Arquivo ilegível: `PERMISSION`
(7).

#### Limites

Devolve o valor efetivo, inclusive padrão. Não distingue valor
gravado de valor padrão; para isso, leia o arquivo ou use `list --json` com
`exists`.

#### Exemplos

```bash
{{bin}} config get output.format   # formato de saída efetivo
```

```bash
{{bin}} config get tui.theme   # paleta da TUI
```

```bash
{{bin}} config get tui.initialTab --json   # chave e valor em JSON
```

```bash
{{bin}} config get chave.inexistente; echo "exit=$?"   # confirma o exit code 3
```

```bash
{{bin}} config get shell.agentAliases   # confere se os aliases de agente estão ligados
```

### `{{bin}} config set`

Grava um valor em `settings.json`, convertendo o tipo conforme o schema.

#### Sintaxe

```bash
{{bin}} config set <key> <value> [--json]
```

#### Argumentos e options

| Nome | Tipo | Obrigatório | Padrão | Valores |
| --- | --- | --- | --- | --- |
| `key` | texto | sim | - | chave em notação de ponto |
| `value` | texto | sim | - | texto; booleanos aceitam `true`, `false`, `yes`, `no`, `1`, `0`, `on`, `off` |

#### Saída

Texto: confirmação com o valor convertido e um aviso quando a chave
está fora do schema. `data` traz `key`, `value`, `file` e `unknownKey`.

#### Efeitos persistentes

Cria ou atualiza `settings.json`, com modo 0600 e
indentação de dois espaços. Chave fora do schema é gravada como texto.

#### Permissões

Nenhuma.

#### Recusas e exit codes

Valor fora do tipo ou da lista aceita: `CONFIG` (3).
Falha de escrita: `PERMISSION` (7).

#### Limites

Não valida o efeito da preferência em outros arquivos. Depois de
mudar `shell.agentAliases`, rode `shell apply`. `output.format = json` muda o
formato padrão de todos os comandos.

#### Exemplos

```bash
{{bin}} config set output.format json   # passa a usar JSON por padrão
```

```bash
{{bin}} config set output.colors false   # desliga cores no texto
```

```bash
{{bin}} config set shell.agentAliases false   # deixa os aliases de agente de fora no próximo shell apply
```

```bash
{{bin}} config set tui.theme day   # troca a paleta da TUI
```

```bash
{{bin}} config set minha.chave valor --json   # chave fora do schema, gravada como texto
```

### `{{bin}} config unset`

Remove uma chave do arquivo. A chave volta ao padrão, quando existe.

#### Sintaxe

```bash
{{bin}} config unset <key> [--json]
```

#### Argumentos e options

| Nome | Tipo | Obrigatório | Padrão | Valores |
| --- | --- | --- | --- | --- |
| `key` | texto | sim | - | chave em notação de ponto |

O alias `rm` tem o mesmo efeito.

#### Saída

Texto: confirmação ou aviso de que a chave não estava gravada.
`data` traz `key` e `removed`.

#### Efeitos persistentes

Reescreve `settings.json` só quando algo foi
removido.

#### Permissões

Nenhuma.

#### Recusas e exit codes

JSON inválido: `CONFIG` (3). Falha de escrita:
`PERMISSION` (7).

#### Limites

Chave ausente não é erro: retorna 0 com `removed = false`. Para
voltar ao padrão, remova a chave em vez de gravar o valor padrão.

#### Exemplos

```bash
{{bin}} config unset telemetry.enabled   # volta ao padrão
```

```bash
{{bin}} config unset output.format   # volta a usar texto por padrão
```

```bash
{{bin}} config unset tui.theme --json   # confirma a remoção em JSON
```

```bash
{{bin}} config unset minha.chave; echo "exit=$?"   # chave ausente também retorna 0
```

```bash
{{bin}} config unset shell.agentAliases && {{bin}} shell apply   # volta aos aliases padrão e reaplica
```

### `{{bin}} config path`

Imprime o diretório de estado e os caminhos dos arquivos.

#### Sintaxe

```bash
{{bin}} config path [--json]
```

#### Argumentos e options

| Nome | Tipo | Obrigatório | Padrão | Valores |
| --- | --- | --- | --- | --- |
| (nenhum) | - | - | - | - |

#### Saída

Texto: tabela com `Directory`, `settings.json`, `credentials.json`
e `master.key`. `data` traz `base`, `settings`, `credentials` e `masterKey`.

#### Efeitos persistentes

Nenhum. Não cria a pasta.

#### Permissões

Nenhuma.

#### Recusas e exit codes

Nenhuma recusa prevista.

#### Limites

Com `SETUPVIBE_HOME`, os caminhos apontam para a pasta
alternativa. As duas edições usam `~/.setupvibe/`.

#### Exemplos

```bash
{{bin}} config path   # diretório e arquivos de estado
```

```bash
{{bin}} config path --json   # caminhos para um script
```

```bash
SETUPVIBE_HOME=/tmp/sv {{bin}} config path   # confere o desvio de pasta
```

```bash
{{bin}} config path --json | jq -r '.data.settings'   # caminho do settings.json
```

```bash
{{bin}} config path --json | jq -r '.data.masterKey'   # caminho da chave mestra
```

### `{{bin}} config schema`

Lista as chaves conhecidas com tipo, padrão e descrição.

#### Sintaxe

```bash
{{bin}} config schema [--json]
```

#### Argumentos e options

| Nome | Tipo | Obrigatório | Padrão | Valores |
| --- | --- | --- | --- | --- |
| (nenhum) | - | - | - | - |

#### Saída

Texto: tabela com chave, descrição, tipo e padrão. `data` traz
`keys`, e cada chave traz `key`, `type`, `default`, `description` e `values`
quando for enum.

#### Efeitos persistentes

Nenhum.

#### Permissões

Nenhuma.

#### Recusas e exit codes

Nenhuma recusa prevista.

#### Limites

O schema cobre as chaves do SetupVibe. Projetos derivados podem
ter chaves próprias; essas aparecem em `set` com `unknownKey = true`.

#### Exemplos

```bash
{{bin}} config schema   # todas as chaves conhecidas
```

```bash
{{bin}} config schema --json   # schema completo para validação
```

```bash
{{bin}} config schema | grep -A 1 output.format   # detalhe de uma chave
```

```bash
{{bin}} config schema --json | jq -r '.data.keys[].key'   # só os nomes das chaves
```

```bash
{{bin}} config schema | grep enum   # chaves com lista fechada de valores
```

### `{{bin}} config export`

Grava a seleção e a identidade como arquivo de respostas para `config import`
e `auto --config`.

#### Sintaxe

```bash
{{bin}} config export [file] [--json]
```

#### Argumentos e options

| Nome | Tipo | Obrigatório | Padrão | Valores |
| --- | --- | --- | --- | --- |
| `file` | caminho | não | stdout | arquivo de saída |

#### Saída

Sem arquivo, o JSON do arquivo de respostas. Com arquivo, uma
confirmação com a quantidade de itens. `data` traz `schemaVersion`, `edition`,
`user` quando houver, `git` quando houver, `profile`, `only` e `timezone`
quando houver.

#### Efeitos persistentes

Cria o arquivo indicado. Não altera a máquina.

#### Permissões

Nenhuma.

#### Recusas e exit codes

Falha de escrita: `PERMISSION` (7).

#### Limites

O arquivo não leva segredos. A lista `only` traz os ids da
seleção naquele momento; itens fora do inventory não entram. O campo `profile`
é `none`; no `auto --config`, isso vale como sem profile e a seleção vem de
`only`.

#### Exemplos

```bash
{{bin}} config export   # imprime o arquivo de respostas em stdout
```

```bash
{{bin}} config export setupvibe.json   # grava o arquivo para outra máquina
```

```bash
{{bin}} config export --json   # envelope com o conteúdo em data
```

```bash
{{bin}} config export | jq -r '.only[]'   # lista os ids exportados
```

```bash
{{bin}} config export setupvibe.json && scp setupvibe.json deploy@host:   # leva a seleção para o servidor
```

### `{{bin}} config import`

Instala os itens e a identidade do Git de um arquivo exportado em outra
máquina.

#### Sintaxe

```bash
{{bin}} config import <file> [--dry-run]
```

#### Argumentos e options

| Nome | Tipo | Obrigatório | Padrão | Valores |
| --- | --- | --- | --- | --- |
| `file` | caminho | sim | - | arquivo de `config export` |
| `--dry-run` | flag | não | ausente | presente ou ausente |

#### Saída

Texto: cada etapa e, na execução, o caminho do log. `data` traz `dryRun`, `items` e
`skipped` no plano; `log` e `results` na execução, com `checks` quando houver
falha.

#### Efeitos persistentes

Instala os itens do arquivo, grava a identidade do
Git com `git config --global` e atualiza `selection.json`.

#### Permissões

Exige init concluído. Usa sudo quando o método exige.

#### Recusas e exit codes

JSON inválido ou arquivo com segredo: `USAGE` (2).
Sem init: `CONFIG` (3). Etapa com falha: `PARTIAL` (10). Sudo com senha:
`SUDO_PASSWORD` (13).

#### Limites

O arquivo precisa vir de `config export`; campos com
`tailscaleAuthKey`, `ghToken`, `token` ou `swarmToken` são recusados. Apps
instalados com `--external` não entram na importação.

#### Exemplos

```bash
{{bin}} config import setupvibe.json --dry-run   # mostra o que seria instalado
```

```bash
{{bin}} config import setupvibe.json   # instala os itens e a identidade do Git
```

```bash
{{bin}} config import setupvibe.json --json   # resultado em JSON
```

```bash
{{bin}} config import setupvibe.json 2>/dev/null; echo "exit=$?"   # confere o resultado em um script
```

```bash
{{bin}} config import setupvibe.json && {{bin}} check   # importa e verifica a seleção
```

### `{{bin}} credentials`

Agrupa o cofre de segredos cifrado com AES-256-GCM em
`~/.setupvibe/credentials.json`.

#### Sintaxe

```bash
{{bin}} credentials <subcommand> [options]
```

#### Argumentos e options

| Nome | Tipo | Obrigatório | Padrão | Valores |
| --- | --- | --- | --- | --- |
| (nenhum) | - | - | - | - |

O alias `cred` tem o mesmo efeito. Sem subcommand, imprime o help e sai com 0; com `--json`, o help vem em `data.help`.

#### Saída

Depende do subcommand. Nenhum subcommand devolve o valor completo
sem `--reveal`.

#### Efeitos persistentes

Grava `credentials.json` e `master.key` com modo
0600. `clear` apaga o cofre; `rotate-key` troca a chave.

#### Permissões

Nenhuma além da escrita em `~/.setupvibe/`.

#### Recusas e exit codes

Cofre ilegível ou credencial ausente: `CREDENTIALS`
(4). Falha de escrita: `PERMISSION` (7). Entrada cancelada: `INTERRUPTED`
(130). Nome inválido: `USAGE` (2).

#### Limites

A chave vem de `SETUPVIBE_MASTER_KEY` ou de `master.key`. Os
comandos que chamam API leem com `getCredential(name)` e saem com 4 quando o
valor não existe. Nenhuma tool MCP devolve o valor de uma credencial.

#### Exemplos

```bash
{{bin}} credentials set openai.api_key   # grava sem eco no terminal
```

```bash
{{bin}} credentials get openai.api_key   # mostra o valor mascarado
```

```bash
{{bin}} credentials list   # nomes salvos, sem valores
```

```bash
{{bin}} credentials remove github.token   # apaga uma credencial
```

```bash
{{bin}} credentials status   # arquivo, origem da chave e quantidade
```

### `{{bin}} credentials set`

Grava ou substitui uma credencial. O valor é lido sem eco ou pelo stdin.

#### Sintaxe

```bash
{{bin}} credentials set <name> [--stdin]
```

#### Argumentos e options

| Nome | Tipo | Obrigatório | Padrão | Valores |
| --- | --- | --- | --- | --- |
| `name` | texto | sim | - | letras minúsculas, dígitos, ponto, hífen e `_`, até 64 caracteres |
| `--stdin` | flag | não | ausente | lê a primeira linha do stdin mesmo em terminal |

#### Saída

Texto: confirmação com o caminho do cofre. `data` traz `name`,
`file` e `saved`.

#### Efeitos persistentes

Cria ou atualiza `credentials.json`. Cria
`master.key` com modo 0600 na primeira gravação, quando não há chave no
ambiente.

#### Permissões

Exige terminal para digitar sem eco; sem terminal ou com
`--stdin`, lê a primeira linha do stdin.

#### Recusas e exit codes

Nome inválido: `USAGE` (2). Valor vazio no stdin: `USAGE` (2). Ctrl+C:
`INTERRUPTED` (130). Falha de chave ou de cofre: `CREDENTIALS` (4). Falha de
escrita: `PERMISSION` (7).

#### Limites

Não aceita o valor por argumento, para não deixar o segredo no
histórico e na lista de processos. Uma credencial por execução. O valor é
gravado como texto e cifrado no arquivo.

#### Exemplos

```bash
{{bin}} credentials set openai.api_key   # pede o valor sem eco
```

```bash
printf '%s' "$TOKEN" | {{bin}} credentials set github.token --stdin   # valor vindo de uma variável
```

```bash
{{bin}} credentials set openai.api_key   # repete o nome para substituir o valor
```

```bash
printf '%s\n' "$SECRET" | {{bin}} credentials set api.token --stdin   # primeira linha do stdin
```

```bash
{{bin}} credentials set openai.api_key --json   # confirmação em JSON
```

### `{{bin}} credentials get`

Mostra uma credencial mascarada. Use `--reveal` para o valor completo.

#### Sintaxe

```bash
{{bin}} credentials get <name> [--reveal] [--json]
```

#### Argumentos e options

| Nome | Tipo | Obrigatório | Padrão | Valores |
| --- | --- | --- | --- | --- |
| `name` | texto | sim | - | nome da credencial |
| `--reveal` | flag | não | ausente | imprime o valor completo |

#### Saída

Sem `--reveal`, texto com a máscara e `data` com `name`, `masked` e
`length`. Com `--reveal`, texto com o valor e `data` com `name` e `value`.

#### Efeitos persistentes

Nenhum.

#### Permissões

Nenhuma, mas o valor completo aparece no terminal e no
histórico de saída.

#### Recusas e exit codes

Nome inválido: `USAGE` (2). Credencial ausente:
`CREDENTIALS` (4). Cofre ilegível: `CREDENTIALS` (4).

#### Limites

A máscara mostra poucos caracteres. `--reveal` em um agente
grava o segredo no log da sessão; prefira consumir o valor direto no comando
que precisa dele. Não existe opção para copiar para a área de transferência.

#### Exemplos

```bash
{{bin}} credentials get openai.api_key   # valor mascarado
```

```bash
{{bin}} credentials get openai.api_key --reveal   # valor completo no terminal
```

```bash
{{bin}} credentials get openai.api_key --json   # nome, máscara e tamanho
```

```bash
{{bin}} credentials get credencial.ausente; echo "exit=$?"   # confirma o exit code 4
```

```bash
TOKEN=$({{bin}} credentials get github.token --reveal) && curl -H "Authorization: Bearer $TOKEN" https://api.github.com/user   # usa o valor sem imprimir
```

### `{{bin}} credentials list`

Lista os nomes salvos. Nunca mostra valores.

#### Sintaxe

```bash
{{bin}} credentials list [--json]
```

#### Argumentos e options

| Nome | Tipo | Obrigatório | Padrão | Valores |
| --- | --- | --- | --- | --- |
| (nenhum) | - | - | - | - |

O alias `ls` tem o mesmo efeito.

#### Saída

Texto: um nome por linha, ou o aviso de cofre vazio. `data` traz
`count` e `names`.

#### Efeitos persistentes

Nenhum.

#### Permissões

Nenhuma.

#### Recusas e exit codes

Cofre ilegível: `CREDENTIALS` (4).

#### Limites

Lista apenas nomes. Para saber a origem da chave, use `status`.
Cofre inexistente devolve lista vazia e code 0.

#### Exemplos

```bash
{{bin}} credentials list   # nomes salvos
```

```bash
{{bin}} credentials list --json   # quantidade e nomes em JSON
```

```bash
{{bin}} credentials list | wc -l   # quantas credenciais existem
```

```bash
for name in $({{bin}} credentials list); do echo "$name"; done   # percorre os nomes
```

```bash
{{bin}} credentials list --json | jq -r '.data.names[]'   # nomes para um script
```

### `{{bin}} credentials remove`

Remove uma credencial do cofre.

#### Sintaxe

```bash
{{bin}} credentials remove <name> [--json]
```

#### Argumentos e options

| Nome | Tipo | Obrigatório | Padrão | Valores |
| --- | --- | --- | --- | --- |
| `name` | texto | sim | - | nome da credencial |

O alias `rm` tem o mesmo efeito.

#### Saída

Texto: confirmação ou aviso de que a credencial não existia.
`data` traz `name` e `removed`.

#### Efeitos persistentes

Reescreve `credentials.json` sem a credencial.

#### Permissões

Nenhuma além da escrita no cofre.

#### Recusas e exit codes

Nome inválido: `USAGE` (2). Falha de cofre:
`CREDENTIALS` (4). Falha de escrita: `PERMISSION` (7).

#### Limites

Nome ausente não é erro: retorna 0 com `removed = false`. A
chave mestra não é trocada.

#### Exemplos

```bash
{{bin}} credentials remove github.token   # apaga a credencial
```

```bash
{{bin}} credentials remove github.token --json   # confirma o que saiu
```

```bash
{{bin}} credentials remove antiga.chave; echo "exit=$?"   # nome ausente retorna 0
```

```bash
{{bin}} credentials remove github.token && {{bin}} credentials list   # confere a lista depois
```

```bash
{{bin}} credentials remove github.token 2>/dev/null || true   # remove sem falhar quando já não existe
```

### `{{bin}} credentials status`

Mostra o arquivo, a origem da chave mestra e a quantidade de credenciais.

#### Sintaxe

```bash
{{bin}} credentials status [--json]
```

#### Argumentos e options

| Nome | Tipo | Obrigatório | Padrão | Valores |
| --- | --- | --- | --- | --- |
| (nenhum) | - | - | - | - |

#### Saída

Texto: tabela com `File`, `Cipher`, `Master key` e `Credentials`,
seguida dos nomes. `data` traz `file`, `exists`, `masterKeySource`, `count`,
`names`, `masterKeyVariable` e `algorithm`.

#### Efeitos persistentes

Nenhum.

#### Permissões

Nenhuma.

#### Recusas e exit codes

Nenhuma recusa prevista. Cofre ilegível aparece como
lista vazia no texto, sem apagar nada.

#### Limites

`masterKeySource` é `env`, `file` ou `none`. O status não decifra
os valores, só tenta ler os nomes.

#### Exemplos

```bash
{{bin}} credentials status   # arquivo, cifra, chave e quantidade
```

```bash
{{bin}} credentials status --json   # estado completo para um agente
```

```bash
{{bin}} credentials status | grep Master   # só a origem da chave
```

```bash
{{bin}} credentials status --json | jq -r '.data.masterKeySource'   # env, file ou none
```

```bash
{{bin}} credentials status --json | jq '.data.count'   # quantas credenciais existem
```

### `{{bin}} credentials clear`

Apaga `credentials.json` por inteiro. Mantém `master.key`. Pede confirmação
em terminal.

#### Sintaxe

```bash
{{bin}} credentials clear [--yes]
```

#### Argumentos e options

| Nome | Tipo | Obrigatório | Padrão | Valores |
| --- | --- | --- | --- | --- |
| `--yes` | flag | não | ausente | não pede confirmação (`-y`) |

#### Saída

Texto: confirmação ou aviso de que não havia cofre. `data` traz
`file` e `deleted`.

#### Efeitos persistentes

Apaga o cofre cifrado. A chave mestra e os demais
arquivos ficam.

#### Permissões

Em terminal, pede confirmação. Sem terminal e sem `--yes`,
considera a resposta negativa.

#### Recusas e exit codes

Resposta negativa ou sem `--yes` fora de terminal:
`INTERRUPTED` (130). Falha de escrita: `PERMISSION` (7).

#### Limites

Não apaga `master.key`, então um cofre novo usará a mesma chave.
Para trocar a chave, use `rotate-key`. Não há como recuperar os valores
apagados.

#### Exemplos

```bash
{{bin}} credentials clear   # pergunta antes de apagar
```

```bash
{{bin}} credentials clear --yes   # apaga sem perguntar
```

```bash
{{bin}} credentials clear --yes --json   # confirma o que foi apagado
```

```bash
{{bin}} credentials clear --yes && {{bin}} credentials status   # confere que o cofre sumiu
```

```bash
{{bin}} credentials clear; echo "exit=$?"   # sem terminal e sem --yes, confirma o 130
```

### `{{bin}} credentials rotate-key`

Recifra o cofre com uma chave mestra nova e grava `master.key` com modo 0600.

#### Sintaxe

```bash
{{bin}} credentials rotate-key [--from-env]
```

#### Argumentos e options

| Nome | Tipo | Obrigatório | Padrão | Valores |
| --- | --- | --- | --- | --- |
| `--from-env` | flag | não | ausente | usa `SETUPVIBE_MASTER_KEY` como chave nova |

#### Saída

Texto: confirmação. `data` traz `rotated` e `source` (`env` ou
`file`).

#### Efeitos persistentes

Substitui `master.key` e recifra
`credentials.json`. Com `--from-env`, a chave atual é lida de `master.key` e a
nova vem da variável.

#### Permissões

Nenhuma além da escrita no cofre.

#### Recusas e exit codes

Cofre inexistente: `CREDENTIALS` (4). Variável
ausente ou fora do formato: `CREDENTIALS` (4). Falha de escrita:
`PERMISSION` (7).

#### Limites

A variável precisa ter 64 caracteres hexadecimais. Sem
`--from-env`, a chave nova é aleatória e a variável antiga deve ser removida
do shell. Em caso de falha, o cofre original é preservado.

#### Exemplos

```bash
{{bin}} credentials rotate-key   # gera uma chave nova e recifra o cofre
```

```bash
{{bin}} credentials rotate-key --from-env   # usa a chave da variável
```

```bash
{{bin}} credentials rotate-key && unset SETUPVIBE_MASTER_KEY   # remove a variável antiga da sessão
```

```bash
{{bin}} credentials rotate-key 2>/dev/null; echo "exit=$?"   # sem cofre, confirma o code 4
```

```bash
{{bin}} credentials rotate-key --json   # origem da chave nova em JSON
```

### `{{bin}} mcp`

Inicia o servidor Model Context Protocol via stdio, com tools, resources e
prompts para agentes.

#### Sintaxe

```bash
{{bin}} mcp [--list]
```

#### Argumentos e options

| Nome | Tipo | Obrigatório | Padrão | Valores |
| --- | --- | --- | --- | --- |
| `--list` | flag | não | ausente | só lista o que o servidor registra |

#### Saída

Com `--list`, texto com `Tools`, `Resources` e `Prompts`, e `data`
com `name`, `version`, `tools`, `resources` e `prompts`. Sem `--list`, o
processo fala JSON-RPC em stdin e stdout até o cliente fechar, e o envelope
final traz `data = { "closed": true }`.

#### Efeitos persistentes

Nenhum. O servidor só lê o estado e executa tools
quando o cliente pede.

#### Permissões

As mesmas do binário. Tools que instalam ou removem itens usam
sudo e exigem init, como no CLI.

#### Recusas e exit codes

Falha ao iniciar ou perda do transporte: `MCP` (9).
Tool com falha devolve erro no JSON-RPC, sem derrubar o servidor.

#### Limites

Nada além de JSON-RPC pode ir para stdout; diagnósticos vão para
stderr. O cliente configura `{ "command": "{{bin}}", "args": ["mcp"] }`.
Nenhuma tool devolve o valor de uma credencial.

#### Exemplos

```bash
{{bin}} mcp   # inicia o servidor para o cliente MCP
```

```bash
{{bin}} mcp --list   # lista tools, resources e prompts
```

```bash
{{bin}} mcp --list --json   # catálogo completo para um agente
```

```bash
{{bin}} mcp install   # configura o servidor nos agentes instalados
```

```bash
{{bin}} mcp --list | sed -n '/Tools:/,/Resources:/p'   # só as tools
```

### `{{bin}} mcp install`

Configura o servidor MCP do SetupVibe no Claude Code, no Codex e no OpenCode.

#### Sintaxe

```bash
{{bin}} mcp install [--dry-run]
```

#### Argumentos e options

| Nome | Tipo | Obrigatório | Padrão | Valores |
| --- | --- | --- | --- | --- |
| `--dry-run` | flag | não | ausente | presente ou ausente |

#### Saída

Texto: cada agente configurado, os pulados e o caminho do log.
`data` traz `dryRun`, `skipped` e `steps` no plano; `log` e `results` na execução.

#### Efeitos persistentes

No Claude Code, `claude mcp add --scope user`. No
Codex, `codex mcp add`. No OpenCode, o bloco `mcp.setupvibe` em
`~/.config/opencode/opencode.json`, com backup em `.setupvibe.bak` antes da
primeira alteração. O restante do arquivo é preservado.

#### Permissões

Nenhuma além da escrita nos arquivos dos agentes. Não exige
TTY.

#### Recusas e exit codes

Etapa com falha: `PARTIAL` (10).

#### Limites

Agente não instalado é pulado, e o texto informa qual. Rodar de
novo não muda o que já está configurado. Não instala os agentes; use
`install` para isso.

#### Exemplos

```bash
{{bin}} mcp install   # configura nos agentes encontrados
```

```bash
{{bin}} mcp install --dry-run   # mostra os comandos e arquivos
```

```bash
{{bin}} mcp install --json   # agentes pulados e resultados em JSON
```

```bash
{{bin}} mcp install 2>&1 | grep not   # só os agentes que não estão instalados
```

```bash
{{bin}} mcp install && claude mcp get setupvibe   # confere o registro no Claude Code
```

### `{{bin}} docs`

Imprime a documentação embutida, inteira ou por topic. Tem o mesmo efeito de
`--skill`.

#### Sintaxe

```bash
{{bin}} docs [topic] [--lang <language>]
```

#### Argumentos e options

| Nome | Tipo | Obrigatório | Padrão | Valores |
| --- | --- | --- | --- | --- |
| `topic` | enum | não | tudo | `cli`, `tui`, `mcp`, `config`, `exit-codes`, `troubleshooting`, `migration`, `inventory`, `reference` |
| `--lang` | enum | não | `SETUPVIBE_LANG`, depois `LANG` | `pt-BR`, `en` |

#### Saída

Texto: o Markdown. `data` traz `topic` (`all` sem argumento) e
`markdown`.

#### Efeitos persistentes

Nenhum.

#### Permissões

Nenhuma. Pode rodar como root.

#### Recusas e exit codes

Topic inválido: `USAGE` (2). Idioma fora da lista:
`USAGE` (2).

#### Limites

Todos os topics valem em `--skill`, em `docs` e na tool MCP `skill`. `troubleshooting` traz o guia de
diagnóstico e `migration` o guia de migração do SetupVibe 1. `inventory` gera a
lista a partir do inventory embutido. `reference` traz apenas a referência do
registry, com commands, arguments, options e exit codes. O texto embutido
corresponde à versão do binário.

#### Exemplos

```bash
{{bin}} docs   # toda a documentação embutida
```

```bash
{{bin}} docs cli   # só o manual do CLI
```

```bash
{{bin}} docs mcp --json   # uma seção no envelope, para um agente
```

```bash
{{bin}} docs troubleshooting --lang en   # guia de diagnóstico em inglês
```

```bash
{{bin}} docs inventory > inventory.md   # grava a lista de itens e versões
```

### `{{bin}} doctor`

Confere o runtime, o estado do SetupVibe, os pré-requisitos pendentes, os
itens e os restos do SetupVibe 1. Com `--fix`, aplica as correções seguras.

#### Sintaxe

```bash
{{bin}} doctor [--fix] [--repair-windows] [--dry-run]
```

#### Argumentos e options

| Nome | Tipo | Obrigatório | Padrão | Valores |
| --- | --- | --- | --- | --- |
| `--fix` | flag | não | ausente | aplica as correções seguras |
| `--repair-windows` | flag | não | ausente | Windows: DISM `/RestoreHealth` e `sfc /scannow` |
| `--dry-run` | flag | não | ausente | presente ou ausente |

#### Saída

Texto: seções `Runtime`, `SetupVibe` e, com `--fix`, `Applied`. Cada
linha usa ✓, ! ou ✗. `data` traz `ok`, `runtime`, `findings` e, com `--fix`,
`applied`. Cada verificação tem `name`, `status` e `detail`; cada achado tem
`id`, `level`, `text` e `fix` quando houver.

#### Efeitos persistentes

Sem `--fix`, nenhum. Com `--fix`, cria
`~/.local/bin`, ajusta `~/.setupvibe/` para 0700 e escreve o bloco do shell.
Antes de escrever o bloco, converte os arquivos do SetupVibe 1, como `auto` e
`shell apply`. Com `--repair-windows`, executa DISM e `sfc`.

#### Permissões

Sem `--fix`, roda como usuário comum e pode rodar como root.
Com `--fix`, pode usar sudo no bloco do shell. `--repair-windows` exige
PowerShell elevado.

#### Recusas e exit codes

Verificação com `fail`: `CONFIG` (3). Reparo no
Windows chamado em outro sistema: `UNSUPPORTED_SYSTEM` (11). Etapa do reparo
com falha: `PARTIAL` (10).

#### Limites

O doctor não cria arquivos nem mostra segredos sem `--fix`. TTY
ausente e arquivos ainda não criados geram `warn`, não `fail`. Ele aponta
containers que publicam porta em todas as interfaces, item resolvido por outro
gerenciador e reinício pendente. Não corrige item com falha; isso é
`install --force`.

#### Exemplos

```bash
{{bin}} doctor   # diagnóstico completo em texto
```

```bash
{{bin}} doctor --fix   # aplica as correções seguras e mostra as que exigem escolha
```

```bash
{{bin}} doctor --json   # verificações e achados em JSON
```

```bash
{{bin}} doctor --repair-windows   # Windows elevado: repara o component store e os arquivos
```

```bash
{{bin}} doctor --json | jq '.data.findings[] | select(.level=="fail")'   # só os achados com falha
```

### `{{bin}} completion`

Imprime um script de completion gerado pelo registry para bash, zsh, fish ou
PowerShell.

#### Sintaxe

```bash
{{bin}} completion <shell> [--json]
```

#### Argumentos e options

| Nome | Tipo | Obrigatório | Padrão | Valores |
| --- | --- | --- | --- | --- |
| `shell` | enum | sim | - | `bash`, `zsh`, `fish`, `powershell` |

#### Saída

Texto: o script. `data` traz `shell` e `script`.

#### Efeitos persistentes

Nenhum. O script só entra no shell quando você o
carrega ou acrescenta a linha ao arquivo de inicialização.

#### Permissões

Nenhuma. Pode rodar como root.

#### Recusas e exit codes

Shell fora da lista: `USAGE` (2), com os valores
aceitos.

#### Limites

O script cobre commands, subcommands, options locais e globais e
valores de enum do registry. Uma pessoa que muda de versão precisa gerar o
script de novo. O Zsh usa `compdef` e `compadd`, sem `bashcompinit`.

#### Exemplos

```bash
eval "$({{bin}} completion bash)"   # completion na sessão Bash atual
```

```bash
eval "$({{bin}} completion zsh)"   # completion na sessão Zsh atual
```

```bash
{{bin}} completion fish | source   # completion na sessão Fish atual
```

```powershell
{{bin}} completion powershell | Out-String | Invoke-Expression   # completion no PowerShell
```

```bash
{{bin}} completion zsh > ~/.zsh/completions/_setupvibe   # arquivo para carregar depois
```
