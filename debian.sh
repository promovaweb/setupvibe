#!/bin/bash


# ==============================================================================
# SETUPVIBE.DEV - ULTIMATE DEV ENVIRONMENT (V2.2 - Starship Preset)
# ==============================================================================
# Courtesy:     promovaweb.com
# Contact:      contato@promovaweb.com
# ------------------------------------------------------------------------------
# Compatibility: Zorin OS 18+, Ubuntu 24.04+, Debian 12+
# Architectures: x86_64 (amd64) & ARM64 (aarch64)
# Update: Uses native 'starship preset gruvbox-rainbow'
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


# --- STEPS CONFIGURATION ---
STEPS=(
    "SetupVibe: Prerequisites & Arch Check"
    "Base System & Build Tools"
    "Homebrew (Package Manager)"
    "PHP 8.4 Ecosystem (Laravel)"
    "Ruby Ecosystem (Rails)"
    "Languages (Go, Rust, Python + uv)"
    "JavaScript (Node, Bun, PNPM)"
    "DevOps (Docker, Ansible, GH)"
    "Modern Unix Tools (Via Brew)"
    "Network & Monitoring"
    "Shell (ZSH & Starship Config)"
    "Finalization & Cleanup"
)


# Variable to track status
declare -a STEP_STATUS


# --- 1. INITIAL PREPARATION ---


# Root Check
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: SetupVibe requires root permissions.${NC}"
    echo "Run: sudo ./setupvibe.sh"
    exit 1
fi


# Detect Real User (SUDO_USER)
if [ -z "$SUDO_USER" ]; then
    REAL_USER="root"
    REAL_HOME="/root"
else
    REAL_USER=$SUDO_USER
    REAL_HOME=$(getent passwd $REAL_USER | cut -d: -f6)
fi


# Detect Distro
DISTRO_ID=$(lsb_release -is | tr '[:upper:]' '[:lower:]')
DISTRO_CODENAME=$(lsb_release -cs)
if [[ "$DISTRO_ID" == "zorin" ]]; then DISTRO_ID="ubuntu"; fi


# Detect Architecture
ARCH_RAW=$(dpkg --print-architecture)
if [[ "$ARCH_RAW" == "amd64" ]]; then
    ARCH_GO="amd64"
elif [[ "$ARCH_RAW" == "arm64" ]]; then
    ARCH_GO="arm64"
else
    echo -e "${RED}Error: Architecture $ARCH_RAW is not supported.${NC}"
    exit 1
fi


# Install Figlet and Git silently for UI
apt-get update >/dev/null && apt-get install -y figlet git >/dev/null


# --- UI & LOGIC FUNCTIONS ---


header() {
    clear
    echo -e "${MAGENTA}"
    figlet "SETUPVIBE" 2>/dev/null || echo "SETUPVIBE.DEV"
    echo -e "${NC}"
    echo -e "${CYAN}:: The Pure Developer Environment ::${NC}"
    echo -e "${YELLOW}Courtesy of PromovaWeb.com | Contact: contato@promovaweb.com${NC}"
    echo "--------------------------------------------------------"
    echo "OS: $DISTRO_ID $DISTRO_CODENAME | Arch: $ARCH_RAW | User: $REAL_USER"
    echo "--------------------------------------------------------"
}


show_roadmap_and_wait() {
    header
    echo -e "${BOLD}SetupVibe Roadmap:${NC}\n"
    for i in "${!STEPS[@]}"; do
        echo -e "  [$(($i+1))/${#STEPS[@]}] ${STEPS[$i]}"
    done
    echo ""
    echo -e "--------------------------------------------------------"
    echo -e "${YELLOW}  ➜ [ENTER] to start SetupVibe.${NC}"
    echo -e "${RED}  ➜ [ESC] to cancel.${NC}"
    echo -e "--------------------------------------------------------"


    while true; do
        read -r -s -n 1 key
        if [[ "$key" == "" ]]; then break; fi # Enter
        if [[ "$key" == $'\e' ]]; then # ESC
            echo -e "\n${RED}[CANCELLED] See you next time!${NC}"
            exit 0
        fi
    done
}


