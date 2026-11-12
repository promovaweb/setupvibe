# MCP tools

`shared/mcp/tools.ts` adds the SetupVibe operations to the Termfy MCP server.
Each tool runs the binary's own CLI in a subprocess with `--json` and returns
the final envelope plus the exit code, so an agent and a person always get the
same result. It implements section 13 of the specification.

| Tool | CLI | Safety |
| --- | --- | --- |
| `system` | `system --no-update-check` | read only |
| `list` | `list [--category]` | read only |
| `check` | `check [items]` | read only |
| `install` | `install <items> [--dry-run] [--force]` | `dry_run` defaults to `true` |
| `remove` | `remove <items> --yes [--dry-run] [--include-native]` | `dry_run` defaults to `true`; a real removal needs `confirm: true` |
| `update` | `update [--dry-run]` | `dry_run` defaults to `true` |
| `health` | doctor findings | read only |

`mcp install` (`shared/commands/mcp-install.ts`) registers the server in
Claude Code and Codex through their own `mcp add` commands, skipping them when
`mcp get` already finds it, and merges the server into the `mcp` block of
`~/.config/opencode/opencode.json` after a one-time backup. Agents that are not
installed are skipped.
