# SetupVibe aliases. Managed by SetupVibe: this file is replaced on update.
# Put your own aliases in ~/.zshrc.local (or ~/.bashrc.local on Omarchy).
# An alias you already defined before this file is kept: each line only defines
# the alias when it does not exist yet.

# --- Skills CLI ---
alias skl >/dev/null 2>&1 || alias skl="skills list"                         # Lista todas as skills instaladas
alias skf >/dev/null 2>&1 || alias skf="skills find"                         # Busca skills no registro (ex: skf react)
alias ska >/dev/null 2>&1 || alias ska="skills add"                          # Instala uma nova skill (ex: ska owner/repo)
alias sku >/dev/null 2>&1 || alias sku="skills update"                       # Atualiza todas as skills instaladas
alias skun >/dev/null 2>&1 || alias skun="skills remove"                      # Remove uma skill instalada (ex: skun nome)
alias skc >/dev/null 2>&1 || alias skc="skills check"                        # Verifica atualizações disponíveis

# --- Spec-Kit (Spec-Driven Development) ---
alias sp >/dev/null 2>&1 || alias sp="specify"                              # Atalho principal do Spec-Kit
alias spinit >/dev/null 2>&1 || alias spinit="specify init"                     # Inicializa projeto SDD (ex: spinit meu-app)
alias spcheck >/dev/null 2>&1 || alias spcheck="specify check"                   # Verifica se todas as dependências estão instaladas
alias sphere >/dev/null 2>&1 || alias sphere="specify init --here"              # Inicializa SDD no diretório atual
alias spci >/dev/null 2>&1 || alias spci="specify init --here --ai claude"    # Inicia projeto SDD com Claude no diretório atual
alias spkpi >/dev/null 2>&1 || alias spkpi="specify init --here --ai copilot"  # Inicia projeto SDD com Copilot no diretório atual
alias spup >/dev/null 2>&1 || alias spup="uv tool upgrade specify-cli"        # Atualiza o Spec-Kit para a versão mais recente

# --- Shell ---
alias zconfig >/dev/null 2>&1 || alias zconfig="nano ~/.zshrc"                   # Edita o arquivo de configuração do ZSH
alias reload >/dev/null 2>&1 || alias reload="source ~/.zshrc"                  # Recarrega as configurações do ZSH e as personalizadas locais sem reiniciar o terminal
alias path >/dev/null 2>&1 || alias path='echo -e ${PATH//:/\\n}'                      # Exibe cada entrada do PATH em uma linha separada
alias h >/dev/null 2>&1 || alias h="history | grep"                        # Busca no histórico de comandos (ex: h docker)
alias cls >/dev/null 2>&1 || alias cls="clear"                               # Limpa o terminal
alias please >/dev/null 2>&1 || alias please="sudo"                             # Atalho amigável para sudo
alias week >/dev/null 2>&1 || alias week="date +%V"                           # Exibe o número da semana atual

# --- Navegação & Filesystem ---
alias .. >/dev/null 2>&1 || alias ..="cd .."                                # Sobe um nível de diretório
alias ... >/dev/null 2>&1 || alias ...="cd ../.."                            # Sobe dois níveis de diretório
alias .... >/dev/null 2>&1 || alias ....="cd ../../.."                        # Sobe três níveis de diretório
alias ll >/dev/null 2>&1 || alias ll="ls -lhA --color=auto"                 # Lista arquivos com detalhes, tamanho legível e cores
alias la >/dev/null 2>&1 || alias la="ls -A --color=auto"                   # Lista todos os arquivos incluindo ocultos
alias lsd >/dev/null 2>&1 || alias lsd="ls -d */ 2>/dev/null"                # Lista apenas diretórios
alias md >/dev/null 2>&1 || alias md="mkdir -p"                             # Cria diretório e subdiretórios automaticamente
alias rmf >/dev/null 2>&1 || alias rmf="rm -rf"                              # Remove arquivos e diretórios recursivamente sem confirmação
alias du1 >/dev/null 2>&1 || alias du1="du -h --max-depth=1"                 # Uso de disco do diretório atual, um nível de profundidade

