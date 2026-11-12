# Configuration and credentials

Everything the binary persists lives in `~/.setupvibe/`:

| File | Content | Permission |
| --- | --- | --- |
| `settings.json` | preferences in plain text | 0600 |
| `credentials.json` | AES-256-GCM envelope with the secrets | 0600 |
| `master.key` | master key in hexadecimal, created on the first write | 0600 |

The folder is created with 0700. The `SETUPVIBE_HOME` variable changes the root,
which is useful in tests and CI.

## settings.json

Keys in dot notation. The skeleton schema:

| Key | Type | Default | Purpose |
| --- | --- | --- | --- |
| `output.format` | `text` or `json` | `text` | default CLI output format |
| `output.colors` | boolean | `true` | ANSI colors in text output |
| `tui.initialTab` | `overview`, `inventory`, `user`, `doctor`, `logs` or `about` | `overview` (Home) | tab opened when the TUI starts |
| `tui.language` | `pt-BR` or `en` | `pt-BR` | TUI language; the `L` key and the `PT · EN` switch write it |
| `tui.mouse` | `true` or `false` | `true` | mouse in the TUI (clicks and wheel) |
| `tui.theme` | `night` or `day` | `night` | TUI palette |
| `telemetry.enabled` | boolean | `false` | reserved for derived projects |

Commands:

```bash
{{bin}} config list
{{bin}} config get tui.theme
{{bin}} config set output.format json
{{bin}} config unset telemetry.enabled
{{bin}} config path
{{bin}} config schema
```

Keys outside the schema are accepted as text. To give a new key a type,
default and documentation, add it to `SETTINGS_SCHEMA` in
`shared/core/config/settings.ts`.

## credentials.json

The file stores an envelope:

```json
{ "version": 1, "algorithm": "aes-256-gcm", "iv": "<base64>", "tag": "<base64>", "data": "<base64>" }
```

`data` is the encrypted JSON `{ "name": "value" }`. Names follow
`[a-z0-9][a-z0-9_.-]{0,63}`, for example `openai.api_key` or `github.token`.

The master key has 32 bytes and comes, in this order:

1. from the `{{BIN}}_MASTER_KEY` variable (64 hexadecimal characters);
2. from the `master.key` file, generated automatically.

Generate a key for the variable with `openssl rand -hex 32`. When the variable
is set, `master.key` is ignored.

Commands:

```bash
{{bin}} credentials set openai.api_key            # type without echo
printf '%s' "$TOKEN" | {{bin}} credentials set github.token --stdin
{{bin}} credentials get openai.api_key            # mascarado
{{bin}} credentials get openai.api_key --reveal   # em claro
{{bin}} credentials list
{{bin}} credentials remove github.token
{{bin}} credentials status
{{bin}} credentials clear --yes
```

## What the encryption protects

The encryption protects the file against casual reading, copies in backups and
disk scans by other tools. Anyone with access to the same system account
can read `master.key` and decrypt the content. For a higher level, inject the
key through `{{BIN}}_MASTER_KEY` from a secrets manager and do not
write `master.key` to disk.

## Using a credential in code

```ts
import { getCredential } from "../config/credentials.ts";

const token = getCredential("github.token"); // throws AppError(4) when missing
```

Never write the value to a log, an error, the `data` of `--json` or an
MCP tool response.

## Environment variables

| Variable | Effect |
| --- | --- |
| `SETUPVIBE_HOME` | replaces `~/.setupvibe/` with another folder |
| `{{BIN}}_MASTER_KEY` | master key in hex; makes `master.key` unnecessary |
| `NO_COLOR` | turns off colors in text output |

## Master key rotation

| Command or option | Effect |
| --- | --- |
| `credentials rotate-key` | Generates a random key, re-encrypts the vault and writes `master.key` with 0600. |
| `credentials rotate-key --from-env` | Reads the current key from `master.key` and uses `{{BIN}}_MASTER_KEY` as the new key. |

`{{bin}} credentials rotate-key` opens the vault with the current key and keeps
its values when re-encrypting. The `--from-env` option requires the current key on disk
and a new key of 64 hexadecimal characters in the variable. The new key
is also written to `master.key` with 0600. Without a vault or a current key, the command
returns exit code 4 (`CREDENTIALS`). In JSON, it returns `{ rotated, source }`,
without the key contents.

Without `--from-env`, if the previous key came from the variable, remove that variable
from the shell after the rotation: `unset {{BIN}}_MASTER_KEY`. It takes priority over
the file in later runs. Do not write to the vault during the
rotation. Both files are prepared before the replacement; common write
failures restore the previous key through atomic replacement. If that
restoration also fails, the recovery files stay in the
`.rotate-*` folder named in the error; the `previous.key` copy keeps permission 0600. Because there are two files, an
interruption of the process between the replacements requires recovery from backup.
