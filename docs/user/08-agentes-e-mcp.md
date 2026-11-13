# Agentes de IA e MCP

Um agente de código consegue ler um terminal, mas não consegue adivinhar o
estado de uma máquina. Se ele chama `setupvibe doctor` e interpreta texto, cada
versão do binário pode quebrar a leitura. O servidor MCP existe para isso: o
agente pergunta em protocolo, recebe um objeto com o mesmo envelope do `--json` e
decide pelo exit code.

O servidor roda dentro do mesmo executável, sobre stdio, e não escreve nada
além do protocolo em stdout. Diagnóstico vai para stderr.

```bash
setupvibe mcp
```

## O que o servidor expõe

São 20 tools, 6 resources e 1 prompt. As tools que executam o CLI devolvem
`{ exitCode, ok, command, data }` ou `{ exitCode, ok: false, error }`; as tools
nativas, como `logs` e `machine`, devolvem o objeto próprio.

| Tool | O que faz | Altera a máquina |
| --- | --- | --- |
| `about` | identidade e runtime do binário | não |
| `exit_codes` | tabela de exit codes | não |
| `skill` | documentação embutida, inteira ou por tópico | não |
| `config_list` | keys de `settings.json` em vigor | não |
| `config_get` | valor de uma key | não |
| `credentials_status` | nomes e origem da master key, sem valores | não |
| `system` | sistema, arquitetura, WSL, headless, IP público e variante | não |
| `list` | itens com o status neste sistema | não |
| `check` | itens instalados contra as versões fixadas | não |
| `health` | só os achados do SetupVibe no doctor | não |
| `doctor` | runtime e achados, com o comando que corrige | não |
| `report` | relatório em Markdown para uma issue | não |
| `logs` | execuções e os eventos de uma delas | não |
| `tailscale` | cliente local do Tailscale | não |
| `machine` | CPU, memória, discos, rede e processos | não |
| `install` | instala itens e dependências | só com `dry_run: false` |
| `remove` | remove itens do espaço do usuário | só com `dry_run: false` e `confirm: true` |
| `update` | atualiza itens com versão fixada nova | só com `dry_run: false` |
| `init` | pré-requisitos do SetupVibe | só com `dry_run: false` |
| `migrate` | migra uma máquina do SetupVibe 1 | só com `dry_run: false` e `confirm: true` |

A regra de escrita é deliberada. Instalar, remover, atualizar, preparar e migrar
fazem dry run por padrão; o agente precisa pedir a execução real, e as duas
operações destrutivas exigem confirmação explícita. Nenhuma tool devolve valor de
credencial, e nenhuma grava `settings.json`: a configuração continua no CLI, onde
há uma pessoa para confirmar.

## Resources

Os resources são leitura passiva. O agente pede o URI e recebe JSON ou Markdown.

| Resource | Conteúdo |
| --- | --- |
| `setupvibe://inventory` | a lista da edição, com itens, versões e métodos |
| `setupvibe://selection` | o que esta máquina selecionou, com versão e status |
| `setupvibe://about` | identidade e runtime em JSON |
| `setupvibe://exit-codes` | a tabela de exit codes em JSON |
| `setupvibe://skill` | a documentação embutida em Markdown |
| `setupvibe://skill/{topic}` | uma seção da documentação |

Os tópicos são os mesmos do `--skill`: `cli`, `tui`, `mcp`, `config`,
`exit-codes`, `troubleshooting`, `migration`, `inventory` e `reference`. Um
agente que recebe o binário sem o repositório lê a documentação inteira por um
desses URIs.

## O prompt `operate`

O prompt não executa nada. Ele monta a instrução inicial de um agente com o nome
e a versão do binário, a ordem de leitura e a tarefa recebida.

```json
{ "task": "descobrir por que o node está fora da versão fixada" }
```

A resposta é uma mensagem de usuário com a ordem de leitura e a tarefa. É a
forma de começar uma sessão sem repetir no prompt o que o binário já sabe.

## Listar antes de conectar

```bash
setupvibe mcp --list
setupvibe mcp --list --json
```

A lista mostra nome e descrição de cada tool, o URI de cada resource e o prompt,
na ordem em que o servidor registra. Use-a para conferir o que a versão do
binário expõe antes de configurar um cliente.

## Configurar o cliente

O bloco mínimo aponta para o binário e para o subcommand `mcp`:

```json
{ "mcpServers": { "setupvibe": { "command": "setupvibe", "args": ["mcp"] } } }
```

No OpenCode, o bloco fica na configuração do aplicativo:

```json
{ "mcp": { "setupvibe": { "type": "local", "command": ["setupvibe", "mcp"], "enabled": true } } }
```

O `mcp install` registra o servidor no Claude Code (`claude mcp add --scope
user`), no Codex (`codex mcp add`) e no OpenCode, com cópia de segurança do
arquivo antes de mesclar o bloco.

```bash
setupvibe mcp install --dry-run
setupvibe mcp install
```

Agente que não está no `PATH` aparece como `not installed` e fica de fora. A
execução é idempotente: rodar de novo não duplica o que já está configurado.

## Um agente em ação

O exemplo junta as três leituras que um agente faz antes de agir.

1. **Entender o problema.** `check` com o item citado devolve `status` e
   `expected`; `doctor` devolve os achados com o comando que corrige.
2. **Ver o que mudaria.** `install` com o padrão de dry run devolve `items` e
   `skipped`, sem alterar a máquina.
3. **Executar.** `install` com `dry_run: false` devolve `log` e `results`, e o
   agente confere o `exitCode` antes de relatar sucesso.

Para remover, o mesmo caminho com `dry_run: false` e `confirm: true`. Para uma
máquina vinda do SetupVibe 1, `migrate` segue a mesma regra: dry run primeiro,
confirmação depois.

O agente deve tratar `exitCode` antes de `isError` e antes da mensagem. Um
`doctor` com achado de nível `fail` marca `isError` e devolve os achados junto,
com exit code 3; ler só o `isError` esconde o que precisa ser corrigido.

## Skill do próprio binário

Além do protocolo, existe uma skill que ensina o agente a operar o SetupVibe
pelo CLI, com dry run, envelopes e exit codes. Ela é instalada pelo skills CLI:

```bash
setupvibe skill -- add https://github.com/promovaweb/setupvibe/tree/v2/desktop/skills/setupvibe
```

Na edição server, o caminho termina em `server/skills/setupvibe-server`. A skill
e o servidor MCP se complementam: a skill diz como conduzir o trabalho, o
servidor entrega o estado em objetos.

## Limites

O servidor MCP não substitui o CLI para configuração. Ele também não executa
comando arbitrário: cada tool tem schema próprio, com campos tipados e
obrigatoriedade declarada. Um agente não consegue, por exemplo, gravar uma
credencial nem mudar uma key de `settings.json` por MCP.

## Próximo passo

O agente já consegue operar a máquina por protocolo. O capítulo
[Windows e WSL](09-windows-e-wsl.md) mostra o que muda quando o alvo é o Windows
nativo e como o WSL entra nessa história.
