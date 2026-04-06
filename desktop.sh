#!/bin/bash


# ==============================================================================
# SETUPVIBE.DEV - DESKTOP DEVELOPER EDITION (V2.4 - Cross Platform)
# ==============================================================================
# Maintainer:    promovaweb.com
# Contact:       contato@promovaweb.com
# Contributing:  https://github.com/promovaweb/setupvibe/blob/main/CONTRIBUTING.md
# ------------------------------------------------------------------------------
# Compatibility: macOS 12+, Zorin OS 18+, Ubuntu 24.04+, Debian 12+, Arch Linux
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
VERSION="0.41.6"
INSTALL_URL="https://desktop.setupvibe.dev"

echo -e "${CYAN}SetupVibe Desktop v${VERSION}${NC}"
echo ""

# --- ENVIRONMENT ---
export COMPOSER_ALLOW_SUPERUSER=1

# --- HELPERS ---

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
        sudo "$@"
    else
        "$@"
    fi
}

# Ensure cron is active and has example tasks
cron_ensure() {
    echo "Ensuring cron service is active and configured..."
    if [[ "$(uname -s)" == "Linux" ]]; then
        case "$PKG_MANAGER" in
            pacman)
                sys_do systemctl enable --now cronie 2>/dev/null || true
                ;;
            *)
                sys_do systemctl enable --now cron 2>/dev/null || true
                ;;
        esac
    fi

    local CRON_HEARTBEAT="0 * * * * echo \"Cron heartbeat: \$(date)\" >> /tmp/cron-heartbeat.log"
    local CRON_DISK="0 0 * * * df -h > \$HOME/cron-disk-usage.log"

    local CURRENT_CRON
    CURRENT_CRON=$(user_do crontab -l 2>/dev/null || echo "")

    local NEW_CRON="$CURRENT_CRON"
    local CHANGED=false

    if [[ ! "$CURRENT_CRON" == *"/tmp/cron-heartbeat.log"* ]]; then
        echo "Adding example cron task: hourly heartbeat"
        NEW_CRON="${NEW_CRON}\n${CRON_HEARTBEAT}"
        CHANGED=true
    fi

    if [[ ! "$CURRENT_CRON" == *"cron-disk-usage.log"* ]]; then
        echo "Adding example cron task: daily disk usage snapshot"
        NEW_CRON="${NEW_CRON}\n${CRON_DISK}"
        CHANGED=true
    fi

    if [ "$CHANGED" = true ]; then
        echo -e "$NEW_CRON" | grep -v '^$' | user_do crontab -
        echo -e "${GREEN}✔ Crontab updated with example tasks.${NC}"
    else
        echo "Crontab already has example tasks."
    fi
}

# --- CLEANUP APT KEYRINGS & SOURCES ---
if [[ "$(uname -s)" == "Linux" && -x /usr/bin/apt-get ]]; then
    echo -e "${YELLOW}Preparing APT environment...${NC}"
    # Ensure keyrings directory exists
    sys_do mkdir -p -m 755 /etc/apt/keyrings
    
    # Remove only legacy/old paths that are definitely not used anymore
    sys_do rm -f /usr/share/keyrings/deb.sury.org-php.gpg 2>/dev/null || true
    
    # --- ENSURE BASE TOOLS ---
    echo -e "${YELLOW}Ensuring base tools (gpg, curl, ca-certificates)...${NC}"
    export DEBIAN_FRONTEND=noninteractive
    
    # If we have errors in APT, we try to fix them by removing potentially broken lists managed by this script
    sys_do grep -rl 'docker\|nodesource\|charm\.sh\|cli\.github\|sury\|ondrej\|ansible\|codeiumdata\|windsurf\|antigravity\|pkg\.dev' \
        /etc/apt/sources.list.d/ 2>/dev/null | xargs -I {} sys_do rm -f "{}" 2>/dev/null || true

    sys_do apt-get update -y -qq
    sys_do apt-get install -y -q gnupg gnupg2 curl ca-certificates lsb-release software-properties-common apt-transport-https
    
    # Robust GPG detection
    GPG_CMD=""
    for p in $(which gpg 2>/dev/null) $(which gpg2 2>/dev/null) /usr/bin/gpg /usr/bin/gpg2 /bin/gpg /bin/gpg2 /usr/local/bin/gpg; do
        if [[ -x "$p" ]]; then
            GPG_CMD="$p"
            break
        fi
    done
    
    if [[ -z "$GPG_CMD" ]]; then
        GPG_CMD=$(find /usr/bin /bin /usr/local/bin -name "gpg" -o -name "gpg2" 2>/dev/null | head -n 1)
    fi
    
    [[ -z "$GPG_CMD" ]] && GPG_CMD="/usr/bin/gpg"
    echo -e "${GREEN}Using GPG: $GPG_CMD${NC}"
fi

