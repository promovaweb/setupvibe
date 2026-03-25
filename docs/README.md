# SetupVibe Documentation

> Automated development environment setup — v0.34.0

SetupVibe transforms any fresh machine into a fully configured development workspace in one command. It supports two editions depending on your target:

| Edition     | Script       | Platforms                                            | Guide                                             |
| ----------- | ------------ | ---------------------------------------------------- | ------------------------------------------------- |
| **Desktop** | `desktop.sh` | macOS 12+, Ubuntu 24.04+, Debian 12+, Zorin OS 18+   | [docs/desktop/en/README.md](desktop/en/README.md) |
| **Server**  | `server.sh`  | Ubuntu 24.04+, Debian 12+, Zorin OS 18+ (Linux only) | [docs/server/en/README.md](server/en/README.md)   |

## Quick Start

### Desktop (macOS & Linux)

```bash
curl -sL https://raw.githubusercontent.com/promovaweb/setupvibe/refs/heads/main/desktop.sh | bash
```

### Server (Linux only)

```bash
curl -sL https://raw.githubusercontent.com/promovaweb/setupvibe/refs/heads/main/server.sh | bash
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
| PM2 auto-startup                      | ✔              | ✔       |

## Further Reading

- [Desktop Edition](desktop/en/README.md)
- [Server Edition](server/en/README.md)
- [Tmux Guide](desktop/en/tmux.md)
- [PM2 Guide](desktop/en/pm2.md)

---

Maintained by [promovaweb.com](https://promovaweb.com) · Licensed under [GPL-3.0](../LICENSE)
