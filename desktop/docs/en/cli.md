# CLI

The `{{bin}}` binary ships a TUI, a CLI and an MCP server in the same executable. This
manual covers the CLI: conventions, global options, the output format and
every command with arguments, options, effects, permissions, refusals and
examples. The generated reference that follows `--skill cli` repeats the same
command tree in a shorter form.

## Conventions

- `{{bin}} <command> [subcommand] [arguments] [options]`.
- Options accept `--key value` and `--key=value`. Short flags cannot be
  grouped (`-abc`).
- `--` ends option parsing; whatever comes after it is an argument. Use `--`
  before arguments that `skills` or another program must receive.
- Global options are valid in any position, before or after the command.
- With no arguments, in an interactive terminal, the binary opens the TUI.
  Without a TTY, it prints the help and exits with exit code 2.
- All data output goes to stdout. Warnings, progress and errors in text mode
  go to stderr.
- Names of commands, subcommands, options, arguments, keys and output fields
  are in English. So are the binary's messages.
- Commands that install or remove items, create users, apply security, write the
  shell configuration, migrate the machine or configure agents accept
  `--dry-run`. The plan shows each step and each command without running
  anything.
- A credential value never comes in through an argument: `credentials set`
  reads it from stdin or the terminal. `auto` tokens have options for
  compatibility, but the recommended form is the environment variable, which
  the run log masks.

## Global options

| Option | Effect |
| --- | --- |
| `-h`, `--help` | Help for the current command. Exit code 0. |
| `-V`, `--version` | Prints `{{bin}} <version>`. Exit code 0. |
| `--json` | JSON output with a stable envelope. Errors are also printed as JSON, to stdout. |
| `--skill [topic]` | Embedded documentation. Topics: `cli`, `tui`, `mcp`, `config`, `exit-codes`, `troubleshooting`, `migration`, `inventory`, `reference`. |
| `--opencli` | OpenCLI 0.1 description of the command tree in JSON. |
| `--no-color` | Turns off ANSI colors. `NO_COLOR=1` has the same effect. |

The `docs` command accepts the same topics as `--skill` plus `inventory`, and
has `--lang` to choose the language.

## Text and JSON output

Text is the default when `output.format` in settings.json is `text`. With
`--json`, or with `output.format = json`, the output follows this envelope:

```json
{
  "ok": true,
  "command": "{{bin}} config get",
  "data": { "key": "tui.theme", "value": "night" }
}
```

On error:

```json
{
  "ok": false,
  "command": "{{bin}} credentials get",
  "error": {
    "code": 4,
    "name": "CREDENTIALS",
    "message": "Credential \"x\" not found.",
    "details": { "name": "x" }
  }
}
```

The process exit code is always the same as `error.code`. Read both: the
envelope for the message, the code for the failure class. The full table is in
[exit-codes.md](exit-codes.md).

`auto --json` adds one JSON line per run log event before the final envelope.
Consumers of that command read the last line with `ok` as the result and
treat the earlier ones as progress.

## How to read the command sections

Every command presents the same information in the same order: purpose,
syntax, arguments and options table, text output and the `data` of the
`--json` envelope, persistent effects, permissions, refusals with exit codes,
limits and five examples. The table uses `-` for what does not apply and
`flag` for an option without a value.

Commands that only group subcommands (`config`, `credentials`, `shell`,
`self`, `ssh`, `user` and `security`) print the help and exit with 0
when called without a subcommand. Their sections show the group purpose and
examples that combine the subcommands.

## Commands

### `{{bin}} tui`

Opens the terminal interface on the Home, with one card per module: Inventory,
User, Doctor, Logs, Tailscale, Machine and About.

#### Syntax

```bash
{{bin}} tui [--tab <tab>]
```

#### Arguments and options

| Name | Type | Required | Default | Accepted values |
| --- | --- | --- | --- | --- |
| `--tab` | enum | no | `tui.initialTab`, or `overview` | `overview`, `inventory`, `user`, `doctor`, `logs`, `tailscale`, `machine`, `about` |

#### Output

Text: the interface. Nothing is printed on close. With `--json`,
the final envelope carries `data = { "closed": true }`.

#### Persistent effects

Opening creates no file. The modules can write
`settings.json` and the state files when you change a preference or run an
action there.

#### Permissions

Requires a TTY on stdin and stdout. No sudo or root.

#### Refusals and exit codes

Without a TTY: `NO_TTY` (8), with the hint to use
`--help`.

#### Limits

It is the same mode opened by `{{bin}}` with no arguments. `--tab`
overrides the preference for this run only.

#### Examples

```bash
{{bin}} tui   # opens the module set in tui.initialTab
```

```bash
{{bin}} tui --tab inventory   # starts on the Inventory module with the item and pinned version list
```

```bash
{{bin}} tui --tab machine   # starts on the Machine module with CPU, memory, disks and network
```

```bash
{{bin}} tui --tab doctor   # starts on the Doctor module with the machine diagnostics
```

```bash
{{bin}} tui --tab about   # starts on the About module with version, runtime and credits
```

### `{{bin}} system`

Shows the detected system, the machine variant, the update status and the
SetupVibe 1 leftovers.

#### Syntax

```bash
{{bin}} system [--no-update-check] [--json]
```

#### Arguments and options

| Name | Type | Required | Default | Accepted values |
| --- | --- | --- | --- | --- |
| `--no-update-check` | flag | no | absent | present or absent |

#### Output

Text: the `System` and `Update` tables. `data` carries `edition`,
`system`, `id`, `name`, `version`, `arch`, `wsl`, `headless`, `publicIp`,
`variant`, `distro` when present, `unsupportedReason` when present, `update` when
the check runs and `setupvibe1`. `update` carries `current`, `latest`, `minimum`, `changelog`,
`updateAvailable`, `updateRequired`, `checkedAt` and `source` (`network`,
`cache` or `offline`).

#### Persistent effects

The update check writes its six-hour cache to
`~/.setupvibe/state/update-check.json`. Nothing else changes.

#### Permissions

None. It may run as root.

#### Refusals and exit codes

Unsupported system: `UNSUPPORTED_SYSTEM` (11),
with the reason in the text and in `unsupportedReason`.

#### Limits

The network check has a short timeout and never interrupts the
command. Offline, `source` is `offline` and `latest` is absent.

#### Examples

```bash
{{bin}} system   # quick read of the system, the variant and the update status
```

```bash
{{bin}} system --no-update-check   # offline machine: skips the network check
```

```bash
{{bin}} system --json   # full data for an agent or script
```

```bash
{{bin}} system | grep SetupVibe   # checks for SetupVibe 1 leftovers
```

```bash
{{bin}} system --json | jq '.data.update.updateAvailable'   # only the update status
```

### `{{bin}} init`

Checks the requirements and installs the prerequisites: build dependencies
and mise. It also records the init and the first selection.

#### Syntax

```bash
{{bin}} init [--dry-run] [--verbose] [--cache-dir <dir>] [--ca-file <file>]
```

#### Arguments and options

| Name | Type | Required | Default | Accepted values |
| --- | --- | --- | --- | --- |
| `--dry-run` | flag | no | absent | present or absent |
| `--verbose` | flag | no | absent | present or absent |
| `--cache-dir` | path | no | `SETUPVIBE_CACHE_DIR`, then `config.json` | existing or created folder |
| `--ca-file` | path | no | `SETUPVIBE_CA_FILE`, then `config.json` | PEM file |

#### Output

Text: the requirements with ✓, ! or ✗ and the plan that ran.
`data` carries `system` and `checks`; in the plan, `dryRun` and `steps`; in the
run, `log` and `results`. Each result has `id`, `status`, `durationMs` and `message`
when present.

#### Persistent effects

Installs the `initOnly` items and mise. Writes
`config.json` with `edition`, `system`, `init` and, in a terminal, the Git
identity. Creates `selection.json`, when there is no selection yet, with the items that
already pass their check, marked `adopted`. Creates `~/.setupvibe/` with mode 0700 and a run log
in `logs/`.

#### Permissions

Refuses root. Uses sudo for system packages. It does not
require a TTY, but asks for the Git name and e-mail only when a terminal is
present.

#### Refusals and exit codes

Root: `ROOT` (12). Unsupported system:
`UNSUPPORTED_SYSTEM` (11). Less than 10 GB free on desktop or 5 GB on server:
`DISK_SPACE` (14). Network, locale or clock failure: `NETWORK_OR_API` (5). A
step failed: `PARTIAL` (10). sudo asks for a password without a terminal:
`SUDO_PASSWORD` (13).

#### Limits

After init, `install`, `update` and the TUI actions that install
items work. Run init again when `doctor` reports a new prerequisite. The
hidden `--skip-network-check` option exists for tests, does not appear in
`--help` and does not replace a working network in real use.

#### Examples

```bash
{{bin}} init --dry-run   # shows requirements and commands without installing
```

```bash
{{bin}} init   # installs build dependencies and mise and records the init
```

```bash
{{bin}} init --json   # full result for a provisioning log
```

```bash
{{bin}} init --ca-file /etc/ssl/corp/ca.pem   # corporate network with its own CA
```

```bash
{{bin}} init --cache-dir /var/cache/setupvibe   # reuses downloads across runs
```

### `{{bin}} auto`

Installs everything without asking, for headless machines, provisioning and
agents. Answers come from options, `SETUPVIBE_*` variables or a `--config`
file.

#### Syntax

```bash
{{bin}} auto [options]
```

#### Arguments and options

