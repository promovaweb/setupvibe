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
VERSION="0.27.1"
INSTALL_URL="https://raw.githubusercontent.com/promovaweb/setupvibe/refs/heads/main/desktop.sh"

echo -e "${CYAN}SetupVibe Desktop v${VERSION}${NC}"
echo ""

# --- CLEANUP /tmp ---
echo -e "${YELLOW}Cleaning /tmp...${NC}"
sudo rm -rf /tmp/* 2>/dev/null || true

# --- CLEANUP APT KEYRINGS & SOURCES ---
if [[ "$(uname -s)" == "Linux" ]]; then
    echo -e "${YELLOW}Cleaning APT keyrings and sources lists...${NC}"
    # Remove all third-party keyrings
    sudo rm -rf /etc/apt/keyrings/
    sudo mkdir -p -m 755 /etc/apt/keyrings
    # Remove legacy sury key from old path
    sudo rm -f /usr/share/keyrings/deb.sury.org-php.gpg 2>/dev/null || true
    # Remove all .list files referencing third-party repos
    sudo grep -rl 'docker\|nodesource\|charm\.sh\|cli\.github\|sury\|ondrej\|ansible' \
        /etc/apt/sources.list.d/ 2>/dev/null | xargs sudo rm -f 2>/dev/null || true
    # Clean APT cache and stale lists
    sudo rm -rf /var/lib/apt/lists/*
    sudo apt-get clean -qq
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


# --- 1. INITIAL PREPARATION ---


# Keep sudo alive during script execution (macOS)
if $IS_MACOS; then
    while true; do sudo -n true; sleep 60; kill -0 "$$" || exit; done 2>/dev/null &
fi


# Detect Real User
if $IS_MACOS; then
    REAL_USER=$(whoami)
    REAL_HOME="$HOME"
else
    REAL_USER=$(whoami)
    REAL_HOME=$(getent passwd $REAL_USER | cut -d: -f6)
fi


# Detect Distro (Linux only)
if $IS_LINUX; then
    DISTRO_ID=$(lsb_release -is | tr '[:upper:]' '[:lower:]')
    DISTRO_CODENAME=$(lsb_release -cs)
    if [[ "$DISTRO_ID" == "zorin" ]]; then DISTRO_ID="ubuntu"; fi
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
    echo "Cleaning APT lists cache..."
    sudo apt-get update -qq 2>/dev/null || true
    sudo apt-get install -y figlet git lsb-release >/dev/null 2>&1 || sudo apt-get install -y --fix-missing figlet git lsb-release >/dev/null
fi


# --- UI & LOGIC FUNCTIONS ---

# Helper function to run brew as regular user (not root)
brew_cmd() {
    if $IS_MACOS; then
        # Run brew as the real user, not root
        sudo -u $REAL_USER "$BREW_PREFIX/bin/brew" "$@"
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


# --- INSTALLATION STEPS ---


step_1() {
    if $IS_MACOS; then
        echo "macOS build tools are provided by Xcode Command Line Tools (already installed)"
        echo "Base tools via Homebrew will be installed after Homebrew is set up (Step 3)..."
    else
        echo "Updating APT..."
        sudo apt-get update -qq
        echo "Installing Build Essentials & Tmux..."
        sudo apt-get install -y software-properties-common
        sudo apt-get install -y build-essential git wget unzip fontconfig curl \
            libssl-dev zlib1g-dev libbz2-dev libreadline-dev libsqlite3-dev llvm \
            libncurses5-dev xz-utils tk-dev libxml2-dev libxmlsec1-dev libffi-dev liblzma-dev \
            libyaml-dev autoconf bison procps file tmux

        # Adding Charmbracelet Repo (needed for Glow)
        sudo mkdir -p -m 755 /etc/apt/keyrings
        curl -fsSL https://repo.charm.sh/apt/gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/charm.gpg --yes
        sudo chmod a+r /etc/apt/keyrings/charm.gpg
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
            brew_cmd install wget unzip curl tmux openssl readline sqlite3 xz zlib tcl-tk
        else
            echo -e "${RED}✘ Homebrew installation failed.${NC}"
            return 1
        fi
    else
        echo "Checking Homebrew installation..."
        if [ ! -d "/home/linuxbrew/.linuxbrew" ] && [ ! -d "$REAL_HOME/.linuxbrew" ]; then
            echo "Installing Homebrew..."
            sudo apt-get install -y build-essential procps curl file git

            # Create /home/linuxbrew directory with proper permissions if it doesn't exist
            if [ ! -d "/home/linuxbrew" ]; then
                echo "Creating /home/linuxbrew directory..."
                sudo mkdir -p /home/linuxbrew
                sudo chown -R $REAL_USER:$(id -gn $REAL_USER) /home/linuxbrew
                sudo chmod -R 775 /home/linuxbrew
            fi

            # Install Homebrew
            sudo -u $REAL_USER NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        else
            echo "Homebrew already installed. Checking for updates..."
            local BREW_EXEC="/home/linuxbrew/.linuxbrew/bin/brew"
            [ ! -f "$BREW_EXEC" ] && BREW_EXEC="$REAL_HOME/.linuxbrew/bin/brew"

            if [ -f "$BREW_EXEC" ]; then
                sudo -u $REAL_USER "$BREW_EXEC" update
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
            eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
            export PATH="/home/linuxbrew/.linuxbrew/bin:/home/linuxbrew/.linuxbrew/sbin:$PATH"
        elif [ -f "$REAL_HOME/.linuxbrew/bin/brew" ]; then
            eval "$($REAL_HOME/.linuxbrew/bin/brew shellenv)"
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
        pecl install imagick 2>/dev/null || true
        
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
        if [[ "$DISTRO_ID" == "ubuntu" ]]; then
            sudo add-apt-repository ppa:ondrej/php -y
        else
            # Sury repo supports Debian stable releases; fall back to bookworm for unsupported codenames
            PHP_CODENAME="$DISTRO_CODENAME"
            case "$DISTRO_CODENAME" in
                forky|sid|experimental) PHP_CODENAME="trixie" ;;
            esac
            curl -fsSL https://packages.sury.org/php/apt.gpg | sudo gpg --dearmor -o /etc/apt/keyrings/php.gpg --yes
            sudo chmod a+r /etc/apt/keyrings/php.gpg
            echo "deb [signed-by=/etc/apt/keyrings/php.gpg] https://packages.sury.org/php/ $PHP_CODENAME main" | sudo tee /etc/apt/sources.list.d/php.list
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
        gem install bundler rails
    else
        git_ensure "https://github.com/rbenv/rbenv.git" "$REAL_HOME/.rbenv"
        git_ensure "https://github.com/rbenv/ruby-build.git" "$REAL_HOME/.rbenv/plugins/ruby-build"

        sudo chown -R $REAL_USER:$(id -gn $REAL_USER) "$REAL_HOME/.rbenv"
        sudo -u $REAL_USER bash -c "cd '$REAL_HOME/.rbenv' && src/configure && make -C src" >/dev/null 2>&1

        echo "Checking Ruby 3.3.0..."
        if ! sudo -u $REAL_USER bash -c 'export PATH="$HOME/.rbenv/bin:$PATH"; eval "$(rbenv init -)"; rbenv versions --bare | grep -q "^3.3.0$"'; then
            echo "Compiling Ruby 3.3.0..."
            sudo -u $REAL_USER bash -c 'export PATH="$HOME/.rbenv/bin:$PATH"; eval "$(rbenv init -)"; rbenv install 3.3.0 && rbenv global 3.3.0'
        fi

        echo "Installing Rails..."
        sudo -u $REAL_USER bash -c 'export PATH="$HOME/.rbenv/bin:$HOME/.rbenv/shims:$PATH"; gem install bundler rails'
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
        if ! sudo -u $REAL_USER bash -c "command -v uv" &> /dev/null; then
             sudo -u $REAL_USER bash -c "curl -LsSf https://astral.sh/uv/install.sh | sh"
        else
             sudo -u $REAL_USER bash -c "uv self update"
        fi


        GO_VER="1.22.2"
        echo "Setup Go $GO_VER ($ARCH_GO)..."
        sudo rm -rf /usr/local/go
        wget -q "https://go.dev/dl/go${GO_VER}.linux-${ARCH_GO}.tar.gz" -O /tmp/go.tar.gz
        sudo tar -C /usr/local -xzf /tmp/go.tar.gz && rm /tmp/go.tar.gz

        echo "Setup Rust..."
        if ! command -v rustup &> /dev/null; then
             sudo -u $REAL_USER sh -c "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y"
        else
             sudo -u $REAL_USER rustup update
        fi
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
        sudo mkdir -p /etc/apt/keyrings
        curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg --yes
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
        # Docker
        # Docker does not publish packages for Debian testing/unstable — fall back to latest stable
        DOCKER_CODENAME="$DISTRO_CODENAME"
        if [[ "$DISTRO_ID" == "debian" ]]; then
            case "$DISTRO_CODENAME" in
                trixie|forky|sid|experimental) DOCKER_CODENAME="bookworm" ;;
            esac
        fi
        curl -fsSL "https://download.docker.com/linux/$DISTRO_ID/gpg" | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes
        sudo chmod a+r /etc/apt/keyrings/docker.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$DISTRO_ID $DOCKER_CODENAME stable" | sudo tee /etc/apt/sources.list.d/docker.list
        sudo apt-get update -qq
        sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin docker-buildx-plugin
        sudo usermod -aG docker $REAL_USER

        # Ansible
        if [[ "$DISTRO_ID" == "ubuntu" ]]; then
            sudo add-apt-repository --yes --update ppa:ansible/ansible
        fi
        sudo apt-get install -y ansible


        # GitHub CLI
        wget -qO- https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null
        sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
        sudo apt-get update -qq && sudo apt-get install -y gh
    fi
}


step_8() {
    echo "Installing Modern Unix Tools via Homebrew..."
    TOOLS="bat eza zoxide fzf ripgrep fd lazygit lazydocker neovim glow jq tldr fastfetch duf jq"

    if $IS_MACOS; then
        brew_cmd install $TOOLS
        
        echo "Installing Bruno (API Client)..."
        brew_cmd install --cask bruno
        
        # FZF keybindings setup
        if [ -d "$BREW_PREFIX/opt/fzf" ]; then
            sudo -u $REAL_USER "$BREW_PREFIX/opt/fzf/install" --all --no-bash --no-fish 2>/dev/null || true
        fi
    else
        # Find brew binary
        local BREW_BIN="/home/linuxbrew/.linuxbrew/bin/brew"
        [ ! -f "$BREW_BIN" ] && BREW_BIN="$REAL_HOME/.linuxbrew/bin/brew"

        if [ -f "$BREW_BIN" ]; then
            sudo -u $REAL_USER "$BREW_BIN" install $TOOLS || sudo -u $REAL_USER "$BREW_BIN" upgrade $TOOLS

            # FZF install script path
            local FZF_OPT="/home/linuxbrew/.linuxbrew/opt/fzf"
            [ ! -d "$FZF_OPT" ] && FZF_OPT="$REAL_HOME/.linuxbrew/opt/fzf"
            if [ -d "$FZF_OPT" ]; then
                sudo -u $REAL_USER "$FZF_OPT/install" --all --no-bash --no-fish > /dev/null 2>&1
            fi
        else
            echo -e "${RED}Error: Homebrew binary not found. Skipping modern tools installation.${NC}"
            return 1
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
        cat <<EOF > "$REAL_HOME/.zshrc"
# 1. PATH CONFIGURATION (Must come first!)
# Homebrew
if [[ -f "$BREW_PREFIX/bin/brew" ]]; then
    eval "\$($BREW_PREFIX/bin/brew shellenv)"
fi


# Define PATHs before loading plugins so they can find the tools
export PATH="\$HOME/.local/bin:\$PATH"
export PATH="\$HOME/.cargo/bin:\$PATH"
export PATH="\$HOME/.config/composer/vendor/bin:\$PATH"
export PATH="\$HOME/.composer/vendor/bin:\$PATH"
export GOPATH=\$HOME/go
export PATH=\$PATH:\$GOPATH/bin
export BUN_INSTALL="\$HOME/.bun"
export PATH="\$BUN_INSTALL/bin:\$PATH"


# 2. INIT TOOLS (Env Setup)
[ -f "\$HOME/.cargo/env" ] && source "\$HOME/.cargo/env"
if command -v rbenv >/dev/null; then eval "\$(rbenv init -)"; fi


# 3. OH-MY-ZSH CONFIG
export ZSH="\$HOME/.oh-my-zsh"
ZSH_THEME="" # Disabled because Starship handles it


# Plugins
plugins=(git rsync cp extract zoxide fzf zsh-autosuggestions zsh-syntax-highlighting brew gh ansible docker docker-compose laravel composer rails ruby python pip node npm bun golang rust macos)


source \$ZSH/oh-my-zsh.sh


# 4. STARSHIP & ZOXIDE
if command -v zoxide >/dev/null; then eval "\$(zoxide init zsh)"; fi
if command -v starship >/dev/null; then eval "\$(starship init zsh)"; fi


# 5. ALIASES
alias zconfig="nano ~/.zshrc"
alias reload="source ~/.zshrc"
alias update="brew update && brew upgrade"
alias d="docker"
alias dc="docker compose"
alias art="php artisan"
alias brewup="brew update && brew upgrade && brew cleanup"


# 6. SILENT LOAD (No echo messages)
EOF
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
        cat <<EOF > "$REAL_HOME/.zshrc"
# 1. PATH CONFIGURATION (Must come first!)
# Homebrew
if [ -f "/home/linuxbrew/.linuxbrew/bin/brew" ]; then
    eval "\$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
elif [ -f "\$HOME/.linuxbrew/bin/brew" ]; then
    eval "\$(\$HOME/.linuxbrew/bin/brew shellenv)"
fi


# Define PATHs before loading plugins so they can find the tools
export PATH="\$HOME/.local/bin:\$PATH"
export PATH="\$HOME/.cargo/bin:\$PATH"
export PATH="\$HOME/.config/composer/vendor/bin:\$PATH"
export PATH=\$PATH:/usr/local/go/bin
export GOPATH=\$HOME/go
export PATH=\$PATH:\$GOPATH/bin
export BUN_INSTALL="\$HOME/.bun"
export PATH="\$BUN_INSTALL/bin:\$PATH"
export PATH="\$HOME/.rbenv/bin:\$PATH"


# 2. INIT TOOLS (Env Setup)
[ -f "\$HOME/.cargo/env" ] && source "\$HOME/.cargo/env"
if command -v rbenv >/dev/null; then eval "\$(rbenv init -)"; fi


# 3. OH-MY-ZSH CONFIG
export ZSH="\$HOME/.oh-my-zsh"
ZSH_THEME="" # Disabled because Starship handles it


# Plugins
plugins=(git rsync nmap cp extract zoxide fzf zsh-autosuggestions zsh-syntax-highlighting tmux brew gh ansible docker docker-compose laravel composer rails ruby python pip node npm bun golang rust)


source \$ZSH/oh-my-zsh.sh


# 4. STARSHIP & ZOXIDE
if command -v zoxide >/dev/null; then eval "\$(zoxide init zsh)"; fi
if command -v starship >/dev/null; then eval "\$(starship init zsh)"; fi


# 5. ALIASES
alias zconfig="nano ~/.zshrc"
alias reload="source ~/.zshrc"
alias update="sudo apt update && sudo apt upgrade"
alias d="docker"
alias dc="docker compose"
alias art="php artisan"


# 6. SILENT LOAD (No echo messages)
EOF
        sudo chown $REAL_USER:$REAL_USER "$REAL_HOME/.zshrc"

        if [ "$SHELL" != "/bin/zsh" ] && [ "$SHELL" != "/usr/bin/zsh" ]; then
            sudo chsh -s $(which zsh) $REAL_USER
        fi
    fi
}


step_12() {
    if $IS_MACOS; then
        echo "Cleaning up Homebrew..."
        brew cleanup
        brew autoremove
    else
        echo "Cleaning up unnecessary packages..."
        sudo apt-get autoremove -y >/dev/null
        sudo apt-get clean
    fi

    echo "Configuring PM2 for auto-startup..."
    if $IS_MACOS; then
        sudo -u $REAL_USER pm2 startup launchd -u $REAL_USER --hp $REAL_HOME
        sudo -u $REAL_USER pm2 save
    else
        sudo -u $REAL_USER pm2 startup systemd -u $REAL_USER --hp $REAL_HOME
        sudo -u $REAL_USER pm2 save
    fi
    echo -e "${GREEN}✔ PM2 configured for auto-startup${NC}"
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