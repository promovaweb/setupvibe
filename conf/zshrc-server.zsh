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

# --- SetupVibe ---
alias setupvibe="curl -sSL server.setupvibe.dev | bash"                       # Reinstala ou atualiza o SetupVibe Server

# --- AI CLIs ---
alias ge="gemini --approval-mode=yolo"                                        # Gemini CLI sem confirmações
alias cc="claude --permission-mode=auto --dangerously-skip-permissions"        # Claude CLI sem confirmações

# --- Skills CLI ---
alias skl="npx skills list"                     # Lista todas as skills instaladas
alias skf="npx skills find"                     # Busca skills no registro (ex: skf react)
alias ska="npx skills add"                      # Instala uma nova skill (ex: ska owner/repo)
alias sku="npx skills update"                   # Atualiza todas as skills instaladas
alias skun="npx skills remove"                  # Remove uma skill instalada (ex: skun nome)
alias skc="npx skills check"                    # Verifica atualizações disponíveis

# --- Shell ---
alias zconfig="nano ~/.zshrc"                   # Edita o arquivo de configuração do ZSH
alias reload="source ~/.zshrc"                  # Recarrega as configurações do ZSH sem reiniciar o terminal
alias path='echo -e ${PATH//:/\\n}'             # Exibe cada entrada do PATH em uma linha separada
alias h="history | grep"                        # Busca no histórico de comandos (ex: h docker)
alias cls="clear"                               # Limpa o terminal
alias please="sudo"                             # Atalho amigável para sudo
alias week="date +%V"                           # Exibe o número da semana atual

# --- Navegação & Filesystem ---
alias ..="cd .."                                # Sobe um nível de diretório
alias ...="cd ../.."                            # Sobe dois níveis de diretório
alias ....="cd ../../.."                        # Sobe três níveis de diretório
alias ll="ls -lhA --color=auto"                 # Lista arquivos com detalhes, tamanho legível e cores
alias la="ls -A --color=auto"                   # Lista todos os arquivos incluindo ocultos
alias lsd="ls -d */ 2>/dev/null"                # Lista apenas diretórios
alias md="mkdir -p"                             # Cria diretório e subdiretórios automaticamente
alias rmf="rm -rf"                              # Remove arquivos e diretórios recursivamente sem confirmação
alias du1="du -h --max-depth=1"                 # Uso de disco do diretório atual, um nível de profundidade

# --- Tmux ---
alias t="tmux"                                  # Atalho para o tmux
alias tn="tmux new -s"                          # Cria nova sessão tmux (ex: tn meu-projeto)
alias ta="tmux attach -t"                       # Reconecta a uma sessão existente (ex: ta meu-projeto)
alias tl="tmux ls"                              # Lista todas as sessões tmux ativas
alias tk="tmux kill-session -t"                 # Encerra uma sessão tmux (ex: tk meu-projeto)
alias tka="tmux kill-server"                    # Encerra todas as sessões tmux
alias td="tmux detach"                          # Desconecta da sessão sem encerrá-la
alias tw="tmux new-window"                      # Cria nova janela na sessão atual
alias ts="tmux split-window -v"                 # Divide painel horizontalmente (novo painel abaixo)
alias tsh="tmux split-window -h"                # Divide painel verticalmente (novo painel à direita)
alias trename="tmux rename-session"             # Renomeia a sessão atual (ex: trename novo-nome)
alias twrename="tmux rename-window"             # Renomeia a janela atual (ex: twrename editor)
alias treload="tmux source ~/.tmux.conf"        # Recarrega as configurações do tmux
alias tconfig="nano ~/.tmux.conf"               # Edita o arquivo de configuração do tmux

