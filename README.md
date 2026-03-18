# SetupVibe

> The ultimate cross-platform development environment setup script — v0.32.0

## Overview

**SetupVibe** is a comprehensive, automated setup script that transforms your development environment into a powerful, modern workspace. It installs and configures a complete development stack in one command, supporting macOS and major Linux distributions.

Perfect for developers, DevOps engineers, and system administrators who want a fully configured environment without the hassle of manual setup.

## System Requirements

| | Supported |
|---|---|
| **macOS** | 12 Monterey and newer |
| **Ubuntu** | 24.04+ |
| **Debian** | 12+ |
| **Zorin OS** | 18+ |
| **Linux Mint** | 21+ |
| **Architectures** | x86_64 (amd64), ARM64 (aarch64) |

## Installation

### Desktop (macOS & Linux)

```bash
curl -sL https://raw.githubusercontent.com/promovaweb/setupvibe/refs/heads/main/desktop.sh | bash
```

### Server (Linux only)

```bash
curl -sL https://raw.githubusercontent.com/promovaweb/setupvibe/refs/heads/main/server.sh | bash
```

> The process takes 20–60 minutes depending on your internet speed and hardware.

---

## Desktop Setup — What Gets Installed

**14 steps, fully automated.**

| Step | What it does |
|---|---|
| 1. Base System & Build Tools | Essential compilers, curl, git, build-essential |
| 2. Homebrew | Package manager for macOS and Linux |
| 3. PHP 8.4 Ecosystem | PHP, Composer, Laravel installer |
| 4. Ruby Ecosystem | rbenv, Ruby, Bundler, Rails |
| 5. Languages | Go, Rust, Python + `uv` package manager |
| 6. JavaScript | Node.js, Bun, PNPM |
| 7. DevOps | Docker, Docker Compose, Ansible, GitHub CLI |
| 8. Modern Unix Tools | bat, eza, fd, ripgrep, fzf, zoxide, delta, and more |
| 9. Network & Monitoring | nmap, htop, Tailscale, and others |
| 10. SSH Server | OpenSSH server (Linux only) |
| 11. Shell | ZSH, Oh My Zsh, Starship prompt (Gruvbox Rainbow) |
| 12. Tmux & Plugins | TPM + tmux.conf with full plugin set |
| 13. AI CLI Tools | claude-code, gemini-cli, codex, copilot-cli |
| 14. Finalization & Cleanup | Temp files, logs, cache purge |

---

## Server Setup — What Gets Installed

**11 steps, Linux-only, no desktop or dev language tools.**

| Step | What it does |
|---|---|
| 0. Prerequisites | Architecture check, APT preparation |
| 1. Base System & Build Tools | Essential packages and build tools |
| 2. Homebrew | Package manager |
| 3. Docker, Ansible & GitHub CLI | Container runtime and DevOps tools |
| 4. Modern Unix Tools | CLI productivity utilities via Brew |
| 5. Network & Monitoring | nmap, htop, Tailscale |
| 6. SSH Server | OpenSSH server configuration |
| 7. Shell | ZSH, Oh My Zsh, Starship prompt (Gruvbox Rainbow) |
| 8. Tmux & Plugins | TPM + tmux.conf with full plugin set |
| 9. AI CLI Tools | claude-code, gemini-cli, codex, copilot-cli |
| 10. Finalization | Cleanup and validation |

---

## Shell Configuration

Each environment gets a dedicated `.zshrc` downloaded from this repository:

| File | Used by |
|---|---|
| [`zshrc-macos.zsh`](zshrc-macos.zsh) | desktop.sh on macOS |
| [`zshrc-linux.zsh`](zshrc-linux.zsh) | desktop.sh on Linux |
| [`zshrc-server.zsh`](zshrc-server.zsh) | server.sh |

All configs include:
- Homebrew PATH setup
- Oh My Zsh with a curated plugin set
- Starship prompt (Gruvbox Rainbow preset)
- zoxide, fzf, Rust, Go, Bun, rbenv PATH exports
- Useful aliases (`d`, `dc`, `art`, `brewup`, `reload`, etc.)

---

## Tmux Configuration

A shared [`tmux.conf`](tmux.conf) is downloaded and applied on both setups. For full documentation, keybinding reference, and plugin guide see **[tmux.md](tmux.md)**.

### Plugins

| Category | Plugin |
|---|---|
| Core | tmux-plugins/tpm, tmux-plugins/tmux-sensible |
| Navigation | tmux-plugins/tmux-pain-control, christoomey/vim-tmux-navigator |
| Mouse | NHDaly/tmux-better-mouse-mode |
| Copy & Clipboard | tmux-plugins/tmux-yank, CrispyConductor/tmux-copy-toolkit, abhinav/tmux-fastcopy |
| URL & Files | tmux-plugins/tmux-open, wfxr/tmux-fzf-url |
| Sessions | tmux-plugins/tmux-resurrect, tmux-plugins/tmux-continuum, omerxx/tmux-sessionx |
| Fuzzy Finder | sainnhe/tmux-fzf |
| UI | Freed-Wu/tmux-digit, anghootys/tmux-ip-address, tmux-plugins/tmux-prefix-highlight, alexwforsythe/tmux-which-key, jaclu/tmux-menus |
| Theme | 2KAbhishek/tmux2k (onedark, with git/cwd/docker/mise/cpu/ram/network/time) |

After installation, press `prefix + I` inside tmux to install all plugins.

---

## AI CLI Tools

Installed globally via npm on both setups:

| Tool | Package |
|---|---|
| Claude Code | `@anthropic-ai/claude-code` |
| Gemini CLI | `@google/gemini-cli` |
| OpenAI Codex | `@openai/codex` |
| GitHub Copilot CLI | `@githubnext/github-copilot-cli` |

---

## License

Licensed under the **GNU General Public License v3.0** — see [LICENSE](LICENSE) for details.

## Credits

Maintained by [promovaweb.com](https://promovaweb.com) · contact@promovaweb.com

---

**SetupVibe** — Your ultimate development environment, automated.
