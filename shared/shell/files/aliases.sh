# SetupVibe aliases. Managed by SetupVibe: this file is replaced on update.
# Put your own aliases in ~/.zshrc.local (or ~/.bashrc.local on Omarchy).

# _sv_alias defines an alias only when nothing answers to that name yet: no
# alias, no shell function and no installed command. Your own setup always
# wins, and no SetupVibe alias hides a real program (gs was Ghostscript, cc the
# C compiler). The few aliases that wrap their own command on purpose are
# listed in _sv_alias_wraps. setupvibe doctor lists the aliases skipped here.
_sv_alias_wraps=" df "
_sv_alias() {
  alias "$1" >/dev/null 2>&1 && return 0
  typeset -f "$1" >/dev/null 2>&1 && return 0
  case "$_sv_alias_wraps" in *" $1 "*) ;; *) command -v "$1" >/dev/null 2>&1 && return 0 ;; esac
  alias "$1=$2"
}

# --- Skills CLI ---
_sv_alias skl "skills list"                         # Lista todas as skills instaladas
_sv_alias skf "skills find"                         # Busca skills no registro (ex: skf react)
_sv_alias ska "skills add"                          # Instala uma nova skill (ex: ska owner/repo)
_sv_alias sku "skills update"                       # Atualiza todas as skills instaladas
_sv_alias skun "skills remove"                      # Remove uma skill instalada (ex: skun nome)
_sv_alias skc "skills check"                        # Verifica atualizações disponíveis

# --- Spec-Kit (Spec-Driven Development) ---
_sv_alias sp "specify"                              # Atalho principal do Spec-Kit
_sv_alias spinit "specify init"                     # Inicializa projeto SDD (ex: spinit meu-app)
_sv_alias spcheck "specify check"                   # Verifica se todas as dependências estão instaladas
_sv_alias sphere "specify init --here"              # Inicializa SDD no diretório atual
_sv_alias spci "specify init --here --ai claude"    # Inicia projeto SDD com Claude no diretório atual
_sv_alias spkpi "specify init --here --ai copilot"  # Inicia projeto SDD com Copilot no diretório atual
_sv_alias spup "uv tool upgrade specify-cli"        # Atualiza o Spec-Kit para a versão mais recente

# --- Shell ---
_sv_alias zconfig "nano ~/.zshrc"                   # Edita o arquivo de configuração do ZSH
_sv_alias reload "source ~/.zshrc"                  # Recarrega as configurações do ZSH e as personalizadas locais sem reiniciar o terminal
_sv_alias path 'echo -e ${PATH//:/\\n}'                      # Exibe cada entrada do PATH em uma linha separada
_sv_alias h "history | grep"                        # Busca no histórico de comandos (ex: h docker)
_sv_alias cls "clear"                               # Limpa o terminal
_sv_alias please "sudo"                             # Atalho amigável para sudo
_sv_alias week "date +%V"                           # Exibe o número da semana atual

# --- Navegação & Filesystem ---
_sv_alias .. "cd .."                                # Sobe um nível de diretório
_sv_alias ... "cd ../.."                            # Sobe dois níveis de diretório
_sv_alias .... "cd ../../.."                        # Sobe três níveis de diretório
_sv_alias ll "ls -lhA --color=auto"                 # Lista arquivos com detalhes, tamanho legível e cores
_sv_alias la "ls -A --color=auto"                   # Lista todos os arquivos incluindo ocultos
_sv_alias lsd "ls -d */ 2>/dev/null"                # Lista apenas diretórios
_sv_alias md "mkdir -p"                             # Cria diretório e subdiretórios automaticamente
_sv_alias rmf "rm -rf"                              # Remove arquivos e diretórios recursivamente sem confirmação
_sv_alias du1 "du -h --max-depth=1"                 # Uso de disco do diretório atual, um nível de profundidade