configure_git_interactive() {
    echo ""
    echo -e "${BLUE}=== Checking Git Identity ===${NC}"
    
    CURRENT_NAME=$(sudo -u $REAL_USER git config --global user.name)
    CURRENT_EMAIL=$(sudo -u $REAL_USER git config --global user.email)


    if [[ -n "$CURRENT_NAME" && -n "$CURRENT_EMAIL" ]]; then
        echo -e "${GREEN}✔ Git configured:${NC} $CURRENT_NAME ($CURRENT_EMAIL)"
    else
        echo -e "${YELLOW}⚠ Git not configured. Let's fix that now.${NC}"
        echo ""
        
        GIT_NAME=""
        GIT_EMAIL=""


        while [[ -z "$GIT_NAME" ]]; do
            echo -ne "Enter your Full Name: "
            read GIT_NAME
        done


        while [[ -z "$GIT_EMAIL" ]]; do
            echo -ne "Enter your Email: "
            read GIT_EMAIL
        done


        sudo -u $REAL_USER git config --global user.name "$GIT_NAME"
        sudo -u $REAL_USER git config --global user.email "$GIT_EMAIL"
        sudo -u $REAL_USER git config --global init.defaultBranch main
        
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
}


# --- INSTALLATION STEPS ---


step_0() {
    echo "Architecture detected: $ARCH_RAW"
    return 0 
}


step_1() {
    echo "Updating APT..."
    apt-get update -qq
    echo "Installing Build Essentials & Tmux..."
    # Installing tmux here via APT is robust
    apt-get install -y build-essential git wget unzip fontconfig curl software-properties-common \
        libssl-dev zlib1g-dev libbz2-dev libreadline-dev libsqlite3-dev llvm \
        libncurses5-dev xz-utils tk-dev libxml2-dev libxmlsec1-dev libffi-dev liblzma-dev \
        libyaml-dev autoconf bison rustc cargo procps file tmux
    
    # Adding Charmbracelet Repo (needed for Glow)
    mkdir -p -m 755 /etc/apt/keyrings
    curl -fsSL https://repo.charm.sh/apt/gpg.key | gpg --dearmor -o /etc/apt/keyrings/charm.gpg --yes
    chmod a+r /etc/apt/keyrings/charm.gpg
    echo "deb [signed-by=/etc/apt/keyrings/charm.gpg] https://repo.charm.sh/apt/ * *" | tee /etc/apt/sources.list.d/charm.list
    apt-get update -qq
}


step_2() {
    # Homebrew cannot be installed as root
    if [ "$REAL_USER" == "root" ]; then
        echo -e "${RED}Error: Homebrew cannot be installed as root user.${NC}"
        echo -e "${YELLOW}Please run this script using sudo from a regular user account.${NC}"
        return 1
    fi

    echo "Checking Homebrew installation..."
    # Homebrew default path check
    if [ ! -d "/home/linuxbrew/.linuxbrew" ] && [ ! -d "$REAL_HOME/.linuxbrew" ]; then
        echo "Installing Homebrew..."
        # Ensure dependencies are present (mostly done in step_1 but safe to be explicit)
        apt-get install -y build-essential procps curl file git
        
        # Execute installer as the real user
        sudo -u $REAL_USER NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    else
        echo "Homebrew already installed. Checking for updates..."
        local BREW_EXEC="/home/linuxbrew/.linuxbrew/bin/brew"
        [ ! -f "$BREW_EXEC" ] && BREW_EXEC="$REAL_HOME/.linuxbrew/bin/brew"
        
        if [ -f "$BREW_EXEC" ]; then
            sudo -u $REAL_USER "$BREW_EXEC" update
        fi
    fi

    # Load brew for this script context (root)
    if [ -f "/home/linuxbrew/.linuxbrew/bin/brew" ]; then
        eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
    elif [ -f "$REAL_HOME/.linuxbrew/bin/brew" ]; then
        eval "$($REAL_HOME/.linuxbrew/bin/brew shellenv)"
    fi

    # Persistent PATH for Bash transition and persistent login
    # We add it to .bashrc so even before switching to ZSH or if the user stays in Bash, it works.
    for CONFIG_FILE in "$REAL_HOME/.bashrc" "$REAL_HOME/.profile"; do
        if [ -f "$CONFIG_FILE" ]; then
            if ! grep -q "linuxbrew" "$CONFIG_FILE"; then
                echo -e "\n# Homebrew Configuration" >> "$CONFIG_FILE"
                echo 'if [ -d "/home/linuxbrew/.linuxbrew" ]; then eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"; fi' >> "$CONFIG_FILE"
                echo 'if [ -d "$HOME/.linuxbrew" ]; then eval "$($HOME/.linuxbrew/bin/brew shellenv)"; fi' >> "$CONFIG_FILE"
                chown $REAL_USER:$REAL_USER "$CONFIG_FILE"
            fi
        fi
    done

    # Verify installation successes
    if command -v brew &>/dev/null; then
        echo -e "${GREEN}✔ Homebrew is ready.${NC}"
    else
        echo -e "${RED}✘ Homebrew installation failed or brew not found in PATH.${NC}"
        return 1
    fi
}


