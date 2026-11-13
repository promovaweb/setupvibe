# Configuração e credenciais

Tudo que o `{{bin}}` persiste fica em `~/.setupvibe/`. A pasta é criada com
0700 e os arquivos de dados são gravados com 0600.
O `setupvibe` e o `setupvibe-server` usam a mesma pasta e o mesmo prefixo
`SETUPVIBE_`, porque só um deles fica instalado por máquina.

## Arquivos em `~/.setupvibe/`

| Caminho | O que guarda | Quem escreve |
| --- | --- | --- |
| `settings.json` | preferências em texto claro; keys em notação de ponto | `config set`, `config unset`, a TUI quando você troca o idioma, o tema, o mouse ou os ícones |
| `credentials.json` | envelope AES-256-GCM com os segredos | `credentials set`, `credentials remove`, `credentials clear`, `credentials rotate-key` |
| `master.key` | 32 bytes em hexadecimal, criados na primeira gravação do cofre | `credentials set` e `credentials rotate-key` |
| `config.json` | usuário, sistema detectado, registro do `init`, identidade do Git, canal de release, `network` e `migratedFromV1` | `init`, `auto`, `user create`, `migrate`; o `self uninstall` apaga |
| `selection.json` | itens escolhidos, versão instalada e status do último check | `install`, `remove`, `update`, `auto`, `init` |
| `external.json` | apps instalados pelo mise fora do inventário | `install --external`, `remove --external` |
| `last-run.json` | resultado completo do último `auto`, passo por passo | `auto` |
| `run.lock` | PID da execução que está alterando a máquina | `auto` |
| `logs/<data>-<command>.log` | um evento NDJSON por linha, com segredos mascarados | todo command que executa um plano |
| `backups/` | cópia de um arquivo do usuário antes da primeira mudança e antes de cada migração de schema | `shell apply`, `migrate`, `readState` |
| `state/update-check.json` | cache de seis horas da checagem de versão | toda execução que anuncia versão nova |
| `state/security.json` | estado de UFW, fail2ban e dos arquivos antes do módulo de segurança | `security apply` |
| `shell/aliases.sh`, `shell/aliases-agents.sh`, `shell/tmux.conf` | arquivos carregados por `~/.zshrc`, `~/.bashrc` e `~/.tmux.conf` | `shell apply` |
| `tmp/` | instalador ou script baixado durante a execução | métodos `installer` e `archive` |

Restos do SetupVibe 1 também aparecem nessa pasta e não são apagados sem
confirmação: `bin/ssh_copy_id`, `portainer-compose.yml` e, no Windows,
`windows-utilities.json`. O `{{bin}} migrate` trata os dois primeiros; o
`{{bin}} doctor` lista todos.

### `config.json`

O arquivo é estado, não preferência. Use os commands; o campo `channel` é a
exceção e hoje só muda editando o arquivo.

