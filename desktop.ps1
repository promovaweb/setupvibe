#Requires -Version 5.1

[CmdletBinding()]
param(
    [switch]$Restart,
    [switch]$Uninstall,
    [Parameter(DontShow = $true)][string]$ExpectedUserSid
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'Continue'

$script:Version = '0.41.11'
$script:InstallUrl = 'https://windows.setupvibe.dev'
$script:RestartRequired = $false
$script:RestartBeforeRetryRequired = $false
$script:SystemFileCheckerCompleted = $false
$script:Failures = New-Object System.Collections.Generic.List[string]
$script:LogDirectory = Join-Path $env:ProgramData 'SetupVibe\Logs'
$script:TranscriptStarted = $false
$script:WinGetPath = $null
$script:ChocolateyPath = $null
$script:WslVmCreatorId = '{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}'
$script:WslFeatureStatePath = Join-Path $env:ProgramData 'SetupVibe\wsl-feature-state.json'
$script:WslFirewallStatePath = Join-Path $env:ProgramData 'SetupVibe\wsl-firewall-inbound.txt'
$script:OpenSshFirewallStatePath = Join-Path $env:ProgramData 'SetupVibe\openssh-firewall-state.json'
$script:RuntimePathStatePath = Join-Path $env:ProgramData 'SetupVibe\windows-runtime-paths.json'
$script:AiCliPathStatePath = Join-Path $env:ProgramData 'SetupVibe\windows-ai-cli-paths.json'
$script:PackagePathStatePath = Join-Path $env:ProgramData 'SetupVibe\windows-package-paths.json'
$script:SetupVibeUserDirectory = Join-Path $env:USERPROFILE '.setupvibe'
$script:WindowsUtilitiesDirectory = Join-Path $script:SetupVibeUserDirectory 'bin'
$script:WindowsUtilitiesStatePath = Join-Path $script:SetupVibeUserDirectory 'windows-utilities.json'
$script:CodexInstallDirectory = Join-Path $env:LOCALAPPDATA 'Programs\OpenAI\Codex\bin'
$script:InvokerUserSid = $null

$script:WindowsUtilities = @(
    @{ Path = 'utils/windows/ssh_copy_id/ssh_copy_id.ps1'; Name = 'ssh_copy_id_core.ps1' }
    @{ Path = 'utils/windows/ssh_copy_id/ssh_copy_id.cmd'; Name = 'ssh_copy_id.cmd' }
)
$script:LegacyWindowsUtilityFiles = @('ssh_copy_id.bat', 'ssh_copy_id.ps1', 'codex.cmd')

$script:WinGetPackages = @(
    @{ Id = 'Git.Git'; Name = 'Git' }
    @{ Id = '7zip.7zip'; Name = '7-Zip' }
    @{ Id = 'JernejSimoncic.Wget'; Name = 'Wget' }
    @{ Id = 'Gyan.FFmpeg'; Name = 'FFmpeg' }
    @{ Id = 'ImageMagick.ImageMagick'; Name = 'ImageMagick' }
    @{ Id = 'GitHub.cli'; Name = 'GitHub CLI (gh)' }
    @{ Id = 'sharkdp.bat'; Name = 'bat' }
    @{ Id = 'eza-community.eza'; Name = 'eza' }
    @{ Id = 'ajeetdsouza.zoxide'; Name = 'zoxide' }
    @{ Id = 'junegunn.fzf'; Name = 'fzf' }
    @{ Id = 'BurntSushi.ripgrep.MSVC'; Name = 'ripgrep' }
    @{ Id = 'sharkdp.fd'; Name = 'fd' }
    @{ Id = 'JesseDuffield.lazygit'; Name = 'lazygit' }
    @{ Id = 'Neovim.Neovim'; Name = 'Neovim' }
    @{ Id = 'charmbracelet.glow'; Name = 'Glow' }
    @{ Id = 'tldr-pages.tlrc'; Name = 'tldr' }
    @{ Id = 'Fastfetch-cli.Fastfetch'; Name = 'Fastfetch' }
    @{ Id = 'muesli.duf'; Name = 'duf' }
    @{ Id = 'jqlang.jq'; Name = 'jq' }
    @{ Id = 'Insecure.Nmap'; Name = 'Nmap' }
    @{ Id = 'Ookla.Speedtest.CLI'; Name = 'Speedtest CLI' }
    @{ Id = 'Tailscale.Tailscale'; Name = 'Tailscale' }
    @{ Id = 'orf.gping'; Name = 'gping' }
    @{ Id = 'aristocratos.btop4win'; Name = 'btop4win' }
    @{ Id = 'Microsoft.PowerShell'; Name = 'PowerShell 7' }
    @{ Id = 'Microsoft.WindowsTerminal'; Name = 'Windows Terminal' }
    @{ Id = 'DEVCOM.JetBrainsMonoNerdFont'; Name = 'JetBrains Mono Nerd Font' }
)

$script:ChocolateyPackages = @(
    @{ Id = 'trippy'; Name = 'trippy' }
    @{ Id = 'firacodenf'; Name = 'FiraCode Nerd Font' }
)

$script:WinGetCommandChecks = @(
    @{ Name = 'Git'; Command = 'git.exe'; Arguments = @('--version') }
    @{ Name = '7-Zip'; Command = '7z.exe'; Arguments = @('i'); PreferredPaths = @((Join-Path $env:ProgramFiles '7-Zip\7z.exe')) }
    @{ Name = 'Wget'; Command = 'wget.exe'; Arguments = @('--version') }
    @{ Name = 'FFmpeg'; Command = 'ffmpeg.exe'; Arguments = @('-version') }
    @{ Name = 'ImageMagick'; Command = 'magick.exe'; Arguments = @('-version') }
    @{ Name = 'bat'; Command = 'bat.exe'; Arguments = @('--version') }
    @{ Name = 'eza'; Command = 'eza.exe'; Arguments = @('--version') }
    @{ Name = 'zoxide'; Command = 'zoxide.exe'; Arguments = @('--version') }
    @{ Name = 'fzf'; Command = 'fzf.exe'; Arguments = @('--version') }
    @{ Name = 'ripgrep'; Command = 'rg.exe'; Arguments = @('--version') }
    @{ Name = 'fd'; Command = 'fd.exe'; Arguments = @('--version') }
    @{ Name = 'lazygit'; Command = 'lazygit.exe'; Arguments = @('--version') }
    @{ Name = 'Neovim'; Command = 'nvim.exe'; Arguments = @('--version') }
    @{ Name = 'Glow'; Command = 'glow.exe'; Arguments = @('--version') }
    @{ Name = 'tldr'; Command = 'tldr.exe'; Arguments = @('--version') }
    @{ Name = 'Fastfetch'; Command = 'fastfetch.exe'; Arguments = @('--version') }
    @{ Name = 'duf'; Command = 'duf.exe'; Arguments = @('--version') }
    @{ Name = 'jq'; Command = 'jq.exe'; Arguments = @('--version') }
    @{ Name = 'Nmap'; Command = 'nmap.exe'; Arguments = @('--version') }
    @{ Name = 'Speedtest CLI'; Command = 'speedtest.exe'; Arguments = @('--version') }
    @{ Name = 'Tailscale'; Command = 'tailscale.exe'; Arguments = @('version') }
    @{ Name = 'gping'; Command = 'gping.exe'; Arguments = @('--version') }
    @{ Name = 'btop4win'; Command = 'btop4win.exe'; Arguments = @('--version'); PreferredPaths = @((Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages\aristocratos.btop4win_Microsoft.Winget.Source_8wekyb3d8bbwe\btop4win\btop4win.exe')) }
    @{ Name = 'PowerShell 7'; Command = 'pwsh.exe'; Arguments = @('--version') }
)

$script:ChocolateyCommandChecks = @(
    @{ Name = 'trippy'; Command = 'trip.exe'; Arguments = @('--version') }
)

$script:LegacyWinGetPackages = @(
    @{ Id = 'PHP.PHP.8.4'; Name = 'PHP 8.4' }
    @{ Id = 'RubyInstallerTeam.RubyWithDevKit.3.3'; Name = 'Ruby 3.3 with DevKit' }
    @{ Id = 'Python.Python.3.12'; Name = 'Python 3.12' }
    @{ Id = 'astral-sh.uv'; Name = 'uv' }
    @{ Id = 'GoLang.Go'; Name = 'Go' }
    @{ Id = 'Rustlang.Rustup'; Name = 'Rustup' }
    @{ Id = 'Oven-sh.Bun'; Name = 'Bun' }
    @{ Id = 'jdx.mise'; Name = 'mise' }
)

$script:LegacyNpmPackages = @('pnpm', 'pm2', '@n8n/cli', 'agentlytics', '@githubnext/github-copilot-cli', 'npm')

function Write-Section {
    param([Parameter(Mandatory = $true)][string]$Message)

    Write-Host ''
    Write-Host ("==> {0}" -f $Message) -ForegroundColor Cyan
}

function Write-Success {
    param([Parameter(Mandatory = $true)][string]$Message)

    Write-Host ("[OK] {0}" -f $Message) -ForegroundColor Green
}

function Write-WarningMessage {
    param([Parameter(Mandatory = $true)][string]$Message)

    Write-Host ("[WARN] {0}" -f $Message) -ForegroundColor Yellow
}

function Test-Administrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-NativeWindowsPowerShellPath {
    if ([Environment]::Is64BitProcess) {
        return (Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe')
    }
    return (Join-Path $env:SystemRoot 'Sysnative\WindowsPowerShell\v1.0\powershell.exe')
}

function Invoke-PowerShellHandoff {
    param([Parameter()][switch]$Elevate)

    $scriptPath = $PSCommandPath
    $temporaryScript = $null

    if ([string]::IsNullOrWhiteSpace($scriptPath)) {
        [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
        $temporaryScript = Join-Path ([IO.Path]::GetTempPath()) ("SetupVibe-desktop-{0}.ps1" -f $PID)
        $webClient = New-Object Net.WebClient
        try {
            $webClient.DownloadFile($script:InstallUrl, $temporaryScript)
        }
        finally {
            $webClient.Dispose()
        }
        $scriptPath = $temporaryScript
    }

    $powerShellArguments = @(
        '-NoLogo'
        '-NoProfile'
        '-ExecutionPolicy'
        'Bypass'
        '-File'
        ('"{0}"' -f $scriptPath)
    )
    if ($Restart) {
        $powerShellArguments += '-Restart'
    }
    if ($Uninstall) {
        $powerShellArguments += '-Uninstall'
    }
    if (-not [string]::IsNullOrWhiteSpace($script:InvokerUserSid)) {
        $powerShellArguments += '-ExpectedUserSid'
        $powerShellArguments += ('"{0}"' -f $script:InvokerUserSid)
    }

    $powerShellPath = Get-NativeWindowsPowerShellPath
    $startProcessArguments = @{
        FilePath = $powerShellPath
        ArgumentList = $powerShellArguments
        Wait = $true
        PassThru = $true
    }
    if ($Elevate) {
        $startProcessArguments.Verb = 'RunAs'
    }

    try {
        $process = Start-Process @startProcessArguments
        exit $process.ExitCode
    }
    finally {
        if ($temporaryScript) {
            Remove-Item -Path $temporaryScript -Force -ErrorAction SilentlyContinue
        }
    }
}

function Request-Elevation {
    Write-Host 'Administrator privileges are required. Opening the UAC prompt...' -ForegroundColor Yellow
    Invoke-PowerShellHandoff -Elevate
}

function Request-64BitPowerShell {
    Write-Host 'SetupVibe requires a 64-bit PowerShell process. Restarting with native x64 Windows PowerShell...' -ForegroundColor Yellow
    Invoke-PowerShellHandoff -Elevate:(-not (Test-Administrator))
}

function Invoke-NativeCommand {
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [Parameter()][string[]]$ArgumentList = @(),
        [Parameter()][int[]]$SuccessExitCode = @(0)
    )

    & $FilePath @ArgumentList
    $exitCode = $LASTEXITCODE
    if ($SuccessExitCode -notcontains $exitCode) {
        throw "Command '$FilePath $($ArgumentList -join ' ')' failed with exit code $exitCode."
    }
    if ($exitCode -in @(1641, 3010)) {
        $script:RestartRequired = $true
    }
}

function Invoke-MsiExec {
    param(
        [Parameter(Mandatory = $true)][string[]]$ArgumentList,
        [Parameter()][int[]]$SuccessExitCode = @(0)
    )

    # msiexec must run as its own elevated process (Start-Process), not as a direct
    # child of this already-elevated session: invoking it via '&' can make Windows
    # Installer's SecureRepair validation misidentify the installing user and fail
    # with a spurious "Error 1316: the specified account already exists" (MSI exit
    # code 1603) on installers that register per-machine components, such as Node.js.
    $msiExecPath = Join-Path $env:SystemRoot 'System32\msiexec.exe'
    $process = Start-Process -FilePath $msiExecPath -ArgumentList $ArgumentList -Wait -PassThru
    $exitCode = $process.ExitCode
    if ($SuccessExitCode -notcontains $exitCode) {
        throw "Command 'msiexec.exe $($ArgumentList -join ' ')' failed with exit code $exitCode."
    }
    if ($exitCode -in @(1641, 3010)) {
        $script:RestartRequired = $true
    }
    return $exitCode
}

function Get-ObjectPropertyValue {
    param(
        [Parameter(Mandatory = $true)][object]$InputObject,
        [Parameter(Mandatory = $true)][string]$Name
    )

    if ($InputObject -is [System.Collections.IDictionary]) {
        if ($InputObject.Contains($Name)) {
            return $InputObject[$Name]
        }
        return $null
    }

    $property = $InputObject.PSObject.Properties[$Name]
    if ($property) {
        return $property.Value
    }
    return $null
}

function Invoke-SetupStep {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][scriptblock]$Action
    )

    Write-Section $Name
    Write-Host ("[RUN] {0} started at {1:HH:mm:ss}." -f $Name, (Get-Date)) -ForegroundColor Cyan
    $stopwatch = [Diagnostics.Stopwatch]::StartNew()
    try {
        & $Action
        $stopwatch.Stop()
        Write-Host ("[DONE] {0} finished in {1:N1}s." -f $Name, $stopwatch.Elapsed.TotalSeconds) -ForegroundColor DarkGray
    }
    catch {
        $stopwatch.Stop()
        $script:Failures.Add($Name)
        Write-Host ("[ERROR] {0} failed after {1:N1}s: {2}" -f $Name, $stopwatch.Elapsed.TotalSeconds, $_.Exception.Message) -ForegroundColor Red
    }
}

function Stop-SetupIfFailed {
    param([Parameter(Mandatory = $true)][string]$LogPath)

    if ($script:Failures.Count -eq 0) {
        return
    }

    Write-Section 'Summary'
    Write-Host ("Failed steps: {0}" -f ($script:Failures -join ', ')) -ForegroundColor Red
    Write-Host ("Review the log and run desktop.ps1 again: {0}" -f $LogPath)
    if ($script:RestartBeforeRetryRequired) {
        Write-WarningMessage 'Restart the PC before running SetupVibe again.'
    }
    elseif ($script:RestartRequired) {
        Write-WarningMessage 'Windows must be restarted before all changes can take effect.'
    }
    if ($script:TranscriptStarted) {
        Stop-Transcript | Out-Null
        $script:TranscriptStarted = $false
    }
    exit 1
}

function Get-ActiveWindowsInstallerProcesses {
    $installerProcessNames = @(
        'AppInstallerCLI'
        'choco'
        'dism'
        'dismhost'
        'msiexec'
        'poqexec'
        'setuphost'
        'TiWorker'
        'winget'
        'Windows10UpgraderApp'
        'Windows11InstallationAssistant'
        'WindowsUpdateBox'
        'wusa'
    )

    return @(Get-Process -Name $installerProcessNames -ErrorAction SilentlyContinue | Sort-Object ProcessName, Id)
}

function Resolve-ActiveWindowsInstallerOperations {
    $activeProcesses = @(Get-ActiveWindowsInstallerProcesses)
    if ($activeProcesses.Count -eq 0) {
        Write-Success 'No competing Windows servicing or package-installer operation is active.'
        return
    }

    $script:RestartBeforeRetryRequired = $true
    Write-Host ''
    Write-Host '[ALERT] Another Windows installation or servicing operation is in progress:' -ForegroundColor Red
    foreach ($process in $activeProcesses) {
        Write-Host ("  - {0} (PID {1})" -f $process.ProcessName, $process.Id) -ForegroundColor Red
    }

    $confirmation = [string](Read-Host '[CONFIRM] Terminate these installer processes? SetupVibe will try normally first and force remaining processes if needed. [y/N]')
    if ($confirmation.Trim().ToLowerInvariant() -notin @('y', 'yes', 's', 'sim')) {
        Write-Host '[ACTION] No process was terminated. Restart the PC, then run SetupVibe again.' -ForegroundColor Yellow
        [void](Read-Host '[PAUSE] Press ENTER to close SetupVibe')
        throw 'SetupVibe stopped because the user declined to terminate active installer processes.'
    }

    foreach ($process in $activeProcesses) {
        Write-Host ("[RUN] Stopping {0} (PID {1})..." -f $process.ProcessName, $process.Id)
        try {
            Stop-Process -Id $process.Id -ErrorAction Stop
        }
        catch {
            Write-WarningMessage ("Normal stop failed for {0} (PID {1})." -f $process.ProcessName, $process.Id)
        }

        Start-Sleep -Seconds 1
        if (Get-Process -Id $process.Id -ErrorAction SilentlyContinue) {
            Write-WarningMessage ("Forcing {0} (PID {1}) to stop." -f $process.ProcessName, $process.Id)
            Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        }
    }

    Write-Section 'System integrity verification after installer termination'
    Ensure-WindowsServiceReady -Name 'TrustedInstaller'
    Invoke-SystemFileChecker

    # sfc.exe /scannow runs through TrustedInstaller's own TiWorker.exe, which is one of
    # the watched process names. TiWorker commonly keeps running for a short while after
    # SFC reports completion, so check immediately after SFC would otherwise misreport its
    # own worker process as a competing installer. Give it a short grace period to exit.
    $remainingProcesses = @(Get-ActiveWindowsInstallerProcesses)
    $remainingWaitAttempts = 0
    while ($remainingProcesses.Count -gt 0 -and $remainingWaitAttempts -lt 15) {
        Start-Sleep -Seconds 2
        $remainingWaitAttempts++
        $remainingProcesses = @(Get-ActiveWindowsInstallerProcesses)
    }
    if ($remainingProcesses.Count -gt 0) {
        Write-Host '[ALERT] Installer processes remain active after the termination attempts:' -ForegroundColor Red
        foreach ($process in $remainingProcesses) {
            Write-Host ("  - {0} (PID {1})" -f $process.ProcessName, $process.Id) -ForegroundColor Red
        }
        Write-Host '[ACTION] Restart the PC, then run SetupVibe again.' -ForegroundColor Yellow
        [void](Read-Host '[PAUSE] Press ENTER to close SetupVibe')
        throw 'SetupVibe stopped because installer processes remain active after normal and forced termination attempts.'
    }

    $script:RestartBeforeRetryRequired = $false
    Write-Success 'Competing installer processes were terminated and system integrity was verified.'
}

function Get-PendingWindowsRestartReasons {
    $reasons = New-Object System.Collections.Generic.List[string]
    $rebootKeys = @(
        @{ Path = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending'; Reason = 'Component Based Servicing' }
        @{ Path = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired'; Reason = 'Windows Update' }
    )

    foreach ($rebootKey in $rebootKeys) {
        if (Test-Path $rebootKey.Path) {
            $reasons.Add([string]$rebootKey.Reason)
        }
    }
    return @($reasons)
}

function Ensure-WindowsServiceReady {
    param([Parameter(Mandatory = $true)][string]$Name)

    $service = Get-Service -Name $Name -ErrorAction Stop
    if ($service.Status -ne [System.ServiceProcess.ServiceControllerStatus]::Running) {
        Write-Host ("[RUN] Starting required Windows service: {0}" -f $Name)
        try {
            Start-Service -Name $Name -ErrorAction Stop
            $service.WaitForStatus([System.ServiceProcess.ServiceControllerStatus]::Running, [TimeSpan]::FromSeconds(30))
            $service.Refresh()
        }
        catch {
            throw "Required Windows service '$Name' could not be started. Its startup may be disabled by local or domain policy. $($_.Exception.Message)"
        }
    }

    if ($service.Status -ne [System.ServiceProcess.ServiceControllerStatus]::Running) {
        throw "Required Windows service '$Name' did not reach the Running state."
    }
    Write-Success ("Required Windows service is ready: {0}" -f $Name)
}

function Invoke-SystemFileChecker {
    $sfcPath = Join-Path $env:SystemRoot 'System32\sfc.exe'
    Write-Host '[RUN] Running System File Checker before SetupVibe makes changes.'
    Write-WarningMessage 'sfc.exe /scannow can take several minutes. Keep this window open until verification reaches 100%.'
    Invoke-NativeCommand -FilePath $sfcPath -ArgumentList @('/scannow')
    $script:SystemFileCheckerCompleted = $true
    Write-Success 'System File Checker completed. Details are available in C:\Windows\Logs\CBS\CBS.log.'
}

function Invoke-WindowsInstallerPreflight {
    param([Parameter()][switch]$RequireWindowsUpdate)

    Resolve-ActiveWindowsInstallerOperations

    $restartReasons = @(Get-PendingWindowsRestartReasons)
    if ($restartReasons.Count -gt 0) {
        $script:RestartRequired = $true
        throw "Windows has a pending restart requested by: $($restartReasons -join ', '). Restart Windows before running SetupVibe so component and package operations begin from a consistent state."
    }

    Ensure-WindowsServiceReady -Name 'TrustedInstaller'
    if (-not $script:SystemFileCheckerCompleted) {
        Invoke-SystemFileChecker
    }
    if ($RequireWindowsUpdate) {
        Ensure-WindowsServiceReady -Name 'wuauserv'
        Ensure-WindowsServiceReady -Name 'bits'

        $useWsus = Get-ItemPropertyValue -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU' -Name 'UseWUServer' -ErrorAction SilentlyContinue
        $blockPublicWindowsUpdate = Get-ItemPropertyValue -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate' -Name 'DoNotConnectToWindowsUpdateInternetLocations' -ErrorAction SilentlyContinue
        if ([int]$useWsus -eq 1 -or [int]$blockPublicWindowsUpdate -eq 1) {
            Write-WarningMessage 'Windows Update is controlled by WSUS or domain policy. Windows optional features may fail if the corporate update source does not provide the required content.'
        }
    }

    $dismPath = Join-Path $env:SystemRoot 'System32\dism.exe'
    $preflightLogPath = Join-Path $script:LogDirectory ("dism-preflight-{0:yyyyMMdd-HHmmss}.log" -f (Get-Date))
    Write-Host ("[RUN] Checking the Windows component store. DISM log: {0}" -f $preflightLogPath)
    Invoke-NativeCommand -FilePath $dismPath -ArgumentList @('/Online', '/Cleanup-Image', '/CheckHealth', "/LogPath:$preflightLogPath")
    Write-Success 'Windows servicing and installer prerequisites are ready.'
}

function ConvertTo-NormalizedPathEntry {
    param([Parameter(Mandatory = $true)][string]$Path)

    $normalizedPath = [Environment]::ExpandEnvironmentVariables($Path.Trim().Trim('"'))
    if ([string]::IsNullOrWhiteSpace($normalizedPath)) {
        return ''
    }
    if ($normalizedPath -match '%[^%]+%') {
        return $normalizedPath.TrimEnd('\', '/')
    }
    try {
        $fullPath = [IO.Path]::GetFullPath($normalizedPath)
        $pathRoot = [IO.Path]::GetPathRoot($fullPath)
        if ($fullPath.Equals($pathRoot, [StringComparison]::OrdinalIgnoreCase)) {
            return $pathRoot
        }
        return $fullPath.TrimEnd('\', '/')
    }
    catch {
        return $normalizedPath.TrimEnd('\', '/')
    }
}

function Send-EnvironmentChangeNotification {
    try {
        if (-not ('SetupVibe.NativeMethods' -as [type])) {
            Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

namespace SetupVibe {
    public static class NativeMethods {
        [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        public static extern IntPtr SendMessageTimeout(
            IntPtr hWnd,
            uint message,
            UIntPtr wParam,
            string lParam,
            uint flags,
            uint timeout,
            out UIntPtr result);
    }
}
'@
        }

        $result = [UIntPtr]::Zero
        [void][SetupVibe.NativeMethods]::SendMessageTimeout(
            [IntPtr]0xFFFF,
            0x001A,
            [UIntPtr]::Zero,
            'Environment',
            0x0002,
            5000,
            [ref]$result
        )
    }
    catch {
        Write-WarningMessage ("The persistent PATH was updated, but Windows could not be notified immediately: {0}" -f $_.Exception.Message)
    }
}

function Import-EnvironmentPath {
    $pathEntries = @(
        ([Environment]::GetEnvironmentVariable('Path', 'Machine') -split ';')
        ([Environment]::GetEnvironmentVariable('Path', 'User') -split ';')
        (Join-Path $env:ProgramData 'chocolatey\bin')
    )
    $uniquePaths = New-Object System.Collections.Generic.List[string]
    $normalizedPaths = New-Object System.Collections.Generic.HashSet[string] ([StringComparer]::OrdinalIgnoreCase)
    foreach ($pathEntry in $pathEntries) {
        if ([string]::IsNullOrWhiteSpace([string]$pathEntry)) {
            continue
        }
        $normalizedPath = ConvertTo-NormalizedPathEntry -Path ([string]$pathEntry)
        if ($normalizedPaths.Add($normalizedPath)) {
            $uniquePaths.Add(([string]$pathEntry).Trim())
        }
    }
    $env:Path = $uniquePaths -join ';'
}

function Get-NativeProgramFilesDirectory {
    $programFilesDirectory = [Environment]::GetEnvironmentVariable('ProgramW6432', 'Process')
    if ([string]::IsNullOrWhiteSpace($programFilesDirectory)) {
        $programFilesDirectory = [Environment]::GetEnvironmentVariable('ProgramFiles', 'Process')
    }
    if ([string]::IsNullOrWhiteSpace($programFilesDirectory)) {
        throw 'The native x64 Program Files directory could not be resolved.'
    }
    return $programFilesDirectory.TrimEnd('\')
}

function Find-Executable {
    param([Parameter(Mandatory = $true)][string]$Name)

    Import-EnvironmentPath
    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if (-not $command) {
        throw "Required command '$Name' was not found after package installation. Open a new terminal and run desktop.ps1 again."
    }
    return $command.Source
}

function Assert-CommandResolvesToPath {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$ExpectedPath
    )

    Import-EnvironmentPath
    $resolvedCommand = Get-Command $Name -ErrorAction SilentlyContinue | Select-Object -First 1
    $expectedFullPath = [IO.Path]::GetFullPath($ExpectedPath)
    if (-not $resolvedCommand) {
        throw "The '$Name' command was not found in the refreshed Windows PATH. Expected: $expectedFullPath"
    }
    $resolvedFullPath = [IO.Path]::GetFullPath($resolvedCommand.Source)
    if (-not $resolvedFullPath.Equals($expectedFullPath, [StringComparison]::OrdinalIgnoreCase)) {
        throw "The '$Name' command is shadowed by another installation. Expected $expectedFullPath, resolved $resolvedFullPath."
    }
    Write-Success ("{0} resolves to the expected PATH executable: {1}" -f $Name, $expectedFullPath)
}

function Get-OpenSshMsiProducts {
    return @(Get-ItemProperty -Path @(
                'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*'
                'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*'
            ) -ErrorAction SilentlyContinue | Where-Object {
            $displayName = [string](Get-ObjectPropertyValue -InputObject $_ -Name 'DisplayName')
            $displayName -match '^OpenSSH'
        })
}

function Get-OpenSshCandidateDirectories {
    param([Parameter()][object[]]$Products = @())

    $candidateDirectories = @()
    foreach ($product in $Products) {
        $installLocation = [string](Get-ObjectPropertyValue -InputObject $product -Name 'InstallLocation')
        if (-not [string]::IsNullOrWhiteSpace($installLocation)) {
            $candidateDirectories += $installLocation.TrimEnd('\')
        }
    }

    $nativeProgramFiles = Get-NativeProgramFilesDirectory
    foreach ($programFilesDirectory in @($nativeProgramFiles, $env:ProgramFiles)) {
        if ([string]::IsNullOrWhiteSpace($programFilesDirectory)) {
            continue
        }
        $candidateDirectories += Join-Path $programFilesDirectory 'OpenSSH'
        $candidateDirectories += Join-Path $programFilesDirectory 'OpenSSH-Win64'
        $candidateDirectories += @(Get-ChildItem -Path $programFilesDirectory -Directory -Filter 'OpenSSH*' -ErrorAction SilentlyContinue | ForEach-Object {
                $_.FullName
            })
    }

    $sshdImagePath = [string](Get-ItemPropertyValue -Path 'HKLM:\SYSTEM\CurrentControlSet\Services\sshd' -Name 'ImagePath' -ErrorAction SilentlyContinue)
    if (-not [string]::IsNullOrWhiteSpace($sshdImagePath)) {
        $sshdImagePath = [Environment]::ExpandEnvironmentVariables($sshdImagePath)
        if ($sshdImagePath -match '^\s*"([^"]+\.exe)"' -or $sshdImagePath -match '^\s*(.+?\.exe)(?:\s|$)') {
            $candidateDirectories += Split-Path -Path $matches[1] -Parent
        }
    }

    return @($candidateDirectories | Where-Object {
            -not [string]::IsNullOrWhiteSpace($_)
        } | Sort-Object -Unique)
}

function Find-OpenSshInstallDirectory {
    param([Parameter()][object[]]$Products = @())

    return @(Get-OpenSshCandidateDirectories -Products $Products | Where-Object {
            Test-Path (Join-Path $_ 'ssh.exe') -PathType Leaf
        } | Select-Object -First 1)
}

function Install-OpenSsh {
    $temporaryDirectory = Join-Path ([IO.Path]::GetTempPath()) ("SetupVibe-OpenSSH-{0}" -f $PID)
    $msiLogPath = Join-Path $script:LogDirectory ("openssh-msi-{0:yyyyMMdd-HHmmss}.log" -f (Get-Date))
    $installedProducts = @()
    $openSshDirectory = @()

    if (-not (Test-Path $script:OpenSshFirewallStatePath -PathType Leaf)) {
        $existingFirewallRule = Get-NetFirewallRule -Name 'OpenSSH-Server-In-TCP' -ErrorAction SilentlyContinue | Select-Object -First 1
        $firewallState = if ($existingFirewallRule) {
            $portFilter = $existingFirewallRule | Get-NetFirewallPortFilter -ErrorAction SilentlyContinue | Select-Object -First 1
            @{
                Existed = $true
                DisplayName = [string]$existingFirewallRule.DisplayName
                Enabled = [string]$existingFirewallRule.Enabled
                Action = [string]$existingFirewallRule.Action
                Direction = [string]$existingFirewallRule.Direction
                Profile = [string]$existingFirewallRule.Profile
                Protocol = if ($portFilter) { [string]$portFilter.Protocol } else { 'TCP' }
                LocalPort = if ($portFilter) { [string]$portFilter.LocalPort } else { '22' }
            }
        }
        else {
            @{ Existed = $false }
        }
        $firewallState | ConvertTo-Json | Set-Content -Path $script:OpenSshFirewallStatePath -Encoding ASCII
    }

    New-Item -Path $temporaryDirectory -ItemType Directory -Force | Out-Null
    try {
        Write-Host '[RUN] Resolving the latest official Microsoft Win32-OpenSSH x64 MSI...'
        [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
        $githubHeaders = @{ 'User-Agent' = 'SetupVibe-Windows' }
        $latestReleasePage = Invoke-WebRequest -Uri 'https://github.com/PowerShell/Win32-OpenSSH/releases/latest' -Headers $githubHeaders -UseBasicParsing
        $tagMatch = [regex]::Match($latestReleasePage.Content, '/PowerShell/Win32-OpenSSH/releases/tag/([^"&<]+)')
        if (-not $tagMatch.Success) {
            throw 'The latest Win32-OpenSSH release tag could not be resolved from the official GitHub release page.'
        }

        $releaseTag = [Uri]::UnescapeDataString($tagMatch.Groups[1].Value)
        $expandedAssetsUrl = "https://github.com/PowerShell/Win32-OpenSSH/releases/expanded_assets/$releaseTag"
        $expandedAssetsPage = Invoke-WebRequest -Uri $expandedAssetsUrl -Headers $githubHeaders -UseBasicParsing
        $assetMatch = [regex]::Match($expandedAssetsPage.Content, '/PowerShell/Win32-OpenSSH/releases/download/[^"?]+/OpenSSH-Win64-v[^"?]+\.msi')
        if (-not $assetMatch.Success) {
            throw "The official Win32-OpenSSH release '$releaseTag' does not contain an x64 Win64 MSI."
        }

        $assetUrl = "https://github.com$($assetMatch.Value)"
        $assetName = [IO.Path]::GetFileName($assetMatch.Value)
        $msiPath = Join-Path $temporaryDirectory $assetName
        Write-Host ("[RUN] Downloading OpenSSH {0}: {1}" -f $releaseTag, $assetName)
        Invoke-WebRequest -Uri $assetUrl -Headers $githubHeaders -OutFile $msiPath -UseBasicParsing
        Assert-ValidAuthenticodeSignature -Path $msiPath -Name "Microsoft Win32-OpenSSH $releaseTag x64 MSI"

        Write-Host '[RUN] Installing the OpenSSH Client and Server components from the official Microsoft MSI...'
        $msiArguments = @(
            '/i'
            $msiPath
            'ADDLOCAL=Client,Server'
            'REMOVE='
            'REINSTALL=ALL'
            'REINSTALLMODE=amus'
            '/qn'
            '/norestart'
            '/L*v'
            $msiLogPath
        )
        Invoke-NativeCommand -FilePath (Join-Path $env:SystemRoot 'System32\msiexec.exe') -ArgumentList $msiArguments -SuccessExitCode @(0, 1641, 3010)

        $installedProducts = @(Get-OpenSshMsiProducts)
        $openSshDirectory = @(Find-OpenSshInstallDirectory -Products $installedProducts)
    }
    finally {
        Remove-Item -Path $temporaryDirectory -Recurse -Force -ErrorAction SilentlyContinue
    }

    if ($openSshDirectory.Count -eq 0) {
        $checkedDirectories = @(Get-OpenSshCandidateDirectories -Products $installedProducts)
        $checkedDirectoryText = if ($checkedDirectories.Count -gt 0) { $checkedDirectories -join ', ' } else { 'no MSI installation directory was registered' }
        throw "OpenSSH MSI completed, but ssh.exe was not found. Checked: $checkedDirectoryText. Review $msiLogPath."
    }
    if (-not (Test-Path (Join-Path $openSshDirectory[0] 'sshd.exe') -PathType Leaf)) {
        throw "OpenSSH Client was installed at $($openSshDirectory[0]), but sshd.exe was not found. Review $msiLogPath."
    }

    Add-PathEntry -Path $openSshDirectory[0] -Scope 'Machine' -Prepend
    New-Item -Path (Join-Path $env:USERPROFILE '.ssh') -ItemType Directory -Force | Out-Null
    $sshPath = Join-Path $openSshDirectory[0] 'ssh.exe'
    Assert-CommandResolvesToPath -Name 'ssh.exe' -ExpectedPath $sshPath
    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $sshVersion = @(& $sshPath -V 2>&1)
    }
    finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }
    if ($LASTEXITCODE -ne 0 -or $sshVersion.Count -eq 0) {
        throw "OpenSSH Client validation failed: $($openSshDirectory[0])\ssh.exe -V"
    }

    $sshdService = Get-Service -Name 'sshd' -ErrorAction Stop
    Set-Service -Name 'sshd' -StartupType Automatic
    if ($sshdService.Status -ne [System.ServiceProcess.ServiceControllerStatus]::Running) {
        Start-Service -Name 'sshd'
        $sshdService.WaitForStatus([System.ServiceProcess.ServiceControllerStatus]::Running, [TimeSpan]::FromSeconds(30))
        $sshdService.Refresh()
    }
    if ($sshdService.Status -ne [System.ServiceProcess.ServiceControllerStatus]::Running) {
        throw 'OpenSSH Server was installed, but the sshd service did not reach the Running state.'
    }

    $firewallRule = Get-NetFirewallRule -Name 'OpenSSH-Server-In-TCP' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($firewallRule) {
        Set-NetFirewallRule -Name 'OpenSSH-Server-In-TCP' -Enabled True -Action Allow
    }
    else {
        New-NetFirewallRule -Name 'OpenSSH-Server-In-TCP' -DisplayName 'OpenSSH Server (sshd)' -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22 -Profile Any | Out-Null
    }

    Write-Success ("OpenSSH Client installed: {0}" -f ($sshVersion -join ' '))
    Write-Success 'OpenSSH Server is running automatically and the inbound TCP/22 firewall rule is enabled.'
}

function Uninstall-OpenSsh {
    $firewallState = $null
    if (Test-Path $script:OpenSshFirewallStatePath -PathType Leaf) {
        try {
            $firewallState = Get-Content -Path $script:OpenSshFirewallStatePath -Raw | ConvertFrom-Json
            $ruleExisted = Get-ObjectPropertyValue -InputObject $firewallState -Name 'Existed'
            if ($ruleExisted -isnot [bool]) {
                throw "The 'Existed' value is missing or is not Boolean."
            }
            if ($ruleExisted) {
                foreach ($requiredProperty in @('DisplayName', 'Enabled', 'Action', 'Direction', 'Profile', 'Protocol', 'LocalPort')) {
                    if ([string]::IsNullOrWhiteSpace([string](Get-ObjectPropertyValue -InputObject $firewallState -Name $requiredProperty))) {
                        throw "The '$requiredProperty' value is missing."
                    }
                }
            }
        }
        catch {
            throw "The OpenSSH firewall state is invalid and was preserved before uninstalling OpenSSH: $($_.Exception.Message)"
        }
    }

    $openSshProducts = @(Get-OpenSshMsiProducts)
    $openSshDirectories = @(Get-OpenSshCandidateDirectories -Products $openSshProducts)

    foreach ($product in $openSshProducts) {
        $displayName = [string](Get-ObjectPropertyValue -InputObject $product -Name 'DisplayName')
        $productCode = [string](Get-ObjectPropertyValue -InputObject $product -Name 'PSChildName')
        if ($productCode -match '^\{[0-9A-Fa-f-]+\}$') {
            Write-Host ("[RUN] Removing Microsoft OpenSSH MSI product: {0}" -f $displayName)
            Invoke-NativeCommand -FilePath (Join-Path $env:SystemRoot 'System32\msiexec.exe') -ArgumentList @('/x', $productCode, '/qn', '/norestart') -SuccessExitCode @(0, 1605, 1641, 3010)
        }
    }

    foreach ($openSshDirectory in $openSshDirectories) {
        Remove-PathEntry -Path $openSshDirectory -Scope 'Machine'
    }
    if ($firewallState) {
        $firewallRule = Get-NetFirewallRule -Name 'OpenSSH-Server-In-TCP' -ErrorAction SilentlyContinue
        if ([bool]$firewallState.Existed) {
            if (-not $firewallRule) {
                $firewallRuleArguments = @{
                    Name = 'OpenSSH-Server-In-TCP'
                    DisplayName = [string]$firewallState.DisplayName
                    Enabled = [string]$firewallState.Enabled
                    Direction = [string]$firewallState.Direction
                    Protocol = [string]$firewallState.Protocol
                    Action = [string]$firewallState.Action
                    LocalPort = [string]$firewallState.LocalPort
                    Profile = [string]$firewallState.Profile
                }
                New-NetFirewallRule @firewallRuleArguments | Out-Null
            }
            else {
                Set-NetFirewallRule -Name 'OpenSSH-Server-In-TCP' -Enabled ([string]$firewallState.Enabled) -Action ([string]$firewallState.Action) -Direction ([string]$firewallState.Direction) -Profile ([string]$firewallState.Profile) -Protocol ([string]$firewallState.Protocol) -LocalPort ([string]$firewallState.LocalPort)
            }
            Write-Success 'The previous OpenSSH TCP/22 firewall rule state was restored.'
        }
        elseif ($firewallRule) {
            Remove-NetFirewallRule -Name 'OpenSSH-Server-In-TCP'
            Write-Success 'The SetupVibe-created OpenSSH TCP/22 firewall rule was removed.'
        }
        Remove-Item -Path $script:OpenSshFirewallStatePath -Force
    }
    elseif (Get-NetFirewallRule -Name 'OpenSSH-Server-In-TCP' -ErrorAction SilentlyContinue) {
        Write-WarningMessage 'OpenSSH firewall ownership state was not found. The existing TCP/22 rule was preserved to avoid removing a user-managed rule.'
    }
    Write-Success 'SetupVibe-managed Microsoft OpenSSH Client and Server MSI installation removed.'
}

function Install-WindowsSubsystemForLinux {
    $wslPath = Join-Path $env:SystemRoot 'System32\wsl.exe'
    $featureNames = @('Microsoft-Windows-Subsystem-Linux', 'VirtualMachinePlatform')
    $featureStates = @{}
    foreach ($featureName in $featureNames) {
        $featureStates[$featureName] = [string](Get-WindowsOptionalFeature -Online -FeatureName $featureName).State
    }
    if (-not (Test-Path $script:WslFeatureStatePath)) {
        $featureStates | ConvertTo-Json | Set-Content -Path $script:WslFeatureStatePath -Encoding ASCII
    }

    $hasPendingFeature = $featureStates.Values -contains 'EnablePending'
    $hasDisabledFeature = @($featureStates.Values | Where-Object { $_ -notin @('Enabled', 'EnablePending') }).Count -gt 0

    if ($hasDisabledFeature) {
        Invoke-NativeCommand -FilePath $wslPath -ArgumentList @('--install', '--no-distribution', '--web-download') -SuccessExitCode @(0, 3010)
        $script:RestartRequired = $true
        Write-Success 'WSL base installed without a Linux distribution. New distributions will use WSL 2 by default.'
        return
    }

    if ($hasPendingFeature) {
        $script:RestartRequired = $true
        Write-WarningMessage 'WSL features are waiting for a Windows restart. WSL 2 will be finalized after the restart.'
        return
    }

    Invoke-NativeCommand -FilePath $wslPath -ArgumentList @('--update', '--web-download')
    Invoke-NativeCommand -FilePath $wslPath -ArgumentList @('--set-default-version', '2')
    Write-Success 'WSL is up to date and WSL 2 is the default for future distributions.'
}

function Install-WslDevelopmentConfiguration {
    $configPath = Join-Path $env:USERPROFILE '.wslconfig'
    $backupPath = Join-Path $env:USERPROFILE '.wslconfig.setupvibe.bak'
    if ((Test-Path $configPath) -and -not (Test-Path $backupPath)) {
        Copy-Item -Path $configPath -Destination $backupPath -Force
    }

    $configContent = @(
        '# Managed by SetupVibe Windows'
        '[wsl2]'
        'networkingMode=mirrored'
        'dnsTunneling=true'
        'autoProxy=true'
        'firewall=true'
        'guiApplications=true'
        'nestedVirtualization=true'
        ''
        '[experimental]'
        'autoMemoryReclaim=gradual'
        'sparseVhd=true'
        'bestEffortDnsParsing=true'
        'hostAddressLoopback=true'
    )
    Set-Content -Path $configPath -Value $configContent -Encoding ASCII

    $firewallSetting = Get-NetFirewallHyperVVMSetting -Name $script:WslVmCreatorId -ErrorAction SilentlyContinue
    if (-not (Test-Path $script:WslFirewallStatePath)) {
        $previousInboundAction = if ($firewallSetting) { [string]$firewallSetting.DefaultInboundAction } else { 'NotConfigured' }
        Set-Content -Path $script:WslFirewallStatePath -Value $previousInboundAction -Encoding ASCII
    }
    if ($firewallSetting) {
        Set-NetFirewallHyperVVMSetting -Name $script:WslVmCreatorId -DefaultInboundAction Allow
    }
    else {
        New-NetFirewallHyperVVMSetting -Name $script:WslVmCreatorId -DefaultInboundAction Allow
    }

    Write-Success 'WSL mirrored networking, VPN/LAN access, DNS, proxy, firewall, memory reclaim, and sparse VHD settings configured.'
    Write-WarningMessage 'WSL inbound traffic is allowed for all ports. Restrict it with Hyper-V firewall rules if the machine is on an untrusted network.'
}

function Uninstall-WindowsSubsystemForLinux {
    $savedFeatureStates = @{}
    $savedFirewallAction = $null
    if (Test-Path $script:WslFirewallStatePath -PathType Leaf) {
        $savedFirewallAction = (Get-Content -Path $script:WslFirewallStatePath -Raw).Trim()
        if ($savedFirewallAction -notin @('Allow', 'Block', 'NotConfigured')) {
            throw "The saved WSL firewall action '$savedFirewallAction' is invalid and was preserved before changing WSL."
        }
    }
    if (Test-Path $script:WslFeatureStatePath -PathType Leaf) {
        try {
            $previousFeatureStates = Get-Content -Path $script:WslFeatureStatePath -Raw | ConvertFrom-Json
            foreach ($featureName in @('Microsoft-Windows-Subsystem-Linux', 'VirtualMachinePlatform')) {
                $savedProperty = $previousFeatureStates.PSObject.Properties[$featureName]
                if (-not $savedProperty) {
                    throw "The saved state for '$featureName' is missing."
                }
                $feature = Get-WindowsOptionalFeature -Online -FeatureName $featureName
                $previousState = [string]$savedProperty.Value
                if ($previousState -match '^\d+$') {
                    $previousState = [Enum]::GetName($feature.State.GetType(), [int]$previousState)
                }
                $knownFeatureStates = @([Enum]::GetNames($feature.State.GetType()))
                if ([string]::IsNullOrWhiteSpace($previousState) -or $knownFeatureStates -notcontains $previousState) {
                    throw "The saved state for '$featureName' is invalid."
                }
                $savedFeatureStates[$featureName] = $previousState
            }
        }
        catch {
            throw "The WSL feature state is invalid and was preserved before changing WSL: $($_.Exception.Message)"
        }
    }

    $wslPath = Join-Path $env:SystemRoot 'System32\wsl.exe'
    if (Test-Path $wslPath) {
        & $wslPath --shutdown 2>$null
    }

    $configPath = Join-Path $env:USERPROFILE '.wslconfig'
    $backupPath = Join-Path $env:USERPROFILE '.wslconfig.setupvibe.bak'
    if (Test-Path $backupPath) {
        Move-Item -Path $backupPath -Destination $configPath -Force
    }
    elseif ((Test-Path $configPath) -and (Select-String -Path $configPath -SimpleMatch '# Managed by SetupVibe Windows' -Quiet)) {
        Remove-Item -Path $configPath -Force -ErrorAction SilentlyContinue
    }

    $firewallSetting = Get-NetFirewallHyperVVMSetting -Name $script:WslVmCreatorId -ErrorAction SilentlyContinue
    if ($savedFirewallAction) {
        if ($firewallSetting) {
            Set-NetFirewallHyperVVMSetting -Name $script:WslVmCreatorId -DefaultInboundAction $savedFirewallAction
        }
        elseif ($savedFirewallAction -ne 'NotConfigured') {
            New-NetFirewallHyperVVMSetting -Name $script:WslVmCreatorId -DefaultInboundAction $savedFirewallAction
        }
    }
    Remove-Item -Path $script:WslFirewallStatePath -Force -ErrorAction SilentlyContinue

    if ($savedFeatureStates.Count -gt 0) {
        foreach ($featureName in @('Microsoft-Windows-Subsystem-Linux', 'VirtualMachinePlatform')) {
            $feature = Get-WindowsOptionalFeature -Online -FeatureName $featureName
            $previousState = [string]$savedFeatureStates[$featureName]
            if ($previousState -notin @('Enabled', 'EnablePending') -and $feature.State -in @('Enabled', 'EnablePending')) {
                $result = Disable-WindowsOptionalFeature -Online -FeatureName $featureName -NoRestart
                if ($result.RestartNeeded) {
                    $script:RestartRequired = $true
                }
            }
            elseif ($feature.State -eq 'DisablePending') {
                $script:RestartRequired = $true
            }
        }
        Remove-Item -Path $script:WslFeatureStatePath -Force
    }

    Write-Success 'The previous WSL feature state and firewall policy were restored, and the SetupVibe WSL configuration was removed. Existing Linux distributions were not deleted.'
}

function Find-WinGet {
    $command = Get-Command 'winget.exe' -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }

    $aliasPath = Join-Path $env:LOCALAPPDATA 'Microsoft\WindowsApps\winget.exe'
    if (Test-Path $aliasPath) {
        return $aliasPath
    }

    return $null
}

function Install-WinGet {
    $wingetPath = Find-WinGet
    if (-not $wingetPath) {
        Write-Host 'WinGet was not found. Installing it with Microsoft.WinGet.Client...'
        [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

        if (-not (Get-PackageProvider -Name NuGet -ListAvailable -ErrorAction SilentlyContinue)) {
            Install-PackageProvider -Name NuGet -Force -Scope AllUsers | Out-Null
        }

        Install-Module -Name Microsoft.WinGet.Client -Repository PSGallery -Scope AllUsers -Force -AllowClobber
        Import-Module Microsoft.WinGet.Client -Force
        Repair-WinGetPackageManager -AllUsers
        $wingetPath = Find-WinGet
    }

    if (-not $wingetPath) {
        throw 'WinGet installation completed, but winget.exe could not be found. Sign out and run the script again.'
    }

    Invoke-NativeCommand -FilePath $wingetPath -ArgumentList @('--version')
    $script:WinGetPath = $wingetPath
    Write-Success 'WinGet is installed and available.'
}

function Test-WinGetPackageInstalled {
    param([Parameter(Mandatory = $true)][string]$Id)

    $output = @(& $script:WinGetPath list --id $Id --exact --source winget --accept-source-agreements --disable-interactivity 2>$null)
    $exitCode = $LASTEXITCODE
    return $exitCode -eq 0 -and (($output -join "`n") -match [regex]::Escape($Id))
}

function Install-WinGetPackage {
    param(
        [Parameter(Mandatory = $true)][string]$Id,
        [Parameter(Mandatory = $true)][string]$Name
    )

    $commonArguments = @(
        '--id', $Id
        '--exact'
        '--source', 'winget'
        '--silent'
        '--accept-package-agreements'
        '--accept-source-agreements'
        '--disable-interactivity'
    )

    if (Test-WinGetPackageInstalled -Id $Id) {
        Write-Success ("{0} is already installed." -f $Name)
        return
    }

    Invoke-NativeCommand -FilePath $script:WinGetPath -ArgumentList (@('install') + $commonArguments) -SuccessExitCode @(0, 1641, 3010)
    Write-Success ("{0} installed." -f $Name)
}

function Uninstall-WinGetPackage {
    param(
        [Parameter(Mandatory = $true)][string]$Id,
        [Parameter(Mandatory = $true)][string]$Name
    )

    if (-not (Test-WinGetPackageInstalled -Id $Id)) {
        Write-Success ("{0} is already absent." -f $Name)
        return
    }

    $arguments = @(
        'uninstall'
        '--id', $Id
        '--exact'
        '--source', 'winget'
        '--silent'
        '--accept-source-agreements'
        '--disable-interactivity'
    )
    Invoke-NativeCommand -FilePath $script:WinGetPath -ArgumentList $arguments -SuccessExitCode @(0, 1641, 3010)
    Write-Success ("{0} removed." -f $Name)
}

function Test-GitHubCli {
    $ghPath = Find-Executable -Name 'gh.exe'
    Invoke-NativeCommand -FilePath $ghPath -ArgumentList @('--version')
    Write-Success 'GitHub CLI is available as gh in the Windows PATH.'
}

function Test-InstalledCommand {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$Command,
        [Parameter()][string[]]$Arguments = @('--version'),
        [Parameter()][string[]]$PreferredPaths = @()
    )

    Import-EnvironmentPath
    $resolvedCommand = Get-Command $Command -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $resolvedCommand) {
        foreach ($preferredPath in $PreferredPaths) {
            if (-not (Test-Path $preferredPath -PathType Leaf)) {
                continue
            }
            $preferredDirectory = Split-Path -Parent $preferredPath
            $pathWasPresent = Test-PathEntry -Path $preferredDirectory -Scope 'Machine'
            Register-PackagePath -Path $preferredDirectory -WasPresent $pathWasPresent
            Add-PathEntry -Path $preferredDirectory -Scope 'Machine' -Prepend
            Assert-CommandResolvesToPath -Name $Command -ExpectedPath $preferredPath
            $resolvedCommand = Get-Command $Command -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
            break
        }
    }
    if (-not $resolvedCommand) {
        throw "The package was installed, but '$Command' was not found in the refreshed Windows PATH."
    }
    $commandPath = $resolvedCommand.Source
    Invoke-NativeCommand -FilePath $commandPath -ArgumentList $Arguments
    Write-Success ("{0} is executable from the refreshed Windows PATH." -f $Name)
}

function Test-WindowsTerminal {
    Import-EnvironmentPath
    $terminalPackage = Get-AppxPackage -Name 'Microsoft.WindowsTerminal' -ErrorAction SilentlyContinue
    $terminalCommand = Get-Command 'wt.exe' -ErrorAction SilentlyContinue
    $terminalAliasPath = Join-Path $env:LOCALAPPDATA 'Microsoft\WindowsApps\wt.exe'

    if (-not $terminalPackage) {
        throw 'The Microsoft.WindowsTerminal AppX package was not found after WinGet installation.'
    }
    if (-not $terminalCommand -and -not (Test-Path $terminalAliasPath -PathType Leaf)) {
        throw 'Windows Terminal is installed, but its wt.exe app execution alias is unavailable.'
    }
    Write-Success 'Windows Terminal is installed and available as wt without changing its default profile.'
}

function Find-Chocolatey {
    $chocoCommand = Get-Command 'choco.exe' -ErrorAction SilentlyContinue
    if ($chocoCommand) {
        return $chocoCommand.Source
    }

    $defaultChocoPath = Join-Path $env:ProgramData 'chocolatey\bin\choco.exe'
    if (Test-Path $defaultChocoPath) {
        return $defaultChocoPath
    }

    return $null
}

function Install-Chocolatey {
    $chocoPath = Find-Chocolatey

    if (-not $chocoPath) {
        Write-Host 'Chocolatey was not found. Running the official bootstrap script...'
        Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
        [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
        $webClient = New-Object Net.WebClient
        $installerPath = Join-Path $env:TEMP 'SetupVibe-ChocolateyInstall.ps1'
        try {
            $webClient.DownloadFile('https://community.chocolatey.org/install.ps1', $installerPath)
            & $installerPath
        }
        finally {
            Remove-Item -Path $installerPath -Force -ErrorAction SilentlyContinue
            $webClient.Dispose()
        }

        $machinePath = [Environment]::GetEnvironmentVariable('Path', 'Machine')
        $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
        $env:Path = "${machinePath};${userPath}"
        $chocoCommand = Get-Command 'choco.exe' -ErrorAction SilentlyContinue
        if ($chocoCommand) {
            $chocoPath = $chocoCommand.Source
        }
    }

    if (-not $chocoPath) {
        throw 'Chocolatey installation completed, but choco.exe could not be found.'
    }

    Invoke-NativeCommand -FilePath $chocoPath -ArgumentList @('--version')
    $script:ChocolateyPath = $chocoPath
    Write-Success 'Chocolatey is installed and available.'
}

function Install-ChocolateyPackage {
    param(
        [Parameter(Mandatory = $true)][string]$Id,
        [Parameter(Mandatory = $true)][string]$Name
    )

    Invoke-NativeCommand -FilePath $script:ChocolateyPath -ArgumentList @('install', $Id, '--yes', '--no-progress') -SuccessExitCode @(0, 1641, 3010)
    Write-Success ("{0} is installed." -f $Name)
}

function Uninstall-ChocolateyPackage {
    param(
        [Parameter(Mandatory = $true)][string]$Id,
        [Parameter(Mandatory = $true)][string]$Name
    )

    Invoke-NativeCommand -FilePath $script:ChocolateyPath -ArgumentList @('uninstall', $Id, '--yes', '--no-progress') -SuccessExitCode @(0, 1605, 1614, 1641, 3010)
    Write-Success ("{0} is removed." -f $Name)
}

function Get-UserPowerShellProfilePaths {
    $documentsDirectory = [Environment]::GetFolderPath('MyDocuments')
    return @(
        (Join-Path $documentsDirectory 'WindowsPowerShell\profile.ps1')
        (Join-Path $documentsDirectory 'WindowsPowerShell\Microsoft.PowerShell_profile.ps1')
        (Join-Path $documentsDirectory 'PowerShell\profile.ps1')
        (Join-Path $documentsDirectory 'PowerShell\Microsoft.PowerShell_profile.ps1')
    )
}

function Invoke-WithUserPowerShellProfilesPreserved {
    param([Parameter(Mandatory = $true)][scriptblock]$Action)

    $profileStates = @{}
    foreach ($profilePath in Get-UserPowerShellProfilePaths) {
        $profileStates[$profilePath] = if (Test-Path $profilePath -PathType Leaf) {
            [Convert]::ToBase64String([IO.File]::ReadAllBytes($profilePath))
        }
        else {
            $null
        }
    }

    try {
        & $Action
    }
    finally {
        foreach ($profilePath in Get-UserPowerShellProfilePaths) {
            $profileContent = $profileStates[$profilePath]
            if ($null -eq $profileContent) {
                Remove-Item -Path $profilePath -Force -ErrorAction SilentlyContinue
                continue
            }

            $profileDirectory = Split-Path -Parent $profilePath
            New-Item -Path $profileDirectory -ItemType Directory -Force | Out-Null
            [IO.File]::WriteAllBytes($profilePath, [Convert]::FromBase64String($profileContent))
        }
    }
    Write-Success 'The original Windows PowerShell and PowerShell 7 profile files were preserved.'
}

function Get-TextFileEncodingInfo {
    param([Parameter(Mandatory = $true)][byte[]]$Bytes)

    if ($Bytes.Length -ge 4 -and $Bytes[0] -eq 0xFF -and $Bytes[1] -eq 0xFE -and $Bytes[2] -eq 0x00 -and $Bytes[3] -eq 0x00) {
        return [PSCustomObject]@{ Encoding = [Text.Encoding]::UTF32; PreambleLength = 4 }
    }
    if ($Bytes.Length -ge 4 -and $Bytes[0] -eq 0x00 -and $Bytes[1] -eq 0x00 -and $Bytes[2] -eq 0xFE -and $Bytes[3] -eq 0xFF) {
        return [PSCustomObject]@{ Encoding = [Text.Encoding]::GetEncoding(12001); PreambleLength = 4 }
    }
    if ($Bytes.Length -ge 3 -and $Bytes[0] -eq 0xEF -and $Bytes[1] -eq 0xBB -and $Bytes[2] -eq 0xBF) {
        return [PSCustomObject]@{ Encoding = (New-Object -TypeName Text.UTF8Encoding -ArgumentList @($true, $true)); PreambleLength = 3 }
    }
    if ($Bytes.Length -ge 2 -and $Bytes[0] -eq 0xFF -and $Bytes[1] -eq 0xFE) {
        return [PSCustomObject]@{ Encoding = [Text.Encoding]::Unicode; PreambleLength = 2 }
    }
    if ($Bytes.Length -ge 2 -and $Bytes[0] -eq 0xFE -and $Bytes[1] -eq 0xFF) {
        return [PSCustomObject]@{ Encoding = [Text.Encoding]::BigEndianUnicode; PreambleLength = 2 }
    }

    $utf8 = New-Object -TypeName Text.UTF8Encoding -ArgumentList @($false, $true)
    try {
        [void]$utf8.GetString($Bytes)
        return [PSCustomObject]@{ Encoding = $utf8; PreambleLength = 0 }
    }
    catch {
        return [PSCustomObject]@{ Encoding = [Text.Encoding]::Default; PreambleLength = 0 }
    }
}

function Uninstall-PowerShellProfile {
    $profilePaths = Get-UserPowerShellProfilePaths
    $profileMarker = '# SetupVibe shell initialization'
    $profileEndMarker = '# End SetupVibe shell initialization'
    $escapedProfileMarker = [regex]::Escape($profileMarker)
    $escapedProfileEndMarker = [regex]::Escape($profileEndMarker)
    $completeBlockPattern = '(?ms)^' + $escapedProfileMarker + '\r?$(?:\r\n|\n|\r).*?^' + $escapedProfileEndMarker + '\r?$(?:(?:\r\n|\n|\r)|$)'
    $legacyBlockPattern = '(?mi)^' + $escapedProfileMarker + '\r?$(?:\r\n|\n|\r)[^\r\n]*starship[^\r\n]*init powershell[^\r\n]*\r?$(?:\r\n|\n|\r)[^\r\n]*zoxide[^\r\n]*init powershell[^\r\n]*\r?$(?:(?:\r\n|\n|\r)|$)'

    foreach ($profilePath in $profilePaths) {
        if (-not (Test-Path $profilePath -PathType Leaf)) {
            continue
        }

        $originalBytes = [IO.File]::ReadAllBytes($profilePath)
        $encodingInfo = Get-TextFileEncodingInfo -Bytes $originalBytes
        $textLength = $originalBytes.Length - $encodingInfo.PreambleLength
        $profileText = $encodingInfo.Encoding.GetString($originalBytes, $encodingInfo.PreambleLength, $textLength)
        if ($profileText -notmatch ('(?m)^' + $escapedProfileMarker + '\r?$')) {
            continue
        }

        $updatedText = [regex]::Replace($profileText, $completeBlockPattern, '')
        if ($updatedText -eq $profileText) {
            $updatedText = [regex]::Replace($profileText, $legacyBlockPattern, '')
        }
        if ($updatedText -eq $profileText) {
            Write-WarningMessage ("A SetupVibe marker was found in {0}, but its legacy block was not recognized. The profile was preserved unchanged." -f $profilePath)
            continue
        }

        if ($updatedText.Length -eq 0) {
            Remove-Item -Path $profilePath -Force
        }
        else {
            $updatedBody = $encodingInfo.Encoding.GetBytes($updatedText)
            $updatedBytes = New-Object byte[] ($encodingInfo.PreambleLength + $updatedBody.Length)
            if ($encodingInfo.PreambleLength -gt 0) {
                [Buffer]::BlockCopy($originalBytes, 0, $updatedBytes, 0, $encodingInfo.PreambleLength)
            }
            [Buffer]::BlockCopy($updatedBody, 0, $updatedBytes, $encodingInfo.PreambleLength, $updatedBody.Length)
            [IO.File]::WriteAllBytes($profilePath, $updatedBytes)
        }
        Write-Success ("Legacy SetupVibe shell initialization removed without re-encoding the remaining profile: {0}" -f $profilePath)
    }

    Write-Success 'Recognized legacy SetupVibe profile blocks were removed; unrelated profile bytes and Starship configuration were preserved.'
}

function Uninstall-LegacyEcosystemTools {
    Import-EnvironmentPath
    $cleanupCommands = @(
        @{ Name = 'npm ecosystem packages'; Command = 'npm.cmd'; Arguments = @('uninstall', '--global') + $script:LegacyNpmPackages }
        @{ Name = 'Laravel Installer'; Command = 'composer'; Arguments = @('global', 'remove', 'laravel/installer', '--no-interaction') }
        @{ Name = 'Bundler and Rails'; Command = 'gem'; Arguments = @('uninstall', 'bundler', 'rails', '--all', '--executables', '--ignore-dependencies') }
        @{ Name = 'Spec-Kit'; Command = 'uv.exe'; Arguments = @('tool', 'uninstall', 'specify-cli') }
    )

    foreach ($cleanup in $cleanupCommands) {
        $command = Get-Command $cleanup.Command -ErrorAction SilentlyContinue
        if (-not $command) {
            continue
        }
        try {
            Invoke-NativeCommand -FilePath $command.Source -ArgumentList $cleanup.Arguments
            Write-Success ("Legacy {0} removed." -f $cleanup.Name)
        }
        catch {
            Write-WarningMessage ("Could not remove legacy {0}: {1}" -f $cleanup.Name, $_.Exception.Message)
        }
    }
}

function Remove-PathEntry {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][ValidateSet('User', 'Machine')][string]$Scope
    )

    $currentPath = [Environment]::GetEnvironmentVariable('Path', $Scope)
    $normalizedPath = ConvertTo-NormalizedPathEntry -Path $Path
    $remainingEntries = @($currentPath -split ';' | Where-Object {
        $_ -and (ConvertTo-NormalizedPathEntry -Path $_) -ne $normalizedPath
    })
    [Environment]::SetEnvironmentVariable('Path', ($remainingEntries -join ';'), $Scope)
    Send-EnvironmentChangeNotification
}

function Add-PathEntry {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][ValidateSet('User', 'Machine')][string]$Scope,
        [Parameter()][switch]$Prepend
    )

    $currentPath = [Environment]::GetEnvironmentVariable('Path', $Scope)
    $normalizedPath = ConvertTo-NormalizedPathEntry -Path $Path
    $existingEntries = @($currentPath -split ';' | Where-Object { $_ })
    $matchingEntries = @($existingEntries | Where-Object {
        (ConvertTo-NormalizedPathEntry -Path $_) -eq $normalizedPath
    })
    if ($matchingEntries.Count -gt 0 -and -not $Prepend) {
        $targetEntryAdded = $false
        $deduplicatedEntries = New-Object System.Collections.Generic.List[string]
        foreach ($existingEntry in $existingEntries) {
            if ((ConvertTo-NormalizedPathEntry -Path $existingEntry) -ne $normalizedPath) {
                $deduplicatedEntries.Add([string]$existingEntry)
            }
            elseif (-not $targetEntryAdded) {
                $targetEntryAdded = $true
                $deduplicatedEntries.Add([string]$existingEntry)
            }
        }
        $updatedPath = @($deduplicatedEntries)
    }
    else {
        $remainingEntries = @($existingEntries | Where-Object {
            (ConvertTo-NormalizedPathEntry -Path $_) -ne $normalizedPath
        })
        $updatedPath = if ($Prepend) { @($Path) + $remainingEntries } else { $remainingEntries + $Path }
    }
    [Environment]::SetEnvironmentVariable('Path', ($updatedPath -join ';'), $Scope)
    Send-EnvironmentChangeNotification
}

function Test-PathEntry {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][ValidateSet('User', 'Machine')][string]$Scope
    )

    $normalizedPath = ConvertTo-NormalizedPathEntry -Path $Path
    $currentPath = [Environment]::GetEnvironmentVariable('Path', $Scope)
    return @($currentPath -split ';' | Where-Object {
            $_ -and (ConvertTo-NormalizedPathEntry -Path $_) -eq $normalizedPath
        }).Count -gt 0
}

function Register-AiCliPath {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][bool]$WasPresent
    )

    $pathsAdded = @()
    if (Test-Path $script:AiCliPathStatePath -PathType Leaf) {
        try {
            $state = Get-Content -Path $script:AiCliPathStatePath -Raw | ConvertFrom-Json
            if ($state.PSObject.Properties['PathsAdded']) {
                $pathsAdded = @($state.PathsAdded)
            }
        }
        catch {
            throw "The AI CLI PATH state is invalid and was preserved to prevent ownership data loss: $($_.Exception.Message)"
        }
    }

    if (-not $WasPresent -and $pathsAdded -notcontains $Path) {
        $pathsAdded += $Path
    }
    @{ PathsAdded = @($pathsAdded) } | ConvertTo-Json | Set-Content -Path $script:AiCliPathStatePath -Encoding ASCII
}

