# GEMINI.md

This file provides instructions and context for Gemini CLI when working with the **SetupVibe** repository.

## Project Overview

**SetupVibe** is a cross-platform automated development environment setup tool (v0.34.0). It streamlines the installation and configuration of a complete developer toolkit for macOS (12+) and major Linux distributions (Ubuntu 24.04+, Debian 12+, Zorin OS 18+).

The project consists of two primary editions:

- `desktop.sh`: Full stack including language ecosystems (PHP, Ruby, Python, Go, Rust, Node/Bun), GUI tools, and AI CLIs.
- `server.sh`: Lean installation focused on DevOps tools (Docker, Ansible), monitoring, and shell customization.

## Architecture and Design

- **Scripted Steps**: Both main scripts use a modular `step_NN_` function pattern for logical groupings of tools.
- **Smart Privilege Elevation**: Scripts intelligently handle `root`, `sudo`, and regular user execution to ensure files are installed in the correct locations (preferring `$HOME/.local/bin` and only using `sudo` when necessary).
- **Environment Detection**: Detects OS, distribution, and CPU architecture (x86_64 vs. ARM64) to tailor installations.
- **Configuration Deployment**: The `conf/` directory contains template configuration files for `tmux`, `zsh`, and `PM2` that are deployed to the user's home directory.

## Key Files and Directories

- `desktop.sh`: The main entry point for desktop environment setup.
- `server.sh`: The entry point for server environment setup.
- `conf/`: Configuration templates.
    - `tmux.conf`: Pre-configured tmux with TPM and modern defaults.
    - `zshrc-*.zsh`: Platform-specific ZSH configurations.
    - `ecosystem.config.js`: PM2 process management configuration.
- `docs/`: Comprehensive documentation in English (`en/`) and Portuguese (`pt-BR/`).

## Usage and Development

### Running the Scripts

The scripts are designed to be idempotent and can be run directly or via `curl`:

```bash
# Local execution
bash desktop.sh
bash server.sh

# Canonical usage (from README)
curl -sL https://raw.githubusercontent.com/promovaweb/setupvibe/refs/heads/main/desktop.sh | bash
```

### Testing Changes

Since there is no automated test suite, changes should be verified by running the scripts on target machines or virtual environments.

### Versioning

The version number is defined at the top of both `desktop.sh` and `server.sh`. Ensure both are updated simultaneously when bumping the version.

## Development Conventions

- **Helper Functions**: Use `user_do` to run commands as the real user and `sys_do` for commands requiring elevated privileges.
- **Keyring Management**: APT keys should be stored in `/etc/apt/keyrings/`. Always remove legacy sources before adding new ones to prevent signature conflicts.
- **Lock Management**: Especially in `server.sh`, check for APT locks before performing package operations to avoid failures on boot.
