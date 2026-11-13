# MCP

`{{bin}} mcp` transforma o processo em um servidor Model Context Protocol sobre stdio. Nada além do protocolo é escrito em stdout; diagnósticos vão para stderr. O mesmo executável reúne TUI, CLI e servidor MCP.

O servidor expõe 20 tools, 6 resources e 1 prompt. As tools que rodam o próprio CLI devolvem o mesmo envelope do `--json`, para o agente ver o que uma pessoa veria no terminal. Tools que alteram a máquina fazem dry run por padrão; `remove` e `migrate` também exigem `confirm: true`.

## Como o servidor responde

Uma tool devolve `content[0].text` com JSON e, quando a saída é estruturada, `structuredContent` com o mesmo objeto.

As tools que rodam o CLI devolvem o envelope `{ exitCode, ok, command, data }` ou `{ exitCode, ok: false, error }`. As tools nativas (`about`, `exit_codes`, `skill`, `config_list`, `config_get`, `credentials_status`, `health`, `logs`, `tailscale`, `machine`) devolvem o objeto descrito em cada seção.

`isError: true` aparece quando o exit code do CLI não é zero ou quando a tool recusa a chamada. O `data` pode vir junto: `doctor` com achado fail devolve os achados e marca `isError`, com exit code 3. Leia `exitCode` antes de `isError`.

Nenhuma tool devolve o valor de uma credencial. Nenhuma tool grava `settings.json`; escrita de configuração continua no CLI, onde há confirmação humana. As tools que alteram a máquina (`install`, `remove`, `update`, `init`, `migrate`) fazem dry run por padrão.

Antes de sugerir um command, leia `skill` com o tópico `cli`. Antes de chamar uma tool que instala ou remove, rode o dry run e mostre o plano à pessoa.

## Configuração no cliente

```json
{ "mcpServers": { "{{bin}}": { "command": "{{bin}}", "args": ["mcp"] } } }
```

No OpenCode, o bloco fica na configuração do aplicativo:

```json
{ "mcp": { "{{bin}}": { "type": "local", "command": ["{{bin}}", "mcp"], "enabled": true } } }
```

`{{bin}} mcp install` registra o servidor no Claude Code (`claude mcp add --scope user`), no Codex (`codex mcp add`) e no OpenCode (bloco `mcp` de `~/.config/opencode/opencode.json`, com cópia de segurança). Agente que não está instalado fica de fora, e rodar de novo não muda o que já está configurado.

Para desenvolvimento, sem compilar, use `bun` com o entry point da edição no lugar do binário.

## Listar sem iniciar

```bash
{{bin}} mcp --list
{{bin}} mcp --list --json
```

A lista mostra nome e descrição de cada tool, o URI de cada resource e o prompt, na ordem em que o servidor registra. É a mesma lista que este documento descreve.

## Tools

| Tool | O que faz | Altera a máquina |
| --- | --- | --- |
| `about` | identidade e runtime do binário | não |
| `exit_codes` | tabela de exit codes | não |
| `skill` | documentação embutida, inteira ou por tópico | não |
| `config_list` | keys de settings.json em vigor e o schema | não |
| `config_get` | valor de uma key | não |
| `credentials_status` | nomes e origem da master key, sem valores | não |
| `system` | sistema, arquitetura, WSL, headless, IP público e variante | não |
| `list` | itens do inventário com o status neste sistema | não |
| `check` | itens instalados contra as versões fixadas | não |
| `install` | instala itens e dependências | só com `dry_run: false` |
| `remove` | remove itens do espaço do usuário | só com `dry_run: false` e `confirm: true` |
| `update` | atualiza itens cuja versão fixada mudou | só com `dry_run: false` |
| `health` | só os achados do SetupVibe do doctor | não |
| `doctor` | runtime e achados do SetupVibe, com a correção | não |
| `report` | relatório em Markdown para uma issue | não |
| `init` | pré-requisitos do SetupVibe | só com `dry_run: false` |
| `migrate` | migra uma máquina do SetupVibe 1 | só com `dry_run: false` e `confirm: true` |
| `logs` | execuções e eventos de uma delas | não |
| `tailscale` | cliente local do Tailscale | não |
| `machine` | sistema, CPU, memória, discos, rede e processos | não |

### Tool `about`

**Finalidade.** Identifica o binário em execução: nome, edição, versão, runtime, plataforma, pasta de dados e créditos.

**Entrada.**

Nenhum. A tool não recebe argumento.

**Saída.** `bin`, `title`, `version`, `description`, `author`, `site`, `repository`, `license`, `executable`, `runtime`, `platform`, `system`, `pid`, `dataDir` e `credits`, uma lista com `name`, `role` e `url`.

**Efeitos e permissões.** Só leitura. Não grava arquivo nem consulta a rede. `pid` e `executable` são do processo do servidor MCP, não do cliente que chama a tool.

**Recusas e limites.** Nenhuma recusa própria.

**Exemplos.**

- **Confirmar a edição:** `about {}` devolve `bin: "{{bin}}"` e o `dataDir` da sessão, o que mostra qual binário atende a sessão.
- **Conferir a versão:** `about {}` devolve `version`, útil antes de sugerir uma flag que só existe na versão nova.
- **Ver a plataforma:** `about {}` devolve `platform: "linux-x64"`, o que explica por que um item existe em `list` e outro não.
- **Checar a pasta de dados:** `about {}` devolve o `dataDir` efetivo, inclusive quando a sessão roda com `SETUPVIBE_HOME` apontando para outro lugar.
- **Coletar créditos:** `about {}` devolve `credits` com o papel e a URL de cada projeto usado pelo binário.