# --- Tmux ---
_sv_alias t "tmux"                                  # Atalho para o tmux
_sv_alias tn "tmux new -s"                          # Cria nova sessão tmux (ex: tn meu-projeto)
_sv_alias ta "tmux attach -t"                       # Reconecta a uma sessão existente (ex: ta meu-projeto)
_sv_alias tl "tmux ls"                              # Lista todas as sessões tmux ativas
_sv_alias tk "tmux kill-session -t"                 # Encerra uma sessão tmux (ex: tk meu-projeto)
_sv_alias tka "tmux kill-server"                    # Encerra todas as sessões tmux
_sv_alias td "tmux detach"                          # Desconecta da sessão sem encerrá-la
_sv_alias tw "tmux new-window"                      # Cria nova janela na sessão atual
_sv_alias tsv "tmux split-window -v"                 # Divide painel horizontalmente (novo painel abaixo)
_sv_alias tsh "tmux split-window -h"                # Divide painel verticalmente (novo painel à direita)
_sv_alias trename "tmux rename-session"             # Renomeia a sessão atual (ex: trename novo-nome)
_sv_alias twrename "tmux rename-window"             # Renomeia a janela atual (ex: twrename editor)
_sv_alias treload "tmux source ~/.tmux.conf"        # Recarrega as configurações do tmux
_sv_alias tconfig "nano ~/.tmux.conf"               # Edita o arquivo de configuração do tmux

# --- Git ---
_sv_alias gstat "git status"                           # Exibe o estado atual do repositório
_sv_alias ga "git add"                              # Adiciona arquivos ao stage (ex: ga arquivo.txt)
_sv_alias gaa "git add ."                           # Adiciona todos os arquivos modificados ao stage
_sv_alias gc "git commit"                           # Abre o editor para escrever a mensagem do commit
_sv_alias gcm "git commit -m"                       # Commit com mensagem inline (ex: gcm 'fix: typo')
_sv_alias gco "git checkout"                        # Troca de branch ou restaura arquivos
_sv_alias gcb "git checkout -b"                     # Cria e troca para uma nova branch
_sv_alias gp "git push"                             # Envia commits para o repositório remoto
_sv_alias gpl "git pull"                            # Baixa e integra mudanças do repositório remoto
_sv_alias gf "git fetch"                            # Busca atualizações do remoto sem aplicar
_sv_alias gfa "git fetch --all --prune"             # Busca de todos os remotos e remove branches deletadas
_sv_alias gm "git merge"                            # Faz merge de uma branch (ex: gm feature/x)
_sv_alias grb "git rebase"                          # Reaplica commits sobre outra base (ex: grb main)
_sv_alias gcp "git cherry-pick"                     # Aplica commit específico na branch atual (ex: gcp abc123)
_sv_alias gl "git log --oneline --graph --decorate" # Log compacto com grafo de branches
_sv_alias glamelog 'git log --pretty=format:"%h %ad %s" --date=short' # Log compacto com datas
_sv_alias gd "git diff"                             # Exibe diferenças não staged
_sv_alias gds "git diff --staged"                   # Exibe diferenças já em stage
_sv_alias gb "git branch"                           # Lista branches locais
_sv_alias gba "git branch -a"                       # Lista todas as branches incluindo remotas
_sv_alias gbd "git branch -d"                       # Remove uma branch local (ex: gbd feature/x)
_sv_alias gtag "git tag"                            # Cria ou lista tags (ex: gtag v1.0.0)
_sv_alias gclone "git clone"                        # Clona um repositório (ex: gclone https://...)
_sv_alias gst "git stash"                           # Salva mudanças temporariamente no stash
_sv_alias gstp "git stash pop"                      # Restaura as últimas mudanças do stash
_sv_alias grh "git reset HEAD~1"                    # Desfaz o último commit mantendo as alterações
_sv_alias gundo "git restore ."                     # Descarta todas as alterações não staged
_sv_alias gwip 'git add -A && git commit -m "WIP"' # Salva trabalho em progresso rapidamente