# --- STEPS CONFIGURATION ---
STEPS=(
    "Base System & Build Tools"
    "Homebrew (Package Manager)"
    "PHP 8.4 Ecosystem (Laravel)"
    "Ruby Ecosystem (Rails)"
    "Languages (Go, Rust, Python + uv)"
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

# macOS must NOT be run as root
if $IS_MACOS && [[ "$(id -u)" -eq 0 ]]; then
    echo -e "${RED}Error: Do not run this script with sudo on macOS.${NC}"
    exit 1
fi

# --- 1. INITIAL PREPARATION ---

# Keep sudo alive during script execution (macOS)
if $IS_MACOS; then
    while true; do sudo -n true; sleep 60; kill -0 "$$" || exit; done 2>/dev/null &
fi

# Detect Real User
if [[ -n "$SUDO_USER" ]]; then
    REAL_USER="$SUDO_USER"
elif [[ "$(id -u)" -eq 0 ]]; then
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

if [[ "$REAL_USER" == "root" && -d "/home/linuxbrew/.linuxbrew" ]]; then
    _BREW_OWNER=$(stat -c '%U' /home/linuxbrew/.linuxbrew 2>/dev/null)
    if [[ -n "$_BREW_OWNER" && "$_BREW_OWNER" != "root" ]]; then
        REAL_USER="$_BREW_OWNER"
    fi
fi
REAL_HOME=$(getent passwd "$REAL_USER" 2>/dev/null | cut -d: -f6)
[[ -z "$REAL_HOME" ]] && REAL_HOME="$HOME"

# Detect Distro (Linux only)
if $IS_LINUX; then
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        DISTRO_ID=${ID,,}
        DISTRO_CODENAME=$VERSION_CODENAME
        OS_LIKE=$ID_LIKE
    else
        DISTRO_ID=$(lsb_release -is 2>/dev/null | tr '[:upper:]' '[:lower:]')
        DISTRO_CODENAME=$(lsb_release -cs 2>/dev/null)
        OS_LIKE=""
    fi

    # Map derivative distros
    if [[ "$DISTRO_ID" == "zorin" || "$DISTRO_ID" == "linuxmint" ]]; then
        DISTRO_ID="ubuntu"
        BASE_CODENAME=$(grep -oP '(?<=UBUNTU_CODENAME=).*' /etc/os-release 2>/dev/null)
        if [[ -n "$BASE_CODENAME" ]]; then
            DISTRO_CODENAME="$BASE_CODENAME"
        fi
    fi

    IS_UBUNTU=false
    IS_DEBIAN=false
    IS_ARCH=false
    PKG_MANAGER="apt"

    if [[ "$DISTRO_ID" == "ubuntu" ]]; then
        IS_UBUNTU=true
    elif [[ "$DISTRO_ID" == "debian" || "$OS_LIKE" == *"debian"* ]]; then
        IS_DEBIAN=true
    elif [[ "$DISTRO_ID" == "arch" || "$DISTRO_ID" == "cachyos" || "$OS_LIKE" == *"arch"* ]]; then
        IS_ARCH=true
        PKG_MANAGER="pacman"
    fi
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
    # Fallback para sistemas sem dpkg (como o Arch Linux)
    if command -v dpkg &>/dev/null; then
        ARCH_RAW=$(dpkg --print-architecture)
    else
        ARCH_RAW=$(uname -m)
        [[ "$ARCH_RAW" == "x86_64" ]] && ARCH_RAW="amd64"
        [[ "$ARCH_RAW" == "aarch64" ]] && ARCH_RAW="arm64"
    fi

    if [[ "$ARCH_RAW" == "amd64" ]]; then
        ARCH_GO="amd64"
    elif [[ "$ARCH_RAW" == "arm64" ]]; then
        ARCH_GO="arm64"
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
    case "$PKG_MANAGER" in
        pacman)
            sys_do pacman -Sy --noconfirm figlet git >/dev/null 2>&1
            ;;
        *)
            sys_do apt-get install -y figlet git >/dev/null 2>&1 || sys_do apt-get install -y --fix-missing figlet git >/dev/null
            ;;
    esac
fi


# --- UI & LOGIC FUNCTIONS ---

# Helper to install GPG keys safely
install_key() {
    local url=$1
    local dest=$2
    echo -e "${YELLOW}Installing key:${NC} $url ➜ $dest"
    sys_do mkdir -p -m 755 /etc/apt/keyrings
    # Try dearmor if GPG is available
    if [[ -n "$GPG_CMD" ]] && command -v "$GPG_CMD" >/dev/null 2>&1; then
        if curl -fsSL "$url" | "$GPG_CMD" --dearmor --yes | sys_do tee "$dest" > /dev/null; then
            sys_do chmod a+r "$dest"
            return 0
        fi
    fi
    # Fallback: download as-is (modern APT handles armored keys)
    if curl -fsSL "$url" | sys_do tee "$dest" > /dev/null; then
        sys_do chmod a+r "$dest"
        return 0
    fi
    echo -e "${RED}✘ Failed to install key from $url${NC}"
    return 1
}

