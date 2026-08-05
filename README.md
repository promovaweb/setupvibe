# SetupVibe

> The ultimate cross-platform development environment setup script — v0.41.11

Installs and configures a development environment in one command, supporting Windows 11, macOS, and major Linux distributions. The Windows Edition focuses on native utilities, Python, Node.js, selected native AI CLIs, and the WSL 2 base system. The Unix Desktop Edition includes complete language ecosystems and a broader AI toolkit, while the Server Edition remains focused on operations tooling.

## Key Features

- **Administrator Setup:** Requests standard UAC elevation on Windows without changing the UAC policy; uses `sudo` only where required on macOS and Linux.
- **Safe Windows Servicing:** Asks before stopping competing installers, tries a normal stop before forcing remaining processes, runs `sfc.exe /scannow` afterward, rejects pending restarts, and validates the component store.
- **Reliable OpenSSH Installation:** Resolves the latest official x64 Win32-OpenSSH MSI directly from its GitHub release page without the releases API, force-installs the client and server, and configures `sshd` and TCP/22 independently of DISM, Features on Demand, WSUS, or Windows Update.
- **Native Package Management:** Uses WinGet and Chocolatey on Windows, with Homebrew or APT on Unix systems.
- **Native Windows Shell:** Keeps Windows PowerShell and PowerShell 7 profiles unchanged, without Starship, ZSH, automatic zoxide initialization, or persistent execution-policy changes; Unix editions retain ZSH, Oh My Zsh, and Starship.
- **Optimized Terminals:** Installs Windows Terminal on Windows and configures Tmux + TPM on Unix systems.
- **Global Helper Scripts:** Installs Windows helper scripts in `%USERPROFILE%\.setupvibe\bin` and adds the directory to the user's `PATH`.
- **AI Runtime Foundation:** Installs and validates Python 3.14 directly from `python.org` and Node.js 24 LTS from the official `latest-v24.x` channel on `nodejs.org`, automatically repairs missing runtime files, and exposes `python`, `pip`, `node`, `npm`, and `npx` in the Windows machine `PATH` for Claude and Codex.
- **Native Windows AI CLIs:** Installs Claude Code through Anthropic's recommended native installer with its official npm package as a recovery path, Codex CLI through OpenAI's official standalone Windows installer, OpenCode CLI, and Google Antigravity CLI as `agy`, while preserving PowerShell profiles and restricted execution policies.
- **Agent Skills:** Installs and validates the [Vercel Labs Skills CLI](https://github.com/vercel-labs/skills) on Desktop, Windows, and Server editions.
- **Agent Multiplexer:** Installs and validates [Herdr](https://github.com/herdrdev/herdr) on the Unix Desktop and Server editions, with a dedicated [usage guide](docs/en/HERDR.md).
- **Unix Antigravity CLI:** Installs Google's Antigravity CLI as `agy` on the Unix Desktop edition, resolving and SHA-512-verifying its versioned release manifest directly (the official Unix bootstrapper does not forward `--skip-aliases`/`--skip-path` to its own `agy install` step) and running `agy install --skip-aliases --skip-path` explicitly so shell profiles stay untouched.
- **WSL 2 Ready:** Installs the WSL base without a Linux distribution and configures mirrored VPN/LAN networking and development optimizations on Windows 11.
- **Smart Privilege Elevation:** Uses `sudo` only where strictly necessary on macOS and Linux; most tools are installed in `$HOME/.local/bin`.
- **Global QR Code Generator:** Installs the PyPI `qrcode` package for the target user on macOS and Linux, exposing its `qr` command in the shell.
- **Auto-Update:** Automatically upgrades existing Homebrew packages during setup.
- **Modern Shell:** ZSH + Oh My Zsh + Starship with a curated set of plugins and aliases.
- **Optimized Tmux:** Pre-configured with TPM, intuitive keybindings, and window/pane numbering starting at 1.
- **Current Runtimes:** PHP 8.5, Ruby 3.4.10, Go 1.26.5, Python 3.14 on macOS, and Node.js 24 LTS.
- **AI-Ready Unix Editions:** Includes the latest AI CLI tools for developers on macOS, Linux, and WSL.

## Documentation

|                        | Link                                                       |
| ---------------------- | ---------------------------------------------------------- |
| Overview               | [docs/README.md](docs/README.md)                           |
| Desktop Edition        | [docs/desktop/README.md](docs/desktop/README.md)           |
| Windows Edition (Beta) | [docs/windows/README.md](docs/windows/README.md)           |
| Server Edition         | [docs/server/README.md](docs/server/README.md)             |
| Debian Engineering     | [DEBIAN.md](DEBIAN.md)                                     |
| Tmux Guide             | [docs/desktop/en/tmux.md](docs/desktop/en/tmux.md)         |
| PM2 Guide              | [docs/desktop/en/pm2.md](docs/desktop/en/pm2.md)           |

## Brand

The official light and dark logos, color tokens, local webfonts, brand
description, and voice guide live in [`brand/`](brand/). Use the SVG assets
and semantic tokens by default, then follow the publication checklist before
creating public material.

## Quick Start

### Desktop (macOS, Linux & WSL)

```bash
curl -sSL desktop.setupvibe.dev | bash
```

### Windows Desktop (Beta)

Run the Windows utility installer from the canonical SetupVibe URL. It requests administrator access through the standard UAC prompt without changing the UAC policy.

```powershell
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; irm https://windows.setupvibe.dev | iex
```

See the [Windows installation guide](docs/windows/README.md) for local installation, verification, logs, restart options, and the `-Uninstall` mode.

### Server (Linux only)

```bash
curl -sSL server.setupvibe.dev | bash
```

To initialize Docker Swarm automatically after setup:

```bash
curl -sSL server.setupvibe.dev | bash -s -- --manager
```

Add `--yes` for unattended installation or `--advertise-addr ADDRESS` to choose the Swarm address or interface explicitly.

## Contributing

We welcome contributions of all sizes! Please read our [Contribution Guide](CONTRIBUTING.md) to get started.

---

Maintained by [promovaweb.com](https://promovaweb.com) · Licensed under [GPL-3.0](LICENSE)

---