# --- GitHub CLI ---
_sv_alias ghpr "gh pr create"                       # Abre wizard para criar um Pull Request
_sv_alias ghprl "gh pr list"                        # Lista Pull Requests abertos
_sv_alias ghprv "gh pr view"                        # Exibe detalhes do PR atual
_sv_alias ghprc "gh pr checkout"                    # Faz checkout de um PR por número (ex: ghprc 42)
_sv_alias ghprs "gh pr status"                      # Status dos PRs relacionados ao branch atual
_sv_alias ghrl "gh repo list"                       # Lista repositórios do usuário autenticado
_sv_alias ghrc "gh repo clone"                      # Clona um repositório (ex: ghrc owner/repo)
_sv_alias ghiss "gh issue list"                     # Lista issues abertas do repositório
_sv_alias ghissn "gh issue create"                  # Abre wizard para criar uma nova issue
_sv_alias ghrun "gh run list"                       # Lista execuções de CI/CD do GitHub Actions
_sv_alias ghrunw "gh run watch"                     # Acompanha a execução do workflow em tempo real
_sv_alias ghwf "gh workflow list"                   # Lista workflows do GitHub Actions
_sv_alias ghwfr "gh workflow run"                   # Dispara um workflow manualmente (ex: ghwfr deploy.yml)
_sv_alias ghrel "gh release list"                   # Lista releases do repositório
_sv_alias ghrelc "gh release create"                # Cria uma nova release (ex: ghrelc v1.0.0)
_sv_alias ghgist "gh gist create"                   # Cria um Gist a partir de arquivo (ex: ghgist file.sh)

# --- SSH ---
_sv_alias ssha "ssh-add"                            # Adiciona chave SSH ao agente (ex: ssha ~/.ssh/id_ed25519)
_sv_alias sshal "ssh-add -l"                        # Lista chaves carregadas no agente SSH
_sv_alias sshkeys "ls -la ~/.ssh/"                  # Lista todos os arquivos de chaves SSH
_sv_alias sshconfig "nano ~/.ssh/config"            # Edita o arquivo de configuração do SSH
_sv_alias keygen "ssh-keygen -t ed25519 -C"         # Gera nova chave SSH Ed25519 (ex: keygen 'email@x.com')
_sv_alias ssh_copy_id "setupvibe ssh copy-id" # Copia a chave SSH pública para um servidor remoto com senha

# --- Docker ---
_sv_alias d "docker"                                # Atalho para o comando docker
_sv_alias dco "docker compose"                       # Atalho para o docker compose
_sv_alias dps "docker ps"                           # Lista containers em execução
_sv_alias dpsa "docker ps -a"                       # Lista todos os containers incluindo parados
_sv_alias dimg "docker images"                      # Lista imagens Docker disponíveis localmente
_sv_alias dlog "docker logs -f"                     # Segue os logs de um container (ex: dlog meu-container)
_sv_alias dex "docker exec -it"                     # Executa comando interativo em container (ex: dex app bash)
_sv_alias dstart "docker start"                     # Inicia um container parado
_sv_alias dstop "docker stop"                       # Para um container em execução
_sv_alias drm "docker rm"                           # Remove um container (ex: drm meu-container)
_sv_alias drmi "docker rmi"                         # Remove uma imagem (ex: drmi minha-imagem)
_sv_alias dpull "docker pull"                       # Baixa imagem do registry (ex: dpull nginx:alpine)
_sv_alias dbuild "docker build -t"                  # Constrói imagem com tag (ex: dbuild app:latest .)
_sv_alias dstats "docker stats"                     # Monitora CPU/memória dos containers em tempo real
_sv_alias dins "docker inspect"                     # Inspeciona detalhes de container ou imagem (ex: dins app)
_sv_alias dip "docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}'" # IP do container (ex: dip app)
_sv_alias dnet "docker network ls"                  # Lista redes Docker disponíveis
_sv_alias dvol "docker volume ls"                   # Lista volumes Docker criados
_sv_alias dprune "docker system prune -af --volumes" # Remove todos os recursos Docker não utilizados
_sv_alias dcup "docker compose up -d"               # Sobe os serviços em background
_sv_alias dcdown "docker compose down"              # Para e remove os containers do compose
_sv_alias dcstop "docker compose stop"              # Para os serviços sem remover containers
_sv_alias dcrestart "docker compose restart"        # Reinicia todos os serviços do compose
_sv_alias dcps "docker compose ps"                  # Lista os serviços do compose e seus estados
_sv_alias dclog "docker compose logs -f"            # Segue os logs de todos os serviços do compose
_sv_alias dclogs "docker compose logs --tail=100"   # Exibe as últimas 100 linhas dos logs do compose
_sv_alias dcbuild "docker compose build --no-cache" # Reconstrói as imagens sem cache
_sv_alias dcpull "docker compose pull"              # Atualiza imagens dos serviços do compose
_sv_alias dcexec "docker compose exec"              # Executa comando em serviço (ex: dcexec app bash)

