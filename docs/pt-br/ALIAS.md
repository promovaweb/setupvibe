# SetupVibe Aliases

> Aliases do ambiente shell — v0.41.6

Esta é a lista exaustiva de todos os aliases configurados pelo SetupVibe em todas as plataformas.

**Legenda de Disponibilidade:**

- 🖥️ **Desktop**: Disponível na edição Desktop (macOS e Linux Desktop).
- ☁️ **Server**: Disponível na edição Server (Linux).
- 🌐 **Ambos**: Disponível em todas as edições.

---

## SetupVibe

- **`setupvibe`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `curl -sSL desktop.setupvibe.dev | bash` (Desktop) / `curl -sSL server.setupvibe.dev | bash` (Server)
  - Descrição: Reinstala ou atualiza o SetupVibe.
  - Exemplo: `setupvibe`

## AI CLIs

- **`ge`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `gemini --approval-mode=yolo`
  - Descrição: Gemini CLI sem confirmações.
  - Exemplo: `ge`

- **`cc`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `claude --permission-mode=auto --dangerously-skip-permissions`
  - Descrição: Claude CLI sem confirmações.
  - Exemplo: `cc`

## Skills CLI

- **`skl`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `npx skills list`
  - Descrição: Lista todas as skills instaladas.
  - Exemplo: `skl`

- **`skf`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `npx skills find`
  - Descrição: Busca skills no registro.
  - Exemplo: `skf react`

- **`ska`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `npx skills add`
  - Descrição: Instala uma nova skill.
  - Exemplo: `ska owner/repo`

- **`sku`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `npx skills update`
  - Descrição: Atualiza todas as skills instaladas.
  - Exemplo: `sku`

- **`skun`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `npx skills remove`
  - Descrição: Remove uma skill instalada.
  - Exemplo: `skun nome`

- **`skc`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `npx skills check`
  - Descrição: Verifica atualizações disponíveis.
  - Exemplo: `skc`

## Shell & Utilitários

- **`zconfig`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `nano ~/.zshrc`
  - Descrição: Edita o arquivo de configuração do ZSH.
  - Exemplo: `zconfig`

- **`reload`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `source ~/.zshrc`
  - Descrição: Recarrega as configurações do ZSH sem reiniciar o terminal.
  - Exemplo: `reload`

- **`path`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `echo -e ${PATH//:/\\n}`
  - Descrição: Exibe cada entrada do PATH em uma linha separada.
  - Exemplo: `path`

- **`h`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `history | grep`
  - Descrição: Busca no histórico de comandos.
  - Exemplo: `h docker`

- **`cls`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `clear`
  - Descrição: Limpa o terminal.
  - Exemplo: `cls`

- **`please`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `sudo`
  - Descrição: Atalho amigável para sudo.
  - Exemplo: `please apt update`

- **`week`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `date +%V`
  - Descrição: Exibe o número da semana atual.
  - Exemplo: `week`

## Navegação & Filesystem

- **`..`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `cd ..`
  - Descrição: Sobe um nível de diretório.
  - Exemplo: `..`

- **`...`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `cd ../..`
  - Descrição: Sobe dois níveis de diretório.
  - Exemplo: `...`

- **`....`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `cd ../../..`
  - Descrição: Sobe três níveis de diretório.
  - Exemplo: `....`

- **`ll`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `ls -lhA` (macOS) / `ls -lhA --color=auto` (Linux)
  - Descrição: Lista arquivos com detalhes e tamanho legível.
  - Exemplo: `ll`

- **`la`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `ls -A` (macOS) / `ls -A --color=auto` (Linux)
  - Descrição: Lista todos os arquivos incluindo ocultos.
  - Exemplo: `la`

- **`lsd`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `ls -d */ 2>/dev/null`
  - Descrição: Lista apenas diretórios.
  - Exemplo: `lsd`

- **`md`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `mkdir -p`
  - Descrição: Cria diretório e subdiretórios automaticamente.
  - Exemplo: `md projeto/src/css`

- **`rmf`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `rm -rf`
  - Descrição: Remove arquivos e diretórios recursivamente sem confirmação.
  - Exemplo: `rmf pasta_velha`

- **`du1`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `du -h -d 1` (macOS) / `du -h --max-depth=1` (Linux)
  - Descrição: Uso de disco do diretório atual, um nível de profundidade.
  - Exemplo: `du1`

## Tmux

- **`t`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `tmux`
  - Descrição: Atalho para o tmux.
  - Exemplo: `t`

- **`tn`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `tmux new -s`
  - Descrição: Cria nova sessão tmux.
  - Exemplo: `tn meu-projeto`

- **`ta`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `tmux attach -t`
  - Descrição: Reconecta a uma sessão existente.
  - Exemplo: `ta meu-projeto`

- **`tl`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `tmux ls`
  - Descrição: Lista todas as sessões tmux ativas.
  - Exemplo: `tl`

- **`tk`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `tmux kill-session -t`
  - Descrição: Encerra uma sessão tmux.
  - Exemplo: `tk meu-projeto`

- **`tka`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `tmux kill-server`
  - Descrição: Encerra todas as sessões tmux.
  - Exemplo: `tka`

- **`td`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `tmux detach`
  - Descrição: Desconecta da sessão sem encerrá-la.
  - Exemplo: `td`

