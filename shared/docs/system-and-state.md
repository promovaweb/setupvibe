# System detection and state

Modules shared by `setupvibe` and `setupvibe-server` to detect the machine
and keep SetupVibe state. They implement sections 2, 4, 11 and 18 of the
specification.

## System detection (`shared/system/detect.ts`)

`detectSystem(allowed)` returns the supported system id, version,
architecture and three flags:

| Flag | Rule |
| --- | --- |
| `wsl` | `WSL_DISTRO_NAME` or `WSL_INTEROP` is set, or `/proc/version` mentions Microsoft |
| `headless` | Linux without `DISPLAY`, `WAYLAND_DISPLAY` or a graphical `XDG_SESSION_TYPE`; macOS and Windows over SSH or without a terminal |
| `publicIp` | a non-internal interface has a publicly routable IPv4 or IPv6 address |

The variant follows from the flags: `local` with a graphical session,
`remote-headless` without one, `remote-exposed` without one and with a public
IP. GUI items are skipped on both remote variants; the security module is
applied on `remote-exposed`.

Linux systems come from `ID` in `/etc/os-release`. Omarchy is recognized by
`/usr/share/omarchy`, WSL by the flag above. Minimum versions and supported
architectures are in `MINIMUM_VERSIONS` and `SUPPORTED_ARCHES`. An
unsupported system makes `setupvibe system` exit with `UNSUPPORTED_SYSTEM`
(11).

## State files (`shared/state/store.ts`)

Both binaries keep their state in `~/.setupvibe/` (`SETUPVIBE_HOME`
overrides it):

| Path | Content |
| --- | --- |
| `config.json` | user, detected system, init state, Git identity, channel, shell and network preferences |
| `selection.json` | selected inventory items and installed versions |
| `external.json` | apps installed through mise outside the inventory |
| `state/` | what existed before SetupVibe, and the update check cache |
| `logs/` | one log per run |
| `backups/` | copies of files before the first change and before migrations |

Each JSON file has `schemaVersion`. `readState` migrates older files with the
migrations registered through `registerMigration`, keeps the previous file in
`backups/` and refuses files newer than the binary. Writes are atomic.

The formats are published as JSON Schema in `shared/schemas/`
(`config.schema.json`, `selection.schema.json`, `external.schema.json`),
generated from the zod source in `shared/state/schemas.ts` with
`bun run state:schemas`. A test fails when the published files are stale. At
start, every command checks the three files against them and names the field
of any problem on stderr. Unknown keys are kept, so an older binary accepts a
file written by a newer one. `state/security.json` holds the state before the
security module, read by `security remove`.

## Run log (`shared/state/log.ts`)

`openRunLog(command)` writes NDJSON events to
`logs/<timestamp>-<command>.log`. With `json: true` the same events go to
stdout, which is the output of `setupvibe auto --json`. Values of
`TAILSCALE_AUTHKEY`, `GH_TOKEN`, `GITHUB_TOKEN`, `SETUPVIBE_SWARM_TOKEN` and
`SETUPVIBE_MASTER_KEY` are masked.

## Checksums (`shared/state/checksum.ts`)

`verify` checks SHA-256, SHA-384 or SHA-512 digests and throws
`ChecksumMismatch` on any difference. `findInChecksumList` reads files such as
`SHASUMS256.txt`.

## Update check (`shared/state/update.ts`)

`checkForUpdate` reads `version.json` from the `v2` branch with a two-second
timeout and caches it for six hours in `state/update-check.json`. Offline, it
returns `source: "offline"` and the binary carries on. `version.json` lists
the latest and minimum version of the `stable` and `beta` channels; a test
keeps it equal to the package version.
