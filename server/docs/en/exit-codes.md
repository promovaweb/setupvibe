# Exit codes

Zero is success. Each failure family has a fixed number. Scripts and agents
should handle the code before interpreting the message.

| Code | Name | When |
| --- | --- | --- |
| 0 | `SUCCESS` | operation completed |
| 1 | `GENERIC_ERROR` | unexpected unclassified failure |
| 2 | `USAGE` | invalid arguments, options or subcommand; also when the binary runs with no arguments outside a TTY |
| 3 | `CONFIG` | settings.json missing, invalid or unknown key |
| 4 | `CREDENTIALS` | credentials.json unreadable, master key missing or credential not found |
| 5 | `NETWORK_OR_API` | network failure or unexpected API response |
| 6 | `NOT_FOUND` | requested resource does not exist |
| 7 | `PERMISSION` | permission denied on the file system |
| 8 | `NO_TTY` | the TUI requires an interactive terminal |
| 9 | `MCP` | the MCP server failed to start or lost its transport |
| 10 | `PARTIAL` | some inventory items failed; the rest were installed |
| 11 | `UNSUPPORTED_SYSTEM` | system, version or architecture not supported in this edition |
| 12 | `ROOT` | running as root without `--user` |
| 13 | `SUDO_PASSWORD` | sudo asks for a password in a non-interactive run |
| 14 | `DISK_SPACE` | not enough disk space |
| 20 | `REBOOT_PENDING` | a reboot is needed before the remaining steps |
| 30 | `LOCKED` | another SetupVibe run is in progress |
| 130 | `INTERRUPTED` | input canceled or process interrupted with Ctrl+C |

The single source is `shared/core/app/exit-codes.ts`. The same table appears in `--help`,
in `--opencli`, in the `exit_codes` MCP tool and in the `{{bin}}://exit-codes` resource.

## In shell

```bash
if ! {{bin}} credentials get github.token --json > /tmp/out.json; then
  case $? in
    4) echo "save the credential with: {{bin}} credentials set github.token" ;;
    *) echo "failed: see /tmp/out.json" ;;
  esac
fi
```

## In code

```ts
import { error } from "../app/errors.ts";

throw error.network("The API responded 503.", { status: 503 }); // exits with 5
```

For a new family, add the constant and the description in
`shared/core/app/exit-codes.ts` and a shortcut in `shared/core/app/errors.ts`. Do not reuse
numbers.