# --- Portainer ---
_sv_alias portainer-restart "docker compose -f ~/.setupvibe/portainer/compose.yml restart"
_sv_alias portainer-update "docker compose -f ~/.setupvibe/portainer/compose.yml pull && docker compose -f ~/.setupvibe/portainer/compose.yml up -d"
_sv_alias portainer-start "docker compose -f ~/.setupvibe/portainer/compose.yml up -d"
_sv_alias portainer-stop "docker compose -f ~/.setupvibe/portainer/compose.yml stop"

# --- PM2 ---
_sv_alias p "pm2"                                        # Atalho para o pm2
_sv_alias p-start "pm2 start ~/ecosystem.config.js"      # Inicia apps via ecosystem file
_sv_alias p-stop "pm2 stop ~/ecosystem.config.js"       # Para apps via ecosystem file
_sv_alias p-restart "pm2 restart ~/ecosystem.config.js" # Reinicia apps via ecosystem file
_sv_alias pl "pm2 list"                                  # Lista todos os processos
_sv_alias psave "pm2 save"                               # Salva a lista de processos atual
_sv_alias pres "pm2 resurrect"                           # Restaura a lista de processos salva
_sv_alias pmon "pm2 monit"                               # Monitora CPU/memória em tempo real
_sv_alias plog "pm2 logs"                                # Segue os logs de todos os processos
_sv_alias pstop "pm2 stop"                               # Para um processo (ex: pstop 0)
_sv_alias prestart "pm2 restart"                         # Reinicia um processo
_sv_alias pdel "pm2 delete"                              # Remove um processo da lista

# --- Agentlytics ---
_sv_alias agl-start "pm2 start agentlytics"              # Inicia o Agentlytics
_sv_alias agl-stop "pm2 stop agentlytics"                # Para o Agentlytics
_sv_alias agl-restart "pm2 restart agentlytics"          # Reinicia o Agentlytics
_sv_alias agl-logs "pm2 logs agentlytics"                # Segue os logs do Agentlytics
_sv_alias agl-show "pm2 show agentlytics"                # Mostra detalhes do Agentlytics

# --- PHP / Laravel ---
_sv_alias update "sudo apt update && sudo apt upgrade && (command -v brew >/dev/null 2>&1 && brew update && brew upgrade || true)" # Atualiza APT e Homebrew
_sv_alias apti "sudo apt install"                   # Instala um pacote via APT (ex: apti htop)
_sv_alias aptr "sudo apt remove"                    # Remove um pacote via APT
_sv_alias apts "apt search"                         # Busca pacotes nos repositórios APT
_sv_alias aptshow "apt show"                        # Exibe detalhes de um pacote APT
_sv_alias aptls "dpkg -l | grep"                    # Filtra pacotes instalados (ex: aptls nginx)
_sv_alias brewup "brew update && brew upgrade && brew cleanup" # Atualiza Homebrew e remove versões antigas
_sv_alias brewls "brew list"                        # Lista todos os pacotes instalados via Homebrew
_sv_alias brewinfo "brew info"                      # Exibe informações sobre um pacote (ex: brewinfo git)
_sv_alias brewsearch "brew search"                  # Busca pacotes no Homebrew (ex: brewsearch ripgrep)

