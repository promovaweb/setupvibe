#!/bin/sh
# ssh_copy_id from SetupVibe 1, kept by SetupVibe 2 as a shortcut to
# "setupvibe ssh copy-id" with the same options:
#   ssh_copy_id --host HOST --user USER [--pass PASS] [--key FILE] [--port 22]
set -eu
host="" user="" pass="" key="" port=""
while [ $# -gt 0 ]; do
  case "$1" in
    --host) host="$2"; shift 2 ;;
    --user) user="$2"; shift 2 ;;
    --pass) pass="$2"; shift 2 ;;
    --key) key="$2"; shift 2 ;;
    --port) port="$2"; shift 2 ;;
    -h|--help) echo "Usage: ssh_copy_id --host HOST --user USER [--pass PASS] [--key FILE] [--port 22]"; exit 0 ;;
    *) echo "ssh_copy_id: unknown option $1" >&2; exit 2 ;;
  esac
done
[ -n "$host" ] && [ -n "$user" ] || { echo "ssh_copy_id: --host and --user are required" >&2; exit 2; }
bin=$(command -v setupvibe || command -v setupvibe-server || true)
[ -n "$bin" ] || { echo "ssh_copy_id: setupvibe is not installed" >&2; exit 127; }
set -- ssh copy-id "$user@$host"
[ -n "$key" ] && set -- "$@" --key "$key"
[ -n "$port" ] && set -- "$@" --port "$port"
if [ -n "$pass" ]; then
  printf %s "$pass" | "$bin" "$@" --password-stdin
else
  exec "$bin" "$@"
fi