### Tool `exit_codes`

**Finalidade.** Devolve a tabela fixa de exit codes do CLI, com nome simbólico e descrição.

**Entrada.**

Nenhum. A tool não recebe argumento.

**Saída.** `codes`, uma lista com `code`, `name` e `description` de cada código, em ordem.

**Efeitos e permissões.** Só leitura. A tabela vem do código compilado, sem ler arquivo.

**Recusas e limites.** Nenhuma recusa própria.

**Exemplos.**

- **Explicar uma falha parcial:** `exit_codes {}` mostra que 10 é `PARTIAL` e que o resto do plano ficou aplicado.
- **Orientar sobre sudo:** `exit_codes {}` mostra que 13 é `SUDO_PASSWORD` e que a regra sem senha resolve.
- **Investigar concorrência:** `exit_codes {}` mostra que 30 é `LOCKED`, com outra execução segurando `run.lock`.
- **Tratar interrupção:** `exit_codes {}` mostra que 130 é `INTERRUPTED` e que nada foi concluído.
- **Montar a tabela do agente:** `exit_codes {}` devolve os 18 codes para o agente decidir sem interpretar texto.

### Tool `skill`

**Finalidade.** Entrega a documentação embutida no binário em Markdown, inteira ou por tópico.

**Entrada.**

| Campo | Tipo | Obrigatório | Padrão | Efeito |
| --- | --- | --- | --- | --- |
| `topic` | string | não | tudo | `cli`, `tui`, `mcp`, `config`, `exit-codes`, `troubleshooting`, `migration`, `inventory` ou `reference` |

**Saída.** Markdown em `content[0].text`. A tool não devolve `structuredContent`.

**Efeitos e permissões.** Só leitura. A documentação já está compilada no binário, então a resposta sai sem rede.

**Recusas e limites.** Um tópico fora da lista é recusado pelo schema, antes de a tool rodar.

**Exemplos.**

- **Aprender os commands:** `skill { "topic": "cli" }` devolve o manual do CLI com a referência gerada do registry.
- **Entender as teclas:** `skill { "topic": "tui" }` devolve os módulos, as teclas por módulo e o tema.
- **Investigar uma falha:** `skill { "topic": "troubleshooting" }` devolve sintoma, causa, comando e exit code de cada situação.
- **Migrar uma máquina antiga:** `skill { "topic": "migration" }` devolve o guia do SetupVibe 1.
- **Descobrir ids de itens:** `skill { "topic": "inventory" }` devolve perfis e uma tabela por categoria.

### Tool `config_list`

**Finalidade.** Lista as preferências de `settings.json` já misturadas com os padrões, mais o schema que o binário conhece.

**Entrada.**

Nenhum. A tool não recebe argumento.

**Saída.** `file` (caminho), `values` (key achatada para o valor efetivo) e `schema`, uma lista com `key`, `type`, `default`, `values` quando enum e `description`.

**Efeitos e permissões.** Só leitura. Não cria `settings.json`; numa máquina sem o arquivo, `values` traz os padrões.

**Recusas e limites.** Nenhuma recusa própria. Um arquivo inválido vira erro da tool ao ler o JSON.

**Exemplos.**

- **Ver o formato efetivo:** `config_list {}` mostra `output.format` com o valor em vigor, não o que está escrito no arquivo.
- **Conferir a paleta:** `config_list {}` mostra `tui.theme` e o padrão `night` no schema.
- **Listar os padrões:** `config_list {}` mostra o valor de cada key mesmo numa máquina sem `settings.json`.
- **Ler o schema:** `config_list {}` devolve `values` e `default` de cada key, para o agente validar uma escolha.
- **Localizar o arquivo:** `config_list {}` devolve `file`, útil quando `SETUPVIBE_HOME` aponta para outro lugar.

### Tool `config_get`

**Finalidade.** Devolve o valor efetivo de uma key de `settings.json`.

**Entrada.**

| Campo | Tipo | Obrigatório | Padrão | Efeito |
| --- | --- | --- | --- | --- |
| `key` | string | sim | nenhum | Key em notação de ponto, como `output.format`; mínimo de 1 caractere |

**Saída.** `key`, `value` e `exists`. Quando a key não existe, `value` é `null` e `exists` é `false`.

**Efeitos e permissões.** Só leitura. Não cria o arquivo e não altera a key.

**Recusas e limites.** Key desconhecida devolve `exists: false` com `isError: true`; não há exit code de CLI nesse caminho. A tool lê só `settings.json`, não `config.json`.

**Exemplos.**

- **Ler o formato de saída:** `config_get { "key": "output.format" }` devolve `text` quando nada foi gravado.
- **Ler o idioma:** `config_get { "key": "tui.language" }` devolve `pt-BR` ou `en`.
- **Tratar key inexistente:** `config_get { "key": "editor.preferred" }` devolve `exists: false` e marca `isError`.
- **Conferir ícones:** `config_get { "key": "tui.icons" }` devolve `true` ou `false`.
- **Conferir aliases:** `config_get { "key": "shell.agentAliases" }` devolve o interruptor dos aliases dos agentes.

### Tool `credentials_status`

**Finalidade.** Mostra o estado do cofre: arquivo, existência, origem da master key e nomes guardados, sem valores.

**Entrada.**

Nenhum. A tool não recebe argumento.

**Saída.** `file`, `exists`, `masterKeySource` (`env`, `file` ou `none`), `count` e `names`, uma lista de nomes.

