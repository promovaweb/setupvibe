#!/bin/bash


# ==============================================================================
# SETUPVIBE.DEV - DESKTOP DEVELOPER EDITION (V2.3 - Cross Platform)
# ==============================================================================
# Maintainer:    promovaweb.com
# Contact:       contato@promovaweb.com
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
VERSION="0.41.5"
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
    
    # If we have errors in APT, we try to fix them by removing potentially broken lists managed by this script
    # This prevents the error you saw: signature verification failed because keys were deleted
    sys_do grep -rl 'docker\|nodesource\|charm\.sh\|cli\.github\|sury\|ondrej\|ansible\|codeiumdata\|windsurf\|antigravity\|pkg\.dev' \
        /etc/apt/sources.list.d/ 2>/dev/null | xargs -I {} sys_do rm -f "{}" 2>/dev/null || true

    sys_do apt-get update -y -qq
    sys_do apt-get install -y -q gnupg gnupg2 curl ca-certificates lsb-release software-properties-common apt-transport-https
    
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
    sys_do apt-get install -y figlet git >/dev/null 2>&1 || sys_do apt-get install -y --fix-missing figlet git >/dev/null
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
        ( cd "$REAL_HOME" && runuser -u "$REAL_USER" -- env HOME="$REAL_HOME" "$BREW_PREFIX/bin/brew" "$@" )
    else
        "$BREW_PREFIX/bin/brew" "$@"
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
            echo "Updating Homebrew and upgrading existing packages..."
            brew_cmd update
            brew_cmd upgrade
            
            echo "Installing base tools via Homebrew..."
            brew_cmd install wget unzip curl tmux sshpass openssl readline sqlite3 xz zlib tcl-tk ffmpeg imagemagick
        else
            echo -e "${RED}✘ Homebrew installation failed.${NC}"
            return 1
        fi
    else
        echo "Checking Homebrew installation..."
        if [ ! -d "/home/linuxbrew/.linuxbrew" ] && [ ! -d "$REAL_HOME/.linuxbrew" ]; then
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

            # Temporarily allow REAL_USER to use sudo without password for Homebrew installation
            # This is required because the installer checks for sudo even in non-interactive mode
            if [[ "$REAL_USER" != "root" ]]; then
                echo "Temporarily allowing $REAL_USER to use sudo without password for Homebrew installation..."
                echo "$REAL_USER ALL=(ALL) NOPASSWD:ALL" | sys_do tee /etc/sudoers.d/setupvibe-brew > /dev/null
                sys_do chmod 440 /etc/sudoers.d/setupvibe-brew
            fi

            # Install Homebrew
            if [[ "$REAL_USER" == "root" ]]; then
                echo -e "${RED}✘ Homebrew cannot be installed as root. Skipping.${NC}"
            else
                # Run installer as REAL_USER
                user_do env NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            fi

            # Cleanup temporary sudoers rule
            sys_do rm -f /etc/sudoers.d/setupvibe-brew
        fi

        # Configure Homebrew PATH in shell profiles
        echo "Configuring Homebrew PATH in shell profiles..."
        for CONFIG_FILE in "$REAL_HOME/.bashrc" "$REAL_HOME/.profile" "$REAL_HOME/.zshrc"; do
            # Create config file if it doesn't exist
            if [ ! -f "$CONFIG_FILE" ]; then
                user_do touch "$CONFIG_FILE"
            fi
            
            # Add Homebrew configuration if not present
            if ! grep -q "linuxbrew" "$CONFIG_FILE"; then
                echo -e "\n# Homebrew Configuration" | user_do tee -a "$CONFIG_FILE" > /dev/null
                echo 'if [ -d "/home/linuxbrew/.linuxbrew" ]; then eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"; fi' | user_do tee -a "$CONFIG_FILE" > /dev/null
                echo 'if [ -d "$HOME/.linuxbrew" ]; then eval "$($HOME/.linuxbrew/bin/brew shellenv)"; fi' | user_do tee -a "$CONFIG_FILE" > /dev/null
                echo -e "${GREEN}✔ Added Homebrew to $CONFIG_FILE${NC}"
            fi
        done

        # Load brew environment for this script session
        echo "Loading Homebrew environment for current session..."
        if [ -f "/home/linuxbrew/.linuxbrew/bin/brew" ]; then
            eval "$(cd "$REAL_HOME" && runuser -u "$REAL_USER" -- env HOME="$REAL_HOME" /home/linuxbrew/.linuxbrew/bin/brew shellenv 2>/dev/null)"
            export PATH="/home/linuxbrew/.linuxbrew/bin:/home/linuxbrew/.linuxbrew/sbin:$PATH"
        elif [ -f "$REAL_HOME/.linuxbrew/bin/brew" ]; then
            eval "$(cd "$REAL_HOME" && runuser -u "$REAL_USER" -- env HOME="$REAL_HOME" "$REAL_HOME/.linuxbrew/bin/brew" shellenv 2>/dev/null)"
            export PATH="$REAL_HOME/.linuxbrew/bin:$REAL_HOME/.linuxbrew/sbin:$PATH"
        fi

        # Verify brew is accessible
        if command -v brew &>/dev/null; then
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
        echo "Installing PHP 8.4 via Homebrew..."
        brew_cmd install php@8.4
        brew_cmd link php@8.4 --force --overwrite
        
        # Install common extensions via PECL
        echo "Installing PHP Extensions..."
        user_do pecl install redis 2>/dev/null || true
        user_do pecl install xdebug 2>/dev/null || true
        printf "\n" | user_do pecl install imagick 2>/dev/null || true
        
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
            # Sury repo supports Debian stable releases; fall back to bookworm for unsupported codenames
            PHP_CODENAME="$DISTRO_CODENAME"
            case "$DISTRO_CODENAME" in
                trixie|forky|sid|experimental) PHP_CODENAME="bookworm" ;;
            esac
            install_key "https://packages.sury.org/php/apt.gpg" "/etc/apt/keyrings/php.gpg"
            echo "deb [signed-by=/etc/apt/keyrings/php.gpg] https://packages.sury.org/php/ $PHP_CODENAME main" | sys_do tee /etc/apt/sources.list.d/php.list
        else
            echo -e "${YELLOW}⚠ Unknown Linux distribution. Skipping PHP repository configuration.${NC}"
        fi
        
        sys_do apt-get update -qq
        echo "Installing PHP 8.4 & Extensions..."
        sys_do apt-get install -y php8.4 php8.4-cli php8.4-common php8.4-dev \
            php8.4-curl php8.4-mbstring php8.4-xml php8.4-zip php8.4-bcmath php8.4-intl \
            php8.4-mysql php8.4-pgsql php8.4-sqlite3 php8.4-gd php8.4-imagick \
            php8.4-redis php8.4-mongodb php8.4-yaml php8.4-xdebug


        echo "Persisting COMPOSER_ALLOW_SUPERUSER=1..."
        echo 'export COMPOSER_ALLOW_SUPERUSER=1' | sys_do tee /etc/profile.d/composer.sh > /dev/null
        sys_do chmod +x /etc/profile.d/composer.sh
        export COMPOSER_ALLOW_SUPERUSER=1

        # Check for composer in .local/bin or system path
        if ! command -v composer &>/dev/null && [ ! -f "$REAL_HOME/.local/bin/composer" ]; then
            echo "Installing Composer to $REAL_HOME/.local/bin..."
            user_do mkdir -p "$REAL_HOME/.local/bin"
            curl -sS https://getcomposer.org/installer | user_do php
            user_do mv composer.phar "$REAL_HOME/.local/bin/composer"
            user_do chmod +x "$REAL_HOME/.local/bin/composer"
        else
            user_do composer self-update 2>/dev/null || sys_do composer self-update
        fi
        export PATH="$REAL_HOME/.local/bin:$PATH"
        echo "Setup Laravel Installer..."
        user_do composer global require laravel/installer
    fi
}