function Register-PackagePath {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][bool]$WasPresent
    )

    $pathsAdded = @()
    if (Test-Path $script:PackagePathStatePath -PathType Leaf) {
        try {
            $state = Get-Content -Path $script:PackagePathStatePath -Raw | ConvertFrom-Json
            if ($state.PSObject.Properties['PathsAdded']) {
                $pathsAdded = @($state.PathsAdded)
            }
        }
        catch {
            throw "The package PATH state is invalid and was preserved to prevent ownership data loss: $($_.Exception.Message)"
        }
    }

    if (-not $WasPresent -and $pathsAdded -notcontains $Path) {
        $pathsAdded += $Path
    }
    @{ PathsAdded = @($pathsAdded) } | ConvertTo-Json | Set-Content -Path $script:PackagePathStatePath -Encoding ASCII
}

function Uninstall-PackagePaths {
    if (Test-Path $script:PackagePathStatePath -PathType Leaf) {
        try {
            $state = Get-Content -Path $script:PackagePathStatePath -Raw | ConvertFrom-Json
            foreach ($path in @($state.PathsAdded)) {
                if (-not [string]::IsNullOrWhiteSpace([string]$path)) {
                    Remove-PathEntry -Path ([string]$path) -Scope 'Machine'
                }
            }
        }
        catch {
            throw "The package PATH state is invalid and was preserved for manual recovery: $($_.Exception.Message)"
        }
    }
    Remove-Item -Path $script:PackagePathStatePath -Force -ErrorAction SilentlyContinue
    Import-EnvironmentPath
    Write-Success 'SetupVibe-managed package PATH entries were removed.'
}

