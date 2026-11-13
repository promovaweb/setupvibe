# MCP

`{{bin}} mcp` turns the process into a Model Context Protocol server over stdio. Nothing beyond the protocol is written to stdout; diagnostics go to stderr. The same executable carries the TUI, the CLI and the MCP server.

The server exposes 20 tools, 6 resources and 1 prompt. Tools that run the CLI return the same envelope as `--json`, so the agent sees what a person would see in the terminal. Tools that change the machine dry run by default; `remove` and `migrate` also require `confirm: true`.

## How the server answers

A tool returns `content[0].text` with JSON and, when the output is structured, `structuredContent` with the same object.

CLI-backed tools return the envelope `{ exitCode, ok, command, data }` or `{ exitCode, ok: false, error }`. Native tools (`about`, `exit_codes`, `skill`, `config_list`, `config_get`, `credentials_status`, `health`, `logs`, `tailscale`, `machine`) return the object described in each section.

`isError: true` appears when the CLI exit code is not zero or when the tool refuses the call. The `data` may come with it: `doctor` with a fail finding returns the findings and marks `isError`, with exit code 3. Read `exitCode` before `isError`.

No tool returns a credential value. No tool writes `settings.json`; configuration writes stay in the CLI, where a human confirms them. Tools that change the machine (`install`, `remove`, `update`, `init`, `migrate`) dry run by default.

Before suggesting a command, read `skill` with the `cli` topic. Before calling a tool that installs or removes, run the dry run and show the plan to the person.

## Client configuration

```json
{ "mcpServers": { "{{bin}}": { "command": "{{bin}}", "args": ["mcp"] } } }
```

In OpenCode the block lives in the application configuration:

```json
{ "mcp": { "{{bin}}": { "type": "local", "command": ["{{bin}}", "mcp"], "enabled": true } } }
```

`{{bin}} mcp install` registers the server in Claude Code (`claude mcp add --scope user`), in Codex (`codex mcp add`) and in OpenCode (the `mcp` block of `~/.config/opencode/opencode.json`, with a backup). An agent that is not installed is left out, and running it again does not change what is already configured.

For development without compiling, use `bun` with the edition entry point instead of the binary.

## List without starting

```bash
{{bin}} mcp --list
{{bin}} mcp --list --json
```

The list shows the name and description of each tool, the URI of each resource and the prompt, in the order the server registers them. It is the same list this document describes.

## Tools

| Tool | What it does | Changes the machine |
| --- | --- | --- |
| `about` | identity and runtime of the binary | no |
| `exit_codes` | exit-code table | no |
| `skill` | embedded documentation, whole or by topic | no |
| `config_list` | effective settings.json keys and the schema | no |
| `config_get` | value of one key | no |
| `credentials_status` | names and master key source, without values | no |
| `system` | system, architecture, WSL, headless, public IP and variant | no |
| `list` | inventory items with their status on this system | no |
| `check` | installed items against the pinned versions | no |
| `install` | installs items and requirements | only with `dry_run: false` |
| `remove` | removes items from the user space | only with `dry_run: false` and `confirm: true` |
| `update` | updates items whose pinned version changed | only with `dry_run: false` |
| `health` | only the SetupVibe findings from doctor | no |
| `doctor` | runtime and SetupVibe findings, with the fix | no |
| `report` | Markdown report for an issue | no |
| `init` | SetupVibe prerequisites | only with `dry_run: false` |
| `migrate` | migrates a SetupVibe 1 machine | only with `dry_run: false` and `confirm: true` |
| `logs` | runs and the events of one of them | no |
| `tailscale` | local Tailscale client | no |
| `machine` | system, CPU, memory, disks, network and processes | no |

### Tool `about`

**Purpose.** Identifies the running binary: name, edition, version, runtime, platform, data folder and credits.

**Input.**

None. The tool takes no argument.

**Output.** `bin`, `title`, `version`, `description`, `author`, `site`, `repository`, `license`, `executable`, `runtime`, `platform`, `system`, `pid`, `dataDir` and `credits`, a list with `name`, `role` and `url`.

**Effects and permissions.** Read-only. It writes no file and makes no network call. `pid` and `executable` belong to the MCP server process, not to the client that calls the tool.

**Refusals and limits.** No refusal of its own.

**Examples.**

- **Confirm the edition:** `about {}` returns `bin: "{{bin}}"` and the session `dataDir`, showing which binary serves the call.
- **Check the version:** `about {}` returns `version`, useful before suggesting a flag that only exists in the new release.
- **See the platform:** `about {}` returns `platform: "linux-x64"`, which explains why an item shows in `list` and another does not.
- **Check the data folder:** `about {}` returns the effective `dataDir`, including when the session runs with `SETUPVIBE_HOME` pointing elsewhere.
- **Collect credits:** `about {}` returns `credits` with the role and URL of each project the binary uses.