- **`tw`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `tmux new-window`
  - Descrição: Cria nova janela na sessão atual.
  - Exemplo: `tw`

- **`ts`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `tmux split-window -v`
  - Descrição: Divide painel horizontalmente (novo painel abaixo).
  - Exemplo: `ts`

- **`tsh`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `tmux split-window -h`
  - Descrição: Divide painel verticalmente (novo painel à direita).
  - Exemplo: `tsh`

- **`trename`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `tmux rename-session`
  - Descrição: Renomeia a sessão atual.
  - Exemplo: `trename novo-nome`

- **`twrename`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `tmux rename-window`
  - Descrição: Renomeia a janela atual.
  - Exemplo: `twrename editor`

- **`treload`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `tmux source ~/.tmux.conf`
  - Descrição: Recarrega as configurações do tmux.
  - Exemplo: `treload`

- **`tconfig`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `nano ~/.tmux.conf`
  - Descrição: Edita o arquivo de configuração do tmux.
  - Exemplo: `tconfig`

## Git

- **`gs`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `git status`
  - Descrição: Exibe o estado atual do repositório.
  - Exemplo: `gs`

- **`ga`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `git add`
  - Descrição: Adiciona arquivos ao stage.
  - Exemplo: `ga arquivo.txt`

- **`gaa`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `git add .`
  - Descrição: Adiciona todos os arquivos modificados ao stage.
  - Exemplo: `gaa`

- **`gc`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `git commit`
  - Descrição: Abre o editor para escrever a mensagem do commit.
  - Exemplo: `gc`

- **`gcm`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `git commit -m`
  - Descrição: Commit com mensagem inline.
  - Exemplo: `gcm 'fix: typo'`

- **`gco`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `git checkout`
  - Descrição: Troca de branch ou restaura arquivos.
  - Exemplo: `gco main`

- **`gcb`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `git checkout -b`
  - Descrição: Cria e troca para uma nova branch.
  - Exemplo: `gcb feature/nova-funcao`

- **`gp`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `git push`
  - Descrição: Envia commits para o repositório remoto.
  - Exemplo: `gp`

- **`gpl`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `git pull`
  - Descrição: Baixa e integra mudanças do repositório remoto.
  - Exemplo: `gpl`

- **`gf`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `git fetch`
  - Descrição: Busca atualizações do remoto sem aplicar.
  - Exemplo: `gf`

- **`gfa`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `git fetch --all --prune`
  - Descrição: Busca de todos os remotos e remove branches deletadas.
  - Exemplo: `gfa`

- **`gm`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `git merge`
  - Descrição: Faz merge de uma branch.
  - Exemplo: `gm feature/x`

- **`grb`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `git rebase`
  - Descrição: Reaplica commits sobre outra base.
  - Exemplo: `grb main`

- **`gcp`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `git cherry-pick`
  - Descrição: Aplica commit específico na branch atual.
  - Exemplo: `gcp abc123`

- **`gl`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `git log --oneline --graph --decorate`
  - Descrição: Log compacto com grafo de branches.
  - Exemplo: `gl`

- **`glamelog`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `git log --pretty=format:"%h %ad %s" --date=short`
  - Descrição: Log compacto com datas.
  - Exemplo: `glamelog`

- **`gd`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `git diff`
  - Descrição: Exibe diferenças não staged.
  - Exemplo: `gd`

- **`gds`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `git diff --staged`
  - Descrição: Exibe diferenças já em stage.
  - Exemplo: `gds`

- **`gb`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `git branch`
  - Descrição: Lista branches locais.
  - Exemplo: `gb`

- **`gba`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `git branch -a`
  - Descrição: Lista todas as branches incluindo remotas.
  - Exemplo: `gba`

- **`gbd`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `git branch -d`
  - Descrição: Remove uma branch local.
  - Exemplo: `gbd feature/x`

- **`gtag`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `git tag`
  - Descrição: Cria ou lista tags.
  - Exemplo: `gtag v1.0.0`

- **`gclone`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `git clone`
  - Descrição: Clona um repositório.
  - Exemplo: `gclone https://github.com/user/repo.git`

- **`gst`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `git stash`
  - Descrição: Salva mudanças temporariamente no stash.
  - Exemplo: `gst`

- **`gstp`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `git stash pop`
  - Descrição: Restaura as últimas mudanças do stash.
  - Exemplo: `gstp`

- **`grh`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `git reset HEAD~1`
  - Descrição: Desfaz o último commit mantendo as alterações.
  - Exemplo: `grh`

- **`gundo`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `git restore .`
  - Descrição: Descarta todas as alterações não staged.
  - Exemplo: `gundo`

- **`gwip`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `git add -A && git commit -m "WIP"`
  - Descrição: Salva trabalho em progresso rapidamente.
  - Exemplo: `gwip`

## GitHub CLI

- **`ghpr`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `gh pr create`
  - Descrição: Abre wizard para criar um Pull Request.
  - Exemplo: `ghpr`

- **`ghprl`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `gh pr list`
  - Descrição: Lista Pull Requests abertos.
  - Exemplo: `ghprl`

- **`ghprv`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `gh pr view`
  - Descrição: Exibe detalhes do PR atual.
  - Exemplo: `ghprv`

- **`ghprc`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `gh pr checkout`
  - Descrição: Faz checkout de um PR por número.
  - Exemplo: `ghprc 42`

