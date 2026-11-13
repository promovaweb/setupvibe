# Configuration and credentials

Everything `{{bin}}` persists lives in `~/.setupvibe/`. The folder is created
with 0700, and the data files are written with 0600. `setupvibe` and
`setupvibe-server` share the folder and the `SETUPVIBE_` prefix, because only
one of them is installed on a machine.

## Files in `~/.setupvibe/`

| Path | What it holds | Who writes it |
| --- | --- | --- |
| `settings.json` | preferences in plain text, keys in dot notation | `config set`, `config unset`, the TUI when you change language, theme, mouse or icons |
| `credentials.json` | AES-256-GCM envelope with the secrets | `credentials set`, `credentials remove`, `credentials clear`, `credentials rotate-key` |
| `master.key` | 32 bytes in hexadecimal, created on the first vault write | `credentials set` and `credentials rotate-key` |
| `config.json` | user, detected system, `init` record, Git identity, release channel, `network` and `migratedFromV1` | `init`, `auto`, `user create`, `migrate`; `self uninstall` deletes it |
| `selection.json` | chosen items, installed version and the status of the last check | `install`, `remove`, `update`, `auto`, `init` |
| `external.json` | apps installed through mise outside the inventory | `install --external`, `remove --external` |
| `last-run.json` | full result of the last `auto`, step by step | `auto` |
| `run.lock` | PID of the run that is changing the machine | `auto` |
| `logs/<date>-<command>.log` | one NDJSON event per line, with secrets masked | every command that runs a plan |
| `backups/` | copy of a user file before the first change and before each schema migration | `shell apply`, `migrate`, `readState` |
| `state/update-check.json` | six-hour cache of the version check | every run that announces a new version |
| `state/security.json` | state of UFW, fail2ban and the files before the security module | `security apply` |
| `shell/aliases.sh`, `shell/aliases-agents.sh`, `shell/tmux.conf` | files loaded by `~/.zshrc`, `~/.bashrc` and `~/.tmux.conf` | `shell apply` |
| `tmp/` | installer or script downloaded during the run | `installer` and `archive` methods |

SetupVibe 1 leftovers also show up in this folder and are not deleted without
confirmation: `bin/ssh_copy_id`, `portainer-compose.yml` and, on Windows,
`windows-utilities.json`. `{{bin}} migrate` handles the first two; `{{bin}}
doctor` lists all of them.

### `config.json`

The file is state, not preference. Use the commands; `channel` is the exception
and today only changes by editing the file.

