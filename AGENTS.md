# AGENTS.md

This file provides instructions and context for OpenAI Codex when working with the **SetupVibe** repository.

## What This Project Is

**SetupVibe** is a cross-platform automated development environment setup script (v0.41.11). It installs and configures a complete developer toolkit in one command, supporting Windows 11 22H2+, macOS 12+, and Linux (Ubuntu 24.04+, Debian 12+, Zorin OS 18+).

There are three editions:

- `desktop.sh` — macOS, Linux desktops, and WSL; full stack including language ecosystems, GUI tools, and AI CLIs
- `desktop.ps1` — native x64 Windows 11 22H2+ (Beta); Windows utilities, Python 3.14, Node.js 24 LTS, Claude Code, Codex CLI, Antigravity CLI, and the WSL 2 base without a Linux distribution, frameworks, or runtime managers
- `server.sh` — Linux-only; lean install focused on DevOps tools, Docker, shell, and monitoring

## How to Run

There are no build tools, package managers, or test suites. Scripts are executed directly:

```bash
# Run locally
bash desktop.sh
bash server.sh

# Or via curl (canonical usage)
curl -sSL desktop.setupvibe.dev | bash
```

```powershell
# Run from the canonical Windows setup URL; it requests standard UAC elevation without changing the UAC policy
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; irm https://windows.setupvibe.dev | iex

# Or run a local copy
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\desktop.ps1

# Remove every utility and configuration managed by the Windows Edition
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\desktop.ps1 -Uninstall
```

To test changes to a script, run it directly on a target machine or VM.

### Required Debian Context

Before changing, investigating, or testing `desktop.sh`, `server.sh`, Linux
configuration files, or Linux documentation, read [`DEBIAN.md`](DEBIAN.md)
completely. It is the required supplemental context for Linux implementation,
privilege handling, container integration tests, and known Debian constraints.
Update it whenever a real Linux test reveals a new requirement or limitation.

## Architecture

### Script Structure

Both `desktop.sh` and `server.sh` follow a numbered-step pattern (functions prefixed with `step_NN_`). Each step installs a logical group of tools. The scripts:

1. Detect OS, distro, and CPU architecture (`x86_64` vs `arm64/aarch64`)
2. Detect how the script was invoked (as root, via `sudo`, or as normal user) to correctly identify `$REAL_USER` and `$REAL_HOME`
3. Use `sudo` only where elevated privileges are required; everything else installs into `$HOME/.local/bin`
4. Clean up legacy APT repository entries before adding new ones (avoids GPG signature errors)

### Windows Script Structure