# Helper function to run brew as regular user (not root)
brew_cmd() {
    if [[ "$(id -u)" -eq 0 && -n "$REAL_USER" && "$REAL_USER" != "root" ]]; then
        # Use runuser; cd to user home first (runuser inherits CWD and /root is not readable by others)
        # Redirect stdin from /dev/null to prevent brew from consuming the script when run via curl|bash
        ( cd "$REAL_HOME" && runuser -u "$REAL_USER" -- env HOME="$REAL_HOME" "$BREW_PREFIX/bin/brew" "$@" < /dev/null )
    else
        # Redirect stdin from /dev/null to prevent brew from consuming the script when run via curl|bash
        "$BREW_PREFIX/bin/brew" "$@" < /dev/null
    fi
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


    read -r key < /dev/tty
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
            read GIT_NAME < /dev/tty
        done


        while [[ -z "$GIT_EMAIL" ]]; do
            echo -ne "Enter your Email: "
            read GIT_EMAIL < /dev/tty
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
    echo ""
    echo -e "${BLUE}========================================================${NC}"
    echo -e "${BOLD}▶ [$(($index+1))/${#STEPS[@]}] $title ${NC}"
    echo -e "${BLUE}========================================================${NC}"
    if $2; then
        STEP_STATUS[$index]="${GREEN}✔ OK${NC}"
    else
        STEP_STATUS[$index]="${RED}✘ Error${NC}"
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
    sys_do chown -R $REAL_USER:$(id -gn $REAL_USER) "$dest" 2>/dev/null || true
}

safe_download() {
    local url=$1
    local dest=$2
    local min_bytes=${3:-100}
    local tmp
    tmp=$(mktemp)

    echo "Downloading: $url"
    if ! curl -fsSL --max-time 30 "$url" -o "$tmp" 2>/dev/null; then
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

    # Ensure parent directory exists and is writable
    local dest_dir
    dest_dir=$(dirname "$dest")
    if [ ! -d "$dest_dir" ]; then
        user_do mkdir -p "$dest_dir"
    fi

    user_do mv "$tmp" "$dest"
    echo -e "${GREEN}✔ Downloaded: $dest${NC}"
    return 0
}


# --- INSTALLATION STEPS ---


step_1() {
    if $IS_MACOS; then
        echo "macOS build tools are provided by Xcode Command Line Tools (already installed)"
        echo "Base tools via Homebrew will be installed after Homebrew is set up (Step 3)..."
    else
        case "$PKG_MANAGER" in
            pacman)
                echo "Updating Pacman..."
                sys_do pacman -Syu --noconfirm
                echo "Installing Base System & Tmux..."
                sys_do pacman -S --noconfirm base-devel git wget unzip fontconfig curl sshpass openssl zlib bzip2 readline sqlite llvm ncurses xz tk libxml2 libxmlsec libffi yaml autoconf bison procps-ng file tmux ffmpeg imagemagick cronie glow
                ;;
            *)
                echo "Updating APT..."
                sys_do apt-get update -qq
                echo "Installing Build Essentials & Tmux..."
                sys_do apt-get install -y build-essential git wget unzip fontconfig curl sshpass \
                    libssl-dev zlib1g-dev libbz2-dev libreadline-dev libsqlite3-dev llvm \
                    libncurses5-dev xz-utils tk-dev libxml2-dev libxmlsec1-dev libffi-dev liblzma-dev \
                    libyaml-dev autoconf bison procps file tmux ffmpeg imagemagick cron
    
                install_key "https://repo.charm.sh/apt/gpg.key" "/etc/apt/keyrings/charm.gpg"
                echo "deb [signed-by=/etc/apt/keyrings/charm.gpg] https://repo.charm.sh/apt/ * *" | sys_do tee /etc/apt/sources.list.d/charm.list
                sys_do apt-get update -qq
                ;;
        esac
    fi
}

