<p align="center">
  <a href="https://promovaweb.com">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://promovaweb.com/promovaweb-logo-dark-586.png">
      <img alt="Promovaweb" src="https://promovaweb.com/promovaweb-logo-light-586.png" width="240">
    </picture>
  </a>
</p>

<h1 align="center">SetupVibe</h1>

<p align="center">
  Sets up a complete development machine in one command, with editions for macOS, Linux, Windows 11 and Omarchy 4.
</p>

<p align="center">
  <a href="https://github.com/promovaweb/setupvibe/releases/latest"><img alt="GitHub Release" src="https://img.shields.io/github/v/release/promovaweb/setupvibe"></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/github/license/promovaweb/setupvibe"></a>
</p>

<p align="center">
  <a href="https://promovaweb.com/discord"><img alt="Discord: obter ajuda e conversar com a Comunidade" src="https://img.shields.io/badge/Discord-Obter%20ajuda%20e%20conversar%20com%20a%20Comunidade-5865F2?style=for-the-badge&logo=discord&logoColor=white"></a>
</p>

<p align="center">
  <a href="https://promovaweb.com/docs/setupvibe/">Documentation</a> ·
  <a href="https://promovaweb.com/discord">Discord</a> ·
  <a href="https://promovaweb.com/planos?utm_source=github&utm_medium=readme&utm_campaign=setupvibe">Promovaweb Plans</a> ·
  <a href="CHANGELOG.md">Changelog</a>
</p>

## What it is

SetupVibe turns a fresh machine into a development environment ready for work. The installer detects the system, runs numbered steps that verify each tool, and places user tools in `$HOME/.local/bin`. It uses `sudo` only where the system requires it.

Each edition targets one kind of machine:

| Edition | Script | Platforms | What it delivers |
| --- | --- | --- | --- |
| Desktop | `desktop.sh` | macOS 12+, Ubuntu 24.04+, Debian 12+, Zorin OS 18+, Linux Mint 21+ and WSL | 14 steps with PHP, Ruby, Go, Rust, Python, Node.js, Bun, Docker, shell, Tmux and AI CLIs |
| Windows (Beta) | `desktop.ps1` | Windows 11 22H2+ (build 22621+), x64 | native utilities, Python 3.14, Node.js 24 LTS, selected AI CLIs and the WSL 2 base |
| Server | `server.sh` | Ubuntu 24.04+, Debian 12+ and Zorin OS 18+ | 9 steps focused on operations, Docker, Ansible, shell, monitoring and AI CLIs |
| Omarchy 4 | `omarchy.sh` | Omarchy 4 on Arch Linux x86_64 | only the layer Omarchy does not already provide, preserving the system |

You can run the installer again on the same machine. Each step checks what already exists before installing or configuring anything.

## Installation

### Desktop

```bash
curl --proto '=https' --tlsv1.2 -fsSL https://desktop.setupvibe.dev | bash
```

On macOS, run it without `sudo`: Homebrew refuses to install as root. The script asks for your password when it needs privileges and shows a roadmap before it starts.

To run a local copy of the repository:

```bash
bash desktop.sh
```

### Windows (Beta)

```powershell
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; irm https://windows.setupvibe.dev | iex
```

