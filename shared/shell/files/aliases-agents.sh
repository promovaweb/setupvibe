# Aliases that start coding agents with every permission granted.
# Managed by SetupVibe; turn them off with: setupvibe config set shell.agentAliases false

# _sv_alias defines an alias only when nothing answers to that name yet: no
# alias, no shell function and no installed command (oc, for example, is also
# the OpenShift client). setupvibe doctor lists the aliases skipped here.
_sv_alias() {
  alias "$1" >/dev/null 2>&1 && return 0
  typeset -f "$1" >/dev/null 2>&1 && return 0
  command -v "$1" >/dev/null 2>&1 && return 0
  alias "$1=$2"
}

# --- AI CLIs ---
_sv_alias cco "claude --permission-mode=auto --dangerously-skip-permissions"        # Claude Code sem confirmações
_sv_alias cxo "codex --yolo"                                                       # Codex CLI sem confirmações
_sv_alias oco "opencode --auto"                                                    # OpenCode sem confirmações
_sv_alias cx "codex --yolo"                                                        # Codex CLI sem confirmações (nome antigo)
_sv_alias oc "opencode --auto"                                                     # OpenCode sem confirmações (nome antigo)

unset -f _sv_alias