| Name | Type | Required | Default | Accepted values |
| --- | --- | --- | --- | --- |
| `--user` | text | as root, yes | `SETUPVIBE_USER` | user name |
| `--ssh-key` | text or path | no | `SETUPVIBE_SSH_KEY` | public key or file |
| `--git-name` | text | no | `SETUPVIBE_GIT_NAME` | free text |
| `--git-email` | text | no | `SETUPVIBE_GIT_EMAIL` | e-mail |
| `--profile` | text | no | whole inventory | inventory profile name, or `none` |
| `--only` | text | no | `SETUPVIBE_ONLY` | comma-separated ids |
| `--exclude` | text | no | `SETUPVIBE_EXCLUDE` | comma-separated ids |
| `--tailscale-authkey` | text | no | `TAILSCALE_AUTHKEY` | Tailscale auth key |
| `--manager` | flag | no | `SETUPVIBE_SWARM_MANAGER=1` | server: starts Swarm as manager |
| `--join` | text | no | `SETUPVIBE_SWARM_TOKEN` | server: Swarm join token |
| `--advertise-addr` | text | no | `SETUPVIBE_SWARM_ADVERTISE_ADDR` | address, such as `10.0.0.1:2377` |
| `--timezone` | text | no | `SETUPVIBE_TIMEZONE` | IANA zone, such as `America/Sao_Paulo` |
| `--reboot` | flag | no | `SETUPVIBE_REBOOT=1` | present or absent |
| `--keep-nopasswd` | flag | no | `SETUPVIBE_KEEP_NOPASSWD=1` | present or absent |
| `--encrypted-network` | flag | no | `SETUPVIBE_SWARM_ENCRYPTED=1` | server: encrypted overlay network |
| `--pm2-autostart` | flag | no | `SETUPVIBE_PM2_AUTOSTART=1` | present or absent |
| `--tailscale-ssh` | flag | no | `SETUPVIBE_TAILSCALE_SSH=1` | present or absent |
| `--config` | path | no | - | file in the `config export` format |
| `--plan` | path | no | - | JSON output file for the plan |
| `--dry-run` | flag | no | absent | present or absent |
| `--verbose` | flag | no | absent | present or absent |
| `--cache-dir` | path | no | `SETUPVIBE_CACHE_DIR` | cache folder |
| `--ca-file` | path | no | `SETUPVIBE_CA_FILE` | PEM file |

Each answer follows the precedence option, environment variable, `--config`
file. Tokens come only from environment variables.

#### Output

Text: each step with ✓, - or ✗, the summary, the skipped parts and
the log path. `data` in the plan carries `dryRun`, `system`, `items`,
`skipped`, `security` and `steps`. During the run it carries `version`,
`finishedAt`, `log`, `system`, `items`, `skipped`, `security`, `results` and
`checks`. With `--json`, each run log event goes out as one JSON line before
the envelope.

#### Persistent effects

Installs items and prerequisites, configures the
shell, prompt and tmux, applies the security module when it fits, configures
Git, Tailscale and Swarm, writes `selection.json`, `last-run.json`,
`config.json`, `~/.config/mise/mise.lock` and the logs, and creates or removes
the passwordless sudo rule. With `--reboot`, it schedules the resume in a
systemd unit or a Windows task.

#### Permissions

As root, it requires `--user`: it creates the user and
continues as that user. As a regular user, it requires passwordless sudo. It
never asks for confirmation and works without a TTY. On Windows it requires
an elevated PowerShell.

#### Refusals and exit codes

Root without `--user`: `ROOT` (12). sudo asks for
a password: `SUDO_PASSWORD` (13). Unsupported system:
`UNSUPPORTED_SYSTEM` (11). Not enough disk: `DISK_SPACE` (14). Network or
clock outside the expected range: `NETWORK_OR_API` (5). Items failed:
`PARTIAL` (10). Restart pending: `REBOOT_PENDING` (20). Another run holds the
lock: `LOCKED` (30). Invalid `--config` file: `USAGE` (2).

#### Limits

A failed step does not stop the following ones; the closing text
lists what failed and what was skipped, security parts included. GUI items are
left out on headless machines. `--plan` writes the plan and exits without
changing anything. `--only` and `--exclude` do not replace dependencies: they
come in even when not named. In the `--config` file, `profile: "none"`, the
value written by `config export`, means an empty base: the `only` items and
their requirements come in. Without the `profile` field, the whole inventory
comes in.

#### Examples

```bash
{{bin}} auto --dry-run   # full plan without changing the machine
```

```bash
{{bin}} auto --user deploy --ssh-key "ssh-ed25519 AAAA..."   # as root, creates the user and continues as it
```

```bash
{{bin}} auto --profile essencial --exclude docker --json   # inventory slice with machine-readable output
```

```bash
{{bin}} auto --config setupvibe.json --reboot   # repeats another machine selection and resumes after a restart
```

```bash
{{bin}} auto --plan /tmp/plan.json   # writes the plan as JSON and exits without changes
```

### `{{bin}} list`

Shows the inventory with the status of each item on this machine.

#### Syntax

```bash
{{bin}} list [--category <id>] [--check] [--json]
```

#### Arguments and options

| Name | Type | Required | Default | Accepted values |
| --- | --- | --- | --- | --- |
| `--category` | text | no | all | inventory category id |
| `--check` | flag | no | absent | present or absent |

#### Output

Text: one section per category, with a marker, id, version and
status. `data` carries `system` and `items`, and each item carries `id`,
`name`, `category`, `version`, `default`, `status`, `elsewhere` when the copy
came from another manager and `check` with `--check`.

#### Persistent effects

None. `--check` runs the verify commands of the
selected items, without installing or removing.

#### Permissions

None. It does not require init.

#### Refusals and exit codes

Unsupported system: `UNSUPPORTED_SYSTEM` (11).

#### Limits

The `other` status means a copy outside the mise folders; the path
appears next to it. `gui` marks a graphical item skipped on a headless
machine. `--check` verifies only items already selected.

#### Examples

```bash
{{bin}} list   # the whole inventory with each item status
```

```bash
{{bin}} list --category ai   # only the AI tools category
```

```bash
{{bin}} list --check   # status plus the check of the selected items
```

```bash
{{bin}} list --json   # full data for a panel or agent
```

```bash
{{bin}} list | grep outdated   # items whose pinned version changed
```

### `{{bin}} install`

Installs inventory items and their dependencies, or an app outside the
inventory with `--external`.

#### Syntax

```bash
{{bin}} install <items>... [options]
{{bin}} install --external <tool[@version]> [options]
```

#### Arguments and options

| Name | Type | Required | Default | Accepted values |
| --- | --- | --- | --- | --- |
| `items` | text, variadic | yes | - | inventory ids, or one tool with `--external` |
| `--external` | flag | no | absent | present or absent |
| `--force` | flag | no | absent | reinstalls what already passes its check |
| `--dry-run` | flag | no | absent | present or absent |
| `--verbose` | flag | no | absent | present or absent |
| `--cache-dir` | path | no | `SETUPVIBE_CACHE_DIR` | cache folder |
| `--ca-file` | path | no | `SETUPVIBE_CA_FILE` | PEM file |

#### Output

Text: each step and, in the run, the log path. `data` carries `dryRun`, `items` and `skipped` in the plan; `log` and `results`
in the run, with `checks` when a check fails. With
`--external`, it carries `tool` and `version`.

#### Persistent effects

Installs through the inventory method (APT, pacman,
Homebrew, mise, Git, verified archive, official installer, Composer or gem).
Updates `selection.json` with the version and status. With `--external`, it
writes the app to `external.json` and pins the resolved version.

#### Permissions

Uses sudo when the method requires it. Requires a completed
init. Does not require a TTY.

#### Refusals and exit codes

Without init: `CONFIG` (3). Unknown item or
`--external` with more than one tool: `USAGE` (2). Tool unknown to mise:
`NOT_FOUND` (6). Unsupported system: `UNSUPPORTED_SYSTEM` (11). A step or a
check failed: `PARTIAL` (10). sudo asks for a password: `SUDO_PASSWORD` (13).

#### Limits

An item that already passes its check is skipped unless `--force`.
Dependencies come in even when not named. A copy installed by another manager
is preserved and the warning shows its path. `--external` accepts one tool per
run.

#### Examples

```bash
{{bin}} install docker   # installs Docker and its dependencies
```

```bash
{{bin}} install go rust --dry-run   # shows the steps without installing
```

```bash
{{bin}} install --external terraform@1.13.4   # pins a tool outside the inventory
```

```bash
{{bin}} install docker --force   # reinstalls even when the current check passes
```

```bash
{{bin}} install node --cache-dir /var/cache/setupvibe --json   # reuses downloads and returns JSON
```

### `{{bin}} remove`

Removes inventory items, or an app installed with `install --external`.

#### Syntax

```bash
{{bin}} remove <items>... [options]
{{bin}} remove --external <tool> [options]
```

#### Arguments and options

| Name | Type | Required | Default | Accepted values |
| --- | --- | --- | --- | --- |
| `items` | text, variadic | yes | - | inventory ids, or one tool with `--external` |
| `--external` | flag | no | absent | present or absent |
| `--include-native` | flag | no | absent | removes packages from the system package manager |
| `--force` | flag | no | absent | removes a dependent or adopted item |
| `--yes` | flag | no | absent | skips the confirmation (`-y`) |
| `--dry-run` | flag | no | absent | present or absent |

#### Output

Text: each step and the refused items with the reason. `data`
carries `dryRun` and `refused` in the plan; `log` and `results` in the run.

#### Persistent effects

Removes what was installed in the user space and
updates `selection.json`. With `--external`, it removes the entry from
`external.json`. Native packages leave only with `--include-native`.

#### Permissions

Uses sudo for system packages. Asks for confirmation in a
terminal; without one, it requires `--yes`.

#### Refusals and exit codes

Without `--yes` and without a terminal: `USAGE`
(2). Negative answer or Ctrl+C: `INTERRUPTED` (130). Unknown item or a
selected dependent without `--force`: `USAGE` (2). Unknown external tool:
`NOT_FOUND` (6). A step failed: `PARTIAL` (10). Unsupported system:
`UNSUPPORTED_SYSTEM` (11).

#### Limits

An item adopted by init stays on the machine unless `--force`. An
item required by another selected item does not leave without `--force`. An
item installed by init or shipped by the system is not removed; the reason
appears in the text. `--dry-run` shows the plan and skips the confirmation.

#### Examples

```bash
{{bin}} remove go --yes   # removes the Go installed by SetupVibe
```

```bash
{{bin}} remove docker --include-native --dry-run   # shows what would leave, including the system package
```

```bash
{{bin}} remove --external terraform --yes   # removes an app installed with install --external
```

```bash
{{bin}} remove node --force --yes   # removes even with another item depending on it
```

```bash
{{bin}} remove go rust --yes --json   # removes two items and returns JSON
```

### `{{bin}} update`

Updates the selected items whose pinned version changed in this SetupVibe
inventory.

#### Syntax

```bash
{{bin}} update [--dry-run] [--verbose] [--cache-dir <dir>] [--ca-file <file>]
```

#### Arguments and options

| Name | Type | Required | Default | Accepted values |
| --- | --- | --- | --- | --- |
| `--dry-run` | flag | no | absent | present or absent |
| `--verbose` | flag | no | absent | present or absent |
| `--cache-dir` | path | no | `SETUPVIBE_CACHE_DIR` | cache folder |
| `--ca-file` | path | no | `SETUPVIBE_CA_FILE` | PEM file |

#### Output

Text: each item that changes, from which version to which, and the
steps. `data` carries `outdated`, with `id`, `from` and `to`, and, in the run, `log` and
`results`, with `checks` when a check fails.