**Efeitos e permissões.** Só leitura. Não cria o cofre nem a chave. Nunca devolve o valor de uma credencial.

**Recusas e limites.** Nenhuma recusa própria. Um cofre ilegível aparece com `count: 0` e nomes vazios, sem expor o conteúdo.

**Exemplos.**

- **Ver se o cofre existe:** `credentials_status {}` devolve `exists: false` numa máquina nova.
- **Conferir a origem da chave:** `credentials_status {}` devolve `masterKeySource: "env"` quando a chave vem da variável.
- **Contar credenciais:** `credentials_status {}` devolve `count` e `names`, sem nenhum valor.
- **Conferir nomes:** `credentials_status {}` mostra `github.token` ou `openai.api_key` quando já foram gravados.
- **Investigar cofre vazio:** `credentials_status {}` mostra `count: 0` depois de `credentials clear`, com `exists: true`.

### Tool `system`

**Finalidade.** Descreve a máquina detectada: sistema, versão, arquitetura, WSL, headless, IP público, variante e traços do SetupVibe 1.

**Entrada.**

Nenhum. A tool não recebe argumento.

**Saída.** Envelope do CLI com `data.edition`, `system`, `id`, `name`, `version`, `arch`, `wsl`, `headless`, `publicIp`, `variant`, `distro` quando houver e `setupvibe1`, com `found`, `edition` e `traces`.

**Efeitos e permissões.** Só leitura. Roda `system --no-update-check`, então não imprime aviso de versão nem altera arquivo.

**Recusas e limites.** Um sistema sem suporte devolve exit code 11 (`UNSUPPORTED_SYSTEM`) e a tool marca `isError`.

**Exemplos.**

- **Decidir compatibilidade:** `system {}` devolve `system: "debian"` e `arch: "x64"` antes de sugerir um item.
- **Conferir WSL:** `system {}` devolve `wsl: true` quando a distribuição roda dentro do WSL.
- **Ver máquina sem interface:** `system {}` devolve `headless: true` e explica por que itens gráficos saem da seleção.
- **Escolher o tipo de Portainer:** `system {}` devolve `variant: "remote-exposed"` quando a máquina tem IP público.
- **Detectar o SetupVibe 1:** `system {}` devolve `setupvibe1.found` e a lista de `traces`, antes de sugerir `migrate`.

### Tool `list`

**Finalidade.** Lista os itens do inventário da edição com o status de cada um nesta máquina.

**Entrada.**

| Campo | Tipo | Obrigatório | Padrão | Efeito |
| --- | --- | --- | --- | --- |
| `category` | string | não | todas | Id de uma categoria, como `ai`, `languages` ou `security` |

**Saída.** Envelope com `data.system` e `data.items`, cada item com `id`, `name`, `category`, `version`, `default`, `status` e `elsewhere` quando o comando vem de outro gerenciador.

**Efeitos e permissões.** Só leitura. Não instala, não remove e não altera `selection.json`.

**Recusas e limites.** Sistema sem suporte devolve exit code 11. Uma categoria desconhecida devolve a lista vazia, sem erro.

**Exemplos.**

- **Ver o inventário inteiro:** `list {}` devolve todos os itens da edição com o status atual.
- **Focar nos agentes de IA:** `list { "category": "ai" }` devolve só a categoria `ai`.
- **Encontrar itens de outro gerenciador:** `list {}` mostra `status: "other"` e `elsewhere` com o caminho da cópia atual.
- **Separar o que falta:** `list {}` mostra `available`, `failed` e `outdated`, que o agente usa para escolher o próximo passo.
- **Alimentar um install:** `list { "category": "languages" }` devolve ids válidos para a tool `install`.

### Tool `check`

**Finalidade.** Confere itens instalados contra a versão fixada no inventário, rodando o check de cada um.

**Entrada.**

| Campo | Tipo | Obrigatório | Padrão | Efeito |
| --- | --- | --- | --- | --- |
| `items` | array de string | não | a seleção | Ids de itens, cada um no formato `[a-z0-9][a-z0-9-]*` |

**Saída.** Envelope com `data.system` e `data.results`, cada resultado com `id`, `status` (`ok` ou `fail`), `output` e `expected` quando o item declara a versão esperada.

**Efeitos e permissões.** Só leitura. Executa o comando de verificação de cada item e não instala nem corrige nada.

**Recusas e limites.** Item desconhecido devolve exit code 2 (`USAGE`). Um item que falha faz o CLI sair com 10 (`PARTIAL`) e a tool marcar `isError`, mesmo com os resultados no `data`.

**Exemplos.**

- **Conferir a seleção:** `check {}` devolve um resultado por item selecionado.
- **Conferir um item:** `check { "items": ["node"] }` mostra a versão encontrada e a esperada.
- **Achar versão errada:** `check { "items": ["node", "uv"] }` devolve `status: "fail"` no item fora da versão.
- **Explicar a falha:** `check { "items": ["docker"] }` devolve `output` e `expected` para mostrar à pessoa o que difere.
- **Antes de atualizar:** `check { "items": ["node", "docker"] }` confirma o que está fora antes de `update`.

### Tool `install`

**Finalidade.** Instala itens do inventário e as dependências deles, ou uma ferramenta do mise fora do inventário com `external: true`, com plano por padrão.

**Entrada.**