step_4() {
    echo "Setup Rbenv..."
    if $IS_MACOS; then
        # On macOS, use Homebrew for rbenv
        brew_cmd install rbenv ruby-build
        
        echo "Checking Ruby 3.3.0..."
        if ! user_do rbenv versions --bare | grep -q "^3.3.0$"; then
            echo "Compiling Ruby 3.3.0 (this may take a few minutes)..."
            # Optimization: Skip documentation and use parallel compilation
            user_do bash -c "export RUBY_CONFIGURE_OPTS='--disable-install-doc'; export MAKE_OPTS='-j\$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 2)'; rbenv install 3.3.0"
            user_do rbenv global 3.3.0
        fi
        
        # Initialize rbenv for current session
        eval "$(user_do rbenv init -)"
        
        echo "Installing Rails..."
        user_do gem install bundler rails --no-document
    else
        git_ensure "https://github.com/rbenv/rbenv.git" "$REAL_HOME/.rbenv"
        git_ensure "https://github.com/rbenv/ruby-build.git" "$REAL_HOME/.rbenv/plugins/ruby-build"

        sys_do chown -R $REAL_USER:$(id -gn $REAL_USER) "$REAL_HOME/.rbenv"
        user_do bash -c "cd '$REAL_HOME/.rbenv' && src/configure && make -C src" >/dev/null 2>&1

        # Write gemrc to suppress documentation generation for all future gem installs
        user_do bash -c 'echo "gem: --no-document" > "$HOME/.gemrc"'

        echo "Checking Ruby 3.3.0..."
        if ! user_do bash -c 'export PATH="$HOME/.rbenv/bin:$PATH"; eval "$(rbenv init -)"; rbenv versions --bare | grep -q "^3.3.0$"'; then
            echo "Compiling Ruby 3.3.0 (this may take a few minutes)..."
            # Optimization: Skip documentation and use parallel compilation
            user_do bash -c 'export PATH="$HOME/.rbenv/bin:$PATH"; eval "$(rbenv init -)"; export RUBY_CONFIGURE_OPTS="--disable-install-doc"; export MAKE_OPTS="-j$(nproc 2>/dev/null || echo 2)"; rbenv install 3.3.0 && rbenv global 3.3.0'
        fi

        echo "Installing Rails..."
        user_do bash -c 'export PATH="$HOME/.rbenv/bin:$HOME/.rbenv/shims:$PATH"; gem install bundler rails --no-document'
    fi
}