| Field | Content |
| --- | --- |
| `schemaVersion` | format version; an older binary refuses a newer file and asks for `upgrade` |
| `user` | working user created or adopted |
| `edition` | edition that ran `init`: `desktop` or `server` |
| `system` | detected system (`ubuntu`, `debian`, `mint`, `zorin`, `arch`, `omarchy`, `macos`, `windows` or `wsl`) |
| `init` | `done`, `at` and the version that completed `init` |
| `git` | `name` and `email` used when the global Git identity was empty |
| `channel` | channel read by `upgrade` and by the version notice: `stable` or `beta` |
| `network` | fixed `caFile` and `cacheDir` of the machine, see [Network and cache](#network-and-cache) |
| `migratedFromV1` | date and source edition written by `migrate` |
| `shell` | legacy place of the `agentAliases` switch; `settings.json` is read first |
| `nopasswd` | `true` when `user create --nopasswd` created the sudo rule |

The `network` block avoids repeating options on every run. Write it to
`~/.setupvibe/config.json`; no command writes this field.

```json
{ "network": { "caFile": "/etc/ssl/certs/corp.pem", "cacheDir": "/srv/setupvibe-cache" } }
```

## `settings.json`

The schema comes from `SETTINGS_SCHEMA` in `shared/core/config/settings.ts`. A
key outside the schema is accepted as text, for derived projects.

| Key | Type | Default | Accepted values | Effect |
| --- | --- | --- | --- | --- |
| `output.format` | enum | `text` | `text`, `json` | default CLI output format when `--json` is not given |
| `output.colors` | boolean | `true` | `true`, `false` | ANSI colors in text output; `NO_COLOR` always disables them |
| `tui.initialTab` | enum | `overview` | `overview` (Home), `inventory`, `user`, `doctor`, `logs`, `tailscale`, `machine`, `about` | module opened when the TUI starts; `--tab` wins |
| `tui.language` | enum | `pt-BR` | `pt-BR`, `en` | TUI language; the `L` key and the `PT · EN` switch write it |
| `tui.icons` | boolean | `true` | `true`, `false` | Nerd Font icons; `false` switches to symbols every font has |
| `tui.mouse` | boolean | `true` | `true`, `false` | clicks on cards, items, buttons and keys, and the wheel to scroll |
| `tui.theme` | enum | `night` | `night`, `day` | TUI palette; the `T` key and the header icon switch it and write here |
| `shell.agentAliases` | boolean | `true` | `true`, `false` | writes `cco`, `cxo`, `oco`, `cx` and `oc`, which start the agents without prompts; run `{{bin}} shell apply` afterwards |
| `telemetry.enabled` | boolean | `false` | `true`, `false` | reserved for derived projects; the binary sends nothing |

For a boolean, `config set` accepts `true`/`false`, `yes`/`no`, `1`/`0` and
`on`/`off`. For an enum, only a value from the accepted column. For a number, a
finite number. Any other text returns exit code 3 (`CONFIG`).

### `config set` examples

```bash
{{bin}} config set output.format json                 # scripts that already read --json
{{bin}} config set tui.theme day                      # a terminal with a light background
{{bin}} config set tui.mouse false                    # keyboard only, no mouse
{{bin}} config set shell.agentAliases false           # no aliases that skip prompts
{{bin}} config set output.colors off                  # no ANSI in a pipe
```

The result is `✓ key = value`. A key outside the schema is stored as text and
the output says `(key outside the schema, stored as text)`.

### `config get` examples

```bash
{{bin}} config get tui.language                       # pt-BR
{{bin}} config get tui.initialTab --json              # {"key":"tui.initialTab","value":"overview"}
{{bin}} config get output.format                      # text, when it was never written
{{bin}} config get shell.agentAliases                 # true
{{bin}} config get editor.preferred                   # exit 3 when the key does not exist
```

`get` reads the file already merged with the defaults, so a value shows up
even when `settings.json` does not exist yet.

### `config unset` examples

```bash
{{bin}} config unset output.format                    # removes the stored json; the CLI returns to text
{{bin}} config unset tui.theme                        # removes the stored day; back to night
{{bin}} config unset telemetry.enabled                # removes the reserved key; back to the default false
{{bin}} config unset shell.agentAliases               # the aliases are on again
{{bin}} config unset editor.preferred                 # exit 0, reports that it was not stored
{{bin}} config unset editor.preferred --json          # {"key":"editor.preferred","removed":false}
```

`unset` removes only the key stored in the file. The key still exists with the
schema default.

### The other subcommands

| Subcommand | What it does | Output |
| --- | --- | --- |
| `config list` (alias `ls`) | lists every key with its effective value, file merged with defaults | file path and a `key value` table |
| `config path` | shows the data folder and the path of each file | `Directory`, `settings.json`, `credentials.json`, `master.key` |
| `config schema` | lists the known keys with type, default and description | table generated from `SETTINGS_SCHEMA` |
| `config export [file]` | writes the selection and Git identity as an answers file; prints it without a file | JSON with `schemaVersion`, `edition`, `user`, `git`, `profile` and `only` |
| `config import <file>` | installs the items and identity of an exported file | same result as `install`, plus the global Git identity |

```bash
{{bin}} config path
{{bin}} config schema --json
{{bin}} config export selection.json
{{bin}} config import selection.json --dry-run
{{bin}} config list
```

The answers file carries no secret. `profile` is written as `none`, which
`auto --config` reads as an empty base: only the items in the `only` list and
their requirements go in. The list is sorted, so the diff between two machines
stays readable. `config import` applies the same selection in place.

To give a new key a type, a default and a description, add it to
`SETTINGS_SCHEMA`. `config set`, `config get` and `config schema` know the key
with no other change.

The MCP server exposes `config_list` and `config_get` for reading; no tool
writes `settings.json`.

## `credentials.json`

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

| Subcommand | What it does |
| --- | --- |
| `credentials set <name>` | stores a value; without `--stdin`, types it without echo |
| `credentials get <name>` | shows the value masked; `--reveal` prints it in clear |
| `credentials list` | lists the names, without values |
| `credentials remove <name>` | deletes one name |
| `credentials status` | shows where the key comes from and how many names exist |
| `credentials clear --yes` | deletes the whole vault |
| `credentials rotate-key` | generates a new key, re-encrypts the vault and writes `master.key` |

```bash
{{bin}} credentials set openai.api_key                # asks for the value without echo
printf '%s' "$TOKEN" | {{bin}} credentials set github.token --stdin
{{bin}} credentials get github.token                  # abc1******et
{{bin}} credentials get openai.api_key --reveal       # the clear value, for a script
{{bin}} credentials status --json                     # file, masterKeySource, count and names
{{bin}} credentials remove github.token
{{bin}} credentials clear --yes
```

The MCP tool `credentials_status` shows the file, the key source and the names,
without values. A missing name, an unreadable vault or a missing key returns exit code 4
(`CREDENTIALS`). A permission failure on the file returns 7 (`PERMISSION`), and
a prompt cancelled with Ctrl+C returns 130 (`INTERRUPTED`). On a new machine,
`credentials status` answers `(not created)` and `Credentials 0` without
creating a file; the vault is born on the first write.

## What the encryption protects

The encryption protects the file against casual reading, copies in backups and
disk scans by other tools. Anyone with access to the same system account can
read `master.key` and decrypt the content. For a higher level, inject the key
through `{{BIN}}_MASTER_KEY` from a secrets manager and do not write
`master.key` to disk.

## Master key rotation

| Command or option | Effect |
| --- | --- |
| `credentials rotate-key` | generates a random key, re-encrypts the vault and writes `master.key` with 0600 |
| `credentials rotate-key --from-env` | reads the current key from `master.key` and uses `{{BIN}}_MASTER_KEY` as the new key |

`credentials rotate-key` opens the vault with the current key and keeps the
values when re-encrypting. The `--from-env` option requires the current key on
disk and a new key of 64 hexadecimal characters in the variable. The new key is
also written to `master.key` with 0600. Without a vault or a current key, the
command returns exit code 4. In JSON, it returns `{ rotated, source }`, without
the key contents.

Without `--from-env`, if the previous key came from the variable, remove that
variable from the shell after the rotation: `unset {{BIN}}_MASTER_KEY`. It takes
priority over the file in later runs. Do not write to the vault during the
rotation. Both files are prepared in the `.rotate-*` folder before the
replacement; common write failures restore the previous key through atomic
replacement. If that restoration also fails, the recovery files stay in the
`.rotate-*` folder named in the error, and the `previous.key` copy keeps
permission 0600. A process interruption between the two replacements also
requires restoring from that copy.

## Using a credential in code

```ts
import { getCredential } from "../config/credentials.ts";

const token = getCredential("github.token"); // throws AppError(4) when missing
```

Never write the value to a log, an error, the `data` of `--json` or an MCP tool
response.

## Environment variables

### Data, language and interface

| Variable | Effect |
| --- | --- |
| `SETUPVIBE_HOME` | replaces `~/.setupvibe/` with another folder, state files included |
| `SETUPVIBE_LANG` | pins the language to `pt-BR` or `en`; applies to the TUI and to `--skill` |
| `SETUPVIBE_ICONS` | `0` replaces the TUI Nerd Font icons with plain symbols |
| `NO_COLOR` | any non-empty value turns off colors in text output |
| `LANG`, `LC_ALL`, `LC_MESSAGES` | choose the documentation language when `SETUPVIBE_LANG` is not set |
| `LC_CTYPE`, `LANG` | `init` and `auto` warn when the locale is not UTF-8 |

### Network and cache

| Variable | Effect |
| --- | --- |
| `HTTPS_PROXY`, `HTTP_PROXY`, `NO_PROXY`, `ALL_PROXY` | proxy read in upper and lower case, including by commands that run with `sudo` |
| `SETUPVIBE_CA_FILE` | corporate CA bundle; the binary exports it to `NODE_EXTRA_CA_CERTS`, `SSL_CERT_FILE`, `CURL_CA_BUNDLE`, `REQUESTS_CA_BUNDLE`, `GIT_SSL_CAINFO` and `PIP_CERT` |
| `SETUPVIBE_CACHE_DIR` | single download folder; the binary exports `MISE_CACHE_DIR`, `npm_config_cache`, `UV_CACHE_DIR` and `HOMEBREW_CACHE` |
| `SETUPVIBE_VERBOSE` | `1` shows the full output of every command, like `--verbose` |
| `NODE_EXTRA_CA_CERTS` | set by the binary from `SETUPVIBE_CA_FILE`; you do not fill it |
| `MISE_CACHE_DIR`, `npm_config_cache`, `UV_CACHE_DIR`, `HOMEBREW_CACHE` | set by the binary from `SETUPVIBE_CACHE_DIR` |

### `auto` answers

| Variable | Answer |
| --- | --- |
| `SETUPVIBE_USER` | working user |
| `SETUPVIBE_SSH_KEY` | public key or a file with it |
| `SETUPVIBE_GIT_NAME`, `SETUPVIBE_GIT_EMAIL` | Git identity |
| `SETUPVIBE_PROFILE` | inventory profile |
| `SETUPVIBE_ONLY`, `SETUPVIBE_EXCLUDE` | items to add or leave out, comma-separated |
| `SETUPVIBE_TIMEZONE` | time zone |
| `SETUPVIBE_REBOOT` | `1` restarts and resumes `auto` |
| `SETUPVIBE_KEEP_NOPASSWD` | `1` keeps the sudo rule created by `auto` |
| `SETUPVIBE_PM2_AUTOSTART` | `1` starts PM2 and its saved apps at boot |
| `SETUPVIBE_TAILSCALE_SSH` | `1` turns on Tailscale SSH after joining the tailnet |
| `TAILSCALE_AUTHKEY` | Tailscale auth key |
| `GH_TOKEN`, `GITHUB_TOKEN` | token inherited by the tools that read it, such as mise; the log masks it |

An answer applies when the matching option was not passed. Secrets never reach
`argv`: the Tailscale and Swarm tokens arrive at the command through the
environment and the log replaces the value with `***`.

### Swarm answers

| Variable | Answer |
| --- | --- |
| `SETUPVIBE_SWARM_MANAGER` | `1` initializes Docker Swarm as manager |
| `SETUPVIBE_SWARM_TOKEN` | token to join an existing Swarm |
| `SETUPVIBE_SWARM_ADVERTISE_ADDR` | address announced by the node, or the manager address with `--join` |
| `SETUPVIBE_SWARM_ENCRYPTED` | `1` encrypts the overlay network traffic |

### Internal and system variables

| Variable | Who reads it |
| --- | --- |
| `SETUPVIBE_AUTO_CREATED_NOPASSWD` | the second `auto` process, started with `runuser`, to know that the sudo rule is temporary |
| `SSHPASS` | `ssh copy-id` uses it as the remote password when `--password-stdin` is not passed |
| `HOME`, `USERPROFILE` | user folder on Unix and Windows |
| `USER`, `LOGNAME`, `USERNAME` | user name when `id -un` does not answer |
| `SHELL`, `ComSpec` | shell shown in the Machine module |
| `PATH`, `Path` | command lookup; `doctor` and the TUI use it to find `~/.local/bin` |
| `LOCALAPPDATA` | mise folder on Windows |
| `ProgramData`, `PROGRAMDATA` | `desktop.ps1` state that `migrate` recognizes on Windows |
| `WSL_DISTRO_NAME`, `WSL_INTEROP` | WSL detection |
| `DEBIAN_FRONTEND`, `NEEDRESTART_MODE`, `NONINTERACTIVE`, `CI` | set by the binary for every command in the plan, so installers do not open a prompt |

## Network and cache

Proxy, corporate CA and cache apply to every download and to every command the
plan runs. The order is the option, then the variable, then the `network` block
of `config.json`.

```bash
{{bin}} auto --ca-file /etc/ssl/certs/corp.pem --cache-dir /srv/setupvibe-cache
{{bin}} install node --verbose
{{bin}} update --ca-file /etc/ssl/certs/corp.pem
```

With a warm cache, a download pinned in the inventory installs without network.
`--verbose` shows every `argv` and the full output, without masking what the
command itself prints. To investigate a network failure, start with `doctor`: it
runs the runtime checks and shows what is missing.