# --- Tmux ---
alias t >/dev/null 2>&1 || alias t="tmux"                                  # Atalho para o tmux
alias tn >/dev/null 2>&1 || alias tn="tmux new -s"                          # Cria nova sessão tmux (ex: tn meu-projeto)
alias ta >/dev/null 2>&1 || alias ta="tmux attach -t"                       # Reconecta a uma sessão existente (ex: ta meu-projeto)
alias tl >/dev/null 2>&1 || alias tl="tmux ls"                              # Lista todas as sessões tmux ativas
alias tk >/dev/null 2>&1 || alias tk="tmux kill-session -t"                 # Encerra uma sessão tmux (ex: tk meu-projeto)
alias tka >/dev/null 2>&1 || alias tka="tmux kill-server"                    # Encerra todas as sessões tmux
alias td >/dev/null 2>&1 || alias td="tmux detach"                          # Desconecta da sessão sem encerrá-la
alias tw >/dev/null 2>&1 || alias tw="tmux new-window"                      # Cria nova janela na sessão atual
alias ts >/dev/null 2>&1 || alias ts="tmux split-window -v"                 # Divide painel horizontalmente (novo painel abaixo)
alias tsh >/dev/null 2>&1 || alias tsh="tmux split-window -h"                # Divide painel verticalmente (novo painel à direita)
alias trename >/dev/null 2>&1 || alias trename="tmux rename-session"             # Renomeia a sessão atual (ex: trename novo-nome)
alias twrename >/dev/null 2>&1 || alias twrename="tmux rename-window"             # Renomeia a janela atual (ex: twrename editor)
alias treload >/dev/null 2>&1 || alias treload="tmux source ~/.tmux.conf"        # Recarrega as configurações do tmux
alias tconfig >/dev/null 2>&1 || alias tconfig="nano ~/.tmux.conf"               # Edita o arquivo de configuração do tmux

# --- Git ---
alias gs >/dev/null 2>&1 || alias gs="git status"                           # Exibe o estado atual do repositório
alias ga >/dev/null 2>&1 || alias ga="git add"                              # Adiciona arquivos ao stage (ex: ga arquivo.txt)
alias gaa >/dev/null 2>&1 || alias gaa="git add ."                           # Adiciona todos os arquivos modificados ao stage
alias gc >/dev/null 2>&1 || alias gc="git commit"                           # Abre o editor para escrever a mensagem do commit
alias gcm >/dev/null 2>&1 || alias gcm="git commit -m"                       # Commit com mensagem inline (ex: gcm 'fix: typo')
alias gco >/dev/null 2>&1 || alias gco="git checkout"                        # Troca de branch ou restaura arquivos
alias gcb >/dev/null 2>&1 || alias gcb="git checkout -b"                     # Cria e troca para uma nova branch
alias gp >/dev/null 2>&1 || alias gp="git push"                             # Envia commits para o repositório remoto
alias gpl >/dev/null 2>&1 || alias gpl="git pull"                            # Baixa e integra mudanças do repositório remoto
alias gf >/dev/null 2>&1 || alias gf="git fetch"                            # Busca atualizações do remoto sem aplicar
alias gfa >/dev/null 2>&1 || alias gfa="git fetch --all --prune"             # Busca de todos os remotos e remove branches deletadas
alias gm >/dev/null 2>&1 || alias gm="git merge"                            # Faz merge de uma branch (ex: gm feature/x)
alias grb >/dev/null 2>&1 || alias grb="git rebase"                          # Reaplica commits sobre outra base (ex: grb main)
alias gcp >/dev/null 2>&1 || alias gcp="git cherry-pick"                     # Aplica commit específico na branch atual (ex: gcp abc123)
alias gl >/dev/null 2>&1 || alias gl="git log --oneline --graph --decorate" # Log compacto com grafo de branches
alias glamelog >/dev/null 2>&1 || alias glamelog='git log --pretty=format:"%h %ad %s" --date=short' # Log compacto com datas
alias gd >/dev/null 2>&1 || alias gd="git diff"                             # Exibe diferenças não staged
alias gds >/dev/null 2>&1 || alias gds="git diff --staged"                   # Exibe diferenças já em stage
alias gb >/dev/null 2>&1 || alias gb="git branch"                           # Lista branches locais
alias gba >/dev/null 2>&1 || alias gba="git branch -a"                       # Lista todas as branches incluindo remotas
alias gbd >/dev/null 2>&1 || alias gbd="git branch -d"                       # Remove uma branch local (ex: gbd feature/x)
alias gtag >/dev/null 2>&1 || alias gtag="git tag"                            # Cria ou lista tags (ex: gtag v1.0.0)
alias gclone >/dev/null 2>&1 || alias gclone="git clone"                        # Clona um repositório (ex: gclone https://...)
alias gst >/dev/null 2>&1 || alias gst="git stash"                           # Salva mudanças temporariamente no stash
alias gstp >/dev/null 2>&1 || alias gstp="git stash pop"                      # Restaura as últimas mudanças do stash
alias grh >/dev/null 2>&1 || alias grh="git reset HEAD~1"                    # Desfaz o último commit mantendo as alterações
alias gundo >/dev/null 2>&1 || alias gundo="git restore ."                     # Descarta todas as alterações não staged
alias gwip >/dev/null 2>&1 || alias gwip='git add -A && git commit -m "WIP"' # Salva trabalho em progresso rapidamente

