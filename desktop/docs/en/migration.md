# Coming from SetupVibe 1

SetupVibe 2 installs and maintains the environment through one binary, with a
TUI, a CLI and an MCP server in the same executable. On a machine set up by
SetupVibe 1 (0.41.x), it keeps working without losing what you configured:
`{{bin}} migrate` converts the files, keeps a copy of each one and removes the
duplicates only after your confirmation.

## How the binary recognizes SetupVibe 1

SetupVibe 1 records no version on disk. The binary looks for the files it left:

| Trace | Origin |
| --- | --- |
| `~/.zshrc` from `conf/zshrc-*.zsh`, without the SetupVibe 2 markers | desktop or server |
| `~/.tmux.conf` from `conf/tmux-*.conf`, without the markers | desktop or server |
| `# >>> SetupVibe Omarchy 4 >>>` block in `~/.bashrc` | Omarchy |
| `~/.setupvibe/bin/ssh_copy_id` and `~/.setupvibe/portainer-compose.yml` | any edition |
| `%ProgramData%\SetupVibe\*.json` and `~/.setupvibe/windows-utilities.json` | Windows |

A file counts as SetupVibe 1 when it carries the 0.41.x signature or when at
least 60% of its lines appear in the embedded originals, which covers slightly
different 0.41.x releases.

Three surfaces show the result:

```bash
{{bin}} system                 # SetupVibe 1   found (desktop): run setupvibe migrate --dry-run
{{bin}} doctor                 # ! SetupVibe 1 found: ~/.zshrc from SetupVibe 1; ...
{{bin}}                        # the Doctor card and the next step on the Home
```

## Before migrating

1. Install the SetupVibe 2 binary with the edition installer.
2. Run `{{bin}} system` and `{{bin}} doctor` and read the traces found.
3. Review the plan with `{{bin}} migrate --dry-run`. Nothing changes in this
   step.
4. Close any editor with `~/.zshrc` or `~/.tmux.conf` open.

SetupVibe 1 does not need to be uninstalled. It has no uninstaller; `migrate`
takes care of the files it left.

## What `migrate` does

1. Copies the SetupVibe 1 `~/.zshrc` and `~/.tmux.conf` to
   `~/.setupvibe/backups/`.
2. Moves the lines you added to `~/.zshrc.local` and `~/.tmux.conf.local`, with
   a dated comment and the origin of each block. Lines already in the originals
   are not copied.
3. Empties the converted file so SetupVibe 2 writes the new block between
   `# >>> setupvibe >>>` and `# <<< setupvibe <<<`.
4. Replaces the SetupVibe Omarchy block in `~/.bashrc` with the SetupVibe 2
   block, after a backup.
5. Rewrites `~/.setupvibe/bin/ssh_copy_id` as a shortcut to
   `{{bin}} ssh copy-id`, with the same `--host`, `--user`, `--pass`, `--key`
   and `--port`.
6. Writes the shell blocks and builds the first selection with the items that
   already pass their check, marked `adopted`. An adopted item is not removed
   without `--force`, because SetupVibe 2 did not install it.
7. Asks, once per duplicate, whether it may be removed. Without a terminal, it
   removes only the ids passed in `--remove-legacy`.
8. Writes `migratedFromV1` to `~/.setupvibe/config.json` with the date and the
   source edition.

Secrets that appear in the moved lines are masked in the plan, with `TOKEN`,
`KEY`, `SECRET` and `PASSWORD` replaced by `****`. The files keep the real
value.

## Options

| Option | Effect |
| --- | --- |
| `--dry-run` | shows the steps and the lines that would change, without changing anything |
| `--remove-legacy <items>` | without a terminal, removes only the named duplicates: `go`, `rbenv`, `npm-global`, `nodesource` or `all` |
| `--json` | returns the plan or the result in the envelope, with the same steps |

```bash
{{bin}} migrate --dry-run                     # read the plan and the moved lines
{{bin}} migrate                               # convert, write the blocks and ask about each duplicate
{{bin}} migrate --json --dry-run              # plan as JSON, to attach to a ticket
{{bin}} migrate --remove-legacy go,rbenv      # in a cloud-init run, without a terminal
{{bin}} migrate --remove-legacy all           # remove the four duplicates
```

The MCP tool `migrate` follows the same flow: `dry_run` is `true` by default
and the real run requires `confirm: true`, after showing the plan.
`remove_legacy` takes `go`, `rbenv`, `npm-global`, `nodesource` or `all`.

## Duplicates

| Id | What it is | What `migrate` does |
| --- | --- | --- |
| `legacy-go` | Go in `~/.local/go` | removes the folder, after the mise Go is installed |
| `legacy-rbenv` | rbenv in `~/.rbenv` | removes the folder, after the mise Ruby is installed |
| `legacy-npm-global` | global packages in `~/.npm-global` | removes the folder; the agents come from mise |
| `legacy-nodesource` | NodeSource repository in `/etc/apt/sources.list.d/` | removes the list and the key; the installed Node stays |
| `legacy-linuxbrew` | Linuxbrew in `/home/linuxbrew/.linuxbrew` | never removes it; prints the uninstaller, because other formulas may use it |

`doctor` keeps listing what stayed. `migrate` can run again: a file that already
has the SetupVibe 2 block is not converted a second time.

## Without running `migrate`

`auto`, `shell apply` and `doctor --fix` also convert a SetupVibe 1 `.zshrc`
and `.tmux.conf` before writing the new blocks. The conversion is the same, with
a backup and the lines moved to the `.local` files. `init` builds the first
selection from what already passes its check.

Running `migrate` first still pays off: it handles the Omarchy block, the
`ssh_copy_id` shortcut and the duplicates, which the automatic conversion does
not touch.

## Windows

On Windows, `migrate` recognizes the `desktop.ps1` state files in
`%ProgramData%\SetupVibe\` and in `~/.setupvibe/windows-utilities.json`. Those
files hold the WSL, the OpenSSH firewall and the `PATH` state; they stay where
they are and SetupVibe 2 does not remove them.

`init` adopts the Git, PowerShell 7 and Windows Terminal that were already on
the machine. That avoids the SetupVibe 1 problem of removing programs the person
already had before the setup.

## After the migration

Open a new shell to load `PATH`, aliases and prompt, and check the state:

```bash
exec $SHELL -l
{{bin}} doctor
{{bin}} check
```

The guide for the problems that show up in that check is in
[troubleshooting.md](troubleshooting.md). The command reference is in
[cli.md](cli.md) and the exit codes in [exit-codes.md](exit-codes.md).

## Exit codes

| Code | When |
| --- | --- |
| 0 | the migration finished, with or without kept duplicates |
| 2 | an unknown id was passed in `--remove-legacy` |
| 10 | a step failed and the others were applied; the log has the path |
| 11 | the system or the architecture has no support in this edition |
| 13 | `sudo` asks for a password and there is no terminal to type it |