- **`ghprs`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `gh pr status`
  - Descrição: Status dos PRs relacionados ao branch atual.
  - Exemplo: `ghprs`

- **`ghrl`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `gh repo list`
  - Descrição: Lista repositórios do usuário autenticado.
  - Exemplo: `ghrl`

- **`ghrc`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `gh repo clone`
  - Descrição: Clona um repositório.
  - Exemplo: `ghrc owner/repo`

- **`ghiss`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `gh issue list`
  - Descrição: Lista issues abertas do repositório.
  - Exemplo: `ghiss`

- **`ghissn`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `gh issue create`
  - Descrição: Abre wizard para criar uma nova issue.
  - Exemplo: `ghissn`

- **`ghrun`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `gh run list`
  - Descrição: Lista execuções de CI/CD do GitHub Actions.
  - Exemplo: `ghrun`

- **`ghrunw`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `gh run watch`
  - Descrição: Acompanha a execução do workflow em tempo real.
  - Exemplo: `ghrunw`

- **`ghwf`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `gh workflow list`
  - Descrição: Lista workflows do GitHub Actions.
  - Exemplo: `ghwf`

- **`ghwfr`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `gh workflow run`
  - Descrição: Dispara um workflow manualmente.
  - Exemplo: `ghwfr deploy.yml`

- **`ghrel`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `gh release list`
  - Descrição: Lista releases do repositório.
  - Exemplo: `ghrel`

- **`ghrelc`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `gh release create`
  - Descrição: Cria uma nova release.
  - Exemplo: `ghrelc v1.0.0`

- **`ghgist`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `gh gist create`
  - Descrição: Cria um Gist a partir de arquivo.
  - Exemplo: `ghgist file.sh`

- **`ghssh`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `gh ssh-key list`
  - Descrição: Lista chaves SSH cadastradas na conta GitHub.
  - Exemplo: `ghssh`

## SSH

- **`ssha`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `ssh-add`
  - Descrição: Adiciona chave SSH ao agente.
  - Exemplo: `ssha ~/.ssh/id_ed25519`

- **`sshal`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `ssh-add -l`
  - Descrição: Lista chaves carregadas no agente SSH.
  - Exemplo: `sshal`

- **`sshkeys`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `ls -la ~/.ssh/`
  - Descrição: Lista todos os arquivos de chaves SSH.
  - Exemplo: `sshkeys`

- **`sshconfig`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `nano ~/.ssh/config`
  - Descrição: Edita o arquivo de configuração do SSH.
  - Exemplo: `sshconfig`

- **`keygen`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `ssh-keygen -t ed25519 -C`
  - Descrição: Gera nova chave SSH Ed25519.
  - Exemplo: `keygen 'email@x.com'`

## Docker

- **`d`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `docker`
  - Descrição: Atalho para o comando docker.
  - Exemplo: `d ps`

- **`dc`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `docker compose`
  - Descrição: Atalho para o docker compose.
  - Exemplo: `dc up -d`

- **`dps`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `docker ps`
  - Descrição: Lista containers em execução.
  - Exemplo: `dps`

- **`dpsa`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `docker ps -a`
  - Descrição: Lista todos os containers incluindo parados.
  - Exemplo: `dpsa`

- **`dimg`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `docker images`
  - Descrição: Lista imagens Docker disponíveis localmente.
  - Exemplo: `dimg`

- **`dlog`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `docker logs -f`
  - Descrição: Segue os logs de um container.
  - Exemplo: `dlog meu-container`

- **`dex`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `docker exec -it`
  - Descrição: Executa comando interativo em container.
  - Exemplo: `dex app bash`

- **`dstart`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `docker start`
  - Descrição: Inicia um container parado.
  - Exemplo: `dstart meu-container`

- **`dstop`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `docker stop`
  - Descrição: Para um container em execução.
  - Exemplo: `dstop meu-container`

- **`drm`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `docker rm`
  - Descrição: Remove um container.
  - Exemplo: `drm meu-container`

- **`drmi`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `docker rmi`
  - Descrição: Remove uma imagem.
  - Exemplo: `drmi minha-imagem`

- **`dpull`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `docker pull`
  - Descrição: Baixa imagem do registry.
  - Exemplo: `dpull nginx:alpine`

- **`dbuild`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `docker build -t`
  - Descrição: Constrói imagem com tag.
  - Exemplo: `dbuild app:latest .`

- **`dstats`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `docker stats`
  - Descrição: Monitora CPU/memória dos containers em tempo real.
  - Exemplo: `dstats`

- **`dins`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `docker inspect`
  - Descrição: Inspeciona detalhes de container ou imagem.
  - Exemplo: `dins app`

- **`dip`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}'`
  - Descrição: IP do container.
  - Exemplo: `dip app`

- **`dnet`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `docker network ls`
  - Descrição: Lista redes Docker disponíveis.
  - Exemplo: `dnet`

- **`dvol`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `docker volume ls`
  - Descrição: Lista volumes Docker criados.
  - Exemplo: `dvol`

- **`dprune`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `docker system prune -af --volumes`
  - Descrição: Remove todos os recursos Docker não utilizados.
  - Exemplo: `dprune`

- **`dcup`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `docker compose up -d`
  - Descrição: Sobe os serviços em background.
  - Exemplo: `dcup`