step_2() {
    if $IS_MACOS; then
        echo "Checking Homebrew installation..."
        if ! command -v brew &>/dev/null; then
            echo "Installing Homebrew..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

            if [[ -f "$BREW_PREFIX/bin/brew" ]]; then
                eval "$($BREW_PREFIX/bin/brew shellenv)"
            fi
        fi

        if command -v brew &>/dev/null; then
            echo -e "${GREEN}✔ Homebrew is ready.${NC}"
            brew_cmd update
            brew_cmd upgrade
            brew_cmd install wget unzip curl tmux sshpass openssl readline sqlite3 xz zlib tcl-tk ffmpeg imagemagick
        else
            echo -e "${RED}✘ Homebrew installation failed.${NC}"
            return 1
        fi
    else
        echo "Checking Homebrew installation..."
        if [ ! -d "/home/linuxbrew/.linuxbrew" ] && [ ! -d "$REAL_HOME/.linuxbrew" ]; then
            echo "Installing Homebrew prerequisites..."
            case "$PKG_MANAGER" in
                pacman)
                    sys_do pacman -S --noconfirm base-devel procps-ng curl file git
                    ;;
                *)
                    sys_do apt-get install -y build-essential procps curl file git
                    ;;
            esac

            sys_do mkdir -p /home/linuxbrew
            sys_do chown -R "$REAL_USER" /home/linuxbrew 2>/dev/null || true
            sys_do chmod -R 775 /home/linuxbrew 2>/dev/null || true
            sys_do mkdir -p /home/linuxbrew/.linuxbrew
            sys_do chown -R "$REAL_USER" /home/linuxbrew/.linuxbrew 2>/dev/null || true

            if [[ "$REAL_USER" != "root" ]]; then
                echo "$REAL_USER ALL=(ALL) NOPASSWD:ALL" | sys_do tee /etc/sudoers.d/setupvibe-brew > /dev/null
                sys_do chmod 440 /etc/sudoers.d/setupvibe-brew
            fi

            if [[ "$REAL_USER" == "root" ]]; then
                echo -e "${RED}✘ Homebrew cannot be installed as root. Skipping.${NC}"
            else
                user_do env NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            fi
            sys_do rm -f /etc/sudoers.d/setupvibe-brew
        fi

        for CONFIG_FILE in "$REAL_HOME/.bashrc" "$REAL_HOME/.profile" "$REAL_HOME/.zshrc"; do
            if [ ! -f "$CONFIG_FILE" ]; then
                user_do touch "$CONFIG_FILE"
            fi
            if ! grep -q "linuxbrew" "$CONFIG_FILE"; then
                echo -e "\n# Homebrew Configuration" | user_do tee -a "$CONFIG_FILE" > /dev/null
                echo 'if [ -d "/home/linuxbrew/.linuxbrew" ]; then eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"; fi' | user_do tee -a "$CONFIG_FILE" > /dev/null
                echo 'if [ -d "$HOME/.linuxbrew" ]; then eval "$($HOME/.linuxbrew/bin/brew shellenv)"; fi' | user_do tee -a "$CONFIG_FILE" > /dev/null
            fi
        done

        if [ -f "/home/linuxbrew/.linuxbrew/bin/brew" ]; then
            eval "$(cd "$REAL_HOME" && runuser -u "$REAL_USER" -- env HOME="$REAL_HOME" /home/linuxbrew/.linuxbrew/bin/brew shellenv 2>/dev/null)"
            export PATH="/home/linuxbrew/.linuxbrew/bin:/home/linuxbrew/.linuxbrew/sbin:$PATH"
        elif [ -f "$REAL_HOME/.linuxbrew/bin/brew" ]; then
            eval "$(cd "$REAL_HOME" && runuser -u "$REAL_USER" -- env HOME="$REAL_HOME" "$REAL_HOME/.linuxbrew/bin/brew" shellenv 2>/dev/null)"
            export PATH="$REAL_HOME/.linuxbrew/bin:$REAL_HOME/.linuxbrew/sbin:$PATH"
        fi

        if command -v brew &>/dev/null; then
            brew_cmd update
            brew_cmd upgrade
        fi
    fi
}

step_3() {
    if $IS_MACOS; then
        echo "Installing PHP 8.4 via Homebrew..."
        brew_cmd install php@8.4
        brew_cmd link php@8.4 --force --overwrite
        user_do pecl install redis 2>/dev/null || true
        user_do pecl install xdebug 2>/dev/null || true
        printf "\n" | user_do pecl install imagick 2>/dev/null || true
        
        if [ ! -f "$REAL_HOME/.local/bin/composer" ] && ! command -v composer &>/dev/null; then
            brew_cmd install composer
        else
            user_do composer self-update
        fi
        user_do composer global require laravel/installer
    else
        case "$PKG_MANAGER" in
            pacman)
                echo "Installing PHP Ecosystem (Pacman)..."
                sys_do pacman -S --noconfirm php php-cgi php-fpm php-gd php-intl php-pgsql php-sqlite php-redis xdebug composer
                ;;
            *)
                if $IS_UBUNTU; then
                    sys_do add-apt-repository ppa:ondrej/php -y
                elif $IS_DEBIAN; then
                    PHP_CODENAME="$DISTRO_CODENAME"
                    case "$DISTRO_CODENAME" in
                        trixie|forky|sid|experimental) PHP_CODENAME="bookworm" ;;
                    esac
                    install_key "https://packages.sury.org/php/apt.gpg" "/etc/apt/keyrings/php.gpg"
                    echo "deb [signed-by=/etc/apt/keyrings/php.gpg] https://packages.sury.org/php/ $PHP_CODENAME main" | sys_do tee /etc/apt/sources.list.d/php.list
                fi
                sys_do apt-get update -qq
                sys_do apt-get install -y php8.4 php8.4-cli php8.4-common php8.4-dev \
                    php8.4-curl php8.4-mbstring php8.4-xml php8.4-zip php8.4-bcmath php8.4-intl \
                    php8.4-mysql php8.4-pgsql php8.4-sqlite3 php8.4-gd php8.4-imagick \
                    php8.4-redis php8.4-mongodb php8.4-yaml php8.4-xdebug
                ;;
        esac

        echo 'export COMPOSER_ALLOW_SUPERUSER=1' | sys_do tee /etc/profile.d/composer.sh > /dev/null
        sys_do chmod +x /etc/profile.d/composer.sh
        export COMPOSER_ALLOW_SUPERUSER=1

        # Check for composer in .local/bin or system path
        export PATH="$REAL_HOME/.local/bin:$PATH"
        if ! command -v composer &>/dev/null && [ ! -f "$REAL_HOME/.local/bin/composer" ]; then
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
        brew_cmd install rbenv ruby-build
        if ! user_do rbenv versions --bare | grep -q "^3.3.0$"; then
            user_do bash -c "export RUBY_CONFIGURE_OPTS='--disable-install-doc'; export MAKE_OPTS='-j\$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 2)'; rbenv install 3.3.0"
            user_do rbenv global 3.3.0
        fi
        eval "$(user_do rbenv init -)"
        user_do gem install bundler rails --no-document
    else
        git_ensure "https://github.com/rbenv/rbenv.git" "$REAL_HOME/.rbenv"
        git_ensure "https://github.com/rbenv/ruby-build.git" "$REAL_HOME/.rbenv/plugins/ruby-build"
        sys_do chown -R $REAL_USER:$(id -gn $REAL_USER) "$REAL_HOME/.rbenv"
        user_do bash -c "cd '$REAL_HOME/.rbenv' && src/configure && make -C src" >/dev/null 2>&1

        user_do bash -c 'echo "gem: --no-document" > "$HOME/.gemrc"'
        if ! user_do bash -c 'export PATH="$HOME/.rbenv/bin:$PATH"; eval "$(rbenv init -)"; rbenv versions --bare | grep -q "^3.3.0$"'; then
            echo "Compiling Ruby 3.3.0 (this may take a few minutes)..."
            # Use $HOME/.tmp as TMPDIR to avoid noexec on /tmp (common in cloud VMs)
            user_do bash -c 'mkdir -p "$HOME/.tmp"; export TMPDIR="$HOME/.tmp"; export PATH="$HOME/.rbenv/bin:$PATH"; eval "$(rbenv init -)"; export RUBY_CONFIGURE_OPTS="--disable-install-doc"; export MAKE_OPTS="-j$(nproc 2>/dev/null || echo 2)"; rbenv install 3.3.0 && rbenv global 3.3.0'
        fi

        echo "Installing Rails..."
        user_do bash -c 'export PATH="$HOME/.rbenv/bin:$PATH"; eval "$(rbenv init -)"; rbenv rehash; gem install bundler rails --no-document'
    fi
}

