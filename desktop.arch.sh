#!/bin/bash

set -o pipefail


# ==============================================================================
# SETUPVIBE.DEV - DESKTOP DEVELOPER EDITION (V2.3 - Arch Linux Edition)
# ==============================================================================
# Maintainer:    promovaweb.com / Community
# Contact:       contato@promovaweb.com
# Contributing:  https://github.com/promovaweb/setupvibe/blob/main/CONTRIBUTING.md
# ------------------------------------------------------------------------------
# Compatibility: Arch Linux, Manjaro, BigLinux, EndeavourOS (systemd-based)
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
VERSION="0.41.11-arch"
PHP_VERSION="8.4" # Versão padrão estável nos repositórios do Arch
RUBY_VERSION="3.4.10"
PYTHON_VERSION="3.13"
GO_VERSION="1.26.5"
NERD_FONTS_VERSION="3.4.0"
CTOP_VERSION="0.7.7"
CTOP_SHA256_AMD64="b78374734ebe3d14b6edee3d5512c911c250d7fa7f3f964cb00acd3bc5a02a09"
CTOP_SHA256_ARM64="d8d91e0fea53a8c78fa81192f078272e5a92f0ea6c4f0e38ec7c944d76e6f02f"

echo -e "${CYAN}SetupVibe Desktop (Arch Edition) v${VERSION}${NC}"
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
        sudo "$@"
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

# Ensure cron (cronie no Arch) is active and has example tasks
cron_ensure() {
    echo "Ensuring cron service is active and configured..."
    sys_do systemctl enable --now cronie 2>/dev/null || true

    local CRON_HEARTBEAT="0 * * * * echo \"Cron heartbeat: \$(date)\" >> /tmp/cron-heartbeat.log"
    local CRON_DISK="0 0 * * * df -h > \$HOME/cron-disk-usage.log"

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
        echo "$NEW_CRON" | grep -v '^$' | user_do crontab -
        echo -e "${GREEN}✔ Crontab updated with example tasks.${NC}"
    else
        echo "Crontab already has example tasks."
    fi
}

if ! tty >/dev/null 2>&1 </dev/tty; then
    die "An interactive terminal is required to run desktop.sh."
fi

# --- DETECT AUR HELPER ---
detect_aur_helper() {
    if command -v yay &>/dev/null; then
        echo "yay"
    elif command -v paru &>/dev/null; then
        echo "paru"
    else
        echo ""
    fi
}

# --- PREPARE ARCH ENVIRONMENT ---
echo -e "${YELLOW}Preparing Arch Linux environment...${NC}"
sys_do pacman -Sy --noconfirm
sys_do pacman -S --needed --noconfirm base-devel git curl wget unzip gpg

# Instalar AUR Helper se não existir
if [[ -z $(detect_aur_helper) ]]; then
    echo -e "${YELLOW}No AUR helper found. Installing 'yay'...${NC}"
    # Não podemos rodar makepkg como root
    _TMP_AUR=$(mktemp -d)
    chown -R "$REAL_USER:$REAL_GROUP" "$_TMP_AUR"
    user_do git clone https://aur.archlinux.org/yay-bin.git "$_TMP_AUR/yay-bin"
    user_do bash -c "cd '$_TMP_AUR/yay-bin' && makepkg -si --noconfirm"
    rm -rf "$_TMP_AUR"
fi

AUR_CMD=$(detect_aur_helper)

# --- STEPS CONFIGURATION ---
STEPS=(
    "Base System & Build Tools"
    "AUR Helper Verification"
    "PHP Ecosystem & Composer"
    "Ruby Ecosystem (Rails)"
    "Languages (Go, Rust, Python + uv + qrcode)"
    "JavaScript (Node, Bun, PNPM)"
    "DevOps (Docker, Ansible, GH)"
    "Modern Unix Tools"
    "Network, Monitoring & Tailscale"
    "SSH Server"
    "Shell (ZSH & Starship Config)"
    "Tmux & Plugins"
    "AI CLI Tools"
    "Finalization & Cleanup"
)

declare -a STEP_STATUS
INSTALL_FAILED=false

OS_TYPE=$(uname -s)
if [[ "$OS_TYPE" != "Linux" ]]; then
    echo -e "${RED}Error: This script is exclusively for Arch-based Linux distributions.${NC}"
    exit 1
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
REAL_HOME=$(getent passwd "$REAL_USER" 2>/dev/null | cut -d: -f6)
[[ -z "$REAL_HOME" ]] && REAL_HOME="$HOME"
REAL_GROUP=$(id -gn "$REAL_USER" 2>/dev/null || echo "$REAL_USER")