- **`dcdown`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `docker compose down`
  - Descrição: Para e remove os containers do compose.
  - Exemplo: `dcdown`

- **`dcstop`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `docker compose stop`
  - Descrição: Para os serviços sem remover containers.
  - Exemplo: `dcstop`

- **`dcrestart`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `docker compose restart`
  - Descrição: Reinicia todos os serviços do compose.
  - Exemplo: `dcrestart`

- **`dcps`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `docker compose ps`
  - Descrição: Lista os serviços do compose e seus estados.
  - Exemplo: `dcps`

- **`dclog`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `docker compose logs -f`
  - Descrição: Segue os logs de todos os serviços do compose.
  - Exemplo: `dclog`

- **`dclogs`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `docker compose logs --tail=100`
  - Descrição: Exibe as últimas 100 linhas dos logs do compose.
  - Exemplo: `dclogs`

- **`dcbuild`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `docker compose build --no-cache`
  - Descrição: Reconstrói as imagens sem cache.
  - Exemplo: `dcbuild`

- **`dcpull`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `docker compose pull`
  - Descrição: Atualiza imagens dos serviços do compose.
  - Exemplo: `dcpull`

- **`dcexec`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `docker compose exec`
  - Descrição: Executa comando em serviço.
  - Exemplo: `dcexec app bash`

## Portainer

- **`portainer-start`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `docker compose -f ~/.setupvibe/portainer-compose.yml up -d`
  - Descrição: Inicia o container do Portainer.
  - Exemplo: `portainer-start`

- **`portainer-stop`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `docker compose -f ~/.setupvibe/portainer-compose.yml stop`
  - Descrição: Para o container do Portainer.
  - Exemplo: `portainer-stop`

- **`portainer-restart`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `docker compose -f ~/.setupvibe/portainer-compose.yml restart`
  - Descrição: Reinicia o container do Portainer.
  - Exemplo: `portainer-restart`

- **`portainer-update`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `docker compose -f ~/.setupvibe/portainer-compose.yml pull && docker compose -f ~/.setupvibe/portainer-compose.yml up -d`
  - Descrição: Atualiza a imagem e reinicia o Portainer.
  - Exemplo: `portainer-update`

## PM2

- **`p`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `pm2`
  - Descrição: Atalho para o comando PM2.
  - Exemplo: `p list`

- **`p-start`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `pm2 start ~/ecosystem.config.js`
  - Descrição: Inicia todas as aplicações definidas no arquivo ecosystem global.
  - Exemplo: `p-start`

- **`p-stop`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `pm2 stop ~/ecosystem.config.js`
  - Descrição: Para todas as aplicações definidas no arquivo ecosystem.
  - Exemplo: `p-stop`

- **`p-restart`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `pm2 restart ~/ecosystem.config.js`
  - Descrição: Reinicia todas as aplicações definidas no arquivo ecosystem.
  - Exemplo: `p-restart`

- **`pl`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `pm2 list`
  - Descrição: Lista todos os processos gerenciados pelo PM2.
  - Exemplo: `pl`

- **`psave`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `pm2 save`
  - Descrição: Salva a lista de processos atual para restaurar no boot.
  - Exemplo: `psave`

- **`plog`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `pm2 logs`
  - Descrição: Segue os logs de todos os processos em tempo real.
  - Exemplo: `plog`

## Agentlytics

- **`agl-start`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `pm2 start agentlytics`
  - Descrição: Inicia o processo do Agentlytics no PM2.
  - Exemplo: `agl-start`

- **`agl-stop`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `pm2 stop agentlytics`
  - Descrição: Para o processo do Agentlytics.
  - Exemplo: `agl-stop`

- **`agl-restart`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `pm2 restart agentlytics`
  - Descrição: Reinicia o processo do Agentlytics.
  - Exemplo: `agl-restart`

- **`agl-logs`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `pm2 logs agentlytics`
  - Descrição: Exibe os logs específicos do Agentlytics.
  - Exemplo: `agl-logs`

## Gerenciadores de Pacotes

- **`update`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `brew update && brew upgrade` (macOS) / `sudo apt update...` (Linux)
  - Descrição: Atualiza o sistema e gerenciadores de pacotes.
  - Exemplo: `update`

- **`apti`**
  - Disponibilidade: ☁️ Server / 🖥️ Desktop Linux
  - Comando: `sudo apt install`
  - Descrição: Instala um pacote via APT.
  - Exemplo: `apti htop`

- **`aptr`**
  - Disponibilidade: ☁️ Server / 🖥️ Desktop Linux
  - Comando: `sudo apt remove`
  - Descrição: Remove um pacote via APT.
  - Exemplo: `aptr htop`

- **`apts`**
  - Disponibilidade: ☁️ Server / 🖥️ Desktop Linux
  - Comando: `apt search`
  - Descrição: Busca pacotes nos repositórios APT.
  - Exemplo: `apts nginx`

- **`aptshow`**
  - Disponibilidade: ☁️ Server / 🖥️ Desktop Linux
  - Comando: `apt show`
  - Descrição: Exibe detalhes de um pacote APT.
  - Exemplo: `aptshow git`

