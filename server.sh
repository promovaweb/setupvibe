#!/bin/bash


# ==============================================================================
# SETUPVIBE.DEV - LINUX SERVER EDITION
# ==============================================================================
# Maintainer:    promovaweb.com
# Contact:       contato@promovaweb.com
# ------------------------------------------------------------------------------
# Compatibility: Bluefin, Zorin OS 18+, Ubuntu 24.04+, Debian 12+
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
VERSION="0.39.0"
INSTALL_URL="https://server.setupvibe.dev"

# --- ARGUMENT PARSING ---
SWARM_MANAGER=false
for arg in "$@"; do
    case "$arg" in
        --manager) SWARM_MANAGER=true ;;
    esac
done

echo -e "${CYAN}SetupVibe Server Edition v${VERSION}${NC}"
[[ "$SWARM_MANAGER" == "true" ]] && echo -e "${YELLOW}  → Docker Swarm Manager mode enabled${NC}"
echo ""

# --- ENVIRONMENT ---
export COMPOSER_ALLOW_SUPERUSER=1

# --- PLATFORM DETECTION (EARLY) ---
OS_RELEASE_ID=""
OS_RELEASE_VARIANT_ID=""

if [[ -r /etc/os-release ]]; then
    OS_RELEASE_ID=$(grep -E '^ID=' /etc/os-release | head -n1 | cut -d= -f2 | tr -d '"')
    OS_RELEASE_VARIANT_ID=$(grep -E '^VARIANT_ID=' /etc/os-release | head -n1 | cut -d= -f2 | tr -d '"')
fi

IS_BLUEFIN=false
if [[ "$OS_RELEASE_ID" == "bluefin" || "$OS_RELEASE_VARIANT_ID" == "bluefin" || -x "/usr/bin/rpm-ostree" ]]; then
    IS_BLUEFIN=true
fi

# --- PRIVILEGE HELPERS ---
# Must be defined before any usage in the script.

# Run with elevated privileges (only escalates when not already root)
sys_do() {
    if [[ "$(id -u)" -ne 0 ]]; then
        sudo "$@"
    else
        "$@"
    fi
}

# Run as the real user (drops from root to REAL_USER; no-op when already unprivileged)
user_do() {
    if [[ "$(id -u)" -eq 0 && -n "$REAL_USER" && "$REAL_USER" != "root" ]]; then
        runuser -u "$REAL_USER" -- "$@"
    else
        "$@"
    fi
}

