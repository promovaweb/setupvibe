#Requires -Version 5.1

[CmdletBinding()]
param(
    [Parameter(Position = 0)][string]$Remote,
    [Parameter()][ValidateRange(1, 65535)][int]$Port = 22,
    [Parameter()][string]$IdentityFile,
    [Parameter()][switch]$NoConnect
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Assert-OpenSshClientAvailable {
    $sshCommand = Get-Command 'ssh.exe' -ErrorAction SilentlyContinue
    $sshKeygenCommand = Get-Command 'ssh-keygen.exe' -ErrorAction SilentlyContinue
    if ($sshCommand -and $sshKeygenCommand) {
        return
    }

    throw 'OpenSSH Client and ssh-keygen are required. Run SetupVibe Windows to install the signed Win32-OpenSSH MSI, then open a new terminal and try again.'
}

function Get-KeyFingerprint {
    param([Parameter(Mandatory = $true)][string]$Path)

    $fingerprintOutput = @(& $script:SshKeygenPath -l -E sha256 -f $Path 2>$null)
    if ($LASTEXITCODE -ne 0 -or $fingerprintOutput.Count -eq 0) {
        return $null
    }

    $fingerprintMatch = [regex]::Match(($fingerprintOutput -join "`n"), '^\d+\s+(SHA256:\S+)')
    if (-not $fingerprintMatch.Success) {
        return $null
    }
    return $fingerprintMatch.Groups[1].Value
}

function Get-PrivateKeyFingerprint {
    param([Parameter(Mandatory = $true)][string]$Path)

    $keyDirectory = Split-Path -Parent $Path
    $temporaryKeyPath = Join-Path $keyDirectory (".setupvibe_key_check_{0}" -f ([Guid]::NewGuid().ToString('N')))
    try {
        Copy-Item -Path $Path -Destination $temporaryKeyPath -ErrorAction Stop
        return (Get-KeyFingerprint -Path $temporaryKeyPath)
    }
    finally {
        Remove-Item -Path $temporaryKeyPath -Force -ErrorAction SilentlyContinue
    }
}

function Get-KeyPair {
    param(
        [Parameter(Mandatory = $true)][string]$PublicKeyPath,
        [Parameter(Mandatory = $true)][string]$PrivateKeyPath
    )

    if (-not (Test-Path $PublicKeyPath -PathType Leaf) -or -not (Test-Path $PrivateKeyPath -PathType Leaf)) {
        return $null
    }

    $publicFingerprint = Get-KeyFingerprint -Path $PublicKeyPath
    $privateFingerprint = Get-PrivateKeyFingerprint -Path $PrivateKeyPath
    if (-not $publicFingerprint -or -not $privateFingerprint -or $publicFingerprint -ne $privateFingerprint) {
        return $null
    }

    return [PSCustomObject]@{
        PublicKeyPath = $PublicKeyPath
        PrivateKeyPath = $PrivateKeyPath
        Fingerprint = $publicFingerprint
    }
}

function Find-KeyPair {
    param([Parameter(Mandatory = $true)][string]$SshDirectory)

    $preferredNames = @('id_ed25519.pub', 'id_ecdsa.pub', 'id_rsa.pub')
    foreach ($name in $preferredNames) {
        $publicKeyPath = Join-Path $SshDirectory $name
        $privateKeyPath = $publicKeyPath.Substring(0, $publicKeyPath.Length - 4)
        $keyPair = Get-KeyPair -PublicKeyPath $publicKeyPath -PrivateKeyPath $privateKeyPath
        if ($keyPair) {
            return $keyPair
        }
    }

    $otherKeys = @(Get-ChildItem -Path $SshDirectory -Filter '*.pub' -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -notlike '*-cert.pub' } | Sort-Object Name)
    foreach ($publicKey in $otherKeys) {
        $privateKeyPath = $publicKey.FullName.Substring(0, $publicKey.FullName.Length - 4)
        $keyPair = Get-KeyPair -PublicKeyPath $publicKey.FullName -PrivateKeyPath $privateKeyPath
        if ($keyPair) {
            return $keyPair
        }
    }
    return $null
}