#### Persistent effects

Reinstalls the outdated items and updates
`selection.json`. Writes a run log.

#### Permissions

Requires a completed init. Uses sudo when the method
requires it.

#### Refusals and exit codes

Without init: `CONFIG` (3). Unsupported system:
`UNSUPPORTED_SYSTEM` (11). A step or check failed: `PARTIAL` (10). sudo asks
for a password: `SUDO_PASSWORD` (13).

#### Limits

It does not query new versions on the internet: it compares the
selection with the inventory embedded in the binary. To update the binary, use
`upgrade`. Apps outside the inventory do not enter `update`.

#### Examples

```bash
{{bin}} update --dry-run   # shows which items would change version
```

```bash
{{bin}} update   # reinstalls the items whose pinned version changed
```

```bash
{{bin}} update --json   # lists from and to plus the result of each step
```

```bash
{{bin}} update --cache-dir /var/cache/setupvibe   # reuses downloads
```

```bash
{{bin}} update --dry-run | grep '↑'   # only the items that would be replaced
```

### `{{bin}} check`

Verifies that the selected items are installed with the pinned versions.

#### Syntax

```bash
{{bin}} check [items]... [--json]
```

#### Arguments and options

| Name | Type | Required | Default | Accepted values |
| --- | --- | --- | --- | --- |
| `items` | text, variadic | no | `selection.json`, or the `essencial` profile | inventory ids |

#### Output

Text: one line per item, with ✓ or ✗, the check output and the
expected version. `data` carries `system` and `results`, and each result
carries `id`, `status`, `output` and `expected`.

#### Persistent effects

None. It only runs the verify commands.

#### Permissions

None beyond what the item itself requires.

#### Refusals and exit codes

Unknown item: `USAGE` (2). Item missing or on the
wrong version: `PARTIAL` (10). Unsupported system: `UNSUPPORTED_SYSTEM` (11).

#### Limits

Without arguments it uses the selection; without a selection it
uses the `essencial` profile. `initOnly` items, security module items and
items not installable on the system are left out.

#### Examples

```bash
{{bin}} check   # verifies the current selection
```

```bash
{{bin}} check node php --json   # verifies two items and returns JSON
```

```bash
{{bin}} check docker   # checks Docker and its pinned version only
```

```bash
{{bin}} check --json | jq '.data.results[] | select(.status=="fail")'   # only what failed
```

```bash
{{bin}} check node || echo "run: {{bin}} install node"   # handles the failure in a script
```

### `{{bin}} shell`

Groups the terminal environment configuration. `apply` writes the blocks and
`remove` takes the SetupVibe blocks out.

#### Syntax

```bash
{{bin}} shell <apply|remove> [--dry-run]
```

#### Arguments and options

| Name | Type | Required | Default | Accepted values |
| --- | --- | --- | --- | --- |
| (none) | - | - | - | - |

Without a subcommand, it prints the help and exits with 0; with `--json`, the help comes in `data.help`.

#### Output

Depends on the subcommand. See `shell apply` and `shell remove`.

#### Persistent effects

Changes `~/.zshrc`, `~/.bashrc` on Omarchy and
`~/.tmux.conf`, plus the files in `~/.setupvibe/shell/`.

#### Permissions

The login shell change uses sudo when needed.

#### Refusals and exit codes

Invalid subcommand: `USAGE` (2). A step failed:
`PARTIAL` (10).

#### Limits

Content outside the markers is not changed. A copy of the original
file goes to `~/.setupvibe/backups/` before the first change.

#### Examples

```bash
{{bin}} shell apply --dry-run   # shows the files and blocks that would be written
```

```bash
{{bin}} shell apply   # writes the block, aliases, preset and tmux settings
```

```bash
{{bin}} shell remove   # removes only the SetupVibe blocks
```

```bash
{{bin}} shell apply --json   # plan and result in JSON
```

```bash
{{bin}} shell remove --dry-run   # checks what would leave before removing
```

### `{{bin}} shell apply`

Writes the SetupVibe block into the shell, the aliases, the Starship preset
and the tmux settings. It also converts SetupVibe 1 files when it finds them.

#### Syntax

```bash
{{bin}} shell apply [--dry-run]
```

#### Arguments and options

| Name | Type | Required | Default | Accepted values |
| --- | --- | --- | --- | --- |
| `--dry-run` | flag | no | absent | present or absent |

#### Output

Text: each step with the result and the log path. `data` carries
`dryRun` and `steps` in the plan; `log` and `results` in the run.

#### Persistent effects

Writes the block between `# >>> setupvibe >>>` and
`# <<< setupvibe <<<`, the aliases in `~/.setupvibe/shell/aliases.sh` and
`aliases-agents.sh`, the `gruvbox-rainbow` preset when no Starship
configuration exists, `~/.setupvibe/shell/tmux.conf` and the empty `.local`
files. Backs up the files before the first change. On Linux, it changes the
login shell to ZSH with `chsh`.

#### Permissions

Uses sudo for `chsh` when needed. Does not require a TTY.

#### Refusals and exit codes

Unsupported system: `UNSUPPORTED_SYSTEM` (11). A
step failed: `PARTIAL` (10). sudo asks for a password: `SUDO_PASSWORD` (13).

#### Limits

The block is replaced as a whole on every run. Your lines go to
`~/.zshrc.local`, `~/.bashrc.local` and `~/.tmux.conf.local`, which are never
overwritten. An alias that collides with an existing program, function or
alias is skipped; `doctor` lists the skipped ones. On Omarchy, the system
files stay untouched.

#### Examples

```bash
{{bin}} shell apply --dry-run   # plan of the blocks and files
```

```bash
{{bin}} shell apply   # applies the environment and aliases
```

```bash
{{bin}} config set shell.agentAliases false && {{bin}} shell apply   # leaves the agent aliases out
```

```bash
{{bin}} shell apply --json   # result in JSON for an agent
```

```bash
{{bin}} shell apply && exec $SHELL -l   # applies and reloads the shell in this session
```

### `{{bin}} shell remove`

Removes the SetupVibe blocks from `~/.zshrc`, `~/.bashrc` and `~/.tmux.conf`,
keeping the rest of the files.

#### Syntax

```bash
{{bin}} shell remove [--dry-run]
```

#### Arguments and options

| Name | Type | Required | Default | Accepted values |
| --- | --- | --- | --- | --- |
| `--dry-run` | flag | no | absent | present or absent |

#### Output

Text: each step and, in the run, the log path. `data` carries `dryRun` and `steps` in the plan; `log` and `results` in the run.

#### Persistent effects

Deletes only the content between the markers. The
`.local` files, the backups and the installed items stay.

#### Permissions

None beyond writing to the files in your home.

#### Refusals and exit codes

A step failed: `PARTIAL` (10).

#### Limits

It does not uninstall packages, delete `~/.setupvibe/` or undo the
login shell change. For that, use `self uninstall`.

#### Examples

```bash
{{bin}} shell remove --dry-run   # shows what would leave the files
```

```bash
{{bin}} shell remove   # removes the blocks and keeps the rest
```

```bash
{{bin}} shell remove && exec $SHELL -l   # removes the blocks and reloads the shell
```

```bash
{{bin}} shell remove --json   # result in JSON
```

```bash
{{bin}} shell remove && {{bin}} shell apply   # rewrites the block from scratch
```

### `{{bin}} migrate`

Moves a machine set up by SetupVibe 1 to SetupVibe 2, preserving the settings.

#### Syntax

```bash
{{bin}} migrate [--dry-run] [--remove-legacy <items>]
```

#### Arguments and options

| Name | Type | Required | Default | Accepted values |
| --- | --- | --- | --- | --- |
| `--dry-run` | flag | no | absent | present or absent |
| `--remove-legacy` | text | no | - | `go`, `rbenv`, `npm-global`, `nodesource` or `all` |

#### Output

Text: the plan, the lines that move between files and the kept
duplicates. `data` carries `v1`, `moved`, `removeLegacy` and `keptLegacy`; in the plan,
`dryRun` and `steps`; in the run, `log` and `results`; `linuxbrewUninstall`
appears when Linuxbrew is present.

#### Persistent effects

Backs up the old `.zshrc` and `.tmux.conf`, moves the
personal lines to the `.local` files, writes the SetupVibe 2 blocks, keeps
`ssh_copy_id` as a shortcut, records `migratedFromV1` in `config.json` and
adopts the installed items in `selection.json`. Removes the confirmed
duplicates.

#### Permissions

In a terminal, it asks once per duplicate. Without a
terminal, it removes only the ids passed to `--remove-legacy`. Uses sudo when
a removal requires it.

#### Refusals and exit codes

Unknown value in `--remove-legacy`: `USAGE` (2).
Unsupported system: `UNSUPPORTED_SYSTEM` (11). A step failed: `PARTIAL` (10).
sudo asks for a password: `SUDO_PASSWORD` (13).

#### Limits

Linuxbrew is never removed, because other formulas may depend on
it; the text shows the uninstall command. Secrets in moved lines appear masked
in the plan. Without SetupVibe 1 traces, the command exits with 0 and changes
nothing.

#### Examples

```bash
{{bin}} migrate --dry-run   # plan, lines that move and duplicates found
```

```bash
{{bin}} migrate   # converts the files and asks about each duplicate
```

```bash
{{bin}} migrate --remove-legacy go,rbenv   # without a terminal: removes only those duplicates
```

```bash
{{bin}} migrate --remove-legacy all   # without a terminal: removes every duplicate
```

```bash
{{bin}} migrate --json --dry-run   # full plan in JSON
```

### `{{bin}} upgrade`

Replaces the binary with the newest release of the channel, verified against
`SHA256SUMS` and, when cosign is installed, against the Sigstore signature.

#### Syntax

```bash
{{bin}} upgrade [--check] [--channel <channel>]
```

#### Arguments and options

| Name | Type | Required | Default | Accepted values |
| --- | --- | --- | --- | --- |
| `--check` | flag | no | absent | only reports whether a new version exists |
| `--channel` | enum | no | `stable` | `stable`, `beta` |

#### Output

Text: the current version, the new one and the verification result.
`data` carries `current`, `latest`, `minimum`, `changelog`,
`updateAvailable`, `updateRequired`, `checkedAt`, `source` and, when it
replaces the binary, `upgraded`, `path` and `signature` (`verified`, `skipped`
or `invalid`).

#### Persistent effects

Downloads the release binary, checks the SHA-256 and
replaces the executable at its own path. Writes the version check cache to
`~/.setupvibe/state/update-check.json`.

#### Permissions

Needs write permission on the binary folder. It does not use
sudo on its own.