- **`aptls`**
  - Disponibilidade: ☁️ Server / 🖥️ Desktop Linux
  - Comando: `dpkg -l | grep`
  - Descrição: Filtra pacotes instalados.
  - Exemplo: `aptls nginx`

- **`brewup`**
  - Disponibilidade: 🖥️ Desktop / ☁️ Server se instalado
  - Comando: `brew update && brew upgrade && brew cleanup`
  - Descrição: Atualiza Homebrew e remove versões antigas.
  - Exemplo: `brewup`

- **`brewls`**
  - Disponibilidade: 🖥️ Desktop / ☁️ Server se instalado
  - Comando: `brew list`
  - Descrição: Lista todos os pacotes instalados via Homebrew.
  - Exemplo: `brewls`

- **`brewinfo`**
  - Disponibilidade: 🖥️ Desktop / ☁️ Server se instalado
  - Comando: `brew info`
  - Descrição: Exibe informações sobre um pacote.
  - Exemplo: `brewinfo git`

- **`brewsearch`**
  - Disponibilidade: 🖥️ Desktop / ☁️ Server se instalado
  - Comando: `brew search`
  - Descrição: Busca pacotes no Homebrew.
  - Exemplo: `brewsearch ripgrep`

## Linguagens & Frameworks (🖥️ Desktop)

### Laravel / PHP

- **`art`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `php artisan`
  - Descrição: Atalho para o PHP Artisan.
  - Exemplo: `art list`

- **`artm`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `php artisan migrate`
  - Descrição: Executa as migrations pendentes.
  - Exemplo: `artm`

- **`artmf`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `php artisan migrate:fresh`
  - Descrição: Recria todas as tabelas do zero.
  - Exemplo: `artmf`

- **`artmfs`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `php artisan migrate:fresh --seed`
  - Descrição: Recria as tabelas e popula com seeders.
  - Exemplo: `artmfs`

- **`arts`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `php artisan serve`
  - Descrição: Inicia o servidor de desenvolvimento do Laravel.
  - Exemplo: `arts`

- **`artq`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `php artisan queue:work`
  - Descrição: Inicia o worker de filas.
  - Exemplo: `artq`

- **`artc`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `php artisan cache:clear && php artisan config:clear && php artisan route:clear && php artisan view:clear`
  - Descrição: Limpa todos os caches do Laravel.
  - Exemplo: `artc`

- **`artt`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `php artisan test`
  - Descrição: Executa a suíte de testes do Laravel.
  - Exemplo: `artt`

- **`artmake`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `php artisan make`
  - Descrição: Atalho para geração de código.
  - Exemplo: `artmake:controller UserController`

- **`artr`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `php artisan route:list`
  - Descrição: Lista todas as rotas da aplicação.
  - Exemplo: `artr`

- **`arttink`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `php artisan tinker`
  - Descrição: Abre o REPL interativo do Laravel.
  - Exemplo: `arttink`

- **`artkey`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `php artisan key:generate`
  - Descrição: Gera uma nova chave de aplicação.
  - Exemplo: `artkey`

- **`artopt`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `php artisan optimize:clear`
  - Descrição: Limpa todos os caches e otimizações.
  - Exemplo: `artopt`

- **`artschedule`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `php artisan schedule:work`
  - Descrição: Inicia o worker de tarefas agendadas.
  - Exemplo: `artschedule`

- **`artdb`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `php artisan db`
  - Descrição: Abre conexão interativa com o banco de dados.
  - Exemplo: `artdb`

- **`artmodel`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `php artisan make:model`
  - Descrição: Cria um Model.
  - Exemplo: `artmodel Post -m`

- **`artjob`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `php artisan make:job`
  - Descrição: Cria um Job para filas.
  - Exemplo: `artjob ProcessPayment`

- **`artevent`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `php artisan event:list`
  - Descrição: Lista todos os eventos e listeners registrados.
  - Exemplo: `artevent`

- **`ci`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `composer install`
  - Descrição: Instala dependências do composer.json.
  - Exemplo: `ci`

- **`cu`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `composer update`
  - Descrição: Atualiza dependências para versões permitidas.
  - Exemplo: `cu`

- **`creq`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `composer require`
  - Descrição: Adiciona um pacote.
  - Exemplo: `creq vendor/pacote`

- **`creqd`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `composer require --dev`
  - Descrição: Adiciona pacote como dev-dependency.
  - Exemplo: `creqd phpunit/phpunit`

- **`cdump`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `composer dump-autoload`
  - Descrição: Regenera o autoload do Composer.
  - Exemplo: `cdump`

- **`crun`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `composer run`
  - Descrição: Executa um script do composer.json.
  - Exemplo: `crun dev`

### Node / JavaScript

- **`ni`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `npm install`
  - Descrição: Instala todas as dependências do package.json.
  - Exemplo: `ni`

- **`nid`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `npm install --save-dev`
  - Descrição: Instala pacote como dependência de desenvolvimento.
  - Exemplo: `nid typescript`

- **`nr`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `npm run`
  - Descrição: Executa script do package.json.
  - Exemplo: `nr build`

- **`nrd`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `npm run dev`
  - Descrição: Inicia o servidor de desenvolvimento.
  - Exemplo: `nrd`

- **`nrb`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `npm run build`
  - Descrição: Executa o build de produção.
  - Exemplo: `nrb`

- **`nrt`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `npm run test`
  - Descrição: Executa os testes.
  - Exemplo: `nrt`

