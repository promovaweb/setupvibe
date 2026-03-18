#!/bin/bash


# ==============================================================================
# SETUPVIBE.DEV - LINUX SERVER EDITION
# ==============================================================================
# Maintainer:    promovaweb.com
# Contact:       contact@promovaweb.com
# ------------------------------------------------------------------------------
# Compatibility: Zorin OS 18+, Ubuntu 24.04+, Debian 12+
# Architectures: x86_64 (amd64) & ARM64 (aarch64/arm64)
# Target:        Linux servers — no desktop or dev language tools
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
VERSION="0.29.1"
INSTALL_URL="https://raw.githubusercontent.com/promovaweb/setupvibe/refs/heads/main/server.sh"

echo -e "${CYAN}SetupVibe Server Edition v${VERSION}${NC}"
echo ""

# --- CLEANUP /tmp ---
echo -e "${YELLOW}Cleaning /tmp...${NC}"
sudo rm -rf /tmp/* 2>/dev/null || true

# --- CLEANUP APT KEYRINGS & SOURCES ---
echo -e "${YELLOW}Cleaning APT keyrings and sources lists...${NC}"
# Remove only keyrings that this script will recreate (selective — preserves other software keys)
sudo mkdir -p -m 755 /etc/apt/keyrings
sudo rm -f /etc/apt/keyrings/docker.gpg \
           /etc/apt/keyrings/charm.gpg \
           /etc/apt/keyrings/githubcli-archive-keyring.gpg \
           /etc/apt/keyrings/ansible.gpg 2>/dev/null || true
# Remove all .list files referencing third-party repos
sudo grep -rl 'docker\|nodesource\|charm\.sh\|cli\.github\|ansible\|codeiumdata\|windsurf\|antigravity\|pkg\.dev' \
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

# --- LINUX ONLY ---
if [[ "$(uname -s)" != "Linux" ]]; then
    echo -e "${RED}Error: This script is for Linux servers only.${NC}"
    exit 1
fi


# --- STEPS CONFIGURATION ---
STEPS=(
    "SetupVibe: Prerequisites & Arch Check"
    "Base System & Build Tools"
    "Homebrew (Package Manager)"
    "Docker, Ansible & GitHub CLI"
    "Modern Unix Tools (Via Brew)"
    "Network, Monitoring & Tailscale"
    "SSH Server"
    "Shell (ZSH & Starship Config)"
    "AI CLI Tools"
    "Finalization & Cleanup"
)


# Variable to track status
declare -a STEP_STATUS


# --- DETECT REAL USER ---
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
# Last resort: if still root, detect from Homebrew installation ownership
if [[ "$REAL_USER" == "root" && -d "/home/linuxbrew/.linuxbrew" ]]; then
    _BREW_OWNER=$(stat -c '%U' /home/linuxbrew/.linuxbrew 2>/dev/null)
    if [[ -n "$_BREW_OWNER" && "$_BREW_OWNER" != "root" ]]; then
        REAL_USER="$_BREW_OWNER"
    fi
fi
REAL_HOME=$(getent passwd "$REAL_USER" 2>/dev/null | cut -d: -f6)
[[ -z "$REAL_HOME" ]] && REAL_HOME="$HOME"


# --- DETECT DISTRO ---
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


# --- DETECT ARCHITECTURE ---
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


# --- INSTALL FIGLET & GIT ---
sudo apt-get update -qq 2>/dev/null || true
sudo apt-get install -y figlet git lsb-release >/dev/null 2>&1 || sudo apt-get install -y --fix-missing figlet git lsb-release >/dev/null


# --- UI & LOGIC FUNCTIONS ---

brew_cmd() {
    if [[ "$(id -u)" -eq 0 && -n "$REAL_USER" && "$REAL_USER" != "root" ]]; then
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
    echo -e "${CYAN}:: Linux Server Edition ::${NC}"
    echo -e "${YELLOW}Maintained by PromovaWeb.com | Contact: contact@promovaweb.com${NC}"
    echo "--------------------------------------------------------"
    echo "OS: $DISTRO_ID $DISTRO_CODENAME | Arch: $ARCH_RAW | User: $REAL_USER"
    echo "--------------------------------------------------------"
}


show_roadmap_and_wait() {
    header
    echo -e "${BOLD}SetupVibe Server - Installation Roadmap:${NC}\n"
    for i in "${!STEPS[@]}"; do
        echo -e "  [$(($i+1))/${#STEPS[@]}] ${STEPS[$i]}"
    done
    echo ""
    echo -e "--------------------------------------------------------"
    echo -e "${YELLOW}  ➜ Press [ENTER] to start SetupVibe Server Edition.${NC}"
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
            read GIT_NAME < /dev/tty
        done

        while [[ -z "$GIT_EMAIL" ]]; do
            echo -ne "Enter your Email: "
            read GIT_EMAIL < /dev/tty
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
    sudo chown -R $REAL_USER:$(id -gn $REAL_USER) "$dest" 2>/dev/null || true
}


# --- INSTALLATION STEPS ---


step_0() {
    echo "Architecture detected: $ARCH_RAW"
    echo "Operating System: Linux"
    echo "Distribution: $DISTRO_ID $DISTRO_CODENAME"
    echo "Real user: $REAL_USER"
    echo "Home directory: $REAL_HOME"
    return 0
}


step_1() {
    echo "Updating APT..."
    sudo apt-get update -qq

    echo "Installing Build Essentials & Core Server Tools..."
    sudo apt-get install -y software-properties-common
    sudo apt-get install -y \
        build-essential git wget unzip fontconfig curl sshpass \
        libssl-dev zlib1g-dev libbz2-dev libreadline-dev libsqlite3-dev \
        libncurses5-dev xz-utils libffi-dev liblzma-dev \
        libyaml-dev autoconf procps file tmux \
        python3 python3-pip python3-venv python-is-python3 \
        cron logrotate rsyslog

    echo "Setup uv (Python Package Manager)..."
    if ! sudo -u $REAL_USER bash -c "export PATH=\$HOME/.local/bin:\$PATH; command -v uv" &> /dev/null; then
        sudo -u $REAL_USER bash -c "curl -LsSf https://astral.sh/uv/install.sh | sh"
    else
        sudo -u $REAL_USER bash -c "export PATH=\$HOME/.local/bin:\$PATH; uv self update"
    fi
    export PATH="$REAL_HOME/.local/bin:$PATH"

    # Adding Charmbracelet Repo (needed for Glow)
    sudo mkdir -p -m 755 /etc/apt/keyrings
    curl -fsSL https://repo.charm.sh/apt/gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/charm.gpg --yes
    sudo chmod a+r /etc/apt/keyrings/charm.gpg
    echo "deb [signed-by=/etc/apt/keyrings/charm.gpg] https://repo.charm.sh/apt/ * *" | sudo tee /etc/apt/sources.list.d/charm.list
    sudo apt-get update -qq
}


step_2() {
    echo "Checking Homebrew installation..."
    if [ ! -d "/home/linuxbrew/.linuxbrew" ] && [ ! -d "$REAL_HOME/.linuxbrew" ]; then
        echo "Installing Homebrew..."
        sudo apt-get install -y build-essential procps curl file git

        if [ ! -d "/home/linuxbrew" ]; then
            echo "Creating /home/linuxbrew directory..."
            sudo mkdir -p /home/linuxbrew
            sudo chown -R $REAL_USER:$(id -gn $REAL_USER) /home/linuxbrew
            sudo chmod -R 775 /home/linuxbrew
        fi

        sudo -u $REAL_USER NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
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
        if [ ! -f "$CONFIG_FILE" ]; then
            sudo -u $REAL_USER touch "$CONFIG_FILE"
        fi

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

    if command -v brew &>/dev/null; then
        echo -e "${GREEN}✔ Homebrew is ready and available in PATH.${NC}"
    else
        echo -e "${RED}✘ Homebrew installation failed or brew not found in PATH.${NC}"
        return 1
    fi
}


step_3() {
    # Docker
    echo "Installing Docker..."
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
    echo "Installing Ansible..."
    if [[ "$DISTRO_ID" == "ubuntu" ]]; then
        sudo add-apt-repository --yes --update ppa:ansible/ansible
        sudo apt-get install -y ansible
    else
        # ansible package was removed from Debian 12+ official repos; ansible-core is the replacement
        sudo apt-get install -y ansible-core
    fi

    # GitHub CLI
    echo "Installing GitHub CLI..."
    wget -qO- https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null
    sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
    sudo apt-get update -qq && sudo apt-get install -y gh
}


step_4() {
    echo "Installing Modern Unix Tools via Homebrew..."
    TOOLS="bat eza zoxide fzf ripgrep fd lazygit lazydocker neovim glow jq tldr fastfetch duf bandwhich gping trippy node@24"

    if ! command -v brew &>/dev/null; then
        echo -e "${RED}Error: Homebrew binary not found. Skipping modern tools installation.${NC}"
        return 1
    fi

    brew_cmd install $TOOLS || brew_cmd upgrade $TOOLS
    brew_cmd link node@24 --force --overwrite 2>/dev/null || true

    # FZF keybindings
    local FZF_OPT="/home/linuxbrew/.linuxbrew/opt/fzf"
    [ ! -d "$FZF_OPT" ] && FZF_OPT="$REAL_HOME/.linuxbrew/opt/fzf"
    if [ -d "$FZF_OPT" ]; then
        sudo -H -u $REAL_USER "$FZF_OPT/install" --all --no-bash --no-fish > /dev/null 2>&1
    fi

}


step_5() {
    echo "Installing Network & Monitoring Tools (APT)..."
    sudo apt-get install -y \
        rsync net-tools dnsutils mtr-tiny nmap tcpdump \
        iftop nload iotop sysstat whois iputils-ping \
        speedtest-cli glances htop btop

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
}


step_6() {
    echo "Setting up SSH Server..."

    if ! command -v sshd &> /dev/null; then
        echo "Installing OpenSSH Server..."
        sudo apt-get install -y openssh-server openssh-client
    fi

    echo "Enabling SSH service..."
    sudo systemctl enable ssh
    sudo systemctl start ssh

    if [ ! -f /etc/ssh/sshd_config.backup ]; then
        sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup
        echo "Backed up original sshd_config"
    fi

    echo "Configuring SSH to allow root login..."
    sudo sed -i 's/^#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config
    sudo sed -i 's/^PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config
    sudo sed -i 's/^#PermitRootLogin no/PermitRootLogin yes/' /etc/ssh/sshd_config
    sudo sed -i 's/^PermitRootLogin no/PermitRootLogin yes/' /etc/ssh/sshd_config

    echo "Enabling password authentication for SSH..."
    sudo sed -i 's/^#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config
    sudo sed -i 's/^PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config

    if sudo sshd -t &> /dev/null; then
        sudo systemctl restart ssh
        echo -e "${GREEN}✔ SSH Server configured and running${NC}"
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


step_7() {
    sudo apt-get install -y zsh

    if [ ! -d "$REAL_HOME/.oh-my-zsh" ]; then
        sudo -u $REAL_USER sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended
    fi

    git_ensure "https://github.com/zsh-users/zsh-autosuggestions" "$REAL_HOME/.oh-my-zsh/custom/plugins/zsh-autosuggestions"
    git_ensure "https://github.com/zsh-users/zsh-syntax-highlighting" "$REAL_HOME/.oh-my-zsh/custom/plugins/zsh-syntax-highlighting"

    echo "Configuring Starship..."
    curl -sS https://starship.rs/install.sh | sudo sh -s -- -y
    mkdir -p "$REAL_HOME/.config"

    echo "Applying Starship Preset: Gruvbox Rainbow..."
    sudo -u $REAL_USER starship preset gruvbox-rainbow -o "$REAL_HOME/.config/starship.toml"

    # Server ZSHRC
    cat <<EOF > "$REAL_HOME/.zshrc"
# 1. PATH CONFIGURATION (Must come first!)
# Homebrew
if [ -f "/home/linuxbrew/.linuxbrew/bin/brew" ]; then
    eval "\$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
elif [ -f "\$HOME/.linuxbrew/bin/brew" ]; then
    eval "\$(\$HOME/.linuxbrew/bin/brew shellenv)"
fi

export PATH="\$HOME/.local/bin:\$PATH"
export BUN_INSTALL="\$HOME/.bun"


# 2. OH-MY-ZSH CONFIG
export ZSH="\$HOME/.oh-my-zsh"
ZSH_THEME="" # Disabled because Starship handles it

# Plugins
plugins=(git rsync nmap cp extract zoxide fzf zsh-autosuggestions zsh-syntax-highlighting tmux brew gh ansible docker docker-compose)

source \$ZSH/oh-my-zsh.sh


# 3. STARSHIP & ZOXIDE
if command -v zoxide >/dev/null; then eval "\$(zoxide init zsh)"; fi
if command -v starship >/dev/null; then eval "\$(starship init zsh)"; fi


# 4. ALIASES
alias zconfig="nano ~/.zshrc"
alias reload="source ~/.zshrc"
alias update="sudo apt update && sudo apt upgrade"
alias d="docker"
alias dc="docker compose"
alias brewup="brew update && brew upgrade && brew cleanup"
alias syslog="sudo journalctl -f"
alias ports="ss -tulnp"
alias meminfo="free -h"
alias diskinfo="df -h"
alias cpuinfo="lscpu"
alias wholistening="ss -tulnp"
EOF

    sudo chown $REAL_USER:$REAL_USER "$REAL_HOME/.zshrc"

    if [ "$SHELL" != "/bin/zsh" ] && [ "$SHELL" != "/usr/bin/zsh" ]; then
        sudo chsh -s $(which zsh) $REAL_USER
    fi
}


step_8() {
    local NPM_BIN
    NPM_BIN=$(command -v npm 2>/dev/null || echo "$BREW_PREFIX/bin/npm")

    if [ ! -f "$NPM_BIN" ]; then
        echo -e "${YELLOW}⚠ npm not found — skipping AI CLI Tools.${NC}"
        return 1
    fi

    AI_TOOLS=(
        "@anthropic-ai/claude-code"
        "@google/gemini-cli"
        "@openai/codex"
        "@githubnext/github-copilot-cli"
    )

    for pkg in "${AI_TOOLS[@]}"; do
        echo "Installing $pkg..."
        ( cd "$REAL_HOME" && runuser -u "$REAL_USER" -- env HOME="$REAL_HOME" "$NPM_BIN" install -g "$pkg" ) \
            2>/dev/null || echo -e "${YELLOW}⚠ Failed to install $pkg${NC}"
    done
}


step_9() {
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
    rm -rf "$REAL_HOME/.npm/_npx" 2>/dev/null || true
    rm -rf "$REAL_HOME/.bundle/cache" 2>/dev/null || true
}


# --- MAIN EXECUTION ---


show_roadmap_and_wait
configure_git_interactive


echo -e "\n${GREEN}Starting SetupVibe Server installation...${NC}"


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


# --- FINALIZATION ---
echo ""
echo -e "${BLUE}========================================================${NC}"
echo -e "${BOLD}         SETUPVIBE SERVER - INSTALLATION SUMMARY        ${NC}"
echo -e "${BLUE}========================================================${NC}"
for i in "${!STEPS[@]}"; do
    echo -e "  [$(($i+1))] ${STEPS[$i]} ... ${STEP_STATUS[$i]}"
done
echo ""
echo -e "${GREEN}${BOLD}SetupVibe Server Edition Completed Successfully! 🚀${NC}"
echo ""
echo -e "${YELLOW}${BOLD}IMPORTANT - Apply changes to your shell:${NC}"
echo -e "${CYAN}For ZSH users:${NC}    source ~/.zshrc"
echo ""
echo -e "${YELLOW}Or restart your terminal / logout and login again.${NC}"
