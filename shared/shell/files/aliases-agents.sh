# Aliases that start coding agents with every permission granted.
# Managed by SetupVibe; turn them off with: setupvibe config set shell.agentAliases false
# --- AI CLIs ---
alias cc >/dev/null 2>&1 || alias cc="claude --permission-mode=auto --dangerously-skip-permissions"        # Claude CLI sem confirmações
alias cx >/dev/null 2>&1 || alias cx="codex --yolo"                                                       # Codex CLI sem confirmações
alias oc >/dev/null 2>&1 || alias oc="opencode --auto"                                                    # OpenCode sem confirmações
