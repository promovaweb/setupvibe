#!/bin/bash

set -o pipefail


# ==============================================================================
# SETUPVIBE.DEV - DESKTOP DEVELOPER EDITION (V2.3 - Cross Platform)
# ==============================================================================
# Maintainer:    promovaweb.com
# Contact:       contato@promovaweb.com
# Contributing:  https://github.com/promovaweb/setupvibe/blob/main/CONTRIBUTING.md
# ------------------------------------------------------------------------------
# Compatibility: macOS 12+, Zorin OS 18+, Ubuntu 24.04+, Debian 12+
# Architectures: x86_64 (amd64) & ARM64 (aarch64/arm64)
# ==============================================================================


# --- COLORS & STYLE ---
BOLD='\033[1m'
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color


# --- VERSION ---
VERSION="0.41.11"
PHP_VERSION="8.5"
RUBY_VERSION="3.4.10"
PYTHON_VERSION="3.14"
GO_VERSION="1.26.5"
NERD_FONTS_VERSION="3.4.0"
CTOP_VERSION="0.7.7"
CTOP_SHA256_AMD64="b78374734ebe3d14b6edee3d5512c911c250d7fa7f3f964cb00acd3bc5a02a09"
CTOP_SHA256_ARM64="d8d91e0fea53a8c78fa81192f078272e5a92f0ea6c4f0e38ec7c944d76e6f02f"

echo -e "${CYAN}SetupVibe Desktop v${VERSION}${NC}"
echo ""

# --- ENVIRONMENT ---
export COMPOSER_ALLOW_SUPERUSER=1

# --- HELPERS ---

die() {
    echo -e "${RED}Error: $*${NC}" >&2
    exit 1
}

# Run as real user (handles both running as root and running as user)
user_do() {
    if [[ "$(id -u)" -eq 0 && -n "$REAL_USER" && "$REAL_USER" != "root" ]]; then
        sudo -u "$REAL_USER" -H "$@"
    else
        "$@"
    fi
}

# Run with elevated privileges (only use sudo if not already root)
sys_do() {
    if [[ "$(id -u)" -ne 0 ]]; then
        if [[ "$(uname -s)" == "Linux" ]]; then
            sudo env DEBIAN_FRONTEND="${DEBIAN_FRONTEND:-noninteractive}" "$@"
        else
            sudo "$@"
        fi
    else
        "$@"
    fi
}

path_prepend_once() {
    local directory=$1

    case ":$PATH:" in
        *":$directory:"*) ;;
        *) PATH="$directory:$PATH" ;;
    esac
}

path_deduplicate() {
    local entry
    local normalized=""
    local -a entries

    IFS=: read -r -a entries <<< "$PATH"
    for entry in "${entries[@]}"; do
        [[ -z "$entry" ]] && continue
        case ":$normalized:" in
            *":$entry:"*) ;;
            *) normalized="${normalized:+$normalized:}$entry" ;;
        esac
    done
    PATH="$normalized"
}

resolve_brew_prefix() {
    local candidate
    local -a candidates=("$BREW_PREFIX")

    if $IS_LINUX; then
        candidates=(
            "/home/linuxbrew/.linuxbrew"
            "$REAL_HOME/.linuxbrew"
        )
    fi

    for candidate in "${candidates[@]}"; do
        if [[ -x "$candidate/bin/brew" ]]; then
            BREW_PREFIX="$candidate"
            path_prepend_once "$BREW_PREFIX/sbin"
            path_prepend_once "$BREW_PREFIX/bin"
            path_deduplicate
            export PATH
            return 0
        fi
    done

    return 1
}

# Run Homebrew as the real user and isolate stdin from curl-piped installs.
brew_cmd() {
    if ! resolve_brew_prefix; then
        echo "Error: Homebrew executable not found in a supported prefix." >&2
        return 127
    fi

    if [[ "$(id -u)" -eq 0 && -n "$REAL_USER" && "$REAL_USER" != "root" ]]; then
        ( cd "$REAL_HOME" && runuser -u "$REAL_USER" -- env HOME="$REAL_HOME" "$BREW_PREFIX/bin/brew" "$@" < /dev/null )
    else
        "$BREW_PREFIX/bin/brew" "$@" < /dev/null
    fi
}

# Ensure cron is active and has example tasks
cron_ensure() {
    echo "Ensuring cron service is active and configured..."
    if [[ "$(uname -s)" == "Linux" ]]; then
        sys_do systemctl enable --now cron 2>/dev/null || true
    fi

    # Add example tasks to crontab if they don't exist
    # 1. A simple heartbeat to /tmp/cron-heartbeat.log every hour
    # 2. A disk usage snapshot to ~/cron-disk-usage.log every day at midnight
    
    local CRON_HEARTBEAT="0 * * * * echo \"Cron heartbeat: \$(date)\" >> /tmp/cron-heartbeat.log"
    local CRON_DISK="0 0 * * * df -h > \$HOME/cron-disk-usage.log"

    # Get current crontab
    local CURRENT_CRON
    CURRENT_CRON=$(user_do crontab -l 2>/dev/null || echo "")

    local NEW_CRON="$CURRENT_CRON"
    local CHANGED=false

    if [[ ! "$CURRENT_CRON" == *"/tmp/cron-heartbeat.log"* ]]; then
        echo "Adding example cron task: hourly heartbeat"
        NEW_CRON="${NEW_CRON}
${CRON_HEARTBEAT}"
        CHANGED=true
    fi

    if [[ ! "$CURRENT_CRON" == *"cron-disk-usage.log"* ]]; then
        echo "Adding example cron task: daily disk usage snapshot"
        NEW_CRON="${NEW_CRON}
${CRON_DISK}"
        CHANGED=true
    fi

    if [ "$CHANGED" = true ]; then
        # Filter empty lines and install new crontab
        echo "$NEW_CRON" | grep -v '^$' | user_do crontab -
        echo -e "${GREEN}✔ Crontab updated with example tasks.${NC}"
    else
        echo "Crontab already has example tasks."
    fi
}

if ! tty >/dev/null 2>&1 </dev/tty; then
    die "An interactive terminal is required to run desktop.sh."
fi

# --- CLEANUP APT KEYRINGS & SOURCES ---
if [[ "$(uname -s)" == "Linux" ]]; then
    echo -e "${YELLOW}Preparing APT environment...${NC}"
    # Ensure keyrings directory exists
    sys_do mkdir -p -m 755 /etc/apt/keyrings
    
    # Remove only legacy/old paths that are definitely not used anymore
    sys_do rm -f /usr/share/keyrings/deb.sury.org-php.gpg 2>/dev/null || true
    
    # --- ENSURE BASE TOOLS ---
    echo -e "${YELLOW}Ensuring base tools (gpg, curl, ca-certificates)...${NC}"
    export DEBIAN_FRONTEND=noninteractive
    
    # Remove only repository files owned by SetupVibe. Content-based deletion can
    # remove repositories managed by the user or another package manager.
    for source_file in \
        /etc/apt/sources.list.d/charm.list \
        /etc/apt/sources.list.d/docker.list \
        /etc/apt/sources.list.d/github-cli.list \
        /etc/apt/sources.list.d/nodesource.list \
        /etc/apt/sources.list.d/php.list; do
        sys_do rm -f -- "$source_file"
    done
    unset source_file

    sys_do apt-get update -y -qq
    APT_BOOTSTRAP_PACKAGES=(
        gnupg
        gnupg2
        curl
        ca-certificates
        lsb-release
        apt-transport-https
    )
    if grep -Eq '^ID=(ubuntu|zorin|linuxmint)$' /etc/os-release 2>/dev/null; then
        APT_BOOTSTRAP_PACKAGES+=(software-properties-common)
    fi
    sys_do apt-get install -y -q "${APT_BOOTSTRAP_PACKAGES[@]}"
    unset APT_BOOTSTRAP_PACKAGES
    
    # Robust GPG detection (try without sudo first for current user path)
    GPG_CMD=""
    for p in $(which gpg 2>/dev/null) $(which gpg2 2>/dev/null) /usr/bin/gpg /usr/bin/gpg2 /bin/gpg /bin/gpg2 /usr/local/bin/gpg; do
        if [[ -x "$p" ]]; then
            GPG_CMD="$p"
            break
        fi
    done
    
    if [[ -z "$GPG_CMD" ]]; then
        echo -e "${YELLOW}GPG not found in path, attempting to locate...${NC}"
        # Last ditch effort: search for it
        GPG_CMD=$(find /usr/bin /bin /usr/local/bin -name "gpg" -o -name "gpg2" 2>/dev/null | head -n 1)
    fi
    
    [[ -z "$GPG_CMD" ]] && GPG_CMD="/usr/bin/gpg"
    echo -e "${GREEN}Using GPG: $GPG_CMD${NC}"
fi

# --- STEPS CONFIGURATION ---
STEPS=(
    "Base System & Build Tools"
    "Homebrew (Package Manager)"
    "PHP ${PHP_VERSION} Ecosystem (Laravel)"
    "Ruby ${RUBY_VERSION} Ecosystem (Rails)"
    "Languages (Go, Rust, Python + uv + qrcode)"
    "JavaScript (Node, Bun, PNPM)"
    "DevOps (Docker, Ansible, GH)"
    "Modern Unix Tools (Via Brew)"
    "Network, Monitoring & Tailscale"
    "SSH Server (Linux Only)"
    "Shell (ZSH & Starship Config)"
    "Tmux & Plugins"
    "AI CLI Tools"
    "Finalization & Cleanup"
)


# Variable to track status
declare -a STEP_STATUS
INSTALL_FAILED=false


# --- DETECT OS ---
OS_TYPE=$(uname -s)
IS_MACOS=false
IS_LINUX=false