# --- GitHub CLI ---
alias ghpr >/dev/null 2>&1 || alias ghpr="gh pr create"                       # Abre wizard para criar um Pull Request
alias ghprl >/dev/null 2>&1 || alias ghprl="gh pr list"                        # Lista Pull Requests abertos
alias ghprv >/dev/null 2>&1 || alias ghprv="gh pr view"                        # Exibe detalhes do PR atual
alias ghprc >/dev/null 2>&1 || alias ghprc="gh pr checkout"                    # Faz checkout de um PR por número (ex: ghprc 42)
alias ghprs >/dev/null 2>&1 || alias ghprs="gh pr status"                      # Status dos PRs relacionados ao branch atual
alias ghrl >/dev/null 2>&1 || alias ghrl="gh repo list"                       # Lista repositórios do usuário autenticado
alias ghrc >/dev/null 2>&1 || alias ghrc="gh repo clone"                      # Clona um repositório (ex: ghrc owner/repo)
alias ghiss >/dev/null 2>&1 || alias ghiss="gh issue list"                     # Lista issues abertas do repositório
alias ghissn >/dev/null 2>&1 || alias ghissn="gh issue create"                  # Abre wizard para criar uma nova issue
alias ghrun >/dev/null 2>&1 || alias ghrun="gh run list"                       # Lista execuções de CI/CD do GitHub Actions
alias ghrunw >/dev/null 2>&1 || alias ghrunw="gh run watch"                     # Acompanha a execução do workflow em tempo real
alias ghwf >/dev/null 2>&1 || alias ghwf="gh workflow list"                   # Lista workflows do GitHub Actions
alias ghwfr >/dev/null 2>&1 || alias ghwfr="gh workflow run"                   # Dispara um workflow manualmente (ex: ghwfr deploy.yml)
alias ghrel >/dev/null 2>&1 || alias ghrel="gh release list"                   # Lista releases do repositório
alias ghrelc >/dev/null 2>&1 || alias ghrelc="gh release create"                # Cria uma nova release (ex: ghrelc v1.0.0)
alias ghgist >/dev/null 2>&1 || alias ghgist="gh gist create"                   # Cria um Gist a partir de arquivo (ex: ghgist file.sh)

# --- SSH ---
alias ssha >/dev/null 2>&1 || alias ssha="ssh-add"                            # Adiciona chave SSH ao agente (ex: ssha ~/.ssh/id_ed25519)
alias sshal >/dev/null 2>&1 || alias sshal="ssh-add -l"                        # Lista chaves carregadas no agente SSH
alias sshkeys >/dev/null 2>&1 || alias sshkeys="ls -la ~/.ssh/"                  # Lista todos os arquivos de chaves SSH
alias sshconfig >/dev/null 2>&1 || alias sshconfig="nano ~/.ssh/config"            # Edita o arquivo de configuração do SSH
alias keygen >/dev/null 2>&1 || alias keygen="ssh-keygen -t ed25519 -C"         # Gera nova chave SSH Ed25519 (ex: keygen 'email@x.com')
alias ssh_copy_id >/dev/null 2>&1 || alias ssh_copy_id="setupvibe ssh copy-id" # Copia a chave SSH pública para um servidor remoto com senha