### Tool `exit_codes`

**Purpose.** Returns the fixed CLI exit-code table, with the symbolic name and description.

**Input.**

None. The tool takes no argument.

**Output.** `codes`, a list with `code`, `name` and `description` of each code, in order.

**Effects and permissions.** Read-only. The table comes from the compiled code, with no file read.

**Refusals and limits.** No refusal of its own.

**Examples.**

- **Explain a partial failure:** `exit_codes {}` shows that 10 is `PARTIAL` and that the rest of the plan stayed applied.
- **Guide on sudo:** `exit_codes {}` shows that 13 is `SUDO_PASSWORD` and that the passwordless rule fixes it.
- **Investigate concurrency:** `exit_codes {}` shows that 30 is `LOCKED`, with another run holding `run.lock`.
- **Handle an interruption:** `exit_codes {}` shows that 130 is `INTERRUPTED` and that nothing was completed.
- **Build the agent table:** `exit_codes {}` returns the 18 codes so the agent can decide without parsing text.

### Tool `skill`

**Purpose.** Returns the documentation embedded in the binary as Markdown, whole or by topic.

**Input.**

| Field | Type | Required | Default | Effect |
| --- | --- | --- | --- | --- |
| `topic` | string | no | everything | `cli`, `tui`, `mcp`, `config`, `exit-codes`, `troubleshooting`, `migration`, `inventory` or `reference` |

**Output.** Markdown in `content[0].text`. The tool does not return `structuredContent`.

**Effects and permissions.** Read-only. The documentation is already compiled into the binary, so the answer needs no network.

**Refusals and limits.** A topic outside the list is rejected by the schema, before the tool runs.

**Examples.**

- **Learn the commands:** `skill { "topic": "cli" }` returns the CLI manual with the reference generated from the registry.
- **Understand the keys:** `skill { "topic": "tui" }` returns the modules, the keys per module and the theme.
- **Investigate a failure:** `skill { "topic": "troubleshooting" }` returns symptom, cause, command and exit code for each situation.
- **Migrate an old machine:** `skill { "topic": "migration" }` returns the SetupVibe 1 guide.
- **Find item ids:** `skill { "topic": "inventory" }` returns the profiles and one table per category.

### Tool `config_list`

**Purpose.** Lists the `settings.json` preferences already merged with the defaults, plus the schema the binary knows.

**Input.**

None. The tool takes no argument.

**Output.** `file` (path), `values` (flattened key to effective value) and `schema`, a list with `key`, `type`, `default`, `values` for an enum and `description`.

**Effects and permissions.** Read-only. It does not create `settings.json`; on a machine without the file, `values` holds the defaults.

**Refusals and limits.** No refusal of its own. An invalid file becomes a tool error while reading the JSON.

**Examples.**

- **See the effective format:** `config_list {}` shows `output.format` with the value in force, not what the file literally holds.
- **Check the palette:** `config_list {}` shows `tui.theme` and the `night` default in the schema.
- **List the defaults:** `config_list {}` shows the value of each key even on a machine without `settings.json`.
- **Read the schema:** `config_list {}` returns `values` and `default` of each key so the agent can validate a choice.
- **Locate the file:** `config_list {}` returns `file`, useful when `SETUPVIBE_HOME` points elsewhere.

### Tool `config_get`

**Purpose.** Returns the effective value of one `settings.json` key.

**Input.**

| Field | Type | Required | Default | Effect |
| --- | --- | --- | --- | --- |
| `key` | string | yes | none | Key in dot notation, such as `output.format`; at least 1 character |

**Output.** `key`, `value` and `exists`. When the key does not exist, `value` is `null` and `exists` is `false`.

**Effects and permissions.** Read-only. It does not create the file and does not change the key.

**Refusals and limits.** An unknown key returns `exists: false` with `isError: true`; there is no CLI exit code on this path. The tool reads `settings.json` only, not `config.json`.

**Examples.**

- **Read the output format:** `config_get { "key": "output.format" }` returns `text` when nothing was written.
- **Read the language:** `config_get { "key": "tui.language" }` returns `pt-BR` or `en`.
- **Handle a missing key:** `config_get { "key": "editor.preferred" }` returns `exists: false` and marks `isError`.
- **Check the icons:** `config_get { "key": "tui.icons" }` returns `true` or `false`.
- **Check the aliases:** `config_get { "key": "shell.agentAliases" }` returns the agent alias switch.

### Tool `credentials_status`

**Purpose.** Shows the vault state: file, existence, master key source and stored names, without values.

**Input.**

None. The tool takes no argument.

**Output.** `file`, `exists`, `masterKeySource` (`env`, `file` or `none`), `count` and `names`, a list of names.