#### Refusals and exit codes

Network failure or unexpected response:
`NETWORK_OR_API` (5). No permission to replace the file: `PERMISSION` (7).
Running from source: `USAGE` (2). Platform without a release binary:
`UNSUPPORTED_SYSTEM` (11). Invalid Sigstore signature: `NETWORK_OR_API` (5).

#### Limits

It replaces compiled binaries only. The release must list the
platform file in `SHA256SUMS`. Without cosign, the check stays on SHA-256 and
the text says so. The channel may also come from `config.json`.

#### Examples

```bash
{{bin}} upgrade --check   # only reports whether a new version exists
```

```bash
{{bin}} upgrade   # downloads, verifies and replaces the binary
```

```bash
{{bin}} upgrade --channel beta   # follows the beta channel
```

```bash
{{bin}} upgrade --check --json   # update status for a script
```

```bash
sudo {{bin}} upgrade   # when the binary is in /usr/local/bin
```

### `{{bin}} skill`

Runs the Vercel skills CLI pinned in the inventory. Arguments go after `--`.

#### Syntax

```bash
{{bin}} skill [--] <args>...
```

#### Arguments and options

| Name | Type | Required | Default | Accepted values |
| --- | --- | --- | --- | --- |
| `args` | text, variadic | no | - | skills CLI arguments |

#### Output

Text: the output of the skills CLI itself. `data` carries
`command`, `exitCode` and, with `--json`, `output` with the captured text.

#### Persistent effects

They depend on the skills subcommand. Installing and
removing skills writes to the chosen agent folders.

#### Permissions

The permissions of the skills CLI and the destination
folder. No root.

#### Refusals and exit codes

Skills CLI failure: `GENERIC_ERROR` (1). Invalid
argument for the binary: `USAGE` (2).

#### Limits

It uses the `skills` item when installed; without it, it runs
`npx skills@<pinned version>`, which requires network. The `--` is needed so
that `--json` and other options reach skills. The SetupVibe embedded
documentation lives in `docs` and `--skill`.

#### Examples

```bash
{{bin}} skill -- list   # lists the installed skills
```

```bash
{{bin}} skill -- add promovaweb/herdrfy -g -a claude-code   # installs the skill for Claude Code
```

```bash
{{bin}} skill -- add https://github.com/promovaweb/setupvibe/tree/v2/desktop/skills/setupvibe   # installs the skill that operates the binary
```

```bash
{{bin}} skill -- update   # updates the installed skills
```

```bash
{{bin}} skill -- list --json   # keeps the skills output in the envelope
```

### `{{bin}} report`

Generates a Markdown report of the machine to attach to a GitHub issue,
without secrets.

#### Syntax

```bash
{{bin}} report [--output <file>]
```

#### Arguments and options

| Name | Type | Required | Default | Accepted values |
| --- | --- | --- | --- | --- |
| `--output` | path | no | stdout | output file |

#### Output

Text: the Markdown. `data` carries `markdown`. With `--output`,
the text is a confirmation and the file receives the report.

#### Persistent effects

Creates the given file. Does not change the SetupVibe
state.

#### Permissions

None. It may run as root. Does not require a TTY.

#### Refusals and exit codes

Write failure: `PERMISSION` (7). No other refusal
is expected.

#### Limits

The report includes the system, the doctor findings, the items,
the external apps, the last run and the latest log lines, with sensitive
variable values masked. It does not replace the full log when the problem
depends on a detail.

#### Examples

```bash
{{bin}} report   # prints the report to paste into the issue
```

```bash
{{bin}} report --output report.md   # writes the report to a file
```

```bash
{{bin}} report --json   # returns the Markdown in the data field
```

```bash
{{bin}} report --output report.md && gh issue create --body-file report.md   # opens the issue with the report
```

```bash
{{bin}} report | head -40   # reads only the start, with system and version
```

### `{{bin}} self`

Groups the commands that manage the SetupVibe installation itself.

#### Syntax

```bash
{{bin}} self <uninstall> [options]
```

#### Arguments and options

| Name | Type | Required | Default | Accepted values |
| --- | --- | --- | --- | --- |
| (none) | - | - | - | - |

Without a subcommand, it prints the help and exits with 0; with `--json`, the help comes in `data.help`.

#### Output

Depends on the subcommand. See `self uninstall`.

#### Persistent effects

The subcommand removes files and configurations from
the machine.

#### Permissions

Uses sudo for the rule in `/etc/sudoers.d/`.

#### Refusals and exit codes

Invalid subcommand: `USAGE` (2).

#### Limits

The group has no action of its own. Use `self uninstall` with
`--dry-run` before removing.

#### Examples

```bash
{{bin}} self uninstall --dry-run   # removal plan without changing anything
```

```bash
{{bin}} self uninstall --yes   # removes SetupVibe and keeps the backups
```

```bash
{{bin}} self uninstall --yes --keep-data   # removes the binary and keeps ~/.setupvibe
```

```bash
{{bin}} self uninstall --items --yes   # also removes the user-space items
```

```bash
{{bin}} self --help   # lists the available subcommand
```

### `{{bin}} self uninstall`

Removes SetupVibe: shell blocks, sudo rule, binary and state. Backups and
Portainer data stay.

#### Syntax

```bash
{{bin}} self uninstall [--items] [--keep-data] [--yes] [--dry-run]
```

#### Arguments and options

| Name | Type | Required | Default | Accepted values |
| --- | --- | --- | --- | --- |
| `--items` | flag | no | absent | also removes the user-space items |
| `--keep-data` | flag | no | absent | keeps `~/.setupvibe/` |
| `--yes` | flag | no | absent | skips the confirmation (`-y`) |
| `--dry-run` | flag | no | absent | present or absent |

#### Output

Text: each step and the summary. `data` carries `dryRun` and `steps` in the plan; `log` and `results` in the run.

#### Persistent effects

Removes the shell blocks, the
`/etc/sudoers.d/90-setupvibe-<user>` rule, the binaries found and, without
`--keep-data`, `~/.setupvibe/`. With `--items`, it also removes the selected
items in the user space.

#### Permissions

Uses sudo for the sudo rule and for packages. Without a
terminal, it requires `--yes`.

#### Refusals and exit codes

Without `--yes` and without a terminal: `USAGE`
(2). Negative answer: `INTERRUPTED` (130). A step failed: `PARTIAL` (10). sudo
asks for a password: `SUDO_PASSWORD` (13).

#### Limits

Backups of your files, Portainer data and SetupVibe 1 leftovers
stay. `--keep-data` preserves state, logs and backups. User-space items leave
only with `--items`.

#### Examples

```bash
{{bin}} self uninstall --dry-run   # shows everything that would be removed
```

```bash
{{bin}} self uninstall --yes   # removes SetupVibe and keeps backups and Portainer
```

```bash
{{bin}} self uninstall --yes --keep-data   # keeps the state and logs in ~/.setupvibe
```

```bash
{{bin}} self uninstall --items --yes   # also removes the items installed in the user space
```

```bash
{{bin}} self uninstall --yes --json   # removal result in JSON
```

### `{{bin}} ssh`

Groups the SSH helpers.

#### Syntax

```bash
{{bin}} ssh <copy-id> [options]
```

#### Arguments and options

| Name | Type | Required | Default | Accepted values |
| --- | --- | --- | --- | --- |
| (none) | - | - | - | - |

Without a subcommand, it prints the help and exits with 0; with `--json`, the help comes in `data.help`.

#### Output

Depends on the subcommand. See `ssh copy-id`.

#### Persistent effects

The subcommand changes the remote server
`authorized_keys`.

#### Permissions

Those of the destination SSH session.

#### Refusals and exit codes

Invalid subcommand: `USAGE` (2).

#### Limits

The group has no action of its own. The private key never leaves
the machine.

#### Examples

```bash
{{bin}} ssh copy-id deploy@203.0.113.10   # authorizes the default key on the server
```

```bash
{{bin}} ssh copy-id deploy@host --port 2222   # uses a different SSH port
```

```bash
printf %s "$PASS" | {{bin}} ssh copy-id root@host --password-stdin   # sends the password on stdin
```

```bash
{{bin}} ssh copy-id deploy@host --key ~/.ssh/id_ed25519.pub   # chooses the public key
```

```bash
{{bin}} ssh copy-id deploy@host --json   # copy result in JSON
```

### `{{bin}} ssh copy-id`

Installs your public key on the remote server once, with safe file modes.

#### Syntax

```bash
{{bin}} ssh copy-id <target> [--port <port>] [--key <file>] [--password-stdin]
```

#### Arguments and options

| Name | Type | Required | Default | Accepted values |
| --- | --- | --- | --- | --- |
| `target` | text | yes | - | `user@host` or `host` |
| `--port` | integer | no | `22` | 1 to 65535 |
| `--key` | path | no | first of `~/.ssh/id_ed25519.pub`, `id_ecdsa.pub`, `id_rsa.pub` | public key |
| `--password-stdin` | flag | no | absent | reads the password from stdin and uses `sshpass` |

#### Output

Text: confirmation with the key file and the destination. `data`
carries `target`, `key` and `exitCode`.

#### Persistent effects

Appends the key to the remote server
`authorized_keys`. Nothing changes on the local machine.

#### Permissions

Needs SSH access to the destination. With
`--password-stdin`, it requires `sshpass` installed. The key travels on stdin,
never on the command line.

#### Refusals and exit codes

Invalid target: `USAGE` (2). Public key missing or
`sshpass` not installed: `NOT_FOUND` (6). SSH refused the connection or the
command: `GENERIC_ERROR` (1).

#### Limits

Installs one key per run. It does not create a new key; use
`ssh-keygen -t ed25519`. It changes nothing on the server beyond
`authorized_keys`.

#### Examples

```bash
{{bin}} ssh copy-id deploy@203.0.113.10   # authorizes the default key on the destination
```

```bash
printf %s "$PASS" | {{bin}} ssh copy-id root@host --password-stdin   # uses sshpass with the password from stdin
```

```bash
{{bin}} ssh copy-id deploy@host --port 2222   # server with SSH on another port
```

```bash
{{bin}} ssh copy-id deploy@host --key ~/.ssh/id_ed25519.pub   # chooses the public key
```

```bash
{{bin}} ssh copy-id deploy@host --json   # confirmation and exit code in JSON
```

### `{{bin}} user`

Creates the working user and manages its sudo rule.

#### Syntax

```bash
{{bin}} user <create|nopasswd> [options]
```

#### Arguments and options

| Name | Type | Required | Default | Accepted values |
| --- | --- | --- | --- | --- |
| (none) | - | - | - | - |

