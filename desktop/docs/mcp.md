# MCP

`{{bin}} mcp` transforma o processo em um servidor Model Context Protocol
sobre stdio. Nada mais é escrito em stdout; diagnósticos vão para stderr.

## Configuração no cliente

```json
{
  "mcpServers": {
    "{{bin}}": { "command": "{{bin}}", "args": ["mcp"] }
  }
}
```

Para o Claude Code: `claude mcp add {{bin}} -- {{bin}} mcp`.
Para desenvolvimento, sem compilar: `"command": "bun", "args": ["run", "src/main.ts", "mcp"]`.

## Tools

| Tool | Entrada | Saída |
| --- | --- | --- |
| `doctor` | nenhuma | `{ checks, ok }`; `isError: true` se houver `fail` |
| `about` | nenhuma | identity, runtime, platform, data directory e credits |
| `exit_codes` | nenhuma | tabela de exit codes |
| `skill` | `topic?` (`cli`, `tui`, `mcp`, `config`, `exit-codes`, `reference`) | documentação em Markdown |
| `config_list` | nenhuma | keys de settings.json em vigor e o schema |
| `config_get` | `key` | valor da key; `isError` quando não existe |
| `credentials_status` | nenhuma | file, master key source, count e names |

Nenhuma tool devolve o valor de uma credencial, e nenhuma tool grava. Escrita
continua no CLI, onde há confirmação humana.

## Resources

| URI | Conteúdo |
| --- | --- |
| `{{bin}}://about` | identity em JSON |
| `{{bin}}://exit-codes` | exit codes em JSON |
| `{{bin}}://skill` | documentação completa em Markdown |
| `{{bin}}://skill/{topic}` | uma seção; o template lista os topics |

## Prompts

| Prompt | Arguments | Função |
| --- | --- | --- |
| `operate` | `task` | instrui o agente a ler `skill cli` e executar a task pelo CLI com `--json` |

## Listar sem iniciar

```bash
{{bin}} mcp --list
{{bin}} mcp --list --json
```

## Testar

```bash
npx @modelcontextprotocol/inspector {{bin}} mcp
```

O Inspector abre uma página local para chamar tools, ler resources e
inspecionar as mensagens JSON-RPC.

## Como adicionar uma tool

1. Copie `template/tool/example.ts` para `shared/core/mcp/tools/<name>.ts`.
2. Declare `inputSchema` com Zod e descreva cada campo com `.describe()`. A
   description da tool diz quando usar e o que ela devolve.
3. Devolva `content` em texto e, quando a saída for estruturada,
   `structuredContent` com o mesmo objeto.
4. Acrescente a tool ao `catalog.tools` para que `mcp --list` a enxergue.
5. Registre a função em `registerAll` em `shared/core/mcp/server.ts`.
6. Teste com o Inspector e com `bun test`.

Nomes de tools usam `snake_case`. Tools que gravam ou chamam APIs externas
precisam dizer isso na description e nunca devem ecoar segredos na resposta.

A tool `doctor` usa a mesma coleta do command CLI: confere runtime, terminal,
permissões da pasta, settings, origem da chave e leitura do cofre. Não grava
arquivos e não retorna valores de credenciais. Cada check traz `name`,
`status` (`ok`, `warn` ou `fail`) e `detail`.

## Tools do SetupVibe

Além das tools do Termfy, o servidor expõe as operações do inventário. Elas
rodam o próprio CLI com `--json`, então o agente recebe o mesmo resultado que
uma pessoa no terminal.

| Tool | O que faz |
| --- | --- |
| `system` | sistema detectado, arquitetura, WSL, máquina sem interface, IP público e variante |
| `list` | itens do inventário com o status neste sistema; `category` filtra |
| `check` | confere os itens instalados contra as versões fixadas |
| `install` | instala itens e dependências; `dry_run` é `true` por padrão |
| `remove` | remove itens do espaço do usuário; `dry_run` é `true` por padrão e a remoção real exige `confirm: true` |
| `update` | atualiza os itens cuja versão fixada mudou; `dry_run` é `true` por padrão |
| `health` | pré-requisitos pendentes, itens que falham e desatualizados, com o comando que resolve |

## Configurar nos agentes

`{{bin}} mcp install` registra o servidor no Claude Code (`claude mcp add
--scope user`), no Codex (`codex mcp add`) e no OpenCode (bloco `mcp` de
`~/.config/opencode/opencode.json`, com cópia de segurança). Agentes que não
estão instalados ficam de fora, e rodar de novo não muda nada.
