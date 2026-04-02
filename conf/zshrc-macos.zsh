# 1. PATH CONFIGURATION (Must come first!)
# Homebrew
if [[ -f "/opt/homebrew/bin/brew" ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
elif [[ -f "/usr/local/bin/brew" ]]; then
    eval "$(/usr/local/bin/brew shellenv)"
fi

# Define PATHs before loading plugins so they can find the tools
export PATH="$HOME/.local/bin:$PATH"
export PATH="$HOME/.cargo/bin:$PATH"
export PATH="$HOME/.config/composer/vendor/bin:$PATH"
export PATH="$HOME/.composer/vendor/bin:$PATH"
export GOPATH=$HOME/go
export PATH=$PATH:$GOPATH/bin
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"


# 2. INIT TOOLS (Env Setup)
[ -f "$HOME/.cargo/env" ] && source "$HOME/.cargo/env"
if command -v rbenv >/dev/null; then eval "$(rbenv init -)"; fi


# 3. OH-MY-ZSH CONFIG
export ZSH="$HOME/.oh-my-zsh"
ZSH_THEME="" # Disabled because Starship handles it

# Plugins
plugins=(git rsync cp extract zoxide fzf zsh-autosuggestions zsh-syntax-highlighting brew gh ansible docker docker-compose laravel composer rails ruby python pip node npm bun golang rust macos)

source $ZSH/oh-my-zsh.sh


# 4. STARSHIP & ZOXIDE
if command -v zoxide >/dev/null; then eval "$(zoxide init zsh)"; fi
if command -v starship >/dev/null; then eval "$(starship init zsh)"; fi


# 5. ALIASES

# --- SetupVibe ---
alias setupvibe="curl -sSL desktop.setupvibe.dev | bash"                      # Reinstala ou atualiza o SetupVibe Desktop

# --- AI CLIs ---
alias ge="gemini --approval-mode=yolo"                                        # Gemini CLI sem confirmações
alias cc="claude --permission-mode=auto --dangerously-skip-permissions"        # Claude CLI sem confirmações
alias gsdn="gsd new"                                                          # Inicia um novo projeto/task com GSD
alias gsds="gsd status"                                                       # Mostra o status do milestone atual
alias gsdm="gsd map"                                                          # Mapeia o contexto do projeto
alias gsdi="gsd init"                                                         # Inicializa o GSD no projeto

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
alias ll="ls -lhA"                              # Lista arquivos com detalhes e tamanho legível
alias la="ls -A"                                # Lista todos os arquivos incluindo ocultos
alias lsd="ls -d */ 2>/dev/null"                # Lista apenas diretórios
alias md="mkdir -p"                             # Cria diretório e subdiretórios automaticamente
alias rmf="rm -rf"                              # Remove arquivos e diretórios recursivamente sem confirmação
alias du1="du -h -d 1"                          # Uso de disco do diretório atual, um nível de profundidade

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
alias ghgist="gh gist create"                   # Cria um Gist a partir de arquivo (ex: ghgist file.sh)
alias ghssh="gh ssh-key list"                   # Lista chaves SSH cadastradas na conta GitHub

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

# --- Homebrew ---
alias update="brew update && brew upgrade"      # Atualiza o Homebrew e todos os pacotes instalados
alias brewup="brew update && brew upgrade && brew cleanup" # Atualiza e remove versões antigas
alias brewls="brew list"                        # Lista todos os pacotes instalados via Homebrew
alias brewinfo="brew info"                      # Exibe informações sobre um pacote (ex: brewinfo git)
alias brewsearch="brew search"                  # Busca pacotes no Homebrew (ex: brewsearch ripgrep)

# --- Laravel / PHP ---
alias art="php artisan"                         # Atalho para o PHP Artisan
alias artm="php artisan migrate"                # Executa as migrations pendentes
alias artmf="php artisan migrate:fresh"         # Recria todas as tabelas do zero
alias artmfs="php artisan migrate:fresh --seed" # Recria as tabelas e popula com seeders
alias arts="php artisan serve"                  # Inicia o servidor de desenvolvimento do Laravel
alias artq="php artisan queue:work"             # Inicia o worker de filas
alias artc="php artisan cache:clear && php artisan config:clear && php artisan route:clear && php artisan view:clear" # Limpa todos os caches do Laravel
alias artt="php artisan test"                   # Executa a suíte de testes do Laravel
alias artmake="php artisan make"                # Atalho para geração de código (ex: artmake:controller)
alias artr="php artisan route:list"             # Lista todas as rotas da aplicação
alias arttink="php artisan tinker"              # Abre o REPL interativo do Laravel
alias artkey="php artisan key:generate"         # Gera uma nova chave de aplicação
alias artopt="php artisan optimize:clear"       # Limpa todos os caches e otimizações
alias artschedule="php artisan schedule:work"   # Inicia o worker de tarefas agendadas
alias artdb="php artisan db"                    # Abre conexão interativa com o banco de dados
alias artmodel="php artisan make:model"         # Cria um Model (ex: artmodel Post -m)
alias artjob="php artisan make:job"             # Cria um Job para filas (ex: artjob ProcessPayment)
alias artevent="php artisan event:list"         # Lista todos os eventos e listeners registrados
alias ci="composer install"                     # Instala dependências do composer.json
alias cu="composer update"                      # Atualiza dependências para versões permitidas
alias creq="composer require"                   # Adiciona um pacote (ex: creq vendor/pacote)
alias creqd="composer require --dev"            # Adiciona pacote como dev-dependency
alias cdump="composer dump-autoload"            # Regenera o autoload do Composer
alias crun="composer run"                       # Executa um script do composer.json

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
alias pn="pnpm"                                 # Atalho para o pnpm
alias pni="pnpm install"                        # Instala dependências com pnpm
alias pnr="pnpm run"                            # Executa script do package.json via pnpm (ex: pnr build)
alias pnd="pnpm run dev"                        # Inicia o dev server com pnpm
alias pnb="pnpm run build"                      # Build de produção com pnpm
alias pnt="pnpm run test"                       # Executa os testes com pnpm
alias pnx="pnpm dlx"                            # Executa pacote sem instalar via pnpm (ex: pnx create-next-app)
alias pnadd="pnpm add"                          # Adiciona dependência com pnpm (ex: pnadd axios)
alias pnaddd="pnpm add -D"                      # Adiciona dev-dependency com pnpm

# --- Python / uv ---
alias py="python3"                              # Atalho para Python 3
alias pyv="python3 --version"                   # Exibe a versão ativa do Python
alias uvi="uv pip install"                      # Instala pacote Python com uv (ex: uvi requests)
alias uvs="uv run"                              # Executa script com uv (ex: uvs main.py)
alias venv="python3 -m venv .venv && source .venv/bin/activate" # Cria e ativa virtualenv local
alias activate="source .venv/bin/activate"      # Ativa o virtualenv local do diretório

# --- Ruby / rbenv ---
alias rbv="rbenv versions"                      # Lista versões do Ruby instaladas via rbenv
alias rblocal="rbenv local"                     # Define versão do Ruby para o diretório atual
alias rbglobal="rbenv global"                   # Define a versão global do Ruby
alias be="bundle exec"                          # Executa comando no contexto do Bundler
alias binstall="bundle install"                 # Instala gems do Gemfile
alias bupdate="bundle update"                   # Atualiza gems do Gemfile

# --- Rust / Cargo ---
alias cb="cargo build"                          # Compila o projeto Rust em modo debug
alias cbr="cargo build --release"               # Compila em modo release otimizado
alias crun2="cargo run"                         # Compila e executa o projeto Rust
alias ct="cargo test"                           # Executa os testes do projeto
alias ccheck="cargo check"                      # Verifica erros sem gerar o binário
alias clippy="cargo clippy"                     # Executa o linter do Rust
alias cfmt="cargo fmt"                          # Formata o código com rustfmt
alias cadd="cargo add"                          # Adiciona dependência ao projeto Rust (ex: cadd serde)
alias crem="cargo remove"                       # Remove dependência do projeto Rust
alias cupdate="cargo update"                    # Atualiza todas as dependências do Cargo.lock
alias cdoc="cargo doc --open"                   # Gera e abre a documentação do projeto no browser

# --- Go ---
alias gobuild="go build ./..."                  # Compila todos os pacotes do projeto Go
alias gorun="go run ."                          # Executa o pacote principal
alias gotest="go test ./..."                    # Executa todos os testes do projeto
alias gomod="go mod tidy"                       # Remove dependências não utilizadas do go.mod
alias govet="go vet ./..."                      # Verifica problemas comuns no código Go
alias gofmt="gofmt -w ."                        # Formata todos os arquivos Go do diretório
alias goget="go get"                            # Adiciona dependência ao projeto Go (ex: goget pkg@v1)
alias goclean="go clean -cache"                 # Remove o cache de build do Go
alias gocover="go test ./... -coverprofile=coverage.out && go tool cover -html=coverage.out" # Cobertura HTML
alias gowork="go work"                          # Gerencia workspaces Go (ex: gowork use ./pkg)

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

# --- Cron & Scheduling ---
alias cronb="cronboard"                         # Abre o dashboard TUI do Cronboard para gerenciar crontab
alias cronl="crontab -l"                        # Lista as tarefas cron do usuário atual
alias crone="crontab -e"                        # Edita as tarefas cron do usuário atual
alias cronr="crontab -r"                        # Remove todas as tarefas cron do usuário atual (CUIDADO)

# --- Sistema (macOS) ---
alias topc="top -o cpu"                         # Monitora processos ordenados por uso de CPU
alias topm="top -o mem"                         # Monitora processos ordenados por uso de memória
alias psg="ps aux | grep"                       # Busca processos por nome (ex: psg nginx)
alias df="df -h"                                # Uso de disco com tamanhos legíveis
alias flush="dscacheutil -flushcache && sudo killall -HUP mDNSResponder" # Limpa o cache de DNS

# --- Rede (macOS) ---
alias myip="curl -s ifconfig.me"                # Exibe o IP público da máquina
alias localip="ipconfig getifaddr en0"          # Exibe o IP local da interface Wi-Fi
alias ports="lsof -iTCP -sTCP:LISTEN -n -P"    # Lista todas as portas TCP em escuta

# --- cURL / HTTP ---
alias get="curl -s"                             # GET request simples (ex: get https://api.exemplo.com)
alias post="curl -s -X POST -H 'Content-Type: application/json'" # POST JSON (ex: post url -d '{}')
alias headers="curl -sI"                        # Exibe apenas os headers HTTP da resposta
alias httpcode="curl -o /dev/null -s -w '%{http_code}\n'" # Exibe somente o código HTTP da resposta
alias timing="curl -o /dev/null -s -w 'dns:%{time_namelookup}s connect:%{time_connect}s total:%{time_total}s\n'" # Latência detalhada

# --- JSON / YAML ---
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
