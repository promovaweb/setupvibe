#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'

# ==============================================================================
# SETUPVIBE.DEV - LINUX SERVER EDITION
# ==============================================================================
# Maintainer:    promovaweb.com
# Contact:       contato@promovaweb.com
# Contributing:  https://github.com/promovaweb/setupvibe/blob/main/CONTRIBUTING.md
# ------------------------------------------------------------------------------
# Compatibility: Zorin OS 18+, Ubuntu 24.04+, Debian 12+
# Architectures: x86_64 (amd64) & ARM64 (aarch64/arm64)
# Target:        Linux servers — no desktop or dev language tools
# ==============================================================================

# --- COLORS & STYLE ---
readonly BOLD='\033[1m'
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly BLUE='\033[0;34m'
readonly YELLOW='\033[1;33m'
readonly CYAN='\033[0;36m'
readonly MAGENTA='\033[0;35m'
readonly NC='\033[0m'

# --- VERSION & DOWNLOADS ---
readonly VERSION="0.41.11"
readonly CTOP_VERSION="0.7.7"
readonly CTOP_SHA256_AMD64="b78374734ebe3d14b6edee3d5512c911c250d7fa7f3f964cb00acd3bc5a02a09"
readonly CTOP_SHA256_ARM64="d8d91e0fea53a8c78fa81192f078272e5a92f0ea6c4f0e38ec7c944d76e6f02f"

# --- HELPERS ---
usage() {
    cat <<EOF
Usage: server.sh [OPTIONS]

Options:
  --manager                 Configure this host as a Docker Swarm manager.
  --advertise-addr ADDRESS  Swarm address or interface to advertise; implies --manager.
  -y, --yes                 Skip the initial confirmation prompt.
  -h, --help                Show this help message.
  --version                 Show the SetupVibe version.
EOF
}

die() {
    echo -e "${RED}Error: $*${NC}" >&2
    exit 1
}

warn() {
    echo -e "${YELLOW}Warning: $*${NC}" >&2
}