# --- Docker ---
alias d >/dev/null 2>&1 || alias d="docker"                                # Atalho para o comando docker
alias dc >/dev/null 2>&1 || alias dc="docker compose"                       # Atalho para o docker compose
alias dps >/dev/null 2>&1 || alias dps="docker ps"                           # Lista containers em execução
alias dpsa >/dev/null 2>&1 || alias dpsa="docker ps -a"                       # Lista todos os containers incluindo parados
alias dimg >/dev/null 2>&1 || alias dimg="docker images"                      # Lista imagens Docker disponíveis localmente
alias dlog >/dev/null 2>&1 || alias dlog="docker logs -f"                     # Segue os logs de um container (ex: dlog meu-container)
alias dex >/dev/null 2>&1 || alias dex="docker exec -it"                     # Executa comando interativo em container (ex: dex app bash)
alias dstart >/dev/null 2>&1 || alias dstart="docker start"                     # Inicia um container parado
alias dstop >/dev/null 2>&1 || alias dstop="docker stop"                       # Para um container em execução
alias drm >/dev/null 2>&1 || alias drm="docker rm"                           # Remove um container (ex: drm meu-container)
alias drmi >/dev/null 2>&1 || alias drmi="docker rmi"                         # Remove uma imagem (ex: drmi minha-imagem)
alias dpull >/dev/null 2>&1 || alias dpull="docker pull"                       # Baixa imagem do registry (ex: dpull nginx:alpine)
alias dbuild >/dev/null 2>&1 || alias dbuild="docker build -t"                  # Constrói imagem com tag (ex: dbuild app:latest .)
alias dstats >/dev/null 2>&1 || alias dstats="docker stats"                     # Monitora CPU/memória dos containers em tempo real
alias dins >/dev/null 2>&1 || alias dins="docker inspect"                     # Inspeciona detalhes de container ou imagem (ex: dins app)
alias dip >/dev/null 2>&1 || alias dip="docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}'" # IP do container (ex: dip app)
alias dnet >/dev/null 2>&1 || alias dnet="docker network ls"                  # Lista redes Docker disponíveis
alias dvol >/dev/null 2>&1 || alias dvol="docker volume ls"                   # Lista volumes Docker criados
alias dprune >/dev/null 2>&1 || alias dprune="docker system prune -af --volumes" # Remove todos os recursos Docker não utilizados
alias dcup >/dev/null 2>&1 || alias dcup="docker compose up -d"               # Sobe os serviços em background
alias dcdown >/dev/null 2>&1 || alias dcdown="docker compose down"              # Para e remove os containers do compose
alias dcstop >/dev/null 2>&1 || alias dcstop="docker compose stop"              # Para os serviços sem remover containers
alias dcrestart >/dev/null 2>&1 || alias dcrestart="docker compose restart"        # Reinicia todos os serviços do compose
alias dcps >/dev/null 2>&1 || alias dcps="docker compose ps"                  # Lista os serviços do compose e seus estados
alias dclog >/dev/null 2>&1 || alias dclog="docker compose logs -f"            # Segue os logs de todos os serviços do compose
alias dclogs >/dev/null 2>&1 || alias dclogs="docker compose logs --tail=100"   # Exibe as últimas 100 linhas dos logs do compose
alias dcbuild >/dev/null 2>&1 || alias dcbuild="docker compose build --no-cache" # Reconstrói as imagens sem cache
alias dcpull >/dev/null 2>&1 || alias dcpull="docker compose pull"              # Atualiza imagens dos serviços do compose
alias dcexec >/dev/null 2>&1 || alias dcexec="docker compose exec"              # Executa comando em serviço (ex: dcexec app bash)

# --- Portainer ---
alias portainer-restart >/dev/null 2>&1 || alias portainer-restart="docker compose -f ~/.setupvibe/portainer/compose.yml restart"
alias portainer-update >/dev/null 2>&1 || alias portainer-update="docker compose -f ~/.setupvibe/portainer/compose.yml pull && docker compose -f ~/.setupvibe/portainer/compose.yml up -d"
alias portainer-start >/dev/null 2>&1 || alias portainer-start="docker compose -f ~/.setupvibe/portainer/compose.yml up -d"
alias portainer-stop >/dev/null 2>&1 || alias portainer-stop="docker compose -f ~/.setupvibe/portainer/compose.yml stop"

# --- PM2 ---
alias p >/dev/null 2>&1 || alias p="pm2"                                        # Atalho para o pm2
alias p-start >/dev/null 2>&1 || alias p-start="pm2 start ~/ecosystem.config.js"      # Inicia apps via ecosystem file
alias p-stop >/dev/null 2>&1 || alias p-stop="pm2 stop ~/ecosystem.config.js"       # Para apps via ecosystem file
alias p-restart >/dev/null 2>&1 || alias p-restart="pm2 restart ~/ecosystem.config.js" # Reinicia apps via ecosystem file
alias pl >/dev/null 2>&1 || alias pl="pm2 list"                                  # Lista todos os processos
alias psave >/dev/null 2>&1 || alias psave="pm2 save"                               # Salva a lista de processos atual
alias pres >/dev/null 2>&1 || alias pres="pm2 resurrect"                           # Restaura a lista de processos salva
alias pmon >/dev/null 2>&1 || alias pmon="pm2 monit"                               # Monitora CPU/memória em tempo real
alias plog >/dev/null 2>&1 || alias plog="pm2 logs"                                # Segue os logs de todos os processos
alias pstop >/dev/null 2>&1 || alias pstop="pm2 stop"                               # Para um processo (ex: pstop 0)
alias prestart >/dev/null 2>&1 || alias prestart="pm2 restart"                         # Reinicia um processo
alias pdel >/dev/null 2>&1 || alias pdel="pm2 delete"                              # Remove um processo da lista

# --- Agentlytics ---
alias agl-start >/dev/null 2>&1 || alias agl-start="pm2 start agentlytics"              # Inicia o Agentlytics
alias agl-stop >/dev/null 2>&1 || alias agl-stop="pm2 stop agentlytics"                # Para o Agentlytics
alias agl-restart >/dev/null 2>&1 || alias agl-restart="pm2 restart agentlytics"          # Reinicia o Agentlytics
alias agl-logs >/dev/null 2>&1 || alias agl-logs="pm2 logs agentlytics"                # Segue os logs do Agentlytics
alias agl-show >/dev/null 2>&1 || alias agl-show="pm2 show agentlytics"                # Mostra detalhes do Agentlytics

