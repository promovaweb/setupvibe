#!/usr/bin/env bash
# Instala o executável compilado com hashes fixados no build, sem exigir Bun.
set -euo pipefail
umask 077

release_version='@VERSION@'
download_base='@DOWNLOAD_BASE@'
prefix="${HOME:?HOME is required}/.local/share/setupvibe"
bin_directory="$HOME/.local/bin"
confirmed=false
install_dependencies=false
edition=desktop
integrate_path=true
path_shell="${SHELL:-/bin/bash}"
staging=''
locked=false
temporary_pointer=''
download_pid=''
integration_pid=''

fail() { printf '%s\n' "Error: $*" >&2; exit 1; }
cleanup() {
  if [[ -n "$download_pid" ]]; then kill "$download_pid" 2>/dev/null || true; wait "$download_pid" 2>/dev/null || true; fi
  if [[ -n "$integration_pid" ]]; then kill "$integration_pid" 2>/dev/null || true; wait "$integration_pid" 2>/dev/null || true; fi
  [[ -z "$staging" ]] || rm -rf -- "$staging"
  [[ -z "$temporary_pointer" ]] || rm -f -- "$temporary_pointer"
  if [[ "$locked" == true ]]; then rmdir "$prefix/.bootstrap-lock"; fi
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

while [[ $# -gt 0 ]]; do
  case "$1" in
    --confirm) confirmed=true; shift ;;
    --install-dependencies) install_dependencies=true; shift ;;
    --server) edition=server; shift ;;
    --no-path) integrate_path=false; shift ;;
    --shell) [[ $# -ge 2 ]] || fail 'Missing shell name.'; path_shell="$2"; shift 2 ;;
    --prefix|--bin-directory)
      [[ $# -ge 2 ]] || fail "Missing path for $1."
      if [[ "$1" == --prefix ]]; then prefix="$2"; else bin_directory="$2"; fi
      shift 2 ;;
    --help)
      printf '%s\n' 'SetupVibe bootstrap' 'Usage: bash install.sh [--confirm] [--server] [--install-dependencies] [--prefix /absolute/path] [--bin-directory /absolute/path] [--shell bash|zsh] [--no-path]' 'Without --confirm, prints the plan without modifying files.' 'Shell PATH blocks are backed up and registered. Use --no-path to skip profile integration.'
      exit 0 ;;
    *) fail "Unknown option: $1." ;;
  esac
done

# Caminhos são dados; nenhum arquivo de identificação ou recibo é executado.
for directory in "$prefix" "$bin_directory"; do
  [[ "$directory" == /* && "$directory" != / && "$directory" != "$HOME" ]] || fail 'Use dedicated absolute installation directories.'
  [[ "$directory" != *$'\n'* && "$directory" != *$'\r'* && "$directory" != *'/../'* && "$directory" != */.. && "$directory" != *'/./'* ]] || fail 'Invalid installation directory.'
done
prefix="${prefix%/}"
bin_directory="${bin_directory%/}"
path_shell="${path_shell##*/}"
if [[ "$integrate_path" == true ]]; then
  case "$path_shell" in bash|zsh) ;; *) fail 'PATH integration supports Bash or Zsh; use --shell or --no-path.' ;; esac