# --- Git ---
alias gs="git status"                           # Exibe o estado atual do repositório
alias ga="git add"                              # Adiciona arquivos ao stage (ex: ga arquivo.txt)
alias gaa="git add ."                           # Adiciona todos os arquivos modificados ao stage
alias gc="git commit"                           # Abre o editor para escrever a mensagem do commit
alias gcm="git commit -m"                       # Commit com mensagem inline (ex: gcm 'fix: typo')
alias gco="git checkout"                        # Troca de branch ou restaura arquivos
alias gcb="git checkout -b"                     # Cria e troca para uma nova branch
alias gp="git push"                             # Envia commits para o repositório remoto
alias gpl="git pull"                            # Baixa e integra mudanças do repositório remoto
alias gf="git fetch"                            # Busca atualizações do remoto sem aplicar
alias gfa="git fetch --all --prune"             # Busca de todos os remotos e remove branches deletadas
alias gm="git merge"                            # Faz merge de uma branch (ex: gm feature/x)
alias grb="git rebase"                          # Reaplica commits sobre outra base (ex: grb main)
alias gcp="git cherry-pick"                     # Aplica commit específico na branch atual (ex: gcp abc123)
alias gl="git log --oneline --graph --decorate" # Log compacto com grafo de branches
alias glamelog='git log --pretty=format:"%h %ad %s" --date=short' # Log compacto com datas
alias gd="git diff"                             # Exibe diferenças não staged
alias gds="git diff --staged"                   # Exibe diferenças já em stage
alias gb="git branch"                           # Lista branches locais
alias gba="git branch -a"                       # Lista todas as branches incluindo remotas
alias gbd="git branch -d"                       # Remove uma branch local (ex: gbd feature/x)
alias gtag="git tag"                            # Cria ou lista tags (ex: gtag v1.0.0)
alias gclone="git clone"                        # Clona um repositório (ex: gclone https://...)
alias gst="git stash"                           # Salva mudanças temporariamente no stash
alias gstp="git stash pop"                      # Restaura as últimas mudanças do stash
alias grh="git reset HEAD~1"                    # Desfaz o último commit mantendo as alterações
alias gundo="git restore ."                     # Descarta todas as alterações não staged
alias gwip='git add -A && git commit -m "WIP"' # Salva trabalho em progresso rapidamente

# --- GitHub CLI ---
alias ghpr="gh pr create"                       # Abre wizard para criar um Pull Request
alias ghprl="gh pr list"                        # Lista Pull Requests abertos
alias ghprv="gh pr view"                        # Exibe detalhes do PR atual
alias ghprc="gh pr checkout"                    # Faz checkout de um PR por número (ex: ghprc 42)
alias ghprs="gh pr status"                      # Status dos PRs relacionados ao branch atual
alias ghrl="gh repo list"                       # Lista repositórios do usuário autenticado
alias ghrc="gh repo clone"                      # Clona um repositório (ex: ghrc owner/repo)
alias ghiss="gh issue list"                     # Lista issues abertas do repositório
alias ghissn="gh issue create"                  # Abre wizard para criar uma nova issue
alias ghrun="gh run list"                       # Lista execuções de CI/CD do GitHub Actions
alias ghrunw="gh run watch"                     # Acompanha a execução do workflow em tempo real
alias ghwf="gh workflow list"                   # Lista workflows do GitHub Actions
alias ghwfr="gh workflow run"                   # Dispara um workflow manualmente (ex: ghwfr deploy.yml)
alias ghrel="gh release list"                   # Lista releases do repositório
alias ghrelc="gh release create"                # Cria uma nova release (ex: ghrelc v1.0.0)

# --- SSH ---
alias ssha="ssh-add"                            # Adiciona chave SSH ao agente (ex: ssha ~/.ssh/id_ed25519)
alias sshal="ssh-add -l"                        # Lista chaves carregadas no agente SSH
alias sshkeys="ls -la ~/.ssh/"                  # Lista todos os arquivos de chaves SSH
alias sshconfig="nano ~/.ssh/config"            # Edita o arquivo de configuração do SSH
alias keygen="ssh-keygen -t ed25519 -C"         # Gera nova chave SSH Ed25519 (ex: keygen 'email@x.com')