DISTRO_ID=$(grep '^ID=' /etc/os-release | cut -d= -f2 | tr -d '"')
DISTRO_CODENAME=$(grep 'VERSION_ID=' /etc/os-release | cut -d= -f2 | tr -d '"')

ARCH_RAW=$(uname -m)
if [[ "$ARCH_RAW" == "x86_64" ]]; then
    ARCH_GO="amd64"
    CTOP_SHA256="$CTOP_SHA256_AMD64"
elif [[ "$ARCH_RAW" == "aarch64" || "$ARCH_RAW" == "arm64" ]]; then
    ARCH_GO="arm64"
    CTOP_SHA256="$CTOP_SHA256_ARM64"
else
    echo -e "${RED}Error: Architecture $ARCH_RAW is not supported.${NC}"
    exit 1
fi

# Install Figlet and Git for UI
sys_do pacman -S --needed --noconfirm figlet git


# --- UI & LOGIC FUNCTIONS ---

header() {
    clear
    echo -e "${MAGENTA}"
    figlet "SETUPVIBE" 2>/dev/null || echo "SETUPVIBE.DEV"
    echo -e "${NC}"
    echo -e "${CYAN}:: Desktop Developer Edition - Arch Linux ::${NC}"
    echo -e "${YELLOW}Maintained by PromovaWeb.com | Contact: contato@promovaweb.com${NC}"
    echo "--------------------------------------------------------"
    echo "OS: $DISTRO_ID | Arch: $ARCH_RAW | User: $REAL_USER"
    echo "--------------------------------------------------------"
}

show_roadmap_and_wait() {
    header
    echo -e "${BOLD}SetupVibe Desktop (Arch) - Installation Roadmap:${NC}\n"
    for i in "${!STEPS[@]}"; do
        echo -e "  [$(($i+1))/${#STEPS[@]}] ${STEPS[$i]}"
    done
    echo ""
    echo -e "--------------------------------------------------------"
    echo -e "${YELLOW}  ➜ Press [ENTER] to start SetupVibe Desktop.${NC}"
    echo -e "${RED}  ➜ Type 'q' + ENTER to cancel.${NC}"
    echo -e "--------------------------------------------------------"

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
            read -r GIT_NAME </dev/tty || die "Input unavailable."
        done
        while [[ -z "$GIT_EMAIL" ]]; do
            echo -ne "Enter your Email: "
            read -r GIT_EMAIL </dev/tty || die "Input unavailable."
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

    echo ""
    echo -e "${BLUE}========================================================${NC}"
    echo -e "${BOLD}▶ [$(($index+1))/${#STEPS[@]}] $title ${NC}"
    echo -e "${BLUE}========================================================${NC}"

    for managed_dir in \
        "$REAL_HOME/.bun/bin" \
        "$REAL_HOME/.npm-global/bin" \
        "$REAL_HOME/.cargo/bin" \
        "$REAL_HOME/.local/go/bin" \
        "$REAL_HOME/.local/bin"; do
        path_prepend_once "$managed_dir"
    done
    path_deduplicate
    export PATH

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
    sys_do chown -R "$REAL_USER:$REAL_GROUP" "$dest" 2>/dev/null || true
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
    if ! curl --proto '=https' --tlsv1.2 --fail --silent --show-error --location --retry 3 --output "$tmp" "$url"; then
        echo -e "${RED}✘ Download failed: $url${NC}"
        rm -f "$tmp"
        return 1
    fi

    local size
    size=$(wc -c < "$tmp")
    if [ "$size" -lt "$min_bytes" ]; then
        echo -e "${RED}✘ Downloaded file too small — skipping: $dest${NC}"
        rm -f "$tmp"
        return 1
    fi

    if [[ -n "$expected_sha256" ]] && ! printf '%s  %s\n' "$expected_sha256" "$tmp" | sha256sum --check --status; then
        echo -e "${RED}✘ Checksum verification failed: $url${NC}"
        rm -f -- "$tmp"
        return 1
    fi

    dest_dir=$(dirname "$dest")
    user_do mkdir -p "$dest_dir"

    if ! sys_do install -o "$REAL_USER" -g "$REAL_GROUP" -m 0644 "$tmp" "$dest"; then
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
    user_do rm -f "$REAL_HOME/.setupvibe/bin/ssh_copy_id"
    if ! safe_download https://raw.githubusercontent.com/promovaweb/setupvibe/main/bin/ssh_copy_id "$REAL_HOME/.setupvibe/bin/ssh_copy_id" 500; then
        return 1
    fi
    user_do chmod +x "$REAL_HOME/.setupvibe/bin/ssh_copy_id"
    sys_do chown -R "$REAL_USER:$REAL_GROUP" "$REAL_HOME/.setupvibe"
}