if [[ "$OS_TYPE" == "Darwin" ]]; then
    IS_MACOS=true
elif [[ "$OS_TYPE" == "Linux" ]]; then
    IS_LINUX=true
else
    echo -e "${RED}Error: Unsupported operating system: $OS_TYPE${NC}"
    exit 1
fi

# macOS must NOT be run as root — Homebrew blocks it entirely
if $IS_MACOS && [[ "$(id -u)" -eq 0 ]]; then
    echo -e "${RED}Error: Do not run this script with sudo on macOS.${NC}"
    echo -e "${YELLOW}Run it normally and it will ask for your password when needed:${NC}"
    echo -e "${CYAN}  bash desktop.sh${NC}"
    exit 1
fi


# --- 1. INITIAL PREPARATION ---


# Keep sudo alive during script execution (macOS)
if $IS_MACOS; then
    while true; do sudo -n true; sleep 60; kill -0 "$$" || exit; done 2>/dev/null &
fi


# Detect Real User (handles sudo, sudo su, and direct root invocations)
if [[ -n "$SUDO_USER" ]]; then
    REAL_USER="$SUDO_USER"
elif [[ "$(id -u)" -eq 0 ]]; then
    # SUDO_USER not set — try logname (survives sudo su) then who
    _LOGNAME=$(logname 2>/dev/null)
    _WHO=$(who am i 2>/dev/null | awk '{print $1}')
    if [[ -n "$_LOGNAME" && "$_LOGNAME" != "root" ]]; then
        REAL_USER="$_LOGNAME"
    elif [[ -n "$_WHO" && "$_WHO" != "root" ]]; then
        REAL_USER="$_WHO"
    else
        REAL_USER=$(whoami)
    fi
else
    REAL_USER=$(whoami)
fi
# Last resort: if still root, detect from Homebrew installation ownership
if [[ "$REAL_USER" == "root" && -d "/home/linuxbrew/.linuxbrew" ]]; then
    _BREW_OWNER=$(stat -c '%U' /home/linuxbrew/.linuxbrew 2>/dev/null)
    if [[ -n "$_BREW_OWNER" && "$_BREW_OWNER" != "root" ]]; then
        REAL_USER="$_BREW_OWNER"
    fi
fi
REAL_HOME=$(getent passwd "$REAL_USER" 2>/dev/null | cut -d: -f6)
[[ -z "$REAL_HOME" ]] && REAL_HOME="$HOME"
REAL_GROUP=$(id -gn "$REAL_USER" 2>/dev/null || echo "$REAL_USER")


# Detect Distro (Linux only)
if $IS_LINUX; then
    DISTRO_ID=$(lsb_release -is 2>/dev/null | tr '[:upper:]' '[:lower:]')
    DISTRO_CODENAME=$(lsb_release -cs 2>/dev/null)
    # Map derivative distros to their Ubuntu base codename for repository compatibility
    if [[ "$DISTRO_ID" == "zorin" || "$DISTRO_ID" == "linuxmint" ]]; then
        DISTRO_ID="ubuntu"
        BASE_CODENAME=$(grep -oP '(?<=UBUNTU_CODENAME=).*' /etc/os-release 2>/dev/null)
        if [[ -n "$BASE_CODENAME" ]]; then
            DISTRO_CODENAME="$BASE_CODENAME"
        fi
    fi

    IS_UBUNTU=false
    IS_DEBIAN=false
    [[ "$DISTRO_ID" == "ubuntu" ]] && IS_UBUNTU=true
    [[ "$DISTRO_ID" == "debian" ]] && IS_DEBIAN=true
else
    DISTRO_ID="macos"
    DISTRO_CODENAME=$(sw_vers -productVersion)
fi


# Detect Architecture
if $IS_MACOS; then
    ARCH_RAW=$(uname -m)
    if [[ "$ARCH_RAW" == "x86_64" ]]; then
        ARCH_GO="amd64"
        BREW_PREFIX="/usr/local"
    elif [[ "$ARCH_RAW" == "arm64" ]]; then
        ARCH_GO="arm64"
        BREW_PREFIX="/opt/homebrew"
    else
        echo -e "${RED}Error: Architecture $ARCH_RAW is not supported.${NC}"
        exit 1
    fi
else
    ARCH_RAW=$(dpkg --print-architecture)
    if [[ "$ARCH_RAW" == "amd64" ]]; then
        ARCH_GO="amd64"
        CTOP_SHA256="$CTOP_SHA256_AMD64"
    elif [[ "$ARCH_RAW" == "arm64" ]]; then
        ARCH_GO="arm64"
        CTOP_SHA256="$CTOP_SHA256_ARM64"
    else
        echo -e "${RED}Error: Architecture $ARCH_RAW is not supported.${NC}"
        exit 1
    fi
    BREW_PREFIX="/home/linuxbrew/.linuxbrew"
fi


# Install Figlet and Git silently for UI (platform-specific)
if $IS_MACOS; then
    # Check if Xcode Command Line Tools are installed
    if ! xcode-select -p &>/dev/null; then
        echo "Installing Xcode Command Line Tools..."
        xcode-select --install
        echo "Please complete the Xcode tools installation and run this script again."
        exit 1
    fi
    # Try to install figlet via brew if available, otherwise skip
    if command -v brew &>/dev/null; then
        brew_cmd install figlet git 2>/dev/null || true
    fi
else
    sys_do apt-get install -y figlet git >/dev/null 2>&1 || sys_do apt-get install -y --fix-missing figlet git >/dev/null
fi


# --- UI & LOGIC FUNCTIONS ---

# Helper to install GPG keys safely
install_key() {
    local url=$1
    local dest=$2
    local source_tmp
    local key_tmp

    echo -e "${YELLOW}Installing key:${NC} $url ➜ $dest"
    sys_do mkdir -p -m 755 /etc/apt/keyrings

    source_tmp=$(mktemp) || return 1
    key_tmp=$(mktemp) || {
        rm -f -- "$source_tmp"
        return 1
    }

    if ! curl -fsSL --proto '=https' --tlsv1.2 --max-time 30 "$url" -o "$source_tmp"; then
        echo -e "${RED}✘ Failed to download key from $url${NC}"
        rm -f -- "$source_tmp" "$key_tmp"
        return 1
    fi

    # Prefer a binary keyring when GPG is available.
    if [[ -n "$GPG_CMD" ]] && command -v "$GPG_CMD" >/dev/null 2>&1; then
        if "$GPG_CMD" --dearmor --yes --output "$key_tmp" "$source_tmp" 2>/dev/null \
            && sys_do install -m 0644 "$key_tmp" "$dest"; then
            rm -f -- "$source_tmp" "$key_tmp"
            return 0
        fi
    fi

    # Modern APT also accepts an armored keyring.
    if sys_do install -m 0644 "$source_tmp" "$dest"; then
        rm -f -- "$source_tmp" "$key_tmp"
        return 0
    fi

    rm -f -- "$source_tmp" "$key_tmp"
    echo -e "${RED}✘ Failed to install key from $url${NC}"
    return 1
}

header() {
    clear
    echo -e "${MAGENTA}"
    figlet "SETUPVIBE" 2>/dev/null || echo "SETUPVIBE.DEV"
    echo -e "${NC}"
    echo -e "${CYAN}:: Desktop Developer Edition - Cross Platform ::${NC}"
    echo -e "${YELLOW}Maintained by PromovaWeb.com | Contact: contato@promovaweb.com${NC}"
    echo "--------------------------------------------------------"
    echo "OS: $DISTRO_ID $DISTRO_CODENAME | Arch: $ARCH_RAW | User: $REAL_USER"
    echo "--------------------------------------------------------"
}


show_roadmap_and_wait() {
    header
    echo -e "${BOLD}SetupVibe Desktop - Installation Roadmap:${NC}\n"
    for i in "${!STEPS[@]}"; do
        echo -e "  [$(($i+1))/${#STEPS[@]}] ${STEPS[$i]}"
    done
    echo ""
    echo -e "--------------------------------------------------------"
    echo -e "${YELLOW}  ➜ Press [ENTER] to start SetupVibe Desktop.${NC}"
    echo -e "${RED}  ➜ Type 'q' + ENTER to cancel.${NC}"
    echo -e "--------------------------------------------------------"

    if ! tty >/dev/null 2>&1 </dev/tty; then
        die "An interactive terminal is required to run desktop.sh."
    fi
    read -r key </dev/tty || die "Interactive terminal input became unavailable."
    if [[ "$key" == "q" || "$key" == "Q" ]]; then
        echo -e "\n${RED}[CANCELLED] See you next time!${NC}"
        exit 0
    fi
}


configure_git_interactive() {
    echo ""
    echo -e "${BLUE}=== Checking Git Identity ===${NC}"

    CURRENT_NAME=$(user_do git config --global user.name)
    CURRENT_EMAIL=$(user_do git config --global user.email)


    if [[ -n "$CURRENT_NAME" && -n "$CURRENT_EMAIL" ]]; then
        echo -e "${GREEN}✔ Git configured:${NC} $CURRENT_NAME ($CURRENT_EMAIL)"
    else
        echo -e "${YELLOW}⚠ Git not configured. Let's fix that now.${NC}"
        echo ""

        GIT_NAME=""
        GIT_EMAIL=""

        while [[ -z "$GIT_NAME" ]]; do
            echo -ne "Enter your Full Name: "
            read -r GIT_NAME </dev/tty ||
                die "Interactive terminal input became unavailable while configuring Git."
        done


        while [[ -z "$GIT_EMAIL" ]]; do
            echo -ne "Enter your Email: "
            read -r GIT_EMAIL </dev/tty ||
                die "Interactive terminal input became unavailable while configuring Git."
        done

        user_do git config --global user.name "$GIT_NAME"
        user_do git config --global user.email "$GIT_EMAIL"
        user_do git config --global init.defaultBranch main

        echo -e "${GREEN}✔ Git configured!${NC}"
    fi
    sleep 1
}