The installer requests elevation through the standard UAC prompt and does not change the UAC policy. To run a local copy:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\desktop.ps1
```

To remove the managed utilities and configuration, use `-Uninstall`. The [Windows guide](docs/windows/en/README.md) covers logs, restarts and verification.

### Server

```bash
curl --proto '=https' --tlsv1.2 -fsSL https://server.setupvibe.dev | bash
```

Available options: `--manager` initializes Docker Swarm, `--advertise-addr ADDRESS` chooses the Swarm address or interface, `--yes` skips the initial confirmation, `--help` shows the help and `--version` shows the version.

### Omarchy 4

```bash
curl -fsSL https://raw.githubusercontent.com/promovaweb/setupvibe/main/omarchy.sh | bash
```

Use `bash omarchy.sh --yes` for an unattended run. The edition requires an existing Omarchy 4 installation and does not remove system packages.

### Requirements

- Desktop: macOS 12 or later, or one of the supported Linux distributions, on x86_64 or ARM64.
- Windows: Windows 11 22H2 build 22621 or later, x64. Windows Server, 32-bit Windows and Windows on ARM are rejected.
- Server: one of the supported Linux distributions, on x86_64 or ARM64.
- Omarchy: Omarchy 4 on Arch Linux x86_64.

### Updating

Run the edition installer again. The steps detect what is already installed, upgrade the managed packages and keep your personal files.

## Getting started

1. Reopen the terminal to load the new `PATH` and the configured shell.
1. Check the installer's final summary, with every step marked `OK`.
1. Verify the main tools:

```bash
node --version
docker --version
php --version   # Desktop edition only
```

1. On Desktop and Server, open the agent multiplexer with `herdr`.

## Usage

### Docker Swarm on Server

```bash
curl --proto '=https' --tlsv1.2 -fsSL https://server.setupvibe.dev | bash -s -- --manager
```

Replace `--manager` with `--advertise-addr ADDRESS` when you need to choose the advertised interface.

### Copy an SSH key to a server

The `ssh_copy_id` helper sends your local public key and avoids duplicate entries in `authorized_keys`:

```bash
ssh_copy_id --host 192.0.2.10 --user root
```

The command lives in `~/.setupvibe/bin/ssh_copy_id`, asks for the remote password in a hidden prompt and accepts `--pass`, `--key` and `--port`.

### Shell, Tmux and PM2

The Desktop edition installs ZSH, Oh My Zsh, Starship and Tmux with TPM. PM2 starts the applications listed in `~/ecosystem.config.js` and restarts them on boot.

- [Tmux guide](docs/desktop/en/tmux.md) for shortcuts, plugins and configuration.
- [PM2 guide](docs/desktop/en/pm2.md) for processes, logs and auto-startup.
- [Executables guide](docs/en/EXECUTABLES.md) for the helpers installed in `~/.setupvibe/bin`.

## Using it with agents

The editions install AI CLIs. Authentication, permissions and project instructions stay with each tool:

| Tool | Command | Editions |
| --- | --- | --- |
| [Claude Code](https://github.com/anthropics/claude-code) | `claude` | Desktop, Windows, Server |
| [Codex CLI](https://github.com/openai/codex) | `codex` | Desktop, Windows, Server |
| [OpenCode](https://github.com/sst/opencode) | `opencode` | Desktop, Windows, Server |
| Antigravity CLI | `agy` | Desktop, Windows, Omarchy |
| [Herdr](https://github.com/herdrdev/herdr) | `herdr` | Desktop, Server |
| [Vercel Labs Skills CLI](https://github.com/vercel-labs/skills) | `skills` | Desktop, Windows, Server, Omarchy |
| [Hermes Agent](https://github.com/NousResearch/hermes-agent) | `hermes` | Desktop, Omarchy |

Herdr organizes agents in persistent workspaces. Open the project folder and start the multiplexer:

```bash
cd ~/projects/my-project
herdr
```

Inside a pane, start the agent with its usual command:

```bash
claude
```

The [Herdr guide](docs/en/HERDR.md) lists the workspace, tab and pane shortcuts. Hermes is installed without running `hermes setup`, so the provider, model and keys stay with you.

## Documentation

The full manual lives at [promovaweb.com/docs/setupvibe](https://promovaweb.com/docs/setupvibe/). In this repository:

| Topic | Link |
| --- | --- |
| Editions overview | [docs/README.md](docs/README.md) |
| Desktop | [docs/desktop/en/README.md](docs/desktop/en/README.md) |
| Windows (Beta) | [docs/windows/en/README.md](docs/windows/en/README.md) |
| Server | [docs/server/en/README.md](docs/server/en/README.md) |
| Omarchy 4 | [docs/omarchy/README.md](docs/omarchy/README.md) |
| Herdr | [docs/en/HERDR.md](docs/en/HERDR.md) |
| Linux context and Debian tests | [DEBIAN.md](DEBIAN.md) |

The project page is at [promovaweb.com/setupvibe](https://promovaweb.com/setupvibe/).

## Built with

| Project | Used for |
| --- | --- |
| [Homebrew](https://github.com/Homebrew/brew) | package manager on macOS and Linux desktops |
| [Node.js](https://github.com/nodejs/node) | runtime for the AI CLIs and JavaScript tools |
| [Bun](https://github.com/oven-sh/bun) | JavaScript runtime on Desktop and Omarchy |
| [Docker](https://github.com/moby/moby) | containers, Portainer and Docker Swarm |
| [Ansible](https://github.com/ansible/ansible) | configuration automation on Desktop and Server |
| [GitHub CLI](https://github.com/cli/cli) | repository operations from the terminal |
| [Zsh](https://github.com/zsh-users/zsh) and [Oh My Zsh](https://github.com/ohmyzsh/ohmyzsh) | default shell on the Unix editions |
| [Starship](https://github.com/starship/starship) | shell prompt |
| [Tmux](https://github.com/tmux/tmux) and [TPM](https://github.com/tmux-plugins/tpm) | persistent sessions and plugins |
| [PM2](https://github.com/Unitech/pm2) | process management and application auto-startup |
| [Herdr](https://github.com/herdrdev/herdr) | agent multiplexer |
| [Vercel Labs Skills CLI](https://github.com/vercel-labs/skills) | skill installation for agents |

## Community and support

- **Discord:** [get help and talk with the Community](https://promovaweb.com/discord) (in Portuguese).
- **Bugs and requests:** open an [issue](https://github.com/promovaweb/setupvibe/issues) with the version, the operating system and the steps to reproduce.
- **What's new:** follow the [CHANGELOG](CHANGELOG.md) and the [releases](https://github.com/promovaweb/setupvibe/releases).

## Contributing

The contribution guide covers the environment, the script layout, validation and the pull request flow. Start with [CONTRIBUTING.md](CONTRIBUTING.md).

## Promovaweb

SetupVibe is maintained by [Promovaweb](https://promovaweb.com), a digital co-working community where professionals learn to build, automate and run technology and AI businesses through live classes, Co-works and reviews of real projects.

Want to use SetupVibe in real projects, with guidance? See the [Promovaweb plans](https://promovaweb.com/planos?utm_source=github&utm_medium=readme&utm_campaign=setupvibe).

## License

GPL-3.0. Read the full text in [LICENSE](LICENSE).