Without a subcommand, it prints the help and exits with 0; with `--json`, the help comes in `data.help`.

#### Output

Depends on the subcommand. See `user create` and `user nopasswd`.

#### Persistent effects

Creates the user, home, sudo group and rule in
`/etc/sudoers.d/`.

#### Permissions

Runs as root.

#### Refusals and exit codes

Invalid subcommand: `USAGE` (2).

#### Limits

The group has no action of its own. Use `user create` before init
on a new machine.

#### Examples

```bash
{{bin}} user create deploy --ssh-key ~/.ssh/id_ed25519.pub   # creates the user with the key
```

```bash
{{bin}} user create deploy --nopasswd   # creates the user with passwordless sudo for automation
```

```bash
{{bin}} user nopasswd deploy   # adds the passwordless sudo rule
```

```bash
{{bin}} user nopasswd deploy --remove   # removes the rule
```

```bash
{{bin}} user create deploy --dry-run   # shows the steps without creating the user
```

### `{{bin}} user create`

Creates the working user with sudo, an SSH key and, optionally, the
passwordless sudo rule.

#### Syntax

```bash
{{bin}} user create [name] [--ssh-key <key-or-file>] [--nopasswd] [--dry-run]
```

#### Arguments and options

| Name | Type | Required | Default | Accepted values |
| --- | --- | --- | --- | --- |
| `name` | text | no | asks in a terminal | lower-case letters, digits, `-` and `_` |
| `--ssh-key` | text or path | no | - | public key or file |
| `--nopasswd` | flag | no | absent | present or absent |
| `--dry-run` | flag | no | absent | present or absent |

#### Output

Text: each step and the next step, which is to log in as the user
and run `init`. `data` carries `user`; in the plan, `dryRun` and `steps`; in the run,
`log`, `results` and `next`.

#### Persistent effects

Creates the user, the home, the sudo group (`wheel` on
Arch and Omarchy), the `authorized_keys` with the key and, with `--nopasswd`,
the `/etc/sudoers.d/90-setupvibe-<name>` rule validated with `visudo -cf`.
Writes `user` and `nopasswd` to `config.json`.

#### Permissions

Requires root. Without a name and with a terminal, it asks
for the name. It does not use sudo: it already runs as root.

#### Refusals and exit codes

Missing name without a terminal: `USAGE` (2).
Invalid name: `USAGE` (2). Unsupported system: `UNSUPPORTED_SYSTEM` (11). A
step failed: `PARTIAL` (10).

#### Limits

Creates one user per run. The key may be the public key text or a
file; only the first line of the file is used. After creation, `init` runs as
the new user, not as root.

#### Examples

```bash
{{bin}} user create deploy --ssh-key ~/.ssh/id_ed25519.pub   # creates the user with the key from the file
```

```bash
{{bin}} user create deploy --ssh-key "ssh-ed25519 AAAA..."   # creates the user with the key in the argument
```

```bash
{{bin}} user create deploy --nopasswd   # creates the user with passwordless sudo for automation
```

```bash
{{bin}} user create deploy --dry-run   # full plan without creating anything
```

```bash
{{bin}} user create deploy --json   # result and next step in JSON
```

### `{{bin}} user nopasswd`

Adds or removes the SetupVibe passwordless sudo rule for a user.

#### Syntax

```bash
{{bin}} user nopasswd <name> [--remove] [--dry-run]
```

#### Arguments and options

| Name | Type | Required | Default | Accepted values |
| --- | --- | --- | --- | --- |
| `name` | text | yes | - | existing user name |
| `--remove` | flag | no | absent | removes the rule |
| `--dry-run` | flag | no | absent | present or absent |

#### Output

Text: each step and, in the run, the log path. `data` carries `user`; in the plan,
`dryRun` and `steps`; in the run, `log` and `results`.

#### Persistent effects

Creates or deletes
`/etc/sudoers.d/90-setupvibe-<name>`. The rule is validated with `visudo -cf`
before it lands.

#### Permissions

Requires root or sudo.

#### Refusals and exit codes

A step failed: `PARTIAL` (10). sudo asks for a
password: `SUDO_PASSWORD` (13).

#### Limits

It does not create a user. It only touches the SetupVibe rule;
other rules in `/etc/sudoers.d/` stay intact.

#### Examples

```bash
{{bin}} user nopasswd deploy   # adds the passwordless rule
```

```bash
{{bin}} user nopasswd deploy --remove   # removes the passwordless rule
```

```bash
{{bin}} user nopasswd deploy --dry-run   # shows the rule without writing it
```

```bash
{{bin}} user nopasswd deploy --remove --dry-run   # shows the removal without writing it
```

```bash
{{bin}} user nopasswd deploy --json   # rule result in JSON
```

### `{{bin}} security`

Groups the shared security module. `apply` applies the firewall, fail2ban,
automatic updates, key-only SSH login and time sync; `remove` undoes what was
applied.

#### Syntax

```bash
{{bin}} security <apply|remove> [options]
```

#### Arguments and options

| Name | Type | Required | Default | Accepted values |
| --- | --- | --- | --- | --- |
| (none) | - | - | - | - |

Without a subcommand, it prints the help and exits with 0; with `--json`, the help comes in `data.help`.

#### Output

Depends on the subcommand. See `security apply` and
`security remove`.

#### Persistent effects

Changes UFW, fail2ban, automatic updates,
`/etc/ssh/sshd_config.d/10-setupvibe.conf`, NTP and the time zone, and writes
`~/.setupvibe/state/security.json`.

#### Permissions

Uses sudo and requires root or passwordless sudo in a run
without a terminal.

#### Refusals and exit codes

Invalid subcommand: `USAGE` (2).

#### Limits

`auto` applies the module on a server and on an exposed desktop.
Use `security apply` to apply it on demand.

#### Examples

```bash
{{bin}} security apply --dry-run   # shows the module plan
```

```bash
{{bin}} security apply --timezone America/Sao_Paulo   # applies with the chosen time zone
```

```bash
{{bin}} security remove --dry-run   # shows what would be undone
```

```bash
{{bin}} security remove   # undoes the module and keeps the packages
```

```bash
{{bin}} security apply --json   # plan or result in JSON
```

### `{{bin}} security apply`

Applies the firewall, fail2ban, automatic updates, key-only SSH login and time
sync.

#### Syntax

```bash
{{bin}} security apply [--timezone <zone>] [--swarm] [--dry-run]
```

#### Arguments and options

| Name | Type | Required | Default | Accepted values |
| --- | --- | --- | --- | --- |
| `--timezone` | text | no | current zone | IANA zone, such as `America/Sao_Paulo` |
| `--swarm` | flag | no | absent | server: opens the Swarm ports |
| `--dry-run` | flag | no | absent | present or absent |

#### Output

Text: each part with ✓ or ✗ and the skipped parts with the reason.
`data` carries `dryRun`, `skipped` and `steps` in the plan; `log` and `results`
in the run.

#### Persistent effects

Configures UFW denying incoming traffic except SSH
(and the Swarm ports with `--swarm`), the fail2ban `sshd` jail, automatic
updates on Debian and Ubuntu, NTP and the time zone. Moves SSH to key-only
login when the user has an authorized key. Writes the previous state to
`~/.setupvibe/state/security.json` before the first change.

#### Permissions

Requires root or sudo. In a run without a terminal, sudo must
work without a password.

#### Refusals and exit codes

Unsupported system: `UNSUPPORTED_SYSTEM` (11). A
part failed: `PARTIAL` (10). sudo asks for a password: `SUDO_PASSWORD` (13).

#### Limits

Without an authorized key, the SSH part is skipped and the closing
text says so; SetupVibe never turns password authentication on. The first
state record is kept across later runs. Containers that publish a port on
every interface bypass the Docker firewall; `doctor` points them out.

#### Examples

```bash
{{bin}} security apply --dry-run   # full plan without changing anything
```

```bash
{{bin}} security apply --timezone America/Sao_Paulo   # applies with the Sao Paulo time zone
```

```bash
{{bin}} security apply --json   # skipped parts and results in JSON
```

```bash
{{bin}} security apply --swarm   # server: also opens the Swarm ports
```

```bash
{{bin}} security apply --timezone UTC --dry-run | grep -i time   # checks only the time part
```

### `{{bin}} security remove`

Undoes the security module from the state recorded before it was applied. The
packages stay installed.

#### Syntax

```bash
{{bin}} security remove [--dry-run]
```

#### Arguments and options

| Name | Type | Required | Default | Accepted values |
| --- | --- | --- | --- | --- |
| `--dry-run` | flag | no | absent | present or absent |

#### Output

Text: each step and, in the run, the log path. `data` carries `record`; in the plan, `dryRun` and `steps`; in the run, `log`
and `results`.

#### Persistent effects

Deletes the SSH drop-in after `sshd -t`, the fail2ban
jail and the automatic updates configuration. Turns UFW and fail2ban off when
they were off before. Deletes the
`~/.setupvibe/state/security.json` record.

#### Permissions

Requires root or sudo.

#### Refusals and exit codes

Without a record: `CONFIG` (3). A part failed:
`PARTIAL` (10). sudo asks for a password: `SUDO_PASSWORD` (13).

#### Limits

Files that existed before SetupVibe stay. The packages are not
removed. Without the record, the command does not guess the previous state.

#### Examples

```bash
{{bin}} security remove --dry-run   # shows what would be undone
```

```bash
{{bin}} security remove   # undoes the module and deletes the record
```

```bash
{{bin}} security remove --json   # result in JSON
```

```bash
{{bin}} security remove; echo "exit=$?"   # checks the code when there is no record
```

```bash
{{bin}} security remove && {{bin}} doctor   # removes and checks the machine state
```

### `{{bin}} about`

Shows version, executable, runtime, platform and credits.

#### Syntax

```bash
{{bin}} about [--json]
```

#### Arguments and options

| Name | Type | Required | Default | Accepted values |
| --- | --- | --- | --- | --- |
| (none) | - | - | - | - |

#### Output

Text: title, description and the `Binary`, `Project` and `Credits`
tables. `data` carries `bin`, `title`, `version`, `description`, `author`,
`site`, `repository`, `license`, `executable`, `runtime`, `platform`, `system`,
`pid`, `dataDir` and `credits`.

#### Persistent effects

None.

#### Permissions

None. It may run as root.

#### Refusals and exit codes

No refusal is expected. Returns 0.

#### Limits

`system` is a one-line summary; for the details, use `system`. The
`pid` changes on every run.

#### Examples

```bash
{{bin}} about   # version, executable, runtime, platform and credits
```

```bash
{{bin}} about --json   # full identity for an agent
```