step_5() {
    if $IS_MACOS; then
        brew_cmd install python@3.12
        if ! command -v uv &> /dev/null; then
            user_do curl -LsSf https://astral.sh/uv/install.sh | sh
        else
            user_do uv self update
        fi
        brew_cmd install go
        
        echo "Setup Rust..."
        if ! user_do bash -c "command -v rustup" &> /dev/null; then
            user_do sh -c "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y"
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
        case "$PKG_MANAGER" in
            pacman)
                sys_do pacman -S --noconfirm python python-pip python-virtualenv
                ;;
            *)
                sys_do apt-get install -y python3 python3-pip python3-venv python-is-python3
                ;;
        esac

        if ! user_do bash -c "export PATH=\$HOME/.local/bin:\$PATH; command -v uv" &> /dev/null; then
            user_do bash -c "curl -LsSf https://astral.sh/uv/install.sh | sh"
        else
            user_do bash -c "export PATH=\$HOME/.local/bin:\$PATH; uv self update"
        fi
        export PATH="$REAL_HOME/.local/bin:$PATH"

        GO_VER="1.22.2"
        if [ ! -d "$REAL_HOME/.local/go" ]; then
            user_do mkdir -p "$REAL_HOME/.local"
            wget -q "https://go.dev/dl/go${GO_VER}.linux-${ARCH_GO}.tar.gz" -O /tmp/go.tar.gz
            user_do tar -C "$REAL_HOME/.local" -xzf /tmp/go.tar.gz && rm /tmp/go.tar.gz
        fi
        export PATH="$REAL_HOME/.local/go/bin:$PATH"

        if [ ! -f "$REAL_HOME/.cargo/bin/rustup" ]; then
            user_do sh -c "curl --proto \'=https\' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y"
        else
            user_do bash -c "export PATH=\$HOME/.cargo/bin:\$PATH; rustup update"
        fi
        export PATH="$REAL_HOME/.cargo/bin:$PATH"

        if ! user_do bash -c "export PATH=\$HOME/.local/bin:\$PATH; command -v cronboard" &> /dev/null; then
            user_do bash -c "export PATH=\$HOME/.local/bin:\$PATH; uv tool install git+https://github.com/antoniorodr/cronboard"
        fi
        cron_ensure
    fi
}

