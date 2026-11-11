# SetupVibe Documentation

> Automated development environment setup — v0.41.18

SetupVibe transforms a machine into a configured development workspace in one command. It supports four editions depending on your target:

| Edition            | Script        | Platforms                                            | Guides                                                                                                               |
| ------------------ | ------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Desktop**        | `desktop.sh`  | macOS 12+, Linux desktops, and WSL                   | [EN](desktop/en/README.md) · [PT](desktop/pt-br/README.md) · [FR](desktop/fr/README.md) · [ES](desktop/es/README.md) |
| **Windows (Beta)** | `desktop.ps1` | Windows 11 22H2+ (build 22621+)                      | [EN](windows/en/README.md) · [PT](windows/pt-br/README.md) · [FR](windows/fr/README.md) · [ES](windows/es/README.md) |
| **Server**         | `server.sh`   | Ubuntu 24.04+, Debian 12+, Zorin OS 18+ (Linux only) | [EN](server/en/README.md) · [PT](server/pt-br/README.md) · [FR](server/fr/README.md) · [ES](server/es/README.md)     |
| **Omarchy 4**      | `omarchy.sh`  | Omarchy 4 (Arch Linux, x86_64)                       | [PT](omarchy/README.md)                                                                                              |

## Quick Start

### Desktop (macOS, Linux & WSL)

```bash
curl --proto '=https' --tlsv1.2 -fsSL https://desktop.setupvibe.dev | bash
```

### Windows Desktop (Beta)

```powershell
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; irm https://windows.setupvibe.dev | iex
```

### Server (Linux only)

```bash
curl --proto '=https' --tlsv1.2 -fsSL https://server.setupvibe.dev | bash
```

To initialize Docker Swarm automatically after setup:

```bash
curl --proto '=https' --tlsv1.2 -fsSL https://server.setupvibe.dev | bash -s -- --manager
```

Add `--yes` for unattended installation or `--advertise-addr ADDRESS` to choose the Swarm address or interface explicitly.

## Omarchy 4

The Omarchy edition is additive. It keeps the Omarchy shell, prompt, aliases,
Tmux, Docker, mise, runtimes and tools that already ship with the operating
system. It adds the SetupVibe layer, including PHP and Laravel, Composer,
Rails tooling, PM2 and pnpm, selected runtimes and utilities, extra AI CLIs,
the SSH helper, Portainer files and a separate Starship configuration.

Run it from the SetupVibe repository or through the raw script URL:

```bash
bash omarchy.sh
curl -fsSL https://raw.githubusercontent.com/promovaweb/setupvibe/main/omarchy.sh | bash
```

Use `--yes` for an unattended run. The script requires an existing Omarchy 4
installation and never executes package-removal commands.

## Edition Comparison

| Feature                               | Desktop        | Windows         | Server  |
| ------------------------------------- | -------------- | --------------- | ------- |
| Base system & CLI tools               | ✔              | ✔               | ✔       |
| Homebrew                              | ✔              | ✗               | ✗       |
| WinGet + Chocolatey                   | ✗              | ✔               | ✗       |
| OpenSSH Client                        | ✔              | ✔               | ✔       |
| WSL 2 base without a distribution     | ✗              | ✔               | ✗       |
| PHP 8.5 + Composer + Laravel          | ✔              | ✗               | ✗       |
| Ruby + rbenv + Rails                  | ✔              | ✗               | ✗       |
| Go, Rust, Python + uv + qrcode        | ✔              | ✗               | ✗       |
| Node.js 24                            | ✔              | Node.js 24 LTS   | ✔ (APT) |
| Bun + PNPM                            | ✔              | ✗                | ✗       |
| Docker + Ansible + GitHub CLI         | ✔              | GitHub CLI only | ✔       |
| Modern Unix tools (bat, eza, fzf…)    | ✔ via Homebrew | ✔               | ✗       |
| Network & monitoring tools            | ✔              | ✔               | ✔       |
| Tailscale                             | ✔              | ✔               | ✔       |
| SSH server                            | ✔ (Linux only) | ✔               | ✔       |
| ZSH + Oh My Zsh + Starship            | ✔              | ✗               | ✔       |
| Nerd Fonts (FiraCode, JetBrains Mono) | ✔              | ✔               | ✗       |
| Tmux + TPM plugins                    | ✔              | ✗               | ✔       |
| AI CLI tools                          | ✔              | ✔ (selected)    | ✔       |
| Vercel Labs Skills CLI                | ✔              | ✔               | ✔       |
| Herdr agent multiplexer               | ✔              | ✗               | ✔       |
| Antigravity CLI (`agy`)               | ✔              | ✔               | ✗       |
| Hermes Agent (install only)           | ✔              | ✗               | ✗       |
| PM2 auto-startup                      | ✔              | ✗               | ✗       |
| Docker Swarm Manager (`--manager`)    | ✗              | ✗               | ✔       |

## Specialized Guides

### Tmux

- [English](desktop/en/tmux.md)
- [Portuguese](desktop/pt-br/tmux.md)
- [French](desktop/fr/tmux.md)
- [Spanish](desktop/es/tmux.md)

### PM2

- [English](desktop/en/pm2.md)
- [Portuguese](desktop/pt-br/pm2.md)
- [French](desktop/fr/pm2.md)
- [Spanish](desktop/es/pm2.md)

### Cronboard

- [English](desktop/en/cronboard.md)
- [Portuguese](desktop/pt-br/cronboard.md)
- [French](desktop/fr/cronboard.md)
- [Spanish](desktop/es/cronboard.md)

### Herdr

- [English](en/HERDR.md)
- [Portuguese](pt-br/HERDR.md)
- [French](fr/HERDR.md)
- [Spanish](es/HERDR.md)

### Executables

- [English](en/EXECUTABLES.md)
- [Portuguese](pt-br/EXECUTABLES.md)
- [French](fr/EXECUTABLES.md)
- [Spanish](es/EXECUTABLES.md)

## Contributing

We welcome contributions of all sizes! Please read our [Contribution Guide](../CONTRIBUTING.md) to get started.

---

Maintained by [promovaweb.com](https://promovaweb.com) · Licensed under [GPL-3.0](../LICENSE)

---