run_section() {
    local index=$1
    local title="${STEPS[$index]}"
    local status
    local managed_dir

    echo ""
    echo -e "${BLUE}========================================================${NC}"
    echo -e "${BOLD}▶ [$(($index+1))/${#STEPS[@]}] $title ${NC}"
    echo -e "${BLUE}========================================================${NC}"

    # Pick up Homebrew installed by a previous step or an older SetupVibe run.
    resolve_brew_prefix || true

    # Keep installer-managed paths available without duplicating them at each step.
    for managed_dir in \
        "$REAL_HOME/.bun/bin" \
        "$REAL_HOME/.npm-global/bin" \
        "$REAL_HOME/.cargo/bin" \
        "$REAL_HOME/.local/go/bin" \
        "$REAL_HOME/.local/bin" \
        "$BREW_PREFIX/sbin" \
        "$BREW_PREFIX/bin"; do
        path_prepend_once "$managed_dir"
    done
    path_deduplicate
    export PATH

    # A function called directly from an `if` condition inherits Bash's
    # errexit suppression. Run it in an isolated strict shell so an
    # intermediate failure cannot be hidden by a later successful command.
    set +e
    (
        set -Eeuo pipefail
        "$2"
    )
    status=$?
    set -e

    if ((status == 0)); then
        STEP_STATUS[$index]="${GREEN}✔ OK${NC}"
    else
        STEP_STATUS[$index]="${RED}✘ Error${NC}"
        INSTALL_FAILED=true
    fi
}


git_ensure() {
    local repo=$1
    local dest=$2
    if [ -d "$dest" ]; then
        echo "Updating: $dest..."
        user_do git -C "$dest" pull --quiet
    else
        echo "Cloning: $repo..."
        user_do git clone "$repo" "$dest" --quiet
    fi
    if $IS_LINUX; then
        sys_do chown -R "$REAL_USER:$REAL_GROUP" "$dest" 2>/dev/null || true
    fi
}

safe_download() {
    local url=$1
    local dest=$2
    local min_bytes=${3:-100}
    local expected_sha256=${4:-}
    local tmp
    local dest_dir

    tmp=$(mktemp)

    echo "Downloading: $url"
    if ! curl \
        --proto '=https' \
        --tlsv1.2 \
        --fail \
        --silent \
        --show-error \
        --location \
        --retry 3 \
        --retry-all-errors \
        --connect-timeout 10 \
        --max-time 120 \
        --output "$tmp" \
        "$url"; then
        echo -e "${RED}✘ Download failed: $url${NC}"
        rm -f "$tmp"
        return 1
    fi

    # Reject empty or suspiciously small files (e.g. GitHub 404 HTML pages)
    local size
    size=$(wc -c < "$tmp")
    if [ "$size" -lt "$min_bytes" ]; then
        echo -e "${RED}✘ Downloaded file is too small (${size} bytes) — skipping: $dest${NC}"
        rm -f "$tmp"
        return 1
    fi

    # Reject HTML error responses (GitHub returns 200 with HTML on 404)
    if head -1 "$tmp" | grep -qi "<!doctype\|<html"; then
        echo -e "${RED}✘ Downloaded file appears to be an HTML error page — skipping: $dest${NC}"
        rm -f "$tmp"
        return 1
    fi

    if [[ -n "$expected_sha256" ]] &&
        ! printf '%s  %s\n' "$expected_sha256" "$tmp" | sha256sum --check --status; then
        echo -e "${RED}✘ Checksum verification failed: $url${NC}"
        rm -f -- "$tmp"
        return 1
    fi

    # Ensure parent directory exists and is writable
    dest_dir=$(dirname "$dest")
    user_do mkdir -p "$dest_dir"

    if $IS_MACOS; then
        if ! user_do install -m 0644 "$tmp" "$dest"; then
            rm -f -- "$tmp"
            return 1
        fi
    elif ! sys_do install -o "$REAL_USER" -g "$REAL_GROUP" -m 0644 "$tmp" "$dest"; then
        rm -f -- "$tmp"
        return 1
    fi
    rm -f -- "$tmp"

    echo -e "${GREEN}✔ Downloaded: $dest${NC}"
    return 0
}


install_setupvibe_bin() {
    echo "Installing SetupVibe helper scripts..."
    user_do mkdir -p "$REAL_HOME/.setupvibe/bin"
    user_do rm -f "$REAL_HOME/.setupvibe/bin/sshcopykey"
    if ! safe_download https://raw.githubusercontent.com/promovaweb/setupvibe/main/bin/ssh_copy_id "$REAL_HOME/.setupvibe/bin/ssh_copy_id" 500; then
        return 1
    fi
    user_do chmod +x "$REAL_HOME/.setupvibe/bin/ssh_copy_id"
    if $IS_LINUX; then
        sys_do chown -R "$REAL_USER:$REAL_GROUP" "$REAL_HOME/.setupvibe"
    fi
}

install_herdr() {
    local herdr_os
    local herdr_arch
    local herdr_target
    local herdr_url
    local herdr_tmp_dir
    local manifest_tmp
    local binary_tmp

    if $IS_MACOS; then
        herdr_os=macos
    else
        herdr_os=linux
    fi

    case "$ARCH_RAW" in
        x86_64|amd64)
            herdr_arch=x86_64
            ;;
        arm64|aarch64)
            herdr_arch=aarch64
            ;;
        *)
            echo -e "${RED}✘ Herdr does not support architecture: $ARCH_RAW${NC}"
            return 1
            ;;
    esac

    herdr_target="${herdr_os}-${herdr_arch}"
    user_do mkdir -p "$REAL_HOME/.setupvibe/tmp"
    herdr_tmp_dir=$(user_do mktemp -d "$REAL_HOME/.setupvibe/tmp/herdr.XXXXXX")
    manifest_tmp="$herdr_tmp_dir/latest.json"
    binary_tmp="$herdr_tmp_dir/herdr"

    if ! safe_download https://herdr.dev/latest.json "$manifest_tmp" 1000; then
        user_do rmdir -- "$herdr_tmp_dir" 2>/dev/null || true
        return 1
    fi

    herdr_url=$(jq -er \
        --arg target "$herdr_target" \
        '.assets[$target] | select(startswith("https://github.com/herdrdev/herdr/releases/download/"))' \
        "$manifest_tmp") || {
        echo -e "${RED}✘ Herdr manifest has no trusted asset for: $herdr_target${NC}"
        user_do rm -f -- "$manifest_tmp"
        user_do rmdir -- "$herdr_tmp_dir"
        return 1
    }

    if ! safe_download "$herdr_url" "$binary_tmp" 100000; then
        user_do rm -f -- "$manifest_tmp"
        user_do rmdir -- "$herdr_tmp_dir"
        return 1
    fi

    user_do mkdir -p "$REAL_HOME/.local/bin"
    if $IS_MACOS; then
        user_do install -m 0755 "$binary_tmp" "$REAL_HOME/.local/bin/herdr"
    else
        sys_do install -o "$REAL_USER" -g "$REAL_GROUP" -m 0755 \
            "$binary_tmp" "$REAL_HOME/.local/bin/herdr"
    fi
    user_do rm -f -- "$manifest_tmp" "$binary_tmp"
    user_do rmdir -- "$herdr_tmp_dir"

    user_do env PATH="$REAL_HOME/.local/bin:$PATH" herdr --version >/dev/null
    echo -e "${GREEN}✔ Herdr installed and validated.${NC}"
}