**Effects and permissions.** Read-only. It does not create the vault or the key. It never returns a credential value.

**Refusals and limits.** No refusal of its own. An unreadable vault shows `count: 0` and no names, without exposing the content.

**Examples.**

- **See whether the vault exists:** `credentials_status {}` returns `exists: false` on a new machine.
- **Check the key source:** `credentials_status {}` returns `masterKeySource: "env"` when the key comes from the variable.
- **Count credentials:** `credentials_status {}` returns `count` and `names`, with no value.
- **Check names:** `credentials_status {}` shows `github.token` or `openai.api_key` once they were stored.
- **Investigate an empty vault:** `credentials_status {}` shows `count: 0` after `credentials clear`, with `exists: true`.

### Tool `system`

**Purpose.** Describes the detected machine: system, version, architecture, WSL, headless, public IP, variant and SetupVibe 1 traces.

**Input.**

None. The tool takes no argument.

**Output.** CLI envelope with `data.edition`, `system`, `id`, `name`, `version`, `arch`, `wsl`, `headless`, `publicIp`, `variant`, `distro` when present and `setupvibe1`, with `found`, `edition` and `traces`.

**Effects and permissions.** Read-only. It runs `system --no-update-check`, so it prints no version notice and changes no file.

**Refusals and limits.** An unsupported system returns exit code 11 (`UNSUPPORTED_SYSTEM`) and the tool marks `isError`. The tool uses `--no-update-check`, so it returns no `update` block; use the CLI to see it.

**Examples.**

- **Decide compatibility:** `system {}` returns `system: "debian"` and `arch: "x64"` before suggesting an item.
- **Check WSL:** `system {}` returns `wsl: true` when the distribution runs inside WSL.
- **See a headless machine:** `system {}` returns `headless: true` and explains why GUI items leave the selection.
- **Choose the Portainer layout:** `system {}` returns `variant: "remote-exposed"` when the machine has a public IP.
- **Detect SetupVibe 1:** `system {}` returns `setupvibe1.found` and the `traces` list, before suggesting `migrate`.

### Tool `list`

**Purpose.** Lists the edition inventory items with the status of each one on this machine.

**Input.**

| Field | Type | Required | Default | Effect |
| --- | --- | --- | --- | --- |
| `category` | string | no | all | Category id, such as `ai`, `languages` or `security` |

**Output.** Envelope with `data.system` and `data.items`, each item with `id`, `name`, `category`, `version`, `default`, `status` and `elsewhere` when the command comes from another manager.

**Effects and permissions.** Read-only. It does not install, remove or change `selection.json`.

**Refusals and limits.** An unsupported system returns exit code 11. An unknown category returns an empty list, without an error.

**Examples.**

- **See the whole inventory:** `list {}` returns every item of the edition with the current status.
- **Focus on AI agents:** `list { "category": "ai" }` returns only the `ai` category.
- **Find items from another manager:** `list {}` shows `status: "other"` and `elsewhere` with the path of the current copy.
- **Separate what is missing:** `list {}` shows `available`, `failed` and `outdated`, which the agent uses to choose the next step.
- **Feed an install:** `list { "category": "languages" }` returns ids valid for the `install` tool.

### Tool `check`

**Purpose.** Checks installed items against the version pinned in the inventory, running each item check.

**Input.**

| Field | Type | Required | Default | Effect |
| --- | --- | --- | --- | --- |
| `items` | array of string | no | the selection | Item ids, each in the `[a-z0-9][a-z0-9-]*` format |

**Output.** Envelope with `data.system` and `data.results`, each result with `id`, `status` (`ok` or `fail`), `output` and `expected` when the item declares the expected version.

**Effects and permissions.** Read-only. It runs the verification command of each item and installs or fixes nothing.

**Refusals and limits.** An unknown item returns exit code 2 (`USAGE`). A failing item makes the CLI exit with 10 (`PARTIAL`) and the tool mark `isError`, even with the results in `data`.

**Examples.**

- **Check the selection:** `check {}` returns one result per selected item.
- **Check one item:** `check { "items": ["node"] }` shows the found and the expected version.
- **Find a wrong version:** `check { "items": ["node", "uv"] }` returns `status: "fail"` on the item off its version.
- **Explain the failure:** `check { "items": ["docker"] }` returns `output` and `expected` to show the person what differs.
- **Before updating:** `check { "items": ["node", "docker"] }` confirms what is off before `update`.

### Tool `install`

**Purpose.** Installs inventory items and their requirements, or a mise tool outside the inventory with `external: true`, with a plan by default.

**Input.**

| Field | Type | Required | Default | Effect |
| --- | --- | --- | --- | --- |
| `items` | array of string | yes | none | Item ids, or one mise tool with `external: true`; at least 1 |
| `dry_run` | boolean | no | `true` | `true` returns the plan; `false` installs |
| `force` | boolean | no | `false` | `true` reinstalls items that already pass their check |
| `external` | boolean | no | `false` | `items` carries one mise tool outside the inventory, such as `terraform`; the version is pinned and recorded in `external.json` |

