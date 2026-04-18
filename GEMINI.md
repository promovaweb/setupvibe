# GEMINI.md

This file provides instructions and context for Gemini CLI when working with the **SetupVibe** repository.

## Project Overview

**SetupVibe** is a cross-platform automated development environment setup tool (v0.41.8). It streamlines the installation and configuration of a complete developer toolkit for macOS (12+) and major Linux distributions (Ubuntu 24.04+, Debian 12+, Zorin OS 18+).

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
  - `tmux-desktop.conf`: Tmux config for desktop environments (TPM, plugins, onedark theme).
  - `tmux-server.conf`: Lean tmux config for server environments.
  - `zshrc-*.zsh`: Platform-specific ZSH configurations.
  - `ecosystem.config.js`: PM2 process management configuration.
- `docs/`: Comprehensive documentation in English (`en/`), Portuguese (`pt-br/`), French (`fr/`), and Spanish (`es/`).

## Usage and Development

### Running the Scripts

The scripts are designed to be idempotent and can be run directly or via `curl`:

```bash
# Local execution
bash desktop.sh
bash server.sh

# Canonical usage (from README)
curl -sSL desktop.setupvibe.dev | bash

# Optional .NET SDK (default .NET 10; also --install-dotnet=8|9|10)
curl -sSL desktop.setupvibe.dev | bash -s -- --install-dotnet
curl -sSL server.setupvibe.dev | bash -s -- --manager --install-dotnet
```

### Testing Changes

Since there is no automated test suite, changes should be verified by running the scripts on target machines or virtual environments.

### Versioning

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

## Development Conventions

- **Helper Functions**: Use `user_do` to run commands as the real user and `sys_do` for commands requiring elevated privileges.
- **Keyring Management**: APT keys should be stored in `/etc/apt/keyrings/`. Always remove legacy sources before adding new ones to prevent signature conflicts.
- **Lock Management**: Especially in `server.sh`, check for APT locks before performing package operations to avoid failures on boot.

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