install_antigravity() {
    local antigravity_os
    local antigravity_arch
    local antigravity_platform
    local antigravity_base_url="https://antigravity-cli-auto-updater-974169037036.us-central1.run.app"
    local antigravity_tmp_dir
    local manifest_tmp
    local payload_tmp
    local download_url
    local expected_sha512
    local actual_sha512
    local is_tar_gz=false

    if $IS_MACOS; then
        antigravity_os=darwin
    else
        antigravity_os=linux
    fi

    case "$ARCH_RAW" in
        x86_64|amd64)
            antigravity_arch=amd64
            ;;
        arm64|aarch64)
            antigravity_arch=arm64
            ;;
        *)
            echo -e "${RED}✘ Antigravity CLI does not support architecture: $ARCH_RAW${NC}"
            return 1
            ;;
    esac

    antigravity_platform="${antigravity_os}_${antigravity_arch}"
    if ! $IS_MACOS && {
        [[ -f /lib/libc.musl-x86_64.so.1 ]] ||
            [[ -f /lib/libc.musl-aarch64.so.1 ]] ||
            ldd /bin/ls 2>&1 | grep -q musl
    }; then
        antigravity_platform="${antigravity_platform}_musl"
    fi

    user_do mkdir -p "$REAL_HOME/.local/bin" "$REAL_HOME/.setupvibe/tmp"
    antigravity_tmp_dir=$(user_do mktemp -d "$REAL_HOME/.setupvibe/tmp/antigravity.XXXXXX")
    manifest_tmp="$antigravity_tmp_dir/manifest.json"

    # The official Unix bootstrapper (antigravity.google/cli/install.sh) does
    # not forward --skip-aliases/--skip-path to its own bundled `agy install`
    # step, so those flags fail there. This mirrors install_herdr(): resolve
    # the same versioned manifest, verify the same SHA-512 checksum the
    # bootstrapper itself checks, and place the binary directly, so we can
    # call `agy install` ourselves with the flags it actually supports.
    if ! safe_download "$antigravity_base_url/manifests/${antigravity_platform}.json" "$manifest_tmp" 100; then
        user_do rmdir -- "$antigravity_tmp_dir" 2>/dev/null || true
        return 1
    fi

    download_url=$(jq -er \
        '.url | select(startswith("https://storage.googleapis.com/antigravity-public/"))' \
        "$manifest_tmp") || {
        echo -e "${RED}✘ Antigravity CLI manifest has no trusted asset for: $antigravity_platform${NC}"
        user_do rm -f -- "$manifest_tmp"
        user_do rmdir -- "$antigravity_tmp_dir"
        return 1
    }
    expected_sha512=$(jq -er '.sha512' "$manifest_tmp") || {
        echo -e "${RED}✘ Antigravity CLI manifest is missing a checksum for: $antigravity_platform${NC}"
        user_do rm -f -- "$manifest_tmp"
        user_do rmdir -- "$antigravity_tmp_dir"
        return 1
    }

    case "$download_url" in
        *.tar.gz*)
            is_tar_gz=true
            payload_tmp="$antigravity_tmp_dir/agy.tar.gz"
            ;;
        *)
            payload_tmp="$antigravity_tmp_dir/agy"
            ;;
    esac

    if ! safe_download "$download_url" "$payload_tmp" 1000000; then
        user_do rm -f -- "$manifest_tmp"
        user_do rmdir -- "$antigravity_tmp_dir"
        return 1
    fi

    if $IS_MACOS; then
        actual_sha512=$(user_do shasum -a 512 "$payload_tmp" | cut -d' ' -f1)
    else
        actual_sha512=$(user_do sha512sum "$payload_tmp" | cut -d' ' -f1)
    fi
    if [[ "$actual_sha512" != "$expected_sha512" ]]; then
        echo -e "${RED}✘ Antigravity CLI checksum verification failed: $download_url${NC}"
        user_do rm -f -- "$manifest_tmp" "$payload_tmp"
        user_do rmdir -- "$antigravity_tmp_dir"
        return 1
    fi

    if $is_tar_gz; then
        user_do tar -xzf "$payload_tmp" -C "$antigravity_tmp_dir" antigravity
    else
        user_do mv -- "$payload_tmp" "$antigravity_tmp_dir/antigravity"
    fi

    if $IS_MACOS; then
        user_do install -m 0755 "$antigravity_tmp_dir/antigravity" "$REAL_HOME/.local/bin/agy"
        user_do xattr -d com.apple.quarantine "$REAL_HOME/.local/bin/agy" 2>/dev/null || true
    else
        sys_do install -o "$REAL_USER" -g "$REAL_GROUP" -m 0755 \
            "$antigravity_tmp_dir/antigravity" "$REAL_HOME/.local/bin/agy"
    fi
    user_do rm -f -- "$manifest_tmp" "$payload_tmp" "$antigravity_tmp_dir/antigravity"
    user_do rmdir -- "$antigravity_tmp_dir"

    user_do env PATH="$REAL_HOME/.local/bin:$PATH" agy install --skip-aliases --skip-path
    user_do env PATH="$REAL_HOME/.local/bin:$PATH" agy --version >/dev/null
    echo -e "${GREEN}✔ Antigravity CLI installed and validated.${NC}"
}


# --- INSTALLATION STEPS ---


step_1() {
    if $IS_MACOS; then
        echo "macOS build tools are provided by Xcode Command Line Tools (already installed)"
        echo "Base tools via Homebrew will be installed after Homebrew is set up (Step 3)..."
    else
        echo "Updating APT..."
        sys_do apt-get update -qq
        echo "Installing Build Essentials & Tmux..."
        sys_do apt-get install -y build-essential git wget unzip fontconfig curl sshpass \
            libssl-dev zlib1g-dev libbz2-dev libreadline-dev libsqlite3-dev llvm \
            libncurses5-dev xz-utils tk-dev libxml2-dev libxmlsec1-dev libffi-dev liblzma-dev \
            libyaml-dev autoconf bison procps file tmux ffmpeg imagemagick cron

        # Adding Charmbracelet Repo (needed for Glow)
        install_key "https://repo.charm.sh/apt/gpg.key" "/etc/apt/keyrings/charm.gpg"
        echo "deb [signed-by=/etc/apt/keyrings/charm.gpg] https://repo.charm.sh/apt/ * *" | sys_do tee /etc/apt/sources.list.d/charm.list
        sys_do apt-get update -qq
    fi
}


step_2() {
    local brew_environment

    if $IS_MACOS; then
        echo "Checking Homebrew installation..."
        if ! command -v brew &>/dev/null; then
            echo "Installing Homebrew..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

            # Setup PATH for current session
            if [[ -f "$BREW_PREFIX/bin/brew" ]]; then
                eval "$($BREW_PREFIX/bin/brew shellenv)"
            fi
        fi

        # Verify installation
        if command -v brew &>/dev/null; then
            echo -e "${GREEN}✔ Homebrew is ready.${NC}"
            echo "Updating Homebrew metadata..."
            brew_cmd update
            
            echo "Installing base tools via Homebrew..."
            brew_cmd install wget unzip curl tmux sshpass openssl readline sqlite3 xz zlib tcl-tk ffmpeg imagemagick
        else
            echo -e "${RED}✘ Homebrew installation failed.${NC}"
            return 1
        fi
    else
        echo "Checking Homebrew installation..."
        if ! resolve_brew_prefix; then
            echo "Installing Homebrew..."
            sys_do apt-get install -y build-essential procps curl file git

            # Ensure /home/linuxbrew directory exists with proper permissions
            echo "Ensuring /home/linuxbrew permissions..."
            sys_do mkdir -p /home/linuxbrew
            sys_do chown -R "$REAL_USER" /home/linuxbrew 2>/dev/null || true
            sys_do chmod -R 775 /home/linuxbrew 2>/dev/null || true
            
            # Pre-create .linuxbrew to help the installer
            sys_do mkdir -p /home/linuxbrew/.linuxbrew
            sys_do chown -R "$REAL_USER" /home/linuxbrew/.linuxbrew 2>/dev/null || true

            # Install Homebrew
            if [[ "$REAL_USER" == "root" ]]; then
                echo -e "${RED}✘ Homebrew cannot be installed as root. Skipping.${NC}"
            else
                # Run installer as REAL_USER
                user_do env NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            fi

        fi

        if ! resolve_brew_prefix; then
            echo -e "${RED}✘ Homebrew installation did not produce an executable in a supported prefix.${NC}"
            return 1
        fi

        # Configure Homebrew PATH in shell profiles
        echo "Configuring Homebrew PATH in shell profiles..."
        for CONFIG_FILE in "$REAL_HOME/.bashrc" "$REAL_HOME/.profile" "$REAL_HOME/.zshrc"; do
            # Create config file if it doesn't exist
            if [ ! -f "$CONFIG_FILE" ]; then
                user_do touch "$CONFIG_FILE"
            fi
            
            # Add Homebrew configuration if not present
            if ! grep -Fq "$BREW_PREFIX/bin/brew" "$CONFIG_FILE"; then
                printf '\n# Homebrew Configuration\nif [ -x "%s/bin/brew" ]; then eval "$("%s/bin/brew" shellenv)"; fi\n' \
                    "$BREW_PREFIX" "$BREW_PREFIX" | user_do tee -a "$CONFIG_FILE" > /dev/null
                echo -e "${GREEN}✔ Added Homebrew to $CONFIG_FILE${NC}"
            fi
        done

        # Load brew environment for this script session
        echo "Loading Homebrew environment for current session..."
        if ! brew_environment=$(brew_cmd shellenv); then
            echo -e "${RED}✘ Homebrew environment could not be loaded.${NC}"
            return 1
        fi
        eval "$brew_environment"

        # Verify brew is accessible
        if [[ "$(command -v brew 2>/dev/null)" == "$BREW_PREFIX/bin/brew" ]]; then
            echo -e "${GREEN}✔ Homebrew is ready and available in PATH.${NC}"
            echo "Updating Homebrew and upgrading existing packages..."
            brew_cmd update
            brew_cmd upgrade
        else
            echo -e "${RED}✘ Homebrew installation failed or brew not found in PATH.${NC}"
            echo -e "${YELLOW}Please check the error messages above.${NC}"
            return 1
        fi
    fi
}