# --- Laravel / PHP ---
_sv_alias art "php artisan"                         # Atalho para o PHP Artisan
_sv_alias artm "php artisan migrate"                # Executa as migrations pendentes
_sv_alias artmf "php artisan migrate:fresh"         # Recria todas as tabelas do zero
_sv_alias artmfs "php artisan migrate:fresh --seed" # Recria as tabelas e popula com seeders
_sv_alias arts "php artisan serve"                  # Inicia o servidor de desenvolvimento do Laravel
_sv_alias artq "php artisan queue:work"             # Inicia o worker de filas
_sv_alias artc "php artisan cache:clear && php artisan config:clear && php artisan route:clear && php artisan view:clear" # Limpa todos os caches do Laravel
_sv_alias artt "php artisan test"                   # Executa a suíte de testes do Laravel
_sv_alias artmake "php artisan make"                # Atalho para geração de código (ex: artmake:controller)
_sv_alias artr "php artisan route:list"             # Lista todas as rotas da aplicação
_sv_alias arttink "php artisan tinker"              # Abre o REPL interativo do Laravel
_sv_alias artkey "php artisan key:generate"         # Gera uma nova chave de aplicação
_sv_alias artopt "php artisan optimize:clear"       # Limpa todos os caches e otimizações
_sv_alias artschedule "php artisan schedule:work"   # Inicia o worker de tarefas agendadas
_sv_alias artdb "php artisan db"                    # Abre conexão interativa com o banco de dados
_sv_alias artmodel "php artisan make:model"         # Cria um Model (ex: artmodel Post -m)
_sv_alias artjob "php artisan make:job"             # Cria um Job para filas (ex: artjob ProcessPayment)
_sv_alias artevent "php artisan event:list"         # Lista todos os eventos e listeners registrados
_sv_alias cin "composer install"                     # Instala dependências do composer.json
_sv_alias cu "composer update"                      # Atualiza dependências para versões permitidas
_sv_alias creq "composer require"                   # Adiciona um pacote (ex: creq vendor/pacote)
_sv_alias creqd "composer require --dev"            # Adiciona pacote como dev-dependency
_sv_alias cdump "composer dump-autoload"            # Regenera o autoload do Composer
_sv_alias crun "composer run"                       # Executa um script do composer.json

# --- Node / JavaScript ---
_sv_alias ni "npm install"                          # Instala todas as dependências do package.json
_sv_alias nid "npm install --save-dev"              # Instala pacote como dependência de desenvolvimento
_sv_alias nr "npm run"                              # Executa script do package.json (ex: nr build)
_sv_alias nrd "npm run dev"                         # Inicia o servidor de desenvolvimento
_sv_alias nrb "npm run build"                       # Executa o build de produção
_sv_alias nrt "npm run test"                        # Executa os testes
_sv_alias nx "npx"                                  # Executa pacote Node sem instalar globalmente
_sv_alias bi "bun install"                          # Instala dependências com Bun
_sv_alias br "bun run"                              # Executa script com Bun (ex: br dev)
_sv_alias brd "bun run dev"                         # Inicia o dev server com Bun
_sv_alias brb "bun run build"                       # Build de produção com Bun
_sv_alias bx "bunx"                                 # Executa pacote sem instalar, via Bun
_sv_alias pn "pnpm"                                 # Atalho para o pnpm
_sv_alias pni "pnpm install"                        # Instala dependências com pnpm
_sv_alias pnr "pnpm run"                            # Executa script do package.json via pnpm (ex: pnr build)
_sv_alias pnd "pnpm run dev"                        # Inicia o dev server com pnpm
_sv_alias pnb "pnpm run build"                      # Build de produção com pnpm
_sv_alias pnt "pnpm run test"                       # Executa os testes com pnpm
_sv_alias pnx "pnpm dlx"                            # Executa pacote sem instalar via pnpm (ex: pnx create-next-app)
_sv_alias pnadd "pnpm add"                          # Adiciona dependência com pnpm (ex: pnadd axios)
_sv_alias pnaddd "pnpm add -D"                      # Adiciona dev-dependency com pnpm

# --- Python / uv ---
_sv_alias py "python3"                              # Atalho para Python 3
_sv_alias pyv "python3 --version"                   # Exibe a versão ativa do Python
_sv_alias uvi "uv pip install"                      # Instala pacote Python com uv (ex: uvi requests)
_sv_alias uvs "uv run"                              # Executa script com uv (ex: uvs main.py)
_sv_alias venv "python3 -m venv .venv && source .venv/bin/activate" # Cria e ativa virtualenv local
_sv_alias activate "source .venv/bin/activate"      # Ativa o virtualenv local do diretório

