# setupvibe auto

`auto` installs everything without asking. It is meant for headless machines,
provisioning (cloud-init, Ansible, Dockerfile, CI) and AI agents. It
implements section 9 of the specification.

## Flow

1. **Root phase.** As root, `--user <name>` is required. auto creates the user
   with the sudo group, the `--ssh-key` and a temporary NOPASSWD rule, copies a
   compiled binary to `/usr/local/bin` and runs itself again as that user
   through `runuser`. Without `--user`, it exits with `ROOT` (12).
2. **User phase.** sudo must work without a password (`sudo -n true`),
   otherwise `SUDO_PASSWORD` (13). Disk, memory, locale, network and clock are
   checked.
3. **Selection.** Without `--profile`, every inventory item that installs on
   the system. GUI items are dropped on headless machines; preinstalled items
   (Omarchy, macOS) are skipped. `--only` adds, `--exclude` removes,
   requirements are pulled in and ordered first.
4. **Plan.** init when not done, the items, lingering, swap and Portainer, the
   security module (server, exposed desktops, or when its items are
   selected), Git identity, Tailscale login with `TAILSCALE_AUTHKEY`, Docker
   Swarm on the server, and the removal of the temporary sudo rule unless
   `--keep-nopasswd`.
5. **Run.** `~/.setupvibe/run.lock` prevents parallel runs (`LOCKED`, 30).
   A failed step does not stop the others. Events go to the run log and, with
   `--json`, to stdout as NDJSON.
6. **Check.** Every selected item is verified. The full result is written to
   `~/.setupvibe/last-run.json`; failures exit with `PARTIAL` (10).
7. **Restart.** When `/var/run/reboot-required` exists, auto exits with
   `REBOOT_PENDING` (20). With `--reboot`, it installs a one-shot systemd unit
   that resumes auto and restarts.

## Answers

Each answer comes from an option, then an environment variable, then the
`--config` file (same format as `config export`, never with secrets).

| Answer | Option | Variable |
| --- | --- | --- |
| Working user | `--user` | `SETUPVIBE_USER` |
| SSH public key | `--ssh-key` | `SETUPVIBE_SSH_KEY` |
| Git name and e-mail | `--git-name`, `--git-email` | `SETUPVIBE_GIT_NAME`, `SETUPVIBE_GIT_EMAIL` |
| Profile | `--profile` | `SETUPVIBE_PROFILE` |
| Items to add or remove | `--only`, `--exclude` | `SETUPVIBE_ONLY`, `SETUPVIBE_EXCLUDE` |
| Tailscale auth key | `--tailscale-authkey` | `TAILSCALE_AUTHKEY` |
| Swarm manager | `--manager` | `SETUPVIBE_SWARM_MANAGER` |
| Swarm join token | `--join` | `SETUPVIBE_SWARM_TOKEN` |
| Swarm address | `--advertise-addr` | `SETUPVIBE_SWARM_ADVERTISE_ADDR` |
| Time zone | `--timezone` | `SETUPVIBE_TIMEZONE` |
| Restart and resume | `--reboot` | `SETUPVIBE_REBOOT` |
| Keep passwordless sudo | `--keep-nopasswd` | `SETUPVIBE_KEEP_NOPASSWD` |

Secrets never appear in an argv: Tailscale and Swarm tokens reach their
commands through environment variables, and the run log masks them.

## One-line installers

`install.sh` (macOS and Linux) and `install.ps1` (Windows) read the version of
the chosen channel from `version.json` on the `v2` branch, download the binary
from the GitHub Release, verify it against the release `SHA256SUMS` and pass
the remaining arguments to it:

```bash
curl -fsSL https://raw.githubusercontent.com/promovaweb/setupvibe/v2/install.sh | sh -s -- auto --user deploy --ssh-key "ssh-ed25519 AAAA..."
curl -fsSL https://raw.githubusercontent.com/promovaweb/setupvibe/v2/install.sh | sh -s -- --edition server auto --user deploy --manager
```

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/promovaweb/setupvibe/v2/install.ps1))) auto
```

`bun run release:assets` builds every binary and writes `dist/SHA256SUMS`;
both go to the GitHub Release.

## Preview

`auto --dry-run` prints the plan; `auto --plan plan.json` writes it as JSON
for review. Neither changes the machine.