step_3() {
    echo "Configuring PHP Repository..."
    if [[ "$DISTRO_ID" == "ubuntu" ]]; then
        add-apt-repository ppa:ondrej/php -y
    else
        curl -sSLo /usr/share/keyrings/deb.sury.org-php.gpg https://packages.sury.org/php/apt.gpg
        sh -c 'echo "deb [signed-by=/usr/share/keyrings/deb.sury.org-php.gpg] https://packages.sury.org/php/ $(lsb_release -sc) main" > /etc/apt/sources.list.d/php.list'
    fi
    apt-get update -qq
    echo "Installing PHP 8.4 & Extensions..."
    apt-get install -y php8.4 php8.4-cli php8.4-common php8.4-dev \
        php8.4-curl php8.4-mbstring php8.4-xml php8.4-zip php8.4-bcmath php8.4-intl \
        php8.4-mysql php8.4-pgsql php8.4-sqlite3 php8.4-gd php8.4-imagick \
        php8.4-redis php8.4-mongodb php8.4-yaml php8.4-xdebug


    if [ ! -f "/usr/local/bin/composer" ]; then
        echo "Installing Composer..."
        curl -sS https://getcomposer.org/installer | php
        mv composer.phar /usr/local/bin/composer
        chmod +x /usr/local/bin/composer
    else
        sudo composer self-update
    fi
    echo "Setup Laravel Installer..."
    sudo -u $REAL_USER composer global require laravel/installer
}


step_4() {
    echo "Setup Rbenv..."
    git_ensure "https://github.com/rbenv/rbenv.git" "$REAL_HOME/.rbenv"
    git_ensure "https://github.com/rbenv/ruby-build.git" "$REAL_HOME/.rbenv/plugins/ruby-build"
    
    cd "$REAL_HOME/.rbenv" && src/configure && make -C src >/dev/null 2>&1


    echo "Checking Ruby 3.3.0..."
    if ! sudo -u $REAL_USER bash -c 'export PATH="$HOME/.rbenv/bin:$PATH"; eval "$(rbenv init -)"; rbenv versions --bare | grep -q "^3.3.0$"'; then
        echo "Compiling Ruby 3.3.0..."
        sudo -u $REAL_USER bash -c 'export PATH="$HOME/.rbenv/bin:$PATH"; eval "$(rbenv init -)"; rbenv install 3.3.0 && rbenv global 3.3.0'
    fi
    
    echo "Installing Rails..."
    sudo -u $REAL_USER bash -c 'export PATH="$HOME/.rbenv/bin:$HOME/.rbenv/shims:$PATH"; gem install bundler rails'
}


step_5() {
    echo "Setup Python..."
    apt-get install -y python3 python3-pip python3-venv python-is-python3
    
    echo "Setup uv (Python Package Manager)..."
    if ! sudo -u $REAL_USER bash -c "command -v uv" &> /dev/null; then
         sudo -u $REAL_USER bash -c "curl -LsSf https://astral.sh/uv/install.sh | sh"
    else
         sudo -u $REAL_USER bash -c "uv self update"
    fi


    GO_VER="1.22.2"
    echo "Setup Go $GO_VER ($ARCH_GO)..."
    rm -rf /usr/local/go
    wget -q "https://go.dev/dl/go${GO_VER}.linux-${ARCH_GO}.tar.gz" -O /tmp/go.tar.gz
    tar -C /usr/local -xzf /tmp/go.tar.gz && rm /tmp/go.tar.gz
    
    echo "Setup Rust..."
    if ! command -v rustup &> /dev/null; then
         sudo -u $REAL_USER sh -c "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y"
    else
         sudo -u $REAL_USER rustup update
    fi
}


step_6() {
    echo "Setup NodeSource..."
    if [ ! -f "/etc/apt/sources.list.d/nodesource.list" ]; then
        mkdir -p /etc/apt/keyrings
        curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg --yes
        echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list
        apt-get update -qq
    fi
    apt-get install -y nodejs
    npm install -g pnpm npm@latest
    
    echo "Setup Bun..."
    sudo -u $REAL_USER bash -c "curl -fsSL https://bun.sh/install | bash"
}


step_7() {
    # Docker
    if [ ! -f "/etc/apt/sources.list.d/docker.list" ]; then
        curl -fsSL "https://download.docker.com/linux/$DISTRO_ID/gpg" | gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes
        chmod a+r /etc/apt/keyrings/docker.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$DISTRO_ID $DISTRO_CODENAME stable" | tee /etc/apt/sources.list.d/docker.list
        apt-get update -qq
    fi
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    usermod -aG docker $REAL_USER
    
    # Ansible
    if [[ "$DISTRO_ID" == "ubuntu" ]]; then
        add-apt-repository --yes --update ppa:ansible/ansible
    fi
    apt-get install -y ansible


    # GitHub CLI
    wget -qO- https://cli.github.com/packages/githubcli-archive-keyring.gpg | tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null
    chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null
    apt-get update -qq && apt-get install -y gh
}