os_release_value() {
    local key=$1
    local value

    value=$(awk -F= -v key="$key" '$1 == key {sub(/^[^=]*=/, ""); print; exit}' /etc/os-release)
    value=${value#\"}
    value=${value%\"}
    value=${value#\'}
    value=${value%\'}
    printf '%s' "$value"
}

# Run as the detected target user.
user_do() {
    if [[ "$(id -u)" -eq 0 && "$REAL_USER" != "root" ]]; then
        sudo -u "$REAL_USER" -H "$@"
    else
        "$@"
    fi
}

# Run with elevated privileges only when required.
sys_do() {
    if [[ "$(id -u)" -ne 0 ]]; then
        sudo "$@"
    else
        "$@"
    fi
}

apt_do() {
    local attempt

    for attempt in {1..5}; do
        if sys_do env DEBIAN_FRONTEND=noninteractive apt-get "$@"; then
            return 0
        fi
        if (( attempt < 5 )); then
            warn "APT command failed (attempt ${attempt}/5); retrying in $((attempt * 3)) seconds."
            sleep "$((attempt * 3))"
        fi
    done

    return 1
}

wait_for_apt() {
    local attempt
    local -a locks=(
        /var/lib/apt/lists/lock
        /var/cache/apt/archives/lock
        /var/lib/dpkg/lock-frontend
        /var/lib/dpkg/lock
    )

    if ! command -v fuser >/dev/null 2>&1; then
        warn "fuser is unavailable; APT commands will use their retry policy."
        return 0
    fi

    echo -e "${YELLOW}Checking APT locks...${NC}"
    for attempt in {1..60}; do
        if ! sys_do fuser "${locks[@]}" >/dev/null 2>&1; then
            return 0
        fi
        echo -e "${YELLOW}  APT lock held, waiting... (${attempt}/60)${NC}"
        sleep 5
    done

    echo -e "${RED}✘ APT remained locked for five minutes.${NC}" >&2
    return 1
}

curl_download() {
    local url=$1
    local destination=$2

    curl \
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
        --output "$destination" \
        "$url"
}

validate_download() {
    local file=$1
    local min_bytes=${2:-100}
    local size

    size=$(wc -c < "$file")
    if (( size < min_bytes )); then
        echo -e "${RED}✘ Downloaded file is too small (${size} bytes).${NC}" >&2
        return 1
    fi

    if head -n 1 "$file" | grep -Eiq '<!doctype|<html'; then
        echo -e "${RED}✘ Downloaded file appears to be HTML, not the requested asset.${NC}" >&2
        return 1
    fi
}

run_remote_script() {
    local run_as=$1
    local url=$2
    shift 2

    local tmp
    tmp=$(mktemp)
    if ! curl_download "$url" "$tmp" || ! validate_download "$tmp" 500; then
        rm -f -- "$tmp"
        return 1
    fi
    chmod 0644 "$tmp"

    local status
    case "$run_as" in
        user)
            if user_do sh "$tmp" "$@"; then
                status=0
            else
                status=$?
            fi
            ;;
        system)
            if sys_do sh "$tmp" "$@"; then
                status=0
            else
                status=$?
            fi
            ;;
        *)
            rm -f -- "$tmp"
            echo -e "${RED}✘ Invalid remote-script execution mode: $run_as${NC}" >&2
            return 1
            ;;
    esac
    rm -f -- "$tmp"
    return "$status"
}

cron_ensure() {
    local current_cron
    local filtered_cron

    echo "Ensuring the cron service is active..."
    sys_do systemctl enable --now cron

    # Remove only the demonstration jobs created by SetupVibe v0.41.4-v0.41.6.
    current_cron=$(user_do crontab -l 2>/dev/null || true)
    if [[ "$current_cron" == *"/tmp/cron-heartbeat.log"* || "$current_cron" == *"cron-disk-usage.log"* ]]; then
        filtered_cron=$(printf '%s\n' "$current_cron" |
            sed '\|/tmp/cron-heartbeat\.log|d; \|cron-disk-usage\.log|d')
        printf '%s\n' "$filtered_cron" | user_do crontab -
        echo -e "${GREEN}✔ Removed legacy SetupVibe demonstration cron jobs.${NC}"
    fi
}

# --- ARGUMENT PARSING ---
SWARM_MANAGER=false
ASSUME_YES=false
SWARM_ADVERTISE_ADDR=""

while (( $# > 0 )); do
    case "$1" in
        --manager)
            SWARM_MANAGER=true
            shift
            ;;
        --advertise-addr)
            [[ $# -ge 2 && -n "$2" && "$2" != -* ]] ||
                die "--advertise-addr requires a value."
            SWARM_ADVERTISE_ADDR=$2
            SWARM_MANAGER=true
            shift 2
            ;;
        --advertise-addr=*)
            SWARM_ADVERTISE_ADDR=${1#*=}
            [[ -n "$SWARM_ADVERTISE_ADDR" ]] || die "--advertise-addr requires a value."
            SWARM_MANAGER=true
            shift
            ;;
        -y|--yes)
            ASSUME_YES=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        --version)
            printf 'SetupVibe Server Edition v%s\n' "$VERSION"
            exit 0
            ;;
        --)
            shift
            (( $# == 0 )) || die "Unexpected positional arguments: $*"
            ;;
        *)
            die "Unknown option: $1. Use --help for usage."
            ;;
    esac
done

echo -e "${CYAN}SetupVibe Server Edition v${VERSION}${NC}"
[[ "$SWARM_MANAGER" == "true" ]] && echo -e "${YELLOW}  → Docker Swarm Manager mode enabled${NC}"
echo ""

# --- PLATFORM & USER DETECTION ---
[[ "$(uname -s)" == "Linux" ]] || die "This script is for Linux servers only."
[[ -r /etc/os-release ]] || die "/etc/os-release is missing or unreadable."
command -v apt-get >/dev/null 2>&1 || die "APT is required."
command -v dpkg >/dev/null 2>&1 || die "dpkg is required."
command -v systemctl >/dev/null 2>&1 || die "systemd is required."

if [[ "$(id -u)" -ne 0 ]]; then
    command -v sudo >/dev/null 2>&1 || die "sudo is required when not running as root."
fi

if [[ -n "${SUDO_USER:-}" && "${SUDO_USER}" != "root" ]]; then
    REAL_USER=$SUDO_USER
else
    REAL_USER=$(id -un)
fi
id "$REAL_USER" >/dev/null 2>&1 || die "Unable to resolve target user: $REAL_USER"

REAL_HOME=$(getent passwd "$REAL_USER" | cut -d: -f6)
[[ -n "$REAL_HOME" && -d "$REAL_HOME" ]] || die "Unable to resolve home directory for $REAL_USER."
REAL_GROUP=$(id -gn "$REAL_USER")

ORIGINAL_DISTRO_ID=$(os_release_value ID)
ORIGINAL_DISTRO_ID=${ORIGINAL_DISTRO_ID,,}
DISTRO_VERSION=$(os_release_value VERSION_ID)
DISTRO_CODENAME=$(os_release_value VERSION_CODENAME)
UBUNTU_BASE_CODENAME=$(os_release_value UBUNTU_CODENAME)
OS_PRETTY_NAME=$(os_release_value PRETTY_NAME)

case "$ORIGINAL_DISTRO_ID" in
    ubuntu)
        DISTRO_ID=ubuntu
        ;;
    debian)
        DISTRO_ID=debian
        ;;
    zorin)
        DISTRO_ID=ubuntu
        DISTRO_CODENAME=$UBUNTU_BASE_CODENAME
        ;;
    linuxmint)
        ID_LIKE=$(os_release_value ID_LIKE)
        if [[ "$ID_LIKE" =~ debian ]]; then
            DISTRO_ID=debian
            DEBIAN_BASE_CODENAME=$(os_release_value DEBIAN_CODENAME)
            [[ -n "$DEBIAN_BASE_CODENAME" ]] && DISTRO_CODENAME=$DEBIAN_BASE_CODENAME
        else
            DISTRO_ID=ubuntu
            DISTRO_CODENAME=$UBUNTU_BASE_CODENAME
        fi
        ;;
    *)
        die "Unsupported distribution: ${OS_PRETTY_NAME:-$ORIGINAL_DISTRO_ID}."
        ;;