| Campo | Tipo | Obrigatório | Padrão | Efeito |
| --- | --- | --- | --- | --- |
| `items` | array de string | sim | nenhum | Ids de itens, ou uma ferramenta do mise com `external: true`; mínimo de 1 |
| `dry_run` | boolean | não | `true` | `true` devolve o plano; `false` instala |
| `force` | boolean | não | `false` | `true` reinstala itens que já passam no check |
| `external` | boolean | não | `false` | `items` leva uma ferramenta do mise fora do inventário, como `terraform`; a versão é fixada e gravada em `external.json` |

**Saída.** Envelope com `data.dryRun` e `data.steps` (id, description, commands, action) no plano, ou `data.results` e `data.log` na execução real. Com `external`, devolve `tool` e `version`. Sem `init`, devolve `data.init: false`.

**Efeitos e permissões.** Com `dry_run: true`, nenhum arquivo muda. Com `false`, instala no espaço do usuário, pode usar `sudo` e rede, grava o log e atualiza `selection.json`; com `external`, grava a ferramenta e a versão em `external.json`.

**Recusas e limites.** Sem `init` devolve exit code 3 (`CONFIG`). Id desconhecido devolve 2 (`USAGE`) e ferramenta que o mise não conhece devolve 6 (`NOT_FOUND`). `sudo` sem senha devolve 13 (`SUDO_PASSWORD`), item sem suporte devolve 11 e falha parcial devolve 10. Todos marcam `isError`. Com `external: true`, o schema aceita só `tool` sem versão; `tool@version` e nome com ponto são recusados pela validação, então use o CLI quando a versão exata importa.

**Exemplos.**

- **Planejar antes de instalar:** `install { "items": ["node"], "dry_run": true }` devolve os passos sem alterar a máquina.
- **Instalar dois itens:** `install { "items": ["node", "uv"], "dry_run": false }` instala e devolve `results`.
- **Reinstalar um item quebrado:** `install { "items": ["docker"], "dry_run": false, "force": true }` refaz mesmo com o check passando.
- **Descobrir o bloqueio:** `install { "items": ["node"], "dry_run": false }` antes do `init` devolve exit 3 com `data.init: false`.
- **Instalar uma ferramenta externa:** `install { "items": ["terraform"], "external": true, "dry_run": true }` mostra o plano do mise para a versão mais recente, que fica em `external.json`.

### Tool `remove`

**Finalidade.** Remove itens instalados no espaço do usuário ou um app instalado com `install --external`, com plano por padrão e confirmação obrigatória na execução real.

**Entrada.**

| Campo | Tipo | Obrigatório | Padrão | Efeito |
| --- | --- | --- | --- | --- |
| `items` | array de string | sim | nenhum | Ids de itens, ou um app com `external: true`; mínimo de 1 |
| `dry_run` | boolean | não | `true` | `true` devolve o plano; `false` remove |
| `confirm` | boolean | não | `false` | A pessoa confirmou a remoção; obrigatório com `dry_run: false` |
| `include_native` | boolean | não | `false` | Também remove pacotes do gerenciador do sistema |
| `force` | boolean | não | `false` | Remove mesmo quando outro item selecionado exige o item, ou quando o `init` encontrou o item já instalado |
| `external` | boolean | não | `false` | `items` leva um app instalado com `install --external` |

**Saída.** Envelope com `data.steps` no plano ou `data.results` na execução real. A recusa local devolve `{ exitCode: 2, ok: false, error }`.

**Efeitos e permissões.** Com `dry_run: true`, nada muda. Com `false` e `confirm: true`, remove o que foi instalado pelo SetupVibe, atualiza `selection.json` e grava o log; com `external`, remove o app e atualiza `external.json`; com `force`, remove item adotado ou exigido por outro selecionado.

**Recusas e limites.** Sem `confirm` e com `dry_run: false`, a tool recusa antes de rodar o CLI, com exit code 2. Id desconhecido devolve 2, item exigido por outro selecionado ou adotado pelo `init` só sai com `force: true`, e a recusa sem força devolve 10 (`PARTIAL`). App que não foi instalado com `external` devolve 6 (`NOT_FOUND`).

**Exemplos.**

- **Ver o plano:** `remove { "items": ["node"], "dry_run": true }` devolve os passos sem remover nada.
- **Remover depois da confirmação:** `remove { "items": ["node"], "dry_run": false, "confirm": true }` remove e devolve `results`.
- **Testar a recusa:** `remove { "items": ["node"], "dry_run": false }` devolve exit 2 e a mensagem para pedir confirmação primeiro.
- **Incluir pacote do sistema:** `remove { "items": ["docker"], "dry_run": true, "include_native": true }` mostra o plano com o pacote nativo.
- **Remover app externo:** `remove { "items": ["terraform"], "external": true, "dry_run": false, "confirm": true }` remove o app e atualiza `external.json`.

### Tool `update`

**Finalidade.** Atualiza os itens selecionados cuja versão fixada mudou no inventário deste binário.

**Entrada.**

| Campo | Tipo | Obrigatório | Padrão | Efeito |
| --- | --- | --- | --- | --- |
| `dry_run` | boolean | não | `true` | `true` devolve o plano; `false` atualiza |

**Saída.** Envelope com `data.steps` no plano ou `data.results` na execução real, mais `data.outdated`, com `id`, `from` e `to` de cada item.

**Efeitos e permissões.** Com `dry_run: true`, nada muda. Com `false`, reinstala os itens desatualizados, grava o log e atualiza `selection.json`.

**Recusas e limites.** Sem `init` devolve 3 (`CONFIG`), falha parcial devolve 10, sistema sem suporte devolve 11 e `sudo` sem senha devolve 13. A tool não expõe `--external`.

**Exemplos.**