**Output.** Envelope with `data.dryRun` and `data.steps` (id, description, commands, action) in the plan, or `data.results` and `data.log` in the real run. With `external`, it returns `tool` and `version`. Without `init`, it returns `data.init: false`.

**Effects and permissions.** With `dry_run: true`, no file changes. With `false`, it installs in the user space, may use `sudo` and the network, writes the log and updates `selection.json`; with `external`, it records the tool and version in `external.json`.

**Refusals and limits.** Without `init` it returns exit code 3 (`CONFIG`). An unknown id returns 2 (`USAGE`) and a tool mise does not know returns 6 (`NOT_FOUND`). `sudo` without a password returns 13 (`SUDO_PASSWORD`), an unsupported item returns 11 and a partial failure returns 10. All of them mark `isError`. With `external: true`, the schema accepts only `tool` without a version; `tool@version` and dotted names are rejected by validation, so use the CLI when the exact version matters.

**Examples.**

- **Plan before installing:** `install { "items": ["node"], "dry_run": true }` returns the steps without changing the machine.
- **Install two items:** `install { "items": ["node", "uv"], "dry_run": false }` installs and returns `results`.
- **Reinstall a broken item:** `install { "items": ["docker"], "dry_run": false, "force": true }` redoes it even with a passing check.
- **Find the blocker:** `install { "items": ["node"], "dry_run": false }` before `init` returns exit 3 with `data.init: false`.
- **Install an external tool:** `install { "items": ["terraform"], "external": true, "dry_run": true }` shows the mise plan for the latest version, recorded in `external.json`.

### Tool `remove`

**Purpose.** Removes items installed in the user space or an app installed with `install --external`, with a plan by default and mandatory confirmation in the real run.

**Input.**

| Field | Type | Required | Default | Effect |
| --- | --- | --- | --- | --- |
| `items` | array of string | yes | none | Item ids, or one app with `external: true`; at least 1 |
| `dry_run` | boolean | no | `true` | `true` returns the plan; `false` removes |
| `confirm` | boolean | no | `false` | The person confirmed the removal; required with `dry_run: false` |
| `include_native` | boolean | no | `false` | Also removes system package manager packages |
| `force` | boolean | no | `false` | Removes even when another selected item requires it, or when `init` found it already installed |
| `external` | boolean | no | `false` | `items` carries one app installed with `install --external` |

**Output.** Envelope with `data.steps` in the plan or `data.results` in the real run. A local refusal returns `{ exitCode: 2, ok: false, error }`.

**Effects and permissions.** With `dry_run: true`, nothing changes. With `false` and `confirm: true`, it removes what SetupVibe installed, updates `selection.json` and writes the log; with `external`, it removes the app and updates `external.json`; with `force`, it removes an adopted item or one required by another selected item.

**Refusals and limits.** Without `confirm` and with `dry_run: false`, the tool refuses before running the CLI, with exit code 2. An unknown id returns 2, an item required by another selected item or adopted by `init` leaves only with `force: true`, and the refusal without force returns 10 (`PARTIAL`). An app not installed with `external` returns 6 (`NOT_FOUND`).

**Examples.**

- **See the plan:** `remove { "items": ["node"], "dry_run": true }` returns the steps without removing anything.
- **Remove after confirmation:** `remove { "items": ["node"], "dry_run": false, "confirm": true }` removes and returns `results`.
- **Test the refusal:** `remove { "items": ["node"], "dry_run": false }` returns exit 2 and the message to ask for confirmation first.
- **Include the system package:** `remove { "items": ["docker"], "dry_run": true, "include_native": true }` shows the plan with the native package.
- **Remove an external app:** `remove { "items": ["terraform"], "external": true, "dry_run": false, "confirm": true }` removes the app and updates `external.json`.

### Tool `update`

**Purpose.** Updates the selected items whose pinned version changed in this binary's inventory.

**Input.**

| Field | Type | Required | Default | Effect |
| --- | --- | --- | --- | --- |
| `dry_run` | boolean | no | `true` | `true` returns the plan; `false` updates |

**Output.** Envelope with `data.steps` in the plan or `data.results` in the real run, plus `data.outdated`, with `id`, `from` and `to` of each item.

**Effects and permissions.** With `dry_run: true`, nothing changes. With `false`, it reinstalls the outdated items, writes the log and updates `selection.json`.

**Refusals and limits.** Without `init` it returns 3 (`CONFIG`), a partial failure returns 10, an unsupported system returns 11 and `sudo` without a password returns 13. The tool does not expose `--external`.

**Examples.**