function Uninstall-AiCliPaths {
    if (Test-Path $script:AiCliPathStatePath -PathType Leaf) {
        try {
            $state = Get-Content -Path $script:AiCliPathStatePath -Raw | ConvertFrom-Json
            foreach ($path in @($state.PathsAdded)) {
                if (-not [string]::IsNullOrWhiteSpace([string]$path)) {
                    Remove-PathEntry -Path ([string]$path) -Scope 'User'
                }
            }
        }
        catch {
            throw "The AI CLI PATH state is invalid and was preserved for manual recovery: $($_.Exception.Message)"
        }
    }
    Remove-Item -Path $script:AiCliPathStatePath -Force -ErrorAction SilentlyContinue
    Import-EnvironmentPath
    Write-Success 'SetupVibe-managed AI CLI user PATH entries were removed.'
}

function Assert-ValidAuthenticodeSignature {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Name
    )

    $signature = Get-AuthenticodeSignature -FilePath $Path
    if ($signature.Status -ne [System.Management.Automation.SignatureStatus]::Valid) {
        throw "$Name does not have a valid Authenticode signature. Status: $($signature.Status)."
    }
    Write-Success ("Valid Authenticode signature: {0}" -f $Name)
}

function Install-Python {
    $pythonArchitecture = 'amd64'
    $pythonDirectory = Join-Path (Get-NativeProgramFilesDirectory) 'Python314'
    $temporaryDirectory = Join-Path ([IO.Path]::GetTempPath()) ("SetupVibe-Python-{0}" -f $PID)
    $installerLogPath = Join-Path $script:LogDirectory ("python-installer-{0:yyyyMMdd-HHmmss}.log" -f (Get-Date))
    $repairLogPath = Join-Path $script:LogDirectory ("python-repair-{0:yyyyMMdd-HHmmss}.log" -f (Get-Date))

    New-Item -Path $temporaryDirectory -ItemType Directory -Force | Out-Null
    try {
        Write-Host '[RUN] Finding the latest official Python 3.14 standalone installer...'
        [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
        $pythonIndex = Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/' -UseBasicParsing
        $versions = @([regex]::Matches($pythonIndex.Content, 'href="(3\.14\.\d+)/"') | ForEach-Object {
                [version]$_.Groups[1].Value
            } | Sort-Object -Descending -Unique)
        if ($versions.Count -eq 0) {
            throw 'Python.org did not return an official Python 3.14 release.'
        }

        $pythonVersion = $versions[0].ToString()
        $installerName = "python-$pythonVersion-$pythonArchitecture.exe"
        $installerUrl = "https://www.python.org/ftp/python/$pythonVersion/$installerName"
        $installerPath = Join-Path $temporaryDirectory $installerName
        Write-Host ("[RUN] Downloading Python {0} from python.org..." -f $pythonVersion)
        Invoke-WebRequest -Uri $installerUrl -OutFile $installerPath -UseBasicParsing
        Assert-ValidAuthenticodeSignature -Path $installerPath -Name "Python $pythonVersion installer"

        Write-Host '[RUN] Installing Python for all users with pip and the Python launcher...'
        $pythonInstallerArguments = @(
            '/quiet'
            'InstallAllUsers=1'
            "TargetDir=$pythonDirectory"
            'PrependPath=1'
            'Include_exe=1'
            'Include_lib=1'
            'Include_pip=1'
            'Include_tools=1'
            'Include_launcher=1'
            'InstallLauncherAllUsers=1'
            'Include_test=0'
            '/log'
            $installerLogPath
        )
        Invoke-NativeCommand -FilePath $installerPath -ArgumentList $pythonInstallerArguments -SuccessExitCode @(0, 1641, 3010)

        $pythonPath = Join-Path $pythonDirectory 'python.exe'
        if (-not (Test-Path $pythonPath -PathType Leaf)) {
            Write-WarningMessage 'Python installer completed without python.exe. Forcing a repair of the x64 installation...'
            $repairArguments = @(
                '/repair'
                '/quiet'
                'InstallAllUsers=1'
                "TargetDir=$pythonDirectory"
                'PrependPath=1'
                'Include_exe=1'
                'Include_lib=1'
                'Include_pip=1'
                'Include_tools=1'
                'Include_launcher=1'
                'InstallLauncherAllUsers=1'
                'Include_test=0'
                '/log'
                $repairLogPath
            )
            Invoke-NativeCommand -FilePath $installerPath -ArgumentList $repairArguments -SuccessExitCode @(0, 1641, 3010)
        }
        if (-not (Test-Path $pythonPath -PathType Leaf)) {
            throw "Python installer completed, but python.exe was not found at $pythonPath. Review $installerLogPath and $repairLogPath."
        }

        $pipPath = Join-Path $pythonDirectory 'Scripts\pip.exe'
        if (-not (Test-Path $pipPath -PathType Leaf)) {
            Write-WarningMessage 'pip.exe was not created by the installer. Recovering pip through the bundled ensurepip module...'
            Invoke-NativeCommand -FilePath $pythonPath -ArgumentList @('-m', 'ensurepip', '--upgrade')
        }
        if (-not (Test-Path $pipPath -PathType Leaf)) {
            throw "Python was installed, but pip.exe was not found at $pipPath."
        }

        Invoke-NativeCommand -FilePath $pythonPath -ArgumentList @('--version')
        Invoke-NativeCommand -FilePath $pipPath -ArgumentList @('--version')
        Write-Success ("Python {0} installed from the official python.org installer." -f $pythonVersion)
    }
    finally {
        Remove-Item -Path $temporaryDirectory -Recurse -Force -ErrorAction SilentlyContinue
    }
}

function Get-NodeJsMsiProducts {
    return @(Get-ItemProperty -Path @(
                'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*'
                'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*'
            ) -ErrorAction SilentlyContinue | Where-Object {
            $displayName = [string](Get-ObjectPropertyValue -InputObject $_ -Name 'DisplayName')
            $displayName -match '^Node\.js'
        })
}

function Get-NodeJsCandidateDirectories {
    param([Parameter()][object[]]$Products = @())

    $candidateDirectories = @()
    foreach ($product in $Products) {
        $installLocation = [string](Get-ObjectPropertyValue -InputObject $product -Name 'InstallLocation')
        if (-not [string]::IsNullOrWhiteSpace($installLocation)) {
            $candidateDirectories += $installLocation.TrimEnd('\')
        }
    }
    $candidateDirectories += Join-Path (Get-NativeProgramFilesDirectory) 'nodejs'
    if (-not [string]::IsNullOrWhiteSpace($env:ProgramFiles)) {
        $candidateDirectories += Join-Path $env:ProgramFiles 'nodejs'
    }

    return @($candidateDirectories | Where-Object {
            -not [string]::IsNullOrWhiteSpace($_)
        } | Sort-Object -Unique)
}

function Find-NodeJsInstallDirectory {
    param([Parameter()][object[]]$Products = @())

    return @(Get-NodeJsCandidateDirectories -Products $Products | Where-Object {
            Test-Path (Join-Path $_ 'node.exe') -PathType Leaf
        } | Select-Object -First 1)
}

function Uninstall-NodeJs {
    $products = @(Get-NodeJsMsiProducts)
    if ($products.Count -eq 0) {
        Write-Success 'Node.js is already absent.'
        return
    }

    foreach ($product in $products) {
        $displayName = [string](Get-ObjectPropertyValue -InputObject $product -Name 'DisplayName')
        $productCode = [string](Get-ObjectPropertyValue -InputObject $product -Name 'PSChildName')
        if ($productCode -notmatch '^\{[0-9A-Fa-f-]+\}$') {
            continue
        }
        Write-Host ("[RUN] Removing Node.js MSI product: {0}" -f $displayName)
        Invoke-NativeCommand -FilePath (Join-Path $env:SystemRoot 'System32\msiexec.exe') -ArgumentList @('/x', $productCode, '/qn', '/norestart') -SuccessExitCode @(0, 1605, 1641, 3010)
    }
    Write-Success 'Node.js MSI installation removed.'
}

function Install-NodeJs {
    $temporaryDirectory = Join-Path ([IO.Path]::GetTempPath()) ("SetupVibe-NodeJS-{0}" -f $PID)
    $installerLogPath = Join-Path $script:LogDirectory ("nodejs-installer-{0:yyyyMMdd-HHmmss}.log" -f (Get-Date))
    $reconfigureLogPath = Join-Path $script:LogDirectory ("nodejs-reconfigure-{0:yyyyMMdd-HHmmss}.log" -f (Get-Date))
    $releaseUrl = 'https://nodejs.org/dist/latest-v24.x'
    $curlPath = Join-Path $env:SystemRoot 'System32\curl.exe'

    New-Item -Path $temporaryDirectory -ItemType Directory -Force | Out-Null
    try {
        if (-not (Test-Path $curlPath -PathType Leaf)) {
            throw "The Windows curl.exe executable was not found at $curlPath."
        }

        Write-Host '[RUN] Resolving Node.js 24 LTS from the official latest-v24.x channel...'
        $checksumsPath = Join-Path $temporaryDirectory 'SHASUMS256.txt'
        Invoke-NativeCommand -FilePath $curlPath -ArgumentList @(
            '--fail'
            '--location'
            '--retry', '3'
            '--connect-timeout', '30'
            '--proto', '=https'
            '--tlsv1.2'
            '--user-agent', ("SetupVibe-Windows/{0}" -f $script:Version)
            '--output', $checksumsPath
            "$releaseUrl/SHASUMS256.txt"
        )
        if (-not (Test-Path $checksumsPath -PathType Leaf) -or (Get-Item $checksumsPath).Length -eq 0) {
            throw 'The official Node.js SHASUMS256.txt file was empty or missing.'
        }

        $checksumLine = Get-Content -Path $checksumsPath | Where-Object {
            $_ -match '^[0-9a-fA-F]{64}\s{2}node-v24\.\d+\.\d+-x64\.msi$'
        } | Select-Object -First 1
        $checksumMatch = [regex]::Match([string]$checksumLine, '^([0-9a-fA-F]{64})\s{2}(node-(v24\.\d+\.\d+)-x64\.msi)$')
        if (-not $checksumMatch.Success) {
            throw 'The official Node.js 24 LTS checksum file does not contain an x64 MSI.'
        }

        $expectedChecksum = $checksumMatch.Groups[1].Value
        $installerName = $checksumMatch.Groups[2].Value
        $nodeVersion = $checksumMatch.Groups[3].Value
        $installerPath = Join-Path $temporaryDirectory $installerName
        Write-Host ("[RUN] Downloading Node.js {0} LTS from nodejs.org..." -f $nodeVersion)
        Invoke-NativeCommand -FilePath $curlPath -ArgumentList @(
            '--fail'
            '--location'
            '--retry', '3'
            '--connect-timeout', '30'
            '--proto', '=https'
            '--tlsv1.2'
            '--user-agent', ("SetupVibe-Windows/{0}" -f $script:Version)
            '--output', $installerPath
            "$releaseUrl/$installerName"
        )
        if (-not (Test-Path $installerPath -PathType Leaf) -or (Get-Item $installerPath).Length -eq 0) {
            throw "The official Node.js MSI was empty or missing: $installerName"
        }

        $actualChecksum = (Get-FileHash -Path $installerPath -Algorithm SHA256).Hash
        if ($actualChecksum -ne $expectedChecksum) {
            throw "Node.js MSI SHA-256 mismatch. Expected $expectedChecksum, received $actualChecksum."
        }
        Write-Success 'Node.js MSI matches the official SHASUMS256.txt checksum.'
        Assert-ValidAuthenticodeSignature -Path $installerPath -Name "Node.js $nodeVersion MSI"

        Write-Host '[RUN] Installing the official Node.js LTS MSI...'
        $nodeInstallExitCode = Invoke-MsiExec -ArgumentList @('/i', $installerPath, '/qn', '/norestart', '/L*v', $installerLogPath) -SuccessExitCode @(0, 1638, 1641, 3010)
        if ($nodeInstallExitCode -eq 1638) {
            Write-WarningMessage 'Another Node.js MSI version is installed. Removing it before the forced LTS installation.'
            Uninstall-NodeJs
            Invoke-MsiExec -ArgumentList @('/i', $installerPath, '/qn', '/norestart', '/L*v', $installerLogPath) -SuccessExitCode @(0, 1641, 3010) | Out-Null
        }

        $nodeProducts = @(Get-NodeJsMsiProducts)
        $nodeDirectory = @(Find-NodeJsInstallDirectory -Products $nodeProducts)
        $runtimeFilesMissing = $nodeDirectory.Count -eq 0
        if (-not $runtimeFilesMissing) {
            $requiredNodeFiles = @('node.exe', 'npm.cmd', 'npx.cmd')
            $runtimeFilesMissing = @($requiredNodeFiles | Where-Object {
                    -not (Test-Path (Join-Path $nodeDirectory[0] $_) -PathType Leaf)
                }).Count -gt 0
        }
        if ($runtimeFilesMissing) {
            Write-WarningMessage 'Node.js MSI completed without all Node.js, npm, and npx commands. Reconfiguring every MSI feature...'
            Invoke-MsiExec -ArgumentList @(
                '/i'
                $installerPath
                'ADDLOCAL=ALL'
                'REMOVE='
                'REINSTALL=ALL'
                'REINSTALLMODE=amus'
                '/qn'
                '/norestart'
                '/L*v'
                $reconfigureLogPath
            ) -SuccessExitCode @(0, 1641, 3010) | Out-Null
            $nodeProducts = @(Get-NodeJsMsiProducts)
            $nodeDirectory = @(Find-NodeJsInstallDirectory -Products $nodeProducts)
        }
        if ($nodeDirectory.Count -eq 0) {
            throw "Node.js MSI completed, but node.exe was not found. Review $installerLogPath and $reconfigureLogPath."
        }

        $nodePath = Join-Path $nodeDirectory[0] 'node.exe'
        $npmPath = Join-Path $nodeDirectory[0] 'npm.cmd'
        $npxPath = Join-Path $nodeDirectory[0] 'npx.cmd'
        foreach ($runtimeFile in @($nodePath, $npmPath, $npxPath)) {
            if (-not (Test-Path $runtimeFile -PathType Leaf)) {
                throw "Node.js MSI completed, but a required command was not found: $runtimeFile. Review $installerLogPath and $reconfigureLogPath."
            }
        }
        foreach ($powerShellShim in @('npm.ps1', 'npx.ps1')) {
            $powerShellShimPath = Join-Path $nodeDirectory[0] $powerShellShim
            if (Test-Path $powerShellShimPath -PathType Leaf) {
                Remove-Item -Path $powerShellShimPath -Force
            }
        }
        Invoke-NativeCommand -FilePath $nodePath -ArgumentList @('--version')
        Invoke-NativeCommand -FilePath $npmPath -ArgumentList @('--version')
        Invoke-NativeCommand -FilePath $npxPath -ArgumentList @('--version')
        Write-Success ("Node.js {0} installed from the official nodejs.org MSI." -f $nodeVersion)
    }
    finally {
        Remove-Item -Path $temporaryDirectory -Recurse -Force -ErrorAction SilentlyContinue
    }
}

function Uninstall-Python {
    $products = @(Get-ItemProperty -Path @(
                'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*'
                'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*'
                'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*'
            ) -ErrorAction SilentlyContinue | Where-Object {
            $displayName = [string](Get-ObjectPropertyValue -InputObject $_ -Name 'DisplayName')
            $displayName -match '^Python 3\.14\.\d+ \(64-bit\)$'
        })
    if ($products.Count -eq 0) {
        Write-Success 'Python 3.14 is already absent.'
        return
    }

    foreach ($product in $products) {
        $displayName = [string](Get-ObjectPropertyValue -InputObject $product -Name 'DisplayName')
        $quietUninstallProperty = $product.PSObject.Properties['QuietUninstallString']
        $uninstallProperty = $product.PSObject.Properties['UninstallString']
        $commandLine = if ($quietUninstallProperty) { [string]$quietUninstallProperty.Value } elseif ($uninstallProperty) { [string]$uninstallProperty.Value } else { $null }
        if ([string]::IsNullOrWhiteSpace($commandLine)) {
            Write-WarningMessage ("Python uninstaller command was not found for {0}." -f $displayName)
            continue
        }
        if ($commandLine -notmatch '^\s*"([^"]+)"\s*(.*)$') {
            throw "Python uninstaller command has an unsupported format: $commandLine"
        }

        $uninstallerPath = $matches[1]
        $uninstallerArguments = $matches[2]
        if ($uninstallerArguments -notmatch '(?i)/quiet') {
            $uninstallerArguments = "$uninstallerArguments /quiet"
        }
        Write-Host ("[RUN] Removing {0}..." -f $displayName)
        $process = Start-Process -FilePath $uninstallerPath -ArgumentList $uninstallerArguments -Wait -PassThru
        if ($process.ExitCode -notin @(0, 1641, 3010)) {
            throw "Python uninstaller failed with exit code $($process.ExitCode)."
        }
        if ($process.ExitCode -in @(1641, 3010)) {
            $script:RestartRequired = $true
        }
    }
    Write-Success 'Python 3.14 installation removed.'
}

function Find-RuntimeExecutable {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter()][string[]]$PreferredPaths = @()
    )

    $commandPaths = @(Get-Command $Name -All -ErrorAction SilentlyContinue | ForEach-Object { $_.Source })
    $candidates = @($PreferredPaths) + $commandPaths
    foreach ($candidate in $candidates) {
        if ([string]::IsNullOrWhiteSpace($candidate)) {
            continue
        }
        if ($candidate -like '*\Microsoft\WindowsApps\*') {
            continue
        }
        if (Test-Path $candidate -PathType Leaf) {
            return (Resolve-Path $candidate).Path
        }
    }

    throw "Required runtime executable '$Name' was not found after package installation."
}