- **Planejar a atualização:** `update { "dry_run": true }` devolve `outdated` e os passos.
- **Aplicar:** `update { "dry_run": false }` reinstala o que mudou e devolve `results`.
- **Confirmar que está em dia:** `update {}` devolve `outdated: []` quando nada mudou.
- **Depois de um upgrade:** `update { "dry_run": true }` mostra o que o binário novo passou a fixar.
- **Ver uma falha parcial:** `update { "dry_run": false }` devolve exit 10 com os passos que falharam.

### Tool `health`

**Finalidade.** Devolve só os achados do SetupVibe que o `doctor` mostra: pré-requisitos, itens, shell, restos do SetupVibe 1 e containers expostos.

**Entrada.**

Nenhum. A tool não recebe argumento.

**Saída.** `ok` e `findings`, cada achado com `id`, `level` (`ok`, `warn` ou `fail`), `text`, `fix` quando existe, `safe` quando o `doctor --fix` aplica e `params` com os valores usados no texto.

**Efeitos e permissões.** Só leitura. Confere arquivos, PATH e containers; não aplica correção e não grava nada.

**Recusas e limites.** Não tem recusa própria e não marca `isError` por achado: `ok: false` aparece quando existe aviso ou problema.

**Exemplos.**

- **Ver o que falta antes do init:** `health {}` devolve o achado `init` com os pré-requisitos pendentes.
- **Depois de uma falha:** `health {}` mostra os itens que falham na verificação e o comando que resolve.
- **Achar o SetupVibe 1:** `health {}` devolve o achado `v1` com os traços encontrados.
- **Conferir containers expostos:** `health {}` devolve `docker-exposed` quando um container publica porta em todas as interfaces.
- **Comparar com o doctor:** `health {}` traz só os achados do SetupVibe; para o runtime e o terminal, use a tool `doctor`.

### Tool `doctor`

**Finalidade.** Roda o `doctor` do CLI: checagens de runtime, terminal e configuração mais os achados do SetupVibe, cada um com o comando que resolve.

**Entrada.**

Nenhum. A tool não recebe argumento.

**Saída.** Envelope com `data.ok`, `data.runtime` (cada check com `name`, `status` e `detail`) e `data.findings`, como na tool `health`.

**Efeitos e permissões.** Só leitura. Não aplica correção; para isso use `{{bin}} doctor --fix` no terminal.

**Recusas e limites.** Com um achado de nível fail, o CLI devolve exit code 3 (`CONFIG`) e a tool marca `isError`, mesmo com os dados no envelope. Rodando pelo MCP, os checks de stdin e stdout avisam que não são um TTY, porque o subprocesso usa pipes.

**Exemplos.**

- **Diagnóstico completo:** `doctor {}` devolve runtime e achados na mesma chamada.
- **Antes de instalar:** `doctor {}` mostra init pendente e itens que falham, antes de um `install`.
- **Depois de uma falha:** `doctor {}` devolve o achado com o comando que resolve e `isError` quando há fail.
- **Conferir a configuração:** `doctor {}` mostra settings ausente, master key e origem do cofre.
- **Separar runtime de achados:** use `doctor {}` para o todo e `health {}` só para os achados do SetupVibe.

### Tool `report`

**Finalidade.** Monta o relatório da máquina em Markdown para anexar numa issue, sem segredos.

**Entrada.**

Nenhum. A tool não recebe argumento.

**Saída.** Envelope com `data.markdown`, o mesmo texto de `{{bin}} report`: binário, sistema, init, doctor, itens selecionados, apps externos, última execução e os eventos finais do log.

**Efeitos e permissões.** Só leitura. Não grava arquivo; para gerar um, use `{{bin}} report --output arquivo.md`.

**Recusas e limites.** Nenhuma recusa própria. O CLI devolve 0 e a tool não marca `isError`.

**Exemplos.**

- **Abrir uma issue:** `report {}` devolve o Markdown para colar no formulário de bug.
- **Depois de uma falha:** `report {}` inclui os passos que falharam e o final do log.
- **Pedir apoio:** `report {}` traz sistema, versão e achados do doctor sem pedir comando à pessoa.
- **Comparar duas máquinas:** `report {}` em cada uma mostra diferenças de sistema e seleção.
- **Conferir o mascaramento:** `report {}` não traz valor de credencial nem despejo de ambiente.

### Tool `init`

**Finalidade.** Confere os requisitos e instala os pré-requisitos do SetupVibe (dependências de build e mise), com plano por padrão.

**Entrada.**

| Campo | Tipo | Obrigatório | Padrão | Efeito |
| --- | --- | --- | --- | --- |
| `dry_run` | boolean | não | `true` | `true` devolve o plano e as checagens; `false` instala |

**Saída.** Envelope com `data.checks` e `data.steps` no plano, ou `data.results` na execução real. O sucesso grava o registro do `init` em `config.json`.

**Efeitos e permissões.** Com `dry_run: true`, nada muda, mas as checagens de rede e relógio rodam. Com `false`, instala os itens `initOnly` e grava `config.json`.

**Recusas e limites.** Root sem `--user` devolve 12, a outra edição configurada devolve 2, disco curto devolve 14, rede ou relógio fora devolve 5, sistema sem suporte devolve 11, `sudo` sem senha devolve 13 e falha parcial devolve 10. A tool não expõe `--skip-network-check`.

**Exemplos.**