# --- PHP / Laravel ---
alias update >/dev/null 2>&1 || alias update="sudo apt update && sudo apt upgrade && (command -v brew >/dev/null 2>&1 && brew update && brew upgrade || true)" # Atualiza APT e Homebrew
alias apti >/dev/null 2>&1 || alias apti="sudo apt install"                   # Instala um pacote via APT (ex: apti htop)
alias aptr >/dev/null 2>&1 || alias aptr="sudo apt remove"                    # Remove um pacote via APT
alias apts >/dev/null 2>&1 || alias apts="apt search"                         # Busca pacotes nos repositórios APT
alias aptshow >/dev/null 2>&1 || alias aptshow="apt show"                        # Exibe detalhes de um pacote APT
alias aptls >/dev/null 2>&1 || alias aptls="dpkg -l | grep"                    # Filtra pacotes instalados (ex: aptls nginx)
alias brewup >/dev/null 2>&1 || alias brewup="brew update && brew upgrade && brew cleanup" # Atualiza Homebrew e remove versões antigas
alias brewls >/dev/null 2>&1 || alias brewls="brew list"                        # Lista todos os pacotes instalados via Homebrew
alias brewinfo >/dev/null 2>&1 || alias brewinfo="brew info"                      # Exibe informações sobre um pacote (ex: brewinfo git)
alias brewsearch >/dev/null 2>&1 || alias brewsearch="brew search"                  # Busca pacotes no Homebrew (ex: brewsearch ripgrep)

# --- Laravel / PHP ---
alias art >/dev/null 2>&1 || alias art="php artisan"                         # Atalho para o PHP Artisan
alias artm >/dev/null 2>&1 || alias artm="php artisan migrate"                # Executa as migrations pendentes
alias artmf >/dev/null 2>&1 || alias artmf="php artisan migrate:fresh"         # Recria todas as tabelas do zero
alias artmfs >/dev/null 2>&1 || alias artmfs="php artisan migrate:fresh --seed" # Recria as tabelas e popula com seeders
alias arts >/dev/null 2>&1 || alias arts="php artisan serve"                  # Inicia o servidor de desenvolvimento do Laravel
alias artq >/dev/null 2>&1 || alias artq="php artisan queue:work"             # Inicia o worker de filas
alias artc >/dev/null 2>&1 || alias artc="php artisan cache:clear && php artisan config:clear && php artisan route:clear && php artisan view:clear" # Limpa todos os caches do Laravel
alias artt >/dev/null 2>&1 || alias artt="php artisan test"                   # Executa a suíte de testes do Laravel
alias artmake >/dev/null 2>&1 || alias artmake="php artisan make"                # Atalho para geração de código (ex: artmake:controller)
alias artr >/dev/null 2>&1 || alias artr="php artisan route:list"             # Lista todas as rotas da aplicação
alias arttink >/dev/null 2>&1 || alias arttink="php artisan tinker"              # Abre o REPL interativo do Laravel
alias artkey >/dev/null 2>&1 || alias artkey="php artisan key:generate"         # Gera uma nova chave de aplicação
alias artopt >/dev/null 2>&1 || alias artopt="php artisan optimize:clear"       # Limpa todos os caches e otimizações
alias artschedule >/dev/null 2>&1 || alias artschedule="php artisan schedule:work"   # Inicia o worker de tarefas agendadas
alias artdb >/dev/null 2>&1 || alias artdb="php artisan db"                    # Abre conexão interativa com o banco de dados
alias artmodel >/dev/null 2>&1 || alias artmodel="php artisan make:model"         # Cria um Model (ex: artmodel Post -m)
alias artjob >/dev/null 2>&1 || alias artjob="php artisan make:job"             # Cria um Job para filas (ex: artjob ProcessPayment)
alias artevent >/dev/null 2>&1 || alias artevent="php artisan event:list"         # Lista todos os eventos e listeners registrados
alias ci >/dev/null 2>&1 || alias ci="composer install"                     # Instala dependências do composer.json
alias cu >/dev/null 2>&1 || alias cu="composer update"                      # Atualiza dependências para versões permitidas
alias creq >/dev/null 2>&1 || alias creq="composer require"                   # Adiciona um pacote (ex: creq vendor/pacote)
alias creqd >/dev/null 2>&1 || alias creqd="composer require --dev"            # Adiciona pacote como dev-dependency
alias cdump >/dev/null 2>&1 || alias cdump="composer dump-autoload"            # Regenera o autoload do Composer
alias crun >/dev/null 2>&1 || alias crun="composer run"                       # Executa um script do composer.json