function Install-DevelopmentRuntimePaths {
    Import-EnvironmentPath

    $nativeProgramFiles = Get-NativeProgramFilesDirectory
    $pythonPath = Find-RuntimeExecutable -Name 'python.exe' -PreferredPaths @(
        (Join-Path $nativeProgramFiles 'Python314\python.exe')
        (Join-Path $env:LOCALAPPDATA 'Programs\Python\Python314\python.exe')
    )
    $nodePath = Find-RuntimeExecutable -Name 'node.exe' -PreferredPaths @(
        (Join-Path $nativeProgramFiles 'nodejs\node.exe')
    )

    $pythonDirectory = Split-Path -Parent $pythonPath
    $pythonScriptsDirectory = Join-Path $pythonDirectory 'Scripts'
    $nodeDirectory = Split-Path -Parent $nodePath
    $pipPath = Join-Path $pythonScriptsDirectory 'pip.exe'
    $npmPath = Join-Path $nodeDirectory 'npm.cmd'
    $npxPath = Join-Path $nodeDirectory 'npx.cmd'

    foreach ($requiredFile in @($pipPath, $npmPath, $npxPath)) {
        if (-not (Test-Path $requiredFile -PathType Leaf)) {
            throw "Required runtime command was not found: $requiredFile"
        }
    }

    $runtimePaths = @($pythonDirectory, $pythonScriptsDirectory, $nodeDirectory)
    foreach ($runtimePath in $runtimePaths) {
        Remove-PathEntry -Path $runtimePath -Scope 'User'
        Add-PathEntry -Path $runtimePath -Scope 'Machine' -Prepend
    }
    @{ Paths = $runtimePaths } | ConvertTo-Json | Set-Content -Path $script:RuntimePathStatePath -Encoding ASCII
    Import-EnvironmentPath

    Invoke-NativeCommand -FilePath $pythonPath -ArgumentList @('--version')
    Invoke-NativeCommand -FilePath $pipPath -ArgumentList @('--version')
    Invoke-NativeCommand -FilePath $nodePath -ArgumentList @('--version')
    Invoke-NativeCommand -FilePath $npmPath -ArgumentList @('--version')
    Invoke-NativeCommand -FilePath $npxPath -ArgumentList @('--version')
    Assert-CommandResolvesToPath -Name 'python' -ExpectedPath $pythonPath
    Assert-CommandResolvesToPath -Name 'pip' -ExpectedPath $pipPath
    Assert-CommandResolvesToPath -Name 'node' -ExpectedPath $nodePath
    Assert-CommandResolvesToPath -Name 'npm' -ExpectedPath $npmPath
    Assert-CommandResolvesToPath -Name 'npx' -ExpectedPath $npxPath
    Write-Success 'Python, pip, Node.js, npm, and npx are available in the machine PATH for Claude and Codex.'
}