```bash
{{bin}} about | grep -i credit -A 10   # only the credits list
```

```bash
{{bin}} about --json | jq -r '.data.executable'   # path of the binary in use
```

```bash
{{bin}} about --json | jq -r '.data.version'   # version to compare with the release
```

### `{{bin}} config`

Reads and writes preferences in `~/.setupvibe/settings.json`.

#### Syntax

```bash
{{bin}} config <subcommand> [options]
```

#### Arguments and options

| Name | Type | Required | Default | Accepted values |
| --- | --- | --- | --- | --- |
| (none) | - | - | - | - |

Without a subcommand, it prints the help and exits with 0; with `--json`, the help comes in `data.help`.

#### Output

Depends on the subcommand. See the section for each one.

#### Persistent effects

`set`, `unset` and `import` write `settings.json` with
mode 0600. `export` writes an answers file when it receives a path.

#### Permissions

None. Unknown keys are accepted as text, for project
extensions.

#### Refusals and exit codes

Invalid JSON in the file: `CONFIG` (3). Read or
write failure: `PERMISSION` (7). Missing key in `get`: `CONFIG` (3). Invalid
subcommand: `USAGE` (2).

#### Limits

Secrets do not go into `settings.json`; use `credentials`. Keys
use dot notation.

#### Examples

```bash
{{bin}} config list   # every key with its effective value
```

```bash
{{bin}} config get output.format   # value of one key
```

```bash
{{bin}} config set output.format json   # writes a preference
```

```bash
{{bin}} config export setupvibe.json   # writes the selection for another machine
```

```bash
{{bin}} config import setupvibe.json --dry-run   # checks the file before installing
```

### `{{bin}} config list`

Lists every key with its effective value, merging the file with the defaults.

#### Syntax

```bash
{{bin}} config list [--json]
```

#### Arguments and options

| Name | Type | Required | Default | Accepted values |
| --- | --- | --- | --- | --- |
| (none) | - | - | - | - |

The `ls` alias has the same effect.

#### Output

Text: the file path and a `key value` table. `data` carries
`file`, `exists` and `values`, an object from key to value.

#### Persistent effects

None. The file is not created.

#### Permissions

None.

#### Refusals and exit codes

Invalid JSON: `CONFIG` (3). Unreadable file:
`PERMISSION` (7).

#### Limits

The value is the effective one, not only what is in the file.
`exists` tells whether the file has been created.

#### Examples

```bash
{{bin}} config list   # every effective key
```

```bash
{{bin}} config list --json   # values object for a script
```

```bash
{{bin}} config list | grep tui   # only the TUI preferences
```

```bash
{{bin}} config list --json | jq -r '.data.values["output.format"]'   # effective output format
```

```bash
{{bin}} config list --json | jq '.data.exists'   # checks whether settings.json exists
```

### `{{bin}} config get`

Shows the value of a key.

#### Syntax

```bash
{{bin}} config get <key> [--json]
```

#### Arguments and options

| Name | Type | Required | Default | Accepted values |
| --- | --- | --- | --- | --- |
| `key` | text | yes | - | dot notation key, such as `output.format` |

#### Output

Text: the value. Strings come without quotes; numbers, booleans
and objects come as JSON. `data` carries `key` and `value`.

#### Persistent effects

None.

#### Permissions

None.

#### Refusals and exit codes

Missing key: `CONFIG` (3), with the hint to use
`config schema`. Invalid JSON: `CONFIG` (3). Unreadable file: `PERMISSION`
(7).

#### Limits

It returns the effective value, including the default. It does not
tell a stored value from a default; for that, read the file or use
`list --json` with `exists`.

#### Examples

```bash
{{bin}} config get output.format   # effective output format
```

```bash
{{bin}} config get tui.theme   # TUI palette
```

```bash
{{bin}} config get tui.initialTab --json   # key and value in JSON
```

```bash
{{bin}} config get missing.key; echo "exit=$?"   # confirms exit code 3
```

```bash
{{bin}} config get shell.agentAliases   # checks whether agent aliases are on
```

### `{{bin}} config set`

Writes a value to `settings.json`, converting the type according to the
schema.

#### Syntax

```bash
{{bin}} config set <key> <value> [--json]
```

#### Arguments and options

| Name | Type | Required | Default | Accepted values |
| --- | --- | --- | --- | --- |
| `key` | text | yes | - | dot notation key |
| `value` | text | yes | - | text; booleans accept `true`, `false`, `yes`, `no`, `1`, `0`, `on`, `off` |

#### Output

Text: confirmation with the converted value and a warning when the
key is outside the schema. `data` carries `key`, `value`, `file` and
`unknownKey`.

#### Persistent effects

Creates or updates `settings.json`, with mode 0600 and
two-space indentation. A key outside the schema is stored as text.

#### Permissions

None.

#### Refusals and exit codes

Value outside the type or the accepted list:
`CONFIG` (3). Write failure: `PERMISSION` (7).

#### Limits

It does not validate the effect of the preference on other files.
After changing `shell.agentAliases`, run `shell apply`. `output.format = json`
changes the default format of every command.

#### Examples

```bash
{{bin}} config set output.format json   # starts using JSON by default
```

```bash
{{bin}} config set output.colors false   # turns colors off in text output
```

```bash
{{bin}} config set shell.agentAliases false   # leaves agent aliases out on the next shell apply
```

```bash
{{bin}} config set tui.theme day   # changes the TUI palette
```

```bash
{{bin}} config set my.key value --json   # key outside the schema, stored as text
```

### `{{bin}} config unset`

Removes a key from the file. The key falls back to its default, when there is
one.

#### Syntax

```bash
{{bin}} config unset <key> [--json]
```

#### Arguments and options

| Name | Type | Required | Default | Accepted values |
| --- | --- | --- | --- | --- |
| `key` | text | yes | - | dot notation key |

The `rm` alias has the same effect.

#### Output

Text: confirmation or a warning that the key was not stored.
`data` carries `key` and `removed`.

#### Persistent effects

Rewrites `settings.json` only when something was
removed.

#### Permissions

None.

#### Refusals and exit codes

Invalid JSON: `CONFIG` (3). Write failure:
`PERMISSION` (7).

#### Limits

A missing key is not an error: it returns 0 with `removed = false`.
To return to the default, remove the key instead of writing the default value.

#### Examples

```bash
{{bin}} config unset telemetry.enabled   # returns to the default
```

```bash
{{bin}} config unset output.format   # returns to text by default
```

```bash
{{bin}} config unset tui.theme --json   # confirms the removal in JSON
```

```bash
{{bin}} config unset my.key; echo "exit=$?"   # a missing key also returns 0
```

```bash
{{bin}} config unset shell.agentAliases && {{bin}} shell apply   # returns to the default aliases and reapplies
```

### `{{bin}} config path`

Prints the data folder and the file paths.

#### Syntax

```bash
{{bin}} config path [--json]
```

#### Arguments and options

| Name | Type | Required | Default | Accepted values |
| --- | --- | --- | --- | --- |
| (none) | - | - | - | - |

#### Output

Text: a table with `Directory`, `settings.json`,
`credentials.json` and `master.key`. `data` carries `base`, `settings`,
`credentials` and `masterKey`.

#### Persistent effects

None. It does not create the folder.

#### Permissions

None.

#### Refusals and exit codes

No refusal is expected.

#### Limits

With `SETUPVIBE_HOME`, the paths point to the alternative folder.
Both editions use `~/.setupvibe/`.

#### Examples

```bash
{{bin}} config path   # state folder and files
```

```bash
{{bin}} config path --json   # paths for a script
```

```bash
SETUPVIBE_HOME=/tmp/sv {{bin}} config path   # checks the folder override
```

```bash
{{bin}} config path --json | jq -r '.data.settings'   # settings.json path
```

```bash
{{bin}} config path --json | jq -r '.data.masterKey'   # master key path
```

### `{{bin}} config schema`

Lists the known keys with type, default and description.

#### Syntax

```bash
{{bin}} config schema [--json]
```

#### Arguments and options

| Name | Type | Required | Default | Accepted values |
| --- | --- | --- | --- | --- |
| (none) | - | - | - | - |

#### Output

Text: a table with key, description, type and default. `data`
carries `keys`, and each key carries `key`, `type`, `default`, `description`
and `values` when it is an enum.

#### Persistent effects

None.

#### Permissions

None.

#### Refusals and exit codes

No refusal is expected.

#### Limits

The schema covers the SetupVibe keys. Derived projects may have
their own keys; those appear in `set` with `unknownKey = true`.

#### Examples

```bash
{{bin}} config schema   # every known key
```

```bash
{{bin}} config schema --json   # full schema for validation
```

```bash
{{bin}} config schema | grep -A 1 output.format   # detail of one key
```

```bash
{{bin}} config schema --json | jq -r '.data.keys[].key'   # only the key names
```

```bash
{{bin}} config schema | grep enum   # keys with a closed value list
```

### `{{bin}} config export`

Writes the selection and identity as an answers file for `config import` and
`auto --config`.

#### Syntax

```bash
{{bin}} config export [file] [--json]
```

#### Arguments and options

| Name | Type | Required | Default | Accepted values |
| --- | --- | --- | --- | --- |
| `file` | path | no | stdout | output file |

#### Output

Without a file, the JSON of the answers file. With a file, a
confirmation with the item count. `data` carries `schemaVersion`, `edition`,
`user` when present, `git` when present, `profile`, `only` and `timezone` when
present.

#### Persistent effects

Creates the given file. Does not change the machine.

#### Permissions

None.

#### Refusals and exit codes

Write failure: `PERMISSION` (7).

#### Limits

The file carries no secrets. The `only` list has the ids of the
selection at that moment; apps outside the inventory do not enter. The
`profile` field is `none`; in `auto --config`, that means no profile and the
selection comes from `only`.

#### Examples

```bash
{{bin}} config export   # prints the answers file to stdout
```

```bash
{{bin}} config export setupvibe.json   # writes the file for another machine
```

```bash
{{bin}} config export --json   # envelope with the content in data
```

```bash
{{bin}} config export | jq -r '.only[]'   # lists the exported ids
```

```bash
{{bin}} config export setupvibe.json && scp setupvibe.json deploy@host:   # takes the selection to the server
```

### `{{bin}} config import`

Installs the items and the Git identity of a file exported on another machine.

#### Syntax

```bash
{{bin}} config import <file> [--dry-run]
```

#### Arguments and options

| Name | Type | Required | Default | Accepted values |
| --- | --- | --- | --- | --- |
| `file` | path | yes | - | file from `config export` |
| `--dry-run` | flag | no | absent | present or absent |