esac

[[ -n "$DISTRO_VERSION" && -n "$DISTRO_CODENAME" ]] ||
    die "Unable to determine the distribution version and repository codename."

case "$ORIGINAL_DISTRO_ID" in
    ubuntu)
        dpkg --compare-versions "$DISTRO_VERSION" ge 24.04 ||
            die "Ubuntu 24.04 or newer is required."
        ;;
    debian)
        dpkg --compare-versions "$DISTRO_VERSION" ge 12 ||
            die "Debian 12 or newer is required."
        ;;
    zorin)
        dpkg --compare-versions "$DISTRO_VERSION" ge 18 ||
            die "Zorin OS 18 or newer is required."
        ;;
    linuxmint)
        if [[ "$DISTRO_ID" == "debian" ]]; then
            dpkg --compare-versions "$DISTRO_VERSION" ge 6 ||
                die "LMDE 6 or newer is required."
        else
            dpkg --compare-versions "$DISTRO_VERSION" ge 22 ||
                die "Linux Mint 22 or newer is required."
        fi
        ;;
esac

IS_UBUNTU=false
IS_DEBIAN=false
[[ "$DISTRO_ID" == "ubuntu" ]] && IS_UBUNTU=true
[[ "$DISTRO_ID" == "debian" ]] && IS_DEBIAN=true

ARCH_RAW=$(dpkg --print-architecture)
case "$ARCH_RAW" in
    amd64)
        ARCH_GO=amd64
        CTOP_SHA256=$CTOP_SHA256_AMD64
        ;;
    arm64)
        ARCH_GO=arm64
        CTOP_SHA256=$CTOP_SHA256_ARM64
        ;;
    *)
        die "Architecture $ARCH_RAW is not supported."
        ;;
esac

# --- STEPS CONFIGURATION ---
STEPS=(
    "SetupVibe: Prerequisites & Arch Check"
    "Base System Tools"
    "Docker, Ansible & GitHub CLI"
    "Network, Monitoring & Tailscale"
    "SSH Server"
    "Shell (ZSH & Starship Config)"
    "Tmux & Plugins"
    "AI CLI Tools"
    "Finalization & Cleanup"
)

if [[ "$SWARM_MANAGER" == "true" ]]; then
    STEPS+=("Docker Swarm Manager Setup")
fi


declare -a STEP_STATUS
# A section always returns success to the caller; inspect LAST_STEP_OK instead.
LAST_STEP_OK=true

# --- UI & LOGIC FUNCTIONS ---

# Install and validate a repository signing key.
install_repository_key() {
    local url=$1
    local dest=$2
    local format=${3:-raw}
    local downloaded
    local prepared

    downloaded=$(mktemp)
    prepared=$downloaded

    echo -e "${YELLOW}Installing key:${NC} $url ➜ $dest"
    sys_do mkdir -p -m 755 /etc/apt/keyrings

    if ! curl_download "$url" "$downloaded" ||
        ! validate_download "$downloaded" 100 ||
        ! gpg --batch --show-keys "$downloaded" >/dev/null 2>&1; then
        rm -f -- "$downloaded"
        echo -e "${RED}✘ Failed to download or validate repository key: $url${NC}" >&2
        return 1
    fi

    if [[ "$format" == "dearmor" ]]; then
        prepared=$(mktemp)
        if ! gpg --batch --yes --dearmor --output "$prepared" "$downloaded"; then
            rm -f -- "$downloaded" "$prepared"
            return 1
        fi
    elif [[ "$format" != "raw" ]]; then
        rm -f -- "$downloaded"
        echo -e "${RED}✘ Invalid key format: $format${NC}" >&2
        return 1
    fi

    sys_do install -o root -g root -m 0644 "$prepared" "$dest"
    rm -f -- "$downloaded"
    [[ "$prepared" == "$downloaded" ]] || rm -f -- "$prepared"
}

header() {
    clear 2>/dev/null || true
    echo -e "${MAGENTA}"
    if command -v figlet >/dev/null 2>&1; then
        figlet "SETUPVIBE" 2>/dev/null || echo "SETUPVIBE.DEV"
    else
        echo "SETUPVIBE.DEV"
    fi
    echo -e "${NC}"
    echo -e "${CYAN}:: Linux Server Edition ::${NC}"
    echo -e "${YELLOW}Maintained by PromovaWeb.com | Contact: contato@promovaweb.com${NC}"
    echo "--------------------------------------------------------"
    echo "OS: ${OS_PRETTY_NAME:-$ORIGINAL_DISTRO_ID} | Arch: $ARCH_RAW | User: $REAL_USER"
    echo "--------------------------------------------------------"
}


