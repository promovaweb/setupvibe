#!/bin/sh
# SetupVibe 2 one-line installer for macOS and Linux.
#
#   curl -fsSL https://raw.githubusercontent.com/promovaweb/setupvibe/v2/install.sh | sh
#   curl -fsSL https://raw.githubusercontent.com/promovaweb/setupvibe/v2/install.sh | sh -s -- server auto --user deploy
#   curl -fsSL .../install.sh | sh -s -- --edition server auto --manager
#
# Reads the current version from version.json on the v2 branch, downloads the
# binary for this system from the GitHub Release, verifies it against the
# release SHA256SUMS and installs it to ~/.local/bin (or /usr/local/bin as
# root). Any remaining arguments are passed to the installed binary.
#
# Environment: SETUPVIBE_EDITION (desktop|server|omarchy), SETUPVIBE_CHANNEL
# (stable|beta), SETUPVIBE_INSTALL_DIR, SETUPVIBE_INSTALL_DRY_RUN=1 (print the
# URLs and exit).
set -eu

RAW_BASE="https://raw.githubusercontent.com/promovaweb/setupvibe/v2"
RELEASES_BASE="https://github.com/promovaweb/setupvibe/releases/download"

edition="${SETUPVIBE_EDITION:-}"
channel="${SETUPVIBE_CHANNEL:-stable}"

if [ "${1:-}" = "--edition" ]; then
  edition="${2:-}"
  shift 2 || { echo "setupvibe: --edition needs desktop, server or omarchy" >&2; exit 2; }
fi

bin="setupvibe"
case "$edition" in
  "" | desktop | server | omarchy) ;;
  *) echo "setupvibe: unknown edition '$edition' (use desktop, server or omarchy)" >&2; exit 2 ;;
esac

case "$(uname -s)" in
  Linux) os="linux" ;;
  Darwin) os="darwin" ;;
  *) echo "setupvibe: unsupported operating system $(uname -s); on Windows use install.ps1" >&2; exit 11 ;;
esac
if { [ "$edition" = "server" ] || [ "$edition" = "omarchy" ]; } && [ "$os" != "linux" ]; then
  echo "setupvibe: the $edition edition runs on Linux only" >&2
  exit 11
fi

case "$(uname -m)" in
  x86_64 | amd64) arch="x64" ;;
  aarch64 | arm64) arch="arm64" ;;
  *) echo "setupvibe: unsupported architecture $(uname -m)" >&2; exit 11 ;;
esac

if [ "$(id -u)" = "0" ]; then
  default_dir="/usr/local/bin"
else
  default_dir="$HOME/.local/bin"
fi
install_dir="${SETUPVIBE_INSTALL_DIR:-$default_dir}"

fetch() {
  curl --proto '=https' --tlsv1.2 -fsSL --retry 3 --connect-timeout 10 "$@"
}

version=$(fetch "$RAW_BASE/version.json" | tr -d '\n' | sed -n "s/.*\"$channel\"[^{]*{[^}]*\"version\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p")
if [ -z "$version" ]; then
  echo "setupvibe: could not read the $channel version from $RAW_BASE/version.json" >&2
  exit 5
fi

asset="$bin-$os-$arch"
url="$RELEASES_BASE/v$version/$asset"
sums="$RELEASES_BASE/v$version/SHA256SUMS"

if [ "${SETUPVIBE_INSTALL_DRY_RUN:-}" = "1" ]; then
  printf 'version=%s\nbinary=%s\nchecksums=%s\ninstall=%s/%s\n' "$version" "$url" "$sums" "$install_dir" "$bin"
  exit 0
fi

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT INT TERM

echo "Downloading $bin $version for $os-$arch..." >&2
fetch -o "$tmp/$asset" "$url"
fetch -o "$tmp/SHA256SUMS" "$sums"

# Releases built by CI carry a keyless Sigstore signature of SHA256SUMS. When
# cosign is installed, the signature must match the v2 release workflow.
if command -v cosign >/dev/null 2>&1 && fetch -o "$tmp/SHA256SUMS.sigstore.json" "$sums.sigstore.json" 2>/dev/null; then
  if ! cosign verify-blob --bundle "$tmp/SHA256SUMS.sigstore.json" \
    --certificate-identity-regexp '^https://github.com/promovaweb/setupvibe/\.github/workflows/v2\.yml@refs/tags/v2\.' \
    --certificate-oidc-issuer https://token.actions.githubusercontent.com \
    "$tmp/SHA256SUMS" >/dev/null 2>&1; then
    echo "setupvibe: the Sigstore signature of SHA256SUMS does not match the SetupVibe release workflow" >&2
    exit 1
  fi
  echo "Signature of SHA256SUMS verified with cosign." >&2
fi

expected=$(sed -n "s/^\([0-9a-fA-F]\{64\}\)[[:space:]]\{1,\}\*\{0,1\}\(\.\/\)\{0,1\}$asset\$/\1/p" "$tmp/SHA256SUMS")
if [ -z "$expected" ]; then
  echo "setupvibe: $asset is not listed in SHA256SUMS" >&2
  exit 1
fi
if command -v sha256sum >/dev/null 2>&1; then
  actual=$(sha256sum "$tmp/$asset" | cut -d' ' -f1)
else
  actual=$(shasum -a 256 "$tmp/$asset" | cut -d' ' -f1)
fi
if [ "$actual" != "$expected" ]; then
  echo "setupvibe: checksum mismatch for $asset (expected $expected, got $actual)" >&2
  exit 1
fi

mkdir -p "$install_dir"
chmod 0755 "$tmp/$asset"
mv "$tmp/$asset" "$install_dir/$bin"
if [ "$edition" = "server" ]; then
  link="$install_dir/setupvibe-server"
  if [ -d "$link" ]; then
    echo "setupvibe: cannot create $link because it is a directory" >&2
    exit 1
  fi
  ln -sfn "$bin" "$link"
fi
if [ "$os" = "darwin" ]; then
  xattr -d com.apple.quarantine "$install_dir/$bin" 2>/dev/null || true
fi
echo "Installed $install_dir/$bin ($version)." >&2

case ":$PATH:" in
  *":$install_dir:"*) ;;
  *) echo "Add $install_dir to PATH, or run $install_dir/$bin directly." >&2 ;;
esac

if [ "$#" -gt 0 ]; then
  case "$1" in
    desktop | server | omarchy) ;;
    *) if [ -n "$edition" ]; then set -- "$edition" "$@"; fi ;;
  esac
  exec "$install_dir/$bin" "$@"
fi
