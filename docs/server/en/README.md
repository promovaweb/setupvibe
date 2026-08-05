# SetupVibe — Server Edition

> Linux server setup — v0.41.11

A lean, focused setup script for Linux servers. No Homebrew, no language ecosystems, no desktop tools. Installs only what a production server needs: Docker, Ansible, networking, shell, tmux, and AI CLI tools.

## System Requirements

|                   | Supported                       |
| ----------------- | ------------------------------- |
| **Ubuntu**        | 24.04+                          |
| **Debian**        | 12+                             |
| **Zorin OS**      | 18+                             |
| **Architectures** | x86_64 (amd64), ARM64 (aarch64) |

> Linux only. Exits immediately if run on macOS.

## Installation

```bash
curl -sSL server.setupvibe.dev | bash
```

Or locally:

```bash
bash server.sh
```

To initialize Docker Swarm automatically after setup, pass `--manager`:

```bash
curl -sSL server.setupvibe.dev | bash -s -- --manager
```

```bash
bash server.sh --manager
```

For unattended installation, add `--yes`. To select the Swarm address or interface explicitly, use `--advertise-addr ADDRESS`; this option implies `--manager`.

The script validates the operating system, version, architecture, target user, and arguments before changing the system. It then shows an interactive roadmap, asks for confirmation, waits up to five minutes for APT locks, and retries failed APT commands. Steps stop at the first error, the summary identifies steps that did not run, and the script exits with a non-zero status. If `--manager` was not passed, interactive installations ask whether to configure Docker Swarm at the end.

---

## What Gets Installed

**9 steps fully automated (Steps 0–8), plus an optional Step 9 for Docker Swarm Manager setup.**

### Step 0 — Prerequisites & Architecture Check

Reports the validated operating system, distribution repository base, CPU architecture, target user, and home directory before installation begins.

### Step 1 — Base System Tools

Installs via APT:

- Core utilities: `curl`, `file`, `figlet`, `fontconfig`, `fzf`, `git`, `gnupg`, `iproute2`, `jq`, `nano`, `procps`, `psmisc`, `sshpass`, `tmux`, `unzip`, `wget`
- System services: `cron`, `logrotate`, `rsyslog`
- **zoxide** via its official installer
- Enables `cron` without creating jobs and removes only the legacy demonstration jobs added by SetupVibe v0.41.4-v0.41.6

### Step 2 — Docker, Ansible & GitHub CLI

**Docker** — installed from the official Docker APT repo:

- `docker-ce`, `docker-ce-cli`, `containerd.io`, `docker-compose-plugin`, `docker-buildx-plugin`
- User is added to the `docker` group

**Ansible:**

- Ubuntu → via `ansible/ansible` PPA
- Debian → `ansible-core` from APT

**GitHub CLI (`gh`)** — via the official GitHub APT repo

**Portainer CE** — runs on the `lts` image channel and exposes HTTPS on port `9443`; legacy HTTP port `9000` and optional Edge Agent port `8000` are not opened

### Step 3 — Network, Monitoring & Tailscale

APT packages:
`rsync`, `net-tools`, `dnsutils`, `mtr-tiny`, `nmap`, `tcpdump`, `iftop`, `nload`, `iotop`, `sysstat`, `whois`, `iputils-ping`, `speedtest-cli`, `glances`, `htop`, `btop`

- **ctop** — binary downloaded to `~/.local/bin/ctop` (v0.7.7, architecture-aware, SHA-256 verified)
- **Tailscale** — via official install script (`https://tailscale.com/install.sh`)

### Step 4 — SSH Server

- Installs `openssh-server` and `openssh-client`
- Enables and starts the `ssh` systemd service
- Validates the effective configuration with `sshd -t`
- Preserves the existing authentication policy; it does not enable root login or password authentication

### Step 5 — Shell (ZSH & Starship)

- Installs ZSH via APT
- Installs Oh My Zsh (unattended)
- Clones `zsh-autosuggestions` and `zsh-syntax-highlighting`
- Installs Starship prompt to `~/.local/bin` and applies the **Gruvbox Rainbow** preset
- Downloads helper scripts from [`bin/`](../../../bin) to `~/.setupvibe/bin`; see [Executables](../../en/EXECUTABLES.md)
- Downloads [`conf/zshrc-server.zsh`](../../../conf/zshrc-server.zsh) to `~/.zshrc`
- Preserves existing `.zshrc`, `.bashrc`, and `.tmux.conf` files once with the `.pre-setupvibe` suffix before replacing or appending
- Sets ZSH as the default shell via `chsh`