show_roadmap_and_wait() {
    header
    echo -e "${BOLD}SetupVibe Server - Installation Roadmap:${NC}\n"
    for i in "${!STEPS[@]}"; do
        echo -e "  [$((i + 1))/${#STEPS[@]}] ${STEPS[i]}"
    done
    echo ""
    echo -e "--------------------------------------------------------"
    echo -e "${YELLOW}  ➜ Press [ENTER] to start SetupVibe Server Edition.${NC}"
    echo -e "${RED}  ➜ Type 'q' + ENTER to cancel.${NC}"
    echo -e "--------------------------------------------------------"

    if [[ "$ASSUME_YES" == "true" ]]; then
        echo -e "${GREEN}  ➜ Confirmation skipped with --yes.${NC}"
        return 0
    fi

    if ! tty >/dev/null 2>&1 </dev/tty; then
        die "An interactive terminal is required; use --yes for unattended installation."
    fi
    local key
    read -r key </dev/tty
    if [[ "$key" == "q" || "$key" == "Q" ]]; then
        echo -e "\n${RED}[CANCELLED] See you next time!${NC}"
        exit 0
    fi
}


run_section() {
    local index=$1
    local section_function=$2
    local title="${STEPS[$index]}"
    local status

    echo ""
    echo -e "${BLUE}========================================================${NC}"
    echo -e "${BOLD}▶ [$((index + 1))/${#STEPS[@]}] $title ${NC}"
    echo -e "${BLUE}========================================================${NC}"

    set +e
    (
        set -Eeuo pipefail
        "$section_function"
    )
    status=$?
    set -e

    if (( status == 0 )); then
        STEP_STATUS[index]="${GREEN}✔ OK${NC}"
        LAST_STEP_OK=true
    else
        STEP_STATUS[index]="${RED}✘ Error (exit $status)${NC}"
        LAST_STEP_OK=false
        echo -e "${RED}✘ Step failed; remaining installation steps will not run.${NC}" >&2
    fi

    return 0
}


git_ensure() {
    local repo=$1
    local dest=$2

    if [[ -d "$dest/.git" ]]; then
        echo "Updating: $dest..."
        user_do git -C "$dest" pull --ff-only --quiet
    elif [[ -e "$dest" ]]; then
        echo -e "${RED}✘ Existing path is not a Git repository: $dest${NC}" >&2
        return 1
    else
        echo "Cloning: $repo..."
        user_do mkdir -p "$(dirname "$dest")"
        user_do git clone --quiet "$repo" "$dest"
    fi
    sys_do chown -R "$REAL_USER:$REAL_GROUP" "$dest"
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
    if ! curl_download "$url" "$tmp" || ! validate_download "$tmp" "$min_bytes"; then
        echo -e "${RED}✘ Download failed validation: $url${NC}" >&2
        rm -f -- "$tmp"
        return 1
    fi

    if [[ -n "$expected_sha256" ]] &&
        ! printf '%s  %s\n' "$expected_sha256" "$tmp" | sha256sum --check --status; then
        echo -e "${RED}✘ Checksum verification failed: $url${NC}" >&2
        rm -f -- "$tmp"
        return 1
    fi

    dest_dir=$(dirname "$dest")
    user_do mkdir -p "$dest_dir"

    sys_do install -o "$REAL_USER" -g "$REAL_GROUP" -m 0644 "$tmp" "$dest"
    rm -f -- "$tmp"
    echo -e "${GREEN}✔ Downloaded: $dest${NC}"
}

backup_file_once() {
    local file=$1
    local backup="${file}.pre-setupvibe"

    if [[ -f "$file" && ! -e "$backup" ]]; then
        user_do cp -p -- "$file" "$backup"
        echo -e "${GREEN}✔ Preserved existing configuration: $backup${NC}"
    fi
}


install_setupvibe_bin() {
    echo "Installing SetupVibe helper scripts..."
    sys_do install -d -o "$REAL_USER" -g "$REAL_GROUP" -m 0755 \
        "$REAL_HOME/.setupvibe" \
        "$REAL_HOME/.setupvibe/bin"
    user_do rm -f "$REAL_HOME/.setupvibe/bin/sshcopykey"
    if ! safe_download https://raw.githubusercontent.com/promovaweb/setupvibe/main/bin/ssh_copy_id "$REAL_HOME/.setupvibe/bin/ssh_copy_id" 500; then
        return 1
    fi
    user_do chmod +x "$REAL_HOME/.setupvibe/bin/ssh_copy_id"
}

install_herdr() {
    local herdr_arch
    local herdr_target
    local herdr_url
    local herdr_tmp_dir
    local manifest_tmp
    local binary_tmp

    case "$ARCH_RAW" in
        amd64)
            herdr_arch=x86_64
            ;;
        arm64)
            herdr_arch=aarch64
            ;;
        *)
            echo -e "${RED}✘ Herdr does not support architecture: $ARCH_RAW${NC}" >&2
            return 1
            ;;
    esac

    herdr_target="linux-${herdr_arch}"
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
        echo -e "${RED}✘ Herdr manifest has no trusted asset for: $herdr_target${NC}" >&2
        user_do rm -f -- "$manifest_tmp"
        user_do rmdir -- "$herdr_tmp_dir"
        return 1
    }

    if ! safe_download "$herdr_url" "$binary_tmp" 100000; then
        user_do rm -f -- "$manifest_tmp"
        user_do rmdir -- "$herdr_tmp_dir"
        return 1
    fi

    sys_do install -d -o "$REAL_USER" -g "$REAL_GROUP" -m 0755 "$REAL_HOME/.local/bin"
    sys_do install -o "$REAL_USER" -g "$REAL_GROUP" -m 0755 \
        "$binary_tmp" "$REAL_HOME/.local/bin/herdr"
    user_do rm -f -- "$manifest_tmp" "$binary_tmp"
    user_do rmdir -- "$herdr_tmp_dir"

    user_do env PATH="$REAL_HOME/.local/bin:$PATH" herdr --version >/dev/null
    echo -e "${GREEN}✔ Herdr installed and validated.${NC}"
}