step_6() {
    if $IS_MACOS; then
        brew_cmd install node@24
        brew_cmd link node@24 --force --overwrite
        user_do npm install -g pnpm npm@latest
        user_do npm install -g pm2 @n8n/cli
        user_do curl -fsSL https://bun.sh/install | bash
    else
        case "$PKG_MANAGER" in
            pacman)
                sys_do pacman -S --noconfirm nodejs npm
                ;;
            *)
                install_key "https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key" "/etc/apt/keyrings/nodesource.gpg"
                echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_24.x nodistro main" | sys_do tee /etc/apt/sources.list.d/nodesource.list
                sys_do apt-get update -qq
                sys_do apt-get install -y nodejs
                ;;
        esac
        
        if [[ "$(id -u)" -ne 0 ]]; then
            user_do mkdir -p "$REAL_HOME/.npm-global"
            user_do npm config set prefix "$REAL_HOME/.npm-global"
            export PATH="$REAL_HOME/.npm-global/bin:$PATH"
        fi
        user_do npm install -g pnpm npm@latest
        user_do npm install -g pm2 @n8n/cli
        user_do bash -c "curl -fsSL https://bun.sh/install | bash"
    fi
}

step_7() {
    if $IS_MACOS; then
        if ! command -v docker &>/dev/null; then
            brew_cmd install --cask docker || echo -e "${YELLOW}Please download Docker Desktop manually${NC}"
        fi
        brew_cmd install ansible
        brew_cmd install gh
    else
        case "$PKG_MANAGER" in
            pacman)
                sys_do pacman -S --noconfirm docker docker-compose docker-buildx ansible github-cli
                ;;
            *)
                DOCKER_CODENAME="$DISTRO_CODENAME"
                if $IS_DEBIAN; then
                    case "$DISTRO_CODENAME" in
                        trixie|forky|sid|experimental) DOCKER_CODENAME="bookworm" ;;
                    esac
                fi
                install_key "https://download.docker.com/linux/$DISTRO_ID/gpg" "/etc/apt/keyrings/docker.gpg"
                echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$DISTRO_ID $DOCKER_CODENAME stable" | sys_do tee /etc/apt/sources.list.d/docker.list
                sys_do apt-get update -qq
                sys_do apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin docker-buildx-plugin
                
                if $IS_UBUNTU; then
                    sys_do add-apt-repository --yes --update ppa:ansible/ansible
                    sys_do apt-get install -y ansible
                elif $IS_DEBIAN; then
                    sys_do apt-get install -y ansible-core
                fi
    
                wget -qO- https://cli.github.com/packages/githubcli-archive-keyring.gpg | sys_do tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null
                sys_do chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg
                echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sys_do tee /etc/apt/sources.list.d/github-cli.list > /dev/null
                sys_do apt-get update -qq && sys_do apt-get install -y gh
                ;;
        esac

        sys_do usermod -aG docker "$REAL_USER"
        sys_do systemctl enable --now docker
    fi

    user_do mkdir -p "$REAL_HOME/.setupvibe/portainer_data"
    safe_download https://raw.githubusercontent.com/promovaweb/setupvibe/main/conf/portainer-compose.yml "$REAL_HOME/.setupvibe/portainer-compose.yml"
    sys_do chown -R "$REAL_USER:$(id -gn $REAL_USER)" "$REAL_HOME/.setupvibe"

    if command -v docker &>/dev/null && sys_do docker info &>/dev/null; then
        sys_do docker compose -f "$REAL_HOME/.setupvibe/portainer-compose.yml" up -d
    fi
}

step_8() {
    TOOLS="bat eza zoxide fzf ripgrep fd lazygit lazydocker neovim glow tldr fastfetch duf jq mise"
    
    if $IS_MACOS; then
        brew_cmd install $TOOLS
        if [ -d "$BREW_PREFIX/opt/fzf" ]; then
            user_do "$BREW_PREFIX/opt/fzf/install" --all --no-bash --no-fish 2>/dev/null || true
        fi
    else
        case "$PKG_MANAGER" in
            pacman)
                sys_do pacman -S --noconfirm $TOOLS
                ;;
            *)
                if command -v brew &>/dev/null; then
                    brew_cmd install $TOOLS || brew_cmd upgrade $TOOLS
                    local FZF_OPT="/home/linuxbrew/.linuxbrew/opt/fzf"
                    [ ! -d "$FZF_OPT" ] && FZF_OPT="$REAL_HOME/.linuxbrew/opt/fzf"
                    if [ -d "$FZF_OPT" ]; then
                        user_do "$FZF_OPT/install" --all --no-bash --no-fish >/dev/null 2>&1
                    fi
                else
                    return 1
                fi
                ;;
        esac
    fi
}

step_9() {
    if $IS_MACOS; then
        brew_cmd install wget nmap mtr htop btop glances speedtest-cli ctop tailscale
        for tool in bandwhich gping trippy rustscan; do
            if ! command -v $tool &> /dev/null; then user_do cargo install $tool; fi
        done
    else
        case "$PKG_MANAGER" in
            pacman)
                sys_do pacman -S --noconfirm rsync net-tools bind mtr nmap tcpdump iftop nload iotop sysstat whois iputils speedtest-cli glances htop btop
                ;;
            *)
                sys_do apt-get install -y rsync net-tools dnsutils mtr-tiny nmap tcpdump iftop nload iotop sysstat whois iputils-ping speedtest-cli glances htop btop
                ;;
        esac

        for tool in bandwhich gping trippy rustscan; do
            if ! user_do bash -c "export PATH=\$HOME/.cargo/bin:\$PATH; command -v $tool" &> /dev/null; then
                 user_do bash -c "export PATH=\$HOME/.cargo/bin:\$PATH; cargo install $tool"
            fi
        done

        if ! command -v ctop &>/dev/null && [ ! -f "$REAL_HOME/.local/bin/ctop" ]; then
            user_do mkdir -p "$REAL_HOME/.local/bin"
            wget -q "https://github.com/bcicen/ctop/releases/download/v0.7.7/ctop-0.7.7-linux-${ARCH_GO}" -O /tmp/ctop
            user_do mv /tmp/ctop "$REAL_HOME/.local/bin/ctop"
            user_do chmod +x "$REAL_HOME/.local/bin/ctop"
        fi

        if ! command -v tailscale &>/dev/null; then
            user_do curl -fsSL https://tailscale.com/install.sh | sys_do sh
        fi
    fi
}

