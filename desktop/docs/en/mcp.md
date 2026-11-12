# MCP

`{{bin}} mcp` turns the process into a Model Context Protocol server
over stdio. Nothing else is written to stdout; diagnostics go to stderr.

## Client configuration

```json
{
  "mcpServers": {
    "{{bin}}": { "command": "{{bin}}", "args": ["mcp"] }
  }
}
```

For Claude Code: `claude mcp add {{bin}} -- {{bin}} mcp`.
For development, without compiling: `"command": "bun", "args": ["run", "src/main.ts", "mcp"]`.

## Tools

| Tool | Input | Output |
| --- | --- | --- |
| `doctor` | none | `{ checks, ok }`; `isError: true` if there is a `fail` |
| `about` | none | identity, runtime, platform, data directory and credits |
| `exit_codes` | none | exit code table |
| `skill` | `topic?` (`cli`, `tui`, `mcp`, `config`, `exit-codes`, `reference`) | documentation in Markdown |
| `config_list` | none | settings.json keys in effect and the schema |
| `config_get` | `key` | value of the key; `isError` when it does not exist |
| `credentials_status` | none | file, master key source, count and names |

No tool returns the value of a credential, and no tool writes. Writing
stays in the CLI, where there is human confirmation.

## Resources

| URI | Content |
| --- | --- |
| `{{bin}}://about` | identity in JSON |
| `{{bin}}://exit-codes` | exit codes in JSON |
| `{{bin}}://skill` | full documentation in Markdown |
| `{{bin}}://skill/{topic}` | one section; the template lists the topics |

## Prompts

| Prompt | Arguments | Purpose |
| --- | --- | --- |
| `operate` | `task` | tells the agent to read `skill cli` and run the task through the CLI with `--json` |

## Listing without starting

```bash
{{bin}} mcp --list
{{bin}} mcp --list --json
```

## Testing

```bash
npx @modelcontextprotocol/inspector {{bin}} mcp
```

The Inspector opens a local page to call tools, read resources and
inspect the JSON-RPC messages.

## How to add a tool

1. Copy `template/tool/example.ts` to `shared/core/mcp/tools/<name>.ts`.
2. Declare `inputSchema` with Zod and describe each field with `.describe()`. The
   tool description says when to use it and what it returns.
3. Return `content` as text and, when the output is structured,
   `structuredContent` with the same object.
4. Add the tool to `catalog.tools` so that `mcp --list` sees it.
5. Register the function in `registerAll` in `shared/core/mcp/server.ts`.
6. Test with the Inspector and with `bun test`.

Tool names use `snake_case`. Tools that write or call external APIs
must say so in the description and must never echo secrets in the response.

The `doctor` tool uses the same collection as the CLI command: it checks runtime, terminal,
folder permissions, settings, key source and vault reading. It does not write
files and does not return credential values. Each check has `name`,
`status` (`ok`, `warn` or `fail`) and `detail`.

## SetupVibe tools

Besides the Termfy tools, the server exposes the inventory operations. They
run the CLI itself with `--json`, so the agent gets the same result as
a person at the terminal.

| Tool | What it does |
| --- | --- |
| `system` | detected system, architecture, WSL, headless machine, public IP and variant |
| `list` | inventory items with their status on this system; `category` filters |
| `check` | checks the installed items against the pinned versions |
| `install` | installs items and dependencies; `dry_run` is `true` by default |
| `remove` | removes items from the user's space; `dry_run` is `true` by default and actual removal requires `confirm: true` |
| `update` | updates the items whose pinned version changed; `dry_run` is `true` by default |
| `health` | pending prerequisites, failing and outdated items, with the command that fixes them |

## Configuring in agents

`{{bin}} mcp install` registers the server in Claude Code (`claude mcp add
--scope user`), in Codex (`codex mcp add`) and in OpenCode (the `mcp` block of
`~/.config/opencode/opencode.json`, with a backup copy). Agents that are not
installed are skipped, and running it again changes nothing.
