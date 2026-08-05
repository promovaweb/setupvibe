# SetupVibe Windows Edition (Beta)

> Native Windows utility setup — v0.41.11

The Windows Edition (Beta) configures native Windows utilities, Python, Node.js, and selected AI CLIs, with WinGet as the primary package source and Chocolatey for packages not available through WinGet.

## Requirements

- Windows 11 version 22H2 (build 22621) or later
- An x64 (AMD64) Windows desktop edition; 32-bit Windows, Windows on ARM, Windows 10, and Windows Server are not supported
- Windows PowerShell 5.1 or later
- An account that is a member of the local Administrators group; the UAC prompt must use the same signed-in account
- Internet access

## What It Installs

- Latest official Microsoft Win32-OpenSSH Client and Server from the signed x64 Win64 MSI
- WinGet through the official `Microsoft.WinGet.Client` repair workflow when missing
- Chocolatey through its official bootstrap script when missing
- Python 3.14 directly from the official `python.org` installer and Node.js 24 LTS from the official `latest-v24.x` channel on `nodejs.org`, with `python`, `pip`, `node`, `npm`, and `npx` in the machine `PATH` for Claude and Codex
- Claude Code through Anthropic's recommended native Windows installer with its official npm package as a recovery path, Codex CLI through OpenAI's official standalone Windows installer, and Google Antigravity CLI as `agy` through its official native installer
- [Vercel Labs Skills CLI](https://github.com/vercel-labs/skills) through its official npm package, with an execution-policy-safe `skills.cmd` launcher
- WSL base without a Linux distribution, with WSL 2 as the default
- Mirrored WSL networking with VPN/LAN access, DNS tunneling, Windows proxy integration, Hyper-V firewall inbound access, automatic memory reclaim, and sparse virtual disks
- Git, 7-Zip, Wget, FFmpeg, ImageMagick, and GitHub CLI (`gh`)
- bat, eza, zoxide, fzf, ripgrep, fd, lazygit, Neovim, Glow, tldr, Fastfetch, duf, and jq
- Nmap, Speedtest CLI, Tailscale, gping, btop4win, and trippy
- PowerShell 7, Windows Terminal, FiraCode Nerd Font, and JetBrains Mono Nerd Font

The installer is idempotent: installed WinGet packages are detected and skipped, Chocolatey safely ensures its packages are present, and the official Python and Node.js installers are reapplied safely. Failures are recorded per package so remaining installations can continue. A transcript is saved under `C:\ProgramData\SetupVibe\Logs`.

Windows PowerShell and PowerShell 7 profiles remain original. Starship and ZSH are not installed, the execution policy is not changed, and zoxide remains an uninitialized CLI utility.

Python and Node.js are the only programming runtimes installed by this script. Claude Code, Codex CLI, and Antigravity CLI are its only AI CLIs. It does not install a Linux distribution, frameworks, runtime managers, other AI CLIs, or other language ecosystems. After installing a distribution separately, use `desktop.sh` inside it to configure a complete development environment.

If `%USERPROFILE%\.wslconfig` already exists, SetupVibe backs it up before applying the development defaults. The backup and the previous WSL feature and firewall states are restored by `-Uninstall`.

Docker Desktop is intentionally excluded. SetupVibe prepares WSL 2 but does not install Docker or a Linux distribution.

**WSL network warning:** SetupVibe allows inbound traffic to WSL on all ports through the Hyper-V firewall so future services can be reached through the local network and compatible VPNs. Restrict this policy with specific Hyper-V firewall rules on untrusted networks. A future Linux service must listen on `0.0.0.0` or the appropriate network interface to accept remote connections.

## One-Command Installation

This is the Windows equivalent of `curl -sSL desktop.setupvibe.dev | bash`.

The canonical Windows installer URL is `https://windows.setupvibe.dev`.

1. Open the Start menu.
2. Search for **Windows PowerShell** and open it. Starting it as administrator is optional because the script requests UAC elevation automatically.
3. Review the repository's [`desktop.ps1`](../../../desktop.ps1) before executing remote code.
4. Paste the following command and press `Enter`:

   ```powershell
   [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; irm https://windows.setupvibe.dev | iex
   ```

5. Accept the Windows UAC prompt.
6. Keep the PowerShell windows open until the summary is displayed.
7. Restart Windows if requested so pending component or package changes take effect.

The command downloads `desktop.ps1` from the official SetupVibe repository and executes it in the current PowerShell session. When elevation is needed, the installer downloads a temporary copy and continues in an administrator session.

## Local Installation

To download the script before running it:

```powershell
$scriptPath = Join-Path $HOME 'Downloads\desktop.ps1'
Invoke-WebRequest -UseBasicParsing -Uri https://windows.setupvibe.dev -OutFile $scriptPath
powershell.exe -NoProfile -ExecutionPolicy Bypass -File $scriptPath
```

From an existing clone of this repository:

```powershell
Set-Location C:\path\to\setupvibe
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\desktop.ps1
```

## What to Expect

During execution, the installer:

1. Validates Windows 11 22H2 or later and the x64 architecture, relaunching itself through native x64 Windows PowerShell if it started in a 32-bit process, and rejects UAC elevation with credentials for a different user profile.
2. Requests administrator privileges through UAC.
3. Lists competing installer processes and asks whether to stop them. If accepted, it tries normally, forces those that remain, and runs `sfc.exe /scannow`; if declined, it waits for ENTER and exits.
4. Rejects pending restarts, starts required services, runs `sfc.exe /scannow` if it has not already run, checks WSUS policy, and validates the Windows component store.
5. Resolves the latest official x64 Microsoft Win32-OpenSSH MSI without the GitHub releases API, validates its signature, explicitly installs and force-repairs Client and Server, configures the machine `PATH`, verifies the exit status of `ssh.exe -V`, starts `sshd` automatically, and enables inbound TCP/22 while saving the prior firewall-rule state.
6. Copies SetupVibe Windows helper scripts to `%USERPROFILE%\.setupvibe\bin` and adds that directory to the user `PATH`, normalizing and deduplicating persistent entries and notifying Windows of the environment change.
7. Installs the WSL base without a Linux distribution and makes WSL 2 the default.
8. Applies mirrored networking, VPN/LAN access, DNS, proxy, firewall, memory reclaim, and sparse VHD settings to WSL.
9. Installs WinGet and Chocolatey when needed.
10. Downloads Python 3.14 from `python.org` and resolves Node.js 24 LTS directly through the official `latest-v24.x` channel on `nodejs.org` without the release-index API, WinGet, or Chocolatey. It uses Windows `curl.exe` with HTTPS-only redirects and retries, validates Authenticode and the official Node.js SHA-256, repairs missing Python or Node.js MSI features, removes the redundant `npm.ps1` and `npx.ps1` shims that fail under a restricted execution policy, prepends the native x64 runtime directories to the machine `PATH`, and verifies `python`, `pip`, `node`, `npm`, and `npx` exactly as users invoke them.
11. Installs each remaining Windows utility independently, executes every predictable WinGet and Chocolatey CLI from the refreshed `PATH`, validates `gh.exe` and the Windows Terminal `wt.exe` alias, and continues after isolated package or command failures.
12. Installs and validates the Skills CLI, Claude Code, Codex CLI, and Antigravity CLI from their official sources while preserving every user PowerShell profile file. Skills uses its official npm package and an execution-policy-safe CMD launcher; Claude uses the recommended native installer independently of npm and falls back to Anthropic's official npm package only when necessary; Codex uses OpenAI's official standalone installer instead of npm.
13. Removes only recognized legacy SetupVibe Starship/zoxide profile blocks without re-encoding unrelated content, preserving the original PowerShell profile bytes, user Starship configuration, and execution policy.
14. Displays a final summary and the transcript log location.

The process can take a while because package managers download and install each utility independently.

## After Installation

1. Restart Windows when requested so pending component or package changes can finish.
2. Open Windows Terminal or PowerShell 7 so the refreshed `PATH` is loaded.
3. Complete any first-run authentication required by GitHub CLI, Tailscale, Claude Code, Codex CLI, or Antigravity CLI.

SetupVibe helper scripts are stored in `%USERPROFILE%\.setupvibe\bin`. The installed `ssh_copy_id_core.ps1` core and its minimal `ssh_copy_id.cmd` launcher can be started unambiguously as `ssh_copy_id`. Codex uses its native `codex.exe`; no PowerShell script or SetupVibe launcher is required. Both commands work from a new PowerShell, Windows Terminal, or Command Prompt session.

Verify the main components in a new terminal:

```powershell
winget --version
choco --version
git --version
gh --version
Get-Command wt
rg --version
fzf --version
pwsh --version
python --version
pip --version
node --version
npm --version
npx --version
skills --version
claude --version
codex --version
Get-Command agy
Get-Command ssh_copy_id
wsl --status
wsl --list --verbose
Get-Content $HOME\.wslconfig
Get-NetFirewallHyperVVMSetting -PolicyStore ActiveStore -Name '{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}'
```

`wsl --list --verbose` should report that no distributions are installed unless the machine already had one. The firewall output should show `DefaultInboundAction` as `Allow`.

## Rerunning and Logs

The installer is designed to be rerun. SetupVibe helper scripts are refreshed, WinGet packages already present are skipped, and Chocolatey ensures its managed utilities remain installed.

Complete transcript and dedicated DISM logs are stored in:

```text
C:\ProgramData\SetupVibe\Logs
```

If one package fails, review the final summary and log, resolve the reported issue, and run the same command again.

## Windows Servicing Safety

Before installation or removal, SetupVibe checks for active `DISM`, `dismhost`, `TiWorker`, Windows Installer, Windows Update installers, WinGet, Chocolatey, and other known installer processes. It lists their names and PIDs and asks for permission before stopping them. When accepted, it first uses `Stop-Process`, forces processes that remain, and runs `sfc.exe /scannow` afterward. When declined, it waits for ENTER and exits without starting another servicing operation. It then rejects pending Component Based Servicing or Windows Update restarts, starts the required services, and runs `DISM /Online /Cleanup-Image /CheckHealth`.

System File Checker details are recorded in `C:\Windows\Logs\CBS\CBS.log`.

If a process remains active after normal and forced termination attempts, SetupVibe completes the SFC verification, waits for ENTER, and exits with a recommendation to restart the PC.

OpenSSH does not use Windows Features on Demand or the GitHub releases API. SetupVibe resolves the official `releases/latest` page and its expanded assets, accepts only the x64 `OpenSSH-Win64-*.msi`, validates its Authenticode signature, and explicitly installs and force-repairs the Client and Server features in one MSI transaction with `ADDLOCAL=Client,Server`, `REINSTALL=ALL`, and `REINSTALLMODE=amus`. It resolves the installation directory from the native x64 Program Files directory, MSI metadata, and the `sshd` service, prepends that directory to the machine `PATH`, sets `sshd` to automatic startup, starts it, enables the `OpenSSH-Server-In-TCP` firewall rule for inbound TCP/22, saves the previous rule state for removal, and records `openssh-msi-*.log` under `C:\ProgramData\SetupVibe\Logs`.

## Options

Restart Windows automatically after a completely successful installation when Windows reports that a restart is required:

```powershell
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; & ([scriptblock]::Create((irm https://windows.setupvibe.dev))) -Restart
```

Without `-Restart`, the installer never restarts Windows automatically.

### Uninstall

Remove all utilities and configurations managed by the Windows Edition from a local clone:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\desktop.ps1 -Uninstall
```

Or run the uninstaller from the canonical Windows setup URL:

```powershell
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; & ([scriptblock]::Create((irm https://windows.setupvibe.dev))) -Uninstall
```

The uninstall mode removes OpenSSH Client and Server, Python and Node.js through their official uninstallers, Skills CLI, Claude Code, Codex CLI, Antigravity CLI, the SetupVibe-managed files from `%USERPROFILE%\.setupvibe\bin` and their user `PATH` entries, restores the previous WSL optional-feature, WSL firewall, and OpenSSH firewall-rule states, removes the SetupVibe WSL configuration, removes every WinGet and Chocolatey utility managed by SetupVibe, and removes SetupVibe-added package and runtime machine `PATH` entries and recognized legacy SetupVibe Starship/zoxide profile blocks. Installed agent skills are preserved. It also removes legacy framework tools, missing runtime-manager paths, and npm packages installed by earlier Windows Beta versions. Existing user-managed `PATH` directories, Starship configuration, Linux distributions, AI CLI user configuration and credentials, WinGet, Chocolatey, transcript logs, and unrelated files under `%USERPROFILE%\.setupvibe` are preserved.

**Uninstall warning:** the current Beta does not track whether OpenSSH Client and Server or a managed package existed before SetupVibe. `-Uninstall` therefore removes the OpenSSH MSI product and every package in its managed lists, including components that may have been installed separately before SetupVibe.

Combine `-Uninstall` with `-Restart` to restart automatically when Windows reports that a restart is required.

## Scope and Limitations

- Windows 10, Windows Server, Windows 11 builds older than 22621, 32-bit Windows, and Windows on ARM are rejected; only x64 is supported.
- WSL is installed and configured for WSL 2, mirrored VPN/LAN networking, and common development optimizations, but no Linux distribution is installed.
- Python 3.14 and Node.js 24 LTS are installed for local automation; Claude Code, Codex CLI, and Antigravity CLI are the only AI CLIs installed. Other programming languages, frameworks, runtime managers, and AI CLIs are excluded.
- Starship and ZSH are not installed on Windows, PowerShell profiles are not customized, and the persistent execution policy is not changed.
- Docker Desktop and a local Docker engine are not installed.