step_10() {
    if $IS_MACOS; then return 0; fi

    case "$PKG_MANAGER" in
        pacman)
            if ! command -v sshd &> /dev/null; then
                sys_do pacman -S --noconfirm openssh
            fi
            SSH_SERVICE="sshd"
            ;;
        *)
            if ! command -v sshd &> /dev/null; then
                sys_do apt-get install -y openssh-server openssh-client
            fi
            SSH_SERVICE="ssh"
            ;;
    esac

    sys_do systemctl enable $SSH_SERVICE
    sys_do systemctl start $SSH_SERVICE

    if [ ! -f /etc/ssh/sshd_config.backup ]; then
        sys_do cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup
    fi

    sys_do sed -i 's/^#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config
    sys_do sed -i 's/^PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config
    sys_do sed -i 's/^#PermitRootLogin no/PermitRootLogin yes/' /etc/ssh/sshd_config
    sys_do sed -i 's/^PermitRootLogin no/PermitRootLogin yes/' /etc/ssh/sshd_config
    sys_do sed -i 's/^#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config
    sys_do sed -i 's/^PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config

    if sys_do sshd -t &> /dev/null; then
        sys_do systemctl restart $SSH_SERVICE
    else
        sys_do cp /etc/ssh/sshd_config.backup /etc/ssh/sshd_config
        sys_do systemctl restart $SSH_SERVICE
        return 1
    fi
}

step_11() {
    if $IS_MACOS; then
        if [ ! -d "$REAL_HOME/.oh-my-zsh" ]; then
            user_do sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended
        fi
        git_ensure "https://github.com/zsh-users/zsh-autosuggestions" "$REAL_HOME/.oh-my-zsh/custom/plugins/zsh-autosuggestions"
        git_ensure "https://github.com/zsh-users/zsh-syntax-highlighting" "$REAL_HOME/.oh-my-zsh/custom/plugins/zsh-syntax-highlighting"

        brew_cmd tap homebrew/cask-fonts 2>/dev/null || true
        brew_cmd install --cask font-fira-code-nerd-font font-jetbrains-mono font-jetbrains-mono-nerd-font 2>/dev/null || true

        brew_cmd install starship
        user_do mkdir -p "$REAL_HOME/.config"
        user_do starship preset gruvbox-rainbow -o "$REAL_HOME/.config/starship.toml"
        perl -i -pe 's/╭/┌/g; s/╰/└/g; s/\x{e0b6}/\x{e0b2}/g; s/\x{e0b4}/\x{e0b0}/g' "$REAL_HOME/.config/starship.toml"
        safe_download https://raw.githubusercontent.com/promovaweb/setupvibe/main/conf/zshrc-macos.zsh "$REAL_HOME/.zshrc"
    else
        case "$PKG_MANAGER" in
            pacman)
                sys_do pacman -S --noconfirm zsh unzip
                ;;
            *)
                sys_do apt-get install -y zsh
                ;;
        esac

        if [ ! -d "$REAL_HOME/.oh-my-zsh" ]; then
            user_do sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended
        fi
        git_ensure "https://github.com/zsh-users/zsh-autosuggestions" "$REAL_HOME/.oh-my-zsh/custom/plugins/zsh-autosuggestions"
        git_ensure "https://github.com/zsh-users/zsh-syntax-highlighting" "$REAL_HOME/.oh-my-zsh/custom/plugins/zsh-syntax-highlighting"

        user_do mkdir -p "$REAL_HOME/.local/share/fonts"
        wget -q --show-progress -O /tmp/FiraCode.zip https://github.com/ryanoasis/nerd-fonts/releases/download/v3.1.1/FiraCode.zip
        user_do unzip -o -q /tmp/FiraCode.zip -d "$REAL_HOME/.local/share/fonts"
        wget -q --show-progress -O /tmp/JetBrainsMono.zip https://github.com/ryanoasis/nerd-fonts/releases/download/v3.1.1/JetBrainsMono.zip
        user_do unzip -o -q /tmp/JetBrainsMono.zip -d "$REAL_HOME/.local/share/fonts"
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/JetBrains/JetBrainsMono/master/install_manual.sh)"
        sys_do chown -R $REAL_USER:$REAL_USER "$REAL_HOME/.local"
        user_do fc-cache -f >/dev/null

        if ! command -v starship &>/dev/null && [ ! -f "$REAL_HOME/.local/bin/starship" ]; then
            user_do mkdir -p "$REAL_HOME/.local/bin"
            curl -sS https://starship.rs/install.sh | user_do sh -s -- -y --bin-dir "$REAL_HOME/.local/bin"
        fi
        user_do mkdir -p "$REAL_HOME/.config"
        user_do starship preset gruvbox-rainbow -o "$REAL_HOME/.config/starship.toml"
        perl -i -pe 's/╭/┌/g; s/╰/└/g; s/\x{e0b6}/\x{e0b2}/g; s/\x{e0b4}/\x{e0b0}/g' "$REAL_HOME/.config/starship.toml"

        safe_download https://raw.githubusercontent.com/promovaweb/setupvibe/main/conf/zshrc-linux.zsh "$REAL_HOME/.zshrc"
        sys_do chown $REAL_USER:$REAL_USER "$REAL_HOME/.zshrc"

        # Ensure ~/.local/bin is in .bashrc so tools like uv are accessible in bash sessions
        if ! grep -q '\.local/bin' "$REAL_HOME/.bashrc" 2>/dev/null; then
            echo 'export PATH="$HOME/.local/bin:$PATH"' | user_do tee -a "$REAL_HOME/.bashrc" > /dev/null
        fi

        if [ "$SHELL" != "/bin/zsh" ] && [ "$SHELL" != "/usr/bin/zsh" ]; then
            sys_do chsh -s $(which zsh) $REAL_USER
        fi
    fi
}