step_5() {
    if $IS_MACOS; then
        echo "Setup Python..."
        brew_cmd install python@3.12
        
        echo "Setup uv (Python Package Manager)..."
        if ! command -v uv &> /dev/null; then
            user_do curl -LsSf https://astral.sh/uv/install.sh | sh
        else
            user_do uv self update
        fi
        
        GO_VER="1.22.2"
        echo "Setup Go $GO_VER..."
        brew_cmd install go
        
        echo "Setup Rust..."
        if ! command -v rustup &> /dev/null; then
            user_do curl --proto \'=https\' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
            source "$HOME/.cargo/env"
        else
            user_do rustup update
        fi

        echo "Installing Cronboard (Cron TUI)..."
        brew_cmd install cronboard

        cron_ensure
    else
        echo "Setup Python..."
        sys_do apt-get install -y python3 python3-pip python3-venv python-is-python3

        echo "Setup uv (Python Package Manager)..."
        if ! user_do bash -c "export PATH=\$HOME/.local/bin:\$PATH; command -v uv" &> /dev/null; then
            user_do bash -c "curl -LsSf https://astral.sh/uv/install.sh | sh"
        else
            user_do bash -c "export PATH=\$HOME/.local/bin:\$PATH; uv self update"
        fi
        export PATH="$REAL_HOME/.local/bin:$PATH"

        GO_VER="1.22.2"
        echo "Setup Go $GO_VER ($ARCH_GO)..."
        if [ ! -d "$REAL_HOME/.local/go" ]; then
            echo "Installing Go to $REAL_HOME/.local/go..."
            user_do mkdir -p "$REAL_HOME/.local"
            wget -q "https://go.dev/dl/go${GO_VER}.linux-${ARCH_GO}.tar.gz" -O /tmp/go.tar.gz
            user_do tar -C "$REAL_HOME/.local" -xzf /tmp/go.tar.gz && rm /tmp/go.tar.gz
        fi
        export PATH="$REAL_HOME/.local/go/bin:$PATH"

        echo "Setup Rust..."
        if [ ! -f "$REAL_HOME/.cargo/bin/rustup" ]; then
            user_do sh -c "curl --proto \'=https\' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y"
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
    if $IS_MACOS; then
        echo "Setup Node.js via Homebrew..."
        brew_cmd install node@24
        brew_cmd link node@24 --force --overwrite
        
        echo "Installing pnpm..."
        user_do npm install -g pnpm npm@latest
        
        echo "Installing PM2 & n8n..."
        user_do npm install -g pm2 @n8n/cli

        echo "Setup Bun..."
        user_do curl -fsSL https://bun.sh/install | bash
    else
        echo "Setup NodeSource..."
        install_key "https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key" "/etc/apt/keyrings/nodesource.gpg"
        echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_24.x nodistro main" | sys_do tee /etc/apt/sources.list.d/nodesource.list
        sys_do apt-get update -qq
        sys_do apt-get install -y nodejs
        
        # Configure npm to use a user-writable directory for global packages if not root
        if [[ "$(id -u)" -ne 0 ]]; then
            echo "Configuring npm to use user-writable directory for global packages..."
            user_do mkdir -p "$REAL_HOME/.npm-global"
            user_do npm config set prefix "$REAL_HOME/.npm-global"
            export PATH="$REAL_HOME/.npm-global/bin:$PATH"
        fi

        user_do npm install -g pnpm npm@latest

        echo "Installing PM2 & n8n..."
        user_do npm install -g pm2 @n8n/cli

        echo "Setup Bun..."
        user_do bash -c "curl -fsSL https://bun.sh/install | bash"
    fi
}