- **`nx`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `npx`
  - Descrição: Executa pacote Node sem instalar globalmente.
  - Exemplo: `nx create-react-app my-app`

- **`bi`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `bun install`
  - Descrição: Instala dependências com Bun.
  - Exemplo: `bi`

- **`br`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `bun run`
  - Descrição: Executa script com Bun.
  - Exemplo: `br dev`

- **`brd`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `bun run dev`
  - Descrição: Inicia o dev server com Bun.
  - Exemplo: `brd`

- **`brb`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `bun run build`
  - Descrição: Build de produção com Bun.
  - Exemplo: `brb`

- **`bx`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `bunx`
  - Descrição: Executa pacote sem instalar, via Bun.
  - Exemplo: `bx cowsay hello`

- **`pn`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `pnpm`
  - Descrição: Atalho para o pnpm.
  - Exemplo: `pn add axios`

- **`pni`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `pnpm install`
  - Descrição: Instala dependências com pnpm.
  - Exemplo: `pni`

- **`pnr`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `pnpm run`
  - Descrição: Executa script do package.json via pnpm.
  - Exemplo: `pnr build`

- **`pnd`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `pnpm run dev`
  - Descrição: Inicia o dev server com pnpm.
  - Exemplo: `pnd`

- **`pnb`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `pnpm run build`
  - Descrição: Build de produção com pnpm.
  - Exemplo: `pnb`

- **`pnt`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `pnpm run test`
  - Descrição: Executa os testes com pnpm.
  - Exemplo: `pnt`

- **`pnx`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `pnpm dlx`
  - Descrição: Executa pacote sem instalar via pnpm.
  - Exemplo: `pnx create-next-app`

- **`pnadd`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `pnpm add`
  - Descrição: Adiciona dependência com pnpm.
  - Exemplo: `pnadd axios`

- **`pnaddd`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `pnpm add -D`
  - Descrição: Adiciona dev-dependency com pnpm.
  - Exemplo: `pnaddd vitest`

### Python / uv

- **`py`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `python3`
  - Descrição: Atalho para Python 3.
  - Exemplo: `py main.py`

- **`pyv`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `python3 --version`
  - Descrição: Exibe a versão ativa do Python.
  - Exemplo: `pyv`

- **`uvi`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `uv pip install`
  - Descrição: Instala pacote Python com uv.
  - Exemplo: `uvi requests`

- **`uvs`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `uv run`
  - Descrição: Executa script com uv.
  - Exemplo: `uvs main.py`

- **`venv`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `python3 -m venv .venv && source .venv/bin/activate`
  - Descrição: Cria e ativa virtualenv local.
  - Exemplo: `venv`

- **`activate`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `source .venv/bin/activate`
  - Descrição: Ativa o virtualenv local do diretório.
  - Exemplo: `activate`

### Ruby / rbenv

- **`rbv`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `rbenv versions`
  - Descrição: Lista versões do Ruby instaladas via rbenv.
  - Exemplo: `rbv`

- **`rblocal`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `rbenv local`
  - Descrição: Define versão do Ruby para o diretório atual.
  - Exemplo: `rblocal 3.2.0`

- **`rbglobal`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `rbenv global`
  - Descrição: Define a versão global do Ruby.
  - Exemplo: `rbglobal 3.2.0`

- **`be`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `bundle exec`
  - Descrição: Executa comando no contexto do Bundler.
  - Exemplo: `be rails s`

- **`binstall`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `bundle install`
  - Descrição: Instala gems do Gemfile.
  - Exemplo: `binstall`

- **`bupdate`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `bundle update`
  - Descrição: Atualiza gems do Gemfile.
  - Exemplo: `bupdate`

### Rust / Cargo

- **`cb`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `cargo build`
  - Descrição: Compila o projeto Rust em modo debug.
  - Exemplo: `cb`

- **`cbr`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `cargo build --release`
  - Descrição: Compila em modo release otimizado.
  - Exemplo: `cbr`

- **`crun2`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `cargo run`
  - Descrição: Compila e executa o projeto Rust.
  - Exemplo: `crun2`

- **`ct`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `cargo test`
  - Descrição: Executa os testes do projeto.
  - Exemplo: `ct`

- **`ccheck`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `cargo check`
  - Descrição: Verifica erros sem gerar o binário.
  - Exemplo: `ccheck`

- **`clippy`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `cargo clippy`
  - Descrição: Executa o linter do Rust.
  - Exemplo: `clippy`

- **`cfmt`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `cargo fmt`
  - Descrição: Formata o código com rustfmt.
  - Exemplo: `cfmt`

- **`cadd`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `cargo add`
  - Descrição: Adiciona dependência ao projeto Rust.
  - Exemplo: `cadd serde`

- **`crem`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `cargo remove`
  - Descrição: Remove dependência do projeto Rust.
  - Exemplo: `crem serde`

- **`cupdate`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `cargo update`
  - Descrição: Atualiza todas as dependências do Cargo.lock.
  - Exemplo: `cupdate`

- **`cdoc`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `cargo doc --open`
  - Descrição: Gera e abre a documentação do projeto no browser.
  - Exemplo: `cdoc`

### Go

- **`gobuild`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `go build ./...`
  - Descrição: Compila todos os pacotes do projeto Go.
  - Exemplo: `gobuild`