# --- Node / JavaScript ---
alias ni >/dev/null 2>&1 || alias ni="npm install"                          # Instala todas as dependências do package.json
alias nid >/dev/null 2>&1 || alias nid="npm install --save-dev"              # Instala pacote como dependência de desenvolvimento
alias nr >/dev/null 2>&1 || alias nr="npm run"                              # Executa script do package.json (ex: nr build)
alias nrd >/dev/null 2>&1 || alias nrd="npm run dev"                         # Inicia o servidor de desenvolvimento
alias nrb >/dev/null 2>&1 || alias nrb="npm run build"                       # Executa o build de produção
alias nrt >/dev/null 2>&1 || alias nrt="npm run test"                        # Executa os testes
alias nx >/dev/null 2>&1 || alias nx="npx"                                  # Executa pacote Node sem instalar globalmente
alias bi >/dev/null 2>&1 || alias bi="bun install"                          # Instala dependências com Bun
alias br >/dev/null 2>&1 || alias br="bun run"                              # Executa script com Bun (ex: br dev)
alias brd >/dev/null 2>&1 || alias brd="bun run dev"                         # Inicia o dev server com Bun
alias brb >/dev/null 2>&1 || alias brb="bun run build"                       # Build de produção com Bun
alias bx >/dev/null 2>&1 || alias bx="bunx"                                 # Executa pacote sem instalar, via Bun
alias pn >/dev/null 2>&1 || alias pn="pnpm"                                 # Atalho para o pnpm
alias pni >/dev/null 2>&1 || alias pni="pnpm install"                        # Instala dependências com pnpm
alias pnr >/dev/null 2>&1 || alias pnr="pnpm run"                            # Executa script do package.json via pnpm (ex: pnr build)
alias pnd >/dev/null 2>&1 || alias pnd="pnpm run dev"                        # Inicia o dev server com pnpm
alias pnb >/dev/null 2>&1 || alias pnb="pnpm run build"                      # Build de produção com pnpm
alias pnt >/dev/null 2>&1 || alias pnt="pnpm run test"                       # Executa os testes com pnpm
alias pnx >/dev/null 2>&1 || alias pnx="pnpm dlx"                            # Executa pacote sem instalar via pnpm (ex: pnx create-next-app)
alias pnadd >/dev/null 2>&1 || alias pnadd="pnpm add"                          # Adiciona dependência com pnpm (ex: pnadd axios)
alias pnaddd >/dev/null 2>&1 || alias pnaddd="pnpm add -D"                      # Adiciona dev-dependency com pnpm

# --- Python / uv ---
alias py >/dev/null 2>&1 || alias py="python3"                              # Atalho para Python 3
alias pyv >/dev/null 2>&1 || alias pyv="python3 --version"                   # Exibe a versão ativa do Python
alias uvi >/dev/null 2>&1 || alias uvi="uv pip install"                      # Instala pacote Python com uv (ex: uvi requests)
alias uvs >/dev/null 2>&1 || alias uvs="uv run"                              # Executa script com uv (ex: uvs main.py)
alias venv >/dev/null 2>&1 || alias venv="python3 -m venv .venv && source .venv/bin/activate" # Cria e ativa virtualenv local
alias activate >/dev/null 2>&1 || alias activate="source .venv/bin/activate"      # Ativa o virtualenv local do diretório

# --- Ruby / rbenv ---
alias rbv >/dev/null 2>&1 || alias rbv="rbenv versions"                      # Lista versões do Ruby instaladas via rbenv
alias rblocal >/dev/null 2>&1 || alias rblocal="rbenv local"                     # Define versão do Ruby para o diretório atual
alias rbglobal >/dev/null 2>&1 || alias rbglobal="rbenv global"                   # Define a versão global do Ruby
alias be >/dev/null 2>&1 || alias be="bundle exec"                          # Executa comando no contexto do Bundler
alias binstall >/dev/null 2>&1 || alias binstall="bundle install"                 # Instala gems do Gemfile
alias bupdate >/dev/null 2>&1 || alias bupdate="bundle update"                   # Atualiza gems do Gemfile