step_3() {
    if $IS_MACOS; then
        echo "Installing PHP $PHP_VERSION via Homebrew..."
        brew_cmd install php
        brew_cmd link php --force --overwrite
        
        # Install common extensions via PECL
        # NOTE: pecl prompts interactively (e.g. redis asks about igbinary/lzf/
        # zstd/msgpack/lz4). When this script is run via `curl ... | bash`, stdin
        # IS the script, so pecl would read the following script lines as prompt
        # answers, producing a broken ./configure call and silently consuming the
        # rest of the script. Feeding `yes ''` answers every prompt with its
        # default and isolates stdin from the script body.
        echo "Installing PHP Extensions..."
        yes '' | user_do pecl install redis 2>/dev/null || true
        yes '' | user_do pecl install xdebug 2>/dev/null || true
        yes '' | user_do pecl install imagick 2>/dev/null || true
        
        echo "Installing Composer..."
        if [ ! -f "$REAL_HOME/.local/bin/composer" ] && ! command -v composer &>/dev/null; then
            brew_cmd install composer
        else
            user_do composer self-update
        fi
        
        echo "Setup Laravel Installer..."
        user_do composer global require laravel/installer
    else
        echo "Configuring PHP Repository..."
        if $IS_UBUNTU; then
            echo "Using Ubuntu PPA Strategy..."
            sys_do add-apt-repository ppa:ondrej/php -y
        elif $IS_DEBIAN; then
            echo "Using Debian Sury Strategy..."
            # Sury supports Debian 12 (bookworm) and Debian 13 (trixie).
            PHP_CODENAME="$DISTRO_CODENAME"
            case "$DISTRO_CODENAME" in
                forky|sid|experimental) PHP_CODENAME="trixie" ;;
            esac
            install_key "https://packages.sury.org/php/apt.gpg" "/etc/apt/keyrings/php.gpg"
            echo "deb [signed-by=/etc/apt/keyrings/php.gpg] https://packages.sury.org/php/ $PHP_CODENAME main" | sys_do tee /etc/apt/sources.list.d/php.list
        else
            echo -e "${YELLOW}⚠ Unknown Linux distribution. Skipping PHP repository configuration.${NC}"
        fi
        
        sys_do apt-get update -qq
        echo "Installing PHP $PHP_VERSION & Core Extensions..."
        sys_do apt-get install -y \
            "php${PHP_VERSION}" "php${PHP_VERSION}-cli" "php${PHP_VERSION}-common" "php${PHP_VERSION}-dev" \
            "php${PHP_VERSION}-curl" "php${PHP_VERSION}-mbstring" "php${PHP_VERSION}-xml" "php${PHP_VERSION}-bcmath" \
            "php${PHP_VERSION}-mysql" "php${PHP_VERSION}-pgsql" "php${PHP_VERSION}-sqlite3"

        echo "Installing PHP $PHP_VERSION Optional Extensions..."
        for _ext in "php${PHP_VERSION}-zip" "php${PHP_VERSION}-intl" "php${PHP_VERSION}-gd" "php${PHP_VERSION}-imagick" \
                    "php${PHP_VERSION}-redis" "php${PHP_VERSION}-mongodb" "php${PHP_VERSION}-yaml" "php${PHP_VERSION}-xdebug"; do
            sys_do apt-get install -y "$_ext" 2>/dev/null \
                || echo -e "${YELLOW}⚠ Optional extension $_ext not available on this distro, skipping.${NC}"
        done
        unset _ext


        echo "Persisting COMPOSER_ALLOW_SUPERUSER=1..."
        echo 'export COMPOSER_ALLOW_SUPERUSER=1' | sys_do tee /etc/profile.d/composer.sh > /dev/null
        sys_do chmod +x /etc/profile.d/composer.sh
        export COMPOSER_ALLOW_SUPERUSER=1

        # Check for composer in .local/bin or system path
        export PATH="$REAL_HOME/.local/bin:$PATH"
        if ! command -v composer &>/dev/null && [ ! -f "$REAL_HOME/.local/bin/composer" ]; then
            echo "Installing Composer to $REAL_HOME/.local/bin..."
            user_do mkdir -p "$REAL_HOME/.local/bin"
            curl -sS https://getcomposer.org/installer | user_do php -- --install-dir="$REAL_HOME/.local/bin" --filename=composer
            user_do chmod +x "$REAL_HOME/.local/bin/composer"
        else
            user_do bash -c "export PATH=\"$REAL_HOME/.local/bin:\$PATH\"; composer self-update" 2>/dev/null || true
        fi
        echo "Setup Laravel Installer..."
        user_do bash -c "export PATH=\"$REAL_HOME/.local/bin:\$PATH\"; composer global require laravel/installer"
    fi
}


step_4() {
    echo "Setup Rbenv..."
    if $IS_MACOS; then
        # On macOS, use Homebrew for rbenv
        brew_cmd install rbenv ruby-build
        
        echo "Checking Ruby $RUBY_VERSION..."
        if ! user_do rbenv versions --bare | grep -Fxq "$RUBY_VERSION"; then
            echo "Compiling Ruby $RUBY_VERSION (this may take a few minutes)..."
            # Optimization: Skip documentation and use parallel compilation.
            # Use single quotes for the outer `bash -c` and double quotes for the
            # values so $(...) is evaluated by the inner shell. With the previous
            # double-quoted outer + single-quoted, escaped \$(...), MAKE_OPTS was
            # stored literally as "-j$(nproc ...)" and ruby-build ran a broken
            # `make "-j$(nproc" ...`, failing the build (and cascading the Rails
            # install onto system Ruby). Mirrors the Linux path below.
            user_do env RUBY_VERSION="$RUBY_VERSION" bash -c 'export RUBY_CONFIGURE_OPTS="--disable-install-doc"; export MAKE_OPTS="-j$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 2)"; rbenv install "$RUBY_VERSION"'
            user_do rbenv global "$RUBY_VERSION"
        fi
        
        # Initialize rbenv for current session
        eval "$(user_do rbenv init -)"
        
        echo "Installing Rails..."
        user_do gem install bundler rails --no-document
    else
        git_ensure "https://github.com/rbenv/rbenv.git" "$REAL_HOME/.rbenv"
        git_ensure "https://github.com/rbenv/ruby-build.git" "$REAL_HOME/.rbenv/plugins/ruby-build"

        sys_do chown -R "$REAL_USER:$REAL_GROUP" "$REAL_HOME/.rbenv"
        user_do bash -c "cd '$REAL_HOME/.rbenv' && src/configure && make -C src" >/dev/null 2>&1

        # Write gemrc to suppress documentation generation for all future gem installs
        user_do bash -c 'echo "gem: --no-document" > "$HOME/.gemrc"'

        echo "Checking Ruby $RUBY_VERSION..."
        if ! user_do env RUBY_VERSION="$RUBY_VERSION" bash -c 'export PATH="$HOME/.rbenv/bin:$PATH"; eval "$(rbenv init -)"; rbenv versions --bare | grep -Fxq "$RUBY_VERSION"'; then
            echo "Compiling Ruby $RUBY_VERSION (this may take a few minutes)..."
            # Use $HOME/.tmp as TMPDIR to avoid noexec on /tmp (common in cloud VMs)
            user_do env RUBY_VERSION="$RUBY_VERSION" bash -c 'mkdir -p "$HOME/.tmp"; export TMPDIR="$HOME/.tmp"; export PATH="$HOME/.rbenv/bin:$PATH"; eval "$(rbenv init -)"; export RUBY_CONFIGURE_OPTS="--disable-install-doc"; export MAKE_OPTS="-j$(nproc 2>/dev/null || echo 2)"; rbenv install "$RUBY_VERSION" && rbenv global "$RUBY_VERSION"'
        fi

        echo "Installing Rails..."
        user_do bash -c 'export PATH="$HOME/.rbenv/bin:$PATH"; eval "$(rbenv init -)"; rbenv rehash; gem install bundler rails --no-document'
    fi
}


install_qrcode() {
    local python_bin=$1
    local python_user_base
    local qr_bin

    echo "Installing qrcode globally for $REAL_USER via pip..."
    python_user_base=$(user_do "$python_bin" -m site --user-base)
    qr_bin="$python_user_base/bin/qr"

    user_do "$python_bin" -m pip install \
        --user \
        --upgrade \
        --break-system-packages \
        --no-warn-script-location \
        qrcode

    user_do "$python_bin" -c 'import qrcode'
    if [[ ! -x "$qr_bin" ]]; then
        echo -e "${RED}✘ qrcode CLI was not installed at $qr_bin.${NC}"
        return 1
    fi
    user_do "$qr_bin" --help >/dev/null

    path_prepend_once "$python_user_base/bin"
    export PATH
}


step_5() {
    if $IS_MACOS; then
        echo "Setup Python..."
        brew_cmd install "python@${PYTHON_VERSION}"

        install_qrcode "$(brew_cmd --prefix "python@${PYTHON_VERSION}")/bin/python${PYTHON_VERSION}"
        
        echo "Setup uv (Python Package Manager)..."
        if ! command -v uv &> /dev/null; then
            user_do curl -LsSf https://astral.sh/uv/install.sh | sh
        else
            user_do uv self update
        fi
        
        echo "Setup Go $GO_VERSION..."
        brew_cmd install go
        
        echo "Setup Rust..."
        if ! user_do bash -c "command -v rustup" &> /dev/null; then
            user_do bash -o pipefail -c "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y"
            source "$REAL_HOME/.cargo/env" 2>/dev/null || true
        else
            user_do bash -c "export PATH=\$HOME/.cargo/bin:\$PATH; rustup update"
        fi
        export PATH="$REAL_HOME/.cargo/bin:$PATH"

        echo "Installing Cronboard (Cron TUI)..."
        brew_cmd install cronboard

        cron_ensure
    else
        echo "Setup Python..."
        sys_do apt-get install -y python3 python3-pip python3-venv python-is-python3

        install_qrcode /usr/bin/python3

        echo "Setup uv (Python Package Manager)..."
        if ! user_do bash -c "export PATH=\$HOME/.local/bin:\$PATH; command -v uv" &> /dev/null; then
            user_do bash -c "curl -LsSf https://astral.sh/uv/install.sh | sh"
        else
            user_do bash -c "export PATH=\$HOME/.local/bin:\$PATH; uv self update"
        fi
        export PATH="$REAL_HOME/.local/bin:$PATH"

        echo "Setup Go $GO_VERSION ($ARCH_GO)..."
        INSTALLED_GO_VERSION=""
        if [ -x "$REAL_HOME/.local/go/bin/go" ]; then
            INSTALLED_GO_VERSION=$("$REAL_HOME/.local/go/bin/go" version 2>/dev/null | awk '{print $3}')
        fi

        if [[ "$INSTALLED_GO_VERSION" != "go${GO_VERSION}" ]]; then
            echo "Installing Go $GO_VERSION to $REAL_HOME/.local/go..."
            case "$ARCH_GO" in
                amd64) GO_SHA256="5c2c3b16caefa1d968a94c1daca04a7ca301a496d9b086e17ad77bb81393f053" ;;
                arm64) GO_SHA256="fe4789e92b1f33358680864bbe8704289e7bb5fc207d80623c308935bd696d49" ;;
                *)
                    echo -e "${RED}✘ No Go checksum configured for architecture: $ARCH_GO${NC}"
                    return 1
                    ;;
            esac

            user_do mkdir -p "$REAL_HOME/.local"
            safe_download "https://go.dev/dl/go${GO_VERSION}.linux-${ARCH_GO}.tar.gz" /tmp/go.tar.gz 10000000 || return 1

            if [[ "$(sha256sum /tmp/go.tar.gz | awk '{print $1}')" != "$GO_SHA256" ]]; then
                echo -e "${RED}✘ Go archive checksum verification failed.${NC}"
                rm -f /tmp/go.tar.gz
                return 1
            fi

            user_do rm -rf "$REAL_HOME/.local/go"
            user_do tar -C "$REAL_HOME/.local" -xzf /tmp/go.tar.gz
            rm -f /tmp/go.tar.gz
        fi
        unset INSTALLED_GO_VERSION GO_SHA256
        export PATH="$REAL_HOME/.local/go/bin:$PATH"

        echo "Setup Rust..."
        if [ ! -f "$REAL_HOME/.cargo/bin/rustup" ]; then
            user_do bash -o pipefail -c "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y"
        else
            user_do bash -c "export PATH=\$HOME/.cargo/bin:\$PATH; rustup update"
        fi
        export PATH="$REAL_HOME/.cargo/bin:$PATH"

        echo "Installing Cronboard (Cron TUI)..."
        if ! user_do bash -c "export PATH=\$HOME/.local/bin:\$PATH; command -v cronboard" &> /dev/null; then
            user_do bash -c "export PATH=\$HOME/.local/bin:\$PATH; uv tool install git+https://github.com/antoniorodr/cronboard"
        fi

        cron_ensure
    fi
}


