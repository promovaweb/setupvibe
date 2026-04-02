# Changelog

All notable changes to **SetupVibe** are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [v0.41.5] - 2026-04-02

### Added

- Added GSD 2 (`@gsd-build/cli`) to the AI CLI Tools step in both Desktop and Server editions.
- Added ZSH aliases for GSD 2: `gsdn` (new), `gsds` (status), `gsdm` (map), and `gsdi` (init).

---

## [v0.41.4] - 2026-04-01

### Added

- Automated `cron` service activation and configuration for macOS and Linux
- Pre-configured example cron tasks (hourly heartbeat and daily disk usage snapshot)
- Robust `cron_ensure` helper function in both Desktop and Server editions

---

## [v0.41.3] - 2026-04-01

### Added

- `Cronboard` (Cron TUI) added to both Desktop and Server editions
- New `cronb` alias to quickly open the Cronboard dashboard
- Comprehensive documentation for Cronboard in all supported languages

---

## [v0.41.2] - 2026-03-31

### Added

- New `setupvibe` alias in all ZSH configuration files to easily reinstall or update the environment
- Documentation for the `setupvibe` alias in all supported languages

---

## [v0.41.1] - 2026-03-31

### Added

- Portainer installation added to Server Edition (Step 2)
- Consistency: Both Desktop and Server editions now deploy Portainer via `~/.setupvibe/portainer-compose.yml`

### Fixed

- Docker service is now explicitly enabled and started (`systemctl enable --now docker`) on Linux in both editions
- Portainer startup process hardened using `sys_do` to bypass group membership delays during installation
- Docker status verification improved with `sys_do docker info` for better reliability during setup

---

## [v0.41.0] - 2026-03-31

### Added

- Portainer installation added to Desktop Edition (Step 7)
- Docker Compose for Portainer created in `conf/portainer-compose.yml`
- Automated deployment of Portainer in `~/.setupvibe/` directory

---

## [v0.40.0] - 2026-03-31

### Added

- `ffmpeg` and `imagemagick` added to Desktop Edition (macOS via Homebrew, Linux via APT)
- Documentation updated to reflect the new media tools

### Fixed

- Duplicate `jq` package removed from `step_8` in `desktop.sh`

---

## [v0.39.0] - 2026-03-31

### Added

- Automation for version bumping and consistency across documentation and scripts
- New `npx skills` aliases (`skl`, `skf`, `ska`, `sku`, `skun`, `skc`) in all ZSH configuration files
- Documentation updated to include the new Skills CLI aliases

---

## [v0.38.0] - 2026-03-29

### Added

- `CHANGELOG.md` introduced to track all notable changes across releases

---

## [v0.37.0] - 2026-03-27

### Added

- New `gemini` and `claude` shell aliases in all zsh configuration files (`zshrc-macos.zsh`, `zshrc-linux.zsh`, `zshrc-server.zsh`)
- README updated to document the new AI CLI aliases

### Changed

- Tmux configuration files for desktop and server environments fully revised
- Legacy `tmux.conf` removed in favor of `tmux-desktop.conf` and `tmux-server.conf`

---

## [v0.36.0] - 2026-03-25

### Added

- Docker Swarm Manager setup option in `desktop.sh`
- `zoxide` installation added to `server.sh` for smarter directory navigation
- Documentation updated for Docker Swarm Manager usage

### Fixed

- Contact email corrected from `contact@promovaweb.com` to `contato@promovaweb.com` across all files

---

## [v0.35.0] - 2026-03-25

### Added

- Dedicated tmux configuration files for desktop (`tmux-desktop.conf`) and server (`tmux-server.conf`) editions in `conf/`
- `tmux-desktop.conf` ships with 20+ plugins, onedark theme, mouse support, and session persistence
- Server tmux configuration tailored for lean server environments

### Fixed

- Installation URLs updated across documentation and scripts to use the new `setupvibe.dev` domain

### Docs

