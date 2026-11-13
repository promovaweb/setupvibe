# Exit codes

Zero means success. Each failure family gets a fixed number. Scripts and agents
must handle the code before interpreting the message.

| Code | Name | Commands that return it | What to do |
| --- | --- | --- | --- |
| 0 | `SUCCESS` | every command, when the operation finishes | move to the next step |
| 1 | `GENERIC_ERROR` | every command, when a failure escapes without a classification; `skill` when the external CLI fails; `init` and `auto` when the clock is more than five minutes off; `ssh copy-id` when the remote `ssh` fails | read the message and the `report`; without a clear cause, run `{{bin}} report` and attach it to an issue |
| 2 | `USAGE` | invalid arguments, options or subcommand; the binary without arguments outside a TTY, which prints the help; `init` and `auto` when the other edition is already set up; `migrate` with an unknown `--remove-legacy` id; `upgrade` from source | check the command `--help` and the value you passed |
| 3 | `CONFIG` | `settings.json` missing, invalid or with an unknown key; `install` and `update` before `init`; `security remove` without a record; `doctor` with a fail finding; `config import` when the installation cannot continue | read the named field, fix the state file or run the command the message asks for |
| 4 | `CREDENTIALS` | `credentials` and its subcommands, when the vault is unreadable, the master key is missing or the name does not exist | store the credential with `{{bin}} credentials set <name>` or recover the key |
| 5 | `NETWORK_OR_API` | `init` and `auto` when `github.com` does not answer; `upgrade` when `version.json`, the binary, `SHA256SUMS` or the signature do not match | check proxy, CA and DNS in [troubleshooting.md](troubleshooting.md) |
| 6 | `NOT_FOUND` | `config` and its subcommands when a file path does not exist; `ssh copy-id` without a public key; `install --external` with an unknown tool; `remove --external` of an app not installed that way | create the file, choose another key or install the tool first |
| 7 | `PERMISSION` | `config`, `credentials` and `upgrade` when the file or the binary cannot be read, written or replaced | fix the owner and the mode of the named path |
| 8 | `NO_TTY` | `tui`, when stdin or stdout is not a terminal | run it in a terminal, or use the CLI with `--json` |
| 9 | `MCP` | `mcp`, when the server does not start or loses the stdio transport | check the MCP client configuration and the server stderr |
| 10 | `PARTIAL` | `init`, `auto`, `install`, `remove`, `update`, `check`, `shell apply`, `shell remove`, `migrate`, `self uninstall`, `user create`, `user nopasswd`, `security apply`, `security remove`, `config import`, `mcp install`, `doctor --repair-windows` when some steps failed and the rest stayed applied | read the run log; the closing message has the path |
| 11 | `UNSUPPORTED_SYSTEM` | `system`, `init`, `auto`, `list`, `install`, `remove`, `update`, `check`, `shell apply`, `migrate`, `user create`, `security apply`; `upgrade` when there is no binary for the platform | check `{{bin}} system`; the edition or the architecture has no support |
| 12 | `ROOT` | `init` and `auto` when they run as root without `--user` | create the user with `{{bin}} user create <name>`, or run `auto --user <name>` |
| 13 | `SUDO_PASSWORD` | `auto` and `migrate` when `sudo` asks for a password and there is no terminal | run it in a terminal, or create the rule with `{{bin}} user nopasswd <name>` |
| 14 | `DISK_SPACE` | `init` and `auto` when the user folder has less than 10 GB free on the desktop or 5 GB on the server | free space and run again |
| 20 | `REBOOT_PENDING` | `auto` when a restart is pending and `--reboot` was not passed | restart and run `auto` again, or pass `--reboot` |
| 30 | `LOCKED` | `auto` when another run holds `~/.setupvibe/run.lock` | wait for the other run; check the PID in the lock |
| 130 | `INTERRUPTED` | any command interrupted with Ctrl+C; `remove`, `self uninstall` and `credentials` when you refuse the confirmation | nothing was completed; run it again when you want |

The single source is `shared/core/app/exit-codes.ts`. It feeds the exit code
section of every `--help`, `--opencli`, the MCP tool `exit_codes` and the
`{{bin}}://exit-codes` resource.

## Per command

Each command declares its codes in `--opencli`, besides 0, 1 and 2, which apply
to every command.

| Command | Declared codes |
| --- | --- |
| `tui` | 8 |
| `system` | 11 |
| `init` | 5, 10, 11, 12, 14 |
| `auto` | 5, 10, 11, 12, 13, 14, 20, 30 |
| `list` | 11 |
| `install` | 3, 6, 10, 11 |
| `remove` | 6, 10, 11, 130 |
| `update` | 3, 10, 11 |
| `check` | 10, 11 |
| `shell apply` | 10, 11 |
| `shell remove` | 10 |
| `migrate` | 10, 11, 13 |
| `upgrade` | 5, 7, 11 |
| `self uninstall` | 10, 130 |
| `ssh copy-id` | 6 |
| `user create` | 10, 11 |
| `user nopasswd` | 10 |
| `security apply` | 10, 11 |
| `security remove` | 3, 10 |
| `config` and subcommands | 3, 6, 7 |
| `config import` | 3, 10 |
| `credentials` and subcommands | 4, 7, 130 |
| `mcp` | 9 |
| `mcp install` | 10 |
| `doctor` | 3, 10 |

Some paths return a code the command list does not declare: `upgrade` returns
2 when it runs from source, `config import` returns 2 with an unreadable file,
and `self uninstall` returns 2 without `--yes` outside a terminal. Handle the
code you observe, not only the list.

MCP tools that refuse a real run without confirmation return `exitCode: 2` in
the tool result, without starting a process. `doctor`, `check`, `install` and
`update` mark `isError` with the data in the envelope when the code is not
zero.

## In shell

Read the code into a variable. Negating the command with `!` loses the real
value, because `$?` becomes the result of the negation.

```bash
{{bin}} credentials get github.token --json > /tmp/out.json
code=$?
case $code in
  0) echo "token read" ;;
  4) echo "store it with: {{bin}} credentials set github.token" ;;
  *) echo "failed with $code; see /tmp/out.json" ;;
esac
```

A plan that accepts a partial failure tests 10 before 1:

```bash
{{bin}} auto --json --user deploy
code=$?
if [ "$code" -eq 10 ]; then
  echo "some items failed; the log is in ~/.setupvibe/logs"
elif [ "$code" -ne 0 ]; then
  echo "auto stopped with $code"
fi
```

## In `--json`

An error comes in the envelope, with code, name and details:

```json
{ "ok": false, "command": "setupvibe credentials get", "error": { "code": 4, "name": "CREDENTIALS", "message": "Credential \"github.token\" not found." } }
```

The envelope `data` never carries a credential value. Read `error.code` before
`error.message`, because the message may change between versions.

## In code

```ts
import { error } from "../app/errors.ts";

throw error.network("The API responded 503.", { status: 503 }); // exits with 5
```

For a new family, add the constant and the description in
`shared/core/app/exit-codes.ts`, a shortcut in `shared/core/app/errors.ts` and
the code in `exitCodes` of every command that returns it. Do not reuse numbers.