step_6() {
    local npm_bin
    local npm_path

    if $IS_MACOS; then
        echo "Setup Node.js via Homebrew..."
        brew_cmd install node@24
        brew_cmd link node@24 --force --overwrite

        echo "Setup Bun..."
        user_do curl -fsSL https://bun.sh/install | bash
    else
        echo "Setup NodeSource..."
        install_key "https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key" "/etc/apt/keyrings/nodesource.gpg"
        echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_24.x nodistro main" | sys_do tee /etc/apt/sources.list.d/nodesource.list
        sys_do apt-get update -qq
        sys_do apt-get install -y nodejs

        # Configure npm globals for the target user, even when the installer runs through sudo.
        if [[ "$REAL_USER" != "root" ]]; then
            echo "Configuring npm to use user-writable directory for global packages..."
            user_do mkdir -p "$REAL_HOME/.npm-global"
            user_do "$(command -v npm)" config set prefix "$REAL_HOME/.npm-global"
        fi

        echo "Setup Bun..."
        user_do bash -c "curl -fsSL https://bun.sh/install | bash"
    fi

    npm_bin=$(command -v npm)
    npm_path=$(user_do "$npm_bin" config get prefix)
    npm_path="$npm_path/bin:$PATH"

    echo "Installing pnpm..."
    user_do env PATH="$npm_path" "$npm_bin" install -g pnpm npm@latest

    echo "Installing PM2..."
    user_do env PATH="$npm_path" "$npm_bin" install -g pm2

    user_do env PATH="$npm_path" pnpm --version
    user_do env PATH="$npm_path" pm2 --version
    user_do "$REAL_HOME/.bun/bin/bun" --version
}


step_7() {
    if $IS_MACOS; then
        echo "Checking Docker Desktop..."
        if brew_cmd list --cask docker-desktop &>/dev/null ||
            [[ -d /Applications/Docker.app || -d "$REAL_HOME/Applications/Docker.app" ]]; then
            echo "Docker Desktop is already installed."
        else
            echo "Installing Docker Desktop via Homebrew Cask..."
            brew_cmd install --cask docker-desktop ||
                echo -e "${YELLOW}Please download Docker Desktop from https://www.docker.com/products/docker-desktop/${NC}"
        fi
        
        # Ansible
        echo "Installing Ansible..."
        brew_cmd install ansible
        
        # GitHub CLI
        echo "Installing GitHub CLI..."
        brew_cmd install gh
    else
        # Docker Strategy
        echo "Configuring Docker..."
        DOCKER_CODENAME="$DISTRO_CODENAME"
        
        if $IS_UBUNTU; then
            echo "Using Ubuntu Docker Strategy..."
        elif $IS_DEBIAN; then
            echo "Using Debian Docker Strategy..."
            case "$DISTRO_CODENAME" in
                forky|sid|experimental) DOCKER_CODENAME="trixie" ;;
            esac
        fi

        install_key "https://download.docker.com/linux/$DISTRO_ID/gpg" "/etc/apt/keyrings/docker.gpg"
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$DISTRO_ID $DOCKER_CODENAME stable" | sys_do tee /etc/apt/sources.list.d/docker.list
        
        sys_do apt-get update -qq
        sys_do apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin docker-buildx-plugin
        sys_do usermod -aG docker "$REAL_USER"
        
        echo "Enabling and starting Docker service..."
        sys_do systemctl enable --now docker

        # Ansible Strategy
        echo "Configuring Ansible..."
        if $IS_UBUNTU; then
            echo "Using Ubuntu Ansible PPA Strategy..."
            sys_do add-apt-repository --yes --update ppa:ansible/ansible
            sys_do apt-get install -y ansible
        elif $IS_DEBIAN; then
            echo "Using Debian Ansible Strategy..."
            # Debian 12+ (Bookworm/Trixie) removes 'ansible' package; 'ansible-core' is the base.
            sys_do apt-get install -y ansible-core
        fi


        # GitHub CLI
        wget -qO- https://cli.github.com/packages/githubcli-archive-keyring.gpg | sys_do tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null
        sys_do chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sys_do tee /etc/apt/sources.list.d/github-cli.list > /dev/null
        sys_do apt-get update -qq && sys_do apt-get install -y gh
    fi

    # Portainer Setup (Both macOS & Linux)
    echo "Configuring Portainer..."
    user_do mkdir -p "$REAL_HOME/.setupvibe/portainer_data"
    safe_download https://raw.githubusercontent.com/promovaweb/setupvibe/main/conf/portainer-compose.yml "$REAL_HOME/.setupvibe/portainer-compose.yml"
    if $IS_LINUX; then
        sys_do chown -R "$REAL_USER:$REAL_GROUP" "$REAL_HOME/.setupvibe"
    fi

    # Try to start Portainer if docker is running
    if $IS_MACOS && command -v docker &>/dev/null && user_do docker info &>/dev/null; then
        echo "Starting Portainer..."
        user_do docker compose -f "$REAL_HOME/.setupvibe/portainer-compose.yml" up -d
        echo -e "${GREEN}✔ Portainer is running at https://localhost:9443${NC}"
    elif $IS_LINUX && command -v docker &>/dev/null && sys_do docker info &>/dev/null; then
        echo "Starting Portainer..."
        sys_do docker compose -f "$REAL_HOME/.setupvibe/portainer-compose.yml" up -d
        echo -e "${GREEN}✔ Portainer is running at https://localhost:9443${NC}"
    else
        echo -e "${YELLOW}⚠ Docker is not running. Portainer will be ready to start later with:${NC}"
        echo -e "${CYAN}  docker compose -f ~/.setupvibe/portainer-compose.yml up -d${NC}"
    fi
}


step_8() {
    echo "Installing Modern Unix Tools via Homebrew..."
    local -a tools=(bat eza zoxide fzf ripgrep fd lazygit lazydocker neovim glow tlrc fastfetch duf jq mise)

    if brew_cmd list --formula tldr &>/dev/null; then
        echo "Migrating the disabled tldr formula to tlrc..."
        brew_cmd uninstall tldr
    fi

    if $IS_MACOS; then
        brew_cmd install "${tools[@]}"

        # FZF keybindings setup
        if [ -d "$BREW_PREFIX/opt/fzf" ]; then
            user_do "$BREW_PREFIX/opt/fzf/install" --all --no-bash --no-fish 2>/dev/null || true
        fi
    else
        # Find brew binary
        if ! command -v brew &>/dev/null; then
            echo -e "${RED}Error: Homebrew binary not found. Skipping modern tools installation.${NC}"
            return 1
        fi

        brew_cmd install "${tools[@]}" || brew_cmd upgrade "${tools[@]}"

        # FZF install script path
        local FZF_OPT="/home/linuxbrew/.linuxbrew/opt/fzf"
        [ ! -d "$FZF_OPT" ] && FZF_OPT="$REAL_HOME/.linuxbrew/opt/fzf"
        if [ -d "$FZF_OPT" ]; then
            user_do "$FZF_OPT/install" --all --no-bash --no-fish > /dev/null 2>&1
        fi

    fi
}