- PM2 guide section titles and table formatting improved
- README tables reformatted for clarity
- PM2 installation removed from setup script; documentation updated accordingly
- Tmux guide added in Portuguese (`docs/desktop/pt/tmux.md`)
- Server edition documentation added in both English and Portuguese
- `GEMINI.md` added with Gemini CLI instructions and project context
- Markdown formatting guidelines added to `CLAUDE.md`, `GEMINI.md`, and `AGENTS.md`
- Markdown tables standardized across README and PM2 docs

### Changed

- `server.sh`: Homebrew installation steps removed; Node.js installation clarified via NodeSource APT
- `server.sh` steps renumbered and reorganized after Homebrew removal

---

## [v0.34.0] - 2026-03-21

### Added

- n8n installation included in `desktop.sh` AI CLI Tools step
- PM2 `ecosystem.config.js` configuration file added to `conf/` and downloaded by setup scripts
- Base tmux settings for window and pane management added to configuration
- Homebrew upgrade step added to both `desktop.sh` and `server.sh`

### Changed

- `server.sh` refactored to use helper functions for user and system commands
- Enhanced Linux distribution detection for PHP and Docker configurations (Ubuntu 24.04, Debian 12, Zorin OS 18)
- APT keyring management streamlined; legacy entries cleaned before re-adding
- Base tools installation improved with better GPG key handling and non-interactive updates
- GPG detection enhanced; compatibility with both `gpg` and `gpg2` commands ensured
- README updated with new features and improvements summary

---

## [v0.33.0] - 2026-03-18

### Fixed

- Homebrew installation process hardened with proper permission handling and temporary sudoers rule cleanup
- GPG handling improved across both scripts for compatibility in varied environments

---

## [v0.32.1] - 2026-03-18

### Fixed

- Environment variable export corrected in setup scripts
- Base tools installation ensured to run before dependent steps

---

## [v0.32.0] - 2026-03-18

### Added

- Comprehensive PM2 guide documentation (`docs/desktop/en/pm2.md`) covering commands, configuration, and log management
- PM2 configuration enhanced in setup scripts with ecosystem file support

### Changed

- Tmux keybindings revised to avoid conflicts and improve usability
- Tmux configuration documentation and keybinding reference updated

---

## [v0.31.0] - 2026-03-18

### Added

- Tmux Plugin Manager (TPM) installation added to both `desktop.sh` and `server.sh`
- `jaclu/tmux-menus` plugin added to tmux configuration
- AI CLI Tools installation step added to both scripts (Claude Code, Gemini CLI, etc.)
- `sshpass` added to installation scripts for both desktop and server setups
- Root user support for tmux configuration installation

### Fixed

- macOS: script now blocks execution as root and provides correct usage instructions
- Cleanup procedures improved for both macOS and Linux server scripts
- Documentation generation suppressed for gem installs in Rails setup
- Bruno installation command improved with graceful error handling
- Homebrew environment loading corrected to use `sudo` for user context
- APT keyring cleanup and user detection improved across scripts
- APT lock handling enhanced (important for cloud VMs with unattended-upgrades at boot)
- ZSH configuration files deployment added via safe download function

---

## [v0.30.0] - 2026-03-18

### Changed

- Server setup steps updated to include Tmux and plugins as a dedicated step
- `server.sh` step `step_9` renamed to `step_10`; `run_section` calls updated accordingly
- README installation steps updated to reflect finalization and cleanup step

---

## [v0.29.1] - 2026-03-18

### Fixed

- User detection improved for Homebrew commands in both scripts (`SUDO_USER` vs `whoami`)
- APT keyring cleanup logic improved and user detection made more robust
- APT lock polling added before running apt commands (needed for cloud VMs)

---

## [v0.1.0] - 2026-02-22

### Added

- Initial `desktop.sh` for macOS and Linux desktop environments
- Initial `server.sh` for lean Linux server environments
- Support for `x86_64` and `arm64/aarch64` architectures
- Docker and Docker Compose installation
- Sudoers handling for non-interactive privilege escalation
- i18n groundwork for multi-language documentation
- Initial README documentation

---

> Follow the formatting guide: [Markdown Format Guide](.claude/commands/markdown-format.md)
