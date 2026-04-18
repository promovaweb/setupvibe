# SetupVibe

> The ultimate cross-platform development environment setup script — v0.41.8

Installs and configures a complete development stack in one command, supporting macOS and major Linux distributions.

## Key Features

- **Smart Privilege Elevation:** Uses `sudo` only where strictly necessary; most tools are installed in `$HOME/.local/bin`.
- **Auto-Update:** Automatically upgrades existing Homebrew packages during setup.
- **Modern Shell:** ZSH + Oh My Zsh + Starship with a curated set of plugins and aliases.
- **Optimized Tmux:** Pre-configured with TPM, intuitive keybindings, and window/pane numbering starting at 1.
- **AI-Ready:** Includes the latest AI CLI tools for developers.

## Documentation

|                 | Link                                             |
| --------------- | ------------------------------------------------ |
| Overview        | [docs/README.md](docs/README.md)                 |
| Desktop Edition | [docs/desktop/README.md](docs/desktop/README.md) |
| Server Edition  | [docs/server/README.md](docs/server/README.md)   |
| Tmux Guide      | [docs/desktop/tmux.md](docs/desktop/tmux.md)     |
| PM2 Guide       | [docs/desktop/pm2.md](docs/desktop/pm2.md)       |

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

Optional **.NET SDK** (default **.NET 10**; use `--install-dotnet=8` or `=9` for other supported majors):

```bash
curl -sSL desktop.setupvibe.dev | bash -s -- --install-dotnet
curl -sSL server.setupvibe.dev | bash -s -- --install-dotnet
curl -sSL server.setupvibe.dev | bash -s -- --manager --install-dotnet
```

## Contributing

We welcome contributions of all sizes! Please read our [Contribution Guide](CONTRIBUTING.md) to get started.

---

Maintained by [promovaweb.com](https://promovaweb.com) · Licensed under [GPL-3.0](LICENSE)

---