# --- Rust / Cargo ---
alias cb >/dev/null 2>&1 || alias cb="cargo build"                          # Compila o projeto Rust em modo debug
alias cbr >/dev/null 2>&1 || alias cbr="cargo build --release"               # Compila em modo release otimizado
alias crun2 >/dev/null 2>&1 || alias crun2="cargo run"                         # Compila e executa o projeto Rust
alias ct >/dev/null 2>&1 || alias ct="cargo test"                           # Executa os testes do projeto
alias ccheck >/dev/null 2>&1 || alias ccheck="cargo check"                      # Verifica erros sem gerar o binário
alias clippy >/dev/null 2>&1 || alias clippy="cargo clippy"                     # Executa o linter do Rust
alias cfmt >/dev/null 2>&1 || alias cfmt="cargo fmt"                          # Formata o código com rustfmt
alias cadd >/dev/null 2>&1 || alias cadd="cargo add"                          # Adiciona dependência ao projeto Rust (ex: cadd serde)
alias crem >/dev/null 2>&1 || alias crem="cargo remove"                       # Remove dependência do projeto Rust
alias cupdate >/dev/null 2>&1 || alias cupdate="cargo update"                    # Atualiza todas as dependências do Cargo.lock
alias cdoc >/dev/null 2>&1 || alias cdoc="cargo doc --open"                   # Gera e abre a documentação do projeto no browser

# --- Go ---
alias gobuild >/dev/null 2>&1 || alias gobuild="go build ./..."                  # Compila todos os pacotes do projeto Go
alias gorun >/dev/null 2>&1 || alias gorun="go run ."                          # Executa o pacote principal
alias gotest >/dev/null 2>&1 || alias gotest="go test ./..."                    # Executa todos os testes do projeto
alias gomod >/dev/null 2>&1 || alias gomod="go mod tidy"                       # Remove dependências não utilizadas do go.mod
alias govet >/dev/null 2>&1 || alias govet="go vet ./..."                      # Verifica problemas comuns no código Go
alias gofmt >/dev/null 2>&1 || alias gofmt="gofmt -w ."                        # Formata todos os arquivos Go do diretório
alias goget >/dev/null 2>&1 || alias goget="go get"                            # Adiciona dependência ao projeto Go (ex: goget pkg@v1)
alias goclean >/dev/null 2>&1 || alias goclean="go clean -cache"                 # Remove o cache de build do Go
alias gocover >/dev/null 2>&1 || alias gocover="go test ./... -coverprofile=coverage.out && go tool cover -html=coverage.out" # Cobertura HTML
alias gowork >/dev/null 2>&1 || alias gowork="go work"                          # Gerencia workspaces Go (ex: gowork use ./pkg)

# --- Ansible ---
alias anp >/dev/null 2>&1 || alias anp="ansible-playbook"                    # Executa um playbook (ex: anp site.yml -i hosts)
alias ani >/dev/null 2>&1 || alias ani="ansible-inventory --list"            # Exibe o inventário em formato JSON
alias anping >/dev/null 2>&1 || alias anping="ansible all -m ping"              # Testa conectividade com todos os hosts
alias anv >/dev/null 2>&1 || alias anv="ansible-vault"                       # Gerencia arquivos criptografados com Vault
alias anve >/dev/null 2>&1 || alias anve="ansible-vault encrypt"              # Criptografa um arquivo com Vault
alias anvd >/dev/null 2>&1 || alias anvd="ansible-vault decrypt"              # Descriptografa um arquivo com Vault
alias anvr >/dev/null 2>&1 || alias anvr="ansible-vault rekey"                # Recriptografa com nova senha
alias ancheck >/dev/null 2>&1 || alias ancheck="ansible-playbook --check"        # Simula execução do playbook sem aplicar mudanças
alias andiff >/dev/null 2>&1 || alias andiff="ansible-playbook --check --diff"  # Simula e exibe diff das mudanças que seriam aplicadas
alias anfacts >/dev/null 2>&1 || alias anfacts="ansible all -m setup"            # Coleta facts de todos os hosts do inventário

# --- Cron & Scheduling ---
alias cronb >/dev/null 2>&1 || alias cronb="cronboard"                         # Abre o dashboard TUI do Cronboard para gerenciar crontab
alias cronl >/dev/null 2>&1 || alias cronl="crontab -l"                        # Lista as tarefas cron do usuário atual
alias crone >/dev/null 2>&1 || alias crone="crontab -e"                        # Edita as tarefas cron do usuário atual
alias cronr >/dev/null 2>&1 || alias cronr="crontab -r"                        # Remove todas as tarefas cron do usuário atual (CUIDADO)

# --- Network ---
alias psg >/dev/null 2>&1 || alias psg="ps aux | grep"                       # Busca processos por nome (ex: psg nginx)
alias df >/dev/null 2>&1 || alias df="df -h"                                # Uso de disco com tamanhos legíveis
alias meminfo >/dev/null 2>&1 || alias meminfo="free -h"                         # Exibe uso de memória RAM e swap
alias diskinfo >/dev/null 2>&1 || alias diskinfo="df -h"                          # Exibe uso de disco de todas as partições
alias cpuinfo >/dev/null 2>&1 || alias cpuinfo="lscpu"                           # Exibe informações detalhadas sobre a CPU
alias sysinfo >/dev/null 2>&1 || alias sysinfo="hostnamectl"                     # Exibe informações do sistema operacional e hostname
alias topc >/dev/null 2>&1 || alias topc="top -bn1 | head -20"               # Snapshot dos processos com maior uso de recursos