function Uninstall-DevelopmentRuntimePaths {
    $nativeProgramFiles = Get-NativeProgramFilesDirectory
    $runtimePaths = @(
        (Join-Path $nativeProgramFiles 'Python314')
        (Join-Path $nativeProgramFiles 'Python314\Scripts')
        (Join-Path $env:LOCALAPPDATA 'Programs\Python\Python314')
        (Join-Path $env:LOCALAPPDATA 'Programs\Python\Python314\Scripts')
        (Join-Path $nativeProgramFiles 'nodejs')
    )
    if (Test-Path $script:RuntimePathStatePath -PathType Leaf) {
        try {
            $state = Get-Content -Path $script:RuntimePathStatePath -Raw | ConvertFrom-Json
            $runtimePaths += @($state.Paths)
        }
        catch {
            throw "The runtime PATH state is invalid and was preserved to prevent unsafe PATH removal: $($_.Exception.Message)"
        }
    }

    foreach ($runtimePath in @($runtimePaths | Where-Object { $_ } | Select-Object -Unique)) {
        Remove-PathEntry -Path ([string]$runtimePath) -Scope 'Machine'
    }
    Remove-Item -Path $script:RuntimePathStatePath -Force -ErrorAction SilentlyContinue
    Import-EnvironmentPath
    Write-Success 'SetupVibe-managed Python and Node.js machine PATH entries were removed.'
}

