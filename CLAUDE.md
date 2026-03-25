# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

**SetupVibe** is a cross-platform automated development environment setup script (v0.34.0). It installs and configures a complete developer toolkit in one command, supporting macOS 12+ and Linux (Ubuntu 24.04+, Debian 12+, Zorin OS 18+).

There are two editions:

- `desktop.sh` — macOS & Linux desktops; full stack including language ecosystems, GUI tools, and AI CLIs
- `server.sh` — Linux-only; lean install focused on DevOps tools, Docker, shell, and monitoring

## How to Run

There are no build tools, package managers, or test suites. Scripts are executed directly:

```bash
# Run locally
bash desktop.sh
bash server.sh

# Or via curl (canonical usage)
curl -sL https://raw.githubusercontent.com/promovaweb/setupvibe/refs/heads/main/desktop.sh | bash
```

To test changes to a script, run it directly on a target machine or VM.

## Architecture

### Script Structure

Both `desktop.sh` and `server.sh` follow a numbered-step pattern (functions prefixed with `step_NN_`). Each step installs a logical group of tools. The scripts:

1. Detect OS, distro, and CPU architecture (`x86_64` vs `arm64/aarch64`)
2. Detect how the script was invoked (as root, via `sudo`, or as normal user) to correctly identify `$REAL_USER` and `$REAL_HOME`
3. Use `sudo` only where elevated privileges are required; everything else installs into `$HOME/.local/bin`
4. Clean up legacy APT repository entries before adding new ones (avoids GPG signature errors)

### `desktop.sh` Steps (14)

1. Base system & build tools
2. Homebrew
3. PHP 8.4 (Composer, Laravel)
4. Ruby (rbenv, Rails)
5. Go, Rust, Python (uv)
6. JavaScript (Node, Bun, PNPM)
7. DevOps (Docker, Ansible, GitHub CLI)
8. Modern Unix tools via Homebrew
9. Network, monitoring & Tailscale
10. SSH server (Linux only)
11. ZSH, Oh-My-Zsh, Starship
12. Tmux & TPM plugins
13. AI CLI tools (includes n8n)
14. Finalization & cleanup

### `server.sh` Steps (9)

Subset of desktop steps — no Homebrew, no language ecosystems (PHP, Ruby, Python, Go, Rust) or desktop-specific tools. Node.js is installed via NodeSource APT repo. Focus on base tools, Docker, Ansible, shell, tmux, monitoring, and AI CLIs.

### `docs/` Directory

| Path                        | Content                                                           |
| --------------------------- | ----------------------------------------------------------------- |
| `docs/README.md`            | Overview and comparison table of both editions                    |
| `docs/desktop/en/README.md` | Full desktop edition documentation (14 steps)                     |
| `docs/server/en/README.md`  | Server edition documentation (9 steps)                            |
| `docs/desktop/en/tmux.md`   | Tmux plugin and keybinding reference (shared by both editions)    |
| `docs/desktop/en/pm2.md`    | PM2 command and configuration reference (shared by both editions) |

### `conf/` Directory

Configuration files deployed by the scripts to the user's home directory:

| File                  | Deployed to                | Purpose                                                                       |
| --------------------- | -------------------------- | ----------------------------------------------------------------------------- |
| `tmux.conf`           | `~/.tmux.conf`             | Tmux with TPM; 20+ plugins, onedark theme, mouse support, session persistence |
| `zshrc-macos.zsh`     | `~/.zshrc` (macOS)         | Homebrew, Cargo, Composer, Go, Bun, rbenv paths                               |
| `zshrc-linux.zsh`     | `~/.zshrc` (Linux desktop) | Linuxbrew paths, NPM, system aliases                                          |
| `zshrc-server.zsh`    | `~/.zshrc` (server)        | Server-specific shell config                                                  |
| `ecosystem.config.js` | Used with PM2              | PM2 config for two app processes                                              |

## Key Scripting Patterns

**User detection** — scripts handle being run as root, `sudo bash`, or plain user:

```bash
REAL_USER="${SUDO_USER:-$(whoami)}"
REAL_HOME=$(getent passwd "$REAL_USER" | cut -d: -f6)
```

**APT keyring management** — keyrings go in `/etc/apt/keyrings/`; legacy entries in `/etc/apt/sources.list.d/` are removed before re-adding to avoid signature errors.

**APT lock waiting** — server script polls for APT lock release before running apt commands (needed for cloud VMs with unattended-upgrades running at boot).

**Architecture detection**:

```bash
ARCH_RAW=$(dpkg --print-architecture)  # amd64 or arm64
```

## Versioning

The version string appears in both `desktop.sh` and `server.sh` near the top of each file. Update both when bumping the version.