- **`gorun`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `go run .`
  - Descrição: Executa o pacote principal.
  - Exemplo: `gorun`

- **`gotest`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `go test ./...`
  - Descrição: Executa todos os testes do projeto.
  - Exemplo: `gotest`

- **`gomod`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `go mod tidy`
  - Descrição: Remove dependências não utilizadas do go.mod.
  - Exemplo: `gomod`

- **`govet`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `go vet ./...`
  - Descrição: Verifica problemas comuns no código Go.
  - Exemplo: `govet`

- **`gofmt`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `gofmt -w .`
  - Descrição: Formata todos os arquivos Go do diretório.
  - Exemplo: `gofmt`

- **`goget`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `go get`
  - Descrição: Adiciona dependência ao projeto Go.
  - Exemplo: `goget github.com/gin-gonic/gin`

- **`goclean`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `go clean -cache`
  - Descrição: Remove o cache de build do Go.
  - Exemplo: `goclean`

- **`gocover`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `go test ./... -coverprofile=coverage.out && go tool cover -html=coverage.out`
  - Descrição: Cobertura HTML.
  - Exemplo: `gocover`

- **`gowork`**
  - Disponibilidade: 🖥️ Desktop
  - Comando: `go work`
  - Descrição: Gerencia workspaces Go.
  - Exemplo: `gowork use ./pkg`

## DevOps & Sistema

- **`anp`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `ansible-playbook`
  - Descrição: Executa um playbook.
  - Exemplo: `anp site.yml -i hosts`

- **`ani`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `ansible-inventory --list`
  - Descrição: Exibe o inventário em formato JSON.
  - Exemplo: `ani`

- **`anping`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `ansible all -m ping`
  - Descrição: Testa conectividade com todos os hosts.
  - Exemplo: `anping`

- **`anv`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `ansible-vault`
  - Descrição: Gerencia arquivos criptografados com Vault.
  - Exemplo: `anv edit secrets.yml`

- **`anve`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `ansible-vault encrypt`
  - Descrição: Criptografa um arquivo com Vault.
  - Exemplo: `anve secrets.yml`

- **`anvd`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `ansible-vault decrypt`
  - Descrição: Descriptografa um arquivo com Vault.
  - Exemplo: `anvd secrets.yml`

- **`anvr`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `ansible-vault rekey`
  - Descrição: Recriptografa com nova senha.
  - Exemplo: `anvr secrets.yml`

- **`ancheck`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `ansible-playbook --check`
  - Descrição: Simula execução do playbook sem aplicar mudanças.
  - Exemplo: `ancheck site.yml`

- **`andiff`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `ansible-playbook --check --diff`
  - Descrição: Simula e exibe diff das mudanças que seriam aplicadas.
  - Exemplo: `andiff site.yml`

- **`anfacts`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `ansible all -m setup`
  - Descrição: Coleta facts de todos os hosts do inventário.
  - Exemplo: `anfacts`

### Cron & Agendamento

- **`cronb`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `cronboard`
  - Descrição: Abre o dashboard TUI do Cronboard para gerenciar tarefas cron.
  - Exemplo: `cronb`

- **`cronl`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `crontab -l`
  - Descrição: Lista as tarefas cron do usuário atual.
  - Exemplo: `cronl`

- **`crone`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `crontab -e`
  - Descrição: Edita as tarefas cron do usuário atual.
  - Exemplo: `crone`

- **`cronr`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `crontab -r`
  - Descrição: Remove todas as tarefas cron do usuário atual (CUIDADO).
  - Exemplo: `cronr`

### Monitoramento & Processos

- **`topc`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `top -o cpu` (macOS) / `top -bn1 | head -20` (Linux)
  - Descrição: Monitora processos ordenados por uso de CPU.
  - Exemplo: `topc`

- **`topm`**
  - Disponibilidade: 🖥️ Desktop macOS
  - Comando: `top -o mem`
  - Descrição: Monitora processos ordenados por uso de memória.
  - Exemplo: `topm`

- **`psg`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `ps aux | grep`
  - Descrição: Busca processos por nome.
  - Exemplo: `psg nginx`

- **`df`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `df -h`
  - Descrição: Uso de disco com tamanhos legíveis.
  - Exemplo: `df`

- **`meminfo`**
  - Disponibilidade: ☁️ Server / 🖥️ Desktop Linux
  - Comando: `free -h`
  - Descrição: Exibe uso de memória RAM e swap.
  - Exemplo: `meminfo`

- **`diskinfo`**
  - Disponibilidade: ☁️ Server / 🖥️ Desktop Linux
  - Comando: `df -h`
  - Descrição: Exibe uso de disco de todas as partições.
  - Exemplo: `diskinfo`

- **`cpuinfo`**
  - Disponibilidade: ☁️ Server / 🖥️ Desktop Linux
  - Comando: `lscpu`
  - Descrição: Exibe informações detalhadas sobre a CPU.
  - Exemplo: `cpuinfo`

- **`sysinfo`**
  - Disponibilidade: ☁️ Server / 🖥️ Desktop Linux
  - Comando: `hostnamectl`
  - Descrição: Exibe informações do sistema operacional e hostname.
  - Exemplo: `sysinfo`

### Systemd (Linux)

