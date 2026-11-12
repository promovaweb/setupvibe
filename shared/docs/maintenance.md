# Maintenance commands

| Command | What it does |
| --- | --- |
| `docs [topic]` | Embedded documentation, same as `--skill`. The `skill` name belongs to the wrapper below |
| `skill -- <args>` | Runs the Vercel skills CLI installed by SetupVibe, or the pinned version through npx |
| `doctor [--fix]` | Runtime checks plus SetupVibe findings: system, init, failing and outdated items, `~/.local/bin`, shell block, PATH and SetupVibe 1 leftovers (`~/.local/go`, `~/.rbenv`, Linuxbrew, `~/.npm-global`, NodeSource). `--fix` applies the safe fixes: folders, data directory mode and the shell block |
| `config export [file]` | Answers file with the selection and Git identity, for `config import` and `auto --config` |
| `config import <file>` | Installs the items and Git identity of an exported file |
| `upgrade [--check] [--channel]` | Replaces the compiled binary with the newest release of its channel after checking SHA256SUMS |
| `report [--output file]` | Markdown report for a GitHub issue: system, doctor, items, external apps, last run and latest log events, with secrets masked |
| `self uninstall --yes [--keep-data] [--items]` | Removes the shell blocks, the SetupVibe sudo rule, the binary and the SetupVibe state. Backups of the user's files, Portainer data and SetupVibe 1 leftovers stay. `--items` also removes the selected user-space items |
| `ssh copy-id <user@host>` | Appends your public key to the remote `authorized_keys` once, with safe modes. The key travels on stdin, never in the command line. `--password-stdin` answers the password prompt with sshpass |

The current user's name comes from `id -un`: Bun can report "unknown" when
USER is not set, and `runuser` keeps USER=root in the auto user phase.