- **Conferir antes de instalar:** `init { "dry_run": true }` devolve as checagens e o plano dos pré-requisitos.
- **Instalar os pré-requisitos:** `init { "dry_run": false }` instala build deps e mise e grava o `init`.
- **Ver o bloqueio de disco:** `init { "dry_run": true }` devolve o check `disk` com `fail` e o exit code 14.
- **Conferir a edição:** `init { "dry_run": true }` mostra o check `edition` quando a outra edição já está configurada.
- **Depois de corrigir a rede:** `init { "dry_run": false }` repete as checagens e segue para o plano.

### Tool `migrate`

**Finalidade.** Move uma máquina preparada pelo SetupVibe 1 para o SetupVibe 2, com plano por padrão e confirmação obrigatória na execução real.

**Entrada.**

| Campo | Tipo | Obrigatório | Padrão | Efeito |
| --- | --- | --- | --- | --- |
| `dry_run` | boolean | não | `true` | `true` devolve o plano, as linhas movidas e as duplicidades mantidas |
| `confirm` | boolean | não | `false` | A pessoa confirmou a migração; obrigatório com `dry_run: false` |
| `remove_legacy` | array de enum | não | nenhum | `go`, `rbenv`, `npm-global`, `nodesource` ou `all`, para a execução real |

**Saída.** Envelope com `data.v1`, `data.moved` (linhas por arquivo), `data.removeLegacy`, `data.keptLegacy`, `data.steps` no plano, ou `data.results` na execução real.

**Efeitos e permissões.** Com `dry_run: true`, nada muda. Com `false` e `confirm: true`, copia os arquivos para `backups/`, move as linhas pessoais para os `.local`, grava os blocos, pode remover duplicidades e grava `migratedFromV1` em `config.json`.

**Recusas e limites.** Sem `confirm` e com `dry_run: false`, a tool recusa com exit code 2. Sistema sem suporte devolve 11, `sudo` sem senha devolve 13 e falha parcial devolve 10. Linuxbrew nunca é removido, e o plano mostra o comando de desinstalação.

**Exemplos.**

- **Ler o plano:** `migrate { "dry_run": true }` devolve os traços do SetupVibe 1 e as linhas que vão para os `.local`.
- **Conferir os segredos mascarados:** `migrate { "dry_run": true }` mostra `TOKEN` e `KEY` como `****` nas linhas movidas.
- **Migrar e remover duplicidades:** `migrate { "dry_run": false, "confirm": true, "remove_legacy": ["go", "rbenv"] }`.
- **Manter as duplicidades:** `migrate { "dry_run": false, "confirm": true }` migra sem remover nada.
- **Máquina sem vestígios:** `migrate { "dry_run": true }` devolve `found: false` e a mensagem de que não há o que migrar.

### Tool `logs`

**Finalidade.** Lista as execuções gravadas em `~/.setupvibe/logs` e devolve os eventos de uma delas.

**Entrada.**

| Campo | Tipo | Obrigatório | Padrão | Efeito |
| --- | --- | --- | --- | --- |
| `run` | string | não | a execução mais nova | Nome do arquivo de log devolvido em `runs` |

**Saída.** `ok`, `runs` (mais nova primeiro), `run` (o escolhido ou `null`), `events` com `time`, `item`, `action`, `status` e `message`, e `failed`, a contagem de eventos com falha.

**Efeitos e permissões.** Só leitura. Não apaga nem escreve log.

**Recusas e limites.** Um nome fora de `runs` devolve `{ ok: false, error, runs }` e marca `isError`, sem rodar o CLI.

**Exemplos.**

- **Ver a última execução:** `logs {}` devolve os eventos da execução mais nova.
- **Abrir uma execução específica:** `logs { "run": "2026-11-13T...-auto.log" }` devolve os eventos daquele arquivo.
- **Contar falhas:** `logs {}` devolve `failed`, a contagem de eventos com status fail.
- **Máquina sem execução:** `logs {}` devolve `runs: []` e `run: null`.
- **Investigar um install:** `logs {}` mostra o evento do item com a mensagem de erro abaixo do passo.

### Tool `tailscale`

**Finalidade.** Lê o cliente local do Tailscale: estado desta máquina, tailnet, máquinas com o tipo de conexão, serviços publicados e avisos de saúde.

**Entrada.**

Nenhum. A tool não recebe argumento.

**Saída.** `ok: true`, `installed`, `state`, `version`, `authUrl` quando precisa de login, `tailnet`, `self`, `health`, `peers`, `exitNodeInUse`, `serve` e `error` quando a leitura falha.

**Efeitos e permissões.** Só leitura. Chama o cliente local (`tailscale status` e `serve`), sem a API da Tailscale, e pode levar alguns segundos.

**Recusas e limites.** Nenhuma recusa própria: sem o cliente instalado, devolve `installed: false`. O teste de rede (`netcheck`) fica no módulo Tailscale da TUI.

**Exemplos.**

- **Ver se o cliente existe:** `tailscale {}` devolve `installed: false` quando o Tailscale não está na máquina.
- **Ler o estado:** `tailscale {}` devolve `state: "Running"` e o IP da máquina em `self.ips`.
- **Listar as máquinas:** `tailscale {}` devolve `peers` com `online`, `relay` e `lastSeen` de cada uma.
- **Conferir serviços:** `tailscale {}` devolve `serve` com o endereço publicado e o destino.
- **Ver o exit node:** `tailscale {}` devolve `exitNodeInUse` quando a máquina usa um exit node.

### Tool `machine`

**Finalidade.** Devolve uma leitura da máquina: host, kernel, tempo ligado, CPU, carga, memória, swap, discos, rede e os processos que mais usam CPU.

**Entrada.**

| Campo | Tipo | Obrigatório | Padrão | Efeito |
| --- | --- | --- | --- | --- |
| `processes` | inteiro | não | `8` | Quantos processos devolver, de 0 a 50 |