| Campo | Conteúdo |
| --- | --- |
| `schemaVersion` | versão do formato; um binário antigo recusa um arquivo mais novo e pede `upgrade` |
| `user` | usuário de trabalho criado ou adotado |
| `edition` | edição que rodou o `init`: `desktop` ou `server` |
| `system` | sistema detectado (`ubuntu`, `debian`, `mint`, `zorin`, `arch`, `omarchy`, `macos`, `windows` ou `wsl`) |
| `init` | `done`, `at` e a versão que concluiu o `init` |
| `git` | `name` e `email` usados quando o Git global estava vazio |
| `channel` | canal lido pelo `upgrade` e pelo aviso de versão: `stable` ou `beta` |
| `network` | `caFile` e `cacheDir` fixos da máquina, ver [Rede e cache](#rede-e-cache) |
| `migratedFromV1` | data e edição de origem gravadas pelo `migrate` |
| `shell` | lugar antigo do interruptor `agentAliases`; o `settings.json` é lido primeiro |
| `nopasswd` | `true` quando `user create --nopasswd` criou a regra de sudo |

O bloco `network` evita repetir opção em toda execução. Grave-o no
`~/.setupvibe/config.json`; não há command que escreva esse campo.

```json
{ "network": { "caFile": "/etc/ssl/certs/corp.pem", "cacheDir": "/srv/setupvibe-cache" } }
```

## `settings.json`

O schema vem de `SETTINGS_SCHEMA` em `shared/core/config/settings.ts`. Uma key
fora do schema é aceita como texto, para projetos derivados.

| Key | Tipo | Padrão | Valores aceitos | Efeito |
| --- | --- | --- | --- | --- |
| `output.format` | enum | `text` | `text`, `json` | formato padrão da saída do CLI quando `--json` não é passado |
| `output.colors` | boolean | `true` | `true`, `false` | cores ANSI na saída de texto; `NO_COLOR` sempre desliga |
| `tui.initialTab` | enum | `overview` | `overview` (Início), `inventory`, `user`, `doctor`, `logs`, `tailscale`, `machine`, `about` | módulo aberto quando a TUI inicia; `--tab` tem prioridade |
| `tui.language` | enum | `pt-BR` | `pt-BR`, `en` | idioma da TUI; a tecla `L` e o seletor `PT · EN` gravam aqui |
| `tui.icons` | boolean | `true` | `true`, `false` | ícones da Nerd Font; `false` troca por símbolos que toda fonte tem |
| `tui.mouse` | boolean | `true` | `true`, `false` | clique em cartões, itens, botões e teclas, e roda para rolar |
| `tui.theme` | enum | `night` | `night`, `day` | paleta da TUI; a tecla `T` e o ícone no cabeçalho trocam e gravam aqui |
| `shell.agentAliases` | boolean | `true` | `true`, `false` | escreve `cco`, `cxo`, `oco`, `cx` e `oc`, que abrem os agentes sem confirmação; rode `{{bin}} shell apply` depois |
| `telemetry.enabled` | boolean | `false` | `true`, `false` | reservado para projetos derivados; o binário não envia nada |

Para boolean, o `config set` aceita `true`/`false`, `yes`/`no`, `1`/`0` e
`on`/`off`. Para enum, aceita só um valor da coluna de valores. Para number,
aceita um número finito. Qualquer outro texto devolve exit code 3 (`CONFIG`).

### Exemplos de `config set`

```bash
{{bin}} config set output.format json                 # scripts que já leem --json
{{bin}} config set tui.theme day                      # terminal com fundo claro
{{bin}} config set tui.mouse false                    # sem mouse, só teclado
{{bin}} config set shell.agentAliases false           # sem aliases que pulam confirmação
{{bin}} config set output.colors off                  # saída sem ANSI em um pipe
```

O resultado é `✓ key = valor`. Uma key fora do schema é gravada como texto e a
saída avisa `(key outside the schema, stored as text)`.

### Exemplos de `config get`

```bash
{{bin}} config get tui.language                       # pt-BR
{{bin}} config get tui.initialTab --json              # {"key":"tui.initialTab","value":"overview"}
{{bin}} config get output.format                      # text, quando nunca foi gravado
{{bin}} config get shell.agentAliases                 # true
{{bin}} config get editor.preferred                   # exit 3 quando a key não existe
```

O `get` lê o arquivo já misturado com os padrões. Por isso um valor aparece
mesmo quando `settings.json` ainda não existe.

### Exemplos de `config unset`

```bash
{{bin}} config unset output.format                    # remove o json gravado; o CLI volta a text
{{bin}} config unset tui.theme                        # remove o day gravado; volta a night
{{bin}} config unset telemetry.enabled                # remove a key reservada; volta ao padrão false
{{bin}} config unset shell.agentAliases               # os aliases voltam ligados
{{bin}} config unset editor.preferred                 # exit 0, avisa que não estava gravada
{{bin}} config unset editor.preferred --json          # {"key":"editor.preferred","removed":false}
```

O `unset` remove só a key gravada no arquivo. A key continua existindo com o
padrão do schema.

### Os outros subcommands

| Subcommand | O que faz | Saída |
| --- | --- | --- |
| `config list` (alias `ls`) | lista cada key com o valor efetivo, do arquivo misturado com os padrões | caminho do arquivo e tabela `key valor` |
| `config path` | mostra a pasta de dados e o caminho de cada arquivo | `Directory`, `settings.json`, `credentials.json`, `master.key` |
| `config schema` | lista as keys conhecidas com tipo, padrão e descrição | tabela gerada de `SETTINGS_SCHEMA` |
| `config export [arquivo]` | grava a seleção e a identidade do Git no formato de respostas; sem arquivo, imprime | JSON com `schemaVersion`, `edition`, `user`, `git`, `profile` e `only` |
| `config import <arquivo>` | instala os itens e a identidade do arquivo exportado | mesmo resultado de `install`, mais o Git global |

```bash
{{bin}} config path
{{bin}} config schema --json
{{bin}} config export selecao.json
{{bin}} config import selecao.json --dry-run
{{bin}} config list
```

O arquivo de respostas não carrega segredo. O `profile` sai como `none`, que o
`auto --config` lê como base vazia: entram só os itens da lista `only` e os
requisitos deles. A lista fica ordenada, para o diff entre duas máquinas ser
legível. `config import` aplica a mesma seleção no lugar.

Para dar tipo, padrão e descrição a uma key nova, acrescente-a a
`SETTINGS_SCHEMA`. O `config set`, o `config get` e o `config schema` passam a
conhecer a key sem outra mudança.

O servidor MCP expõe `config_list` e `config_get` para leitura; nenhuma tool
grava `settings.json`.

## `credentials.json`

O arquivo guarda um envelope:

```json
{ "version": 1, "algorithm": "aes-256-gcm", "iv": "<base64>", "tag": "<base64>", "data": "<base64>" }
```

`data` é o JSON `{ "name": "value" }` cifrado. Names seguem
`[a-z0-9][a-z0-9_.-]{0,63}`, por exemplo `openai.api_key` ou `github.token`.

A master key tem 32 bytes e vem, nesta ordem:

1. da variável `{{BIN}}_MASTER_KEY` (64 caracteres hexadecimais);
2. do arquivo `master.key`, gerado automaticamente.

Gere uma chave para a variável com `openssl rand -hex 32`. Quando a variável
está definida, `master.key` é ignorado.

| Subcommand | O que faz |
| --- | --- |
| `credentials set <name>` | grava um valor; sem `--stdin`, digita sem eco |
| `credentials get <name>` | mostra o valor mascarado; `--reveal` mostra em claro |
| `credentials list` | lista os names, sem valores |
| `credentials remove <name>` | apaga um name |
| `credentials status` | mostra a origem da chave e quantos names existem |
| `credentials clear --yes` | apaga o cofre inteiro |
| `credentials rotate-key` | gera chave nova, recifra o cofre e grava `master.key` |

```bash
{{bin}} credentials set openai.api_key                # pergunta o valor sem eco
printf '%s' "$TOKEN" | {{bin}} credentials set github.token --stdin
{{bin}} credentials get github.token                  # abc1******et
{{bin}} credentials get openai.api_key --reveal       # valor em claro, para um script
{{bin}} credentials status --json                     # file, masterKeySource, count e names
{{bin}} credentials remove github.token
{{bin}} credentials clear --yes
```

A tool MCP `credentials_status` mostra arquivo, origem da chave e nomes, sem
valor. Um name inexistente, cofre ilegível ou chave ausente devolve exit code 4
(`CREDENTIALS`). Falha de permissão no arquivo devolve 7 (`PERMISSION`) e um
prompt cancelado com Ctrl+C devolve 130 (`INTERRUPTED`). Numa máquina nova,
`credentials status` responde `(not created)` e `Credentials 0`, sem criar
arquivo; o cofre só nasce na primeira gravação.

## O que a cifra protege

A cifra protege o arquivo contra leitura casual, cópia em backup e varredura
do disco por outras ferramentas. Quem tem acesso à mesma conta do sistema
consegue ler `master.key` e decifrar o conteúdo. Para um nível acima, injete a
chave por `{{BIN}}_MASTER_KEY` a partir de um gerenciador de segredos e não
grave `master.key` em disco.

## Rotação da master key

| Command ou option | Efeito |
| --- | --- |
| `credentials rotate-key` | gera chave aleatória, recifra o cofre e grava `master.key` com 0600 |
| `credentials rotate-key --from-env` | lê a chave atual de `master.key` e usa `{{BIN}}_MASTER_KEY` como chave nova |

O `credentials rotate-key` abre o cofre com a chave atual e preserva os valores
ao recifrar. A opção `--from-env` exige a chave atual em disco e uma chave nova
de 64 caracteres hexadecimais na variável. A chave nova também é gravada em
`master.key` com 0600. Sem cofre ou chave atual, o command devolve exit code 4.
Em JSON, devolve `{ rotated, source }`, sem o conteúdo das chaves.

Sem `--from-env`, se a chave anterior veio da variável, remova essa variável do
shell após a rotação: `unset {{BIN}}_MASTER_KEY`. Ela tem prioridade sobre o
arquivo nas próximas execuções. Não execute gravações no cofre durante a
rotação. Os dois arquivos são preparados na pasta `.rotate-*` antes da
substituição; falhas comuns de gravação restauram a chave anterior por
substituição atômica. Se essa restauração também falhar, os arquivos de
recuperação continuam na pasta `.rotate-*` indicada pelo erro, e a cópia
`previous.key` mantém permissão 0600. Uma interrupção do processo entre as duas
substituições também exige restauração por essa cópia.

## Usar uma credencial no código

```ts
import { getCredential } from "../config/credentials.ts";

const token = getCredential("github.token"); // lança AppError(4) quando não existe
```

Nunca escreva o valor em log, em erro, em `data` do `--json` nem em resposta de
tool MCP.

## Variáveis de ambiente

### Dados, idioma e interface

| Variável | Efeito |
| --- | --- |
| `SETUPVIBE_HOME` | troca `~/.setupvibe/` por outra pasta, incluindo os arquivos de estado |
| `SETUPVIBE_LANG` | fixa o idioma em `pt-BR` ou `en`; vale para a TUI e para `--skill` |
| `SETUPVIBE_ICONS` | `0` troca os ícones da Nerd Font da TUI por símbolos comuns |
| `NO_COLOR` | qualquer valor não vazio desliga as cores na saída de texto |
| `LANG`, `LC_ALL`, `LC_MESSAGES` | escolhem o idioma da documentação quando `SETUPVIBE_LANG` não está definida |
| `LC_CTYPE`, `LANG` | o `init` e o `auto` avisam quando o locale não é UTF-8 |

### Rede e cache

| Variável | Efeito |
| --- | --- |
| `HTTPS_PROXY`, `HTTP_PROXY`, `NO_PROXY`, `ALL_PROXY` | proxy lido em maiúsculas e minúsculas, inclusive pelos comandos que rodam com `sudo` |
| `SETUPVIBE_CA_FILE` | bundle de CA corporativa; o binário exporta para `NODE_EXTRA_CA_CERTS`, `SSL_CERT_FILE`, `CURL_CA_BUNDLE`, `REQUESTS_CA_BUNDLE`, `GIT_SSL_CAINFO` e `PIP_CERT` |
| `SETUPVIBE_CACHE_DIR` | pasta única de downloads; o binário exporta `MISE_CACHE_DIR`, `npm_config_cache`, `UV_CACHE_DIR` e `HOMEBREW_CACHE` |
| `SETUPVIBE_VERBOSE` | `1` mostra a saída completa de cada comando, igual a `--verbose` |
| `NODE_EXTRA_CA_CERTS` | definida pelo binário a partir de `SETUPVIBE_CA_FILE`; não precisa preencher |
| `MISE_CACHE_DIR`, `npm_config_cache`, `UV_CACHE_DIR`, `HOMEBREW_CACHE` | definidas pelo binário a partir de `SETUPVIBE_CACHE_DIR` |

### Respostas do `auto`

| Variável | Resposta |
| --- | --- |
| `SETUPVIBE_USER` | usuário de trabalho |
| `SETUPVIBE_SSH_KEY` | chave pública ou arquivo com ela |
| `SETUPVIBE_GIT_NAME`, `SETUPVIBE_GIT_EMAIL` | identidade do Git |
| `SETUPVIBE_PROFILE` | perfil do inventário |
| `SETUPVIBE_ONLY`, `SETUPVIBE_EXCLUDE` | itens a acrescentar ou deixar de fora, separados por vírgula |
| `SETUPVIBE_TIMEZONE` | fuso horário |
| `SETUPVIBE_REBOOT` | `1` reinicia e retoma o `auto` |
| `SETUPVIBE_KEEP_NOPASSWD` | `1` mantém a regra de sudo criada pelo `auto` |
| `SETUPVIBE_PM2_AUTOSTART` | `1` sobe o PM2 e os apps salvos no boot |
| `SETUPVIBE_TAILSCALE_SSH` | `1` liga o Tailscale SSH depois de entrar na tailnet |
| `TAILSCALE_AUTHKEY` | chave de autenticação do Tailscale |
| `GH_TOKEN`, `GITHUB_TOKEN` | token herdado pelas ferramentas que o leem, como o mise; o log mascara |

As respostas valem quando a opção correspondente não foi passada. Segredos
nunca entram em `argv`: o token do Tailscale e o do Swarm chegam ao comando por
variável e o log substitui o valor por `***`.

### Respostas do Swarm

| Variável | Resposta |
| --- | --- |
| `SETUPVIBE_SWARM_MANAGER` | `1` inicializa o Docker Swarm como manager |
| `SETUPVIBE_SWARM_TOKEN` | token para entrar em um Swarm existente |
| `SETUPVIBE_SWARM_ADVERTISE_ADDR` | endereço anunciado pelo nó, ou o endereço do manager com `--join` |
| `SETUPVIBE_SWARM_ENCRYPTED` | `1` cifra o tráfego da rede overlay |

### Internas e do sistema

| Variável | Quem lê |
| --- | --- |
| `SETUPVIBE_AUTO_CREATED_NOPASSWD` | o segundo processo do `auto`, iniciado com `runuser`, para saber que a regra de sudo é temporária |
| `SSHPASS` | `ssh copy-id` usa como senha do servidor remoto quando `--password-stdin` não é passado |
| `HOME`, `USERPROFILE` | pasta do usuário em Unix e no Windows |
| `USER`, `LOGNAME`, `USERNAME` | nome do usuário quando `id -un` não responde |
| `SHELL`, `ComSpec` | shell mostrado no módulo Máquina |
| `PATH`, `Path` | procura de comandos; o `doctor` e a TUI usam para achar `~/.local/bin` |
| `LOCALAPPDATA` | pasta do mise no Windows |
| `ProgramData`, `PROGRAMDATA` | estado do `desktop.ps1` que o `migrate` reconhece no Windows |
| `WSL_DISTRO_NAME`, `WSL_INTEROP` | detecção de WSL |
| `DEBIAN_FRONTEND`, `NEEDRESTART_MODE`, `NONINTERACTIVE`, `CI` | definidas pelo binário em cada comando do plano, para que instaladores não abram prompt |

## Rede e cache

Proxy, CA corporativa e cache valem para todo download e para todo comando
executado pelo plano. A ordem é a opção, depois a variável, depois o bloco
`network` do `config.json`.

```bash
{{bin}} auto --ca-file /etc/ssl/certs/corp.pem --cache-dir /srv/setupvibe-cache
{{bin}} install node --verbose
{{bin}} update --ca-file /etc/ssl/certs/corp.pem
```

Com o cache quente, um download fixado no inventário instala sem rede. O
`--verbose` mostra cada `argv` e a saída completa, sem mascarar o que o próprio
comando imprime. Para investigar uma falha de rede, comece pelo `doctor`: ele
roda as checagens do runtime e mostra o que está faltando.