step_7() {
    if $IS_MACOS; then
        # Docker Desktop for macOS (user needs to download and install manually or use Homebrew Cask)
        echo "Installing Docker Desktop..."
        if ! command -v docker &>/dev/null; then
            echo -e "${YELLOW}Note: Docker Desktop requires manual installation from docker.com${NC}"
            echo "Attempting to install via Homebrew Cask..."
            brew_cmd install --cask docker || echo -e "${YELLOW}Please download Docker Desktop from https://www.docker.com/products/docker-desktop/${NC}"
        else
            echo "Docker is already installed."
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
                trixie|forky|sid|experimental) DOCKER_CODENAME="bookworm" ;;
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
    sys_do chown -R "$REAL_USER:$(id -gn $REAL_USER)" "$REAL_HOME/.setupvibe"

    # Try to start Portainer if docker is running
    if command -v docker &>/dev/null && sys_do docker info &>/dev/null; then
        echo "Starting Portainer..."
        sys_do docker compose -f "$REAL_HOME/.setupvibe/portainer-compose.yml" up -d
        echo -e "${GREEN}✔ Portainer is running at http://localhost:9000 and https://localhost:9443${NC}"
    else
        echo -e "${YELLOW}⚠ Docker is not running. Portainer will be ready to start later with:${NC}"
        echo -e "${CYAN}  docker compose -f ~/.setupvibe/portainer-compose.yml up -d${NC}"
    fi
}


step_8() {
    echo "Installing Modern Unix Tools via Homebrew..."
    TOOLS="bat eza zoxide fzf ripgrep fd lazygit lazydocker neovim glow tldr fastfetch duf jq mise"

    if $IS_MACOS; then
        brew_cmd install $TOOLS

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

        brew_cmd install $TOOLS || brew_cmd upgrade $TOOLS

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

        echo "Installing Tailscale..."
        brew_cmd install --cask tailscale
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
            wget -q "https://github.com/bcicen/ctop/releases/download/v0.7.7/ctop-0.7.7-linux-${ARCH_GO}" -O /tmp/ctop
            user_do mv /tmp/ctop "$REAL_HOME/.local/bin/ctop"
            user_do chmod +x "$REAL_HOME/.local/bin/ctop"
        fi

        echo "Installing Tailscale..."
        if ! command -v tailscale &>/dev/null; then
            user_do curl -fsSL https://tailscale.com/install.sh | sys_do sh
        else
            echo "Tailscale already installed."
        fi
    fi
}