**Saída.** `ok: true`, `info` (hostname, kernel, arquitetura, modelo e núcleos de CPU, carga, memória, swap, tempo ligado, discos e interfaces) e `live` (cpu, perCore, memUsed, memTotal, swapUsed, swapTotal, load, net, disks, temps, processes, processCount e uptimeSec).

**Efeitos e permissões.** Só leitura. Espera cerca de um segundo entre duas leituras, porque CPU e rede são calculadas por diferença.

**Recusas e limites.** Nenhuma recusa própria. Um valor de `processes` fora de 0 a 50 é recusado pelo schema.

**Exemplos.**

- **Fotografia da máquina:** `machine {}` devolve `info` e `live` com os oito processos de maior CPU.
- **Ver mais processos:** `machine { "processes": 20 }` devolve vinte processos.
- **Só o resumo:** `machine { "processes": 0 }` devolve `live.processes: []` e mantém CPU, memória e discos.
- **Conferir memória e swap:** `machine {}` devolve `live.memUsed`, `memTotal`, `swapUsed` e `swapTotal`.
- **Conferir disco:** `machine {}` devolve `info.disks` com uso, espaço livre e percentual por ponto de montagem.

## Resources

Resources são leituras passivas, sem argumento além do URI. O esquema `<bin>://` evita colisão com outros servidores no mesmo cliente.

### Resource `{{bin}}://inventory`

**Finalidade.** Entrega o inventário da edição como JSON: o mesmo registro que o binário usa para instalar, verificar e listar.

**Entrada.**

Nenhum parâmetro além do URI.

**Saída.** `schemaVersion`, `edition`, `systems`, `categories`, `repositories`, `profiles` e `items`; cada item traz `id`, `name`, `description`, `version`, `versionPolicy`, `install`, `verify`, `requires`, `plugins` e `flags`, quando existirem.

**Efeitos e permissões.** Só leitura. O conteúdo vem embutido no binário e não depende de rede nem de arquivo local.

**Recusas e limites.** Nenhuma recusa própria.

**Exemplos.**

- **Descobrir ids:** leia `{{bin}}://inventory` antes de montar `install` ou `remove`.
- **Conferir a versão fixada:** procure o item e leia `version` e `versionPolicy`.
- **Ver os perfis:** `profiles` traz os perfis da edição, como `essencial`, com a lista de itens de cada um.
- **Conferir o método:** `install` mostra o método por sistema, como `mise`, `native` ou `installer`.
- **Auditar um item:** `verify` mostra o comando e o valor esperado usados por `check`.

### Resource `{{bin}}://selection`

**Finalidade.** Entrega o `selection.json` desta máquina: os itens escolhidos, a versão instalada e o status do último check.

**Entrada.**

Nenhum parâmetro além do URI.

**Saída.** `schemaVersion`, `profile`, `items` com `id`, `version`, `status` (`ok` ou `fail`) e `adopted` quando o `init` encontrou o item já instalado. Sem o arquivo, devolve `items: []`.

**Efeitos e permissões.** Só leitura. Não cria nem altera a seleção.

**Recusas e limites.** Nenhuma recusa própria.

**Exemplos.**

- **Ver o que foi escolhido:** leia `{{bin}}://selection` antes de sugerir `update`.
- **Achar item adotado:** `adopted: true` indica item que o `init` encontrou na máquina.
- **Ver falhas do check:** `status: "fail"` indica o item que precisa de `install --force` no CLI.
- **Conferir a versão instalada:** compare `version` com o inventário para achar o que está fora.
- **Máquina nova:** o resource devolve `items: []` antes do primeiro `init`.

### Resource `{{bin}}://about`

**Finalidade.** Entrega a identidade e o runtime do binário em JSON, igual à tool `about`.

**Entrada.**

Nenhum parâmetro além do URI.

**Saída.** Os mesmos campos da tool `about`: `bin`, `title`, `version`, `edition`, `runtime`, `platform`, `system`, `pid`, `dataDir` e `credits`.

**Efeitos e permissões.** Só leitura. Não grava nem consulta a rede.

**Recusas e limites.** Nenhuma recusa própria.

**Exemplos.**

- **Conferir a versão:** leia `{{bin}}://about` antes de citar um comportamento novo.
- **Conferir a edição:** `bin` e `title` mostram se a sessão é desktop ou servidor.
- **Conferir a pasta:** `dataDir` mostra a pasta de dados efetiva.
- **Coletar créditos:** `credits` traz nome, papel e URL de cada projeto.
- **Conferir a plataforma:** `platform` mostra sistema e arquitetura do processo.

### Resource `{{bin}}://exit-codes`

**Finalidade.** Entrega a tabela de exit codes em JSON, igual à tool `exit_codes`.

**Entrada.**

Nenhum parâmetro além do URI.

**Saída.** `codes`, com `code`, `name` e `description` de cada código.

**Efeitos e permissões.** Só leitura.

**Recusas e limites.** Nenhuma recusa própria.

**Exemplos.**

- **Montar o tratamento:** leia `{{bin}}://exit-codes` para mapear os codes no agente.
- **Explicar o 10:** confirme `PARTIAL` e a mensagem antes de responder à pessoa.
- **Explicar o 13:** confirme `SUDO_PASSWORD` e a regra sem senha.
- **Explicar o 30:** confirme `LOCKED` e o lock de execução.
- **Explicar o 130:** confirme `INTERRUPTED` e que nada foi concluído.

