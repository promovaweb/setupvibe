#!/usr/bin/env bash

set -Eeuo pipefail

# SetupVibe para Omarchy 4 (Quattro)
#
# Esta edição adiciona a camada da Promovaweb a uma instalação existente do
# Omarchy. O sistema continua responsável pelos componentes que já fornece:
# shell Bash, Starship, mise, Tmux, Docker, ferramentas Unix, fontes, aliases,
# funções, Neovim, Herdr e CLIs de IA.

VERSION="0.41.10"
OMARCHY_MAJOR="4"
SETUPVIBE_RAW="https://raw.githubusercontent.com/promovaweb/setupvibe/main"

BOLD='\033[1m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ASSUME_YES=false

die() {
    echo -e "${RED}Erro: $*${NC}" >&2
    exit 1
}

warn() {
    echo -e "${YELLOW}Aviso: $*${NC}" >&2
}

usage() {
    cat <<'EOF'
Uso: bash omarchy.sh [opção]

Instala a camada SetupVibe sobre uma instalação Omarchy 4 existente.

Opções:
  --yes     Não pede confirmação no início.
  --help    Exibe esta ajuda.
EOF
}

user_do() {
    if [[ "$(id -u)" -eq 0 && -n "${REAL_USER:-}" && "$REAL_USER" != root ]]; then
        sudo -u "$REAL_USER" -H "$@"
    else
        "$@"
    fi
}

sys_do() {
    if [[ "$(id -u)" -eq 0 ]]; then
        "$@"
    else
        sudo "$@"
    fi
}

path_prepend_once() {
    local directory=$1
    case ":$PATH:" in
        *":$directory:"*) ;;
        *) PATH="$directory:$PATH" ;;
    esac
}

detect_user() {
    if [[ -n "${SUDO_USER:-}" && "$SUDO_USER" != root ]]; then
        REAL_USER="$SUDO_USER"
    elif [[ "$(id -u)" -eq 0 ]]; then
        REAL_USER="$(logname 2>/dev/null || true)"
        [[ -z "$REAL_USER" || "$REAL_USER" == root ]] && REAL_USER="$(whoami)"
    else
        REAL_USER="$(whoami)"
    fi

    REAL_HOME="$(getent passwd "$REAL_USER" 2>/dev/null | cut -d: -f6 || true)"
    [[ -z "$REAL_HOME" ]] && REAL_HOME="${HOME:-}"
    [[ -z "$REAL_HOME" || "$REAL_HOME" == /root && "$REAL_USER" != root ]] &&
        die "Não foi possível descobrir o diretório pessoal de $REAL_USER."
    REAL_GROUP="$(id -gn "$REAL_USER" 2>/dev/null || printf '%s' "$REAL_USER")"
}

check_omarchy() {
    [[ "$(uname -s)" == Linux ]] || die "omarchy.sh só pode ser executado no Linux."
    [[ "$(uname -m)" == x86_64 ]] || die "Omarchy 4 nesta edição exige a arquitetura x86_64."
    command -v pacman >/dev/null 2>&1 || die "O pacman não foi encontrado."
    [[ -d /usr/share/omarchy ]] || die "Esta máquina não parece ter o Omarchy instalado."
    command -v omarchy >/dev/null 2>&1 || die "O comando omarchy não foi encontrado."

    local package_version
    package_version="$(pacman -Q omarchy 2>/dev/null | awk '{print $2}' || true)"
    [[ "$package_version" == ${OMARCHY_MAJOR}.* || "$package_version" == ${OMARCHY_MAJOR}-* ]] ||
        die "Omarchy 4 não foi detectado (versão encontrada: ${package_version:-desconhecida})."
}

confirm_installation() {
    $ASSUME_YES && return 0
    [[ -t 0 || -r /dev/tty ]] || die "Use --yes quando não houver um terminal interativo."

    echo -e "${BOLD}SetupVibe Omarchy ${OMARCHY_MAJOR} v${VERSION}${NC}"
    echo "A instalação adicionará ferramentas e configurações do SetupVibe."
    echo "Ela não remove pacotes, arquivos do Omarchy, aliases existentes ou configurações existentes."
    echo ""
    printf 'Pressione ENTER para continuar ou digite q para cancelar: '
    local answer
    read -r answer </dev/tty || die "A entrada interativa ficou indisponível."
    [[ "$answer" != q && "$answer" != Q ]] || exit 0
}