install_herdr() {
    local herdr_os="linux"
    local herdr_arch
    case "$ARCH_RAW" in
        x86_64|amd64) herdr_arch=x86_64 ;;
        arm64|aarch64) herdr_arch=aarch64 ;;
        *) return 1 ;;
    esac
    local herdr_target="${herdr_os}-${herdr_arch}"
    user_do mkdir -p "$REAL_HOME/.setupvibe/tmp"
    local herdr_tmp_dir=$(user_do mktemp -d "$REAL_HOME/.setupvibe/tmp/herdr.XXXXXX")
    local manifest_tmp="$herdr_tmp_dir/latest.json"
    local binary_tmp="$herdr_tmp_dir/herdr"

    safe_download https://herdr.dev/latest.json "$manifest_tmp" 1000 || return 1
    local herdr_url=$(jq -er --arg target "$herdr_target" '.assets[$target]' "$manifest_tmp")
    safe_download "$herdr_url" "$binary_tmp" 100000 || return 1

    user_do mkdir -p "$REAL_HOME/.local/bin"
    sys_do install -o "$REAL_USER" -g "$REAL_GROUP" -m 0755 "$binary_tmp" "$REAL_HOME/.local/bin/herdr"
    user_do rm -rf "$herdr_tmp_dir"
    echo -e "${GREEN}✔ Herdr installed.${NC}"
}

install_antigravity() {
    local antigravity_platform="linux_amd64"
    [[ "$ARCH_RAW" == "arm64" || "$ARCH_RAW" == "aarch64" ]] && antigravity_platform="linux_arm64"
    
    user_do mkdir -p "$REAL_HOME/.local/bin"
    # Instalação via binário padrão oficial do Google Antigravity
    user_do curl -sSL https://antigravity.google/cli/install.sh | user_do bash -s -- --skip-path --skip-aliases --no-modify-path || true
    echo -e "${GREEN}✔ Antigravity CLI installed.${NC}"
}


# --- STEPS IMPLEMENTATION (Arch Linux) ---

step_1() {
    echo "Installing essential build tools and libraries via pacman..."
    sys_do pacman -S --needed --noconfirm \
        base-devel wget unzip fontconfig curl sshpass \
        openssl zlib bzip2 readline sqlite llvm ncurses xz tk libxml2 libffi libyaml autoconf bison procps file tmux ffmpeg imagemagick cronie
}

step_2() {
    echo "Verifying AUR Helper ($AUR_CMD)..."
    if [[ -z "$AUR_CMD" ]]; then
        echo -e "${RED}✘ No AUR helper available.${NC}"
        return 1
    fi
    echo -e "${GREEN}✔ Using AUR helper: $AUR_CMD${NC}"
}

step_3() {
    echo "Installing PHP $PHP_VERSION & Extensions..."
    sys_do pacman -S --needed --noconfirm \
        php php-cgi php-sqlite php-gd php-intl php-imagick php-pgsql php-apache

    # Ativar extensões comuns no php.ini se necessário
    echo "Installing Composer..."
    if ! command -v composer &>/dev/null; then
        sys_do pacman -S --needed --noconfirm composer
    else
        user_do composer self-update || true
    fi

    echo "Installing Laravel Installer..."
    user_do composer global require laravel/installer
}

step_4() {
    echo "Setting up Rbenv & Ruby $RUBY_VERSION..."
    git_ensure "https://github.com/rbenv/rbenv.git" "$REAL_HOME/.rbenv"
    git_ensure "https://github.com/rbenv/ruby-build.git" "$REAL_HOME/.rbenv/plugins/ruby-build"
    sys_do chown -R "$REAL_USER:$REAL_GROUP" "$REAL_HOME/.rbenv"

    user_do bash -c 'echo "gem: --no-document" > "$HOME/.gemrc"'

    if ! user_do bash -c 'export PATH="$HOME/.rbenv/bin:$PATH"; eval "$(rbenv init -)"; rbenv versions --bare | grep -Fxq "'$RUBY_VERSION'"'; then
        echo "Compiling Ruby $RUBY_VERSION..."
        user_do bash -c 'export PATH="$HOME/.rbenv/bin:$PATH"; eval "$(rbenv init -)"; rbenv install "'$RUBY_VERSION'" && rbenv global "'$RUBY_VERSION'"'
    fi

    user_do bash -c 'export PATH="$HOME/.rbenv/bin:$PATH"; eval "$(rbenv init -)"; gem install bundler rails --no-document'
}