#### Output

Text: each step and, in the run, the log path. `data` carries `dryRun`, `items`,
`skipped`, `log`, `results` and `checks` when a check fails.

#### Persistent effects

Installs the items from the file, writes the Git
identity with `git config --global` and updates `selection.json`.

#### Permissions

Requires a completed init. Uses sudo when the method requires
it.

#### Refusals and exit codes

Invalid JSON or a file with a secret: `USAGE`
(2). Without init: `CONFIG` (3). A step failed: `PARTIAL` (10). sudo asks for a
password: `SUDO_PASSWORD` (13).

#### Limits

The file must come from `config export`; fields with
`tailscaleAuthKey`, `ghToken`, `token` or `swarmToken` are refused. Apps
installed with `--external` do not enter the import.

#### Examples

```bash
{{bin}} config import setupvibe.json --dry-run   # shows what would be installed
```

```bash
{{bin}} config import setupvibe.json   # installs the items and the Git identity
```

```bash
{{bin}} config import setupvibe.json --json   # result in JSON
```

```bash
{{bin}} config import setupvibe.json 2>/dev/null; echo "exit=$?"   # checks the result in a script
```

```bash
{{bin}} config import setupvibe.json && {{bin}} check   # imports and verifies the selection
```

### `{{bin}} credentials`

Groups the secret vault encrypted with AES-256-GCM in
`~/.setupvibe/credentials.json`.

#### Syntax

```bash
{{bin}} credentials <subcommand> [options]
```

#### Arguments and options

| Name | Type | Required | Default | Accepted values |
| --- | --- | --- | --- | --- |
| (none) | - | - | - | - |

The `cred` alias has the same effect. Without a subcommand, it prints the help
and exits with 0; with `--json`, the help comes in `data.help`.

#### Output

Depends on the subcommand. No subcommand returns the full value
without `--reveal`.

#### Persistent effects

Writes `credentials.json` and `master.key` with mode
0600. `clear` deletes the vault; `rotate-key` changes the key.

#### Permissions

None beyond writing to `~/.setupvibe/`.

#### Refusals and exit codes

Unreadable vault or missing credential:
`CREDENTIALS` (4). Write failure: `PERMISSION` (7). Cancelled input:
`INTERRUPTED` (130). Invalid name: `USAGE` (2).

#### Limits

The key comes from `SETUPVIBE_MASTER_KEY` or from `master.key`.
Commands that call an API read it with `getCredential(name)` and exit with 4
when the value does not exist. No MCP tool returns a credential value.

#### Examples

```bash
{{bin}} credentials set openai.api_key   # stores without echo in the terminal
```

```bash
{{bin}} credentials get openai.api_key   # shows the masked value
```

```bash
{{bin}} credentials list   # saved names, without values
```

```bash
{{bin}} credentials remove github.token   # deletes a credential
```

```bash
{{bin}} credentials status   # file, key source and count
```

### `{{bin}} credentials set`

Saves or replaces a credential. The value is read without echo or from stdin.

#### Syntax

```bash
{{bin}} credentials set <name> [--stdin]
```

#### Arguments and options

| Name | Type | Required | Default | Accepted values |
| --- | --- | --- | --- | --- |
| `name` | text | yes | - | lower-case letters, digits, dot, hyphen and `_`, up to 64 characters |
| `--stdin` | flag | no | absent | reads the first stdin line even in a terminal |

#### Output

Text: confirmation with the vault path. `data` carries `name`,
`file` and `saved`.

#### Persistent effects

Creates or updates `credentials.json`. Creates
`master.key` with mode 0600 on the first write, when there is no key in the
environment.

#### Permissions

Requires a terminal to type without echo; without a terminal
or with `--stdin`, it reads the first stdin line.

#### Refusals and exit codes

Invalid name: `USAGE` (2). Empty value on stdin: `USAGE` (2). Ctrl+C:
`INTERRUPTED` (130). Key or vault failure: `CREDENTIALS` (4). Write failure:
`PERMISSION` (7).

#### Limits

It does not accept the value as an argument, to keep the secret out
of the history and the process list. One credential per run. The value is
stored as text and encrypted in the file.

#### Examples

```bash
{{bin}} credentials set openai.api_key   # asks for the value without echo
```

```bash
printf '%s' "$TOKEN" | {{bin}} credentials set github.token --stdin   # value from a variable
```

```bash
{{bin}} credentials set openai.api_key   # repeats the name to replace the value
```

```bash
printf '%s\n' "$SECRET" | {{bin}} credentials set api.token --stdin   # first stdin line
```

```bash
{{bin}} credentials set openai.api_key --json   # confirmation in JSON
```

### `{{bin}} credentials get`

Shows a masked credential. Use `--reveal` for the full value.

#### Syntax

```bash
{{bin}} credentials get <name> [--reveal] [--json]
```

#### Arguments and options

| Name | Type | Required | Default | Accepted values |
| --- | --- | --- | --- | --- |
| `name` | text | yes | - | credential name |
| `--reveal` | flag | no | absent | prints the full value |

#### Output

Without `--reveal`, text with the mask and `data` with `name`,
`masked` and `length`. With `--reveal`, text with the value and `data` with
`name` and `value`.

#### Persistent effects

None.

#### Permissions

None, but the full value appears in the terminal and in the
output history.

#### Refusals and exit codes

Invalid name: `USAGE` (2). Missing credential:
`CREDENTIALS` (4). Unreadable vault: `CREDENTIALS` (4).

#### Limits

The mask shows a few characters. `--reveal` in an agent writes the
secret to the session log; prefer consuming the value directly in the command
that needs it. There is no option to copy it to the clipboard.

#### Examples

```bash
{{bin}} credentials get openai.api_key   # masked value
```

```bash
{{bin}} credentials get openai.api_key --reveal   # full value in the terminal
```

```bash
{{bin}} credentials get openai.api_key --json   # name, mask and length
```

```bash
{{bin}} credentials get missing.credential; echo "exit=$?"   # confirms exit code 4
```

```bash
TOKEN=$({{bin}} credentials get github.token --reveal) && curl -H "Authorization: Bearer $TOKEN" https://api.github.com/user   # uses the value without printing it
```

### `{{bin}} credentials list`

Lists the saved names. Never shows values.

#### Syntax

```bash
{{bin}} credentials list [--json]
```

#### Arguments and options

| Name | Type | Required | Default | Accepted values |
| --- | --- | --- | --- | --- |
| (none) | - | - | - | - |

The `ls` alias has the same effect.

#### Output

Text: one name per line, or the empty vault notice. `data` carries
`count` and `names`.

#### Persistent effects

None.

#### Permissions

None.

#### Refusals and exit codes

Unreadable vault: `CREDENTIALS` (4).

#### Limits

It lists names only. To learn the key source, use `status`. A
missing vault returns an empty list and code 0.

#### Examples

```bash
{{bin}} credentials list   # saved names
```

```bash
{{bin}} credentials list --json   # count and names in JSON
```

```bash
{{bin}} credentials list | wc -l   # how many credentials exist
```

```bash
for name in $({{bin}} credentials list); do echo "$name"; done   # loops over the names
```

```bash
{{bin}} credentials list --json | jq -r '.data.names[]'   # names for a script
```

### `{{bin}} credentials remove`

Removes a credential from the vault.

#### Syntax

```bash
{{bin}} credentials remove <name> [--json]
```

#### Arguments and options

| Name | Type | Required | Default | Accepted values |
| --- | --- | --- | --- | --- |
| `name` | text | yes | - | credential name |

The `rm` alias has the same effect.

#### Output

Text: confirmation or a warning that the credential did not exist.
`data` carries `name` and `removed`.

#### Persistent effects

Rewrites `credentials.json` without the credential.

#### Permissions

None beyond writing to the vault.

#### Refusals and exit codes

Invalid name: `USAGE` (2). Vault failure:
`CREDENTIALS` (4). Write failure: `PERMISSION` (7).

#### Limits

A missing name is not an error: it returns 0 with
`removed = false`. The master key is not changed.

#### Examples

```bash
{{bin}} credentials remove github.token   # deletes the credential
```

```bash
{{bin}} credentials remove github.token --json   # confirms what left
```

```bash
{{bin}} credentials remove old.key; echo "exit=$?"   # a missing name returns 0
```

```bash
{{bin}} credentials remove github.token && {{bin}} credentials list   # checks the list afterwards
```

```bash
{{bin}} credentials remove github.token 2>/dev/null || true   # removes without failing when it is already gone
```

### `{{bin}} credentials status`

Shows the file, the master key source and the number of credentials.

#### Syntax

```bash
{{bin}} credentials status [--json]
```

#### Arguments and options

| Name | Type | Required | Default | Accepted values |
| --- | --- | --- | --- | --- |
| (none) | - | - | - | - |

#### Output

Text: a table with `File`, `Cipher`, `Master key` and
`Credentials`, followed by the names. `data` carries `file`, `exists`,
`masterKeySource`, `count`, `names`, `masterKeyVariable` and `algorithm`.

#### Persistent effects

None.

#### Permissions

None.

#### Refusals and exit codes

No refusal is expected. An unreadable vault
appears as an empty list in the text, without deleting anything.

#### Limits

`masterKeySource` is `env`, `file` or `none`. The status does not
decrypt the values; it only tries to read the names.

#### Examples

```bash
{{bin}} credentials status   # file, cipher, key and count
```

```bash
{{bin}} credentials status --json   # full state for an agent
```

```bash
{{bin}} credentials status | grep Master   # only the key source
```

```bash
{{bin}} credentials status --json | jq -r '.data.masterKeySource'   # env, file or none
```

```bash
{{bin}} credentials status --json | jq '.data.count'   # how many credentials exist
```

### `{{bin}} credentials clear`

Deletes `credentials.json` entirely. Keeps `master.key`. Asks for confirmation
in a terminal.

#### Syntax

```bash
{{bin}} credentials clear [--yes]
```

#### Arguments and options

| Name | Type | Required | Default | Accepted values |
| --- | --- | --- | --- | --- |
| `--yes` | flag | no | absent | skips the confirmation (`-y`) |

#### Output

Text: confirmation or a warning that there was no vault. `data`
carries `file` and `deleted`.

#### Persistent effects

Deletes the encrypted vault. The master key and the
other files stay.

#### Permissions

In a terminal, it asks for confirmation. Without a terminal
and without `--yes`, it treats the answer as negative.

#### Refusals and exit codes

Negative answer or no `--yes` outside a terminal:
`INTERRUPTED` (130). Write failure: `PERMISSION` (7).

#### Limits