fi
[[ "$prefix" != "$bin_directory" ]] || fail 'Installation and bin directories must be distinct.'
system="$(uname -s)"
case "$(uname -m)" in x86_64|amd64) arch=x64 ;; arm64|aarch64) arch=arm64 ;; *) fail 'Unsupported architecture.' ;; esac
case "$system" in
  Linux)
    system=linux
    [[ -r /etc/os-release ]] || fail 'Linux identification is unavailable.'
    # awk não interpreta expansão de shell nem aceita identificações duplicadas.
    identification="$(awk -F= '/^(ID|VERSION_ID)=/ {key=$1; value=substr($0,index($0,"=")+1); gsub(/^"|"$/,"",value); if(value !~ /^[A-Za-z0-9._-]+$/ || seen[key]++) exit 1; data[key]=value} END {if(!data["ID"] || !data["VERSION_ID"]) exit 1; print data["ID"] " " data["VERSION_ID"]}' /etc/os-release)" || fail 'Invalid Linux identification.'
    case "$identification" in 'debian 12'|'debian 13'|'ubuntu 24.04') ;; *) fail 'Distribution is outside the initial matrix.' ;; esac ;;
  Darwin)
    system=darwin
    [[ "$edition" == desktop ]] || fail 'Server edition requires Linux.'
    mac_version="$(sw_vers -productVersion)"
    [[ "$mac_version" =~ ^([0-9]+)\. ]] || fail 'macOS identification is unavailable.'
    [[ "${BASH_REMATCH[1]}" -ge 14 ]] || fail 'macOS 14 or later is required.' ;;
  *) fail 'Unsupported operating system.' ;;
esac
case "$system-$arch" in
  linux-x64) expected='@LINUX_X64_SHA256@' ;;
  linux-arm64) expected='@LINUX_ARM64_SHA256@' ;;
  darwin-x64) expected='@DARWIN_X64_SHA256@' ;;
  darwin-arm64) expected='@DARWIN_ARM64_SHA256@' ;;