function Invoke-OfficialPowerShellInstaller {
    param(
        [Parameter(Mandatory = $true)][string]$Uri,
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter()][string[]]$ScriptArguments = @()
    )

    $installerUri = [Uri]$Uri
    if ($installerUri.Scheme -ne 'https' -or $installerUri.Host -notin @('claude.ai', 'chatgpt.com', 'antigravity.google')) {
        throw "Unsupported official installer URL for ${Name}: $Uri"
    }

    $installerPath = Join-Path ([IO.Path]::GetTempPath()) ("SetupVibe-{0}-{1}.ps1" -f ($Name -replace '[^A-Za-z0-9]', ''), ([Guid]::NewGuid().ToString('N')))
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
        Write-Host ("[RUN] Downloading the official {0} installer from {1}..." -f $Name, $installerUri.Host)
        Invoke-WebRequest -Uri $installerUri.AbsoluteUri -OutFile $installerPath -UseBasicParsing
        if (-not (Test-Path $installerPath -PathType Leaf) -or (Get-Item $installerPath).Length -eq 0) {
            throw "The official $Name installer was empty or missing."
        }

        $windowsPowerShell = Get-NativeWindowsPowerShellPath
        $arguments = @('-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', $installerPath) + $ScriptArguments
        Invoke-NativeCommand -FilePath $windowsPowerShell -ArgumentList $arguments
    }
    finally {
        Remove-Item -Path $installerPath -Force -ErrorAction SilentlyContinue
    }
}