- **Plan the update:** `update { "dry_run": true }` returns `outdated` and the steps.
- **Apply it:** `update { "dry_run": false }` reinstalls what changed and returns `results`.
- **Confirm it is current:** `update {}` returns `outdated: []` when nothing changed.
- **After an upgrade:** `update { "dry_run": true }` shows what the new binary now pins.
- **See a partial failure:** `update { "dry_run": false }` returns exit 10 with the steps that failed.

### Tool `health`

**Purpose.** Returns only the SetupVibe findings that `doctor` shows: prerequisites, items, shell, SetupVibe 1 leftovers and exposed containers.

**Input.**

None. The tool takes no argument.

**Output.** `ok` and `findings`, each finding with `id`, `level` (`ok`, `warn` or `fail`), `text`, `fix` when present, `safe` when `doctor --fix` applies it and `params` with the values used in the text.

**Effects and permissions.** Read-only. It checks files, PATH and containers; it applies no fix and writes nothing.

**Refusals and limits.** It has no refusal of its own and does not mark `isError` for a finding: `ok: false` appears when a warning or problem exists.

**Examples.**

- **See what is missing before init:** `health {}` returns the `init` finding with the pending prerequisites.
- **After a failure:** `health {}` shows the items failing their check and the command that fixes them.
- **Find SetupVibe 1:** `health {}` returns the `v1` finding with the traces found.
- **Check exposed containers:** `health {}` returns `docker-exposed` when a container publishes a port on every interface.
- **Compare with doctor:** `health {}` brings only the SetupVibe findings; for the runtime and the terminal, use the `doctor` tool.

### Tool `doctor`

**Purpose.** Runs the CLI `doctor`: runtime, terminal and configuration checks plus the SetupVibe findings, each with the command that fixes it.

**Input.**

None. The tool takes no argument.

**Output.** Envelope with `data.ok`, `data.runtime` (each check with `name`, `status` and `detail`) and `data.findings`, as in the `health` tool.

**Effects and permissions.** Read-only. It applies no fix; for that, use `{{bin}} doctor --fix` in the terminal.

**Refusals and limits.** With a fail finding, the CLI returns exit code 3 (`CONFIG`) and the tool marks `isError`, even with the data in the envelope. Through MCP, the stdin and stdout checks warn that they are not a TTY, because the subprocess uses pipes.

**Examples.**

- **Full diagnosis:** `doctor {}` returns runtime and findings in the same call.
- **Before installing:** `doctor {}` shows a pending init and failing items, before an `install`.
- **After a failure:** `doctor {}` returns the finding with the command that fixes it and `isError` when there is a fail.
- **Check the configuration:** `doctor {}` shows a missing settings file, the master key and the vault source.
- **Separate runtime from findings:** use `doctor {}` for everything and `health {}` only for the SetupVibe findings.

### Tool `report`

**Purpose.** Builds the machine report in Markdown to attach to an issue, without secrets.

**Input.**

None. The tool takes no argument.

**Output.** Envelope with `data.markdown`, the same text as `{{bin}} report`: binary, system, init, doctor, selected items, external apps, last run and the final log events.

**Effects and permissions.** Read-only. It writes no file; to generate one, use `{{bin}} report --output file.md`.

**Refusals and limits.** No refusal of its own. The CLI returns 0 and the tool does not mark `isError`.

**Examples.**

- **Open an issue:** `report {}` returns the Markdown to paste into the bug form.
- **After a failure:** `report {}` includes the failed steps and the end of the log.
- **Ask for help:** `report {}` brings system, version and doctor findings without asking the person for a command.
- **Compare two machines:** `report {}` on each one shows differences in system and selection.
- **Check the masking:** `report {}` brings no credential value and no environment dump.

### Tool `init`

**Purpose.** Checks the requirements and installs the SetupVibe prerequisites (build dependencies and mise), with a plan by default.

**Input.**

| Field | Type | Required | Default | Effect |
| --- | --- | --- | --- | --- |
| `dry_run` | boolean | no | `true` | `true` returns the plan and the checks; `false` installs |

**Output.** Envelope with `data.checks` and `data.steps` in the plan, or `data.results` in the real run. Success writes the `init` record to `config.json`.

**Effects and permissions.** With `dry_run: true`, nothing changes, but the network and clock checks run. With `false`, it installs the `initOnly` items and writes `config.json`.

**Refusals and limits.** Root without `--user` returns 12, the other edition set up returns 2, low disk returns 14, network or clock off returns 5, unsupported system returns 11, `sudo` without a password returns 13 and a partial failure returns 10. The tool does not expose `--skip-network-check`.

**Examples.**