# --- Ruby / rbenv ---
_sv_alias rbv "rbenv versions"                      # Lista versões do Ruby instaladas via rbenv
_sv_alias rblocal "rbenv local"                     # Define versão do Ruby para o diretório atual
_sv_alias rbglobal "rbenv global"                   # Define a versão global do Ruby
_sv_alias be "bundle exec"                          # Executa comando no contexto do Bundler
_sv_alias binstall "bundle install"                 # Instala gems do Gemfile
_sv_alias bupdate "bundle update"                   # Atualiza gems do Gemfile

# --- Rust / Cargo ---
_sv_alias cb "cargo build"                          # Compila o projeto Rust em modo debug
_sv_alias cbr "cargo build --release"               # Compila em modo release otimizado
_sv_alias crun2 "cargo run"                         # Compila e executa o projeto Rust
_sv_alias ct "cargo test"                           # Executa os testes do projeto
_sv_alias ccheck "cargo check"                      # Verifica erros sem gerar o binário
_sv_alias clippy "cargo clippy"                     # Executa o linter do Rust
_sv_alias cfmt "cargo fmt"                          # Formata o código com rustfmt
_sv_alias cadd "cargo add"                          # Adiciona dependência ao projeto Rust (ex: cadd serde)
_sv_alias crem "cargo remove"                       # Remove dependência do projeto Rust
_sv_alias cupdate "cargo update"                    # Atualiza todas as dependências do Cargo.lock
_sv_alias cdoc "cargo doc --open"                   # Gera e abre a documentação do projeto no browser

# --- Go ---
_sv_alias gobuild "go build ./..."                  # Compila todos os pacotes do projeto Go
_sv_alias gorun "go run ."                          # Executa o pacote principal
_sv_alias gotest "go test ./..."                    # Executa todos os testes do projeto
_sv_alias gomod "go mod tidy"                       # Remove dependências não utilizadas do go.mod
_sv_alias govet "go vet ./..."                      # Verifica problemas comuns no código Go
_sv_alias gofmtw "gofmt -w ."                        # Formata todos os arquivos Go do diretório
_sv_alias goget "go get"                            # Adiciona dependência ao projeto Go (ex: goget pkg@v1)
_sv_alias goclean "go clean -cache"                 # Remove o cache de build do Go
_sv_alias gocover "go test ./... -coverprofile=coverage.out && go tool cover -html=coverage.out" # Cobertura HTML
_sv_alias gowork "go work"                          # Gerencia workspaces Go (ex: gowork use ./pkg)

# --- Ansible ---
_sv_alias anp "ansible-playbook"                    # Executa um playbook (ex: anp site.yml -i hosts)
_sv_alias ani "ansible-inventory --list"            # Exibe o inventário em formato JSON
_sv_alias anping "ansible all -m ping"              # Testa conectividade com todos os hosts
_sv_alias anv "ansible-vault"                       # Gerencia arquivos criptografados com Vault
_sv_alias anve "ansible-vault encrypt"              # Criptografa um arquivo com Vault
_sv_alias anvd "ansible-vault decrypt"              # Descriptografa um arquivo com Vault
_sv_alias anvr "ansible-vault rekey"                # Recriptografa com nova senha
_sv_alias ancheck "ansible-playbook --check"        # Simula execução do playbook sem aplicar mudanças
_sv_alias andiff "ansible-playbook --check --diff"  # Simula e exibe diff das mudanças que seriam aplicadas
_sv_alias anfacts "ansible all -m setup"            # Coleta facts de todos os hosts do inventário

# --- Cron & Scheduling ---
_sv_alias cronb "cronboard"                         # Abre o dashboard TUI do Cronboard para gerenciar crontab
_sv_alias cronl "crontab -l"                        # Lista as tarefas cron do usuário atual
_sv_alias crone "crontab -e"                        # Edita as tarefas cron do usuário atual
_sv_alias cronr "crontab -r"                        # Remove todas as tarefas cron do usuário atual (CUIDADO)

