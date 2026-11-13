# {{title}} documentation

`{{bin}}` installs and maintains a development environment with pinned versions on macOS, Linux (Ubuntu, Debian, Mint, Zorin, Arch and Omarchy), Windows and WSL. It also runs on servers and VPS machines for development over remote access. The official list of what it installs is the inventory embedded in the binary.

`{{bin}}` is a single executable with three modes:

| Mode | How to enter | For |
| --- | --- | --- |
| TUI | `{{bin}}` without arguments in an interactive terminal | people |
| CLI | `{{bin}} <command> [options]`, with text or `--json` output | people, scripts and agents |
| MCP | `{{bin}} mcp`, a Model Context Protocol server over stdio | AI agents |

The three modes share the same identity, the same configuration
(`~/.setupvibe/settings.json`), the same credential vault
(`~/.setupvibe/credentials.json`, encrypted) and the same exit code table.
`setupvibe` and `setupvibe-server` share the `~/.setupvibe/` folder and the
`SETUPVIBE_` variable prefix, because only one of them is installed on a
machine.

## Automatic installation

`{{bin}} auto` installs everything without asking, for headless machines,
provisioning and agents. The answers come from options, from `SETUPVIBE_*`
variables or from a `--config` file. As root, `--user` creates the working user
and `auto` continues as that user. Without `--profile`, every inventory item
compatible with the system goes in; GUI items stay out on a machine without a
display.

```bash
{{bin}} auto --dry-run          # show the plan without changing anything
{{bin}} auto --user deploy --ssh-key "ssh-ed25519 AAAA..."
```

The full result goes to `~/.setupvibe/last-run.json`. The exit codes are in
[exit-codes.md](exit-codes.md).

## Inventory items

After `init`, `{{bin}} list` shows each item and its status on this system,
`{{bin}} install <items>` installs items and their requirements, `{{bin}} remove
<items> --yes` removes what was installed in the user space and `{{bin}} update`
updates the items whose pinned version changed. `{{bin}} install --external
<tool>` installs a tool outside the inventory through mise, with a pinned
version.

## Terminal environment

`{{bin}} auto` configures the shell, the prompt and tmux. The changes in
`~/.zshrc` (or `~/.bashrc` on Omarchy) and in `~/.tmux.conf` stay between the
`# >>> setupvibe >>>` and `# <<< setupvibe <<<` markers, with a backup before
the first change. Personal settings go in `~/.zshrc.local`, `~/.bashrc.local`
and `~/.tmux.conf.local`. `{{bin}} shell apply` applies the configuration again
and `{{bin}} shell remove` takes the blocks out.

## Maintenance

- `{{bin}} doctor --fix` checks the system, the init, the items and SetupVibe 1
  leftovers, and applies the safe fixes.
- `{{bin}} upgrade` replaces the binary with the new version, verified against
  SHA256SUMS.
- `{{bin}} config export file.json` and `{{bin}} config import file.json` repeat
  the selection on another machine.
- `{{bin}} report` builds the report to attach to an issue, without secrets.
- `{{bin}} ssh copy-id user@server` authorizes your SSH key on a server.
- `{{bin}} mcp install` registers the MCP server in Claude Code, Codex and OpenCode; `{{bin}} mcp --list` shows the tools.
- `{{bin}} skill -- add owner/repo` uses the Vercel skills CLI.
- `{{bin}} self uninstall --yes` removes SetupVibe and keeps backups and
  Portainer data.
- `{{bin}} docs` prints this documentation, like `--skill`.

## Map

- [cli.md](cli.md): commands, global options, output conventions and the reference generated from the registry.
- [tui.md](tui.md): Home, modules, keys per module, theme and how to create a module.
- [mcp.md](mcp.md): tools, resources and prompt, with input, output, effects, refusals and examples, and the client configuration.
- [configuration.md](configuration.md): settings.json, state files, credentials.json, master key and environment variables.
- [exit-codes.md](exit-codes.md): exit code table, the codes of each command and how to handle them.
- [troubleshooting.md](troubleshooting.md): symptom, cause, command and exit code for the failures the binary handles.
- [migration.md](migration.md): the guide for people coming from SetupVibe 1, with what `migrate` converts and what it asks.

## Embedded documentation

The binary embeds `README.md`, `cli.md`, `tui.md`, `mcp.md`, `configuration.md`,
`exit-codes.md`, `troubleshooting.md` and `migration.md`, in both languages. An agent reads that reference without
access to the repository:

```bash
{{bin}} --skill          # everything
{{bin}} --skill cli      # only the CLI section, with the generated reference
{{bin}} --skill mcp --json
```

`{{bin}} --skill` and `{{bin}} docs` accept `cli`, `tui`, `mcp`, `config`,
`exit-codes`, `troubleshooting`, `migration`, `inventory` and `reference`. The
`inventory` topic is generated from the embedded inventory, with the profiles
and one table per category. The `reference` topic holds only the reference
generated from the registry, with commands, options and exit codes.

## Language

The code, the command and option names, the configuration keys, the `--json`
fields and the binary messages are in English. This documentation exists in
Brazilian Portuguese and in English, with the technical terms kept in English.
`SETUPVIBE_LANG`, or `--lang` in `{{bin}} docs`, choose the embedded version.

## Coming from SetupVibe 1

On a machine set up by SetupVibe 1, `{{bin}} system` and `{{bin}} doctor` show
what it left. `{{bin}} migrate --dry-run` shows the plan, and
[migration.md](migration.md) explains each step: the old `.zshrc` and
`.tmux.conf` go to `~/.setupvibe/backups/`, the lines you added move to
`~/.zshrc.local` and `~/.tmux.conf.local`, `ssh_copy_id` keeps working as a
shortcut to `{{bin}} ssh copy-id`, and the duplicates (Go in `~/.local/go`,
rbenv, `~/.npm-global`, NodeSource) leave only when you confirm each one. `auto`
also converts `.zshrc` and `.tmux.conf` before writing the new blocks, so
nothing loads twice.