# --- CLEANUP /tmp ---
echo -e "${YELLOW}Cleaning /tmp...${NC}"
sys_do rm -rf /tmp/* 2>/dev/null || true

if ! $IS_BLUEFIN; then
    # --- CLEANUP APT KEYRINGS & SOURCES ---
    echo -e "${YELLOW}Cleaning APT keyrings and sources lists...${NC}"
    # Remove only keyrings that this script will recreate (selective — preserves other software keys)
    sys_do mkdir -p -m 755 /etc/apt/keyrings
    sys_do rm -f /etc/apt/keyrings/docker.gpg \
               /etc/apt/keyrings/charm.gpg \
               /etc/apt/keyrings/githubcli-archive-keyring.gpg \
               /etc/apt/keyrings/ansible.gpg 2>/dev/null || true
    # Remove all .list files referencing third-party repos
    sys_do grep -rl 'docker\|nodesource\|charm\.sh\|cli\.github\|ansible\|codeiumdata\|windsurf\|antigravity\|pkg\.dev' \
        /etc/apt/sources.list.d/ 2>/dev/null | xargs sys_do rm -f 2>/dev/null || true
    # Clean APT cache and stale lists
    sys_do rm -rf /var/lib/apt/lists/*
    sys_do apt-get clean -qq

    # --- WAIT FOR APT LOCK ---
    echo -e "${YELLOW}Waiting for apt lock to be released...${NC}"
    for i in $(seq 1 30); do
        if ! sys_do fuser /var/lib/apt/lists/lock /var/lib/dpkg/lock-frontend /var/lib/dpkg/lock >/dev/null 2>&1; then
            break
        fi
        echo -e "${YELLOW}  apt lock held, waiting... (${i}/30)${NC}"
        sleep 2
    done
    # Stop packagekitd if it still holds the lock
    if sys_do fuser /var/lib/apt/lists/lock /var/lib/dpkg/lock-frontend /var/lib/dpkg/lock >/dev/null 2>&1; then
        echo -e "${YELLOW}  Stopping packagekitd to release apt lock...${NC}"
        sys_do systemctl stop packagekit 2>/dev/null || true
        sleep 2
    fi

    # --- ENSURE BASE TOOLS FOR REPO MANAGEMENT ---
    echo -e "${YELLOW}Installing base tools (gpg, curl, ca-certificates)...${NC}"
    export DEBIAN_FRONTEND=noninteractive
    sys_do apt-get update -y
    sys_do apt-get install -y -q gnupg gnupg2 curl ca-certificates lsb-release software-properties-common apt-transport-https
else
    echo -e "${YELLOW}Bluefin detected: skipping APT cleanup and repo bootstrap.${NC}"
fi

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
    "Tmux & Plugins"
    "Node.js & AI CLI Tools"
    "Finalization & Cleanup"
)

if [[ "$SWARM_MANAGER" == "true" ]]; then
    STEPS+=("Docker Swarm Manager Setup")
fi


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
DISTRO_ID="linux"
DISTRO_CODENAME="unknown"

if [[ -r /etc/os-release ]]; then
    DISTRO_ID=$(grep -E '^ID=' /etc/os-release | head -n1 | cut -d= -f2 | tr -d '"' | tr '[:upper:]' '[:lower:]')
    DISTRO_CODENAME=$(grep -E '^VERSION_CODENAME=' /etc/os-release | head -n1 | cut -d= -f2 | tr -d '"')
    if [[ -z "$DISTRO_CODENAME" ]]; then
        DISTRO_CODENAME=$(grep -E '^UBUNTU_CODENAME=' /etc/os-release | head -n1 | cut -d= -f2 | tr -d '"')
    fi
    [[ -z "$DISTRO_CODENAME" ]] && DISTRO_CODENAME=$(grep -E '^VERSION_ID=' /etc/os-release | head -n1 | cut -d= -f2 | tr -d '"')
fi
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


# --- DETECT ARCHITECTURE ---
ARCH_KERNEL=$(uname -m)
if [[ "$ARCH_KERNEL" == "x86_64" ]]; then
    ARCH_RAW="amd64"
    ARCH_GO="amd64"
elif [[ "$ARCH_KERNEL" == "aarch64" || "$ARCH_KERNEL" == "arm64" ]]; then
    ARCH_RAW="arm64"
    ARCH_GO="arm64"
else
    echo -e "${RED}Error: Architecture $ARCH_KERNEL is not supported.${NC}"
    exit 1
fi

BREW_PREFIX="/home/linuxbrew/.linuxbrew"


# --- INSTALL FIGLET & GIT ---
if $IS_BLUEFIN; then
    command -v figlet >/dev/null 2>&1 || echo -e "${YELLOW}figlet not found (optional on Bluefin).${NC}"
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

brew_cmd() {
    if [[ "$(id -u)" -eq 0 && -n "$REAL_USER" && "$REAL_USER" != "root" ]]; then
        ( cd "$REAL_HOME" && runuser -u "$REAL_USER" -- env HOME="$REAL_HOME" "$BREW_PREFIX/bin/brew" "$@" )
    else
        "$BREW_PREFIX/bin/brew" "$@"
    fi
}

run_in_real_home() {
    if [[ "$(id -u)" -eq 0 && -n "$REAL_USER" && "$REAL_USER" != "root" ]]; then
        ( cd "$REAL_HOME" && runuser -u "$REAL_USER" -- env HOME="$REAL_HOME" "$@" )
    else
        ( cd "$REAL_HOME" && env HOME="$REAL_HOME" "$@" )
    fi
}

apt_update() {
    if $IS_BLUEFIN; then
        echo "Bluefin detected: skipping apt update"
        return 0
    fi
    sys_do apt-get update -qq
}

apt_install() {
    if $IS_BLUEFIN; then
        echo "Bluefin detected: skipping apt install $*"
        return 0
    fi
    sys_do apt-get install -y "$@"
}

apt_add_repo() {
    if $IS_BLUEFIN; then
        echo "Bluefin detected: skipping apt repository configuration"
        return 0
    fi
    "$@"
}

brew_install() {
    if ! command -v brew &>/dev/null; then
        echo -e "${YELLOW}⚠ Homebrew not found. Skipping brew package install: $*${NC}"
        return 1
    fi
    brew_cmd install "$@" 2>/dev/null || brew_cmd upgrade "$@" 2>/dev/null || true
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


step_0() {
    echo "Architecture detected: $ARCH_RAW"
    echo "Operating System: Linux"
    echo "Distribution: $DISTRO_ID $DISTRO_CODENAME"
    echo "Real user: $REAL_USER"
    echo "Home directory: $REAL_HOME"
    return 0
}


step_1() {
    if $IS_BLUEFIN; then
        echo "Bluefin detected: running host pre-check (no apt installation)."
        local required_cmds=(git curl wget unzip tmux)
        for cmd in "${required_cmds[@]}"; do
            if ! command -v "$cmd" &>/dev/null; then
                echo -e "${YELLOW}⚠ Missing command on host: $cmd${NC}"
            fi
        done
    else
        echo "Updating APT..."
        apt_update

        echo "Installing Build Essentials & Core Server Tools..."
        apt_install \
            build-essential git wget unzip fontconfig curl sshpass \
            libssl-dev zlib1g-dev libbz2-dev libreadline-dev libsqlite3-dev \
            libncurses5-dev xz-utils libffi-dev liblzma-dev \
            libyaml-dev autoconf procps file tmux fzf \
            python3 python3-pip python3-venv python-is-python3 \
            cron logrotate rsyslog

        echo "Installing zoxide..."
        if ! command -v zoxide &>/dev/null; then
            curl -sSfL https://raw.githubusercontent.com/ajeetdsouza/zoxide/main/install.sh | user_do sh
        fi
    fi

    echo "Setup uv (Python Package Manager)..."
    if ! user_do bash -c "export PATH=\$HOME/.local/bin:\$PATH; command -v uv" &> /dev/null; then
        user_do bash -c "curl -LsSf https://astral.sh/uv/install.sh | sh"
    else
        user_do bash -c "export PATH=\$HOME/.local/bin:\$PATH; uv self update"
    fi
    export PATH="$REAL_HOME/.local/bin:$PATH"

    if ! $IS_BLUEFIN; then
        # Adding Charmbracelet Repo (needed for Glow)
        install_key "https://repo.charm.sh/apt/gpg.key" "/etc/apt/keyrings/charm.gpg"
        echo "deb [signed-by=/etc/apt/keyrings/charm.gpg] https://repo.charm.sh/apt/ * *" | sys_do tee /etc/apt/sources.list.d/charm.list
        apt_update
    fi
}


step_2() {
    echo "Checking Homebrew installation..."
    if $IS_BLUEFIN && ! command -v brew &>/dev/null; then
        echo -e "${RED}✘ Homebrew is required on Bluefin host.${NC}"
        echo -e "${YELLOW}Run: ujust devmode && ujust dx-group, reboot, then run this script again.${NC}"
        return 1
    fi

    if [ ! -d "/home/linuxbrew/.linuxbrew" ] && [ ! -d "$REAL_HOME/.linuxbrew" ]; then
        echo "Installing Homebrew..."
        if ! $IS_BLUEFIN; then
            apt_install build-essential procps curl file git
        fi

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
            user_do touch "$CONFIG_FILE"
        fi

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
        if [[ "$(id -u)" -eq 0 && "$REAL_USER" != "root" ]]; then
            eval "$(sudo -H -u "$REAL_USER" env HOME="$REAL_HOME" /home/linuxbrew/.linuxbrew/bin/brew shellenv 2>/dev/null)"
        else
            eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv 2>/dev/null)"
        fi
        export PATH="/home/linuxbrew/.linuxbrew/bin:/home/linuxbrew/.linuxbrew/sbin:$PATH"
    elif [ -f "$REAL_HOME/.linuxbrew/bin/brew" ]; then
        if [[ "$(id -u)" -eq 0 && "$REAL_USER" != "root" ]]; then
            eval "$(sudo -H -u "$REAL_USER" env HOME="$REAL_HOME" "$REAL_HOME/.linuxbrew/bin/brew" shellenv 2>/dev/null)"
        else
            eval "$("$REAL_HOME/.linuxbrew/bin/brew" shellenv 2>/dev/null)"
        fi
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
    if $IS_BLUEFIN; then
        echo "Bluefin detected: validating Docker from host DX image..."
        if command -v docker &>/dev/null; then
            echo -e "${GREEN}✔ Docker is available on host.${NC}"
        else
            echo -e "${YELLOW}⚠ Docker not found. Enable DX mode (ujust devmode + ujust dx-group) and reboot.${NC}"
        fi

        echo "Installing Ansible and GitHub CLI via Homebrew..."
        brew_install ansible
        brew_install gh
        return 0
    fi

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
    echo "deb [arch=$ARCH_RAW signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$DISTRO_ID $DOCKER_CODENAME stable" | sys_do tee /etc/apt/sources.list.d/docker.list
    
    apt_update
    apt_install docker-ce docker-ce-cli containerd.io docker-compose-plugin docker-buildx-plugin
    sys_do usermod -aG docker "$REAL_USER"

    # Ansible Strategy
    echo "Configuring Ansible..."
    if $IS_UBUNTU; then
        echo "Using Ubuntu Ansible PPA Strategy..."
        apt_add_repo sudo add-apt-repository --yes --update ppa:ansible/ansible
        apt_install ansible
    elif $IS_DEBIAN; then
        echo "Using Debian Ansible Strategy..."
        # Debian 12+ (Bookworm/Trixie) removes 'ansible' package; 'ansible-core' is the base.
        apt_install ansible-core
    fi

    # GitHub CLI
    echo "Installing GitHub CLI..."
    wget -qO- https://cli.github.com/packages/githubcli-archive-keyring.gpg | sys_do tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null
    sys_do chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg
    echo "deb [arch=$ARCH_RAW signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sys_do tee /etc/apt/sources.list.d/github-cli.list > /dev/null
    apt_update && apt_install gh
}


step_4() {
    echo "Installing Modern Unix Tools via Homebrew..."
    TOOLS="bat eza zoxide fzf ripgrep fd lazygit lazydocker neovim glow jq tldr fastfetch duf bandwhich gping trippy node@24 mise"

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
        user_do "$FZF_OPT/install" --all --no-bash --no-fish > /dev/null 2>&1
    fi

}


step_5() {
    if $IS_BLUEFIN; then
        echo "Installing Network & Monitoring tools via Homebrew..."
        brew_install rsync nmap mtr htop btop glances speedtest-cli
    else
        echo "Installing Network & Monitoring Tools (APT)..."
        apt_install \
            rsync net-tools dnsutils mtr-tiny nmap tcpdump \
            iftop nload iotop sysstat whois iputils-ping \
            speedtest-cli glances htop btop
    fi

    echo "Installing ctop for $ARCH_GO..."
    local CTOP_BIN="/usr/local/bin/ctop"
    if $IS_BLUEFIN; then
        mkdir -p "$REAL_HOME/.local/bin"
        CTOP_BIN="$REAL_HOME/.local/bin/ctop"
    fi
    if [ ! -f "$CTOP_BIN" ]; then
        user_do wget -q "https://github.com/bcicen/ctop/releases/download/v0.7.7/ctop-0.7.7-linux-${ARCH_GO}" -O "$CTOP_BIN"
        user_do chmod +x "$CTOP_BIN"
    fi

    echo "Installing Tailscale..."
    if $IS_BLUEFIN; then
        if command -v tailscale &>/dev/null; then
            echo "Tailscale already available on Bluefin host."
        else
            echo -e "${YELLOW}⚠ Tailscale not found on host image.${NC}"
        fi
    elif ! command -v tailscale &>/dev/null; then
        user_do curl -fsSL https://tailscale.com/install.sh | sys_do sh
    else
        echo "Tailscale already installed."
    fi
}


step_6() {
    if $IS_BLUEFIN; then
        echo "Bluefin detected: OpenSSH service should be enabled manually if needed."
        echo "Run: sudo systemctl enable --now sshd"
        return 0
    fi

    echo "Setting up SSH Server..."

    if ! command -v sshd &> /dev/null; then
        echo "Installing OpenSSH Server..."
        apt_install openssh-server openssh-client
    fi

    echo "Enabling SSH service..."
    sys_do systemctl enable ssh
    sys_do systemctl start ssh

    if [ ! -f /etc/ssh/sshd_config.backup ]; then
        sys_do cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup
        echo "Backed up original sshd_config"
    fi

    echo "Configuring SSH to allow root login..."
    sys_do sed -i 's/^#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config
    sys_do sed -i 's/^PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config
    sys_do sed -i 's/^#PermitRootLogin no/PermitRootLogin yes/' /etc/ssh/sshd_config
    sys_do sed -i 's/^PermitRootLogin no/PermitRootLogin yes/' /etc/ssh/sshd_config

    echo "Enabling password authentication for SSH..."
    sys_do sed -i 's/^#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config
    sys_do sed -i 's/^PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config

    if sys_do sshd -t &> /dev/null; then
        sys_do systemctl restart ssh
        echo -e "${GREEN}✔ SSH Server configured and running${NC}"
        echo ""
        echo "SSH Server Status:"
        sys_do systemctl status ssh --no-pager | grep -E 'Active|Loaded'
        echo ""
        echo "Current SSH Configuration:"
        grep -E '^PermitRootLogin|^PasswordAuthentication' /etc/ssh/sshd_config
    else
        echo -e "${RED}Error: SSH configuration failed validation${NC}"
        echo "Restoring original configuration..."
        sys_do cp /etc/ssh/sshd_config.backup /etc/ssh/sshd_config
        sys_do systemctl restart ssh
        return 1
    fi
}


step_7() {
    if $IS_BLUEFIN; then
        brew_install zsh
    else
        apt_install zsh
    fi

    if [ ! -d "$REAL_HOME/.oh-my-zsh" ]; then
        user_do sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended
    fi

    git_ensure "https://github.com/zsh-users/zsh-autosuggestions" "$REAL_HOME/.oh-my-zsh/custom/plugins/zsh-autosuggestions"
    git_ensure "https://github.com/zsh-users/zsh-syntax-highlighting" "$REAL_HOME/.oh-my-zsh/custom/plugins/zsh-syntax-highlighting"

    echo "Configuring Starship..."
    if $IS_BLUEFIN; then
        brew_install starship
    elif ! command -v starship &>/dev/null && [ ! -f "$REAL_HOME/.local/bin/starship" ]; then
        user_do mkdir -p "$REAL_HOME/.local/bin"
        curl -sS https://starship.rs/install.sh | user_do sh -s -- -y --bin-dir "$REAL_HOME/.local/bin"
    fi
    user_do mkdir -p "$REAL_HOME/.config"

    echo "Applying Starship Preset: Gruvbox Rainbow..."
    user_do starship preset gruvbox-rainbow -o "$REAL_HOME/.config/starship.toml"

    # Server ZSHRC
    safe_download https://raw.githubusercontent.com/promovaweb/setupvibe/main/conf/zshrc-server.zsh "$REAL_HOME/.zshrc"
    sys_do chown $REAL_USER:$REAL_USER "$REAL_HOME/.zshrc"

    if ! $IS_BLUEFIN && [ "$SHELL" != "/bin/zsh" ] && [ "$SHELL" != "/usr/bin/zsh" ]; then
        sys_do chsh -s $(which zsh) $REAL_USER
    elif $IS_BLUEFIN; then
        echo "Bluefin note: set zsh as default shell in Ptyxis profile instead of chsh."
    fi
}


step_8() {
    echo "Installing TPM (Tmux Plugin Manager)..."
    git_ensure "https://github.com/tmux-plugins/tpm" "$REAL_HOME/.tmux/plugins/tpm"

    echo "Downloading tmux-server.conf..."
    safe_download https://raw.githubusercontent.com/promovaweb/setupvibe/main/conf/tmux-server.conf "$REAL_HOME/.tmux.conf"

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


step_9() {
    if ! $IS_BLUEFIN; then
        echo "Installing Node.js 24 via NodeSource..."
        install_key "https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key" "/etc/apt/keyrings/nodesource.gpg"
        echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_24.x nodistro main" | sys_do tee /etc/apt/sources.list.d/nodesource.list
        apt_update
        apt_install nodejs
    fi

    local NPM_BIN
    NPM_BIN=$(command -v npm 2>/dev/null || echo "$BREW_PREFIX/bin/npm")

    if [ -z "$NPM_BIN" ] || [ ! -f "$NPM_BIN" ]; then
        echo -e "${RED}✘ npm not found after Node.js installation — skipping AI CLI Tools.${NC}"
        return 1
    fi

    # Configure npm for user-writable directory if not root
    if [[ "$(id -u)" -ne 0 ]]; then
        user_do mkdir -p "$REAL_HOME/.npm-global"
        user_do "$NPM_BIN" config set prefix "$REAL_HOME/.npm-global"
        export PATH="$REAL_HOME/.npm-global/bin:$PATH"
    fi

    AI_TOOLS=(
        "@anthropic-ai/claude-code"
        "@google/gemini-cli"
        "@openai/codex"
        "@githubnext/github-copilot-cli"
    )

    for pkg in "${AI_TOOLS[@]}"; do
        echo "Installing $pkg..."
        user_do "$NPM_BIN" install -g "$pkg" \
            2>/dev/null || echo -e "${YELLOW}⚠ Failed to install $pkg${NC}"
    done
}


step_10() {
    if ! $IS_BLUEFIN; then
        echo "Cleaning APT cache and orphaned packages..."
        sys_do apt-get autoremove -y -qq
        sys_do apt-get autoclean -qq
        sys_do apt-get clean -qq
        sys_do rm -rf /var/lib/apt/lists/*
    else
        echo "Bluefin detected: skipping APT cleanup."
    fi

    echo "Cleaning temp and log junk..."
    sys_do rm -rf /tmp/*.tar.gz /tmp/*.zip /tmp/ctop /tmp/starship 2>/dev/null || true
    sys_do journalctl --vacuum-time=7d 2>/dev/null || true

    echo "Cleaning user caches..."
    rm -rf "$REAL_HOME/.cache/pip" 2>/dev/null || true
    rm -rf "$REAL_HOME/.cache/composer" 2>/dev/null || true
    rm -rf "$REAL_HOME/.npm/_npx" 2>/dev/null || true
    rm -rf "$REAL_HOME/.bundle/cache" 2>/dev/null || true
}


step_swarm() {
    echo "Detecting public IP address..."
    PUBLIC_IP=""
    for service in \
        "https://api.ipify.org" \
        "https://ifconfig.me" \
        "https://icanhazip.com" \
        "https://checkip.amazonaws.com" \
        "https://ipecho.net/plain"; do
        PUBLIC_IP=$(curl -fsSL --max-time 10 "$service" 2>/dev/null | tr -d '[:space:]')
        if [[ "$PUBLIC_IP" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            echo -e "${GREEN}✔ Public IP detected: $PUBLIC_IP (via $service)${NC}"
            break
        fi
        PUBLIC_IP=""
    done

    if [[ -z "$PUBLIC_IP" ]]; then
        echo -e "${RED}✘ Could not determine public IP address. Aborting Swarm setup.${NC}"
        return 1
    fi

    echo "Initializing Docker Swarm (advertise address: $PUBLIC_IP)..."
    if docker info 2>/dev/null | grep -q "Swarm: active"; then
        echo -e "${YELLOW}⚠ Docker Swarm is already active — skipping init.${NC}"
    else
        if ! sys_do docker swarm init --advertise-addr "$PUBLIC_IP"; then
            echo -e "${RED}✘ Docker Swarm init failed.${NC}"
            return 1
        fi
        echo -e "${GREEN}✔ Docker Swarm initialized as manager node.${NC}"
    fi

    echo "Creating overlay network: network_swarm_public..."
    if docker network ls --format '{{.Name}}' | grep -q "^network_swarm_public$"; then
        echo -e "${YELLOW}⚠ Overlay network 'network_swarm_public' already exists — skipping.${NC}"
    else
        if ! sys_do docker network create \
            --driver overlay \
            --attachable \
            network_swarm_public; then
            echo -e "${RED}✘ Failed to create overlay network.${NC}"
            return 1
        fi
        echo -e "${GREEN}✔ Overlay network 'network_swarm_public' created.${NC}"
    fi

    echo ""
    echo -e "${CYAN}Docker Swarm join token (worker):${NC}"
    sys_do docker swarm join-token worker
    echo ""
    echo -e "${CYAN}Docker Swarm join token (manager):${NC}"
    sys_do docker swarm join-token manager
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
run_section 10 step_10

if [[ "$SWARM_MANAGER" == "true" ]]; then
    run_section 11 step_swarm
fi


# --- DOCKER SWARM PROMPT (only if --manager was not passed) ---
if [[ "$SWARM_MANAGER" == "false" ]]; then
    echo ""
    echo -e "${BLUE}========================================================${NC}"
    echo -e "${BOLD}         DOCKER SWARM MANAGER SETUP (OPTIONAL)         ${NC}"
    echo -e "${BLUE}========================================================${NC}"
    echo -e "${YELLOW}Do you want to configure this machine as a Docker Swarm Manager?${NC}"
    echo -e "  This will:"
    echo -e "  - Detect the public IP of this server"
    echo -e "  - Initialize Docker Swarm (${CYAN}docker swarm init${NC})"
    echo -e "  - Create overlay network ${CYAN}network_swarm_public${NC}"
    echo ""
    echo -ne "${BOLD}Configure as Swarm Manager? [y/N]: ${NC}"
    read -r SWARM_ANSWER < /dev/tty
    if [[ "$SWARM_ANSWER" =~ ^[yYsS]$ ]]; then
        SWARM_MANAGER=true
        STEPS+=("Docker Swarm Manager Setup")
        run_section 11 step_swarm
    else
        echo -e "${YELLOW}Skipping Docker Swarm setup.${NC}"
    fi
fi


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
