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
VERSION="0.27.1"
INSTALL_URL="https://raw.githubusercontent.com/promovaweb/setupvibe/refs/heads/main/server.sh"

echo -e "${CYAN}SetupVibe Server Edition v${VERSION}${NC}"
echo ""


# --- ROOT & SUDO CHECK ---
if [[ "${EUID}" -eq 0 ]]; then
    echo -e "${RED}Error: Do not run this script as root.${NC}"
    echo -e "Run as a regular user with sudo privileges."
    exit 1
fi

if ! sudo -n true 2>/dev/null; then
    echo -e "${YELLOW}Sudo access is required. Validating...${NC}"
    if ! sudo -v; then
        echo -e "${RED}Error: This script requires sudo privileges.${NC}"
        exit 1
    fi
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
    "Finalization & Cleanup"
)


# Variable to track status
declare -a STEP_STATUS


# --- DETECT REAL USER ---
REAL_USER=$(whoami)
REAL_HOME="$HOME"


# --- DETECT DISTRO ---
DISTRO_ID=$(lsb_release -is | tr '[:upper:]' '[:lower:]')
DISTRO_CODENAME=$(lsb_release -cs)
if [[ "$DISTRO_ID" == "zorin" ]]; then DISTRO_ID="ubuntu"; fi


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
apt-get update >/dev/null && apt-get install -y figlet git lsb-release >/dev/null


# --- UI & LOGIC FUNCTIONS ---

brew_cmd() {
    "$BREW_PREFIX/bin/brew" "$@"
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
    apt-get update -qq

    echo "Installing Build Essentials & Core Server Tools..."
    apt-get install -y software-properties-common
    apt-get install -y \
        build-essential git wget unzip fontconfig curl \
        libssl-dev zlib1g-dev libbz2-dev libreadline-dev libsqlite3-dev \
        libncurses5-dev xz-utils libffi-dev liblzma-dev \
        libyaml-dev autoconf procps file tmux \
        python3 python3-pip python3-venv python-is-python3 \
        cron logrotate rsyslog

    echo "Setup uv (Python Package Manager)..."
    if ! sudo -u $REAL_USER bash -c "command -v uv" &> /dev/null; then
        sudo -u $REAL_USER bash -c "curl -LsSf https://astral.sh/uv/install.sh | sh"
    else
        sudo -u $REAL_USER bash -c "uv self update"
    fi

    # Adding Charmbracelet Repo (needed for Glow)
    mkdir -p -m 755 /etc/apt/keyrings
    curl -fsSL https://repo.charm.sh/apt/gpg.key | gpg --dearmor -o /etc/apt/keyrings/charm.gpg --yes
    chmod a+r /etc/apt/keyrings/charm.gpg
    echo "deb [signed-by=/etc/apt/keyrings/charm.gpg] https://repo.charm.sh/apt/ * *" | tee /etc/apt/sources.list.d/charm.list
    apt-get update -qq
}


step_2() {
    if [ "$REAL_USER" == "root" ]; then
        echo -e "${RED}Error: Homebrew cannot be installed as root user.${NC}"
        echo -e "${YELLOW}Please run this script using sudo from a regular user account.${NC}"
        return 1
    fi

    echo "Checking Homebrew installation..."
    if [ ! -d "/home/linuxbrew/.linuxbrew" ] && [ ! -d "$REAL_HOME/.linuxbrew" ]; then
        echo "Installing Homebrew..."
        apt-get install -y build-essential procps curl file git

        if [ ! -d "/home/linuxbrew" ]; then
            echo "Creating /home/linuxbrew directory..."
            mkdir -p /home/linuxbrew
            chown -R $REAL_USER:$(id -gn $REAL_USER) /home/linuxbrew
            chmod -R 775 /home/linuxbrew
        fi

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
        eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
        export PATH="/home/linuxbrew/.linuxbrew/bin:/home/linuxbrew/.linuxbrew/sbin:$PATH"
    elif [ -f "$REAL_HOME/.linuxbrew/bin/brew" ]; then
        eval "$($REAL_HOME/.linuxbrew/bin/brew shellenv)"
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
    if [ ! -f "/etc/apt/sources.list.d/docker.list" ]; then
        curl -fsSL "https://download.docker.com/linux/$DISTRO_ID/gpg" | gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes
        chmod a+r /etc/apt/keyrings/docker.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$DISTRO_ID $DISTRO_CODENAME stable" | tee /etc/apt/sources.list.d/docker.list
        apt-get update -qq
    fi
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    usermod -aG docker $REAL_USER

    # Ansible
    echo "Installing Ansible..."
    if [[ "$DISTRO_ID" == "ubuntu" ]]; then
        add-apt-repository --yes --update ppa:ansible/ansible
    fi
    apt-get install -y ansible

    # GitHub CLI
    echo "Installing GitHub CLI..."
    wget -qO- https://cli.github.com/packages/githubcli-archive-keyring.gpg | tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null
    chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null
    apt-get update -qq && apt-get install -y gh
}


