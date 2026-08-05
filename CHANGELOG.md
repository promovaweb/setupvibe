# Changelog

All notable changes to **SetupVibe** are documented in this file.

---

## [v0.41.11] - 2026-08-04

### Added

- Added OpenCode CLI (`opencode-ai`) to the AI CLI Tools step in Desktop, Server, and Windows editions.

---

## [v0.41.10] - 2026-08-03

### Fixed

- Fixed the Unix Desktop edition's Antigravity CLI install failing with `unknown parameter --skip-aliases`: the official Unix bootstrapper (`antigravity.google/cli/install.sh`) only accepts `-d`/`--dir` and does not forward `--skip-aliases`/`--skip-path` to its bundled `agy install` step, unlike the Windows PowerShell installer. `desktop.sh` now resolves and SHA-512-verifies the same versioned release manifest the bootstrapper uses, places the `agy` binary directly, and runs `agy install --skip-aliases --skip-path` itself.

---

## [v0.41.9] - 2026-08-03

### Added

- Added [Herdr](https://github.com/herdrdev/herdr) to the Desktop and Server editions, with architecture-aware installation from its official release manifest and post-install command validation.
- Added Google's Antigravity CLI to the Unix Desktop edition, installed as `agy` through its official Unix installer, downloaded to a file and run with `--skip-aliases --skip-path` so the installer's own final setup step keeps a real stdin instead of an exhausted `curl`-to-`bash` pipe, and so shell profiles stay untouched.

### Changed

- Renamed the macOS and Linux SSH key-copy helper from `sshcopykey` to `ssh_copy_id`, matching the name already used by the Windows utility so the same command works across every SetupVibe edition. `desktop.sh` and `server.sh` remove the old `~/.setupvibe/bin/sshcopykey` file on reinstall.

### Fixed

- Fixed Windows `ssh_copy_id` failing to copy a key to a server it had never connected to before: the key-copy command piped the public key over stdin without accepting the new host key, so the interactive host-key prompt consumed that piped input instead of the user's confirmation. `StrictHostKeyChecking=accept-new` is now applied consistently across the copy, verification, and connection steps.
- Fixed Herdr installation failing on every platform after the project's GitHub organization migration: `desktop.sh` and `server.sh` still trusted release assets under the retired `ogulcancelik/herdr` path, while the official manifest now publishes them under `herdrdev/herdr`.

### Removed

- Removed n8n from the Unix Desktop edition's JavaScript step; it is no longer installed by `desktop.sh`.

---

## [v0.41.8] - 2026-07-21

### Added

- Added the PyPI `qrcode` package as a user-global pip installation on macOS and Linux Desktop, with import validation and the `qr` command exposed in the managed shell `PATH`.

---

## [v0.41.7] - 2026-07-21

### Fixed

- Fixed Linux Desktop reruns skipping Homebrew installation when a previous failed attempt left only the prefix directory, and resolved both supported Linuxbrew prefixes before adding or invoking `brew` from `PATH`.

---

## [v0.41.6] - 2026-07-21

### Added

- Added `desktop.ps1`, an idempotent native Windows 11 22H2+ Beta installer for Microsoft Win32-OpenSSH Client and Server, WSL 2 base components, WinGet, Chocolatey, modern CLI tools, network utilities, and fonts, with automatic UAC elevation, restart handling, and transcript logs. Linux distributions remain managed separately by `desktop.sh`.
- Added `-Uninstall` to remove all Windows utilities and configurations managed by SetupVibe and clean language ecosystems left by earlier Beta versions while preserving WinGet, Chocolatey, and logs.
- Added managed Windows helper installation in `%USERPROFILE%\.setupvibe\bin`, including a persistent user `PATH` entry, local or `windows` branch sources, state tracking, and safe removal through `-Uninstall`.
- Added a Windows servicing and installer preflight with competing-operation detection, pending-restart detection, required-service startup, `sfc.exe /scannow`, WSUS warnings, component-store validation, and dedicated DISM logs.
- Added the WSL base without a Linux distribution, set WSL 2 as the default, and configured mirrored VPN/LAN networking, DNS tunneling, Windows proxy integration, Hyper-V firewall inbound access, automatic memory reclaim, and sparse VHDs for software development.
- Added Windows Edition (Beta) documentation in English, Portuguese, French, and Spanish.
- Added `utils/windows/ssh_copy_id/ssh_copy_id.ps1`, a minimal `ssh_copy_id.cmd` compatibility launcher, and their usage guide for creating or detecting an SSH key, copying it to a remote server, selecting a port, and optionally opening the SSH session.
- Added Python 3.14 from the official signed `python.org` standalone installer and Node.js 24 LTS from the official signed `nodejs.org` MSI, with Node.js SHA-256 verification, machine `PATH` normalization, and validation of `python`, `pip`, `node`, `npm`, and `npx` for Claude and Codex.
- Added Claude Code through Anthropic's checksum-verifying native Windows installer, Codex CLI through OpenAI's official checksum-verifying standalone Windows installer, and Google Antigravity CLI through its checksum-verifying native installer as `agy`.
- Added Server Edition `--yes` and `--advertise-addr` options for unattended setup and explicit Docker Swarm routing.
- Added SHA-256 verification for Server Edition ctop binaries and one-time `.pre-setupvibe` backups for shell and tmux configuration files.
- Added the Vercel Labs `skills` CLI to Desktop, Windows, and Server editions, with post-install validation on every platform and execution-policy-safe installation and managed removal on Windows.
- Added `DEBIAN.md` as the required Linux engineering context, including privilege boundaries, safe downloads, systemd-in-container integration tests, nested Docker constraints, and regression findings.
- New Python and `uv` aliases in Server Edition: `py`, `pyv`, `uvi`, `uvs`, `venv`, and `activate`.
- Automatic addition of `$HOME/.local/bin` to `.bashrc` in both Desktop and Server editions to ensure tool accessibility in Bash sessions.
- New `bin/sshcopykey` helper script, installed to `~/.setupvibe/bin/sshcopykey`, to copy the local public SSH key to a remote server with `--host`, `--user`, and optional `--pass` or hidden password prompt.
- New executable helper documentation in `docs/*/EXECUTABLES.md`.

### Changed

- Switched the canonical Windows installer, elevation handoff, restart, and uninstall URL to `https://windows.setupvibe.dev`.
- Added explicit post-install validation for GitHub CLI and Windows Terminal so SetupVibe confirms that `gh.exe` and the `wt.exe` app execution alias are available in the refreshed Windows environment without changing the Terminal default profile.
- Kept direct Windows-specific SetupVibe repository URLs, including `ssh_copy_id`, on the `windows` development branch until the Windows work is merged.
- Expanded the Windows Edition (Beta) guides with one-command remote installation, local installation, execution stages, verification commands, logs, rerun behavior, restart options, and scope limitations.
- Focused the Windows Edition on native utilities, Python and Node.js as its only programming runtimes, and the selected Claude Code, Codex, and Antigravity AI CLIs; complete language ecosystems and the broader AI toolkit remain available through `desktop.sh` on macOS, Linux, and WSL.
- Raised the Windows Edition minimum to Windows 11 22H2 build 22621 so mirrored WSL networking and Hyper-V firewall controls are consistently available.
- Excluded `lazydocker` and `ctop` from the native Windows installer because the Windows edition intentionally provides no local Docker engine.
- Changed the Windows servicing preflight to ask before stopping competing installer processes, try normal termination before a forced fallback, and run `sfc.exe /scannow` after accepted termination attempts. Declining waits for ENTER and exits without adding another servicing operation.
- Kept Python and Node.js outside WinGet and Chocolatey; those package managers remain responsible only for the Windows utility lists.
- Updated AI context synchronization to cover only `AGENTS.md` and `CLAUDE.md`.
- Split agent skills into platform-specific `.codex/skills` and `.claude/skills` folders.
- Reworked persistent Windows `PATH` updates to normalize and deduplicate entries, refresh the running process, notify other Windows applications, and verify that AI CLI commands resolve to the intended executable.
- Expanded Windows package validation to execute the installed WinGet and Chocolatey CLI commands from the refreshed `PATH`, with isolated failures included in the final summary.
- Hardened `server.sh` with strict mode, preflight validation, bounded APT lock waits, APT retries, fail-fast step execution, current deb822 Docker and NodeSource repositories, and post-install command validation.
- Updated Server Edition GitHub Copilot CLI from the deprecated `@githubnext/github-copilot-cli` package to `@github/copilot`.
- Updated Portainer CE to the `lts` channel with HTTPS-only port `9443`, and aligned the server ZSH configuration with tools the edition actually installs.
- Updated Server Edition reruns to refresh zoxide, ctop, Tailscale, Oh My Zsh, Starship, Portainer, Git repositories, Node.js, and AI CLI packages instead of leaving managed installations stale.
- Changed Docker Swarm address detection to use the local routing table instead of external public-IP services.
- Removed Server Edition's explicit Python, uv, Cronboard, build-library, Homebrew, Bun, and PM2 setup to match its lean, no-language-ecosystem scope.
- Updated the Skills CLI shell aliases to use the globally installed `skills` executable directly instead of invoking it through `npx`.
- Updated the Desktop Edition to PHP 8.5, Ruby 3.4.10, Go 1.26.5, Python 3.14 on macOS, and Nerd Fonts 3.4.0.
- Replaced the deprecated `@githubnext/github-copilot-cli` package with `@github/copilot` in the Desktop and Server editions.
- Replaced the beta n8n client package `@n8n/cli` with the full `n8n` workflow automation package.
- Restricted Linux Desktop root SSH access to public-key authentication and moved SetupVibe settings to an `sshd_config.d` drop-in.
- Limited macOS cleanup to Homebrew and SetupVibe-owned temporary files instead of deleting user caches and Trash contents.
- Improved Composer installation with explicit directory/filename flags and robust PATH handling for global packages.
- Enhanced Ruby compilation process using a local `TMPDIR` to bypass `noexec` restrictions on `/tmp`.
- Optimized Rust/rustup installation and update logic with improved PATH management.
- Refined post-installation instructions to suggest `exec zsh` for immediate shell synchronization.

### Fixed

- Fixed Windows `ssh_copy_id` reporting success after only writing a public-key file while the following connection still requested the server password. It now selects only matching public/private key pairs, supports an explicit `-IdentityFile`, normalizes Windows line endings, verifies public-key authentication without password fallback, and uses that exact identity for the final session.
- Fixed the PM2 ecosystem forcing Agentlytics' first-run UI build into production dependency mode, which omitted Vite and caused an endless restart loop.
- Fixed macOS reruns upgrading unrelated Homebrew packages and existing Docker Desktop or Tailscale casks, using elevated Docker commands that lose the user's Docker Desktop context, requesting administrator privileges for user-owned downloads, and failing to install PM2's launchd startup agent without unnecessary root access.
- Fixed Desktop Edition installs through `sudo` using the system npm prefix for the target user, which caused JavaScript and AI CLI steps to fail with `EACCES`.
- Fixed Desktop Edition `ctop`, Starship, Skills CLI, and PM2 commands failing because root-owned temporary files or `sudo`'s restricted `PATH` hid user-installed executables.
- Fixed current npm releases blocking Agentlytics' required `better-sqlite3` native install script, and replaced its unsupported `--version` probe with a native SQLite load test.
- Fixed current npm releases blocking n8n's remote SheetJS dependency and required native install scripts, as well as post-install scripts used by the managed AI CLIs.
- Fixed Linux PM2 auto-start configuration running without the privileges required to create its systemd unit, and ensured Tailscale is enabled and active after installation.
- Fixed Desktop Edition reruns failing to overwrite the managed Starship preset and repeatedly duplicating managed directories in the installation process `PATH`.
- Fixed transient Desktop Edition downloads failing without retries, and normalized inherited duplicate `PATH` entries in the effective PM2 systemd service environment.
- Replaced Homebrew's disabled `tldr` formula with the maintained `tlrc` implementation while preserving the `tldr` command.
- Fixed `desktop.sh` spinning indefinitely while prompting for Git identity when no interactive terminal is available.
- Fixed the Node.js MSI silently completing without `node.exe`, `npm.cmd`, or `npx.cmd` by installing and repairing it through a dedicated `msiexec.exe` process instead of running it as a direct child of the already-elevated session, avoiding a Windows Installer SecureRepair validation failure specific to nested elevation.
- Fixed `7-Zip` and `btop4win` post-install validation crashing on an empty `Test-Path` argument by making the shared property-lookup helper read values from Hashtable-based command definitions instead of always returning `$null`, and added `btop4win`'s stable WinGet package path as a fallback.
- Fixed OpenSSH Client validation treating `ssh -V`'s normal stderr version output as a terminating error under strict mode by capturing it with error action temporarily relaxed.
- Fixed a false "competing installer" failure immediately after `sfc.exe /scannow` by giving TrustedInstaller's own worker process a short grace period to exit before re-checking for active installer processes.
- Fixed OpenSSH MSI installations that completed without a discoverable `ssh.exe` by using the MSI's documented default Client and Server selection, forcing all features only as a recovery pass, and resolving the installation directory from the native x64 Program Files directory, MSI `InstallLocation`, and the `sshd` service.
- Fixed strict-mode failures while scanning Windows uninstall Registry entries that do not define `DisplayName`, including OpenSSH repair detection and the OpenSSH, Node.js, and Python removal paths.
- Replaced the unreliable OpenSSH Feature on Demand operation with the latest official Microsoft Win32-OpenSSH MSI, installing and validating the Client and Server features, prioritizing the binaries in the machine `PATH`, validating `ssh.exe -V`, starting `sshd` automatically, and enabling inbound TCP/22.
- Fixed OpenSSH release resolution by removing the GitHub releases-list API dependency, resolving `releases/latest` and its expanded assets directly, accepting only the x64 `OpenSSH-Win64-*.msi`, and validating its Authenticode signature.
- Fixed Windows Terminal startup errors caused by a restricted PowerShell execution policy by removing SetupVibe's PowerShell profile initialization instead of weakening the policy.
- Fixed HTTP 400 responses from the Node.js release-index request by resolving the x64 MSI directly through the official `latest-v24.x` channel and downloading `SHASUMS256.txt` and the MSI with Windows `curl.exe`, HTTPS-only redirects, retries, SHA-256 validation, and Authenticode validation.
- Fixed `desktop.ps1` UAC elevation for remote `irm ... | iex` execution by handing off a temporary script to the elevated process.
- Added Windows Server, non-x64 Windows, and minimum-build preflight checks to avoid unsupported installations; Windows on ARM and 32-bit editions are rejected.
- Corrected broken contribution, license, Tmux, and PM2 links in the existing documentation indexes and localized guides.
- Fixed UAC elevation with alternate administrator credentials by rejecting a changed user SID before any user-scoped installation can target the wrong Windows profile.
- Fixed OpenSSH installation and removal by explicitly installing and force-repairing `Client,Server` in one signed MSI transaction, checking the `ssh.exe -V` exit code, and backing up and restoring the previous TCP/22 firewall-rule state.
- Fixed WSL removal by serializing optional-feature states as names and safely decoding state files created by earlier Beta versions with numeric enum values.
- Fixed legacy PowerShell-profile cleanup so unrelated files remain byte-for-byte unchanged, only recognized SetupVibe blocks are removed without changing encoding, and user-owned Starship configuration is preserved.
- Fixed Antigravity validation to execute `agy.exe --version`, and fixed stale legacy toolchain cleanup so active user-managed `PATH` directories are preserved.
- Fixed restricted-policy execution of `npm` and `npx` by removing their redundant PowerShell shims after the official Node.js MSI is installed and validating the commands exactly as users invoke them.
- Fixed extensionless `ssh_copy_id` resolution by installing its PowerShell core under a distinct name and validating that the command resolves to the execution-policy-safe CMD launcher.
- Preserved the existing SSH authentication policy instead of enabling root and password login, and stopped creating demonstration cron jobs in the Server Edition.
- Fixed npm global installation for a non-root target user when `server.sh` itself runs as root through `sudo`.
- Fixed false-success summaries, unsafe broad APT repository deletion, unverified ctop downloads, Debian 13 Docker repository fallback, and root-owned temporary download failures.
- Fixed Server Edition Node.js 24 enforcement with newer preinstalled versions, safe root TPM and Portainer data ownership handling, shell `PATH` appends without a trailing newline, and HTTPS-only public IP lookup.
- Preserved installed packages, journal history, and user caches during Server Edition cleanup.
- Fixed macOS Ruby compilation by evaluating `MAKE_OPTS` inside the target user shell.
- Added SHA-256 verification and version-aware replacement for the Go Linux archive.
- Hardened APT key downloads and repository cleanup so failed pipelines cannot create empty keyrings or delete user-managed source files.
- Restored native Debian 13 (`trixie`) repositories for PHP and Docker instead of falling back to Debian 12.
- Fixed downloads performed as root so artifacts placed in the real user's home retain the correct ownership.
- Removed the temporary unrestricted `NOPASSWD:ALL` sudoers rule previously used by the Linux Homebrew installation.

### Removed

- Removed Gemini context and skill files.
- Removed Gemini CLI from AI tool installation, shell aliases, Spec-Kit aliases, and current documentation.
- Removed all UAC policy management from `desktop.ps1`; the Windows Edition now uses only the standard elevation prompt and never changes `EnableLUA` during installation or removal.
- Removed the Batch implementation of `ssh_copy_id`; PowerShell now contains all SSH logic and the CMD file only launches it.
- Removed Starship and all automatic PowerShell profile customization from the Windows Edition; ZSH remains Unix-only, zoxide stays available as an uninitialized CLI utility, and the original Windows shell policy and profile are preserved.
- Removed PHP, Composer, Laravel Installer, Ruby, Bundler, Rails, uv, Spec-Kit, Go, Rustup, Cargo, Bun, PNPM, PM2, n8n, legacy AI CLI packages, and mise from Windows installation.
- Removed the SetupVibe `codex.cmd` launcher and the `ssh_copy_id` fallback to Windows Features on Demand; Codex now uses its native executable and `ssh_copy_id` requires the signed OpenSSH installation managed by SetupVibe.
- Removed RustScan from the Windows Edition; its Chocolatey shim is blocked by Windows Smart App Control on machines that enforce it, and this cannot be worked around from an installer script.

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
