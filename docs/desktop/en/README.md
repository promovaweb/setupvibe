# SetupVibe — Desktop Edition

> Cross-platform development environment setup — v0.37.0

Installs and configures a complete developer stack in one command. Supports macOS and major Linux distributions.

## System Requirements

|                   | Supported                       |
| ----------------- | ------------------------------- |
| **macOS**         | 12 Monterey and newer           |
| **Ubuntu**        | 24.04+                          |
| **Debian**        | 12+                             |
| **Zorin OS**      | 18+                             |
| **Linux Mint**    | 21+                             |
| **Architectures** | x86_64 (amd64), ARM64 (aarch64) |

> Do **not** run with `sudo` on macOS — Homebrew will refuse to install as root. Run normally and the script will prompt for your password when needed.

## Installation

```bash
curl -sSL desktop.setupvibe.dev | bash
```

Or locally:

```bash
bash desktop.sh
```

The script shows an interactive roadmap and asks for confirmation before starting. It also prompts to configure Git identity if not already set.

---

## What Gets Installed

**14 steps, fully automated.**

### Step 1 — Base System & Build Tools

**Linux:** installs via APT — `build-essential`, `git`, `wget`, `unzip`, `curl`, `tmux`, SSL/compression libs, and the Charmbracelet APT repo (for `glow`).

**macOS:** relies on Xcode Command Line Tools (checks and exits if not present). Base tools are installed via Homebrew in the next step.

### Step 2 — Homebrew

- **macOS:** installs Homebrew if absent, then installs base tools (`wget`, `curl`, `tmux`, `openssl`, `readline`, etc.)
- **Linux:** installs Linuxbrew under `/home/linuxbrew/.linuxbrew`; adds PATH entries to `~/.bashrc`, `~/.profile`, `~/.zshrc`; runs `brew upgrade` if already present

### Step 3 — PHP 8.4 Ecosystem

| Component         | macOS                                       | Linux                                                                                               |
| ----------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| PHP 8.4           | via Homebrew                                | via ondrej/php PPA (Ubuntu) or sury.org (Debian)                                                    |
| Extensions        | redis, xdebug, imagick via PECL             | php8.4-{curl,mbstring,xml,zip,bcmath,intl,mysql,pgsql,sqlite3,gd,imagick,redis,mongodb,yaml,xdebug} |
| Composer          | via Homebrew                                | binary to `~/.local/bin/composer`                                                                   |
| Laravel installer | `composer global require laravel/installer` | same                                                                                                |

### Step 4 — Ruby Ecosystem

| Component       | macOS                       | Linux                                   |
| --------------- | --------------------------- | --------------------------------------- |
| rbenv           | via Homebrew                | cloned from GitHub to `~/.rbenv`        |
| ruby-build      | via Homebrew                | cloned to `~/.rbenv/plugins/ruby-build` |
| Ruby            | 3.3.0 compiled via rbenv    | same                                    |
| Bundler + Rails | `gem install bundler rails` | same                                    |

### Step 5 — Languages

| Language | macOS                      | Linux                                              |
| -------- | -------------------------- | -------------------------------------------------- |
| Python 3 | `python@3.12` via Homebrew | via APT (`python3`, `python3-pip`, `python3-venv`) |
| uv       | via install script         | same                                               |
| Go       | via Homebrew               | 1.22.2 binary to `~/.local/go`                     |
| Rust     | via rustup                 | same                                               |

### Step 6 — JavaScript

| Tool       | macOS                     | Linux                   |
| ---------- | ------------------------- | ----------------------- |
| Node.js 24 | `node@24` via Homebrew    | via NodeSource APT repo |
| PNPM       | `npm install -g pnpm`     | same                    |
| PM2        | `npm install -g pm2`      | same                    |
| n8n        | `npm install -g @n8n/cli` | same                    |
| Bun        | via install script        | same                    |

### Step 7 — DevOps

| Tool              | macOS                            | Linux                                                                        |
| ----------------- | -------------------------------- | ---------------------------------------------------------------------------- |
| Docker            | Docker Desktop via Homebrew Cask | docker-ce + docker-compose-plugin + docker-buildx-plugin via Docker APT repo |
| Ansible           | via Homebrew                     | via ansible/ansible PPA (Ubuntu) or ansible-core (Debian)                    |
| GitHub CLI (`gh`) | via Homebrew                     | via GitHub APT repo                                                          |

### Step 8 — Modern Unix Tools

Installed via Homebrew on both platforms.

| Tool         | Description                           |
| ------------ | ------------------------------------- |
| `bat`        | `cat` with syntax highlighting        |
| `eza`        | Modern `ls` replacement               |
| `zoxide`     | Smarter `cd`                          |
| `fzf`        | Fuzzy finder (with shell keybindings) |
| `ripgrep`    | Fast `grep` replacement               |
| `fd`         | Fast `find` replacement               |
| `lazygit`    | Terminal UI for git                   |
| `lazydocker` | Terminal UI for Docker                |
| `neovim`     | Modern vim                            |
| `glow`       | Markdown renderer                     |
| `jq`         | JSON processor                        |
| `tldr`       | Simplified man pages                  |
| `fastfetch`  | System info tool                      |
| `duf`        | Modern `df`                           |
| `mise`       | Runtime version manager               |

