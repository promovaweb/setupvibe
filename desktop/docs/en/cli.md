# CLI

## Conventions

- `{{bin}} <command> [subcommand] [arguments] [options]`.
- Options accept `--key value` and `--key=value`. Short flags cannot be
  grouped (`-abc`).
- `--` ends option parsing; whatever comes after it is an argument.
- Global options are valid in any position, before or after the command.
- With no arguments, in an interactive terminal, the binary opens the TUI.
  Without a TTY, it prints the help and exits with exit code 2.
- All data output goes to stdout. Warnings, progress and errors in text mode
  go to stderr.
- Names of commands, subcommands, options, arguments, keys and output fields
  are in English. So are the binary's messages.

## Global options

| Option | Effect |
| --- | --- |
| `-h`, `--help` | Help for the current command. Exit code 0. |
| `-V`, `--version` | Prints `{{bin}} <version>`. Exit code 0. |
| `--json` | JSON output with a stable envelope. Errors are also printed as JSON, to stdout. |
| `--skill [topic]` | Embedded documentation. Topics: `cli`, `tui`, `mcp`, `config`, `exit-codes`, `reference`. |
| `--opencli` | OpenCLI 0.1 description of the command tree in JSON. |
| `--no-color` | Turns off ANSI colors. `NO_COLOR=1` has the same effect. |

## Text and JSON output

Text is the default when `output.format` in settings.json is `text`. With
`--json`, or with `output.format = json`, the output follows this envelope:

```json
{ "ok": true, "command": "{{bin}} config get", "data": { "key": "tui.theme", "value": "night" } }
```

On error:

```json
{
  "ok": false,
  "command": "{{bin}} credentials get",
  "error": { "code": 4, "name": "CREDENTIALS", "message": "Credential \"x\" not found.", "details": { "name": "x" } }
}
```

The process exit code is always the same as `error.code`. An agent should read
both: the envelope for the message, the code for the failure class.

## Skeleton commands

| Command | Purpose |
| --- | --- |
| `tui [--tab <tab>]` | Opens the TUI. Requires a TTY. |
| `about` | Version, executable, runtime, platform and credits. |
| `config list\|get\|set\|unset\|path\|schema` | Preferences in settings.json. |
| `credentials set\|get\|list\|remove\|status\|clear\|rotate-key` | Encrypted vault in credentials.json. |
| `mcp [--list]` | MCP server over stdio, or a listing of what it registers. |
| `skill [topic]` | Same effect as `--skill`. |
| `doctor` | Checks runtime, TTY, folder, settings, key and vault. |
| `completion <shell>` | Generates a script for `bash`, `zsh` or `fish`. |

## How to add a command

1. Copy `template/command/example.ts` to `shared/core/cli/commands/<name>.ts`.
2. Fill in `name`, `description`, `arguments`, `options`, `examples` and
   `exitCodes`. Every option needs a `description`; that is what appears in
   `--help`, in `--skill` and in OpenCLI.
3. Implement `run(ctx)` returning `{ data, text }`. `data` is what goes out in
   `--json`; `text` is what goes out for humans. Throw `AppError` (or use
   `error.*`) for expected failures, with the right exit code.
4. Register the command in `shared/core/cli/commands.ts`.
5. Run `bun test`, `bun run opencli` and check `docs/opencli.json`.

Secrets never come in through a command line argument. Read them from stdin or
with `readSecret()`; store them with `setCredential()`; retrieve them with
`getCredential()`, which exits with exit code 4 when the value does not exist.

## Diagnostics and completion

`{{bin}} doctor` checks for Bun 1.4.4 or later, a TTY on stdin/stdout,
a data folder with 0700, reading of settings.json, the master key source,
vault decryption, version and platform. Each line uses ✓, ! or ✗.
In JSON, `data` contains `{ checks, ok }`; each check has `name`, `status`
and `detail`. A missing TTY or files not yet created produce `warn`.
A check with `fail` produces exit code 3; the others return 0.
The diagnostics do not create files or show secrets.

`{{bin}} completion <shell>` prints the script to stdout. The `shell` argument
accepts `bash`, `zsh` or `fish`; subcommands, local and global options and enum
values come from the registry. With `--json`, `data` contains `{ shell, script }`.
The Zsh script uses `compdef` and `compadd`, without `bashcompinit`.
Install it in the current session or add the line to your startup file:

```bash
eval "$({{bin}} completion bash)"
eval "$({{bin}} completion zsh)"
# fish
{{bin}} completion fish | source
```

`{{bin}} --skill reference` returns only the generated reference, with
commands, arguments, options and exit codes. `skill reference` gives the same
result, without the documentation chapters.