- **Check before installing:** `init { "dry_run": true }` returns the checks and the prerequisite plan.
- **Install the prerequisites:** `init { "dry_run": false }` installs build deps and mise and records the `init`.
- **See the disk blocker:** `init { "dry_run": true }` returns the `disk` check with `fail` and exit code 14.
- **Check the edition:** `init { "dry_run": true }` shows the `edition` check when the other edition is already set up.
- **After fixing the network:** `init { "dry_run": false }` runs the checks again and moves to the plan.

### Tool `migrate`

**Purpose.** Moves a machine set up by SetupVibe 1 to SetupVibe 2, with a plan by default and mandatory confirmation in the real run.

**Input.**

| Field | Type | Required | Default | Effect |
| --- | --- | --- | --- | --- |
| `dry_run` | boolean | no | `true` | `true` returns the plan, the moved lines and the kept duplicates |
| `confirm` | boolean | no | `false` | The person confirmed the migration; required with `dry_run: false` |
| `remove_legacy` | array of enum | no | none | `go`, `rbenv`, `npm-global`, `nodesource` or `all`, for the real run |

**Output.** Envelope with `data.v1`, `data.moved` (lines per file), `data.removeLegacy`, `data.keptLegacy`, `data.steps` in the plan, or `data.results` in the real run.

**Effects and permissions.** With `dry_run: true`, nothing changes. With `false` and `confirm: true`, it copies the files to `backups/`, moves the personal lines to the `.local` files, writes the blocks, may remove duplicates and writes `migratedFromV1` to `config.json`.

**Refusals and limits.** Without `confirm` and with `dry_run: false`, the tool refuses with exit code 2. An unsupported system returns 11, `sudo` without a password returns 13 and a partial failure returns 10. Linuxbrew is never removed, and the plan shows its uninstaller.

**Examples.**

- **Read the plan:** `migrate { "dry_run": true }` returns the SetupVibe 1 traces and the lines moving to the `.local` files.
- **Check the masked secrets:** `migrate { "dry_run": true }` shows `TOKEN` and `KEY` as `****` in the moved lines.
- **Migrate and remove duplicates:** `migrate { "dry_run": false, "confirm": true, "remove_legacy": ["go", "rbenv"] }`.
- **Keep the duplicates:** `migrate { "dry_run": false, "confirm": true }` migrates without removing anything.
- **Machine without traces:** `migrate { "dry_run": true }` returns `found: false` and the message that there is nothing to migrate.

### Tool `logs`

**Purpose.** Lists the runs stored in `~/.setupvibe/logs` and returns the events of one of them.

**Input.**

| Field | Type | Required | Default | Effect |
| --- | --- | --- | --- | --- |
| `run` | string | no | the newest run | Log file name returned in `runs` |

**Output.** `ok`, `runs` (newest first), `run` (the chosen one or `null`), `events` with `time`, `item`, `action`, `status` and `message`, and `failed`, the count of failed events.

**Effects and permissions.** Read-only. It neither deletes nor writes a log.

**Refusals and limits.** A name outside `runs` returns `{ ok: false, error, runs }` and marks `isError`, without running the CLI.

**Examples.**

- **See the last run:** `logs {}` returns the events of the newest run.
- **Open a specific run:** `logs { "run": "2026-11-13T...-auto.log" }` returns the events of that file.
- **Count failures:** `logs {}` returns `failed`, the count of events with status fail.
- **Machine without a run:** `logs {}` returns `runs: []` and `run: null`.
- **Investigate an install:** `logs {}` shows the item event with the error message below the step.

### Tool `tailscale`

**Purpose.** Reads the local Tailscale client: this machine state, tailnet, machines with the connection type, published services and health warnings.

**Input.**

None. The tool takes no argument.

**Output.** `ok: true`, `installed`, `state`, `version`, `authUrl` when login is needed, `tailnet`, `self`, `health`, `peers`, `exitNodeInUse`, `serve` and `error` when the read fails.

**Effects and permissions.** Read-only. It calls the local client (`tailscale status` and `serve`), without the Tailscale API, and may take a few seconds.

**Refusals and limits.** No refusal of its own: without the client installed it returns `installed: false`. The network check (`netcheck`) lives in the TUI Tailscale module.

**Examples.**

- **See whether the client exists:** `tailscale {}` returns `installed: false` when Tailscale is not on the machine.
- **Read the state:** `tailscale {}` returns `state: "Running"` and the machine IP in `self.ips`.
- **List the machines:** `tailscale {}` returns `peers` with `online`, `relay` and `lastSeen` of each one.
- **Check services:** `tailscale {}` returns `serve` with the published address and the target.
- **See the exit node:** `tailscale {}` returns `exitNodeInUse` when the machine uses an exit node.

### Tool `machine`

**Purpose.** Returns one reading of the machine: host, kernel, uptime, CPU, load, memory, swap, disks, network and the processes using the most CPU.

**Input.**