step_9() {
    if $IS_MACOS; then
        echo "Installing Network Tools via Homebrew..."
        brew_cmd install wget nmap mtr htop btop glances speedtest-cli
        
        echo "Installing Network Tools (Rust)..."
        for tool in bandwhich gping trippy rustscan; do
            if ! command -v $tool &> /dev/null; then
                user_do cargo install $tool
            fi
        done
        
        echo "Installing ctop..."
        brew_cmd install ctop

        echo "Checking Tailscale..."
        if brew_cmd list --cask tailscale-app &>/dev/null ||
            [[ -d /Applications/Tailscale.app || -d "$REAL_HOME/Applications/Tailscale.app" ]]; then
            echo "Tailscale is already installed."
        else
            brew_cmd install --cask tailscale-app
        fi
    else
        echo "Installing Network Tools (APT)..."
        sys_do apt-get install -y rsync net-tools dnsutils mtr-tiny nmap tcpdump iftop nload iotop sysstat whois iputils-ping speedtest-cli glances htop btop

        echo "Installing Network Tools (Rust)..."
        for tool in bandwhich gping trippy rustscan; do
            if ! user_do bash -c "export PATH=\$HOME/.cargo/bin:\$PATH; command -v $tool" &> /dev/null; then
                 user_do bash -c "export PATH=\$HOME/.cargo/bin:\$PATH; cargo install $tool"
            fi
        done


        echo "Installing ctop for $ARCH_GO..."
        if ! command -v ctop &>/dev/null && [ ! -f "$REAL_HOME/.local/bin/ctop" ]; then
            user_do mkdir -p "$REAL_HOME/.local/bin"
            safe_download \
                "https://github.com/bcicen/ctop/releases/download/v${CTOP_VERSION}/ctop-${CTOP_VERSION}-linux-${ARCH_GO}" \
                "$REAL_HOME/.local/bin/ctop" \
                1000000 \
                "$CTOP_SHA256"
            user_do chmod +x "$REAL_HOME/.local/bin/ctop"
        fi
        user_do "$REAL_HOME/.local/bin/ctop" -v >/dev/null

        echo "Installing Tailscale..."
        if ! command -v tailscale &>/dev/null; then
            user_do curl -fsSL https://tailscale.com/install.sh | sys_do sh
        else
            echo "Tailscale already installed."
        fi
        sys_do systemctl enable --now tailscaled
        sys_do systemctl is-active --quiet tailscaled
        tailscale version >/dev/null
    fi
}


step_10() {
    if $IS_MACOS; then
        echo "SSH Server is not required on macOS (not managed by this script)"
        return 0
    fi

    echo "Setting up SSH Server with key-only root access..."

    # Install OpenSSH Server
    if ! command -v sshd &> /dev/null; then
        echo "Installing OpenSSH Server..."
        sys_do apt-get install -y openssh-server openssh-client
    fi

    # Enable SSH service
    echo "Enabling SSH service..."
    sys_do systemctl enable ssh
    sys_do systemctl start ssh

    # Backup original config
    if [ ! -f /etc/ssh/sshd_config.backup ]; then
        sys_do cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup
        echo "Backed up original sshd_config"
    fi

    # Keep password authentication for regular users, but never allow root
    # password login. A drop-in is idempotent and avoids rewriting vendor config.
    echo "Configuring SSH authentication defaults..."
    sys_do mkdir -p /etc/ssh/sshd_config.d
    printf '%s\n' \
        '# Managed by SetupVibe' \
        'PermitRootLogin prohibit-password' \
        'PasswordAuthentication yes' \
        | sys_do tee /etc/ssh/sshd_config.d/99-setupvibe.conf > /dev/null

    # Validate configuration
    if sys_do sshd -t &> /dev/null; then
        echo "SSH configuration validated successfully"
        sys_do systemctl restart ssh
        echo -e "${GREEN}✔ SSH Server configured and running${NC}"
    else
        echo -e "${RED}Error: SSH configuration failed validation${NC}"
        echo "Restoring original configuration..."
        sys_do cp /etc/ssh/sshd_config.backup /etc/ssh/sshd_config
        sys_do systemctl restart ssh
        return 1
    fi
}


step_11() {
    install_setupvibe_bin

    if $IS_MACOS; then
        # macOS already has zsh as default
        echo "ZSH is default on macOS"
        
        if [ ! -d "$REAL_HOME/.oh-my-zsh" ]; then
            user_do sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended
        fi

        git_ensure "https://github.com/zsh-users/zsh-autosuggestions" "$REAL_HOME/.oh-my-zsh/custom/plugins/zsh-autosuggestions"
        git_ensure "https://github.com/zsh-users/zsh-syntax-highlighting" "$REAL_HOME/.oh-my-zsh/custom/plugins/zsh-syntax-highlighting"

        echo "Installing Nerd Fonts (FiraCode & JetBrains Mono)..."
        brew_cmd tap homebrew/cask-fonts 2>/dev/null || true
        brew_cmd install --cask font-fira-code-nerd-font 2>/dev/null || true
        brew_cmd install --cask font-jetbrains-mono 2>/dev/null || true
        brew_cmd install --cask font-jetbrains-mono-nerd-font 2>/dev/null || true

        echo "Configuring Starship..."
        brew_cmd install starship
        user_do mkdir -p "$REAL_HOME/.config"

        echo "Applying Starship Preset: Gruvbox Rainbow..."
        user_do "$BREW_PREFIX/bin/starship" preset gruvbox-rainbow \
            --force -o "$REAL_HOME/.config/starship.toml"
        perl -i -pe 's/╭/┌/g; s/╰/└/g; s/\x{e0b6}/\x{e0b2}/g; s/\x{e0b4}/\x{e0b0}/g' "$REAL_HOME/.config/starship.toml"

        # macOS ZSHRC
        safe_download https://raw.githubusercontent.com/promovaweb/setupvibe/main/conf/zshrc-macos.zsh "$REAL_HOME/.zshrc"
    else
        sys_do apt-get install -y zsh

        if [ ! -d "$REAL_HOME/.oh-my-zsh" ]; then
            user_do sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended
        fi

        git_ensure "https://github.com/zsh-users/zsh-autosuggestions" "$REAL_HOME/.oh-my-zsh/custom/plugins/zsh-autosuggestions"
        git_ensure "https://github.com/zsh-users/zsh-syntax-highlighting" "$REAL_HOME/.oh-my-zsh/custom/plugins/zsh-syntax-highlighting"

        echo "Installing Nerd Fonts $NERD_FONTS_VERSION (FiraCode & JetBrains Mono)..."
        user_do mkdir -p "$REAL_HOME/.local/share/fonts"
        safe_download "https://github.com/ryanoasis/nerd-fonts/releases/download/v${NERD_FONTS_VERSION}/FiraCode.zip" /tmp/FiraCode.zip 1000000 || return 1
        user_do unzip -o -q /tmp/FiraCode.zip -d "$REAL_HOME/.local/share/fonts"
        safe_download "https://github.com/ryanoasis/nerd-fonts/releases/download/v${NERD_FONTS_VERSION}/JetBrainsMono.zip" /tmp/JetBrainsMono.zip 1000000 || return 1
        user_do unzip -o -q /tmp/JetBrainsMono.zip -d "$REAL_HOME/.local/share/fonts"
        sys_do chown -R "$REAL_USER:$REAL_GROUP" "$REAL_HOME/.local"
        user_do fc-cache -f >/dev/null


        echo "Configuring Starship..."
        if ! command -v starship &>/dev/null && [ ! -f "$REAL_HOME/.local/bin/starship" ]; then
            user_do mkdir -p "$REAL_HOME/.local/bin"
            curl -sS https://starship.rs/install.sh | user_do sh -s -- -y --bin-dir "$REAL_HOME/.local/bin"
        fi
        user_do mkdir -p "$REAL_HOME/.config"

        echo "Applying Starship Preset: Gruvbox Rainbow..."
        user_do "$REAL_HOME/.local/bin/starship" preset gruvbox-rainbow \
            --force -o "$REAL_HOME/.config/starship.toml"
        perl -i -pe 's/╭/┌/g; s/╰/└/g; s/\x{e0b6}/\x{e0b2}/g; s/\x{e0b4}/\x{e0b0}/g' "$REAL_HOME/.config/starship.toml"

        # Linux ZSHRC
        safe_download https://raw.githubusercontent.com/promovaweb/setupvibe/main/conf/zshrc-linux.zsh "$REAL_HOME/.zshrc"
        sys_do chown "$REAL_USER:$REAL_GROUP" "$REAL_HOME/.zshrc"

        # Ensure ~/.local/bin is in .bashrc so tools like uv are accessible in bash sessions
        if ! grep -q '\.local/bin' "$REAL_HOME/.bashrc" 2>/dev/null; then
            echo 'export PATH="$HOME/.local/bin:$PATH"' | user_do tee -a "$REAL_HOME/.bashrc" > /dev/null
        fi

        if [ "$SHELL" != "/bin/zsh" ] && [ "$SHELL" != "/usr/bin/zsh" ]; then
            sys_do chsh -s "$(command -v zsh)" "$REAL_USER"
        fi
    fi
}


step_12() {
    echo "Installing TPM (Tmux Plugin Manager)..."
    git_ensure "https://github.com/tmux-plugins/tpm" "$REAL_HOME/.tmux/plugins/tpm"

    echo "Downloading tmux-desktop.conf..."
    safe_download https://raw.githubusercontent.com/promovaweb/setupvibe/main/conf/tmux-desktop.conf "$REAL_HOME/.tmux.conf"

    # Also install to /root if running as root with a different REAL_HOME
    if [[ "$(id -u)" -eq 0 && "$REAL_HOME" != "/root" ]]; then
        mkdir -p /root/.tmux/plugins
        cp "$REAL_HOME/.tmux.conf" /root/.tmux.conf
        [[ -d "$REAL_HOME/.tmux/plugins/tpm" ]] && \
            ln -sfn "$REAL_HOME/.tmux/plugins/tpm" /root/.tmux/plugins/tpm 2>/dev/null || true
    fi

    if $IS_LINUX; then
        sys_do chown -R "$REAL_USER:$REAL_GROUP" "$REAL_HOME/.tmux" 2>/dev/null || true
        sys_do chown "$REAL_USER:$REAL_GROUP" "$REAL_HOME/.tmux.conf" 2>/dev/null || true
    fi

    echo "Restarting tmux to apply new config..."
    user_do pkill -x tmux 2>/dev/null || true
}


