# init, users and security

Commands shared by `setupvibe` and `setupvibe-server` that prepare a machine.
They implement sections 3, 6, 12, 17 and 18 of the specification. Every
command that changes the machine accepts `--dry-run`, which prints the plan
without running it.

## Execution model (`shared/exec/runner.ts`)

Work is a list of steps. Each step has commands (argv arrays, never shell
strings), an optional `skipIf` command and an optional code action, such as a
verified download. Privileged commands run through `sudo -n` with
`DEBIAN_FRONTEND=noninteractive`, `NEEDRESTART_MODE=a`, `NONINTERACTIVE=1` and
`CI=1`. A failed step does not stop the next ones; the command exits with
`PARTIAL` (10) and the run log lists each result. Network commands (Git
clones and fetches, `mise use`, APT, pacman and Homebrew installs) and
downloads are retried three times, waiting 2, 4 and 8 seconds.

## Install methods (`shared/install/methods.ts`)

`itemSteps(item, system)` turns the resolved install entry into steps:

| Method | Steps |
| --- | --- |
| `native` | APT, pacman, `omarchy pkg add` or Homebrew; a `repository` is added first, after its key fingerprint matches the inventory |
| `mise` | `mise use --global <tool>@<version>` |
| `brew`, `winget` | Homebrew formula or cask; WinGet ids, skipped when already installed |
| `git` | clone and check out the pinned commit, tmux plugins included |
| `archive` | download, SHA-256 check and extraction |
| `installer` | official installer downloaded and run with its arguments |
| `composer`, `gem` | pinned package versions |

mise itself is installed by `init` from the GitHub release, verified against
the release `SHASUMS256.txt`.

## `init`

Checks, in order: not root, the other edition is not set up, free disk space
(10 GB desktop, 5 GB server), memory, UTF-8 locale, network and clock. Then
installs the inventory items marked `initOnly` (build dependencies and mise)
and writes the `init` record to `config.json`. Exit codes: `ROOT` (12),
`UNSUPPORTED_SYSTEM` (11), `DISK_SPACE` (14), `NETWORK_OR_API` (5),
`PARTIAL` (10).

## `user create <name>`

Creates the working user with a home folder and the `sudo` group (`wheel` on
Arch and Omarchy), installs `--ssh-key` in `~/.ssh/authorized_keys` and, with
`--nopasswd`, a sudoers rule in `/etc/sudoers.d/90-setupvibe-<name>`. The rule
is checked with `visudo -cf` before it is moved into place. `user nopasswd
<name> --remove` deletes it.

## `security apply`

The security module: UFW denying incoming traffic except SSH (and the Swarm
ports with `--swarm` on the server), the fail2ban sshd jail, automatic
security updates on Debian and Ubuntu, NTP sync and an optional
`--timezone`. SSH moves to key-only login with
`/etc/ssh/sshd_config.d/10-setupvibe.conf` only when the current user has an
authorized key; the file passes `sshd -t` before the service reloads.
SetupVibe never turns password authentication on.
