# SetupVibe 1 (legacy)

This folder keeps SetupVibe 1 (0.41.x) on the `v2` branch, ready for the
SetupVibe 2 launch. The scripts here are the last SetupVibe 1 release
(0.41.21) plus a notice that points at SetupVibe 2:

| Path | Content |
| --- | --- |
| `desktop.sh`, `server.sh`, `omarchy.sh`, `desktop.ps1` | SetupVibe 1 installers |
| `conf/`, `bin/`, `utils/` | Files the installers download |
| `docs/` | SetupVibe 1 documentation |
| `WINDOWS.md` | Windows edition notes |

Nothing changes for current users yet: the public addresses still serve
SetupVibe 1 from `main`, and the scripts download their files from the tag of
their own version (`v0.41.x`), so moving them here breaks nothing.

## At the launch

1. `v2` becomes the default branch.
2. `desktop.setupvibe.dev` serves `install.sh`, `server.setupvibe.dev` serves
   `install-server.sh` and `windows.setupvibe.dev` serves `install.ps1`.
3. These scripts get only bug and security fixes for six months after the
   launch, then the folder is archived (spec section 16).

## Moving a machine to SetupVibe 2

Install SetupVibe 2 and run `setupvibe migrate --dry-run`, then
`setupvibe migrate`. It keeps your `.zshrc` and `.tmux.conf` changes in the
`.local` files, keeps `ssh_copy_id` as a shortcut and removes the SetupVibe 1
duplicates only after you confirm each one. See `shared/docs/migration.md`.