omarchy_pkg_add() {
    local -a packages=("$@")
    ((${#packages[@]})) || return 0

    if command -v omarchy-pkg-add >/dev/null 2>&1; then
        user_do omarchy-pkg-add "${packages[@]}"
    else
        user_do omarchy pkg add "${packages[@]}"
    fi
}

omarchy_pkg_add_optional() {
    local package
    for package in "$@"; do
        if omarchy_pkg_add "$package"; then
            echo -e "${GREEN}✔ Pacote disponível: $package${NC}"
        else
            warn "O pacote opcional $package não foi instalado; o restante continuará."
        fi
    done
}

ensure_mise_tool() {
    local package=$1
    local command_name=${2:-$1}
    path_prepend_once "$REAL_HOME/.local/share/mise/shims"
    path_prepend_once "$REAL_HOME/.local/bin"
    export PATH

    if ! user_do bash -lc "command -v '$command_name' >/dev/null 2>&1"; then
        echo "Instalando $package via mise..."
        user_do mise use -g "$package"
    else
        echo "$command_name já está disponível; mantendo a instalação do Omarchy."
    fi
    hash -r 2>/dev/null || true
}

safe_download() {
    local url=$1
    local destination=$2
    local minimum_size=${3:-100}
    local temporary_file
    local destination_dir

    temporary_file="$(mktemp)"
    if ! curl --proto '=https' --tlsv1.2 --fail --silent --show-error \
        --location --retry 3 --retry-all-errors --connect-timeout 10 \
        --max-time 120 --output "$temporary_file" "$url"; then
        rm -f -- "$temporary_file"
        return 1
    fi

    if (( $(wc -c < "$temporary_file") < minimum_size )); then
        rm -f -- "$temporary_file"
        return 1
    fi

    if head -c 200 "$temporary_file" | grep -qiE '<!doctype|<html'; then
        rm -f -- "$temporary_file"
        return 1
    fi

    destination_dir="$(dirname "$destination")"
    user_do mkdir -p "$destination_dir"
    user_do install -m 0644 "$temporary_file" "$destination"
    rm -f -- "$temporary_file"
}

download_if_missing() {
    local url=$1
    local destination=$2
    local minimum_size=${3:-100}

    if [[ -f "$destination" ]]; then
        echo "$(basename "$destination") já existe; mantendo o arquivo local."
        return 0
    fi

    safe_download "$url" "$destination" "$minimum_size"
}

install_setupvibe_files() {
    echo "Adicionando arquivos auxiliares do SetupVibe..."
    user_do mkdir -p "$REAL_HOME/.setupvibe/bin"
    download_if_missing "$SETUPVIBE_RAW/bin/ssh_copy_id" \
        "$REAL_HOME/.setupvibe/bin/ssh_copy_id" 500
    user_do chmod 0755 "$REAL_HOME/.setupvibe/bin/ssh_copy_id"

    download_if_missing "$SETUPVIBE_RAW/conf/ecosystem.config.js" \
        "$REAL_HOME/.setupvibe/ecosystem.config.js" 100
    download_if_missing "$SETUPVIBE_RAW/conf/portainer-compose.yml" \
        "$REAL_HOME/.setupvibe/portainer-compose.yml" 100
    sys_do chown -R "$REAL_USER:$REAL_GROUP" "$REAL_HOME/.setupvibe"
}

install_additional_packages() {
    # O Omarchy 4 já entrega Docker, Tmux, Starship, Ruby, mise, Node via mise,
    # ferramentas Unix, Neovim, fontes, Herdr, gh e os CLIs de IA principais.
    # Esta lista contém somente a camada que o SetupVibe ainda acrescenta.
    echo "Adicionando runtimes e ferramentas ausentes do Omarchy..."
    omarchy_pkg_add php composer go rust python python-pip ansible

    # Extensões PHP e utilitários de rede variam entre os repositórios Arch.
    # Cada item é independente para manter o restante da instalação disponível.
    omarchy_pkg_add_optional \
        php-gd php-intl php-pgsql php-sqlite php-zip \
        rsync bind mtr nmap tcpdump iftop nload iotop sysstat glances htop \
        tailscale
}

configure_php_and_rails() {
    export COMPOSER_HOME="$REAL_HOME/.config/composer"
    path_prepend_once "$REAL_HOME/.local/bin"
    path_prepend_once "$COMPOSER_HOME/vendor/bin"
    export PATH

    echo "Configurando Composer e Laravel..."
    if command -v composer >/dev/null 2>&1; then
        user_do env COMPOSER_HOME="$COMPOSER_HOME" composer global require laravel/installer
    else
        warn "Composer não ficou disponível; Laravel será ignorado nesta execução."
    fi

    echo "Configurando Rails sobre o Ruby já fornecido pelo Omarchy..."
    if command -v rails >/dev/null 2>&1; then
        echo "Rails já está disponível; nenhuma instalação foi repetida."
    elif command -v gem >/dev/null 2>&1; then
        user_do gem install bundler rails --no-document
    else
        warn "RubyGems não foi encontrado; Rails será ignorado nesta execução."
    fi
}

configure_python_go_rust() {
    path_prepend_once "$REAL_HOME/.local/bin"
    export PATH
    if ! user_do bash -lc "command -v uv >/dev/null 2>&1"; then
        echo "Instalando uv no diretório do usuário..."
        user_do bash -lc 'curl -LsSf https://astral.sh/uv/install.sh | sh'
    fi
    hash -r 2>/dev/null || true

    if ! user_do bash -lc "command -v qr >/dev/null 2>&1"; then
        user_do uv tool install --upgrade qrcode
    fi

    if ! user_do bash -lc "command -v cronboard >/dev/null 2>&1"; then
        user_do uv tool install git+https://github.com/antoniorodr/cronboard
    fi

    # O pacote do sistema continua sendo a base dos runtimes. mise só entra
    # quando o comando ainda não existe, sem substituir o que o Omarchy criou.
    ensure_mise_tool go go
    ensure_mise_tool python python
    ensure_mise_tool rust rustc
}

configure_javascript() {
    ensure_mise_tool node node
    ensure_mise_tool bun bun

    if ! command -v npm >/dev/null 2>&1; then
        die "Node foi configurado, mas npm não está disponível."
    fi

    user_do npm install --global pnpm pm2
    user_do pnpm --version >/dev/null
    user_do pm2 --version >/dev/null
}

install_optional_ai_tools() {
    local -a packages=(
        "skills@latest"
        "@moonshot-ai/kimi-code"
        "agentlytics"
    )
    local -a commands=(skills kimi agentlytics)
    local index

    echo "Adicionando apenas os CLIs de IA que o Omarchy não fornece..."
    for index in "${!packages[@]}"; do
        if user_do bash -lc "command -v '${commands[$index]}' >/dev/null 2>&1"; then
            echo "${commands[$index]} já está disponível; mantendo o comando existente."
        else
            user_do npm install --global "${packages[$index]}"
        fi
    done

    if ! user_do bash -lc "command -v specify >/dev/null 2>&1"; then
        user_do uv tool install --upgrade specify-cli
    fi

    if ! user_do bash -lc "command -v agy >/dev/null 2>&1"; then
        install_antigravity
    fi
}

install_antigravity() {
    local platform="linux_amd64"
    local base_url="https://antigravity-cli-auto-updater-974169037036.us-central1.run.app"
    local temporary_dir manifest payload download_url expected_sha512 actual_sha512
    local archive=false

    temporary_dir="$(user_do mktemp -d "$REAL_HOME/.setupvibe/antigravity.XXXXXX")"
    manifest="$temporary_dir/manifest.json"
    payload="$temporary_dir/agy"

    safe_download "$base_url/manifests/${platform}.json" "$manifest" 100 || {
        warn "O manifesto do Antigravity não pôde ser baixado."
        user_do rm -rf -- "$temporary_dir"
        return 0
    }

    download_url="$(jq -er '.url | select(startswith("https://storage.googleapis.com/antigravity-public/"))' "$manifest")" || {
        warn "O manifesto do Antigravity não apresentou um download confiável."
        user_do rm -rf -- "$temporary_dir"
        return 0
    }
    expected_sha512="$(jq -er '.sha512' "$manifest")" || {
        warn "O manifesto do Antigravity não apresentou checksum."
        user_do rm -rf -- "$temporary_dir"
        return 0
    }

    case "$download_url" in
        *.tar.gz*)
            archive=true
            payload="$temporary_dir/agy.tar.gz"
            ;;
    esac

    safe_download "$download_url" "$payload" 1000000 || {
        warn "O binário do Antigravity não pôde ser baixado."
        user_do rm -rf -- "$temporary_dir"
        return 0
    }

    actual_sha512="$(sha512sum "$payload" | awk '{print $1}')"
    [[ "$actual_sha512" == "$expected_sha512" ]] || {
        warn "O checksum do Antigravity não confere."
        user_do rm -rf -- "$temporary_dir"
        return 0
    }

    if $archive; then
        user_do tar -xzf "$payload" -C "$temporary_dir" antigravity
        payload="$temporary_dir/antigravity"
    fi

    user_do install -m 0755 "$payload" "$REAL_HOME/.local/bin/agy"
    user_do rm -rf -- "$temporary_dir"
    user_do env PATH="$REAL_HOME/.local/bin:$PATH" agy install --skip-aliases --skip-path
}

write_starship_config() {
    local setupvibe_dir="$REAL_HOME/.config/setupvibe"
    local starship_config="$setupvibe_dir/starship.toml"

    user_do mkdir -p "$setupvibe_dir"
    if [[ ! -f "$starship_config" ]]; then
        # `--force` was removed from `starship preset` and now aborts the step; the
        # `! -f` guard above already means there is nothing to overwrite.
        user_do starship preset gruvbox-rainbow -o "$starship_config"
        user_do sed -i 's/╭/┌/g; s/╰/└/g; s///g; s///g' "$starship_config"
    else
        echo "Configuração Starship do SetupVibe já existe; mantendo personalizações."
    fi
}

write_aliases() {
    local setupvibe_dir="$REAL_HOME/.config/setupvibe"
    local aliases_file="$setupvibe_dir/aliases.bash"

    user_do mkdir -p "$setupvibe_dir"
    [[ -f "$aliases_file" ]] && return 0

    user_do tee "$aliases_file" >/dev/null <<'EOF'
# Aliases adicionais do SetupVibe para Omarchy. Os aliases do Omarchy ficam intactos.

alias_if_missing() {
    alias "$1" >/dev/null 2>&1 || alias "$1=$2"
}

alias_if_missing dc 'docker compose'
alias_if_missing dps 'docker ps'
alias_if_missing dpsa 'docker ps -a'
alias_if_missing dimg 'docker images'
alias_if_missing dlog 'docker logs -f'
alias_if_missing dex 'docker exec -it'
alias_if_missing dcup 'docker compose up -d'
alias_if_missing dcdown 'docker compose down'
alias_if_missing p 'pm2'
alias_if_missing pl 'pm2 list'
alias_if_missing psave 'pm2 save'
alias_if_missing pres 'pm2 resurrect'
alias_if_missing gcm 'git commit -m'
alias_if_missing gcam 'git commit -a -m'
alias_if_missing gl 'git log --oneline --graph --decorate'
alias_if_missing sv-pkg 'omarchy pkg add'
alias_if_missing sv-php 'php -v'
alias_if_missing sv-rails 'rails -v'
alias_if_missing sv-qr 'qr'
alias_if_missing sv-pm2 'pm2'
alias_if_missing sv-portainer 'docker compose -f "$HOME/.setupvibe/portainer-compose.yml"'
alias_if_missing ssh_copy_id '"$HOME/.setupvibe/bin/ssh_copy_id"'

sv-portainer-start() {
    docker compose -f "$HOME/.setupvibe/portainer-compose.yml" up -d
}

sv-portainer-stop() {
    docker compose -f "$HOME/.setupvibe/portainer-compose.yml" stop
}

sv-portainer-logs() {
    docker compose -f "$HOME/.setupvibe/portainer-compose.yml" logs -f
}

unset -f alias_if_missing
EOF
    user_do chmod 0644 "$aliases_file"
}

append_shell_integration() {
    local bashrc="$REAL_HOME/.bashrc"
    local marker_begin="# >>> SetupVibe Omarchy ${OMARCHY_MAJOR} >>>"

    user_do touch "$bashrc"
    if grep -Fq "$marker_begin" "$bashrc"; then
        return 0
    fi

    user_do tee -a "$bashrc" >/dev/null <<'EOF'

# >>> SetupVibe Omarchy 4 >>>
# Este bloco é aditivo. O .bashrc e a inicialização do Omarchy permanecem acima.
export SETUPVIBE_CONFIG_DIR="${SETUPVIBE_CONFIG_DIR:-$HOME/.config/setupvibe}"
export STARSHIP_CONFIG="$SETUPVIBE_CONFIG_DIR/starship.toml"
export COMPOSER_HOME="${COMPOSER_HOME:-$HOME/.config/composer}"
export PATH="$HOME/.local/bin:$COMPOSER_HOME/vendor/bin:$PATH"

if [[ -r "$SETUPVIBE_CONFIG_DIR/aliases.bash" ]]; then
  source "$SETUPVIBE_CONFIG_DIR/aliases.bash"
fi

if [[ $- == *i* ]] && [[ ${TERM:-} != dumb ]] && command -v starship >/dev/null 2>&1; then
  eval "$(starship init bash)"
fi
# <<< SetupVibe Omarchy 4 <<<
EOF

}

configure_portainer() {
    if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
        warn "Docker não está disponível agora; o compose do Portainer foi apenas adicionado."
        return 0
    fi

    if ! user_do docker compose -f "$REAL_HOME/.setupvibe/portainer-compose.yml" up -d; then
        warn "Portainer não pôde ser iniciado agora; o compose continua disponível."
    fi
}

configure_tailscale() {
    if ! command -v tailscale >/dev/null 2>&1; then
        return 0
    fi

    if sys_do systemctl enable --now tailscaled; then
        tailscale version >/dev/null
    else
        warn "O serviço tailscaled não pôde ser habilitado agora."
    fi
}

configure_ssh() {
    if ! command -v sshd >/dev/null 2>&1; then
        return 0
    fi

    # O Omarchy já administra firewall e segurança. Apenas garantimos que o
    # serviço existente possa ser usado, sem reescrever sshd_config.
    sys_do systemctl enable --now sshd 2>/dev/null ||
        sys_do systemctl enable --now ssh 2>/dev/null || true
}

main() {
    local arg
    for arg in "$@"; do
        case "$arg" in
            --yes) ASSUME_YES=true ;;
            --help|-h) usage; return 0 ;;
            *) die "Opção desconhecida: $arg" ;;
        esac
    done

    detect_user
    check_omarchy
    path_prepend_once "$REAL_HOME/.local/share/mise/shims"
    path_prepend_once "$REAL_HOME/.local/bin"
    export PATH
    confirm_installation

    install_additional_packages
    install_setupvibe_files
    configure_php_and_rails
    configure_python_go_rust
    configure_javascript
    install_optional_ai_tools
    write_starship_config
    write_aliases
    append_shell_integration
    configure_portainer
    configure_tailscale
    configure_ssh

    echo ""
    echo -e "${GREEN}${BOLD}SetupVibe Omarchy ${OMARCHY_MAJOR} concluído.${NC}"
    echo "Abra um novo terminal ou execute: source ~/.bashrc"
    echo "Arquivos adicionados em ~/.config/setupvibe e ~/.setupvibe."
}

main "$@"
