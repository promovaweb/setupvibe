# 1. PATH CONFIGURATION (Must come first!)
# Homebrew
if [ -f "/home/linuxbrew/.linuxbrew/bin/brew" ]; then
    eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
elif [ -f "$HOME/.linuxbrew/bin/brew" ]; then
    eval "$($HOME/.linuxbrew/bin/brew shellenv)"
fi

# Define PATHs before loading plugins so they can find the tools
export PATH="$HOME/.local/bin:$PATH"
export PATH="$HOME/.npm-global/bin:$PATH"
export PATH="$HOME/.cargo/bin:$PATH"
export PATH="$HOME/.config/composer/vendor/bin:$PATH"
export PATH="$HOME/.local/go/bin:/usr/local/go/bin:$PATH"
export GOPATH=$HOME/go
export PATH=$PATH:$GOPATH/bin
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
export PATH="$HOME/.rbenv/bin:$PATH"


# 2. INIT TOOLS (Env Setup)
[ -f "$HOME/.cargo/env" ] && source "$HOME/.cargo/env"
if command -v rbenv >/dev/null; then eval "$(rbenv init -)"; fi


# 3. OH-MY-ZSH CONFIG
export ZSH="$HOME/.oh-my-zsh"
ZSH_THEME="" # Disabled because Starship handles it

# Plugins
plugins=(git rsync nmap cp extract zoxide fzf zsh-autosuggestions zsh-syntax-highlighting tmux brew gh ansible docker docker-compose laravel composer rails ruby python pip node npm bun golang rust)

source $ZSH/oh-my-zsh.sh


# 4. STARSHIP & ZOXIDE
if command -v zoxide >/dev/null; then eval "$(zoxide init zsh)"; fi
if command -v starship >/dev/null; then eval "$(starship init zsh)"; fi


# 5. ALIASES
alias ge="gemini --approval-mode=yolo"
alias cc="claude --permission-mode=auto --dangerously-skip-permissions"
alias zconfig="nano ~/.zshrc"
alias reload="source ~/.zshrc"
alias update="sudo apt update && sudo apt upgrade && (command -v brew >/dev/null 2>&1 && brew update && brew upgrade || true)"
alias d="docker"
alias dc="docker compose"
alias art="php artisan"
alias brewup="brew update && brew upgrade && brew cleanup"
alias syslog="sudo journalctl -f"
alias ports="ss -tulnp"
alias meminfo="free -h"
alias diskinfo="df -h"
alias cpuinfo="lscpu"
alias wholistening="ss -tulnp"
