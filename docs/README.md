# SetupVibe Documentation

> Automated development environment setup — v0.41.9

SetupVibe transforms any fresh machine into a fully configured development workspace in one command. It supports two editions depending on your target. When you pass `--install-dotnet` or a .NET SDK is already detected, the interactive roadmap and final installation summary include **.NET** in the relevant step title (Desktop: Languages step; Server: AI CLI Tools).

| Edition     | Script       | Platforms                                            | Guides                                                                                                               |
| ----------- | ------------ | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Desktop** | `desktop.sh` | macOS 12+, Ubuntu 24.04+, Debian 12+, Zorin OS 18+   | [EN](desktop/en/README.md) · [PT](desktop/pt-br/README.md) · [FR](desktop/fr/README.md) · [ES](desktop/es/README.md) |
| **Server**  | `server.sh`  | Ubuntu 24.04+, Debian 12+, Zorin OS 18+ (Linux only) | [EN](server/en/README.md) · [PT](server/pt-br/README.md) · [FR](server/fr/README.md) · [ES](server/es/README.md)     |

## Quick Start

### Desktop (macOS & Linux)

```bash
curl -sSL desktop.setupvibe.dev | bash
```

### Server (Linux only)

```bash
curl -sSL server.setupvibe.dev | bash
```

To initialize Docker Swarm automatically after setup:

```bash
curl -sSL server.setupvibe.dev | bash -s -- --manager
```

To install the **.NET SDK** (default **.NET 10**; use `=8` or `=9` for other supported majors):

```bash
curl -sSL desktop.setupvibe.dev | bash -s -- --install-dotnet
curl -sSL server.setupvibe.dev | bash -s -- --install-dotnet
```

You can combine flags on the Server edition (order does not matter), for example:

```bash
curl -sSL server.setupvibe.dev | bash -s -- --manager --install-dotnet
```

## Edition Comparison

| Feature                               | Desktop        | Server  |
| ------------------------------------- | -------------- | ------- |
| Base system & build tools             | ✔              | ✔       |
| Homebrew                              | ✔              | ✗       |
| PHP 8.4 + Composer + Laravel          | ✔              | ✗       |
| Ruby + rbenv + Rails                  | ✔              | ✗       |
| Go, Rust, Python + uv                 | ✔              | ✗       |
| Node.js 24 + Bun + PNPM               | ✔              | ✔ (APT) |
| n8n                                   | ✔              | ✗       |
| Docker + Ansible + GitHub CLI         | ✔              | ✔       |
| Modern Unix tools (bat, eza, fzf…)    | ✔ via Homebrew | ✗       |
| Network & monitoring tools            | ✔              | ✔       |
| Tailscale                             | ✔              | ✔       |
| SSH server                            | ✔ (Linux only) | ✔       |
| ZSH + Oh My Zsh + Starship            | ✔              | ✔       |
| Nerd Fonts (FiraCode, JetBrains Mono) | ✔              | ✗       |
| Tmux + TPM plugins                    | ✔              | ✔       |
| AI CLI tools                          | ✔              | ✔       |
| PM2 auto-startup                      | ✔              | ✗       |
| Docker Swarm Manager (`--manager`)    | ✗              | ✔       |
| Optional .NET SDK (`--install-dotnet`) | ✔              | ✔       |

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

## Contributing

We welcome contributions of all sizes! Please read our [Contribution Guide](../CONTRIBUTING.md) to get started.

---

Maintained by [promovaweb.com](https://promovaweb.com) · Licensed under [GPL-3.0](../LICENSE)

---