install_qrcode() {
    local python_bin=$1
    user_do "$python_bin" -m pip install --user --upgrade --break-system-packages qrcode
}

step_5() {
    echo "Setup Python, uv, Go, and Rust..."
    sys_do pacman -S --needed --noconfirm python python-pip python-virtualenv go rustup

    install_qrcode /usr/bin/python3

    # uv
    if ! user_do bash -c "command -v uv" &>/dev/null; then
        user_do curl -LsSf https://astral.sh/uv/install.sh | sh
    fi

    # Rust toolchain init
    user_do rustup default stable || true

    # Go environment setup
    export PATH="$REAL_HOME/.local/go/bin:$PATH"

    # Cronboard
    if ! user_do bash -c "export PATH=\$HOME/.local/bin:\$PATH; command -v cronboard" &>/dev/null; then
        user_do bash -c "export PATH=\$HOME/.local/bin:\$PATH; uv tool install git+https://github.com/antoniorodr/cronboard" || true
    fi

    cron_ensure
}

step_6() {
    echo "Setup Node.js, Bun, PNPM..."
    sys_do pacman -S --needed --noconfirm nodejs npm

    if [[ "$REAL_USER" != "root" ]]; then
        user_do mkdir -p "$REAL_HOME/.npm-global"
        user_do npm config set prefix "$REAL_HOME/.npm-global"
    fi

    # Bun
    user_do bash -c "curl -fsSL https://bun.sh/install | bash"

    local npm_bin=$(command -v npm)
    local npm_path=$(user_do "$npm_bin" config get prefix)/bin:$PATH

    user_do env PATH="$npm_path" "$npm_bin" install -g pnpm pm2
}

step_7() {
    echo "Configuring DevOps tools (Docker, Ansible, GitHub CLI)..."
    sys_do pacman -S --needed --noconfirm docker docker-compose ansible github-cli

    sys_do usermod -aG docker "$REAL_USER"
    sys_do systemctl enable --now docker

    # Portainer Setup
    user_do mkdir -p "$REAL_HOME/.setupvibe/portainer_data"
    safe_download https://raw.githubusercontent.com/promovaweb/setupvibe/main/conf/portainer-compose.yml "$REAL_HOME/.setupvibe/portainer-compose.yml"
    sys_do chown -R "$REAL_USER:$REAL_GROUP" "$REAL_HOME/.setupvibe"

    if command -v docker &>/dev/null && sys_do docker info &>/dev/null; then
        sys_do docker compose -f "$REAL_HOME/.setupvibe/portainer-compose.yml" up -d
    fi
}

step_8() {
    echo "Installing Modern Unix Tools via Pacman & AUR..."
    local -a official_tools=(bat eza zoxide fzf ripgrep fd lazygit lazydocker neovim glow tldr fastfetch duf jq)
    sys_do pacman -S --needed --noconfirm "${official_tools[@]}"

    # mise via AUR se necessário, ou binário direto
    $AUR_CMD -S --needed --noconfirm mise-bin || true
}

step_9() {
    echo "Installing Network Tools & Tailscale..."
    sys_do pacman -S --needed --noconfirm rsync net-tools bind nmap tcpdump iftop nload iotop sysstat whois iputils speedtest-cli glances htop btop tailscale

    # Ferramentas em Rust
    for tool in bandwhich gping trippy rustscan; do
        user_do bash -c "export PATH=\$HOME/.cargo/bin:\$PATH; cargo install $tool" || true
    done

    # ctop
    if ! command -v ctop &>/dev/null; then
        user_do mkdir -p "$REAL_HOME/.local/bin"
        safe_download \
            "https://github.com/bcicen/ctop/releases/download/v${CTOP_VERSION}/ctop-${CTOP_VERSION}-linux-${ARCH_GO}" \
            "$REAL_HOME/.local/bin/ctop" \
            1000000 \
            "$CTOP_SHA256"
        user_do chmod +x "$REAL_HOME/.local/bin/ctop"
    fi

    sys_do systemctl enable --now tailscaled
}

