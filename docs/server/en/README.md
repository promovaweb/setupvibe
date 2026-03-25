# SetupVibe — Server Edition

> Linux server setup — v0.36.0

A lean, focused setup script for Linux servers. No Homebrew, no language ecosystems, no desktop tools. Installs only what a production server needs: Docker, Ansible, networking, shell, tmux, and AI CLI tools.

## System Requirements

|                   | Supported                       |
| ----------------- | ------------------------------- |
| **Ubuntu**        | 24.04+                          |
| **Debian**        | 12+                             |
| **Zorin OS**      | 18+                             |
| **Linux Mint**    | 21+                             |
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

The script waits for any running APT lock to clear (useful on fresh cloud VMs where `unattended-upgrades` runs at boot), shows an interactive roadmap, then asks for confirmation. It also prompts to configure Git identity if not already set.

---

## What Gets Installed

**9 steps, fully automated.**

### Step 1 — Base System & Build Tools

Installs via APT:

- `build-essential`, `git`, `wget`, `unzip`, `curl`, `tmux`, `fontconfig`, `sshpass`
- SSL/compression libs: `libssl-dev`, `zlib1g-dev`, `libbz2-dev`, `libreadline-dev`, `libsqlite3-dev`, `libncurses5-dev`, `xz-utils`, `libffi-dev`, `liblzma-dev`, `libyaml-dev`
- Python: `python3`, `python3-pip`, `python3-venv`, `python-is-python3`
- System daemons: `cron`, `logrotate`, `rsyslog`
- [uv](https://github.com/astral-sh/uv) Python package manager (installed to `~/.local/bin`)

### Step 2 — Docker, Ansible & GitHub CLI

**Docker** — installed from the official Docker APT repo:

- `docker-ce`, `docker-ce-cli`, `containerd.io`, `docker-compose-plugin`, `docker-buildx-plugin`
- User is added to the `docker` group

**Ansible:**

- Ubuntu → via `ansible/ansible` PPA
- Debian → `ansible-core` from APT

**GitHub CLI (`gh`)** — via the official GitHub APT repo

### Step 3 — Network, Monitoring & Tailscale

APT packages:
`rsync`, `net-tools`, `dnsutils`, `mtr-tiny`, `nmap`, `tcpdump`, `iftop`, `nload`, `iotop`, `sysstat`, `whois`, `iputils-ping`, `speedtest-cli`, `glances`, `htop`, `btop`

- **ctop** — binary downloaded to `~/.local/bin/ctop` (v0.7.7, architecture-aware)
- **Tailscale** — via official install script (`https://tailscale.com/install.sh`)

### Step 4 — SSH Server

- Installs `openssh-server` and `openssh-client`
- Enables and starts the `ssh` systemd service
- Backs up original `/etc/ssh/sshd_config`
- Configures `PermitRootLogin yes` and `PasswordAuthentication yes`
- Validates config with `sshd -t` before restarting; restores backup if validation fails

### Step 5 — Shell (ZSH & Starship)

- Installs ZSH via APT
- Installs Oh My Zsh (unattended)
- Clones `zsh-autosuggestions` and `zsh-syntax-highlighting`
- Installs Starship prompt to `~/.local/bin` and applies the **Gruvbox Rainbow** preset
- Downloads [`conf/zshrc-server.zsh`](../../../conf/zshrc-server.zsh) to `~/.zshrc`
- Sets ZSH as the default shell via `chsh`

#### Shell Aliases

| Alias          | Command                               |
| -------------- | ------------------------------------- |
| `reload`       | `source ~/.zshrc`                     |
| `zconfig`      | `nano ~/.zshrc`                       |
| `update`       | `sudo apt update && sudo apt upgrade` |
| `d`            | `docker`                              |
| `dc`           | `docker compose`                      |
| `syslog`       | `sudo journalctl -f`                  |
| `ports`        | `ss -tulnp`                           |
| `meminfo`      | `free -h`                             |
| `diskinfo`     | `df -h`                               |
| `cpuinfo`      | `lscpu`                               |
| `wholistening` | `ss -tulnp`                           |

#### Oh My Zsh Plugins

`git rsync nmap cp extract zoxide fzf zsh-autosuggestions zsh-syntax-highlighting tmux brew gh ansible docker docker-compose`

### Step 6 — Tmux & Plugins

- Clones [TPM](https://github.com/tmux-plugins/tpm) to `~/.tmux/plugins/tpm`
- Downloads [`conf/tmux-server.conf`](../../../conf/tmux-server.conf) to `~/.tmux.conf`
- If running as root with a non-root `REAL_HOME`, also installs to `/root/.tmux.conf`
- Kills any running tmux session to apply the new config

Press `prefix + I` inside tmux to install all plugins. See the [Tmux Guide](../../desktop/en/tmux.md) for the full plugin and keybinding reference.

### Step 7 — AI CLI Tools

Installs **Node.js 24** via NodeSource APT repo, then installs globally via `npm install -g`:

| Tool               | Package                          |
| ------------------ | -------------------------------- |
| Claude Code        | `@anthropic-ai/claude-code`      |
| Gemini CLI         | `@google/gemini-cli`             |
| OpenAI Codex       | `@openai/codex`                  |
| GitHub Copilot CLI | `@githubnext/github-copilot-cli` |

npm global packages are installed to `~/.npm-global` (configured with `npm config set prefix`) when not running as root.

### Step 8 — Finalization & Cleanup

- APT: `autoremove`, `autoclean`, `clean`, removes `/var/lib/apt/lists/*`
- Removes temp files: `/tmp/ctop`, `/tmp/starship`
- Vacuums journal logs older than 7 days
- Clears user caches: `~/.cache/pip`, `~/.npm/_npx`, `~/.bundle/cache`, `~/.cache/composer`

---

## License

Licensed under the **GNU General Public License v3.0** — see [LICENSE](../../LICENSE) for details.

Maintained by [promovaweb.com](https://promovaweb.com) · <contato@promovaweb.com>

---
> Follow the formatting guide: [Markdown Format Guide](.claude/commands/markdown-format.md)