### Step 9 — Network, Monitoring & Tailscale

**macOS:** `wget`, `nmap`, `mtr`, `htop`, `btop`, `glances`, `speedtest-cli` via Homebrew; `bandwhich`, `gping`, `trippy`, `rustscan` via Cargo; `ctop` via Homebrew; Tailscale via Cask.

**Linux:** same tools via APT + Cargo + ctop binary to `~/.local/bin`; Tailscale via official install script.

### Step 10 — SSH Server *(Linux only)*

- Installs `openssh-server`
- Enables and starts the `ssh` systemd service
- Configures `PermitRootLogin yes` and `PasswordAuthentication yes`
- Backs up original `sshd_config` before modifying

### Step 11 — Shell (ZSH & Starship)

- Installs ZSH (Linux via APT; already default on macOS)
- Installs Oh My Zsh (unattended)
- Clones `zsh-autosuggestions` and `zsh-syntax-highlighting` plugins
- Installs Nerd Fonts: **FiraCode** and **JetBrains Mono** (Homebrew Cask on macOS; downloaded to `~/.local/share/fonts` on Linux)
- Installs Starship prompt and applies the **Gruvbox Rainbow** preset
- Downloads the appropriate `.zshrc`:
  - macOS → [`conf/zshrc-macos.zsh`](../../../conf/zshrc-macos.zsh)
  - Linux → [`conf/zshrc-linux.zsh`](../../../conf/zshrc-linux.zsh)

### Step 12 — Tmux & Plugins

- Clones [TPM](https://github.com/tmux-plugins/tpm) to `~/.tmux/plugins/tpm`
- Downloads [`conf/tmux-desktop.conf`](../../../conf/tmux-desktop.conf) to `~/.tmux.conf`
- Kills any running tmux session to apply the new config

Press `prefix + I` inside tmux to install all plugins. See [tmux.md](tmux.md) for the full plugin and keybinding reference.

### Step 13 — AI CLI Tools

Installed globally via `npm install -g`:

| Tool               | Package                          |
| ------------------ | -------------------------------- |
| Agentlytics        | `agentlytics`                    |
| Claude Code        | `@anthropic-ai/claude-code`      |
| Gemini CLI         | `@google/gemini-cli`             |
| OpenAI Codex       | `@openai/codex`                  |
| GitHub Copilot CLI | `@githubnext/github-copilot-cli` |

### Step 14 — Finalization & Cleanup

**macOS:** `brew cleanup --prune=all`, `brew autoremove`, clears `~/Library/Caches` and `~/.Trash`.

**Linux:** `apt autoremove`, `apt clean`, removes temp archives and vacuums journal logs; clears `~/.cache/pip`, `~/.cache/composer`, `~/.npm/_npx`, `~/.bundle/cache`.

**Both:** configures PM2 auto-startup (launchd on macOS, systemd on Linux), runs `pm2 save`, sets `pm2:autodump true`, downloads `ecosystem.config.js` to `~/ecosystem.config.js`.

See [pm2.md](pm2.md) for the full PM2 reference.

---

## Shell Configuration

Each platform gets a dedicated `.zshrc`:

| File                                               | Platform | Key paths                                    |
| -------------------------------------------------- | -------- | -------------------------------------------- |
| [`zshrc-macos.zsh`](../../../conf/zshrc-macos.zsh) | macOS    | Homebrew, Cargo, Composer, Go, Bun           |
| [`zshrc-linux.zsh`](../../../conf/zshrc-linux.zsh) | Linux    | Linuxbrew, npm-global, Cargo, Go, Bun, rbenv |

### Aliases

| Alias      | Command                                                                               |
| ---------- | ------------------------------------------------------------------------------------- |
| `reload`   | `source ~/.zshrc`                                                                     |
| `zconfig`  | `nano ~/.zshrc`                                                                       |
| `update`   | `brew update && brew upgrade` (macOS) / `sudo apt update && sudo apt upgrade` (Linux) |
| `brewup`   | `brew update && brew upgrade && brew cleanup`                                         |
| `ge`       | `gemini --approval-mode=yolo`                                                         |
| `cc`       | `claude --permission-mode=auto --dangerously-skip-permissions`                        |
| `d`        | `docker`                                                                              |
| `dc`       | `docker compose`                                                                      |
| `art`      | `php artisan`                                                                         |
| `syslog`   | `sudo journalctl -f` *(Linux only)*                                                   |
| `ports`    | `ss -tulnp` *(Linux only)*                                                            |
| `meminfo`  | `free -h` *(Linux only)*                                                              |
| `diskinfo` | `df -h` *(Linux only)*                                                                |
| `cpuinfo`  | `lscpu` *(Linux only)*                                                                |

### Oh My Zsh Plugins

`git rsync cp extract zoxide fzf zsh-autosuggestions zsh-syntax-highlighting brew gh ansible docker docker-compose laravel composer rails ruby python pip node npm bun golang rust` + `macos` (macOS only) / `nmap tmux` (Linux only)

---

## License

Licensed under the **GNU General Public License v3.0** — see [LICENSE](../../LICENSE) for details.

Maintained by [promovaweb.com](https://promovaweb.com) · <contato@promovaweb.com>

---
> Follow the formatting guide: [Markdown Format Guide](.claude/commands/markdown-format.md)