step_10() {
    echo "Setting up SSH Server..."
    sys_do pacman -S --needed --noconfirm openssh
    sys_do systemctl enable --now sshd

    sys_do mkdir -p /etc/ssh/sshd_config.d
    printf '%s\n' \
        '# Managed by SetupVibe' \
        'PermitRootLogin prohibit-password' \
        'PasswordAuthentication yes' \
        | sys_do tee /etc/ssh/sshd_config.d/99-setupvibe.conf > /dev/null

    sys_do systemctl restart sshd
}

step_11() {
    install_setupvibe_bin
    sys_do pacman -S --needed --noconfirm zsh starship ttf-firacode-nerd ttf-jetbrains-mono-nerd

    if [ ! -d "$REAL_HOME/.oh-my-zsh" ]; then
        user_do sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended
    fi

    git_ensure "https://github.com/zsh-users/zsh-autosuggestions" "$REAL_HOME/.oh-my-zsh/custom/plugins/zsh-autosuggestions"
    git_ensure "https://github.com/zsh-users/zsh-syntax-highlighting" "$REAL_HOME/.oh-my-zsh/custom/plugins/zsh-syntax-highlighting"

    user_do mkdir -p "$REAL_HOME/.config"
    user_do starship preset gruvbox-rainbow --force -o "$REAL_HOME/.config/starship.toml"

    safe_download https://raw.githubusercontent.com/promovaweb/setupvibe/main/conf/zshrc-linux.zsh "$REAL_HOME/.zshrc"
    sys_do chown "$REAL_USER:$REAL_GROUP" "$REAL_HOME/.zshrc"

    if [ "$SHELL" != "/usr/bin/zsh" ]; then
        sys_do chsh -s /usr/bin/zsh "$REAL_USER"
    fi
}

step_12() {
    echo "Installing TPM & Tmux Config..."
    git_ensure "https://github.com/tmux-plugins/tpm" "$REAL_HOME/.tmux/plugins/tpm"
    safe_download https://raw.githubusercontent.com/promovaweb/setupvibe/main/conf/tmux-desktop.conf "$REAL_HOME/.tmux.conf"
    sys_do chown -R "$REAL_USER:$REAL_GROUP" "$REAL_HOME/.tmux" "$REAL_HOME/.tmux.conf"
}

step_13() {
    echo "Installing AI CLI Tools..."
    local npm_bin=$(command -v npm)
    local npm_path=$(user_do "$npm_bin" config get prefix)/bin:$PATH

    for pkg in "@anthropic-ai/claude-code" "@openai/codex" "@github/copilot" opencode-ai; do
        user_do env PATH="$npm_path" "$npm_bin" install -g "$pkg" || true
    done

    install_herdr
    install_antigravity
}

step_14() {
    echo "Cleaning up package cache and temp files..."
    sys_do pacman -Rns $(pacman -Qdtq) --noconfirm 2>/dev/null || true
    sys_do pacman -Sc --noconfirm
    rm -rf /tmp/*.tar.gz /tmp/*.zip 2>/dev/null || true

    echo "Configuring PM2 Startup..."
    local pm2_bin=$(command -v pm2)
    if [[ -n "$pm2_bin" ]]; then
        sys_do env PATH="$PATH" "$pm2_bin" startup systemd -u "$REAL_USER" --hp "$REAL_HOME"
        user_do "$pm2_bin" save
    fi
    echo -e "${GREEN}✔ Arch Linux setup completed successfully!${NC}"
}


# --- MAIN EXECUTION ---

show_roadmap_and_wait
configure_git_interactive

echo -e "\n${GREEN}Starting SetupVibe Desktop (Arch Edition) installation...${NC}"

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

echo ""
echo -e "${BLUE}========================================================${NC}"
echo -e "${BOLD}        SETUPVIBE DESKTOP (ARCH) - SUMMARY              ${NC}"
echo -e "${BLUE}========================================================${NC}"
for i in "${!STEPS[@]}"; do
    echo -e "  [$(($i+1))] ${STEPS[$i]} ... ${STEP_STATUS[$i]}"
done
echo ""

if $INSTALL_FAILED; then
    echo -e "${RED}${BOLD}SetupVibe Desktop completed with errors.${NC}" >&2
    exit 1
fi

echo -e "${GREEN}${BOLD}SetupVibe Desktop for Arch Linux Completed Successfully! 🚀${NC}"
echo -e "${YELLOW}Run 'exec zsh' to apply your new terminal shell configuration.${NC}"
