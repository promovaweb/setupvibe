# SetupVibe 2 inventory

The inventory is the official list of everything a SetupVibe 2 edition
installs and manages. It is embedded in each binary and drives the TUI, the
CLI, `auto`, `check`, `update` and the MCP server.

| File | Edition | Systems |
| --- | --- | --- |
| `desktop/inventory.json` | `setupvibe` | Ubuntu, Debian, Mint, Zorin, Arch, Omarchy, macOS, Windows, WSL |
| `server/inventory.json` | `setupvibe-server` | Ubuntu, Debian |
| `shared/inventory.schema.json` | JSON Schema for both files | |
| `shared/inventory.ts` | Types and install resolution | |

The inventory files are edited by hand. Validate every change with:

```bash
bun test shared/tests
```

## Item fields

| Field | Meaning |
| --- | --- |
| `id` | Stable identifier used by `install`, `remove`, profiles and `requires` |
| `name`, `description`, `homepage` | Text shown in the TUI, in English and Brazilian Portuguese |
| `category` | Tab in the TUI |
| `version`, `versionPolicy` | Pinned version and how it is enforced (see below) |
| `default` | Selected by default in the TUI; the `essencial` profile lists exactly these items |
| `initOnly` | Installed by `init` and hidden from the selection |
| `securityModule` | Part of the shared security module |
| `flags` | `gui` (skipped on headless machines), `service` (needs systemd or lingering), `port` (publishes a port; a compose entry binds it to `127.0.0.1` on the remote variants) |
| `requires` | Items installed first |
| `plugins` | tmux plugins pinned to commits |
| `install` | Install entry per system (see below) |
| `verify` | Command used by `check`; `expect` is a substring, a `^regex` or `>=version` |

## Version policies

| Policy | Use |
| --- | --- |
| `exact` | Pinned version, installed and checked exactly |
| `series` | Native packages pinned to `major.minor`, such as PHP 8.5 |
| `minimum` | Self-updating tools, such as Claude Code; `check` enforces the floor |
| `commit` | Git sources pinned to a commit |
| `repository` | Latest stable from a repository pinned by key fingerprint |
| `distro` | Package shipped by the system |
| `managed` | The vendor installer chooses the version |
| `system` | Configuration without a version |

## Install resolution

Each item has an `install` map. For a given system, SetupVibe uses the first
key present in this order:

1. the system itself (`ubuntu`, `wsl`, `omarchy`, ...);
2. its family: `debian-family` (Ubuntu, Debian, Mint, Zorin, WSL) or
   `arch-family` (Arch, Omarchy);
3. `linux` (every system except macOS and Windows);
4. `unix` (every system except Windows);
5. `all`.

Every item must resolve an entry for every system of its edition. Use
`preinstalled` when the system already ships the tool (Omarchy, macOS) and
`unsupported` with a `reason` when it does not apply.

| Method | Fields |
| --- | --- |
| `mise` | `tool` (registry name or `backend:tool`) |
| `native` | `packages`, optional `repository`, `optional`, `conflicts` |
| `brew` | `formula` or `cask` (macOS only) |
| `winget` | `id` |
| `installer` | `url`, `args`, `checksum`, `checksumAlgorithm`, `interpreter` |
| `archive` | `files` with `url` and `sha256`, `path`, `checksumAlgorithm` |
| `git` | `repo`, `path`; the commit is the item version |
| `composer`, `gem` | `package` or `gem` |
| `compose` | `image`, `port` |
| `config` | `action` |
| `preinstalled`, `unsupported` | `note` or `reason` |

Every entry also accepts `flags`, for a state that applies only there (a GUI
cask on macOS, for example). `skipWhen` marks an entry that another tool makes
unnecessary; today the only value is `docker-desktop-integration`, which skips
the Docker CLI inside WSL when Docker Desktop for Windows already provides it.
`checksumAlgorithm` takes `sha256` (the default), `sha384` or `sha512`;
`interpreter` names the program that runs a downloaded installer, `bash` by
default.

`{version}` in `tool`, `url`, `args` and `image` is replaced by the item
version.

## Updating versions

The `updated` field records the date of the last review.
`bun run inventory:bump` checks every item pinned by `exact` and reports the
newer versions it finds: mise for a mise entry, the latest GitHub release for a
release archive, whose files are downloaded again to record the new SHA-256.
Items pinned to a series (`node@24`, `python@3.14`, `ruby@3.4`) stay on their
line.

```bash
bun run inventory:bump                 # report only
bun run inventory:bump --write         # update the inventory files
bun run inventory:bump --write --pr    # commit on a branch and open a pull request against v2
```

Run `bun test shared/tests` after `--write`: the tests catch a version that no
longer matches its check. Repository key fingerprints and archive checksums are
copied from the vendor and checked by the tests for format only.
