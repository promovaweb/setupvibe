# SetupVibe 1 compatibility and migration

SetupVibe 2 runs on machines already set up by SetupVibe 1 (0.41.x) without
losing anything the person configured. The code lives in `shared/legacy/` and
`shared/commands/migrate.ts`; section 16 of the specification describes the
goal.

## Detection (`shared/legacy/v1.ts`)

SetupVibe 1 records no version on disk, so `detectV1` looks for its traces:

| Trace | Edition |
| --- | --- |
| `~/.zshrc` from `conf/zshrc-*.zsh`, without the SetupVibe 2 markers | desktop or server (the server file has its own `PATH` line) |
| `~/.tmux.conf` from `conf/tmux-*.conf`, without markers | desktop or server |
| `# >>> SetupVibe Omarchy 4 >>>` block in `~/.bashrc` | Omarchy |
| `~/.setupvibe/bin/ssh_copy_id`, `~/.setupvibe/portainer-compose.yml` | any |
| `%ProgramData%\SetupVibe\*.json` and `~/.setupvibe/windows-utilities.json` | Windows |

The original 0.41.21 files are embedded in `shared/legacy/v1/`. A file counts
as SetupVibe 1 when it carries the 0.41.x signature or when at least 60% of
its lines are in the originals, which covers older 0.41.x releases.

`system` shows the result, `doctor` reports it with the fix
(`setupvibe migrate --dry-run`) and the Home tab of the TUI suggests the
migration until `config.json` records `migratedFromV1`.

## What happens without `migrate`

`auto`, `shell apply` and `doctor --fix` convert a SetupVibe 1 `.zshrc` and
`.tmux.conf` before writing the SetupVibe 2 blocks, so the new block never lands
on top of the old file. The conversion is lossless: the file
goes to `~/.setupvibe/backups/`, the lines the person added (lines that are
not in the originals) move to `~/.zshrc.local` or `~/.tmux.conf.local` under a
dated comment, and the file is rewritten with the block. `init` builds the
first selection from what already passes its check, marked `adopted`, and
`remove` keeps adopted items unless `--force`.

## `migrate`

```bash
setupvibe migrate --dry-run          # the plan and the lines that will move (secrets masked)
setupvibe migrate                    # convert, write the blocks, ask about each duplicate
setupvibe migrate --remove-legacy go,rbenv   # without a terminal: duplicates to remove
setupvibe migrate --remove-legacy all
```

Beyond the conversion above, `migrate`:

- replaces the SetupVibe Omarchy block in `~/.bashrc` with the SetupVibe 2
  block;
- keeps `~/.setupvibe/bin/ssh_copy_id` as a shortcut to `setupvibe ssh
  copy-id`, with the same `--host`, `--user`, `--pass`, `--key` and `--port`
  options;
- offers to remove each duplicate: Go in `~/.local/go`, rbenv,
  `~/.npm-global` and the NodeSource repository (Node itself stays). In a
  terminal it asks once per item; without one it removes only the ids given to
  `--remove-legacy`. Linuxbrew is never removed by SetupVibe, because other
  formulas may use it; the command prints its uninstaller;
- records `migratedFromV1` in `config.json` and adopts the installed items.

## Installers and addresses

`install.sh` serves the desktop edition and `install-server.sh` the server
edition, both from the `v2` branch. At the launch, `desktop.setupvibe.dev`
and `server.setupvibe.dev` point to them, `windows.setupvibe.dev` to
`install.ps1`. On the `v2` branch the SetupVibe 1 scripts already live in
`legacy/`, with a notice about SetupVibe 2 and `migrate`.

## Windows

`detectV1` lists the `desktop.ps1` state files. The WSL, OpenSSH firewall and
`PATH` states they hold stay where they are; SetupVibe 2 never removes Git,
PowerShell 7 or Windows Terminal that `init` adopted, which avoids the
SetupVibe 1 problem of removing programs the person already had.
