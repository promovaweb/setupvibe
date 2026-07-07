# AGENTS.md

This file provides instructions and context for AI coding agents (OpenAI Codex, Cursor, GitHub Copilot, and similar tools) when working with the **SetupVibe** repository.

## What This Project Is

**SetupVibe** is a cross-platform automated development environment setup script (v0.41.7). It installs and configures a complete developer toolkit in one command, supporting macOS 12+ and Linux (Ubuntu 24.04+, Debian 12+, Zorin OS 18+).

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
curl -sSL desktop.setupvibe.dev | bash

# Optional .NET SDK (default .NET 10; also --install-dotnet=8|9|10)
curl -sSL desktop.setupvibe.dev | bash -s -- --install-dotnet
curl -sSL server.setupvibe.dev | bash -s -- --manager --install-dotnet
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

| Path | Content |
| --- | --- |
| `docs/README.md` | Overview and comparison table of both editions |
| `docs/desktop/en/README.md` | Full desktop edition documentation (14 steps) |
| `docs/server/en/README.md` | Server edition documentation (9 steps) |
| `docs/desktop/en/tmux.md` | Tmux plugin and keybinding reference (shared by both editions) |
| `docs/desktop/en/pm2.md` | PM2 command and configuration reference (shared by both editions) |

### `conf/` Directory

Configuration files deployed by the scripts to the user's home directory:

| File | Deployed to | Purpose |
| --- | --- | --- |
| `tmux-desktop.conf` | `~/.tmux.conf` (desktop) | Tmux with TPM; 20+ plugins, onedark theme, mouse support, session persistence |
| `tmux-server.conf` | `~/.tmux.conf` (server) | Lean tmux config for server environments |
| `zshrc-macos.zsh` | `~/.zshrc` (macOS) | Homebrew, Cargo, Composer, Go, Bun, rbenv paths |
| `zshrc-linux.zsh` | `~/.zshrc` (Linux desktop) | Linuxbrew paths, NPM, system aliases |
| `zshrc-server.zsh` | `~/.zshrc` (server) | Server-specific shell config |
| `ecosystem.config.js` | Used with PM2 | PM2 config for two app processes |

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

## Development Conventions

- **Helper Functions**: Use `user_do` to run commands as the real user and `sys_do` for commands requiring elevated privileges.
- **Keyring Management**: APT keys go in `/etc/apt/keyrings/`. Always remove legacy sources before adding new ones to prevent signature conflicts.
- **Lock Management**: In `server.sh`, check for APT locks before package operations to avoid failures on boot.

## Versioning

The version number is defined at the top of both `desktop.sh` and `server.sh`. **Whenever a version is changed, it must be updated in ALL related files to maintain consistency**, including:

- `desktop.sh` (version variable)
- `server.sh` (version variable)
- `CHANGELOG.md` (new entry)
- `README.md` (root project overview)
- `AGENTS.md` (project overview)
- `CLAUDE.md` (project overview)
- `GEMINI.md` (project overview)
- All `README.md` files in the `docs/` directory and its subfolders.
- Any other documentation referring to the current version.

## Markdown Standards

All `.md` files in this project must conform to the rules defined in [`MARKDOWN.md`](MARKDOWN.md). That file is the single source of truth for formatting rules, markdownlint rule IDs, configuration, and examples.

The linting configuration is in [`.markdownlint.json`](.markdownlint.json) at the project root.

## AI Context File Synchronization

**`AGENTS.md`, `CLAUDE.md`, and `GEMINI.md` are the three primary AI context files for this project.** They must always be kept in sync with each other.

### Rule

Whenever any one of these three files is modified — to add a new convention, update architecture information, change a rule, or correct an error — the **same change must be applied to the other two files** before the task is considered complete.

### Scope

This synchronization rule covers:

- Project overview and version references
- Architecture descriptions and step counts
- Key scripting patterns and conventions
- Versioning policy (the list of files to update)
- Markdown standards reference
- Any new global rule or policy added to one file

### What is NOT synchronized

Each file may contain sections specific to its target agent (tool-specific invocation syntax, skill references, etc.). Those sections are intentionally different and must not be overwritten.

---