`desktop.ps1` contains native Windows utility, Python, Node.js, selected AI CLI, and WSL base logic. It supports local and remote execution, requests standard UAC elevation without changing the UAC policy, requires x64 Windows 11 22H2 build 22621 or later, rejects Windows Server, 32-bit Windows, Windows on ARM, and elevation with credentials for a different administrator account, detects installed components for idempotent reruns, and logs to `C:\ProgramData\SetupVibe\Logs`. Before installation or removal, it lists competing installer processes and asks before stopping them; when accepted, it tries `Stop-Process` normally, forces processes that remain, and always runs `sfc.exe /scannow` afterward. When declined, it waits for ENTER and exits. It also rejects pending CBS or Windows Update restarts, starts required services, checks WSUS policy, validates the component store, and writes dedicated logs. OpenSSH must bypass Windows Features on Demand and the GitHub releases API: resolve the latest release through the official `PowerShell/Win32-OpenSSH` `releases/latest` page, inspect its expanded assets, download only `OpenSSH-Win64-*.msi`, validate its Authenticode signature, install `ADDLOCAL=Client,Server`, force-repair all installed OpenSSH files, prepend its directory to the machine `PATH`, verify `ssh.exe -V`, set `sshd` to automatic startup, start it, and enable the inbound TCP/22 firewall rule while preserving its prior state for removal. Windows helper scripts listed in the installer are copied to `%USERPROFILE%\.setupvibe\bin`, registered in the user `PATH`, and tracked for safe removal. The `ssh_copy_id` helper uses a PowerShell core with a minimal CMD launcher and requires the signed OpenSSH MSI installed by SetupVibe instead of using Windows Features on Demand. Python 3.14 is downloaded directly from `python.org` and installed for all users; Node.js 24 LTS is resolved directly from the official `latest-v24.x` channel on `nodejs.org`, using `curl.exe` with HTTPS-only redirects and retries instead of the release-index API. Neither runtime may use WinGet or Chocolatey. Both installers require valid Authenticode signatures, the Node.js MSI must match the official `SHASUMS256.txt`, their executable directories are prepended to the machine `PATH`, and `python`, `pip`, `node`, `npm`, and `npx` are verified for Claude and Codex. Claude Code must use Anthropic's official native Windows installer, Codex CLI must use OpenAI's official standalone Windows installer, and Antigravity CLI must use Google's official native installer with `--skip-aliases` and `--skip-path`; all three commands are validated after installation. Persistent `PATH` changes must be normalized, deduplicated, broadcast to Windows, and validated against the intended executable. The Windows shell must remain original: do not install Starship or ZSH, do not write PowerShell profile initialization, do not persist execution-policy changes, preserve user PowerShell profile bytes around third-party installers, remove only recognized SetupVibe profile blocks left by earlier Beta versions without re-encoding unrelated content, preserve the user's Starship configuration, and keep zoxide as an uninitialized CLI utility only. Windows Terminal is installed through `Microsoft.WindowsTerminal`, `wt.exe` availability is validated, and its default profile is never changed. It installs WSL without a Linux distribution, makes WSL 2 the default, and configures mirrored VPN/LAN networking, Hyper-V firewall inbound access, DNS tunneling, Windows proxy integration, automatic memory reclaim, and sparse VHDs. Existing `.wslconfig`, optional-feature, and firewall states are backed up before changes; legacy numeric optional-feature state files must also restore safely. The `-Uninstall` mode removes all managed utilities and configurations, restores the previous WSL and OpenSSH firewall states, cleans language ecosystems left by earlier Windows Beta versions, and removes only stale legacy toolchain `PATH` entries whose directories no longer exist while preserving Linux distribution data, active user-managed paths, AI CLI user configuration and credentials, WinGet, Chocolatey, and logs. Python and Node.js are the only installed programming runtimes; it must not install frameworks, runtime managers, other programming languages, other AI CLIs, or a Linux distribution. Installed WSL distributions are configured separately by `desktop.sh`.

While the Windows Edition is in Beta, every SetupVibe repository URL in Windows-specific scripts and documentation must target the `windows` branch. Align all of these URLs with the primary branch only after the Windows work is merged.

### `desktop.sh` Steps (14)

1. Base system & build tools
2. Homebrew
3. PHP 8.5 (Composer, Laravel)
4. Ruby 3.4.10 (rbenv, Rails)
5. Go 1.26.5, Rust, Python (uv, user-global `qrcode` via pip; Python 3.14 on macOS)
6. JavaScript (Node, Bun, PNPM)
7. DevOps (Docker, Ansible, GitHub CLI)
8. Modern Unix tools via Homebrew
9. Network, monitoring & Tailscale
10. SSH server (Linux only)
11. ZSH, Oh-My-Zsh, Starship
12. Tmux & TPM plugins
13. AI CLI tools
14. Finalization & cleanup

### `server.sh` Steps (9)

Subset of desktop steps — no Homebrew, no language ecosystems (PHP, Ruby, Python, Go, Rust) or desktop-specific tools. Node.js is installed via NodeSource APT repo. Focus on base tools, Docker, Ansible, shell, tmux, monitoring, and AI CLIs.

### `docs/` Directory

| Path                        | Content                                                           |
| --------------------------- | ----------------------------------------------------------------- |
| `docs/README.md`            | Overview and comparison table of all editions                     |
| `docs/desktop/en/README.md` | Full desktop edition documentation (14 steps)                     |
| `docs/server/en/README.md`  | Server edition documentation (9 steps)                            |
| `docs/windows/en/README.md` | Windows edition (Beta) documentation                              |
| `docs/en/EXECUTABLES.md`    | Executable helper script documentation (shared by both editions)  |
| `docs/desktop/en/tmux.md`   | Tmux plugin and keybinding reference (shared by both editions)    |
| `docs/desktop/en/pm2.md`    | PM2 command and configuration reference (shared by both editions) |