# --- Serviços (systemd) ---
alias sstatus >/dev/null 2>&1 || alias sstatus="sudo systemctl status"           # Exibe o status de um serviço (ex: sstatus nginx)
alias sstart >/dev/null 2>&1 || alias sstart="sudo systemctl start"             # Inicia um serviço (ex: sstart nginx)
alias sstop >/dev/null 2>&1 || alias sstop="sudo systemctl stop"               # Para um serviço (ex: sstop nginx)
alias srestart >/dev/null 2>&1 || alias srestart="sudo systemctl restart"         # Reinicia um serviço (ex: srestart nginx)
alias senable >/dev/null 2>&1 || alias senable="sudo systemctl enable"           # Habilita um serviço para iniciar no boot
alias sdisable >/dev/null 2>&1 || alias sdisable="sudo systemctl disable"         # Desabilita um serviço no boot
alias slogs >/dev/null 2>&1 || alias slogs="sudo journalctl -u"                # Exibe logs de um serviço específico (ex: slogs nginx)
alias syslog >/dev/null 2>&1 || alias syslog="sudo journalctl -f"               # Segue o log do sistema em tempo real

# --- Rede (Linux) ---
alias myip >/dev/null 2>&1 || alias myip="curl -s ifconfig.me"                # Exibe o IP público da máquina
alias localip >/dev/null 2>&1 || alias localip="hostname -I | awk '{print \$1}'" # Exibe o IP local principal da máquina
alias ports >/dev/null 2>&1 || alias ports="ss -tulnp"                         # Lista todas as portas TCP/UDP em escuta
alias wholistening >/dev/null 2>&1 || alias wholistening="ss -tulnp"                  # Alias alternativo para listar portas em escuta
alias flush >/dev/null 2>&1 || alias flush="sudo systemd-resolve --flush-caches" # Limpa o cache de DNS do systemd

# --- cURL / HTTP ---
alias get >/dev/null 2>&1 || alias get="curl -s"                             # GET request simples (ex: get https://api.exemplo.com)
alias post >/dev/null 2>&1 || alias post="curl -s -X POST -H 'Content-Type: application/json'" # POST JSON (ex: post url -d '{}')
alias headers >/dev/null 2>&1 || alias headers="curl -sI"                        # Exibe apenas os headers HTTP da resposta
alias httpcode >/dev/null 2>&1 || alias httpcode="curl -o /dev/null -s -w '%{http_code}\n'" # Exibe somente o código HTTP da resposta
alias timing >/dev/null 2>&1 || alias timing="curl -o /dev/null -s -w 'dns:%{time_namelookup}s connect:%{time_connect}s total:%{time_total}s\n'" # Latência detalhada

# --- JSON / YAML ---
alias jpp >/dev/null 2>&1 || alias jpp="python3 -m json.tool"                # Formata e valida JSON (ex: cat data.json | jpp)
alias jsonf >/dev/null 2>&1 || alias jsonf="jq ."                              # Formata JSON com cores via jq (ex: cat data.json | jsonf)

# --- Segurança & Certs ---
alias certinfo >/dev/null 2>&1 || alias certinfo="openssl x509 -text -noout -in"  # Exibe detalhes de um certificado .pem (ex: certinfo cert.pem)
alias certexpiry >/dev/null 2>&1 || alias certexpiry="openssl x509 -enddate -noout -in" # Exibe a data de expiração de um certificado
alias sslcheck >/dev/null 2>&1 || alias sslcheck="openssl s_client -connect"      # Inspeciona TLS de um host (ex: sslcheck host:443)
alias genpass >/dev/null 2>&1 || alias genpass="openssl rand -base64 32"         # Gera uma senha aleatória segura de 32 bytes

# --- Ambiente ---
alias envls >/dev/null 2>&1 || alias envls="env | sort"                        # Lista todas as variáveis de ambiente ordenadas
alias envg >/dev/null 2>&1 || alias envg="env | grep"                         # Filtra variáveis de ambiente (ex: envg PATH)
alias dotenv >/dev/null 2>&1 || alias dotenv="export \$(cat .env | grep -v '^#' | xargs)" # Carrega variáveis do arquivo .env atual

# --- Configurações Personalizadas ---
alias zlocal >/dev/null 2>&1 || alias zlocal="nano ~/.zshrc.local"              # Edita o arquivo de configurações personalizadas
