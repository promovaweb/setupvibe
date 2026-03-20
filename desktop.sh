#!/bin/bash


# ==============================================================================
# SETUPVIBE.DEV - DESKTOP DEVELOPER EDITION (V2.3 - Cross Platform)
# ==============================================================================
# Maintainer:    promovaweb.com
# Contact:       contact@promovaweb.com
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
VERSION="0.34.0"
INSTALL_URL="https://raw.githubusercontent.com/promovaweb/setupvibe/refs/heads/main/desktop.sh"

echo -e "${CYAN}SetupVibe Desktop v${VERSION}${NC}"
echo ""

# --- ENVIRONMENT ---
export COMPOSER_ALLOW_SUPERUSER=1

# --- CLEANUP /tmp ---
echo -e "${YELLOW}Cleaning /tmp...${NC}"
sudo rm -rf /tmp/* 2>/dev/null || true

# --- CLEANUP APT KEYRINGS & SOURCES ---
if [[ "$(uname -s)" == "Linux" ]]; then
    echo -e "${YELLOW}Cleaning APT keyrings and sources lists...${NC}"
    # Remove only keyrings that this script will recreate (selective — preserves other software keys)
    sudo mkdir -p -m 755 /etc/apt/keyrings
    sudo rm -f /etc/apt/keyrings/docker.gpg \
               /etc/apt/keyrings/nodesource.gpg \
               /etc/apt/keyrings/charm.gpg \
               /etc/apt/keyrings/githubcli-archive-keyring.gpg \
               /etc/apt/keyrings/ansible.gpg 2>/dev/null || true
    # Remove legacy sury key from old path
    sudo rm -f /usr/share/keyrings/deb.sury.org-php.gpg 2>/dev/null || true
    # Remove all .list files referencing third-party repos
    sudo grep -rl 'docker\|nodesource\|charm\.sh\|cli\.github\|sury\|ondrej\|ansible\|codeiumdata\|windsurf\|antigravity\|pkg\.dev' \
        /etc/apt/sources.list.d/ 2>/dev/null | xargs sudo rm -f 2>/dev/null || true
    # Clean APT cache and stale lists
    sudo rm -rf /var/lib/apt/lists/*
    sudo apt-get clean -qq

    # --- WAIT FOR APT LOCK ---
    echo -e "${YELLOW}Waiting for apt lock to be released...${NC}"
    for i in $(seq 1 30); do
        if ! sudo fuser /var/lib/apt/lists/lock /var/lib/dpkg/lock-frontend /var/lib/dpkg/lock >/dev/null 2>&1; then
            break
        fi
        echo -e "${YELLOW}  apt lock held, waiting... (${i}/30)${NC}"
        sleep 2
    done
    # Stop packagekitd if it still holds the lock
    if sudo fuser /var/lib/apt/lists/lock /var/lib/dpkg/lock-frontend /var/lib/dpkg/lock >/dev/null 2>&1; then
        echo -e "${YELLOW}  Stopping packagekitd to release apt lock...${NC}"
        sudo systemctl stop packagekit 2>/dev/null || true
        sleep 2
    fi

    # --- ENSURE BASE TOOLS FOR REPO MANAGEMENT ---
    echo -e "${YELLOW}Installing base tools (gpg, curl, ca-certificates)...${NC}"
    export DEBIAN_FRONTEND=noninteractive
    sudo apt-get update -y
    sudo apt-get install -y -q gnupg gnupg2 curl ca-certificates lsb-release software-properties-common apt-transport-https
    
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
    sudo apt-get install -y figlet git >/dev/null 2>&1 || sudo apt-get install -y --fix-missing figlet git >/dev/null
fi


# --- UI & LOGIC FUNCTIONS ---

# Helper to install GPG keys safely
install_key() {
    local url=$1
    local dest=$2
    echo -e "${YELLOW}Installing key:${NC} $url ➜ $dest"
    sudo mkdir -p -m 755 /etc/apt/keyrings
    # Try dearmor if GPG is available
    if [[ -n "$GPG_CMD" ]] && command -v "$GPG_CMD" >/dev/null 2>&1; then
        if curl -fsSL "$url" | "$GPG_CMD" --dearmor --yes | sudo tee "$dest" > /dev/null; then
            sudo chmod a+r "$dest"
            return 0
        fi
    fi
    # Fallback: download as-is (modern APT handles armored keys)
    if curl -fsSL "$url" | sudo tee "$dest" > /dev/null; then
        sudo chmod a+r "$dest"
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
    echo -e "${YELLOW}Maintained by PromovaWeb.com | Contact: contact@promovaweb.com${NC}"
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

    if $IS_MACOS; then
        CURRENT_NAME=$(sudo -u $REAL_USER git config --global user.name)
        CURRENT_EMAIL=$(sudo -u $REAL_USER git config --global user.email)
    else
        CURRENT_NAME=$(sudo -u $REAL_USER git config --global user.name)
        CURRENT_EMAIL=$(sudo -u $REAL_USER git config --global user.email)
    fi


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

        if $IS_MACOS; then
            sudo -u $REAL_USER git config --global user.name "$GIT_NAME"
            sudo -u $REAL_USER git config --global user.email "$GIT_EMAIL"
            sudo -u $REAL_USER git config --global init.defaultBranch main
        else
            sudo -u $REAL_USER git config --global user.name "$GIT_NAME"
            sudo -u $REAL_USER git config --global user.email "$GIT_EMAIL"
            sudo -u $REAL_USER git config --global init.defaultBranch main
        fi

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
        cd "$dest" && sudo -u $REAL_USER git pull --quiet
    else
        echo "Cloning: $repo..."
        sudo -u $REAL_USER git clone "$repo" "$dest" --quiet
    fi
    sudo chown -R $REAL_USER:$(id -gn $REAL_USER) "$dest" 2>/dev/null || true
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

    mv "$tmp" "$dest"
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
        sudo apt-get update -qq
        echo "Installing Build Essentials & Tmux..."
        sudo apt-get install -y build-essential git wget unzip fontconfig curl sshpass \
            libssl-dev zlib1g-dev libbz2-dev libreadline-dev libsqlite3-dev llvm \
            libncurses5-dev xz-utils tk-dev libxml2-dev libxmlsec1-dev libffi-dev liblzma-dev \
            libyaml-dev autoconf bison procps file tmux

        # Adding Charmbracelet Repo (needed for Glow)
        install_key "https://repo.charm.sh/apt/gpg.key" "/etc/apt/keyrings/charm.gpg"
        echo "deb [signed-by=/etc/apt/keyrings/charm.gpg] https://repo.charm.sh/apt/ * *" | sudo tee /etc/apt/sources.list.d/charm.list
        sudo apt-get update -qq
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
        else
            echo "Homebrew already installed. Updating..."
            brew_cmd update
        fi

        # Verify installation
        if command -v brew &>/dev/null; then
            echo -e "${GREEN}✔ Homebrew is ready.${NC}"
            echo "Installing base tools via Homebrew..."
            brew_cmd install wget unzip curl tmux sshpass openssl readline sqlite3 xz zlib tcl-tk
        else
            echo -e "${RED}✘ Homebrew installation failed.${NC}"
            return 1
        fi
    else
        echo "Checking Homebrew installation..."
        if [ ! -d "/home/linuxbrew/.linuxbrew" ] && [ ! -d "$REAL_HOME/.linuxbrew" ]; then
            echo "Installing Homebrew..."
            sudo apt-get install -y build-essential procps curl file git

            # Ensure /home/linuxbrew directory exists with proper permissions
            echo "Ensuring /home/linuxbrew permissions..."
            sudo mkdir -p /home/linuxbrew
            sudo chown -R "$REAL_USER" /home/linuxbrew 2>/dev/null || true
            sudo chmod -R 775 /home/linuxbrew 2>/dev/null || true
            
            # Pre-create .linuxbrew to help the installer
            sudo mkdir -p /home/linuxbrew/.linuxbrew
            sudo chown -R "$REAL_USER" /home/linuxbrew/.linuxbrew 2>/dev/null || true

            # Temporarily allow REAL_USER to use sudo without password for Homebrew installation
            # This is required because the installer checks for sudo even in non-interactive mode
            if [[ "$REAL_USER" != "root" ]]; then
                echo "Temporarily allowing $REAL_USER to use sudo without password for Homebrew installation..."
                echo "$REAL_USER ALL=(ALL) NOPASSWD:ALL" | sudo tee /etc/sudoers.d/setupvibe-brew > /dev/null
                sudo chmod 440 /etc/sudoers.d/setupvibe-brew
            fi

            # Install Homebrew
            if [[ "$REAL_USER" == "root" ]]; then
                echo -e "${RED}✘ Homebrew cannot be installed as root. Skipping.${NC}"
            else
                # Run installer as REAL_USER
                sudo -u "$REAL_USER" NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            fi

            # Cleanup temporary sudoers rule
            sudo rm -f /etc/sudoers.d/setupvibe-brew
        else
            echo "Homebrew already installed. Checking for updates..."
            local BREW_EXEC="/home/linuxbrew/.linuxbrew/bin/brew"
            [ ! -f "$BREW_EXEC" ] && BREW_EXEC="$REAL_HOME/.linuxbrew/bin/brew"

            if [ -f "$BREW_EXEC" ]; then
                brew_cmd update
            fi
        fi

        # Configure Homebrew PATH in shell profiles
        echo "Configuring Homebrew PATH in shell profiles..."
        for CONFIG_FILE in "$REAL_HOME/.bashrc" "$REAL_HOME/.profile" "$REAL_HOME/.zshrc"; do
            # Create config file if it doesn't exist
            if [ ! -f "$CONFIG_FILE" ]; then
                sudo -u $REAL_USER touch "$CONFIG_FILE"
            fi
            
            # Add Homebrew configuration if not present
            if ! grep -q "linuxbrew" "$CONFIG_FILE"; then
                echo -e "\n# Homebrew Configuration" | sudo -u $REAL_USER tee -a "$CONFIG_FILE" > /dev/null
                echo 'if [ -d "/home/linuxbrew/.linuxbrew" ]; then eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"; fi' | sudo -u $REAL_USER tee -a "$CONFIG_FILE" > /dev/null
                echo 'if [ -d "$HOME/.linuxbrew" ]; then eval "$($HOME/.linuxbrew/bin/brew shellenv)"; fi' | sudo -u $REAL_USER tee -a "$CONFIG_FILE" > /dev/null
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
        pecl install redis 2>/dev/null || true
        pecl install xdebug 2>/dev/null || true
        printf "\n" | pecl install imagick 2>/dev/null || true
        
        echo "Installing Composer..."
        if [ ! -f "/usr/local/bin/composer" ] && [ ! -f "$BREW_PREFIX/bin/composer" ]; then
            brew_cmd install composer
        else
            composer self-update
        fi
        
        echo "Setup Laravel Installer..."
        composer global require laravel/installer
    else
        echo "Configuring PHP Repository..."
        if $IS_UBUNTU; then
            echo "Using Ubuntu PPA Strategy..."
            sudo add-apt-repository ppa:ondrej/php -y
        elif $IS_DEBIAN; then
            echo "Using Debian Sury Strategy..."
            # Sury repo may not support bleeding-edge codenames; fall back to trixie (current stable)
            case "$DISTRO_CODENAME" in
                trixie|forky|sid|experimental) PHP_CODENAME="trixie" ;;
                *) PHP_CODENAME="bookworm" ;;
            esac
            install_key "https://packages.sury.org/php/apt.gpg" "/etc/apt/keyrings/php.gpg"
            echo "deb [signed-by=/etc/apt/keyrings/php.gpg] https://packages.sury.org/php/ $PHP_CODENAME main" | sudo tee /etc/apt/sources.list.d/php.list
        else
            echo -e "${YELLOW}⚠ Unknown Linux distribution. Skipping PHP repository configuration.${NC}"
        fi
        
        sudo apt-get update -qq
        echo "Installing PHP 8.4 & Extensions..."
        sudo apt-get install -y php8.4 php8.4-cli php8.4-common php8.4-dev \
            php8.4-curl php8.4-mbstring php8.4-xml php8.4-zip php8.4-bcmath php8.4-intl \
            php8.4-mysql php8.4-pgsql php8.4-sqlite3 php8.4-gd php8.4-imagick \
            php8.4-redis php8.4-mongodb php8.4-yaml php8.4-xdebug


        echo "Persisting COMPOSER_ALLOW_SUPERUSER=1..."
        echo 'export COMPOSER_ALLOW_SUPERUSER=1' | sudo tee /etc/profile.d/composer.sh > /dev/null
        sudo chmod +x /etc/profile.d/composer.sh
        export COMPOSER_ALLOW_SUPERUSER=1

        if [ ! -f "/usr/local/bin/composer" ]; then
            echo "Installing Composer..."
            curl -sS https://getcomposer.org/installer | php
            sudo mv composer.phar /usr/local/bin/composer
            sudo chmod +x /usr/local/bin/composer
        else
            sudo COMPOSER_ALLOW_SUPERUSER=1 composer self-update
        fi
        echo "Setup Laravel Installer..."
        sudo -u $REAL_USER composer global require laravel/installer
    fi
}


step_4() {
    echo "Setup Rbenv..."
    if $IS_MACOS; then
        # On macOS, use Homebrew for rbenv
        brew_cmd install rbenv ruby-build
        
        echo "Checking Ruby 3.3.0..."
        if ! rbenv versions --bare | grep -q "^3.3.0$"; then
            echo "Compiling Ruby 3.3.0..."
            rbenv install 3.3.0
            rbenv global 3.3.0
        fi
        
        # Initialize rbenv for current session
        eval "$(rbenv init -)"
        
        echo "Installing Rails..."
        gem install bundler rails --no-document
    else
        git_ensure "https://github.com/rbenv/rbenv.git" "$REAL_HOME/.rbenv"
        git_ensure "https://github.com/rbenv/ruby-build.git" "$REAL_HOME/.rbenv/plugins/ruby-build"

        sudo chown -R $REAL_USER:$(id -gn $REAL_USER) "$REAL_HOME/.rbenv"
        sudo -u $REAL_USER bash -c "cd '$REAL_HOME/.rbenv' && src/configure && make -C src" >/dev/null 2>&1

        # Write gemrc to suppress documentation generation for all future gem installs
        sudo -u $REAL_USER bash -c 'echo "gem: --no-document" > "$HOME/.gemrc"'

        echo "Checking Ruby 3.3.0..."
        if ! sudo -u $REAL_USER bash -c 'export PATH="$HOME/.rbenv/bin:$PATH"; eval "$(rbenv init -)"; rbenv versions --bare | grep -q "^3.3.0$"'; then
            echo "Compiling Ruby 3.3.0..."
            sudo -u $REAL_USER bash -c 'export PATH="$HOME/.rbenv/bin:$PATH"; eval "$(rbenv init -)"; rbenv install 3.3.0 && rbenv global 3.3.0'
        fi

        echo "Installing Rails..."
        sudo -u $REAL_USER bash -c 'export PATH="$HOME/.rbenv/bin:$HOME/.rbenv/shims:$PATH"; gem install bundler rails --no-document'
    fi
}


step_5() {
    if $IS_MACOS; then
        echo "Setup Python..."
        brew_cmd install python@3.12
        
        echo "Setup uv (Python Package Manager)..."
        if ! command -v uv &> /dev/null; then
            curl -LsSf https://astral.sh/uv/install.sh | sh
        else
            uv self update
        fi
        
        GO_VER="1.22.2"
        echo "Setup Go $GO_VER..."
        brew_cmd install go
        
        echo "Setup Rust..."
        if ! command -v rustup &> /dev/null; then
            curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
            source "$HOME/.cargo/env"
        else
            rustup update
        fi
    else
        echo "Setup Python..."
        sudo apt-get install -y python3 python3-pip python3-venv python-is-python3

        echo "Setup uv (Python Package Manager)..."
        if ! sudo -u $REAL_USER bash -c "export PATH=\$HOME/.local/bin:\$PATH; command -v uv" &> /dev/null; then
            sudo -u $REAL_USER bash -c "curl -LsSf https://astral.sh/uv/install.sh | sh"
        else
            sudo -u $REAL_USER bash -c "export PATH=\$HOME/.local/bin:\$PATH; uv self update"
        fi
        export PATH="$REAL_HOME/.local/bin:$PATH"

        GO_VER="1.22.2"
        echo "Setup Go $GO_VER ($ARCH_GO)..."
        sudo rm -rf /usr/local/go
        wget -q "https://go.dev/dl/go${GO_VER}.linux-${ARCH_GO}.tar.gz" -O /tmp/go.tar.gz
        sudo tar -C /usr/local -xzf /tmp/go.tar.gz && rm /tmp/go.tar.gz
        export PATH="/usr/local/go/bin:$PATH"

        echo "Setup Rust..."
        if [ ! -f "$REAL_HOME/.cargo/bin/rustup" ]; then
            sudo -u $REAL_USER sh -c "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y"
        else
            sudo -u $REAL_USER bash -c "export PATH=\$HOME/.cargo/bin:\$PATH; rustup update"
        fi
        export PATH="$REAL_HOME/.cargo/bin:$PATH"
    fi
}


step_6() {
    if $IS_MACOS; then
        echo "Setup Node.js via Homebrew..."
        brew_cmd install node@24
        brew_cmd link node@24 --force --overwrite
        
        echo "Installing pnpm..."
        npm install -g pnpm npm@latest
        
        echo "Installing PM2..."
        npm install -g pm2

        echo "Setup Bun..."
        curl -fsSL https://bun.sh/install | bash
    else
        echo "Setup NodeSource..."
        install_key "https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key" "/etc/apt/keyrings/nodesource.gpg"
        echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_24.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list
        sudo apt-get update -qq
        sudo apt-get install -y nodejs
        sudo npm install -g pnpm npm@latest

        echo "Installing PM2..."
        sudo npm install -g pm2

        echo "Setup Bun..."
        sudo -u $REAL_USER bash -c "curl -fsSL https://bun.sh/install | bash"
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
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$DISTRO_ID $DOCKER_CODENAME stable" | sudo tee /etc/apt/sources.list.d/docker.list
        
        sudo apt-get update -qq
        sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin docker-buildx-plugin
        sudo usermod -aG docker "$REAL_USER"

        # Ansible Strategy
        echo "Configuring Ansible..."
        if $IS_UBUNTU; then
            echo "Using Ubuntu Ansible PPA Strategy..."
            sudo add-apt-repository --yes --update ppa:ansible/ansible
            sudo apt-get install -y ansible
        elif $IS_DEBIAN; then
            echo "Using Debian Ansible Strategy..."
            # Debian 12+ (Bookworm/Trixie) removes 'ansible' package; 'ansible-core' is the base.
            sudo apt-get install -y ansible-core
        fi


        # GitHub CLI
        wget -qO- https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null
        sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
        sudo apt-get update -qq && sudo apt-get install -y gh
    fi
}


step_8() {
    echo "Installing Modern Unix Tools via Homebrew..."
    TOOLS="bat eza zoxide fzf ripgrep fd lazygit lazydocker neovim glow jq tldr fastfetch duf jq mise"

    if $IS_MACOS; then
        brew_cmd install $TOOLS
        
        echo "Installing Bruno (API Client)..."
        brew_cmd install --cask bruno 2>/dev/null || brew_cmd install --cask bruno --force
        
        # FZF keybindings setup
        if [ -d "$BREW_PREFIX/opt/fzf" ]; then
            sudo -u $REAL_USER "$BREW_PREFIX/opt/fzf/install" --all --no-bash --no-fish 2>/dev/null || true
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
            sudo -H -u $REAL_USER "$FZF_OPT/install" --all --no-bash --no-fish > /dev/null 2>&1
        fi

        echo "Installing Bruno (API Client)..."
        if command -v snap &> /dev/null; then
            sudo snap install bruno
        else
            echo -e "${YELLOW}⚠ Snap not available. Please install Bruno manually:${NC}"
            echo "   Visit: https://www.usebruno.com/"
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
                cargo install $tool
            fi
        done
        
        echo "Installing ctop..."
        brew_cmd install ctop

        echo "Installing Tailscale..."
        brew_cmd install --cask tailscale
    else
        echo "Installing Network Tools (APT)..."
        sudo apt-get install -y rsync net-tools dnsutils mtr-tiny nmap tcpdump iftop nload iotop sysstat whois iputils-ping speedtest-cli glances htop btop

        echo "Installing Network Tools (Rust)..."
        for tool in bandwhich gping trippy rustscan; do
            if ! sudo -u $REAL_USER bash -c "export PATH=\$HOME/.cargo/bin:\$PATH; command -v $tool" &> /dev/null; then
                 sudo -u $REAL_USER bash -c "export PATH=\$HOME/.cargo/bin:\$PATH; cargo install $tool"
            fi
        done


        echo "Installing ctop for $ARCH_GO..."
        if [ ! -f "/usr/local/bin/ctop" ]; then
            sudo wget -q "https://github.com/bcicen/ctop/releases/download/v0.7.7/ctop-0.7.7-linux-${ARCH_GO}" -O /usr/local/bin/ctop
            sudo chmod +x /usr/local/bin/ctop
        fi

        echo "Installing Tailscale..."
        if ! command -v tailscale &>/dev/null; then
            curl -fsSL https://tailscale.com/install.sh | sudo sh
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
        sudo apt-get install -y openssh-server openssh-client
    fi

    # Enable SSH service
    echo "Enabling SSH service..."
    sudo systemctl enable ssh
    sudo systemctl start ssh

    # Backup original config
    if [ ! -f /etc/ssh/sshd_config.backup ]; then
        sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup
        echo "Backed up original sshd_config"
    fi

    # Configure sshd to allow root login
    echo "Configuring SSH to allow root login..."
    sudo sed -i 's/^#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config
    sudo sed -i 's/^PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config
    sudo sed -i 's/^#PermitRootLogin no/PermitRootLogin yes/' /etc/ssh/sshd_config
    sudo sed -i 's/^PermitRootLogin no/PermitRootLogin yes/' /etc/ssh/sshd_config

    # Allow password authentication
    echo "Enabling password authentication for SSH..."
    sudo sed -i 's/^#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config
    sudo sed -i 's/^PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config

    # Allow empty passwords if needed (optional - commented by default)
    # sudo sed -i 's/^#PermitEmptyPasswords no/PermitEmptyPasswords yes/' /etc/ssh/sshd_config

    # Validate configuration
    if sudo sshd -t &> /dev/null; then
        echo "SSH configuration validated successfully"
        sudo systemctl restart ssh
        echo -e "${GREEN}✔ SSH Server configured and running${NC}"
        
        # Show SSH status
        echo ""
        echo "SSH Server Status:"
        sudo systemctl status ssh --no-pager | grep -E 'Active|Loaded'
        echo ""
        echo "Current SSH Configuration:"
        grep -E '^PermitRootLogin|^PasswordAuthentication' /etc/ssh/sshd_config
    else
        echo -e "${RED}Error: SSH configuration failed validation${NC}"
        echo "Restoring original configuration..."
        sudo cp /etc/ssh/sshd_config.backup /etc/ssh/sshd_config
        sudo systemctl restart ssh
        return 1
    fi
}


step_11() {
    if $IS_MACOS; then
        # macOS already has zsh as default
        echo "ZSH is default on macOS"
        
        if [ ! -d "$REAL_HOME/.oh-my-zsh" ]; then
            sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended
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
        mkdir -p "$REAL_HOME/.config"

        echo "Applying Starship Preset: Gruvbox Rainbow..."
        starship preset gruvbox-rainbow -o "$REAL_HOME/.config/starship.toml"

        # macOS ZSHRC
        safe_download https://raw.githubusercontent.com/promovaweb/setupvibe/main/conf/zshrc-macos.zsh "$REAL_HOME/.zshrc"
    else
        sudo apt-get install -y zsh

        if [ ! -d "$REAL_HOME/.oh-my-zsh" ]; then
            sudo -u $REAL_USER sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended
        fi

        git_ensure "https://github.com/zsh-users/zsh-autosuggestions" "$REAL_HOME/.oh-my-zsh/custom/plugins/zsh-autosuggestions"
        git_ensure "https://github.com/zsh-users/zsh-syntax-highlighting" "$REAL_HOME/.oh-my-zsh/custom/plugins/zsh-syntax-highlighting"

        echo "Installing Nerd Fonts (FiraCode & JetBrains Mono)..."
        mkdir -p "$REAL_HOME/.local/share/fonts"
        wget -q --show-progress -O /tmp/FiraCode.zip https://github.com/ryanoasis/nerd-fonts/releases/download/v3.1.1/FiraCode.zip
        unzip -o -q /tmp/FiraCode.zip -d "$REAL_HOME/.local/share/fonts"
        wget -q --show-progress -O /tmp/JetBrainsMono.zip https://github.com/ryanoasis/nerd-fonts/releases/download/v3.1.1/JetBrainsMono.zip
        unzip -o -q /tmp/JetBrainsMono.zip -d "$REAL_HOME/.local/share/fonts"
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/JetBrains/JetBrainsMono/master/install_manual.sh)"
        sudo chown -R $REAL_USER:$REAL_USER "$REAL_HOME/.local"
        fc-cache -f >/dev/null


        echo "Configuring Starship..."
        curl -sS https://starship.rs/install.sh | sudo sh -s -- -y
        mkdir -p "$REAL_HOME/.config"

        echo "Applying Starship Preset: Gruvbox Rainbow..."
        sudo -u $REAL_USER starship preset gruvbox-rainbow -o "$REAL_HOME/.config/starship.toml"


        # Linux ZSHRC
        safe_download https://raw.githubusercontent.com/promovaweb/setupvibe/main/conf/zshrc-linux.zsh "$REAL_HOME/.zshrc"
        sudo chown $REAL_USER:$REAL_USER "$REAL_HOME/.zshrc"

        if [ "$SHELL" != "/bin/zsh" ] && [ "$SHELL" != "/usr/bin/zsh" ]; then
            sudo chsh -s $(which zsh) $REAL_USER
        fi
    fi
}


step_12() {
    echo "Installing TPM (Tmux Plugin Manager)..."
    git_ensure "https://github.com/tmux-plugins/tpm" "$REAL_HOME/.tmux/plugins/tpm"

    echo "Downloading tmux.conf..."
    safe_download https://raw.githubusercontent.com/promovaweb/setupvibe/main/conf/tmux.conf "$REAL_HOME/.tmux.conf"

    # Also install to /root if running as root with a different REAL_HOME
    if [[ "$(id -u)" -eq 0 && "$REAL_HOME" != "/root" ]]; then
        mkdir -p /root/.tmux/plugins
        cp "$REAL_HOME/.tmux.conf" /root/.tmux.conf
        [[ -d "$REAL_HOME/.tmux/plugins/tpm" ]] && \
            ln -sfn "$REAL_HOME/.tmux/plugins/tpm" /root/.tmux/plugins/tpm 2>/dev/null || true
    fi

    sudo chown -R $REAL_USER:$(id -gn $REAL_USER) "$REAL_HOME/.tmux" 2>/dev/null || true
    sudo chown $REAL_USER:$(id -gn $REAL_USER) "$REAL_HOME/.tmux.conf" 2>/dev/null || true

    echo "Restarting tmux to apply new config..."
    pkill -x tmux 2>/dev/null || true
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
        echo "Installing $pkg..."
        if $IS_MACOS; then
            npm install -g "$pkg" 2>/dev/null || echo -e "${YELLOW}⚠ Failed to install $pkg${NC}"
        else
            sudo npm install -g "$pkg" 2>/dev/null || echo -e "${YELLOW}⚠ Failed to install $pkg${NC}"
        fi
    done
}


step_14() {
    if $IS_MACOS; then
        echo "Cleaning up Homebrew..."
        brew_cmd cleanup --prune=all
        brew_cmd autoremove

        echo "Cleaning macOS caches and temp files..."
        sudo rm -rf /private/tmp/* 2>/dev/null || true
        sudo rm -rf /private/var/folders/*/*/*/com.apple.* 2>/dev/null || true
        rm -rf "$REAL_HOME/Library/Caches/"* 2>/dev/null || true
        rm -rf "$REAL_HOME/.Trash/"* 2>/dev/null || true
    else
        echo "Cleaning APT cache and orphaned packages..."
        sudo apt-get autoremove -y -qq
        sudo apt-get autoclean -qq
        sudo apt-get clean -qq
        sudo rm -rf /var/lib/apt/lists/*

        echo "Cleaning temp and log junk..."
        sudo rm -rf /tmp/* 2>/dev/null || true
        sudo rm -rf /var/tmp/* 2>/dev/null || true
        sudo journalctl --vacuum-time=7d 2>/dev/null || true
        sudo find /var/log -type f -name "*.gz" -delete 2>/dev/null || true
        sudo find /var/log -type f -name "*.1" -delete 2>/dev/null || true

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
            sudo -u $REAL_USER pm2 startup launchd -u $REAL_USER --hp $REAL_HOME
            sudo -u $REAL_USER pm2 save
        else
            sudo -u $REAL_USER pm2 startup systemd -u $REAL_USER --hp $REAL_HOME
            sudo -u $REAL_USER pm2 save
        fi
        echo -e "${GREEN}✔ PM2 configured for auto-startup${NC}"

        echo "Configuring PM2 defaults..."
        sudo -u $REAL_USER pm2 set pm2:autodump true
        sudo -u $REAL_USER pm2 set pm2:log_date_format "YYYY-MM-DD HH:mm:ss"

        echo "Downloading PM2 ecosystem configuration..."
        safe_download https://raw.githubusercontent.com/promovaweb/setupvibe/main/conf/ecosystem.config.js "$REAL_HOME/ecosystem.config.js"
        sudo chown "$REAL_USER:$(id -gn $REAL_USER)" "$REAL_HOME/ecosystem.config.js"
        echo -e "${GREEN}✔ PM2 defaults configured — template saved to ~/ecosystem.config.js${NC}"
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