### Resource `{{bin}}://skill`

**Finalidade.** Entrega toda a documentação embutida em Markdown, como `{{bin}} --skill` sem tópico.

**Entrada.**

Nenhum parâmetro além do URI.

**Saída.** Markdown com o README, o CLI, a TUI, o MCP, a configuração, os exit codes, o troubleshooting, a migração e o inventário.

**Efeitos e permissões.** Só leitura. A resposta é longa e consome contexto.

**Recusas e limites.** Nenhuma recusa própria.

**Exemplos.**

- **Ler tudo antes de operar:** leia `{{bin}}://skill` numa sessão sem conhecimento prévio.
- **Conferir a documentação de uma versão:** o texto vem do binário em execução, não do repositório.
- **Preparar um agente novo:** entregue o Markdown como instrução inicial.
- **Auditar a doc embutida:** compare o Markdown com os arquivos de `docs/`.
- **Evitar quando o contexto é curto:** prefira `{{bin}}://skill/cli` para uma tarefa de CLI.

### Resource `{{bin}}://skill/{topic}`

**Finalidade.** Entrega uma seção da documentação embutida.

**Entrada.**

| Campo | Tipo | Obrigatório | Padrão | Efeito |
| --- | --- | --- | --- | --- |
| `topic` | string no URI | sim | nenhum | `cli`, `tui`, `mcp`, `config`, `exit-codes`, `troubleshooting`, `migration`, `inventory` ou `reference` |

**Saída.** Markdown da seção pedida. O template lista um resource por tópico.

**Efeitos e permissões.** Só leitura. O idioma segue `SETUPVIBE_LANG`.

**Recusas e limites.** Um tópico fora da lista devolve erro de leitura do resource, com a lista de tópicos aceitos.

**Exemplos.**

- **Aprender o CLI:** leia `{{bin}}://skill/cli` antes de sugerir um command.
- **Conferir teclas:** leia `{{bin}}://skill/tui` para orientar alguém na TUI.
- **Resolver uma falha:** leia `{{bin}}://skill/troubleshooting`.
- **Migrar uma máquina:** leia `{{bin}}://skill/migration` antes de chamar `migrate`.
- **Achar itens:** leia `{{bin}}://skill/inventory` para uma tabela por categoria.

## Prompts

### Prompt `operate`

**Finalidade.** Monta a instrução inicial de um agente para operar o binário: ler a documentação, rodar o CLI com `--json` e tratar o exit code.

**Entrada.**

| Campo | Tipo | Obrigatório | Padrão | Efeito |
| --- | --- | --- | --- | --- |
| `task` | string | sim | nenhum | O que a pessoa quer fazer com o binário |

**Saída.** Uma mensagem de usuário em `messages`, com o nome e a versão do binário, a ordem de leitura e a tarefa recebida.

**Efeitos e permissões.** Nenhum. O prompt não executa comando; ele prepara a conversa.

**Recusas e limites.** Sem `task`, o schema recusa a chamada.

**Exemplos.**

- **Começar uma sessão:** `operate { "task": "instalar o ambiente de desenvolvimento" }` devolve a instrução completa.
- **Diagnosticar:** `operate { "task": "descobrir por que o node está fora da versão" }` orienta a ler o CLI e rodar `check`.
- **Migrar:** `operate { "task": "migrar esta máquina do SetupVibe 1" }` orienta a ler `migration` antes de `migrate`.
- **Provisionar servidor:** `operate { "task": "preparar um VPS com Docker Swarm" }` orienta o fluxo do servidor.
- **Revisar configuração:** `operate { "task": "conferir o settings.json e o cofre" }` orienta a ler `config` e usar `config_list`.

## Configurar nos agentes

`{{bin}} mcp install` encontra os agentes no `PATH`, em `~/.local/bin` e nos shims do mise, e registra o servidor com o caminho absoluto do binário. No OpenCode, o arquivo é lido, o bloco `mcp` é mesclado e a cópia anterior fica em `opencode.json.setupvibe.bak`.

```bash
{{bin}} mcp install --dry-run
{{bin}} mcp install
{{bin}} mcp install --json
```

Agentes ausentes aparecem como `not installed` no stderr e em `data.skipped`. A execução é idempotente: `mcp get` evita registrar de novo.

## Como adicionar uma tool

1. Crie o arquivo em `shared/core/mcp/tools/<nome>.ts` (tool do framework) ou acrescente a tool em `shared/mcp/tools.ts` (operação do SetupVibe).
2. Declare `inputSchema` com Zod e descreva cada campo com `.describe()`; use `.default()` para o padrão que aparece no schema.
3. Devolva `content` em texto e `structuredContent` com o mesmo objeto. Marque `isError` quando a chamada falhar.
4. Registre no `catalog` (`tools`, `resources` ou `prompts`) para `mcp --list` enxergar o item.
5. Registre a função em `registerAll` de `shared/core/mcp/server.ts`.
6. Documente a tool neste arquivo, com as cinco situações de uso, e rode `bun test`.

Nomes de tools usam `snake_case`. A description diz quando usar e o que a tool devolve. Tool que grava precisa declarar isso e nunca ecoar segredo.

## Testar

```bash
npx @modelcontextprotocol/inspector {{bin}} mcp
{{bin}} mcp --list --json
bun test shared/tests/mcp-tools.test.ts shared/tests/docs-mcp-reference.test.ts
```

O Inspector abre uma página local para chamar tools, ler resources e acompanhar as mensagens JSON-RPC. O teste de documentação compara `mcp --list` com este arquivo nas duas línguas e nas duas edições.