#### Shell Aliases

| Alias          | Command                                                        |
| -------------- | -------------------------------------------------------------- |
| `reload`       | `source ~/.zshrc`                                              |
| `zconfig`      | `nano ~/.zshrc`                                                |
| `ssh_copy_id`   | `ssh_copy_id --host HOST --user USER [--pass PASS]`             |
| `update`       | `sudo apt update && sudo apt upgrade`                          |
| `cc`           | `claude --permission-mode=auto --dangerously-skip-permissions` |
| `skl`          | `skills list`                                                  |
| `skf`          | `skills find`                                                  |
| `ska`          | `skills add`                                                   |
| `sku`          | `skills update`                                                |
| `skun`         | `skills remove`                                                |
| `d`            | `docker`                                                       |
| `dc`           | `docker compose`                                               |
| `syslog`       | `sudo journalctl -f`                                           |
| `ports`        | `ss -tulnp`                                                    |
| `meminfo`      | `free -h`                                                      |
| `diskinfo`     | `df -h`                                                        |
| `cpuinfo`      | `lscpu`                                                        |
| `wholistening` | `ss -tulnp`                                                    |

#### Oh My Zsh Plugins

`git rsync nmap cp extract zoxide fzf zsh-autosuggestions zsh-syntax-highlighting tmux gh ansible docker docker-compose`

### Step 6 — Tmux & Plugins

- Clones [TPM](https://github.com/tmux-plugins/tpm) to `~/.tmux/plugins/tpm`
- Downloads [`conf/tmux-server.conf`](../../../conf/tmux-server.conf) to `~/.tmux.conf`
- If running as root with a non-root `REAL_HOME`, also installs to `/root/.tmux.conf`
- Preserves running tmux sessions; the new configuration applies to new sessions

Press `prefix + I` inside tmux to install all plugins. See the [Tmux Guide](../../desktop/en/tmux.md) for the full plugin and keybinding reference.

### Step 7 — AI CLI Tools

Installs **Node.js 24** from the NodeSource APT repository, installs the npm packages globally, and obtains Herdr from its official release manifest:

| Tool               | Installation                     |
| ------------------ | -------------------------------- |
| Claude Code        | `@anthropic-ai/claude-code`      |
| OpenAI Codex       | `@openai/codex`                  |
| GitHub Copilot CLI | `@github/copilot`                |
| OpenCode CLI       | `opencode-ai`                    |
| Skills CLI         | `skills`                         |
| Herdr              | Official release manifest binary |

The [Vercel Labs Skills CLI](https://github.com/vercel-labs/skills), [Herdr](https://github.com/herdrdev/herdr), and every AI CLI command are validated after installation. Herdr is installed in `~/.local/bin` for the detected architecture; see the [Herdr guide](../../en/HERDR.md) for sessions, shortcuts, updates, and troubleshooting. The deprecated `@githubnext/github-copilot-cli` package is removed. npm global packages are installed to `~/.npm-global` whenever the target user is non-root, including when the installer itself runs through `sudo`.

### Step 8 — Finalization & Cleanup

- Runs APT `autoclean` and `clean`
- Removes downloaded APT package lists
- Preserves installed packages, system journals, and user caches

### Step 9 — Docker Swarm Manager (optional)

Activated by passing `--manager` or by answering **yes** to the interactive prompt shown at the end of setup.

1. **Detects the primary routable IPv4 address** from the local routing table without contacting external IP services. Use `--advertise-addr ADDRESS` to override it with a specific address or interface.
2. **Initializes Docker Swarm** with `docker swarm init --advertise-addr <ADDRESS>`. Idempotent — skips initialization when the host is already a manager and fails clearly when it is already a worker.
3. **Creates the overlay network** `network_swarm_public` with `--driver overlay --attachable`. Idempotent — skips if the network already exists.
4. **Displays join tokens** for both worker and manager roles so additional nodes can be joined immediately.

## Contributing

We welcome contributions of all sizes! Please read our [Contribution Guide](../../../CONTRIBUTING.md) to get started.

---

## License

Licensed under the **GNU General Public License v3.0** — see [LICENSE](../../../LICENSE) for details.

Maintained by [promovaweb.com](https://promovaweb.com) · <contato@promovaweb.com>

---
