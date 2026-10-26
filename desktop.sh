#!/usr/bin/env bash
# Gerado por scripts/distribution.mjs. Instala somente o executável SetupVibe 2.
# Edição e versão são fixadas no artefato; não execute downloads não verificados.
set -euo pipefail
umask 077

main() {
  local edition='desktop' version='2.0.0-alpha.1' install_dir="${SETUPVIBE_INSTALL_DIR:-${HOME:?HOME ausente}/.local/bin}"
  local base_url="${SETUPVIBE_DOWNLOAD_BASE:-https://github.com/promovaweb/setupvibe/releases/download}"
  local dry_run=0 system architecture target asset url candidate checksum expected name extra
  bootstrap_stage=''; bootstrap_lock=''
  local receipt destination previous_hash actual_hash path_part mode owner
  fail() { printf 'Erro: %s\n' "$*" >&2; exit 1; }
  while [ "$#" -gt 0 ]; do
    case "$1" in
      --version|--install-dir)
        [ "$#" -ge 2 ] || fail "Valor ausente para $1"
        if [ "$1" = --version ]; then version="$2"; else install_dir="$2"; fi
        shift 2 ;;
      --dry-run) dry_run=1; shift ;;
      --yes|--non-interactive) shift ;; # O bootstrap nunca faz perguntas.
      -h|--help)
        printf 'SetupVibe %s: --version VERSÃO --install-dir CAMINHO --dry-run\n' "$edition"
        return ;;
      *) fail "Argumento desconhecido: $1" ;;
    esac
  done
  [[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9]+([.-][a-zA-Z0-9]+)*)?$ ]] || fail 'Versão inválida'
  case "$install_dir" in /*) ;; *) fail 'Diretório deve ser absoluto' ;; esac
  case "$install_dir" in *$'\n'*|*$'\r'*|*/../*|*/..|*/./*|*/.) fail 'Diretório inválido' ;; esac
  install_dir="${install_dir%/}"
  [ -n "$install_dir" ] || fail 'Não instale na raiz do sistema'
  case "$base_url" in https://*) ;; *) fail 'Download exige HTTPS' ;; esac
  case "$base_url" in *'?'*|*'#'*|*$'\n'*|*$'\r'*|*'@'*) fail 'URL base inválida' ;; esac
  system="$(uname -s)"; architecture="$(uname -m)"
  case "$architecture" in x86_64|amd64) architecture=x86_64 ;; aarch64|arm64) architecture=aarch64 ;; *) fail 'Arquitetura não suportada' ;; esac
  case "$system" in
    Linux)
      # Lê somente os dois campos; não executa o conteúdo de os-release.
      local distro='' os_version='' key value
      while IFS='=' read -r key value; do
        value="${value#\"}"; value="${value%\"}"; value="${value#\'}"; value="${value%\'}"
        case "$key" in ID) distro="$value" ;; VERSION_ID) os_version="$value" ;; esac
      done < /etc/os-release
      case "$distro:$os_version" in debian:12|debian:13|ubuntu:24.04) ;; *) fail "Distribuição não habilitada: $distro $os_version" ;; esac
      target="$architecture-unknown-linux-musl" ;;
    Darwin)
      [ "$edition" = desktop ] || fail 'Server exige Linux'
      local mac_version
      mac_version="$(sw_vers -productVersion)"; mac_version="${mac_version%%.*}"
      [[ "$mac_version" =~ ^[0-9]+$ ]] && [ "$mac_version" -ge 14 ] || fail 'Desktop exige macOS 14 ou superior'
      target="$architecture-apple-darwin" ;;
    *) fail 'Sistema não suportado' ;;
  esac
  asset="setupvibe-$edition-$version-$target"
  url="${base_url%/}/v$version/$asset"
  destination="$install_dir/setupvibe"; receipt="$install_dir/.setupvibe.sha256"
  printf 'Edição: %s\nVersão: %s\nTarget: %s\nDestino: %s\nDownload: %s\n' "$edition" "$version" "$target" "$destination" "$url"
  [ "$dry_run" = 0 ] || return 0
  command -v curl >/dev/null || fail 'curl precisa estar instalado'
  if command -v sha256sum >/dev/null; then
    hash() { sha256sum "$1" | cut -d ' ' -f 1; }
  elif command -v shasum >/dev/null; then
    hash() { shasum -a 256 "$1" | cut -d ' ' -f 1; }
  else fail 'Instale sha256sum ou shasum'; fi
  # Recusa links e diretórios graváveis por terceiros antes de criar arquivos.
  path_part="$install_dir"
  while [ "$path_part" != / ] && [ -n "$path_part" ]; do
    [ ! -L "$path_part" ] || fail "Diretório simbólico não aceito: $path_part"
    if [ -e "$path_part" ]; then
      [ -d "$path_part" ] || fail "Não é diretório: $path_part"
      if [ "$system" = Darwin ]; then
        mode="$(stat -f '%Lp' "$path_part")"; owner="$(stat -f '%u' "$path_part")"
      else
        mode="$(stat -c '%a' "$path_part")"; owner="$(stat -c '%u' "$path_part")"
      fi
      # /tmp com sticky bit é permitido apenas como ancestral de pasta privada.
      if [ "$path_part" != /tmp ] || [ "$install_dir" = /tmp ]; then
        [ $((8#$mode & 0022)) = 0 ] || fail "Diretório gravável por terceiros: $path_part"
      fi
      [ "$owner" = "$(id -u)" ] || [ "$owner" = 0 ] || fail "Proprietário inesperado: $path_part"
    fi
    path_part="$(dirname "$path_part")"
  done
  mkdir -p "$install_dir"
  bootstrap_lock="$install_dir/.setupvibe-bootstrap.lock"
  mkdir "$bootstrap_lock" 2>/dev/null || fail 'Outra instalação está em execução ou deixou lock; confira antes de remover'
  # Caminhos globais privados continuam disponíveis no trap após uma falha de main.
  cleanup() {
    [ -z "$bootstrap_stage" ] || rm -rf "$bootstrap_stage"
    [ -z "$bootstrap_lock" ] || rmdir "$bootstrap_lock" 2>/dev/null || true
  }
  trap cleanup EXIT
  trap 'exit 130' INT
  trap 'exit 143' TERM
  bootstrap_stage="$(mktemp -d "$install_dir/.setupvibe-stage.XXXXXX")"
  [ ! -L "$destination" ] && [ ! -L "$receipt" ] || fail 'Destino ou recibo é link simbólico'
  if [ -e "$destination" ]; then
    [ -f "$destination" ] && [ -f "$receipt" ] || fail 'Instalação externa: executável sem recibo do bootstrap'
    previous_hash="$(cat "$receipt")"
    [[ "$previous_hash" =~ ^[a-f0-9]{64}$ ]] || fail 'Recibo inválido'
    [ "$(hash "$destination")" = "$previous_hash" ] || fail 'Executável alterado fora do bootstrap; não será sobrescrito'
  elif [ -e "$receipt" ]; then
    fail 'Recibo sem executável: confira a instalação antes de continuar'
  fi
  candidate="$bootstrap_stage/setupvibe"; checksum="$bootstrap_stage/checksum"
  # -q é o primeiro argumento para ignorar configurações implícitas de curl.
  curl -q --fail --silent --show-error --location --proto '=https' --proto-redir '=https' --tlsv1.2 --connect-timeout 20 --max-time 300 --retry 2 --output "$candidate" "$url"
  curl -q --fail --silent --show-error --location --proto '=https' --proto-redir '=https' --tlsv1.2 --connect-timeout 20 --max-time 60 --retry 2 --max-filesize 1024 --output "$checksum" "$url.sha256"
  [ -s "$candidate" ] || fail 'Download vazio'
  [ "$(wc -l < "$checksum" | tr -d ' ')" = 1 ] || fail 'Checksum deve conter exatamente uma linha'
  IFS=' ' read -r expected name extra < "$checksum"
  [[ "$expected" =~ ^[a-f0-9]{64}$ ]] && [ "$name" = "$asset" ] && [ -z "$extra" ] || fail 'Formato ou nome no checksum inválido'
  actual_hash="$(hash "$candidate")"
  [ "$actual_hash" = "$expected" ] || fail 'SHA-256 divergente: download descartado'
  chmod 755 "$candidate"
  [ "$("$candidate" --version)" = "setupvibe $version" ] || fail 'Executável não corresponde à versão solicitada'
  printf '%s\n' "$expected" > "$bootstrap_stage/receipt"
  # Guarda cópias para restaurar se a segunda troca falhar. Não apaga estado local.
  if [ -e "$destination" ]; then cp -p "$destination" "$bootstrap_stage/previous"; cp -p "$receipt" "$bootstrap_stage/previous-receipt"; fi
  mv -f "$candidate" "$destination"
  if ! mv -f "$bootstrap_stage/receipt" "$receipt"; then
    if [ -f "$bootstrap_stage/previous" ]; then mv -f "$bootstrap_stage/previous" "$destination"; else rm -f "$destination"; fi
    fail 'Falha ao salvar recibo; executável anterior restaurado'
  fi
  printf 'Instalado: %s\n' "$destination"
  # shellcheck disable=SC2016 # A mensagem deve preservar $PATH para o shell do usuário.
  case ":${PATH:-}:" in *":$install_dir:"*) ;; *) printf 'Para esta sessão: export PATH=%q:"$PATH"\n' "$install_dir" ;; esac
  printf 'Abra em terminal interativo: %q\nAutomação: %q --output json catalog list\n' "$destination" "$destination"
  cleanup; bootstrap_stage=''; bootstrap_lock=''; trap - EXIT INT TERM
}
# O corpo só começa após o download completo da definição da função.
main "$@"