function Restore-PublicKey {
    param([Parameter(Mandatory = $true)][string]$PrivateKeyPath)

    if (-not (Test-Path $PrivateKeyPath -PathType Leaf)) {
        return $null
    }

    $publicKeyPath = "${PrivateKeyPath}.pub"
    if (Test-Path $publicKeyPath) {
        return $null
    }

    Write-Host ("Rebuilding the public key for {0}..." -f (Split-Path -Leaf $PrivateKeyPath))
    try {
        & $script:SshKeygenPath -y -f $PrivateKeyPath | Set-Content -Path $publicKeyPath -Encoding ASCII
        if ($LASTEXITCODE -eq 0) {
            return (Get-KeyPair -PublicKeyPath $publicKeyPath -PrivateKeyPath $PrivateKeyPath)
        }
    }
    finally {
        if ((Test-Path $publicKeyPath) -and -not (Get-KeyPair -PublicKeyPath $publicKeyPath -PrivateKeyPath $PrivateKeyPath)) {
            Remove-Item -Path $publicKeyPath -Force -ErrorAction SilentlyContinue
        }
    }
    return $null
}

function Restore-DefaultKeyPair {
    param([Parameter(Mandatory = $true)][string]$SshDirectory)

    foreach ($name in @('id_ed25519', 'id_ecdsa', 'id_rsa')) {
        $keyPair = Restore-PublicKey -PrivateKeyPath (Join-Path $SshDirectory $name)
        if ($keyPair) {
            return $keyPair
        }
    }
    return $null
}

function New-DefaultSshKeyPair {
    param([Parameter(Mandatory = $true)][string]$SshDirectory)

    $privateKeyPath = $null
    foreach ($name in @('id_ed25519', 'id_ed25519_setupvibe')) {
        $candidate = Join-Path $SshDirectory $name
        if (-not (Test-Path $candidate) -and -not (Test-Path "${candidate}.pub")) {
            $privateKeyPath = $candidate
            break
        }
    }
    if (-not $privateKeyPath) {
        do {
            $candidate = Join-Path $SshDirectory ("id_ed25519_setupvibe_{0}" -f ([Guid]::NewGuid().ToString('N').Substring(0, 8)))
        } while ((Test-Path $candidate) -or (Test-Path "${candidate}.pub"))
        $privateKeyPath = $candidate
    }

    Write-Host 'No valid SSH key was found. Creating a passphrase-free Ed25519 key...' -ForegroundColor Yellow
    $arguments = @('-q', '-t', 'ed25519', '-f', ('"{0}"' -f $privateKeyPath), '-N', '""')
    $process = Start-Process -FilePath $script:SshKeygenPath -ArgumentList $arguments -NoNewWindow -Wait -PassThru
    if ($process.ExitCode -ne 0) {
        throw 'The Ed25519 SSH key could not be created.'
    }

    $publicKeyPath = "${privateKeyPath}.pub"
    $keyPair = Get-KeyPair -PublicKeyPath $publicKeyPath -PrivateKeyPath $privateKeyPath
    if (-not $keyPair) {
        throw "The generated public key is invalid: $publicKeyPath"
    }
    return $keyPair
}

function Resolve-RequestedKeyPair {
    param([Parameter(Mandatory = $true)][string]$Path)

    $resolvedPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($Path)
    if ($resolvedPath.EndsWith('.pub', [StringComparison]::OrdinalIgnoreCase)) {
        $publicKeyPath = $resolvedPath
        $privateKeyPath = $resolvedPath.Substring(0, $resolvedPath.Length - 4)
    }
    else {
        $privateKeyPath = $resolvedPath
        $publicKeyPath = "${resolvedPath}.pub"
        if (-not (Test-Path $publicKeyPath)) {
            $restoredKeyPair = Restore-PublicKey -PrivateKeyPath $privateKeyPath
            if ($restoredKeyPair) {
                return $restoredKeyPair
            }
        }
    }

    $keyPair = Get-KeyPair -PublicKeyPath $publicKeyPath -PrivateKeyPath $privateKeyPath
    if (-not $keyPair) {
        throw "The requested identity is not a valid matching public/private key pair: $Path"
    }
    return $keyPair
}