# --- Docker ---
alias d="docker"                                # Atalho para o comando docker
alias dc="docker compose"                       # Atalho para o docker compose
alias dps="docker ps"                           # Lista containers em execução
alias dpsa="docker ps -a"                       # Lista todos os containers incluindo parados
alias dimg="docker images"                      # Lista imagens Docker disponíveis localmente
alias dlog="docker logs -f"                     # Segue os logs de um container (ex: dlog meu-container)
alias dex="docker exec -it"                     # Executa comando interativo em container (ex: dex app bash)
alias dstart="docker start"                     # Inicia um container parado
alias dstop="docker stop"                       # Para um container em execução
alias drm="docker rm"                           # Remove um container (ex: drm meu-container)
alias drmi="docker rmi"                         # Remove uma imagem (ex: drmi minha-imagem)
alias dpull="docker pull"                       # Baixa imagem do registry (ex: dpull nginx:alpine)
alias dbuild="docker build -t"                  # Constrói imagem com tag (ex: dbuild app:latest .)
alias dstats="docker stats"                     # Monitora CPU/memória dos containers em tempo real
alias dins="docker inspect"                     # Inspeciona detalhes de container ou imagem (ex: dins app)
alias dip="docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}'" # IP do container (ex: dip app)
alias dnet="docker network ls"                  # Lista redes Docker disponíveis
alias dvol="docker volume ls"                   # Lista volumes Docker criados
alias dprune="docker system prune -af --volumes" # Remove todos os recursos Docker não utilizados
alias dcup="docker compose up -d"               # Sobe os serviços em background
alias dcdown="docker compose down"              # Para e remove os containers do compose
alias dcstop="docker compose stop"              # Para os serviços sem remover containers
alias dcrestart="docker compose restart"        # Reinicia todos os serviços do compose
alias dcps="docker compose ps"                  # Lista os serviços do compose e seus estados
alias dclog="docker compose logs -f"            # Segue os logs de todos os serviços do compose
alias dclogs="docker compose logs --tail=100"   # Exibe as últimas 100 linhas dos logs do compose
alias dcbuild="docker compose build --no-cache" # Reconstrói as imagens sem cache
alias dcpull="docker compose pull"              # Atualiza imagens dos serviços do compose
alias dcexec="docker compose exec"              # Executa comando em serviço (ex: dcexec app bash)

# --- Portainer ---
alias portainer-restart="docker compose -f ~/.setupvibe/portainer-compose.yml restart"
alias portainer-update="docker compose -f ~/.setupvibe/portainer-compose.yml pull && docker compose -f ~/.setupvibe/portainer-compose.yml up -d"
alias portainer-start="docker compose -f ~/.setupvibe/portainer-compose.yml up -d"
alias portainer-stop="docker compose -f ~/.setupvibe/portainer-compose.yml stop"

# --- PM2 ---
alias p="pm2"                                        # Atalho para o pm2
alias p-start="pm2 start ~/ecosystem.config.js"      # Inicia apps via ecosystem file
alias p-stop="pm2 stop ~/ecosystem.config.js"       # Para apps via ecosystem file
alias p-restart="pm2 restart ~/ecosystem.config.js" # Reinicia apps via ecosystem file
alias pl="pm2 list"                                  # Lista todos os processos
alias psave="pm2 save"                               # Salva a lista de processos atual
alias pres="pm2 resurrect"                           # Restaura a lista de processos salva
alias pmon="pm2 monit"                               # Monitora CPU/memória em tempo real
alias plog="pm2 logs"                                # Segue os logs de todos os processos
alias pstop="pm2 stop"                               # Para um processo (ex: pstop 0)
alias prestart="pm2 restart"                         # Reinicia um processo
alias pdel="pm2 delete"                              # Remove um processo da lista

# --- Agentlytics ---
alias agl-start="pm2 start agentlytics"              # Inicia o Agentlytics
alias agl-stop="pm2 stop agentlytics"                # Para o Agentlytics
alias agl-restart="pm2 restart agentlytics"          # Reinicia o Agentlytics
alias agl-logs="pm2 logs agentlytics"                # Segue os logs do Agentlytics
alias agl-show="pm2 show agentlytics"                # Mostra detalhes do Agentlytics

# --- Monitoring ---
alias update="sudo apt update && sudo apt upgrade && (command -v brew >/dev/null 2>&1 && brew update && brew upgrade || true)" # Atualiza APT e Homebrew
alias apti="sudo apt install"                   # Instala um pacote via APT (ex: apti htop)
alias aptr="sudo apt remove"                    # Remove um pacote via APT
alias apts="apt search"                         # Busca pacotes nos repositórios APT
alias aptshow="apt show"                        # Exibe detalhes de um pacote APT
alias aptls="dpkg -l | grep"                    # Filtra pacotes instalados (ex: aptls nginx)

# --- Node / JavaScript ---
alias ni="npm install"                          # Instala todas as dependências do package.json
alias nid="npm install --save-dev"              # Instala pacote como dependência de desenvolvimento
alias nr="npm run"                              # Executa script do package.json (ex: nr build)
alias nrd="npm run dev"                         # Inicia o servidor de desenvolvimento
alias nrb="npm run build"                       # Executa o build de produção
alias nrt="npm run test"                        # Executa os testes
alias nx="npx"                                  # Executa pacote Node sem instalar globalmente
alias bi="bun install"                          # Instala dependências com Bun
alias br="bun run"                              # Executa script com Bun (ex: br dev)
alias brd="bun run dev"                         # Inicia o dev server com Bun
alias brb="bun run build"                       # Build de produção com Bun
alias bx="bunx"                                 # Executa pacote sem instalar, via Bun