function Get-NpmCommandPath {
    return Find-RuntimeExecutable -Name 'npm.cmd' -PreferredPaths @(
        (Join-Path (Get-NativeProgramFilesDirectory) 'nodejs\npm.cmd')
    )
}

function Install-ClaudeCode {
    $npmPath = $null
    try {
        $npmPath = Get-NpmCommandPath
        try {
            Invoke-NativeCommand -FilePath $npmPath -ArgumentList @('uninstall', '--global', '@anthropic-ai/claude-code')
        }
        catch {
            Write-WarningMessage ("Could not remove a legacy npm Claude Code installation: {0}" -f $_.Exception.Message)
        }
    }
    catch {
        Write-WarningMessage 'npm is not available yet. Continuing with the independent native Claude Code installer.'
    }

    $claudeDirectory = Join-Path $env:USERPROFILE '.local\bin'
    $pathWasPresent = Test-PathEntry -Path $claudeDirectory -Scope 'User'
    $nativeInstallFailure = $null
    try {
        Invoke-WithUserPowerShellProfilesPreserved -Action {
            Invoke-OfficialPowerShellInstaller -Uri 'https://claude.ai/install.ps1' -Name 'Claude Code' -ScriptArguments @('latest')
        }
    }
    catch {
        $nativeInstallFailure = $_.Exception.Message
        Write-WarningMessage ("The recommended native Claude Code installer failed: {0}" -f $nativeInstallFailure)
    }

    $claudePath = $null
    $nativeClaudePath = Join-Path $claudeDirectory 'claude.exe'
    if (Test-Path $nativeClaudePath -PathType Leaf) {
        Add-PathEntry -Path $claudeDirectory -Scope 'User' -Prepend
        Register-AiCliPath -Path $claudeDirectory -WasPresent $pathWasPresent
        $claudePath = $nativeClaudePath
    }
    elseif ($npmPath) {
        Write-WarningMessage 'Falling back to the official Claude Code npm package, which installs the same native Windows binary.'
        Invoke-NativeCommand -FilePath $npmPath -ArgumentList @('install', '--global', '@anthropic-ai/claude-code@latest', '--no-audit', '--no-fund')
        $prefixOutput = @(& $npmPath 'config' 'get' 'prefix')
        if ($LASTEXITCODE -ne 0 -or $prefixOutput.Count -eq 0) {
            throw 'npm did not return its global prefix after installing Claude Code.'
        }
        $npmPrefix = ([string]$prefixOutput[0]).Trim()
        $npmPrefixWasPresent = Test-PathEntry -Path $npmPrefix -Scope 'User'
        Add-PathEntry -Path $npmPrefix -Scope 'User' -Prepend
        Register-AiCliPath -Path $npmPrefix -WasPresent $npmPrefixWasPresent
        Remove-Item -Path (Join-Path $npmPrefix 'claude.ps1') -Force -ErrorAction SilentlyContinue
        foreach ($candidate in @((Join-Path $npmPrefix 'claude.exe'), (Join-Path $npmPrefix 'claude.cmd'))) {
            if (Test-Path $candidate -PathType Leaf) {
                $claudePath = $candidate
                break
            }
        }
    }
    if (-not $claudePath) {
        throw "Claude Code was not installed by the native installer, and the npm fallback was unavailable. Native installer error: $nativeInstallFailure"
    }

    Import-EnvironmentPath
    Invoke-NativeCommand -FilePath $claudePath -ArgumentList @('--version')
    Assert-CommandResolvesToPath -Name 'claude' -ExpectedPath $claudePath
    Write-Success 'Claude Code is installed and available from the user PATH.'
}

function Install-CodexCli {
    try {
        $npmPath = Get-NpmCommandPath
        Invoke-NativeCommand -FilePath $npmPath -ArgumentList @('uninstall', '--global', '@openai/codex')
    }
    catch {
        Write-WarningMessage ("Could not remove a legacy npm Codex CLI installation: {0}" -f $_.Exception.Message)
    }

    $pathWasPresent = Test-PathEntry -Path $script:CodexInstallDirectory -Scope 'User'
    Invoke-WithUserPowerShellProfilesPreserved -Action {
        $previousNonInteractive = $env:CODEX_NON_INTERACTIVE
        $previousInstallDirectory = $env:CODEX_INSTALL_DIR
        try {
            $env:CODEX_NON_INTERACTIVE = '1'
            $env:CODEX_INSTALL_DIR = $script:CodexInstallDirectory
            Invoke-OfficialPowerShellInstaller -Uri 'https://chatgpt.com/codex/install.ps1' -Name 'Codex CLI'
        }
        finally {
            $env:CODEX_NON_INTERACTIVE = $previousNonInteractive
            $env:CODEX_INSTALL_DIR = $previousInstallDirectory
        }
    }
    Add-PathEntry -Path $script:CodexInstallDirectory -Scope 'User' -Prepend
    Register-AiCliPath -Path $script:CodexInstallDirectory -WasPresent $pathWasPresent
    Import-EnvironmentPath

    $codexPath = Join-Path $script:CodexInstallDirectory 'codex.exe'
    if (-not (Test-Path $codexPath -PathType Leaf)) {
        throw "The official Codex standalone installer completed, but codex.exe was not found at $codexPath."
    }
    Invoke-NativeCommand -FilePath $codexPath -ArgumentList @('--version')
    Assert-CommandResolvesToPath -Name 'codex' -ExpectedPath $codexPath
    Write-Success 'Codex CLI was installed with the official native Windows standalone installer and validated from the user PATH.'
}

function Install-SkillsCli {
    $npmPath = Get-NpmCommandPath
    Invoke-NativeCommand -FilePath $npmPath -ArgumentList @('install', '--global', 'skills@latest', '--no-audit', '--no-fund')

    $prefixOutput = @(& $npmPath 'config' 'get' 'prefix')
    if ($LASTEXITCODE -ne 0 -or $prefixOutput.Count -eq 0) {
        throw 'npm did not return its global prefix after installing Skills CLI.'
    }
    $npmPrefix = ([string]$prefixOutput[0]).Trim()
    if ([string]::IsNullOrWhiteSpace($npmPrefix)) {
        throw 'npm returned an empty global prefix after installing Skills CLI.'
    }

    $pathWasPresent = Test-PathEntry -Path $npmPrefix -Scope 'User'
    Add-PathEntry -Path $npmPrefix -Scope 'User' -Prepend
    Register-AiCliPath -Path $npmPrefix -WasPresent $pathWasPresent
    Remove-Item -Path (Join-Path $npmPrefix 'skills.ps1') -Force -ErrorAction SilentlyContinue
    Remove-Item -Path (Join-Path $npmPrefix 'add-skill.ps1') -Force -ErrorAction SilentlyContinue

    $skillsPath = Join-Path $npmPrefix 'skills.cmd'
    if (-not (Test-Path $skillsPath -PathType Leaf)) {
        throw "Skills CLI was installed, but its execution-policy-safe launcher was not found at $skillsPath."
    }
    Import-EnvironmentPath
    Invoke-NativeCommand -FilePath $skillsPath -ArgumentList @('--version')
    Assert-CommandResolvesToPath -Name 'skills' -ExpectedPath $skillsPath
    Write-Success 'Skills CLI is installed and available from the user PATH.'
}

function Install-AntigravityCli {
    $antigravityDirectory = Join-Path $env:LOCALAPPDATA 'agy\bin'
    $pathWasPresent = Test-PathEntry -Path $antigravityDirectory -Scope 'User'
    Invoke-WithUserPowerShellProfilesPreserved -Action {
        Invoke-OfficialPowerShellInstaller -Uri 'https://antigravity.google/cli/install.ps1' -Name 'Antigravity CLI' -ScriptArguments @('--skip-aliases', '--skip-path')
    }
    Add-PathEntry -Path $antigravityDirectory -Scope 'User' -Prepend
    Register-AiCliPath -Path $antigravityDirectory -WasPresent $pathWasPresent
    Import-EnvironmentPath

    $antigravityPath = Find-RuntimeExecutable -Name 'agy.exe' -PreferredPaths @(
        (Join-Path $antigravityDirectory 'agy.exe')
    )
    if ((Get-Item $antigravityPath).Length -eq 0) {
        throw "The official Antigravity CLI executable at $antigravityPath is empty."
    }
    Invoke-NativeCommand -FilePath $antigravityPath -ArgumentList @('--version')
    Assert-CommandResolvesToPath -Name 'agy' -ExpectedPath $antigravityPath
    Write-Success 'Antigravity CLI was installed as agy without modifying PowerShell profiles or aliases.'
}

function Uninstall-ClaudeCode {
    Remove-Item -Path (Join-Path $env:USERPROFILE '.local\bin\claude.exe') -Force -ErrorAction SilentlyContinue
    Remove-Item -Path (Join-Path $env:USERPROFILE '.local\share\claude') -Recurse -Force -ErrorAction SilentlyContinue

    $npmCommand = Get-Command 'npm.cmd' -ErrorAction SilentlyContinue
    if ($npmCommand) {
        try {
            Invoke-NativeCommand -FilePath $npmCommand.Source -ArgumentList @('uninstall', '--global', '@anthropic-ai/claude-code')
        }
        catch {
            Write-WarningMessage ("Could not remove a legacy npm Claude Code installation: {0}" -f $_.Exception.Message)
        }
    }
    Write-Success 'Claude Code native and legacy npm installations were removed; user configuration was preserved.'
}

function Uninstall-CodexCli {
    $npmCommand = Get-Command 'npm.cmd' -ErrorAction SilentlyContinue
    if ($npmCommand) {
        try {
            Invoke-NativeCommand -FilePath $npmCommand.Source -ArgumentList @('uninstall', '--global', '@openai/codex')
        }
        catch {
            Write-WarningMessage ("Could not remove a legacy npm Codex CLI installation: {0}" -f $_.Exception.Message)
        }
    }

    Remove-Item -Path $script:CodexInstallDirectory -Recurse -Force -ErrorAction SilentlyContinue
    $standalonePackageDirectory = Join-Path $env:USERPROFILE '.codex\packages\standalone'
    Remove-Item -Path $standalonePackageDirectory -Recurse -Force -ErrorAction SilentlyContinue
    Write-Success 'Codex CLI standalone files and legacy npm package were removed; Codex configuration, sessions, and credentials were preserved.'
}

function Uninstall-SkillsCli {
    $npmCommand = Get-Command 'npm.cmd' -ErrorAction SilentlyContinue
    if ($npmCommand) {
        Invoke-NativeCommand -FilePath $npmCommand.Source -ArgumentList @('uninstall', '--global', 'skills')
    }
    Write-Success 'Skills CLI was removed; installed agent skills were preserved.'
}

function Install-OpenCodeCli {
    $npmPath = Get-NpmCommandPath
    Invoke-NativeCommand -FilePath $npmPath -ArgumentList @('install', '--global', 'opencode-ai@latest', '--no-audit', '--no-fund')

    $prefixOutput = @(& $npmPath 'config' 'get' 'prefix')
    if ($LASTEXITCODE -ne 0 -or $prefixOutput.Count -eq 0) {
        throw 'npm did not return its global prefix after installing OpenCode CLI.'
    }
    $npmPrefix = ([string]$prefixOutput[0]).Trim()
    if ([string]::IsNullOrWhiteSpace($npmPrefix)) {
        throw 'npm returned an empty global prefix after installing OpenCode CLI.'
    }

    $pathWasPresent = Test-PathEntry -Path $npmPrefix -Scope 'User'
    Add-PathEntry -Path $npmPrefix -Scope 'User' -Prepend
    Register-AiCliPath -Path $npmPrefix -WasPresent $pathWasPresent
    Remove-Item -Path (Join-Path $npmPrefix 'opencode.ps1') -Force -ErrorAction SilentlyContinue

    $opencodePath = Join-Path $npmPrefix 'opencode.cmd'
    if (-not (Test-Path $opencodePath -PathType Leaf)) {
        $opencodePath = Join-Path $npmPrefix 'opencode.exe'
    }
    if (-not (Test-Path $opencodePath -PathType Leaf)) {
        throw "OpenCode CLI was installed, but its execution-policy-safe launcher was not found at $opencodePath."
    }
    Import-EnvironmentPath
    Invoke-NativeCommand -FilePath $opencodePath -ArgumentList @('--version')
    Assert-CommandResolvesToPath -Name 'opencode' -ExpectedPath $opencodePath
    Write-Success 'OpenCode CLI is installed and available from the user PATH.'
}

function Uninstall-OpenCodeCli {
    $npmCommand = Get-Command 'npm.cmd' -ErrorAction SilentlyContinue
    if ($npmCommand) {
        Invoke-NativeCommand -FilePath $npmCommand.Source -ArgumentList @('uninstall', '--global', 'opencode-ai')
    }
    Write-Success 'OpenCode CLI was removed; user configuration was preserved.'
}

function Uninstall-AntigravityCli {
    $antigravityDirectory = Join-Path $env:LOCALAPPDATA 'agy\bin'
    Remove-Item -Path (Join-Path $antigravityDirectory 'agy.exe') -Force -ErrorAction SilentlyContinue
    if ((Test-Path $antigravityDirectory) -and -not (Get-ChildItem -Path $antigravityDirectory -Force | Select-Object -First 1)) {
        Remove-Item -Path $antigravityDirectory -Force
    }
    Write-Success 'Antigravity CLI was removed; user credentials and configuration were preserved.'
}