# --- INSTALLATION STEPS ---


step_0() {
    echo "Architecture detected: $ARCH_RAW"
    echo "Operating System: Linux"
    echo "Distribution: ${OS_PRETTY_NAME:-$ORIGINAL_DISTRO_ID}"
    echo "Repository base: $DISTRO_ID $DISTRO_CODENAME"
    echo "Real user: $REAL_USER"
    echo "Home directory: $REAL_HOME"
    return 0
}


step_1() {
    sys_do true
    wait_for_apt

    echo "Updating APT..."
    apt_do update -qq

    echo "Installing core server tools..."
    apt_do install -y \
        ca-certificates curl file figlet fontconfig fzf git gnupg iproute2 jq \
        logrotate nano procps psmisc rsyslog sshpass tmux unzip wget \
        cron

    echo "Installing or updating zoxide..."
    run_remote_script user https://raw.githubusercontent.com/ajeetdsouza/zoxide/main/install.sh
    user_do "$REAL_HOME/.local/bin/zoxide" --version >/dev/null

    cron_ensure
}


step_2() {
    local pkg
    local -a installed_conflicts=()
    local -a docker_conflicts=(
        containerd
        docker-compose
        docker-compose-v2
        docker-doc
        docker.io
        podman-docker
        runc
    )

    echo "Configuring Docker..."
    for pkg in "${docker_conflicts[@]}"; do
        if dpkg-query -W -f='${db:Status-Abbrev}' "$pkg" 2>/dev/null | grep -q '^ii'; then
            installed_conflicts+=("$pkg")
        fi
    done
    if (( ${#installed_conflicts[@]} > 0 )); then
        echo "Removing packages that conflict with Docker CE: ${installed_conflicts[*]}"
        apt_do remove -y "${installed_conflicts[@]}"
    fi

    sys_do rm -f -- \
        /etc/apt/sources.list.d/docker.list \
        /etc/apt/sources.list.d/docker.sources
    install_repository_key \
        "https://download.docker.com/linux/$DISTRO_ID/gpg" \
        /etc/apt/keyrings/docker.asc \
        raw
    printf '%s\n' \
        "Types: deb" \
        "URIs: https://download.docker.com/linux/$DISTRO_ID" \
        "Suites: $DISTRO_CODENAME" \
        "Components: stable" \
        "Architectures: $ARCH_RAW" \
        "Signed-By: /etc/apt/keyrings/docker.asc" |
        sys_do tee /etc/apt/sources.list.d/docker.sources >/dev/null

    apt_do update -qq
    apt_do install -y \
        containerd.io docker-buildx-plugin docker-ce docker-ce-cli \
        docker-compose-plugin
    sys_do usermod -aG docker "$REAL_USER"

    echo "Enabling and starting Docker service..."
    sys_do systemctl enable --now docker
    sys_do docker version >/dev/null

    echo "Configuring Ansible..."
    if $IS_UBUNTU; then
        echo "Using the official Ansible Ubuntu PPA..."
        apt_do install -y software-properties-common
        sys_do add-apt-repository -y ppa:ansible/ansible
        apt_do install -y ansible
    elif $IS_DEBIAN; then
        echo "Using the Debian ansible-core package..."
        apt_do install -y ansible-core
    fi
    ansible --version >/dev/null

    echo "Installing GitHub CLI..."
    sys_do rm -f -- /etc/apt/sources.list.d/github-cli.list
    install_repository_key \
        https://cli.github.com/packages/githubcli-archive-keyring.gpg \
        /etc/apt/keyrings/githubcli-archive-keyring.gpg \
        raw
    echo "deb [arch=$ARCH_RAW signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" |
        sys_do tee /etc/apt/sources.list.d/github-cli.list >/dev/null
    apt_do update -qq
    apt_do install -y gh
    gh --version >/dev/null

    echo "Configuring Portainer..."
    sys_do install -d -o "$REAL_USER" -g "$REAL_GROUP" -m 0755 \
        "$REAL_HOME/.setupvibe" \
        "$REAL_HOME/.setupvibe/portainer_data"
    safe_download https://raw.githubusercontent.com/promovaweb/setupvibe/main/conf/portainer-compose.yml "$REAL_HOME/.setupvibe/portainer-compose.yml"

    if sys_do docker info >/dev/null 2>&1; then
        echo "Starting Portainer..."
        sys_do docker compose -f "$REAL_HOME/.setupvibe/portainer-compose.yml" pull
        sys_do docker compose -f "$REAL_HOME/.setupvibe/portainer-compose.yml" up -d
        echo -e "${GREEN}✔ Portainer is running at https://localhost:9443${NC}"
    else
        echo -e "${RED}✘ Docker is installed but its daemon is unavailable.${NC}" >&2
        return 1
    fi
}


step_3() {
    local ctop_bin
    local installed_ctop_version=""

    echo "Installing Network & Monitoring Tools (APT)..."
    apt_do install -y \
        rsync net-tools dnsutils mtr-tiny nmap tcpdump \
        iftop nload iotop sysstat whois iputils-ping \
        speedtest-cli glances htop btop

    if [[ -x "$REAL_HOME/.local/bin/ctop" ]]; then
        ctop_bin=$REAL_HOME/.local/bin/ctop
    elif command -v ctop >/dev/null 2>&1; then
        ctop_bin=$(command -v ctop)
    else
        ctop_bin=""
    fi
    if [[ -n "$ctop_bin" ]]; then
        installed_ctop_version=$("$ctop_bin" -v 2>/dev/null | awk 'NR == 1 {gsub(/,/, "", $3); print $3}')
    fi

    echo "Installing or updating ctop for $ARCH_GO..."
    if [[ "$installed_ctop_version" != "$CTOP_VERSION" ||
        "$ctop_bin" != "$REAL_HOME/.local/bin/ctop" ]]; then
        user_do mkdir -p "$REAL_HOME/.local/bin"
        safe_download \
            "https://github.com/bcicen/ctop/releases/download/v${CTOP_VERSION}/ctop-${CTOP_VERSION}-linux-${ARCH_GO}" \
            "$REAL_HOME/.local/bin/ctop" \
            1000000 \
            "$CTOP_SHA256"
        user_do chmod +x "$REAL_HOME/.local/bin/ctop"
    fi
    ctop_bin=$REAL_HOME/.local/bin/ctop
    user_do "$ctop_bin" -v >/dev/null

    echo "Installing or updating Tailscale..."
    run_remote_script system https://tailscale.com/install.sh
    sys_do systemctl enable --now tailscaled
    tailscale version >/dev/null
}


step_4() {
    echo "Setting up SSH Server..."

    apt_do install -y openssh-client openssh-server
    sys_do install -d -m 0755 /run/sshd
    sys_do /usr/sbin/sshd -t
    sys_do systemctl enable --now ssh
    sys_do systemctl is-active --quiet ssh
    echo -e "${GREEN}✔ SSH Server is valid and running; existing authentication policy was preserved.${NC}"
}


step_5() {
    local current_shell
    local starship_bin

    install_setupvibe_bin

    apt_do install -y zsh

    if [[ ! -d "$REAL_HOME/.oh-my-zsh" ]]; then
        run_remote_script \
            user \
            https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh \
            --unattended
    else
        git_ensure "https://github.com/ohmyzsh/ohmyzsh" "$REAL_HOME/.oh-my-zsh"
    fi

    git_ensure "https://github.com/zsh-users/zsh-autosuggestions" "$REAL_HOME/.oh-my-zsh/custom/plugins/zsh-autosuggestions"
    git_ensure "https://github.com/zsh-users/zsh-syntax-highlighting" "$REAL_HOME/.oh-my-zsh/custom/plugins/zsh-syntax-highlighting"

    echo "Installing or updating Starship..."
    user_do mkdir -p "$REAL_HOME/.local/bin"
    run_remote_script user https://starship.rs/install.sh -y --bin-dir "$REAL_HOME/.local/bin"
    starship_bin=$REAL_HOME/.local/bin/starship
    user_do mkdir -p "$REAL_HOME/.config"

    echo "Applying Starship Preset: Gruvbox Rainbow..."
    user_do "$starship_bin" preset gruvbox-rainbow -o "$REAL_HOME/.config/starship.toml"
    user_do sed -i 's/╭/┌/g; s/╰/└/g' "$REAL_HOME/.config/starship.toml"

    backup_file_once "$REAL_HOME/.zshrc"
    safe_download https://raw.githubusercontent.com/promovaweb/setupvibe/main/conf/zshrc-server.zsh "$REAL_HOME/.zshrc"
    if [ ! -f "$REAL_HOME/.zshrc.local" ]; then
        user_do touch "$REAL_HOME/.zshrc.local"
    fi

    # shellcheck disable=SC2016 # Keep HOME and PATH literal for future shells.
    if ! grep -Fq 'export PATH="$HOME/.local/bin:$HOME/.npm-global/bin:$PATH"' "$REAL_HOME/.bashrc" 2>/dev/null; then
        backup_file_once "$REAL_HOME/.bashrc"
        if [[ -s "$REAL_HOME/.bashrc" ]] &&
            [[ $(tail -c 1 "$REAL_HOME/.bashrc" | wc -l) -eq 0 ]]; then
            printf '\n' | user_do tee -a "$REAL_HOME/.bashrc" >/dev/null
        fi
        # shellcheck disable=SC2016 # Keep HOME and PATH literal in .bashrc.
        echo 'export PATH="$HOME/.local/bin:$HOME/.npm-global/bin:$PATH"' |
            user_do tee -a "$REAL_HOME/.bashrc" >/dev/null
    fi

    current_shell=$(getent passwd "$REAL_USER" | cut -d: -f7)
    if [[ "$current_shell" != "$(command -v zsh)" ]]; then
        sys_do chsh -s "$(command -v zsh)" "$REAL_USER"
    fi
}


step_6() {
    echo "Installing TPM (Tmux Plugin Manager)..."
    git_ensure "https://github.com/tmux-plugins/tpm" "$REAL_HOME/.tmux/plugins/tpm"

    echo "Downloading tmux-server.conf..."
    backup_file_once "$REAL_HOME/.tmux.conf"
    safe_download https://raw.githubusercontent.com/promovaweb/setupvibe/main/conf/tmux-server.conf "$REAL_HOME/.tmux.conf"

    if [[ "$(id -u)" -eq 0 && "$REAL_HOME" != "/root" ]]; then
        sys_do mkdir -p /root/.tmux/plugins
        if [[ -f /root/.tmux.conf && ! -e /root/.tmux.conf.pre-setupvibe ]]; then
            sys_do cp -p /root/.tmux.conf /root/.tmux.conf.pre-setupvibe
        fi
        sys_do cp "$REAL_HOME/.tmux.conf" /root/.tmux.conf
        if [[ -d "$REAL_HOME/.tmux/plugins/tpm" ]]; then
            if [[ -L /root/.tmux/plugins/tpm ]]; then
                sys_do ln -sfn "$REAL_HOME/.tmux/plugins/tpm" /root/.tmux/plugins/tpm
            elif [[ ! -e /root/.tmux/plugins/tpm ]]; then
                sys_do ln -s "$REAL_HOME/.tmux/plugins/tpm" /root/.tmux/plugins/tpm
            else
                warn "Preserving the existing root TPM path: /root/.tmux/plugins/tpm"
            fi
        fi
    fi

    sys_do chown -R "$REAL_USER:$REAL_GROUP" "$REAL_HOME/.tmux"
    sys_do chown "$REAL_USER:$REAL_GROUP" "$REAL_HOME/.tmux.conf"

    echo "Existing tmux sessions were preserved; the new config applies to new sessions."
}


step_7() {
    local node_bin
    local node_dir
    local npm_bin
    local npm_path
    local package
    local command_name
    local index
    local -a cli_packages=(
        "@anthropic-ai/claude-code"
        "@openai/codex"
        "@github/copilot"
        "opencode-ai"
        "skills@latest"
    )
    local -a cli_commands=(
        claude
        codex
        copilot
        opencode
        skills
    )

    echo "Installing Node.js 24 via NodeSource..."
    sys_do rm -f -- \
        /etc/apt/sources.list.d/nodesource.list \
        /etc/apt/sources.list.d/nodesource.sources
    install_repository_key \
        https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
        /etc/apt/keyrings/nodesource.gpg \
        dearmor
    printf '%s\n' \
        "Types: deb" \
        "URIs: https://deb.nodesource.com/node_24.x" \
        "Suites: nodistro" \
        "Components: main" \
        "Architectures: $ARCH_RAW" \
        "Signed-By: /etc/apt/keyrings/nodesource.gpg" |
        sys_do tee /etc/apt/sources.list.d/nodesource.sources >/dev/null
    printf '%s\n' \
        "Package: nodejs" \
        "Pin: origin deb.nodesource.com" \
        "Pin-Priority: 600" |
        sys_do tee /etc/apt/preferences.d/nodejs >/dev/null

    apt_do update -qq
    apt_do install -y --allow-downgrades nodejs

    # Resolve the just-installed binaries by their dpkg-owned path instead of
    # relying on `command -v`/PATH lookups: version managers such as nvm, fnm,
    # volta or asdf commonly place their own node ahead of /usr/bin on PATH,
    # which would otherwise silently select the wrong Node.js version here.
    node_bin=$(dpkg -L nodejs | grep -E '/bin/node$' | head -n1)
    "$node_bin" --version | grep -Eq '^v24\.'
    npm_bin=$(dpkg -L nodejs | grep -E '^/usr/bin/npm$' | head -n1)
    if [[ -z "$node_bin" || -z "$npm_bin" ]]; then
        echo -e "${RED}✘ Node.js or npm launcher was not found in the Node.js package.${NC}" >&2
        return 1
    fi
    node_dir=$(dirname "$node_bin")

    if [[ "$REAL_USER" != "root" ]]; then
        user_do mkdir -p "$REAL_HOME/.npm-global"
        user_do "$npm_bin" config set prefix "$REAL_HOME/.npm-global"
        npm_path="$REAL_HOME/.npm-global/bin:$node_dir:$PATH"
    else
        npm_path="$node_dir:$PATH"
    fi

    # Remove the package deprecated by GitHub before installing its supported replacement.
    user_do env PATH="$npm_path" "$node_bin" "$npm_bin" uninstall -g @githubnext/github-copilot-cli >/dev/null 2>&1 || true

    for index in "${!cli_packages[@]}"; do
        package=${cli_packages[$index]}
        command_name=${cli_commands[$index]}
        echo "Installing $package..."
        user_do env PATH="$npm_path" "$node_bin" "$npm_bin" install --global "$package"
        user_do env PATH="$npm_path" "$command_name" --version >/dev/null
    done

    echo "Installing Herdr..."
    install_herdr
}


step_8() {
    echo "Cleaning APT caches..."
    apt_do autoclean -qq
    apt_do clean -qq
    sys_do rm -rf -- /var/lib/apt/lists/*
}


step_swarm() {
    local advertise_addr=$SWARM_ADVERTISE_ADDR
    local swarm_state
    local control_available

    if [[ -z "$advertise_addr" ]]; then
        echo "Detecting the primary routable IPv4 address..."
        advertise_addr=$(ip -4 route get 1.1.1.1 2>/dev/null |
            awk '{for (i = 1; i <= NF; i++) if ($i == "src") {print $(i + 1); exit}}')
    fi

    if [[ -z "$advertise_addr" ]]; then
        echo -e "${RED}✘ Could not determine a Swarm advertise address. Use --advertise-addr.${NC}" >&2
        return 1
    fi

    echo "Initializing Docker Swarm (advertise address: $advertise_addr)..."
    swarm_state=$(sys_do docker info --format '{{.Swarm.LocalNodeState}}')
    if [[ "$swarm_state" == "active" ]]; then
        control_available=$(sys_do docker info --format '{{.Swarm.ControlAvailable}}')
        if [[ "$control_available" != "true" ]]; then
            echo -e "${RED}✘ This host already belongs to a Swarm as a worker, not a manager.${NC}" >&2
            return 1
        fi
        echo -e "${YELLOW}⚠ Docker Swarm is already active on this manager — skipping init.${NC}"
    else
        sys_do docker swarm init --advertise-addr "$advertise_addr"
        echo -e "${GREEN}✔ Docker Swarm initialized as manager node.${NC}"
    fi

    echo "Creating overlay network: network_swarm_public..."
    if sys_do docker network ls --format '{{.Name}}' | grep -qx network_swarm_public; then
        echo -e "${YELLOW}⚠ Overlay network 'network_swarm_public' already exists — skipping.${NC}"
    else
        sys_do docker network create \
            --driver overlay \
            --attachable \
            network_swarm_public
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
echo -e "\n${GREEN}Starting SetupVibe Server installation...${NC}"

INSTALL_FAILED=false
STEP_FUNCTIONS=(
    step_0
    step_1
    step_2
    step_3
    step_4
    step_5
    step_6
    step_7
    step_8
)
[[ "$SWARM_MANAGER" == "true" ]] && STEP_FUNCTIONS+=(step_swarm)

for i in "${!STEP_FUNCTIONS[@]}"; do
    run_section "$i" "${STEP_FUNCTIONS[$i]}"
    if [[ "$LAST_STEP_OK" != "true" ]]; then
        INSTALL_FAILED=true
        break
    fi
done

# --- DOCKER SWARM PROMPT (only when no Swarm option was passed) ---
if [[ "$INSTALL_FAILED" == "false" && "$SWARM_MANAGER" == "false" && "$ASSUME_YES" == "false" ]]; then
    echo ""
    echo -e "${BLUE}========================================================${NC}"
    echo -e "${BOLD}         DOCKER SWARM MANAGER SETUP (OPTIONAL)         ${NC}"
    echo -e "${BLUE}========================================================${NC}"
    echo -e "${YELLOW}Do you want to configure this machine as a Docker Swarm Manager?${NC}"
    echo -e "  This will:"
    echo -e "  - Detect the primary routable IPv4 address"
    echo -e "  - Initialize Docker Swarm (${CYAN}docker swarm init${NC})"
    echo -e "  - Create overlay network ${CYAN}network_swarm_public${NC}"
    echo ""
    echo -ne "${BOLD}Configure as Swarm Manager? [y/N]: ${NC}"
    if ! read -r SWARM_ANSWER 2>/dev/null </dev/tty; then
        warn "Interactive input became unavailable; skipping Docker Swarm setup."
        SWARM_ANSWER=""
    fi
    if [[ "$SWARM_ANSWER" =~ ^[yYsS]$ ]]; then
        SWARM_MANAGER=true
        STEPS+=("Docker Swarm Manager Setup")
        run_section 9 step_swarm
        [[ "$LAST_STEP_OK" == "true" ]] || INSTALL_FAILED=true
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
    echo -e "  [$((i + 1))] ${STEPS[$i]} ... ${STEP_STATUS[$i]:-${YELLOW}— Not run${NC}}"
done
echo ""

if [[ "$INSTALL_FAILED" == "true" ]]; then
    echo -e "${RED}${BOLD}SetupVibe Server Edition failed before completion.${NC}" >&2
    exit 1
fi

echo -e "${GREEN}${BOLD}SetupVibe Server Edition Completed Successfully! 🚀${NC}"
echo ""
echo -e "${YELLOW}${BOLD}IMPORTANT - Apply changes to your shell:${NC}"
echo -e "${CYAN}Reload ZSH now:${NC}   exec zsh"
echo -e "${CYAN}Or for Bash:${NC}      source ~/.bashrc"
echo ""
echo -e "${YELLOW}Or restart your terminal / logout and login again.${NC}"