# --- Ansible ---
alias anp="ansible-playbook"                    # Executa um playbook (ex: anp site.yml -i hosts)
alias ani="ansible-inventory --list"            # Exibe o inventário em formato JSON
alias anping="ansible all -m ping"              # Testa conectividade com todos os hosts
alias anv="ansible-vault"                       # Gerencia arquivos criptografados com Vault
alias anve="ansible-vault encrypt"              # Criptografa um arquivo com Vault
alias anvd="ansible-vault decrypt"              # Descriptografa um arquivo com Vault
alias anvr="ansible-vault rekey"                # Recriptografa com nova senha
alias ancheck="ansible-playbook --check"        # Simula execução do playbook sem aplicar mudanças
alias andiff="ansible-playbook --check --diff"  # Simula e exibe diff das mudanças que seriam aplicadas
alias anfacts="ansible all -m setup"            # Coleta facts de todos os hosts do inventário

# --- Sistema & Monitoramento ---
alias psg="ps aux | grep"                       # Busca processos por nome (ex: psg nginx)
alias df="df -h"                                # Uso de disco com tamanhos legíveis
alias meminfo="free -h"                         # Exibe uso de memória RAM e swap
alias diskinfo="df -h"                          # Exibe uso de disco de todas as partições
alias cpuinfo="lscpu"                           # Exibe informações detalhadas sobre a CPU
alias sysinfo="hostnamectl"                     # Exibe informações do sistema operacional e hostname
alias topc="top -bn1 | head -20"               # Snapshot dos processos com maior uso de recursos

# --- Serviços (systemd) ---
alias sstatus="sudo systemctl status"           # Exibe o status de um serviço (ex: sstatus nginx)
alias sstart="sudo systemctl start"             # Inicia um serviço (ex: sstart nginx)
alias sstop="sudo systemctl stop"               # Para um serviço (ex: sstop nginx)
alias srestart="sudo systemctl restart"         # Reinicia um serviço (ex: srestart nginx)
alias senable="sudo systemctl enable"           # Habilita um serviço para iniciar no boot
alias sdisable="sudo systemctl disable"         # Desabilita um serviço no boot
alias slogs="sudo journalctl -u"                # Exibe logs de um serviço específico (ex: slogs nginx)
alias syslog="sudo journalctl -f"               # Segue o log do sistema em tempo real

# --- Rede ---
alias myip="curl -s ifconfig.me"                # Exibe o IP público da máquina
alias localip="hostname -I | awk '{print \$1}'" # Exibe o IP local principal da máquina
alias ports="ss -tulnp"                         # Lista todas as portas TCP/UDP em escuta
alias wholistening="ss -tulnp"                  # Alias alternativo para listar portas em escuta
alias flush="sudo systemd-resolve --flush-caches" # Limpa o cache de DNS do systemd

# --- cURL / HTTP ---
alias get="curl -s"                             # GET request simples (ex: get https://api.exemplo.com)
alias post="curl -s -X POST -H 'Content-Type: application/json'" # POST JSON (ex: post url -d '{}')
alias headers="curl -sI"                        # Exibe apenas os headers HTTP da resposta
alias httpcode="curl -o /dev/null -s -w '%{http_code}\n'" # Exibe somente o código HTTP da resposta
alias timing="curl -o /dev/null -s -w 'dns:%{time_namelookup}s connect:%{time_connect}s total:%{time_total}s\n'" # Latência detalhada

# --- JSON ---
alias jpp="python3 -m json.tool"                # Formata e valida JSON (ex: cat data.json | jpp)
alias jsonf="jq ."                              # Formata JSON com cores via jq (ex: cat data.json | jsonf)

# --- Segurança & Certs ---
alias certinfo="openssl x509 -text -noout -in"  # Exibe detalhes de um certificado .pem (ex: certinfo cert.pem)
alias certexpiry="openssl x509 -enddate -noout -in" # Exibe a data de expiração de um certificado
alias sslcheck="openssl s_client -connect"      # Inspeciona TLS de um host (ex: sslcheck host:443)
alias genpass="openssl rand -base64 32"         # Gera uma senha aleatória segura de 32 bytes

# --- Ambiente ---
alias envls="env | sort"                        # Lista todas as variáveis de ambiente ordenadas
alias envg="env | grep"                         # Filtra variáveis de ambiente (ex: envg PATH)
alias dotenv="export \$(cat .env | grep -v '^#' | xargs)" # Carrega variáveis do arquivo .env atual