- **`sstatus`**
  - Disponibilidade: ☁️ Server / 🖥️ Desktop Linux
  - Comando: `sudo systemctl status`
  - Descrição: Exibe o status de um serviço.
  - Exemplo: `sstatus nginx`

- **`sstart`**
  - Disponibilidade: ☁️ Server / 🖥️ Desktop Linux
  - Comando: `sudo systemctl start`
  - Descrição: Inicia um serviço.
  - Exemplo: `sstart nginx`

- **`sstop`**
  - Disponibilidade: ☁️ Server / 🖥️ Desktop Linux
  - Comando: `sudo systemctl stop`
  - Descrição: Para um serviço.
  - Exemplo: `sstop nginx`

- **`srestart`**
  - Disponibilidade: ☁️ Server / 🖥️ Desktop Linux
  - Comando: `sudo systemctl restart`
  - Descrição: Reinicia um serviço.
  - Exemplo: `srestart nginx`

- **`senable`**
  - Disponibilidade: ☁️ Server / 🖥️ Desktop Linux
  - Comando: `sudo systemctl enable`
  - Descrição: Habilita um serviço para iniciar no boot.
  - Exemplo: `senable nginx`

- **`sdisable`**
  - Disponibilidade: ☁️ Server / 🖥️ Desktop Linux
  - Comando: `sudo systemctl disable`
  - Descrição: Desabilita um serviço no boot.
  - Exemplo: `sdisable nginx`

- **`slogs`**
  - Disponibilidade: ☁️ Server / 🖥️ Desktop Linux
  - Comando: `sudo journalctl -u`
  - Descrição: Exibe logs de um serviço específico.
  - Exemplo: `slogs nginx`

- **`syslog`**
  - Disponibilidade: ☁️ Server / 🖥️ Desktop Linux
  - Comando: `sudo journalctl -f`
  - Descrição: Segue o log do sistema em tempo real.
  - Exemplo: `syslog`

## Rede & Web

- **`myip`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `curl -s ifconfig.me`
  - Descrição: Exibe o IP público da máquina.
  - Exemplo: `myip`

- **`localip`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `ipconfig getifaddr en0` (macOS) / `hostname -I...` (Linux)
  - Descrição: Exibe o IP local principal da máquina.
  - Exemplo: `localip`

- **`ports`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `lsof -iTCP -sTCP:LISTEN -n -P` (macOS) / `ss -tulnp` (Linux)
  - Descrição: Lista todas as portas em escuta.
  - Exemplo: `ports`

- **`wholistening`**
  - Disponibilidade: ☁️ Server / 🖥️ Desktop Linux
  - Comando: `ss -tulnp`
  - Descrição: Alias alternativo para listar portas em escuta.
  - Exemplo: `wholistening`

- **`flush`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `dscacheutil...` (macOS) / `sudo systemd-resolve...` (Linux)
  - Descrição: Limpa o cache de DNS.
  - Exemplo: `flush`

### cURL / HTTP

- **`get`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `curl -s`
  - Descrição: GET request simples.
  - Exemplo: `get https://api.github.com`

- **`post`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `curl -s -X POST -H 'Content-Type: application/json'`
  - Descrição: POST JSON simples.
  - Exemplo: `post url -d '{"key":"val"}'`

- **`headers`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `curl -sI`
  - Descrição: Exibe apenas os headers HTTP da resposta.
  - Exemplo: `headers google.com`

- **`httpcode`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `curl -o /dev/null -s -w '%{http_code}\n'`
  - Descrição: Exibe somente o código HTTP da resposta.
  - Exemplo: `httpcode google.com`

- **`timing`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `curl -o /dev/null -s -w 'dns:%{time_namelookup}s...'`
  - Descrição: Latência detalhada.
  - Exemplo: `timing google.com`

### JSON / YAML

- **`jpp`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `python3 -m json.tool`
  - Descrição: Formata e valida JSON.
  - Exemplo: `cat data.json | jpp`

- **`jsonf`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `jq .`
  - Descrição: Formata JSON com cores via jq.
  - Exemplo: `cat data.json | jsonf`

### Segurança & Certs

- **`certinfo`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `openssl x509 -text -noout -in`
  - Descrição: Exibe detalhes de um certificado .pem.
  - Exemplo: `certinfo cert.pem`

- **`certexpiry`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `openssl x509 -enddate -noout -in`
  - Descrição: Exibe a data de expiração de um certificado.
  - Exemplo: `certexpiry cert.pem`

- **`sslcheck`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `openssl s_client -connect`
  - Descrição: Inspeciona TLS de um host.
  - Exemplo: `sslcheck google.com:443`

- **`genpass`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `openssl rand -base64 32`
  - Descrição: Gera uma senha aleatória segura de 32 bytes.
  - Exemplo: `genpass`

### Ambiente

- **`envls`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `env | sort`
  - Descrição: Lista todas as variáveis de ambiente ordenadas.
  - Exemplo: `envls`

- **`envg`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `env | grep`
  - Descrição: Filtra variáveis de ambiente.
  - Exemplo: `envg PATH`

- **`dotenv`**
  - Disponibilidade: 🌐 Ambos
  - Comando: `export $(cat .env | grep -v '^#' | xargs)`
  - Descrição: Carrega variáveis do arquivo .env atual.
  - Exemplo: `dotenv`

---