step_10() {
    if $IS_MACOS; then
        echo "SSH Server is not required on macOS (not managed by this script)"
        return 0
    fi

    echo "Setting up SSH Server and enabling root remote login..."

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

    # Configure sshd to allow root login
    echo "Configuring SSH to allow root login..."
    sys_do sed -i 's/^#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config
    sys_do sed -i 's/^PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config
    sys_do sed -i 's/^#PermitRootLogin no/PermitRootLogin yes/' /etc/ssh/sshd_config
    sys_do sed -i 's/^PermitRootLogin no/PermitRootLogin yes/' /etc/ssh/sshd_config

    # Allow password authentication
    echo "Enabling password authentication for SSH..."
    sys_do sed -i 's/^#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config
    sys_do sed -i 's/^PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config

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
        user_do starship preset gruvbox-rainbow -o "$REAL_HOME/.config/starship.toml"
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

        echo "Installing Nerd Fonts (FiraCode & JetBrains Mono)..."
        user_do mkdir -p "$REAL_HOME/.local/share/fonts"
        wget -q --show-progress -O /tmp/FiraCode.zip https://github.com/ryanoasis/nerd-fonts/releases/download/v3.1.1/FiraCode.zip
        user_do unzip -o -q /tmp/FiraCode.zip -d "$REAL_HOME/.local/share/fonts"
        wget -q --show-progress -O /tmp/JetBrainsMono.zip https://github.com/ryanoasis/nerd-fonts/releases/download/v3.1.1/JetBrainsMono.zip
        user_do unzip -o -q /tmp/JetBrainsMono.zip -d "$REAL_HOME/.local/share/fonts"
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/JetBrains/JetBrainsMono/master/install_manual.sh)"
        sys_do chown -R $REAL_USER:$REAL_USER "$REAL_HOME/.local"
        user_do fc-cache -f >/dev/null


        echo "Configuring Starship..."
        if ! command -v starship &>/dev/null && [ ! -f "$REAL_HOME/.local/bin/starship" ]; then
            user_do mkdir -p "$REAL_HOME/.local/bin"
            curl -sS https://starship.rs/install.sh | user_do sh -s -- -y --bin-dir "$REAL_HOME/.local/bin"
        fi
        user_do mkdir -p "$REAL_HOME/.config"

        echo "Applying Starship Preset: Gruvbox Rainbow..."
        user_do starship preset gruvbox-rainbow -o "$REAL_HOME/.config/starship.toml"
        perl -i -pe 's/╭/┌/g; s/╰/└/g; s/\x{e0b6}/\x{e0b2}/g; s/\x{e0b4}/\x{e0b0}/g' "$REAL_HOME/.config/starship.toml"

        # Linux ZSHRC
        safe_download https://raw.githubusercontent.com/promovaweb/setupvibe/main/conf/zshrc-linux.zsh "$REAL_HOME/.zshrc"
        sys_do chown $REAL_USER:$REAL_USER "$REAL_HOME/.zshrc"

        if [ "$SHELL" != "/bin/zsh" ] && [ "$SHELL" != "/usr/bin/zsh" ]; then
            sys_do chsh -s $(which zsh) $REAL_USER
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

    sys_do chown -R $REAL_USER:$(id -gn $REAL_USER) "$REAL_HOME/.tmux" 2>/dev/null || true
    sys_do chown $REAL_USER:$(id -gn $REAL_USER) "$REAL_HOME/.tmux.conf" 2>/dev/null || true

    echo "Restarting tmux to apply new config..."
    user_do pkill -x tmux 2>/dev/null || true
}


step_13() {
    AI_TOOLS=(
        "agentlytics"
        "@anthropic-ai/claude-code"
        "@google/gemini-cli"
        "@gsd-build/cli"
        "@openai/codex"
        "@githubnext/github-copilot-cli"
    )

    for pkg in "${AI_TOOLS[@]}"; do
        echo "Installing $pkg..."
        user_do npm install -g "$pkg" 2>/dev/null || echo -e "${YELLOW}⚠ Failed to install $pkg${NC}"
    done
}


step_14() {
    if $IS_MACOS; then
        echo "Cleaning up Homebrew..."
        brew_cmd cleanup --prune=all
        brew_cmd autoremove

        echo "Cleaning macOS caches and temp files..."
        sys_do rm -rf /private/tmp/* 2>/dev/null || true
        sys_do rm -rf /private/var/folders/*/*/*/com.apple.* 2>/dev/null || true
        rm -rf "$REAL_HOME/Library/Caches/"* 2>/dev/null || true
        rm -rf "$REAL_HOME/.Trash/"* 2>/dev/null || true
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
    if command -v pm2 &>/dev/null; then
        if $IS_MACOS; then
            user_do pm2 startup launchd -u $REAL_USER --hp $REAL_HOME
            user_do pm2 save
        else
            user_do pm2 startup systemd -u $REAL_USER --hp $REAL_HOME
            user_do pm2 save
        fi
        echo -e "${GREEN}✔ PM2 configured for auto-startup${NC}"

        echo "Configuring PM2 defaults..."
        user_do pm2 set pm2:autodump true
        user_do pm2 set pm2:log_date_format "YYYY-MM-DD HH:mm:ss"

        echo "Downloading PM2 ecosystem configuration..."
        safe_download https://raw.githubusercontent.com/promovaweb/setupvibe/main/conf/ecosystem.config.js "$REAL_HOME/ecosystem.config.js"
        sys_do chown "$REAL_USER:$(id -gn $REAL_USER)" "$REAL_HOME/ecosystem.config.js"
        
        echo "Starting PM2 applications from ecosystem file..."
        user_do pm2 start "$REAL_HOME/ecosystem.config.js"
        user_do pm2 save
        
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
echo -e "${GREEN}${BOLD}SetupVibe Desktop Completed Successfully! 🚀${NC}"
echo ""
if $IS_LINUX; then
    echo -e "${YELLOW}${BOLD}IMPORTANT - Apply changes to your shell:${NC}"
    echo -e "${CYAN}For ZSH users:${NC}    source ~/.zshrc"
    echo ""
    echo -e "${YELLOW}Or restart your terminal/logout and login again.${NC}"
else
    echo -e "${YELLOW}Please restart your terminal or logout/login to apply changes.${NC}"
fi