| Field | Type | Required | Default | Effect |
| --- | --- | --- | --- | --- |
| `processes` | integer | no | `8` | How many processes to return, from 0 to 50 |

**Output.** `ok: true`, `info` (hostname, kernel, architecture, CPU model and cores, load, memory, swap, uptime, disks and interfaces) and `live` (cpu, perCore, memUsed, memTotal, swapUsed, swapTotal, load, net, disks, temps, processes, processCount and uptimeSec).

**Effects and permissions.** Read-only. It waits about one second between two readings, because CPU and network are computed as a delta.

**Refusals and limits.** No refusal of its own. A `processes` value outside 0 to 50 is rejected by the schema.

**Examples.**

- **Snapshot of the machine:** `machine {}` returns `info` and `live` with the eight processes using the most CPU.
- **See more processes:** `machine { "processes": 20 }` returns twenty processes.
- **Only the summary:** `machine { "processes": 0 }` returns `live.processes: []` and keeps CPU, memory and disks.
- **Check memory and swap:** `machine {}` returns `live.memUsed`, `memTotal`, `swapUsed` and `swapTotal`.
- **Check the disks:** `machine {}` returns `info.disks` with usage, free space and percentage per mount point.

## Resources

Resources are passive reads, with no argument beyond the URI. The `<bin>://` scheme avoids a collision with other servers in the same client.

### Resource `{{bin}}://inventory`

**Purpose.** Returns the edition inventory as JSON: the same record the binary uses to install, verify and list.

**Input.**

No parameter beyond the URI.

**Output.** `schemaVersion`, `edition`, `systems`, `categories`, `repositories`, `profiles` and `items`; each item carries `id`, `name`, `description`, `version`, `versionPolicy`, `install`, `verify`, `requires`, `plugins` and `flags`, when present.

**Effects and permissions.** Read-only. The content is embedded in the binary and depends on no network or local file.

**Refusals and limits.** No refusal of its own.

**Examples.**

- **Find ids:** read `{{bin}}://inventory` before building `install` or `remove`.
- **Check the pinned version:** find the item and read `version` and `versionPolicy`.
- **See the profiles:** `profiles` carries the edition profiles, such as `essencial`, with the item list of each one.
- **Check the method:** `install` shows the method per system, such as `mise`, `native` or `installer`.
- **Audit an item:** `verify` shows the command and the expected value used by `check`.

### Resource `{{bin}}://selection`

**Purpose.** Returns the `selection.json` of this machine: the chosen items, the installed version and the status of the last check.

**Input.**

No parameter beyond the URI.

**Output.** `schemaVersion`, `profile`, `items` with `id`, `version`, `status` (`ok` or `fail`) and `adopted` when `init` found the item already installed. Without the file, it returns `items: []`.

**Effects and permissions.** Read-only. It neither creates nor changes the selection.

**Refusals and limits.** No refusal of its own.

**Examples.**

- **See what was chosen:** read `{{bin}}://selection` before suggesting `update`.
- **Find an adopted item:** `adopted: true` marks an item `init` found on the machine.
- **See check failures:** `status: "fail"` marks the item that needs `install --force` in the CLI.
- **Check the installed version:** compare `version` with the inventory to find what is off.
- **New machine:** the resource returns `items: []` before the first `init`.

### Resource `{{bin}}://about`

**Purpose.** Returns the binary identity and runtime as JSON, the same as the `about` tool.

**Input.**

No parameter beyond the URI.

**Output.** The same fields as the `about` tool: `bin`, `title`, `version`, `edition`, `runtime`, `platform`, `system`, `pid`, `dataDir` and `credits`.

**Effects and permissions.** Read-only. It writes nothing and makes no network call.

**Refusals and limits.** No refusal of its own.

**Examples.**

- **Check the version:** read `{{bin}}://about` before quoting a new behavior.
- **Check the edition:** `bin` and `title` show whether the session is desktop or server.
- **Check the folder:** `dataDir` shows the effective data folder.
- **Collect credits:** `credits` brings the name, role and URL of each project.
- **Check the platform:** `platform` shows the system and architecture of the process.

### Resource `{{bin}}://exit-codes`

**Purpose.** Returns the exit-code table as JSON, the same as the `exit_codes` tool.

**Input.**

No parameter beyond the URI.

**Output.** `codes`, with `code`, `name` and `description` of each code.

**Effects and permissions.** Read-only.

**Refusals and limits.** No refusal of its own.

**Examples.**

- **Build the handling:** read `{{bin}}://exit-codes` to map the codes in the agent.
- **Explain 10:** confirm `PARTIAL` and the message before answering the person.
- **Explain 13:** confirm `SUDO_PASSWORD` and the passwordless rule.
- **Explain 30:** confirm `LOCKED` and the run lock.
- **Explain 130:** confirm `INTERRUPTED` and that nothing was completed.

