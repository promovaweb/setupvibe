# SetupVibe 2 one-line installer for Windows.
#
#   irm https://raw.githubusercontent.com/promovaweb/setupvibe/v2/install.ps1 | iex
#   & ([scriptblock]::Create((irm https://raw.githubusercontent.com/promovaweb/setupvibe/v2/install.ps1))) auto
#
# Reads the current version from version.json on the v2 branch, downloads
# setupvibe-windows-x64.exe from the GitHub Release, verifies it against the
# release SHA256SUMS and installs it to %LOCALAPPDATA%\Programs\SetupVibe,
# added to the user PATH. Remaining arguments go to the installed binary.
#
# Environment: SETUPVIBE_CHANNEL (stable|beta), SETUPVIBE_INSTALL_DRY_RUN=1.
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$RawBase = 'https://raw.githubusercontent.com/promovaweb/setupvibe/v2'
$ReleasesBase = 'https://github.com/promovaweb/setupvibe/releases/download'
$Channel = if ($env:SETUPVIBE_CHANNEL) { $env:SETUPVIBE_CHANNEL } else { 'stable' }

$arch = if ($env:PROCESSOR_ARCHITEW6432) { $env:PROCESSOR_ARCHITEW6432 } else { $env:PROCESSOR_ARCHITECTURE }
if ($arch -ne 'AMD64') {
  Write-Error "SetupVibe supports Windows x64 only (found $arch)."
  exit 11
}

$manifest = Invoke-RestMethod -Uri "$RawBase/version.json" -UseBasicParsing
$version = $manifest.channels.$Channel.version
if (-not $version) {
  Write-Error "Could not read the $Channel version from $RawBase/version.json."
  exit 5
}

$asset = 'setupvibe-windows-x64.exe'
$url = "$ReleasesBase/v$version/$asset"
$sumsUrl = "$ReleasesBase/v$version/SHA256SUMS"
$dir = Join-Path $env:LOCALAPPDATA 'Programs\SetupVibe'
$target = Join-Path $dir 'setupvibe.exe'

if ($env:SETUPVIBE_INSTALL_DRY_RUN -eq '1') {
  "version=$version"; "binary=$url"; "checksums=$sumsUrl"; "install=$target"
  exit 0
}

$tmp = Join-Path ([IO.Path]::GetTempPath()) ([Guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $tmp | Out-Null
try {
  Write-Host "Downloading setupvibe $version for windows-x64..."
  Invoke-WebRequest -Uri $url -OutFile (Join-Path $tmp $asset) -UseBasicParsing
  $sums = (Invoke-WebRequest -Uri $sumsUrl -UseBasicParsing).Content
  $line = ($sums -split "`n") | Where-Object { $_ -match "^([0-9a-fA-F]{64})\s+\*?(\./)?$([regex]::Escape($asset))\s*$" } | Select-Object -First 1
  if (-not $line) { throw "$asset is not listed in SHA256SUMS." }
  $expected = ($line -split '\s+')[0].ToLower()
  $actual = (Get-FileHash -Algorithm SHA256 (Join-Path $tmp $asset)).Hash.ToLower()
  if ($actual -ne $expected) { throw "Checksum mismatch for $asset (expected $expected, got $actual)." }

  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  Move-Item -Force (Join-Path $tmp $asset) $target

  $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
  if (($userPath -split ';') -notcontains $dir) {
    [Environment]::SetEnvironmentVariable('Path', (@($dir) + ($userPath -split ';' | Where-Object { $_ })) -join ';', 'User')
    $env:Path = "$dir;$env:Path"
  }
  Write-Host "Installed $target ($version)."
} finally {
  Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
}

if ($args.Count -gt 0) {
  & $target @args
  exit $LASTEXITCODE
}