# --- Network ---
_sv_alias psg "ps aux | grep"                       # Busca processos por nome (ex: psg nginx)
_sv_alias df "df -h"                                # Uso de disco com tamanhos legíveis
_sv_alias meminfo "free -h"                         # Exibe uso de memória RAM e swap
_sv_alias diskinfo "df -h"                          # Exibe uso de disco de todas as partições
_sv_alias cpuinfo "lscpu"                           # Exibe informações detalhadas sobre a CPU
_sv_alias sysinfo "hostnamectl"                     # Exibe informações do sistema operacional e hostname
_sv_alias topc "top -bn1 | head -20"               # Snapshot dos processos com maior uso de recursos

# --- Serviços (systemd) ---
_sv_alias sstatus "sudo systemctl status"           # Exibe o status de um serviço (ex: sstatus nginx)
_sv_alias sstart "sudo systemctl start"             # Inicia um serviço (ex: sstart nginx)
_sv_alias sstop "sudo systemctl stop"               # Para um serviço (ex: sstop nginx)
_sv_alias srestart "sudo systemctl restart"         # Reinicia um serviço (ex: srestart nginx)
_sv_alias senable "sudo systemctl enable"           # Habilita um serviço para iniciar no boot
_sv_alias sdisable "sudo systemctl disable"         # Desabilita um serviço no boot
_sv_alias slogs "sudo journalctl -u"                # Exibe logs de um serviço específico (ex: slogs nginx)
_sv_alias syslog "sudo journalctl -f"               # Segue o log do sistema em tempo real

# --- Rede (Linux) ---
_sv_alias myip "curl -s ifconfig.me"                # Exibe o IP público da máquina
_sv_alias localip "hostname -I | awk '{print \$1}'" # Exibe o IP local principal da máquina
_sv_alias ports "ss -tulnp"                         # Lista todas as portas TCP/UDP em escuta
_sv_alias wholistening "ss -tulnp"                  # Alias alternativo para listar portas em escuta
_sv_alias flush "sudo systemd-resolve --flush-caches" # Limpa o cache de DNS do systemd

# --- cURL / HTTP ---
_sv_alias get "curl -s"                             # GET request simples (ex: get https://api.exemplo.com)
_sv_alias post "curl -s -X POST -H 'Content-Type: application/json'" # POST JSON (ex: post url -d '{}')
_sv_alias headers "curl -sI"                        # Exibe apenas os headers HTTP da resposta
_sv_alias httpcode "curl -o /dev/null -s -w '%{http_code}\n'" # Exibe somente o código HTTP da resposta
_sv_alias timing "curl -o /dev/null -s -w 'dns:%{time_namelookup}s connect:%{time_connect}s total:%{time_total}s\n'" # Latência detalhada

# --- JSON / YAML ---
_sv_alias jpp "python3 -m json.tool"                # Formata e valida JSON (ex: cat data.json | jpp)
_sv_alias jsonf "jq ."                              # Formata JSON com cores via jq (ex: cat data.json | jsonf)

# --- Segurança & Certs ---
_sv_alias certinfo "openssl x509 -text -noout -in"  # Exibe detalhes de um certificado .pem (ex: certinfo cert.pem)
_sv_alias certexpiry "openssl x509 -enddate -noout -in" # Exibe a data de expiração de um certificado
_sv_alias sslcheck "openssl s_client -connect"      # Inspeciona TLS de um host (ex: sslcheck host:443)
_sv_alias genpass "openssl rand -base64 32"         # Gera uma senha aleatória segura de 32 bytes

# --- Ambiente ---
_sv_alias envls "env | sort"                        # Lista todas as variáveis de ambiente ordenadas
_sv_alias envg "env | grep"                         # Filtra variáveis de ambiente (ex: envg PATH)
_sv_alias dotenv "export \$(cat .env | grep -v '^#' | xargs)" # Carrega variáveis do arquivo .env atual

# --- Configurações Personalizadas ---
_sv_alias zlocal "nano ~/.zshrc.local"              # Edita o arquivo de configurações personalizadas
unset -f _sv_alias
unset _sv_alias_wraps
