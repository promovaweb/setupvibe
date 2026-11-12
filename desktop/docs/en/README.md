# {{title}} documentation

`{{bin}}` installs and maintains a development environment with pinned versions on macOS, Linux (Ubuntu, Debian, Mint, Zorin, Arch and Omarchy), Windows and WSL. It also runs on servers and VPS for remote development. The official list of what it installs is the inventory embedded in the binary.

`{{bin}}` is a single executable with three modes:

| Mode | How to enter | For whom |
| --- | --- | --- |
| TUI | `{{bin}}` with no arguments in an interactive terminal | people |
| CLI | `{{bin}} <command> [options]`, with text or `--json` output | people, scripts and agents |
| MCP | `{{bin}} mcp`, Model Context Protocol server over stdio | AI agents |

The three modes share the same identity, the same configuration
(`~/.setupvibe/settings.json`), the same credential vault
(`~/.setupvibe/credentials.json`, encrypted) and the same exit code table.
`setupvibe` and `setupvibe-server` use the same `~/.setupvibe/` folder and the
`SETUPVIBE_` prefix for variables, because only one of them is installed per
machine.

## Automatic installation

`{{bin}} auto` installs everything without asking any questions, for headless
machines, provisioning and agents. Answers come from options, from
`SETUPVIBE_*` variables or from a `--config` file. As root, `--user` creates the
working user and `auto` continues as that user. Without `--profile`, the whole
inventory compatible with the system is included; graphical items are left out
on headless machines.

```bash
{{bin}} auto --dry-run          # show the plan without changing anything
{{bin}} auto --user deploy --ssh-key "ssh-ed25519 AAAA..."
```

The full result is stored in `~/.setupvibe/last-run.json`. The exit codes are
listed in the exit codes section.

## Inventory items

After `init`, `{{bin}} list` shows each item and its status on this
system, `{{bin}} install <items>` installs items and their dependencies,
`{{bin}} remove <items> --yes` removes what was installed in the user's
space and `{{bin}} update` updates the items whose pinned version changed.
`{{bin}} install --external <tool>` installs an app outside the
inventory through mise, with a pinned version.

## Terminal environment

`{{bin}} auto` configures the shell, the prompt and tmux. Changes to
`~/.zshrc` (or `~/.bashrc` on Omarchy) and to `~/.tmux.conf` stay between the
markers `# >>> setupvibe >>>` and `# <<< setupvibe <<<`, with a backup copy
before the first change. Customizations go in `~/.zshrc.local`,
`~/.bashrc.local` and `~/.tmux.conf.local`. `{{bin}} shell apply` redoes the
configuration and `{{bin}} shell remove` removes the blocks.

## Maintenance

- `{{bin}} doctor --fix` checks the system, the init, the items and leftovers
  from SetupVibe 1, and applies the safe fixes.
- `{{bin}} upgrade` replaces the binary with the new version, verified against
  SHA256SUMS.
- `{{bin}} config export file.json` and `{{bin}} config import file.json`
  repeat the selection on another machine.
- `{{bin}} report` generates the report to attach to an issue, without secrets.
- `{{bin}} ssh copy-id user@server` authorizes your SSH key on a server.
- `{{bin}} skill -- add owner/repo` uses the Vercel skills CLI.
- `{{bin}} self uninstall --yes` removes SetupVibe and keeps backups and
  Portainer data.
- `{{bin}} docs` shows this documentation, like `--skill`.

## Map

- [cli.md](cli.md): commands, global options, output conventions and the generated registry reference.
- [tui.md](tui.md): tabs, keys, theme and how to create a screen.
- [mcp.md](mcp.md): tools, resources, prompts and client configuration.
- [configuration.md](configuration.md): settings.json, credentials.json, master key and environment variables.
- [exit-codes.md](exit-codes.md): exit code table and how to handle the codes.

## Embedded documentation

This whole folder is included in the binary. An agent can read all of it
without access to the repository:

```bash
{{bin}} --skill          # tudo
{{bin}} --skill cli      # só a seção do CLI, com a referência gerada
{{bin}} --skill mcp --json
```

The accepted topics are `cli`, `tui`, `mcp`, `config`, `exit-codes` and
`reference`. The `reference` topic contains only the generated registry
reference, with commands, options and exit codes.

## Language

The code, the names of commands, options and configuration keys, the `--json`
fields and the binary's messages are in English. This documentation is
available in Brazilian Portuguese and in English. The framework skills are in
Brazilian Portuguese, with technical terms kept in English.

## Coming from SetupVibe 1

On a machine set up by SetupVibe 1, `{{bin}} system` and `{{bin}} doctor`
show what it left. `{{bin}} migrate --dry-run` shows the plan: the old
`.zshrc` and `.tmux.conf` go to `~/.setupvibe/backups/`, the lines you added
move to `~/.zshrc.local` and `~/.tmux.conf.local`, `ssh_copy_id` keeps working
as a shortcut to `{{bin}} ssh copy-id` and the duplicates (Go in
`~/.local/go`, rbenv, `~/.npm-global`, NodeSource) are removed only when you
confirm each one. `auto` also converts `.zshrc` and `.tmux.conf` before
writing the new blocks, so nothing loads twice.