step_12() {
    case "$PKG_MANAGER" in
        pacman)
            sys_do pacman -S --noconfirm tmux
            ;;
        apt)
            sys_do apt-get install -y tmux
            ;;
        *)
            if $IS_MACOS; then
                brew_cmd install tmux
            else
                sys_do apt-get install -y tmux
            fi
            ;;
    esac

    # ... (mantenha o restante da função que configura o tpm/plugins se houver)
}

step_13() {
    AI_TOOLS=(
        "agentlytics"
        "@anthropic-ai/claude-code"
        "@google/gemini-cli"
        "@openai/codex"
        "@githubnext/github-copilot-cli"
    )

    for pkg in "${AI_TOOLS[@]}"; do
        user_do npm install -g "$pkg" 2>/dev/null || echo -e "${YELLOW}⚠ Failed to install $pkg${NC}"
    done

    echo "Installing Spec-Kit (specify-cli)..."
    if ! user_do bash -c "export PATH=\$HOME/.local/bin:\$PATH; command -v specify" &>/dev/null; then
        user_do bash -c "export PATH=\$HOME/.local/bin:\$PATH; uv tool install specify-cli"
    else
        user_do bash -c "export PATH=\$HOME/.local/bin:\$PATH; uv tool upgrade specify-cli" 2>/dev/null || true
    fi
}

step_14() {
    if $IS_MACOS; then
        brew_cmd cleanup --prune=all
        brew_cmd autoremove
        sys_do rm -rf /private/tmp/* /private/var/folders/*/*/*/com.apple.* 2>/dev/null || true
        rm -rf "$REAL_HOME/Library/Caches/"* "$REAL_HOME/.Trash/"* 2>/dev/null || true
    else
        case "$PKG_MANAGER" in
            pacman)
                sys_do pacman -Sc --noconfirm
                sys_do pacman -Rns $(pacman -Qdtq) 2>/dev/null || true
                ;;
            *)
                sys_do apt-get autoremove -y -qq
                sys_do apt-get autoclean -qq
                sys_do apt-get clean -qq
                sys_do rm -rf /var/lib/apt/lists/*
                ;;
        esac

        sys_do rm -rf /tmp/*.tar.gz /tmp/*.zip /tmp/ctop /tmp/starship 2>/dev/null || true
        sys_do journalctl --vacuum-time=7d 2>/dev/null || true

        rm -rf "$REAL_HOME/.cache/pip" "$REAL_HOME/.cache/composer" "$REAL_HOME/.cache/yarn" "$REAL_HOME/.npm/_npx" "$REAL_HOME/.bundle/cache" 2>/dev/null || true
    fi

    if command -v pm2 &>/dev/null; then
        if $IS_MACOS; then
            user_do pm2 startup launchd -u $REAL_USER --hp $REAL_HOME
        else
            user_do pm2 startup systemd -u $REAL_USER --hp $REAL_HOME
        fi
        user_do pm2 save
        user_do pm2 set pm2:autodump true
        user_do pm2 set pm2:log_date_format "YYYY-MM-DD HH:mm:ss"
        safe_download https://raw.githubusercontent.com/promovaweb/setupvibe/main/conf/ecosystem.config.js "$REAL_HOME/ecosystem.config.js"
        sys_do chown "$REAL_USER:$(id -gn $REAL_USER)" "$REAL_HOME/ecosystem.config.js"
        user_do pm2 start "$REAL_HOME/ecosystem.config.js"
        user_do pm2 save
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