esac
[[ "$release_version" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[A-Za-z0-9.-]+)?$ && "$expected" =~ ^[a-f0-9]{64}$ ]] || fail 'This bootstrap has no artifact for the detected platform.'
name="setupvibe-$release_version-$system-$arch"
url="$download_base/$name"
[[ "$url" == https://* ]] || fail 'HTTPS is required.'
printf '%s\n' "Version: $release_version" "Platform: $system/$arch" "Edition: $edition" "Download: $url" "SHA-256: $expected" "Installation: $prefix" "Command: $bin_directory/setupvibe"
if [[ "$integrate_path" == true ]]; then printf '%s\n' "PATH profiles: $path_shell (with backup)"; else printf '%s\n' 'PATH profiles: skipped'; fi
if [[ "$confirmed" != true ]]; then printf '%s\n' 'No changes made. Re-run with --confirm to install.'; exit 0; fi

# A elevação fica restrita aos pacotes de transporte, sem executar o instalador como outro usuário.
if ! command -v curl >/dev/null 2>&1 || [[ "$system" == linux && ! -s /etc/ssl/certs/ca-certificates.crt ]]; then
  [[ "$install_dependencies" == true && "$system" == linux ]] || fail 'curl and CA certificates are required; use --install-dependencies on Linux.'
  privilege=()
  if [[ "$EUID" -ne 0 ]]; then
    command -v sudo >/dev/null 2>&1 || fail 'Non-interactive sudo is required to install dependencies.'
    sudo -n -- /usr/bin/true || fail 'Non-interactive sudo is required to install dependencies.'
    privilege=(sudo -n --)
  fi
  apt_options=(-o DPkg::Lock::Timeout=60 -o APT::Get::AllowUnauthenticated=false -o Acquire::AllowInsecureRepositories=false -o Acquire::AllowDowngradeToInsecureRepositories=false)
  "${privilege[@]}" /usr/bin/env DEBIAN_FRONTEND=noninteractive /usr/bin/apt-get "${apt_options[@]}" update
  "${privilege[@]}" /usr/bin/env DEBIAN_FRONTEND=noninteractive /usr/bin/apt-get "${apt_options[@]}" -o Dpkg::Options::=--force-confold install --assume-yes --no-install-recommends --no-remove curl ca-certificates
fi
command -v curl >/dev/null 2>&1 || fail 'curl is unavailable.'
if command -v sha256sum >/dev/null 2>&1; then hash_command=(sha256sum); elif command -v shasum >/dev/null 2>&1; then hash_command=(shasum -a 256); else fail 'A SHA-256 verifier is required.'; fi
digest() { local value; value="$("${hash_command[@]}" "$1")"; printf '%s' "${value%% *}"; }

# Recusa ancestrais substituíveis por outro usuário e links no caminho gerenciado.
check_ancestors() {
  local directory="$1" owner mode
  while [[ "$directory" != / ]]; do
    [[ ! -L "$directory" ]] || fail 'Installation paths must not contain symlinks.'
    if [[ -e "$directory" ]]; then
      [[ -d "$directory" ]] || fail 'Installation path contains a non-directory.'
      if [[ "$system" == linux ]]; then owner="$(stat -c %u "$directory")"; mode="$(stat -c %a "$directory")"; else owner="$(stat -f %u "$directory")"; mode="$(stat -f %Lp "$directory")"; fi
      [[ "$owner" == 0 || "$owner" == "$EUID" ]] || fail 'Installation path belongs to another user.'
      (( (8#$mode & 0022) == 0 )) || fail 'Installation path is writable by another user.'
    fi
    directory="$(dirname "$directory")"
  done
}
check_ancestors "$prefix"
check_ancestors "$bin_directory"
if [[ -e "$prefix" && ! -f "$prefix/.setupvibe-bootstrap" ]]; then
  shopt -s dotglob nullglob
  entries=("$prefix"/*)
  [[ "${#entries[@]}" -eq 0 ]] || fail 'Installation directory contains external files.'
  shopt -u dotglob nullglob
fi
mkdir -p -- "$prefix" "$bin_directory"
[[ ! -L "$prefix/.setupvibe-bootstrap" ]] || fail 'Invalid installation marker.'
if [[ -e "$prefix/.setupvibe-bootstrap" ]]; then
  [[ "$(cat "$prefix/.setupvibe-bootstrap")" == setupvibe-bootstrap-v1 ]] || fail 'Installation marker does not match.'
else
  (set -o noclobber; printf '%s\n' setupvibe-bootstrap-v1 > "$prefix/.setupvibe-bootstrap")
fi
mkdir "$prefix/.bootstrap-lock" || fail 'Another bootstrap is active; inspect a stale lock before removing it.'
locked=true
command_path="$bin_directory/setupvibe"
if [[ -L "$command_path" ]]; then
  [[ "$(readlink "$command_path")" == "$prefix/launch" ]] || fail 'Command belongs to an external installation.'
  [[ -f "$prefix/launch" && ! -L "$prefix/launch" && -f "$prefix/launch.sha256" && ! -L "$prefix/launch.sha256" ]] || fail 'Command has no matching ownership receipt.'
elif [[ -e "$command_path" ]]; then fail 'Command belongs to an external file.'; fi

verify_owned() {
  local artifact="$1" receipt="$prefix/$1.sha256" value
  [[ "$artifact" =~ ^setupvibe-[A-Za-z0-9._-]+$ ]] || fail 'Invalid current release path.'
  [[ -f "$receipt" && ! -L "$receipt" && -f "$prefix/$artifact" && ! -L "$prefix/$artifact" ]] || fail 'Current release has no valid ownership receipt.'
  value="$(cat "$receipt")"
  [[ "$value" =~ ^[a-f0-9]{64}$ && "$(digest "$prefix/$artifact")" == "$value" ]] || fail 'Managed release bytes changed.'
}
if [[ -L "$prefix/current" ]]; then verify_owned "$(readlink "$prefix/current")"; elif [[ -e "$prefix/current" ]]; then fail 'Current pointer belongs to an external file.'; fi
if [[ -e "$prefix/$name.sha256" || -L "$prefix/$name.sha256" ]]; then
  [[ -f "$prefix/$name.sha256" && ! -L "$prefix/$name.sha256" && "$(cat "$prefix/$name.sha256")" == "$expected" ]] || fail 'Release receipt does not match this bootstrap.'
elif [[ -e "$prefix/$name" || -L "$prefix/$name" ]]; then fail 'Release artifact belongs to an external file.'; fi
if [[ -e "$prefix/$name" || -L "$prefix/$name" ]]; then
  verify_owned "$name"
else
  staging="$(mktemp -d "$prefix/.bootstrap-download-XXXXXXXX")"
  (ulimit -f 262144; exec curl --fail --silent --show-error --location --proto '=https' --proto-redir '=https' --tlsv1.2 --max-redirs 3 --connect-timeout 15 --max-time 180 --max-filesize 268435456 --output "$staging/artifact" "$url") &
  download_pid=$!
  wait "$download_pid"
  download_pid=''
  [[ "$(digest "$staging/artifact")" == "$expected" ]] || fail 'Artifact checksum does not match.'
  chmod 700 "$staging/artifact"
  [[ "$("$staging/artifact" --version)" == "$release_version" ]] || fail 'Executable version does not match.'
  # Recibo anterior à publicação permite retomar após interrupção entre as duas gravações.
  if [[ ! -e "$prefix/$name.sha256" ]]; then (set -o noclobber; printf '%s\n' "$expected" > "$prefix/$name.sha256"); fi
  ln "$staging/artifact" "$prefix/$name"
fi
verify_owned "$name"
if [[ "$integrate_path" == true ]]; then "$prefix/$name" preview-path "$bin_directory" "$path_shell" --json; fi
# O launcher mantém a edição escolhida sem alterar perfis ou exigir flags a cada comando.
if [[ -z "$staging" ]]; then staging="$(mktemp -d "$prefix/.bootstrap-download-XXXXXXXX")"; fi
server_flag=''
if [[ "$edition" == server ]]; then server_flag=' --server'; fi
printf '#!/usr/bin/env bash\nexec %q "$@"%s\n' "$prefix/current" "$server_flag" > "$staging/launch"
chmod 700 "$staging/launch"
launcher_hash="$(digest "$staging/launch")"
if [[ -e "$prefix/launch.sha256" || -L "$prefix/launch.sha256" ]]; then
  [[ -f "$prefix/launch.sha256" && ! -L "$prefix/launch.sha256" && "$(cat "$prefix/launch.sha256")" == "$launcher_hash" ]] || fail 'Installed edition or launcher does not match; use another prefix.'
elif [[ -e "$prefix/launch" || -L "$prefix/launch" ]]; then fail 'Launcher belongs to an external file.'; fi
if [[ -e "$prefix/launch" || -L "$prefix/launch" ]]; then
  [[ -f "$prefix/launch" && ! -L "$prefix/launch" && "$(digest "$prefix/launch")" == "$launcher_hash" ]] || fail 'Managed launcher bytes changed.'
else
  if [[ ! -e "$prefix/launch.sha256" ]]; then (set -o noclobber; printf '%s\n' "$launcher_hash" > "$prefix/launch.sha256"); fi
  ln "$staging/launch" "$prefix/launch"
fi
if [[ "$integrate_path" == true ]]; then
  "$prefix/$name" install-path "$bin_directory" "$path_shell" --confirm --json &
  integration_pid=$!
  wait "$integration_pid"
  integration_pid=''
fi
if [[ -L "$prefix/current" && "$(readlink "$prefix/current")" != "$name" ]]; then
  # Ao trocar versão, o núcleo registra o mesmo journal usado pelo rollback da CLI.
  rm -rf -- "$staging"
  staging=''
  locked=false
  rmdir "$prefix/.bootstrap-lock"
  "$prefix/$name" activate-release "$release_version" "$expected" "$prefix" --confirm --json &
  integration_pid=$!
  wait "$integration_pid"
  integration_pid=''
else
  temporary_pointer="$prefix/.current-bootstrap-$$"
  ln -s "$name" "$temporary_pointer"
  mv -f -- "$temporary_pointer" "$prefix/current"
  temporary_pointer=''
fi
if [[ ! -L "$command_path" ]]; then ln -s "$prefix/launch" "$command_path"; fi
printf '%s\n' "Installed: $command_path" 'Existing configuration and previous releases preserved.'
if [[ "$integrate_path" == true ]]; then printf '%s\n' 'Open a new shell to use setupvibe by name.'; else case ":$PATH:" in *":$bin_directory:"*) ;; *) printf '%s\n' "Add $bin_directory to PATH to run setupvibe by name." ;; esac; fi
printf '%s\n' "Run: $command_path"