### Resource `{{bin}}://skill`

**Purpose.** Returns all the embedded documentation as Markdown, like `{{bin}} --skill` without a topic.

**Input.**

No parameter beyond the URI.

**Output.** Markdown with the README, the CLI, the TUI, the MCP, the configuration, the exit codes, the troubleshooting, the migration and the inventory.

**Effects and permissions.** Read-only. The answer is long and consumes context.

**Refusals and limits.** No refusal of its own.

**Examples.**

- **Read everything before operating:** read `{{bin}}://skill` in a session with no prior knowledge.
- **Check the documentation of a version:** the text comes from the running binary, not from the repository.
- **Prepare a new agent:** hand the Markdown over as the starting instruction.
- **Audit the embedded doc:** compare the Markdown with the files in `docs/`.
- **Avoid when context is short:** prefer `{{bin}}://skill/cli` for a CLI task.

### Resource `{{bin}}://skill/{topic}`

**Purpose.** Returns one section of the embedded documentation.

**Input.**

| Field | Type | Required | Default | Effect |
| --- | --- | --- | --- | --- |
| `topic` | string in the URI | yes | none | `cli`, `tui`, `mcp`, `config`, `exit-codes`, `troubleshooting`, `migration`, `inventory` or `reference` |

**Output.** Markdown of the requested section. The template lists one resource per topic.

**Effects and permissions.** Read-only. The language follows `SETUPVIBE_LANG`.

**Refusals and limits.** A topic outside the list returns a resource read error, with the list of accepted topics.

**Examples.**

- **Learn the CLI:** read `{{bin}}://skill/cli` before suggesting a command.
- **Check keys:** read `{{bin}}://skill/tui` to guide someone in the TUI.
- **Solve a failure:** read `{{bin}}://skill/troubleshooting`.
- **Migrate a machine:** read `{{bin}}://skill/migration` before calling `migrate`.
- **Find items:** read `{{bin}}://skill/inventory` for one table per category.

## Prompts

### Prompt `operate`

**Purpose.** Builds the starting instruction for an agent to operate the binary: read the documentation, run the CLI with `--json` and handle the exit code.

**Input.**

| Field | Type | Required | Default | Effect |
| --- | --- | --- | --- | --- |
| `task` | string | yes | none | What the person wants to do with the binary |

**Output.** One user message in `messages`, with the binary name and version, the reading order and the received task.

**Effects and permissions.** None. The prompt runs no command; it prepares the conversation.

**Refusals and limits.** Without `task`, the schema rejects the call.

**Examples.**

- **Start a session:** `operate { "task": "install the development environment" }` returns the full instruction.
- **Diagnose:** `operate { "task": "find out why node is off its version" }` guides the agent to read the CLI and run `check`.
- **Migrate:** `operate { "task": "migrate this machine from SetupVibe 1" }` guides the agent to read `migration` before `migrate`.
- **Provision a server:** `operate { "task": "prepare a VPS with Docker Swarm" }` guides the server flow.
- **Review configuration:** `operate { "task": "check settings.json and the vault" }` guides the agent to read `config` and use `config_list`.

## Configure in the agents

`{{bin}} mcp install` finds the agents in `PATH`, in `~/.local/bin` and in the mise shims, and registers the server with the absolute path of the binary. In OpenCode the file is read, the `mcp` block is merged and the previous copy stays in `opencode.json.setupvibe.bak`.

```bash
{{bin}} mcp install --dry-run
{{bin}} mcp install
{{bin}} mcp install --json
```

A missing agent appears as `not installed` on stderr and in `data.skipped`. The run is idempotent: `mcp get` avoids registering it twice.

## Adding a tool

1. Create the file in `shared/core/mcp/tools/<name>.ts` (framework tool) or add the tool in `shared/mcp/tools.ts` (SetupVibe operation).
2. Declare `inputSchema` with Zod and describe each field with `.describe()`; use `.default()` for the default that shows in the schema.
3. Return `content` as text and `structuredContent` with the same object. Mark `isError` when the call fails.
4. Register it in the `catalog` (`tools`, `resources` or `prompts`) so `mcp --list` sees the item.
5. Register the function in `registerAll` of `shared/core/mcp/server.ts`.
6. Document the tool in this file, with the five usage situations, and run `bun test`.

Tool names use `snake_case`. The description says when to use it and what it returns. A tool that writes must say so and never echo a secret.

## Testing

```bash
npx @modelcontextprotocol/inspector {{bin}} mcp
{{bin}} mcp --list --json
bun test shared/tests/mcp-tools.test.ts shared/tests/docs-mcp-reference.test.ts
```

The Inspector opens a local page to call tools, read resources and follow the JSON-RPC messages. The documentation test compares `mcp --list` with this file in both languages and both editions.