It does not delete `master.key`, so a new vault uses the same key.
To change the key, use `rotate-key`. Deleted values cannot be recovered.

#### Examples

```bash
{{bin}} credentials clear   # asks before deleting
```

```bash
{{bin}} credentials clear --yes   # deletes without asking
```

```bash
{{bin}} credentials clear --yes --json   # confirms what was deleted
```

```bash
{{bin}} credentials clear --yes && {{bin}} credentials status   # checks that the vault is gone
```

```bash
{{bin}} credentials clear; echo "exit=$?"   # without a terminal and without --yes, confirms 130
```

### `{{bin}} credentials rotate-key`

Re-encrypts the vault with a new master key and writes `master.key` with mode
0600.

#### Syntax

```bash
{{bin}} credentials rotate-key [--from-env]
```

#### Arguments and options

| Name | Type | Required | Default | Accepted values |
| --- | --- | --- | --- | --- |
| `--from-env` | flag | no | absent | uses `SETUPVIBE_MASTER_KEY` as the new key |

#### Output

Text: confirmation. `data` carries `rotated` and `source` (`env`
or `file`).

#### Persistent effects

Replaces `master.key` and re-encrypts
`credentials.json`. With `--from-env`, the current key is read from
`master.key` and the new one comes from the variable.

#### Permissions

None beyond writing to the vault.

#### Refusals and exit codes

Missing vault: `CREDENTIALS` (4). Missing or
malformed variable: `CREDENTIALS` (4). Write failure: `PERMISSION` (7).

#### Limits

The variable must have 64 hexadecimal characters. Without
`--from-env`, the new key is random and the old variable must be removed from
the shell. On failure, the original vault is preserved.

#### Examples

```bash
{{bin}} credentials rotate-key   # generates a new key and re-encrypts the vault
```

```bash
{{bin}} credentials rotate-key --from-env   # uses the key from the variable
```

```bash
{{bin}} credentials rotate-key && unset SETUPVIBE_MASTER_KEY   # removes the old variable from the session
```

```bash
{{bin}} credentials rotate-key 2>/dev/null; echo "exit=$?"   # without a vault, confirms code 4
```

```bash
{{bin}} credentials rotate-key --json   # new key source in JSON
```

### `{{bin}} mcp`

Starts the Model Context Protocol server over stdio, with tools, resources and
prompts for agents.

#### Syntax

```bash
{{bin}} mcp [--list]
```

#### Arguments and options

| Name | Type | Required | Default | Accepted values |
| --- | --- | --- | --- | --- |
| `--list` | flag | no | absent | only lists what the server registers |

#### Output

With `--list`, text with `Tools`, `Resources` and `Prompts`, and
`data` with `name`, `version`, `tools`, `resources` and `prompts`. Without
`--list`, the process speaks JSON-RPC on stdin and stdout until the client
closes, and the final envelope carries `data = { "closed": true }`.

#### Persistent effects

None. The server only reads state and runs tools when
the client asks.

#### Permissions

The same as the binary. Tools that install or remove items
use sudo and require init, as in the CLI.

#### Refusals and exit codes

Failure to start or lost transport: `MCP` (9). A
failing tool returns a JSON-RPC error without bringing the server down.

#### Limits

Nothing but JSON-RPC may go to stdout; diagnostics go to stderr.
The client configures `{ "command": "{{bin}}", "args": ["mcp"] }`. No tool
returns a credential value.

#### Examples

```bash
{{bin}} mcp   # starts the server for the MCP client
```

```bash
{{bin}} mcp --list   # lists tools, resources and prompts
```

```bash
{{bin}} mcp --list --json   # full catalog for an agent
```

```bash
{{bin}} mcp install   # configures the server in the installed agents
```

```bash
{{bin}} mcp --list | sed -n '/Tools:/,/Resources:/p'   # only the tools
```

### `{{bin}} mcp install`

Configures the SetupVibe MCP server in Claude Code, Codex and OpenCode.

#### Syntax

```bash
{{bin}} mcp install [--dry-run]
```

#### Arguments and options

| Name | Type | Required | Default | Accepted values |
| --- | --- | --- | --- | --- |
| `--dry-run` | flag | no | absent | present or absent |

#### Output

Text: each configured agent, the skipped ones and the log path.
`data` carries `dryRun`, `skipped` and `steps` in the plan; `log` and `results` in the run.

#### Persistent effects

In Claude Code, `claude mcp add --scope user`. In
Codex, `codex mcp add`. In OpenCode, the `mcp.setupvibe` block in
`~/.config/opencode/opencode.json`, with a backup at `.setupvibe.bak` before
the first change. The rest of the file is preserved.

#### Permissions

None beyond writing to the agent files. Does not require a
TTY.

#### Refusals and exit codes

A step failed: `PARTIAL` (10).

#### Limits

An agent that is not installed is skipped, and the text says
which. Running it again does not change what is already configured. It does
not install the agents; use `install` for that.

#### Examples

```bash
{{bin}} mcp install   # configures the agents found on the machine
```

```bash
{{bin}} mcp install --dry-run   # shows the commands and files
```

```bash
{{bin}} mcp install --json   # skipped agents and results in JSON
```

```bash
{{bin}} mcp install 2>&1 | grep not   # only the agents that are not installed
```

```bash
{{bin}} mcp install && claude mcp get setupvibe   # checks the registration in Claude Code
```

### `{{bin}} docs`

Prints the embedded documentation, whole or by topic. It has the same effect
as `--skill`.

#### Syntax

```bash
{{bin}} docs [topic] [--lang <language>]
```

#### Arguments and options

| Name | Type | Required | Default | Accepted values |
| --- | --- | --- | --- | --- |
| `topic` | enum | no | everything | `cli`, `tui`, `mcp`, `config`, `exit-codes`, `troubleshooting`, `migration`, `inventory`, `reference` |
| `--lang` | enum | no | `SETUPVIBE_LANG`, then `LANG` | `pt-BR`, `en` |

#### Output

Text: the Markdown. `data` carries `topic` (`all` without an
argument) and `markdown`.

#### Persistent effects

None.

#### Permissions

None. It may run as root.

#### Refusals and exit codes

Invalid topic: `USAGE` (2). Language outside the
list: `USAGE` (2).

#### Limits

Every topic works in `--skill`, in `docs` and in the MCP `skill` tool. `troubleshooting` brings the
diagnostics guide and `migration` the SetupVibe 1 migration guide. `inventory`
generates the list from the embedded inventory. `reference` brings only the
registry reference, with commands, arguments, options and exit codes. The
embedded text matches the binary version.

#### Examples

```bash
{{bin}} docs   # all embedded documentation
```

```bash
{{bin}} docs cli   # only the CLI manual
```

```bash
{{bin}} docs mcp --json   # one section in the envelope, for an agent
```

```bash
{{bin}} docs troubleshooting --lang en   # diagnostics guide in English
```

```bash
{{bin}} docs inventory > inventory.md   # writes the item and version list
```

### `{{bin}} doctor`

Checks the runtime, the SetupVibe state, pending prerequisites, the items and
the SetupVibe 1 leftovers. With `--fix`, it applies the safe fixes.

#### Syntax

```bash
{{bin}} doctor [--fix] [--repair-windows] [--dry-run]
```

#### Arguments and options

| Name | Type | Required | Default | Accepted values |
| --- | --- | --- | --- | --- |
| `--fix` | flag | no | absent | applies the safe fixes |
| `--repair-windows` | flag | no | absent | Windows: DISM `/RestoreHealth` and `sfc /scannow` |
| `--dry-run` | flag | no | absent | present or absent |

#### Output

Text: the `Runtime`, `SetupVibe` and, with `--fix`, `Applied`
sections. Each line uses ✓, ! or ✗. `data` carries `ok`, `runtime`, `findings`
and, with `--fix`, `applied`. Each check has `name`, `status` and `detail`;
each finding has `id`, `level`, `text` and `fix` when present.

#### Persistent effects

Without `--fix`, none. With `--fix`, it creates
`~/.local/bin`, sets `~/.setupvibe/` to 0700 and writes the shell block. Before
writing the block, it converts SetupVibe 1 files, as `auto` and `shell apply`
do. With `--repair-windows`, it runs DISM and `sfc`.

#### Permissions

Without `--fix`, it runs as a regular user and may run as
root. With `--fix`, it may use sudo for the shell block. `--repair-windows`
requires an elevated PowerShell.

#### Refusals and exit codes

A check with `fail`: `CONFIG` (3). Windows repair
called on another system: `UNSUPPORTED_SYSTEM` (11). A repair step failed:
`PARTIAL` (10).

#### Limits

The doctor creates no files and shows no secrets without `--fix`.
A missing TTY and files not yet created produce `warn`, not `fail`. It points
out containers publishing a port on every interface, an item resolved by
another manager and a pending restart. It does not fix a failing item; that is
`install --force`.

#### Examples

```bash
{{bin}} doctor   # full diagnostics in text
```

```bash
{{bin}} doctor --fix   # applies the safe fixes and shows the ones that need a choice
```

```bash
{{bin}} doctor --json   # checks and findings in JSON
```

```bash
{{bin}} doctor --repair-windows   # elevated Windows: repairs the component store and system files
```

```bash
{{bin}} doctor --json | jq '.data.findings[] | select(.level=="fail")'   # only the failing findings
```

### `{{bin}} completion`

Prints a registry-generated completion script for bash, zsh, fish or
PowerShell.

#### Syntax

```bash
{{bin}} completion <shell> [--json]
```

#### Arguments and options

| Name | Type | Required | Default | Accepted values |
| --- | --- | --- | --- | --- |
| `shell` | enum | yes | - | `bash`, `zsh`, `fish`, `powershell` |

#### Output

Text: the script. `data` carries `shell` and `script`.

#### Persistent effects

None. The script enters the shell only when you load
it or add the line to the startup file.

#### Permissions

None. It may run as root.

#### Refusals and exit codes

Shell outside the list: `USAGE` (2), with the
accepted values.

#### Limits

The script covers commands, subcommands, local and global options
and enum values from the registry. A person who changes version must generate
the script again. Zsh uses `compdef` and `compadd`, without `bashcompinit`.

#### Examples

```bash
eval "$({{bin}} completion bash)"   # completion in the current Bash session
```

```bash
eval "$({{bin}} completion zsh)"   # completion in the current Zsh session
```

```bash
{{bin}} completion fish | source   # completion in the current Fish session
```

```powershell
{{bin}} completion powershell | Out-String | Invoke-Expression   # completion in PowerShell
```

```bash
{{bin}} completion zsh > ~/.zsh/completions/_setupvibe   # file to load later
```