function Test-RemoteTarget {
    param([Parameter(Mandatory = $true)][string]$Value)

    return $Value -match '^[A-Za-z0-9][A-Za-z0-9._-]*@(?:[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?|\[[0-9A-Fa-f:%.]+\])$'
}

try {
    Assert-OpenSshClientAvailable
    $script:SshPath = (Get-Command 'ssh.exe' -ErrorAction Stop).Source
    $script:SshKeygenPath = (Get-Command 'ssh-keygen.exe' -ErrorAction Stop).Source

    $sshDirectory = Join-Path $env:USERPROFILE '.ssh'
    New-Item -Path $sshDirectory -ItemType Directory -Force | Out-Null

    if ([string]::IsNullOrWhiteSpace($IdentityFile)) {
        $keyPair = Find-KeyPair -SshDirectory $sshDirectory
        if (-not $keyPair) {
            $keyPair = Restore-DefaultKeyPair -SshDirectory $sshDirectory
        }
        if (-not $keyPair) {
            $keyPair = New-DefaultSshKeyPair -SshDirectory $sshDirectory
        }
    }
    else {
        $keyPair = Resolve-RequestedKeyPair -Path $IdentityFile
    }
    Write-Host ("Selected SSH key: {0} ({1})" -f (Split-Path -Leaf $keyPair.PublicKeyPath), $keyPair.Fingerprint) -ForegroundColor Green

    if ([string]::IsNullOrWhiteSpace($Remote)) {
        $Remote = Read-Host 'Enter the remote server as user@address'
    }
    if (-not (Test-RemoteTarget -Value $Remote)) {
        throw "Invalid SSH target: '$Remote'. Use the user@address format."
    }

    Write-Host ("Copying the key to {0} on port {1}. The server password may be requested..." -f $Remote, $Port)
    $publicKeyLines = @(Get-Content -Path $keyPair.PublicKeyPath | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    if ($publicKeyLines.Count -ne 1) {
        throw "The selected public key must contain exactly one non-empty line: $($keyPair.PublicKeyPath)"
    }
    $remoteCommand = 'umask 077; key_file="$HOME/.ssh/.setupvibe_key.$$"; mkdir -p "$HOME/.ssh" && touch "$HOME/.ssh/authorized_keys" && chmod 700 "$HOME/.ssh" && chmod 600 "$HOME/.ssh/authorized_keys" && trap ''rm -f "$key_file"'' 0 1 2 15 && tr -d ''\r'' > "$key_file" && { grep -qxF -f "$key_file" "$HOME/.ssh/authorized_keys" || cat "$key_file" >> "$HOME/.ssh/authorized_keys"; } && grep -qxF -f "$key_file" "$HOME/.ssh/authorized_keys"'
    $publicKeyLines[0] | & $script:SshPath -p $Port -o 'StrictHostKeyChecking=accept-new' $Remote $remoteCommand
    if ($LASTEXITCODE -ne 0) {
        throw "The SSH key could not be copied to $Remote."
    }

    $identityArguments = @(
        '-p', $Port,
        '-i', $keyPair.PrivateKeyPath,
        '-o', 'StrictHostKeyChecking=accept-new',
        '-o', 'IdentitiesOnly=yes',
        '-o', 'PreferredAuthentications=publickey',
        '-o', 'PubkeyAuthentication=yes',
        '-o', 'PasswordAuthentication=no',
        '-o', 'KbdInteractiveAuthentication=no',
        '-o', 'NumberOfPasswordPrompts=0'
    )
    Write-Host 'Verifying public-key authentication without a server-password fallback...'
    & $script:SshPath @identityArguments $Remote 'true'
    if ($LASTEXITCODE -ne 0) {
        throw "The server received the key but did not accept the matching private key. Check the remote SSH public-key policy, home-directory ownership, and authorized_keys permissions."
    }
    Write-Host ("The key was installed and public-key authentication succeeded for {0}." -f $Remote) -ForegroundColor Green

    if (-not $NoConnect) {
        Write-Host 'Opening the SSH session with the verified identity...'
        & $script:SshPath @identityArguments $Remote
        if ($LASTEXITCODE -ne 0) {
            throw "Public-key authentication succeeded, but the interactive connection to $Remote ended with an error."
        }
    }
}
catch {
    Write-Error $_.Exception.Message
    throw
}