step_8() {
    echo "Installing Modern Unix Tools via Homebrew..."
    TOOLS="bat eza zoxide fzf ripgrep fd lazygit lazydocker neovim glow jq tldr"
    
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
}


step_9() {
    echo "Installing Network Tools (APT)..."
    apt-get install -y rsync net-tools dnsutils mtr-tiny nmap tcpdump iftop nload iotop sysstat whois iputils-ping speedtest-cli glances htop btop
    
    echo "Installing Network Tools (Rust)..."
    for tool in bandwhich gping trippy; do
        if ! sudo -u $REAL_USER bash -c "export PATH=\$HOME/.cargo/bin:\$PATH; command -v $tool" &> /dev/null; then
             sudo -u $REAL_USER bash -c "export PATH=\$HOME/.cargo/bin:\$PATH; cargo install $tool"
        fi
    done


    echo "Installing ctop for $ARCH_GO..."
    if [ ! -f "/usr/local/bin/ctop" ]; then
        wget -q "https://github.com/bcicen/ctop/releases/download/v0.7.7/ctop-0.7.7-linux-${ARCH_GO}" -O /usr/local/bin/ctop
        chmod +x /usr/local/bin/ctop
    fi
}


step_10() {
    apt-get install -y zsh
    
    if [ ! -d "$REAL_HOME/.oh-my-zsh" ]; then
        sudo -u $REAL_USER sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended
    fi
    
    git_ensure "https://github.com/zsh-users/zsh-autosuggestions" "$REAL_HOME/.oh-my-zsh/custom/plugins/zsh-autosuggestions"
    git_ensure "https://github.com/zsh-users/zsh-syntax-highlighting" "$REAL_HOME/.oh-my-zsh/custom/plugins/zsh-syntax-highlighting"
    
    echo "Installing Nerd Fonts (FiraCode)..."
    mkdir -p "$REAL_HOME/.local/share/fonts"
    wget -q --show-progress -O /tmp/FiraCode.zip https://github.com/ryanoasis/nerd-fonts/releases/download/v3.1.1/FiraCode.zip
    unzip -o -q /tmp/FiraCode.zip -d "$REAL_HOME/.local/share/fonts"
    chown -R $REAL_USER:$REAL_USER "$REAL_HOME/.local"
    fc-cache -f >/dev/null


    echo "Configuring Starship..."
    curl -sS https://starship.rs/install.sh | sh -s -- -y
    mkdir -p "$REAL_HOME/.config"
    
    # --- APPLYING PRESET (gruvbox-rainbow) ---
    echo "Applying Starship Preset: Gruvbox Rainbow..."
    sudo -u $REAL_USER starship preset gruvbox-rainbow -o "$REAL_HOME/.config/starship.toml"


    # --- FIXED ZSHRC (Correct Load Order) ---
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
    chown $REAL_USER:$REAL_USER "$REAL_HOME/.zshrc"
    
    if [ "$SHELL" != "/bin/zsh" ] && [ "$SHELL" != "/usr/bin/zsh" ]; then
        chsh -s $(which zsh) $REAL_USER
    fi
}


step_11() {
    echo "Cleaning up unnecessary packages..."
    apt-get autoremove -y >/dev/null
    apt-get clean
}


# --- MAIN EXECUTION ---


show_roadmap_and_wait
configure_git_interactive


echo -e "\n${GREEN}Starting the transformation of your setup...${NC}"


# Execution Loop
run_section 0 step_0
run_section 1 step_1
run_section 2 step_2
run_section 3 step_3
run_section 4 step_4
run_section 5 step_5
run_section 6 step_6
run_section 7 step_7
run_section 8 step_8
run_section 9 step_9
run_section 10 step_10
run_section 11 step_11


# --- FINALIZATION ---
echo ""
echo -e "${BLUE}========================================================${NC}"
echo -e "${BOLD}              SETUPVIBE STATUS                          ${NC}"
echo -e "${BLUE}========================================================${NC}"
for i in "${!STEPS[@]}"; do
    echo -e "  [$(($i+1))] ${STEPS[$i]} ... ${STEP_STATUS[$i]}"
done
echo ""
echo -e "${GREEN}${BOLD}SetupVibe Completed Successfully! 🚀${NC}"
echo -e "${YELLOW}Please restart your terminal or Logout/Login to apply changes.${NC}"