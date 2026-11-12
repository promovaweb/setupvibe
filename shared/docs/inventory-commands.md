# Inventory commands

`list`, `install`, `remove` and `update` manage single items after `init`.
They implement section 8 of the specification and share the plan builder of
`auto`, so an item installs the same way in both paths.

| Command | What it does |
| --- | --- |
| `list [--category id] [--check]` | Every item with its status on this system: `installed`, `outdated`, `failed`, `available`, `gui` (skipped on headless machines), `system` (shipped by the system), `init` or `unavailable` |
| `install <items>` | Installs items and their requirements. Items that already pass their check are skipped unless `--force` |
| `install --external <tool[@version]>` | Installs a mise tool outside the inventory. Without a version, the latest is resolved and pinned. Recorded in `external.json` |
| `remove <items> --yes` | Removes items installed in the user's space (mise, Git sources, Composer and gem packages) |
| `remove --external <tool> --yes` | Removes an app installed with `install --external` |
| `update` | Reinstalls the selected items whose pinned version changed in this SetupVibe's inventory |

Rules:

- `install` and `update` need a completed `init` (exit code `CONFIG`, 3).
- `remove` asks for confirmation in a terminal; without one it needs `--yes`.
- Packages from the system package manager are removed only with
  `--include-native`, because other software may depend on them.
- An item that other selected items require is not removed without
  `--force`.
- Items installed by `init`, shipped by the system or installed by a vendor
  installer are not removed; the reason is printed.
- Every command that changes the machine accepts `--dry-run` and updates
  `selection.json` with the installed version and check status.