step_13() {
    local npm_bin
    local npm_path
    local npm_root
    local package
    local command_name
    local allowed_scripts
    local index
    local -a ai_packages=(
        "agentlytics"
        "@anthropic-ai/claude-code"
        "@openai/codex"
        "@github/copilot"
        "opencode-ai"
        "skills@latest"
    )
    local -a ai_commands=(
        agentlytics
        claude
        codex
        copilot
        opencode
        skills
    )
    local -a ai_allowed_scripts=(
        better-sqlite3
        @anthropic-ai/claude-code
        @openai/codex
        @github/copilot
        opencode-ai
        skills
    )

    npm_bin=$(command -v npm)
    npm_path=$(user_do "$npm_bin" config get prefix)
    npm_path="$npm_path/bin:$PATH"
    npm_root=$(user_do env PATH="$npm_path" "$npm_bin" root --global)

    for index in "${!ai_packages[@]}"; do
        package=${ai_packages[$index]}
        command_name=${ai_commands[$index]}
        allowed_scripts=${ai_allowed_scripts[$index]}
        echo "Installing $package..."
        user_do env PATH="$npm_path" "$npm_bin" install -g \
            --allow-scripts="$allowed_scripts" "$package"
        if [[ "$package" == "agentlytics" ]]; then
            user_do env \
                AGENTLYTICS_ROOT="$npm_root/agentlytics" \
                PATH="$npm_path" \
                node -e \
                'const Database = require(process.env.AGENTLYTICS_ROOT + "/node_modules/better-sqlite3"); const db = new Database(":memory:"); db.close();'
        else
            user_do env PATH="$npm_path" "$command_name" --version >/dev/null
        fi
    done

    echo "Installing Herdr..."
    install_herdr

    echo "Installing Antigravity CLI..."
    install_antigravity

    echo "Installing Spec-Kit (specify-cli)..."
    if ! user_do bash -c "export PATH=\$HOME/.local/bin:\$PATH; command -v specify" &>/dev/null; then
        user_do bash -c "export PATH=\$HOME/.local/bin:\$PATH; uv tool install specify-cli"
    else
        user_do bash -c "export PATH=\$HOME/.local/bin:\$PATH; uv tool upgrade specify-cli" 2>/dev/null || true
    fi
}


step_14() {
    local pm2_bin
    local pm2_override
    local pm2_override_dir
    local systemd_path

    if $IS_MACOS; then
        echo "Cleaning up Homebrew..."
        brew_cmd cleanup --prune=all

        echo "Cleaning SetupVibe temporary files..."
        rm -f /tmp/FiraCode.zip /tmp/JetBrainsMono.zip /tmp/go.tar.gz /tmp/ctop /tmp/starship 2>/dev/null || true
    else
        echo "Cleaning APT cache and orphaned packages..."
        sys_do apt-get autoremove -y -qq
        sys_do apt-get autoclean -qq
        sys_do apt-get clean -qq
        sys_do rm -rf /var/lib/apt/lists/*

        echo "Cleaning temp and log junk..."
        sys_do rm -rf /tmp/*.tar.gz /tmp/*.zip /tmp/ctop /tmp/starship 2>/dev/null || true
        sys_do journalctl --vacuum-time=7d 2>/dev/null || true

        echo "Cleaning user caches..."
        rm -rf "$REAL_HOME/.cache/pip" 2>/dev/null || true
        rm -rf "$REAL_HOME/.cache/composer" 2>/dev/null || true
        rm -rf "$REAL_HOME/.cache/yarn" 2>/dev/null || true
        rm -rf "$REAL_HOME/.npm/_npx" 2>/dev/null || true
        rm -rf "$REAL_HOME/.bundle/cache" 2>/dev/null || true
    fi

    echo "Configuring PM2 for auto-startup..."
    if pm2_bin=$(command -v pm2); then
        if $IS_MACOS; then
            local launch_agent_dir="$REAL_HOME/Library/LaunchAgents"
            local launch_agent_label="pm2.$REAL_USER"
            local launch_agent_plist="$launch_agent_dir/$launch_agent_label.plist"
            local real_uid
            local escaped_home
            local escaped_path
            local escaped_pm2_bin

            real_uid=$(id -u "$REAL_USER")
            escaped_home=$(printf '%s' "$REAL_HOME" |
                sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g; s/"/\&quot;/g')
            escaped_path=$(printf '%s' "$PATH" |
                sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g; s/"/\&quot;/g')
            escaped_pm2_bin=$(printf '%s' "$pm2_bin" |
                sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g; s/"/\&quot;/g')

            user_do mkdir -p "$launch_agent_dir" "$REAL_HOME/.pm2"
            user_do tee "$launch_agent_plist" >/dev/null <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>$launch_agent_label</string>
    <key>ProgramArguments</key>
    <array>
        <string>$escaped_pm2_bin</string>
        <string>resurrect</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>EnvironmentVariables</key>
    <dict>
        <key>HOME</key>
        <string>$escaped_home</string>
        <key>PATH</key>
        <string>$escaped_path</string>
        <key>PM2_HOME</key>
        <string>$escaped_home/.pm2</string>
    </dict>
    <key>StandardErrorPath</key>
    <string>$escaped_home/.pm2/launchd.err.log</string>
    <key>StandardOutPath</key>
    <string>$escaped_home/.pm2/launchd.out.log</string>
</dict>
</plist>
EOF
            plutil -lint "$launch_agent_plist"
            user_do launchctl bootout "gui/$real_uid/$launch_agent_label" 2>/dev/null || true
            user_do launchctl bootstrap "gui/$real_uid" "$launch_agent_plist"
            user_do launchctl enable "gui/$real_uid/$launch_agent_label"
            user_do "$pm2_bin" save
        else
            sys_do env PATH="$PATH" "$pm2_bin" startup systemd -u "$REAL_USER" --hp "$REAL_HOME"

            # PM2 appends its own default system paths to the generated unit,
            # which can reintroduce duplicates. Override the effective service
            # environment with the normalized installer PATH.
            pm2_override_dir="/etc/systemd/system/pm2-${REAL_USER}.service.d"
            pm2_override=$(mktemp)
            systemd_path=${PATH//\\/\\\\}
            systemd_path=${systemd_path//\"/\\\"}
            printf '[Service]\nEnvironment="PATH=%s"\n' "$systemd_path" > "$pm2_override"
            sys_do install -D -m 0644 "$pm2_override" \
                "$pm2_override_dir/10-setupvibe-path.conf"
            rm -f -- "$pm2_override"
            sys_do systemctl daemon-reload

            user_do "$pm2_bin" save
        fi
        echo -e "${GREEN}✔ PM2 configured for auto-startup${NC}"

        echo "Configuring PM2 defaults..."
        user_do "$pm2_bin" set pm2:autodump true
        user_do "$pm2_bin" set pm2:log_date_format "YYYY-MM-DD HH:mm:ss"

        echo "Downloading PM2 ecosystem configuration..."
        safe_download https://raw.githubusercontent.com/promovaweb/setupvibe/main/conf/ecosystem.config.js "$REAL_HOME/ecosystem.config.js"
        if $IS_LINUX; then
            sys_do chown "$REAL_USER:$REAL_GROUP" "$REAL_HOME/ecosystem.config.js"
        fi
        
        echo "Starting PM2 applications from ecosystem file..."
        user_do "$pm2_bin" start "$REAL_HOME/ecosystem.config.js"
        user_do "$pm2_bin" save
        
        echo -e "${GREEN}✔ PM2 defaults configured — applications started from ~/ecosystem.config.js${NC}"
    else
        echo -e "${YELLOW}⚠ PM2 not found — skipping auto-startup configuration.${NC}"
    fi
}


# --- MAIN EXECUTION ---


show_roadmap_and_wait
configure_git_interactive


echo -e "\n${GREEN}Starting SetupVibe Desktop installation...${NC}"


# Execution Loop
run_section 0 step_1
run_section 1 step_2
run_section 2 step_3
run_section 3 step_4
run_section 4 step_5
run_section 5 step_6
run_section 6 step_7
run_section 7 step_8
run_section 8 step_9
run_section 9 step_10
run_section 10 step_11
run_section 11 step_12
run_section 12 step_13
run_section 13 step_14


# --- FINALIZATION ---
echo ""
echo -e "${BLUE}========================================================${NC}"
echo -e "${BOLD}        SETUPVIBE DESKTOP - INSTALLATION SUMMARY        ${NC}"
echo -e "${BLUE}========================================================${NC}"
for i in "${!STEPS[@]}"; do
    echo -e "  [$(($i+1))] ${STEPS[$i]} ... ${STEP_STATUS[$i]}"
done
echo ""

if $INSTALL_FAILED; then
    echo -e "${RED}${BOLD}SetupVibe Desktop completed with errors.${NC}" >&2
    exit 1
fi

echo -e "${GREEN}${BOLD}SetupVibe Desktop Completed Successfully! 🚀${NC}"
echo ""
if $IS_LINUX; then
    echo -e "${YELLOW}${BOLD}IMPORTANT - Apply changes to your shell:${NC}"
    echo -e "${CYAN}Reload ZSH now:${NC}   exec zsh"
    echo -e "${CYAN}Or for Bash:${NC}      source ~/.bashrc"
    echo ""
    echo -e "${YELLOW}Or restart your terminal/logout and login again.${NC}"
else
    echo -e "${YELLOW}Please restart your terminal or logout/login to apply changes.${NC}"
fi