### `brand/` Directory

`brand/` is the normative source for the SetupVibe visual and verbal
identity. It contains light and dark logo variants, PNG fallback, design
tokens, local webfonts, brand description, voice guide, usage rules, and the
publication checklist.

| Path | Content |
| --- | --- |
| `brand/README.md` | Brand overview and governance |
| `brand/description.md` | Positioning, promise, tagline, and institutional descriptions |
| `brand/logo/icon.svg` | Canonical vector symbol |
| `brand/logo/icon.png` | Raster fallback |
| `brand/logo/logo-light.svg` | Horizontal signature for light surfaces |
| `brand/logo/logo-dark.svg` | Horizontal signature for dark surfaces |
| `brand/logo/logotype.svg` | Compatibility alias for the light signature |
| `brand/logo/LOGO.md` | Construction and usage contract |
| `brand/colors/palette.json` | Editable color source |
| `brand/global.css` | Webfonts and semantic CSS tokens |
| `brand/tailwind-theme.js` | Tailwind CSS theme extension |
| `brand/typography/README.md` | Web typography guide |
| `brand/voice/voice.md` | Operational voice and terminology |
| `brand/checklist.md` | Brand Gate for publication |

Update the relevant normative file whenever a public asset, tagline,
description, or voice rule changes. Do not create divergent logo copies inside
this repository.

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

### `bin/` Directory

Executable helper scripts deployed by the installers to `~/.setupvibe/bin`:

| File | Deployed to | Purpose |
| --- | --- | --- |
| `ssh_copy_id` | `~/.setupvibe/bin/ssh_copy_id` | Copies the local public SSH key to a remote server using `--host`, `--user`, and optional `--pass` or hidden password prompt |

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

The version number is defined at the top of `desktop.sh`, `desktop.ps1`, and `server.sh`. **Whenever a version is changed, it must be updated in ALL related files to maintain consistency**, including:

- `desktop.sh` (version variable)
- `desktop.ps1` (version variable)
- `server.sh` (version variable)
- `CHANGELOG.md` (new entry)
- `README.md` (root project overview)
- `AGENTS.md` (project overview)
- `CLAUDE.md` (project overview)
- All `README.md` files in the `docs/` directory and its subfolders.
- Any other documentation referring to the current version.

## Markdown Standards

All `.md` files in this project must conform to the rules defined in [`MARKDOWN.md`](MARKDOWN.md). That file is the single source of truth for formatting rules, markdownlint rule IDs, configuration, and examples.

The linting configuration is in [`.markdownlint.json`](.markdownlint.json) at the project root.

## AI Context and Skill Synchronization

**`AGENTS.md` and `CLAUDE.md` are the two primary AI context files for this project.** They must always be kept in sync with each other for shared project rules.

### Context Rule

Whenever either file is modified — to add a new convention, update architecture information, change a rule, or correct an error — the **same shared change must be applied to the other file** before the task is considered complete.

### Skill Rule

Codex and Claude maintain separate skill folders:

- `.codex/skills` — Codex-specific skills using Codex terminology, tools, and workflows.
- `.claude/skills` — Claude-specific skills using Claude Code terminology, tools, and workflows.

Whenever a skill is added, removed, renamed, or materially changed in one folder, the equivalent skill must be updated in the other folder. The workflows should stay functionally aligned, but platform-specific instructions must remain native to each agent.

### Scope

This synchronization rule covers:

- Project overview and version references
- Architecture descriptions and step counts
- Key scripting patterns and conventions
- Versioning policy (the list of files to update)
- Markdown standards reference
- Skill inventory and cross-agent skill compatibility rules
- Any new global rule or policy added to one file

### What is NOT synchronized

Each file may contain sections specific to its target agent (tool-specific invocation syntax, skill references, etc.). Those sections are intentionally different and must not be overwritten.

No third AI agent context is maintained for this repository. Do not add extra agent context files, skill folders, or synchronization requirements unless the project explicitly adopts that agent.

---