function Install-WindowsUtilities {
    New-Item -Path $script:WindowsUtilitiesDirectory -ItemType Directory -Force | Out-Null
    $installedFiles = New-Object System.Collections.Generic.List[string]
    $failedUtilities = New-Object System.Collections.Generic.List[string]
    $previousManagedFiles = @()
    if (Test-Path $script:WindowsUtilitiesStatePath -PathType Leaf) {
        try {
            $previousState = Get-Content -Path $script:WindowsUtilitiesStatePath -Raw | ConvertFrom-Json
            $previousManagedFiles = @($previousState.Files)
        }
        catch {
            Write-WarningMessage ("Could not read the previous Windows utility state: {0}" -f $_.Exception.Message)
        }
    }

    foreach ($utility in $script:WindowsUtilities) {
        $sourcePath = if ($PSScriptRoot) { Join-Path $PSScriptRoot $utility.Path } else { $null }
        $destinationPath = Join-Path $script:WindowsUtilitiesDirectory $utility.Name
        $temporaryPath = "{0}.{1}.tmp" -f $destinationPath, ([Guid]::NewGuid().ToString('N'))

        Write-Host ("[RUN] Installing Windows utility: {0}" -f $utility.Name)
        try {
            if ($sourcePath -and (Test-Path $sourcePath -PathType Leaf)) {
                Copy-Item -Path $sourcePath -Destination $temporaryPath -Force
            }
            else {
                [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
                $downloadUrl = "https://raw.githubusercontent.com/promovaweb/setupvibe/windows/{0}" -f $utility.Path
                $webClient = New-Object Net.WebClient
                try {
                    $webClient.DownloadFile($downloadUrl, $temporaryPath)
                }
                finally {
                    $webClient.Dispose()
                }
            }

            if (-not (Test-Path $temporaryPath -PathType Leaf) -or (Get-Item $temporaryPath).Length -eq 0) {
                throw "The downloaded utility '$($utility.Name)' is empty or missing."
            }
            Move-Item -Path $temporaryPath -Destination $destinationPath -Force
            $installedFiles.Add([string]$utility.Name)
            Write-Success ("Windows utility installed: {0}" -f $utility.Name)
        }
        catch {
            if (Test-Path $destinationPath -PathType Leaf) {
                $installedFiles.Add([string]$utility.Name)
            }
            $failedUtilities.Add(("{0}: {1}" -f $utility.Name, $_.Exception.Message))
            Write-WarningMessage ("Could not install Windows utility {0}: {1}" -f $utility.Name, $_.Exception.Message)
        }
        finally {
            Remove-Item -Path $temporaryPath -Force -ErrorAction SilentlyContinue
        }
    }

    foreach ($previousManagedFile in $previousManagedFiles) {
        $previousFileName = [IO.Path]::GetFileName([string]$previousManagedFile)
        if (-not [string]::IsNullOrWhiteSpace($previousFileName) -and $previousFileName -eq [string]$previousManagedFile -and $installedFiles -notcontains $previousFileName) {
            Remove-Item -Path (Join-Path $script:WindowsUtilitiesDirectory $previousFileName) -Force -ErrorAction SilentlyContinue
        }
    }
    foreach ($legacyFileName in $script:LegacyWindowsUtilityFiles) {
        Remove-Item -Path (Join-Path $script:WindowsUtilitiesDirectory $legacyFileName) -Force -ErrorAction SilentlyContinue
    }

    $state = @{ Files = @($installedFiles) }
    $state | ConvertTo-Json | Set-Content -Path $script:WindowsUtilitiesStatePath -Encoding ASCII
    Add-PathEntry -Path $script:WindowsUtilitiesDirectory -Scope 'User' -Prepend
    Assert-CommandResolvesToPath -Name 'ssh_copy_id' -ExpectedPath (Join-Path $script:WindowsUtilitiesDirectory 'ssh_copy_id.cmd')

    if ($failedUtilities.Count -gt 0) {
        throw "One or more Windows utilities failed to install: $($failedUtilities -join '; ')"
    }
    Write-Success ("Windows utilities are available from {0}. Open a new terminal to use them globally." -f $script:WindowsUtilitiesDirectory)
}

function Uninstall-WindowsUtilities {
    $managedFiles = @($script:WindowsUtilities | ForEach-Object { $_.Name })
    if (Test-Path $script:WindowsUtilitiesStatePath -PathType Leaf) {
        try {
            $state = Get-Content -Path $script:WindowsUtilitiesStatePath -Raw | ConvertFrom-Json
            $managedFiles = @($state.Files)
        }
        catch {
            Write-WarningMessage ("Could not read the Windows utility state file; using the current managed list: {0}" -f $_.Exception.Message)
        }
    }

    foreach ($managedFile in $managedFiles) {
        $fileName = [IO.Path]::GetFileName([string]$managedFile)
        if ([string]::IsNullOrWhiteSpace($fileName) -or $fileName -ne [string]$managedFile) {
            Write-WarningMessage ("Ignored an invalid managed utility file name: {0}" -f $managedFile)
            continue
        }
        Remove-Item -Path (Join-Path $script:WindowsUtilitiesDirectory $fileName) -Force -ErrorAction SilentlyContinue
    }
    foreach ($legacyFileName in $script:LegacyWindowsUtilityFiles) {
        Remove-Item -Path (Join-Path $script:WindowsUtilitiesDirectory $legacyFileName) -Force -ErrorAction SilentlyContinue
    }

    Remove-Item -Path $script:WindowsUtilitiesStatePath -Force -ErrorAction SilentlyContinue
    if ((Test-Path $script:WindowsUtilitiesDirectory) -and -not (Get-ChildItem -Path $script:WindowsUtilitiesDirectory -Force | Select-Object -First 1)) {
        Remove-Item -Path $script:WindowsUtilitiesDirectory -Force
    }
    if ((Test-Path $script:SetupVibeUserDirectory) -and -not (Get-ChildItem -Path $script:SetupVibeUserDirectory -Force | Select-Object -First 1)) {
        Remove-Item -Path $script:SetupVibeUserDirectory -Force
    }

    Remove-PathEntry -Path $script:WindowsUtilitiesDirectory -Scope 'User'
    Import-EnvironmentPath
    Write-Success 'SetupVibe-managed Windows utilities and their user PATH entry were removed.'
}

function Remove-StaleLegacyToolchainPaths {
    $legacyUserPaths = @(
        (Join-Path $env:USERPROFILE '.cargo\bin')
        (Join-Path $env:USERPROFILE '.local\bin')
        (Join-Path $env:APPDATA 'npm')
        (Join-Path $env:APPDATA 'Composer\vendor\bin')
    )
    foreach ($legacyPath in $legacyUserPaths) {
        if (Test-Path $legacyPath) {
            Write-Success ("Preserved active user-managed PATH directory: {0}" -f $legacyPath)
        }
        else {
            Remove-PathEntry -Path $legacyPath -Scope 'User'
        }
    }

    $legacyBinDirectory = Join-Path $env:ProgramData 'SetupVibe\bin'
    Remove-PathEntry -Path $legacyBinDirectory -Scope 'Machine'
    Remove-Item -Path $legacyBinDirectory -Recurse -Force -ErrorAction SilentlyContinue
    Import-EnvironmentPath
    Write-Success 'Missing legacy toolchain directories were removed from PATH; existing user-managed directories were preserved.'
}

if ($env:OS -ne 'Windows_NT') {
    throw 'This installer can only run on Windows.'
}

$currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
$currentUserSid = $currentIdentity.User.Value
if (-not [string]::IsNullOrWhiteSpace($ExpectedUserSid) -and $ExpectedUserSid -ne $currentUserSid) {
    throw "SetupVibe elevation changed from user SID '$ExpectedUserSid' to '$currentUserSid'. Sign in with an account that is a member of the local Administrators group and run SetupVibe again. Using credentials for a different administrator would install user-scoped tools in the wrong Windows profile."
}
$script:InvokerUserSid = $currentUserSid

$currentVersion = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion'
$currentBuild = [int]$currentVersion.CurrentBuildNumber
if ([string]$currentVersion.ProductName -match 'Server') {
    throw 'SetupVibe Windows Desktop does not support Windows Server. Use the Linux Server Edition instead.'
}
if (-not $Uninstall -and $currentBuild -lt 22621) {
    throw 'SetupVibe Windows requires Windows 11 version 22H2 (build 22621) or later.'
}
$nativeArchitecture = if ($env:PROCESSOR_ARCHITEW6432) { $env:PROCESSOR_ARCHITEW6432 } else { $env:PROCESSOR_ARCHITECTURE }
if ($nativeArchitecture -ne 'AMD64') {
    throw "SetupVibe Windows requires an x64 (AMD64) edition of Windows. Detected architecture: $nativeArchitecture."
}
if (-not [Environment]::Is64BitProcess) {
    Request-64BitPowerShell
}

if (-not (Test-Administrator)) {
    Request-Elevation
}

Import-EnvironmentPath

New-Item -Path $script:LogDirectory -ItemType Directory -Force | Out-Null
$logPath = Join-Path $script:LogDirectory ("desktop-{0:yyyyMMdd-HHmmss}.log" -f (Get-Date))
try {
    Start-Transcript -Path $logPath -Force | Out-Null
    $script:TranscriptStarted = $true
}
catch {
    Write-WarningMessage ("Could not start the transcript log: {0}" -f $_.Exception.Message)
}

Write-Host ("SetupVibe Windows Desktop (Beta) v{0}" -f $script:Version) -ForegroundColor Magenta
Write-Host ("Windows build: {0}" -f $currentBuild)

Invoke-SetupStep -Name 'Windows servicing and installer readiness' -Action {
    Invoke-WindowsInstallerPreflight -RequireWindowsUpdate:(-not $Uninstall)
}
Stop-SetupIfFailed -LogPath $logPath

if ($Uninstall) {
    Write-Section 'Uninstall mode'
    Write-Host 'Removing all utilities and configurations managed by SetupVibe Windows.'

    Invoke-SetupStep -Name 'Legacy SetupVibe PowerShell profile blocks' -Action { Uninstall-PowerShellProfile }
    Invoke-SetupStep -Name 'Claude Code' -Action { Uninstall-ClaudeCode }
    Invoke-SetupStep -Name 'Codex CLI' -Action { Uninstall-CodexCli }
    Invoke-SetupStep -Name 'Skills CLI' -Action { Uninstall-SkillsCli }
    Invoke-SetupStep -Name 'OpenCode CLI' -Action { Uninstall-OpenCodeCli }
    Invoke-SetupStep -Name 'Antigravity CLI' -Action { Uninstall-AntigravityCli }
    Invoke-SetupStep -Name 'AI CLI PATH entries' -Action { Uninstall-AiCliPaths }
    Invoke-SetupStep -Name 'Legacy ecosystem tools' -Action { Uninstall-LegacyEcosystemTools }
    Invoke-SetupStep -Name 'Node.js 24 LTS official MSI' -Action { Uninstall-NodeJs }
    Invoke-SetupStep -Name 'Python 3.14 official installer' -Action { Uninstall-Python }
    Invoke-SetupStep -Name 'Python and Node.js machine PATH' -Action { Uninstall-DevelopmentRuntimePaths }
    Invoke-SetupStep -Name 'Windows package PATH entries' -Action { Uninstall-PackagePaths }

    $script:WinGetPath = Find-WinGet
    if ($script:WinGetPath) {
        $packagesToRemove = @($script:WinGetPackages) + @($script:LegacyWinGetPackages)
        foreach ($package in $packagesToRemove) {
            Invoke-SetupStep -Name ("Remove WinGet: {0}" -f $package.Name) -Action {
                Uninstall-WinGetPackage -Id $package.Id -Name $package.Name
            }
        }
    }
    else {
        Write-WarningMessage 'WinGet was not found; WinGet-managed packages could not be checked.'
    }

    $script:ChocolateyPath = Find-Chocolatey
    if ($script:ChocolateyPath) {
        foreach ($package in $script:ChocolateyPackages) {
            Invoke-SetupStep -Name ("Remove Chocolatey: {0}" -f $package.Name) -Action {
                Uninstall-ChocolateyPackage -Id $package.Id -Name $package.Name
            }
        }
    }
    else {
        Write-WarningMessage 'Chocolatey was not found; Chocolatey-managed packages could not be checked.'
    }

    Invoke-SetupStep -Name 'OpenSSH Client and Server' -Action { Uninstall-OpenSsh }
    Invoke-SetupStep -Name 'SetupVibe Windows utilities' -Action { Uninstall-WindowsUtilities }
    if ($currentBuild -ge 22621) {
        Invoke-SetupStep -Name 'Windows Subsystem for Linux' -Action { Uninstall-WindowsSubsystemForLinux }
    }
    Invoke-SetupStep -Name 'Stale legacy toolchain PATH entries' -Action { Remove-StaleLegacyToolchainPaths }
}
else {
    Invoke-SetupStep -Name 'OpenSSH Client and Server' -Action { Install-OpenSsh }
    Invoke-SetupStep -Name 'SetupVibe Windows utilities' -Action { Install-WindowsUtilities }
    Invoke-SetupStep -Name 'Windows Subsystem for Linux base' -Action { Install-WindowsSubsystemForLinux }
    Invoke-SetupStep -Name 'WSL development networking and optimization' -Action { Install-WslDevelopmentConfiguration }
    Invoke-SetupStep -Name 'WinGet' -Action { Install-WinGet }
    Invoke-SetupStep -Name 'Chocolatey' -Action { Install-Chocolatey }
    Invoke-SetupStep -Name 'Python 3.14 official installer' -Action { Install-Python }
    Invoke-SetupStep -Name 'Node.js 24 LTS official MSI' -Action { Install-NodeJs }

    if ($script:WinGetPath) {
        foreach ($package in $script:WinGetPackages) {
            Invoke-SetupStep -Name ("WinGet: {0}" -f $package.Name) -Action {
                Install-WinGetPackage -Id $package.Id -Name $package.Name
            }
        }
        foreach ($commandCheck in $script:WinGetCommandChecks) {
            Invoke-SetupStep -Name ("Validate command: {0}" -f $commandCheck.Name) -Action {
                $preferredPaths = Get-ObjectPropertyValue -InputObject $commandCheck -Name 'PreferredPaths'
                if ($null -eq $preferredPaths) {
                    $preferredPaths = @()
                }
                Test-InstalledCommand -Name $commandCheck.Name -Command $commandCheck.Command -Arguments $commandCheck.Arguments -PreferredPaths @($preferredPaths)
            }
        }
        Invoke-SetupStep -Name 'GitHub CLI command (gh)' -Action { Test-GitHubCli }
        Invoke-SetupStep -Name 'Windows Terminal command (wt)' -Action { Test-WindowsTerminal }
    }
    Invoke-SetupStep -Name 'Python and Node.js PATH for Claude and Codex' -Action { Install-DevelopmentRuntimePaths }
    Invoke-SetupStep -Name 'Skills CLI' -Action { Install-SkillsCli }
    Invoke-SetupStep -Name 'OpenCode CLI' -Action { Install-OpenCodeCli }
    Invoke-SetupStep -Name 'Claude Code native CLI' -Action { Install-ClaudeCode }
    Invoke-SetupStep -Name 'Codex CLI' -Action { Install-CodexCli }
    Invoke-SetupStep -Name 'Antigravity CLI (agy)' -Action { Install-AntigravityCli }

    if ($script:ChocolateyPath) {
        foreach ($package in $script:ChocolateyPackages) {
            Invoke-SetupStep -Name ("Chocolatey: {0}" -f $package.Name) -Action {
                Install-ChocolateyPackage -Id $package.Id -Name $package.Name
            }
        }
        foreach ($commandCheck in $script:ChocolateyCommandChecks) {
            Invoke-SetupStep -Name ("Validate command: {0}" -f $commandCheck.Name) -Action {
                Test-InstalledCommand -Name $commandCheck.Name -Command $commandCheck.Command -Arguments $commandCheck.Arguments
            }
        }
    }

    Import-EnvironmentPath
    Invoke-SetupStep -Name 'Original Windows PowerShell profile' -Action {
        Uninstall-PowerShellProfile
        Write-Success 'SetupVibe does not add Starship, zoxide initialization, ZSH, or PowerShell profile content on Windows.'
    }
}

Stop-SetupIfFailed -LogPath $logPath
Write-Section 'Summary'
if ($Uninstall) {
    Write-Success 'SetupVibe-managed Windows utilities and configurations were removed.'
}
else {
    Write-Success 'The native Windows utility environment with Python, Node.js, Claude Code, Codex CLI, and Antigravity CLI is configured.'
}

if ($script:RestartRequired) {
    if ($Restart) {
        Write-WarningMessage 'Restarting Windows now...'
        if ($script:TranscriptStarted) {
            Stop-Transcript | Out-Null
            $script:TranscriptStarted = $false
        }
        Restart-Computer -Force
    }
    else {
        Write-WarningMessage 'Restart Windows to finish applying the requested components.'
    }
}
else {
    Write-Success 'No restart was requested by Windows.'
}

Write-Host ("Log: {0}" -f $logPath)
if ($script:TranscriptStarted) {
    Stop-Transcript | Out-Null
}
