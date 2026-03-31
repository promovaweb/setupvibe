# 1. PATH CONFIGURATION (Must come first!)
# Homebrew
if [ -f "/home/linuxbrew/.linuxbrew/bin/brew" ]; then
    eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
elif [ -f "$HOME/.linuxbrew/bin/brew" ]; then
    eval "$($HOME/.linuxbrew/bin/brew shellenv)"
fi

export PATH="$HOME/.local/bin:$HOME/.npm-global/bin:$PATH"
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"


# 2. OH-MY-ZSH CONFIG
export ZSH="$HOME/.oh-my-zsh"
ZSH_THEME="" # Disabled because Starship handles it

# Plugins
plugins=(git rsync nmap cp extract zoxide fzf zsh-autosuggestions zsh-syntax-highlighting tmux gh ansible docker docker-compose)

source $ZSH/oh-my-zsh.sh


# 3. STARSHIP & ZOXIDE
if command -v zoxide >/dev/null; then eval "$(zoxide init zsh)"; fi
if command -v starship >/dev/null; then eval "$(starship init zsh)"; fi


# 4. ALIASES
alias ge="gemini --approval-mode=yolo"
alias cc="claude --permission-mode=auto --dangerously-skip-permissions"
alias zconfig="nano ~/.zshrc"
alias reload="source ~/.zshrc"
alias update="sudo apt update && sudo apt upgrade && (command -v brew >/dev/null 2>&1 && brew update && brew upgrade || true)"
alias d="docker"
alias dc="docker compose"
alias brewup="brew update && brew upgrade && brew cleanup"
alias syslog="sudo journalctl -f"
alias ports="ss -tulnp"
alias meminfo="free -h"
alias diskinfo="df -h"
alias cpuinfo="lscpu"
alias wholistening="ss -tulnp"