step_4() {
    echo "Installing Modern Unix Tools via Homebrew..."
    TOOLS="bat eza zoxide fzf ripgrep fd lazygit lazydocker neovim glow jq tldr fastfetch duf bandwhich gping trippy"

    local BREW_BIN="/home/linuxbrew/.linuxbrew/bin/brew"
    [ ! -f "$BREW_BIN" ] && BREW_BIN="$REAL_HOME/.linuxbrew/bin/brew"

    if [ -f "$BREW_BIN" ]; then
        sudo -u $REAL_USER "$BREW_BIN" install $TOOLS || sudo -u $REAL_USER "$BREW_BIN" upgrade $TOOLS

        # FZF keybindings
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


step_5() {
    echo "Installing Network & Monitoring Tools (APT)..."
    apt-get install -y \
        rsync net-tools dnsutils mtr-tiny nmap tcpdump \
        iftop nload iotop sysstat whois iputils-ping \
        speedtest-cli glances htop btop

    echo "Installing ctop for $ARCH_GO..."
    if [ ! -f "/usr/local/bin/ctop" ]; then
        wget -q "https://github.com/bcicen/ctop/releases/download/v0.7.7/ctop-0.7.7-linux-${ARCH_GO}" -O /usr/local/bin/ctop
        chmod +x /usr/local/bin/ctop
    fi

    echo "Installing Tailscale..."
    if ! command -v tailscale &>/dev/null; then
        curl -fsSL https://tailscale.com/install.sh | sh
    else
        echo "Tailscale already installed."
    fi
}


step_6() {
    echo "Setting up SSH Server..."

    if ! command -v sshd &> /dev/null; then
        echo "Installing OpenSSH Server..."
        apt-get install -y openssh-server openssh-client
    fi

    echo "Enabling SSH service..."
    systemctl enable ssh
    systemctl start ssh

    if [ ! -f /etc/ssh/sshd_config.backup ]; then
        cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup
        echo "Backed up original sshd_config"
    fi

    echo "Configuring SSH to allow root login..."
    sed -i 's/^#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config
    sed -i 's/^PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config
    sed -i 's/^#PermitRootLogin no/PermitRootLogin yes/' /etc/ssh/sshd_config
    sed -i 's/^PermitRootLogin no/PermitRootLogin yes/' /etc/ssh/sshd_config

    echo "Enabling password authentication for SSH..."
    sed -i 's/^#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config
    sed -i 's/^PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config

    if sshd -t &> /dev/null; then
        systemctl restart ssh
        echo -e "${GREEN}✔ SSH Server configured and running${NC}"
        echo ""
        echo "SSH Server Status:"
        systemctl status ssh --no-pager | grep -E 'Active|Loaded'
        echo ""
        echo "Current SSH Configuration:"
        grep -E '^PermitRootLogin|^PasswordAuthentication' /etc/ssh/sshd_config
    else
        echo -e "${RED}Error: SSH configuration failed validation${NC}"
        echo "Restoring original configuration..."
        cp /etc/ssh/sshd_config.backup /etc/ssh/sshd_config
        systemctl restart ssh
        return 1
    fi
}


step_7() {
    apt-get install -y zsh

    if [ ! -d "$REAL_HOME/.oh-my-zsh" ]; then
        sudo -u $REAL_USER sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended
    fi

    git_ensure "https://github.com/zsh-users/zsh-autosuggestions" "$REAL_HOME/.oh-my-zsh/custom/plugins/zsh-autosuggestions"
    git_ensure "https://github.com/zsh-users/zsh-syntax-highlighting" "$REAL_HOME/.oh-my-zsh/custom/plugins/zsh-syntax-highlighting"

    echo "Configuring Starship..."
    curl -sS https://starship.rs/install.sh | sh -s -- -y
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

    chown $REAL_USER:$REAL_USER "$REAL_HOME/.zshrc"

    if [ "$SHELL" != "/bin/zsh" ] && [ "$SHELL" != "/usr/bin/zsh" ]; then
        chsh -s $(which zsh) $REAL_USER
    fi
}


step_8() {
    echo "Cleaning up unnecessary packages..."
    apt-get autoremove -y >/dev/null
    apt-get clean
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
