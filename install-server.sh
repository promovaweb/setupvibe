#!/bin/sh
# SetupVibe 2 one-line installer with the Server edition selected for forwarded commands and a compatibility link, for the
# address that served the SetupVibe 1 server.sh (server.setupvibe.dev at the
# launch). Same arguments as install.sh, which does the download and checks:
#
#   curl -fsSL https://raw.githubusercontent.com/promovaweb/setupvibe/v2/install-server.sh | sh
#   curl -fsSL .../install-server.sh | sh -s -- auto --user deploy --manager --advertise-addr 10.0.0.1:2377
set -eu
RAW_BASE="https://raw.githubusercontent.com/promovaweb/setupvibe/v2"
installer=$(curl --proto '=https' --tlsv1.2 -fsSL "$RAW_BASE/install.sh")
sh -c "$installer" sh --edition server "$@"
