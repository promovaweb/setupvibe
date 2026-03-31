# SetupVibe Aliases

Esta é a lista exaustiva de todos os aliases configurados pelo SetupVibe em todas as plataformas (macOS, Linux Desktop e Server).

---

## AI CLIs

- **`ge`**
  - Comando: `gemini --approval-mode=yolo`
  - Descrição: Gemini CLI sem confirmações.
  - Exemplo: `ge "refactor this"`

- **`cc`**
  - Comando: `claude --permission-mode=auto --dangerously-skip-permissions`
  - Descrição: Claude CLI sem confirmações.
  - Exemplo: `cc "fix bug"`

## Skills CLI

- **`skl`**
  - Comando: `npx skills list`
  - Descrição: Lista todas as skills instaladas.
  - Exemplo: `skl`

- **`skf`**
  - Comando: `npx skills find`
  - Descrição: Busca skills no registro (ex: skf react).
  - Exemplo: `skf node`

- **`ska`**
  - Comando: `npx skills add`
  - Descrição: Instala uma nova skill (ex: ska owner/repo).
  - Exemplo: `ska vercel-labs/agent-skills`

- **`sku`**
  - Comando: `npx skills update`
  - Descrição: Atualiza todas as skills instaladas.
  - Exemplo: `sku`

- **`skun`**
  - Comando: `npx skills remove`
  - Descrição: Remove uma skill instalada (ex: skun nome).
  - Exemplo: `skun react-performance`

- **`skc`**
  - Comando: `npx skills check`
  - Descrição: Verifica atualizações disponíveis.
  - Exemplo: `skc`

## Shell & Utilitários

- **`zconfig`**
  - Comando: `nano ~/.zshrc`
  - Descrição: Edita o arquivo de configuração do ZSH.

- **`reload`**
  - Comando: `source ~/.zshrc`
  - Descrição: Recarrega as configurações do ZSH sem reiniciar o terminal.

- **`path`**
  - Comando: `echo -e ${PATH//:/\\n}`
  - Descrição: Exibe cada entrada do PATH em uma linha separada.

- **`h`**
  - Comando: `history | grep`
  - Descrição: Busca no histórico de comandos.
  - Exemplo: `h docker`

- **`cls`**
  - Comando: `clear`
  - Descrição: Limpa o terminal.

- **`please`**
  - Comando: `sudo`
  - Descrição: Atalho amigável para sudo.

- **`week`**
  - Comando: `date +%V`
  - Descrição: Exibe o número da semana atual.

## Navegação & Filesystem

- **`..`**
  - Comando: `cd ..`
  - Descrição: Sobe um nível de diretório.

- **`...`**
  - Comando: `cd ../..`
  - Descrição: Sobe dois níveis de diretório.

- **`....`**
  - Comando: `cd ../../..`
  - Descrição: Sobe três níveis de diretório.

- **`ll`**
  - Comando: `ls -lhA` (macOS) / `ls -lhA --color=auto` (Linux)
  - Descrição: Lista arquivos com detalhes e tamanho legível.

- **`la`**
  - Comando: `ls -A` (macOS) / `ls -A --color=auto` (Linux)
  - Descrição: Lista todos os arquivos incluindo ocultos.

- **`lsd`**
  - Comando: `ls -d */ 2>/dev/null`
  - Descrição: Lista apenas diretórios.

- **`md`**
  - Comando: `mkdir -p`
  - Descrição: Cria diretório e subdiretórios automaticamente.

- **`rmf`**
  - Comando: `rm -rf`
  - Descrição: Remove arquivos e diretórios recursivamente sem confirmação.

- **`du1`**
  - Comando: `du -h -d 1` (macOS) / `du -h --max-depth=1` (Linux)
  - Descrição: Uso de disco do diretório atual, um nível de profundidade.

## Tmux

- **`t`**
  - Comando: `tmux`
  - Descrição: Atalho para o tmux.

- **`tn`**
  - Comando: `tmux new -s`
  - Descrição: Cria nova sessão tmux.
  - Exemplo: `tn meu-projeto`

- **`ta`**
  - Comando: `tmux attach -t`
  - Descrição: Reconecta a uma sessão existente.
  - Exemplo: `ta meu-projeto`

- **`tl`**
  - Comando: `tmux ls`
  - Descrição: Lista todas as sessões tmux ativas.

- **`tk`**
  - Comando: `tmux kill-session -t`
  - Descrição: Encerra uma sessão tmux.

- **`tka`**
  - Comando: `tmux kill-server`
  - Descrição: Encerra todas as sessões tmux.

- **`td`**
  - Comando: `tmux detach`
  - Descrição: Desconecta da sessão sem encerrá-la.

- **`tw`**
  - Comando: `tmux new-window`
  - Descrição: Cria nova janela na sessão atual.

- **`ts`**
  - Comando: `tmux split-window -v`
  - Descrição: Divide painel horizontalmente (novo painel abaixo).

- **`tsh`**
  - Comando: `tmux split-window -h`
  - Descrição: Divide painel verticalmente (novo painel à direita).

- **`trename`**
  - Comando: `tmux rename-session`
  - Descrição: Renomeia a sessão atual.

- **`twrename`**
  - Comando: `tmux rename-window`
  - Descrição: Renomeia a janela atual.

- **`treload`**
  - Comando: `tmux source ~/.tmux.conf`
  - Descrição: Recarrega as configurações do tmux.

- **`tconfig`**
  - Comando: `nano ~/.tmux.conf`
  - Descrição: Edita o arquivo de configuração do tmux.

## Git

- **`gs`**
  - Comando: `git status`
  - Descrição: Exibe o estado atual do repositório.

- **`ga`**
  - Comando: `git add`
  - Descrição: Adiciona arquivos ao stage.

- **`gaa`**
  - Comando: `git add .`
  - Descrição: Adiciona todos os arquivos modificados ao stage.

- **`gc`**
  - Comando: `git commit`
  - Descrição: Abre o editor para escrever a mensagem do commit.

- **`gcm`**
  - Comando: `git commit -m`
  - Descrição: Commit com mensagem inline.

- **`gco`**
  - Comando: `git checkout`
  - Descrição: Troca de branch ou restaura arquivos.

- **`gcb`**
  - Comando: `git checkout -b`
  - Descrição: Cria e troca para uma nova branch.

- **`gp`**
  - Comando: `git push`
  - Descrição: Envia commits para o repositório remoto.

- **`gpl`**
  - Comando: `git pull`
  - Descrição: Baixa e integra mudanças do repositório remoto.

- **`gf`**
  - Comando: `git fetch`
  - Descrição: Busca atualizações do remoto sem aplicar.

- **`gfa`**
  - Comando: `git fetch --all --prune`
  - Descrição: Busca de todos os remotos e remove branches deletadas.

- **`gm`**
  - Comando: `git merge`
  - Descrição: Faz merge de uma branch.

- **`grb`**
  - Comando: `git rebase`
  - Descrição: Reaplica commits sobre outra base.

- **`gcp`**
  - Comando: `git cherry-pick`
  - Descrição: Aplica commit específico na branch atual.

- **`gl`**
  - Comando: `git log --oneline --graph --decorate`
  - Descrição: Log compacto com grafo de branches.

- **`glamelog`**
  - Comando: `git log --pretty=format:"%h %ad %s" --date=short`
  - Descrição: Log compacto com datas.

- **`gd`**
  - Comando: `git diff`
  - Descrição: Exibe diferenças não staged.

- **`gds`**
  - Comando: `git diff --staged`
  - Descrição: Exibe diferenças já em stage.

- **`gb`**
  - Comando: `git branch`
  - Descrição: Lista branches locais.

- **`gba`**
  - Comando: `git branch -a`
  - Descrição: Lista todas as branches incluindo remotas.

- **`gbd`**
  - Comando: `git branch -d`
  - Descrição: Remove uma branch local.

- **`gtag`**
  - Comando: `git tag`
  - Descrição: Cria ou lista tags.

- **`gclone`**
  - Comando: `git clone`
  - Descrição: Clona um repositório.

- **`gst`**
  - Comando: `git stash`
  - Descrição: Salva mudanças temporariamente no stash.

- **`gstp`**
  - Comando: `git stash pop`
  - Descrição: Restaura as últimas mudanças do stash.

- **`grh`**
  - Comando: `git reset HEAD~1`
  - Descrição: Desfaz o último commit mantendo as alterações.

- **`gundo`**
  - Comando: `git restore .`
  - Descrição: Descarta todas as alterações não staged.

- **`gwip`**
  - Comando: `git add -A && git commit -m "WIP"`
  - Descrição: Salva trabalho em progresso rapidamente.

## GitHub CLI

- **`ghpr`**
  - Comando: `gh pr create`
  - Descrição: Abre wizard para criar um Pull Request.

- **`ghprl`**
  - Comando: `gh pr list`
  - Descrição: Lista Pull Requests abertos.

- **`ghprv`**
  - Comando: `gh pr view`
  - Descrição: Exibe detalhes do PR atual.

- **`ghprc`**
  - Comando: `gh pr checkout`
  - Descrição: Faz checkout de um PR por número.

- **`ghprs`**
  - Comando: `gh pr status`
  - Descrição: Status dos PRs relacionados ao branch atual.

- **`ghrl`**
  - Comando: `gh repo list`
  - Descrição: Lista repositórios do usuário autenticado.

- **`ghrc`**
  - Comando: `gh repo clone`
  - Descrição: Clona um repositório (ex: ghrc owner/repo).

- **`ghiss`**
  - Comando: `gh issue list`
  - Descrição: Lista issues abertas do repositório.

- **`ghissn`**
  - Comando: `gh issue create`
  - Descrição: Abre wizard para criar uma nova issue.

- **`ghrun`**
  - Comando: `gh run list`
  - Descrição: Lista execuções de CI/CD do GitHub Actions.

- **`ghrunw`**
  - Comando: `gh run watch`
  - Descrição: Acompanha a execução do workflow em tempo real.

- **`ghwf`**
  - Comando: `gh workflow list`
  - Descrição: Lista workflows do GitHub Actions.

- **`ghwfr`**
  - Comando: `gh workflow run`
  - Descrição: Dispara um workflow manualmente.

- **`ghrel`**
  - Comando: `gh release list`
  - Descrição: Lista releases do repositório.

- **`ghrelc`**
  - Comando: `gh release create`
  - Descrição: Cria uma nova release.

- **`ghgist`**
  - Comando: `gh gist create`
  - Descrição: Cria um Gist a partir de arquivo.

- **`ghssh`**
  - Comando: `gh ssh-key list`
  - Descrição: Lista chaves SSH cadastradas na conta GitHub.

## SSH

- **`ssha`**
  - Comando: `ssh-add`
  - Descrição: Adiciona chave SSH ao agente.

- **`sshal`**
  - Comando: `ssh-add -l`
  - Descrição: Lista chaves carregadas no agente SSH.

- **`sshkeys`**
  - Comando: `ls -la ~/.ssh/`
  - Descrição: Lista todos os arquivos de chaves SSH.

- **`sshconfig`**
  - Comando: `nano ~/.ssh/config`
  - Descrição: Edita o arquivo de configuração do SSH.

- **`keygen`**
  - Comando: `ssh-keygen -t ed25519 -C`
  - Descrição: Gera nova chave SSH Ed25519.

## Docker

- **`d`**
  - Comando: `docker`
  - Descrição: Atalho para o comando docker.

- **`dc`**
  - Comando: `docker compose`
  - Descrição: Atalho para o docker compose.

- **`dps`**
  - Comando: `docker ps`
  - Descrição: Lista containers em execução.

- **`dpsa`**
  - Comando: `docker ps -a`
  - Descrição: Lista todos os containers incluindo parados.

- **`dimg`**
  - Comando: `docker images`
  - Descrição: Lista imagens Docker disponíveis localmente.

- **`dlog`**
  - Comando: `docker logs -f`
  - Descrição: Segue os logs de um container.

- **`dex`**
  - Comando: `docker exec -it`
  - Descrição: Executa comando interativo em container.

- **`dstart`**
  - Comando: `docker start`
  - Descrição: Inicia um container parado.

- **`dstop`**
  - Comando: `docker stop`
  - Descrição: Para um container em execução.

- **`drm`**
  - Comando: `docker rm`
  - Descrição: Remove um container.

- **`drmi`**
  - Comando: `docker rmi`
  - Descrição: Remove uma imagem.

- **`dpull`**
  - Comando: `docker pull`
  - Descrição: Baixa imagem do registry.

- **`dbuild`**
  - Comando: `docker build -t`
  - Descrição: Constrói imagem com tag.

- **`dstats`**
  - Comando: `docker stats`
  - Descrição: Monitora CPU/memória dos containers em tempo real.

- **`dins`**
  - Comando: `docker inspect`
  - Descrição: Inspeciona detalhes de container ou imagem.

- **`dip`**
  - Comando: `docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}'`
  - Descrição: IP do container.

- **`dnet`**
  - Comando: `docker network ls`
  - Descrição: Lista redes Docker disponíveis.

- **`dvol`**
  - Comando: `docker volume ls`
  - Descrição: Lista volumes Docker criados.

- **`dprune`**
  - Comando: `docker system prune -af --volumes`
  - Descrição: Remove todos os recursos Docker não utilizados.

- **`dcup`**
  - Comando: `docker compose up -d`
  - Descrição: Sobe os serviços em background.

- **`dcdown`**
  - Comando: `docker compose down`
  - Descrição: Para e remove os containers do compose.

- **`dcstop`**
  - Comando: `docker compose stop`
  - Descrição: Para os serviços sem remover containers.

- **`dcrestart`**
  - Comando: `docker compose restart`
  - Descrição: Reinicia todos os serviços do compose.

- **`dcps`**
  - Comando: `docker compose ps`
  - Descrição: Lista os serviços do compose e seus estados.

- **`dclog`**
  - Comando: `docker compose logs -f`
  - Descrição: Segue os logs de todos os serviços do compose.

- **`dclogs`**
  - Comando: `docker compose logs --tail=100`
  - Descrição: Exibe as últimas 100 linhas dos logs do compose.

- **`dcbuild`**
  - Comando: `docker compose build --no-cache`
  - Descrição: Reconstrói as imagens sem cache.

- **`dcpull`**
  - Comando: `docker compose pull`
  - Descrição: Atualiza imagens dos serviços do compose.

- **`dcexec`**
  - Comando: `docker compose exec`
  - Descrição: Executa comando em serviço.

## Gerenciadores de Pacotes (APT / Homebrew)

- **`update`**
  - Comando: `brew update && brew upgrade` (macOS) / `sudo apt update && sudo apt upgrade...` (Linux)
  - Descrição: Atualiza o sistema e pacotes instalados.

- **`apti`** (Linux)
  - Comando: `sudo apt install`
  - Descrição: Instala um pacote via APT.

- **`aptr`** (Linux)
  - Comando: `sudo apt remove`
  - Descrição: Remove um pacote via APT.

- **`apts`** (Linux)
  - Comando: `apt search`
  - Descrição: Busca pacotes nos repositórios APT.

- **`aptshow`** (Linux)
  - Comando: `apt show`
  - Descrição: Exibe detalhes de um pacote APT.

- **`aptls`** (Linux)
  - Comando: `dpkg -l | grep`
  - Descrição: Filtra pacotes instalados.

- **`brewup`**
  - Comando: `brew update && brew upgrade && brew cleanup`
  - Descrição: Atualiza Homebrew e remove versões antigas.

- **`brewls`**
  - Comando: `brew list`
  - Descrição: Lista todos os pacotes instalados via Homebrew.

- **`brewinfo`**
  - Comando: `brew info`
  - Descrição: Exibe informações sobre um pacote.

- **`brewsearch`**
  - Comando: `brew search`
  - Descrição: Busca pacotes no Homebrew.

## Laravel / PHP

- **`art`**
  - Comando: `php artisan`
  - Descrição: Atalho para o PHP Artisan.

- **`artm`**
  - Comando: `php artisan migrate`
  - Descrição: Executa as migrations pendentes.

- **`artmf`**
  - Comando: `php artisan migrate:fresh`
  - Descrição: Recria todas as tabelas do zero.

- **`artmfs`**
  - Comando: `php artisan migrate:fresh --seed`
  - Descrição: Recria as tabelas e popula com seeders.

- **`arts`**
  - Comando: `php artisan serve`
  - Descrição: Inicia o servidor de desenvolvimento do Laravel.

- **`artq`**
  - Comando: `php artisan queue:work`
  - Descrição: Inicia o worker de filas.

- **`artc`**
  - Comando: `php artisan cache:clear && ...`
  - Descrição: Limpa todos os caches do Laravel.

- **`artt`**
  - Comando: `php artisan test`
  - Descrição: Executa a suíte de testes do Laravel.

- **`artmake`**
  - Comando: `php artisan make`
  - Descrição: Atalho para geração de código.

- **`artr`**
  - Comando: `php artisan route:list`
  - Descrição: Lista todas as rotas da aplicação.

- **`arttink`**
  - Comando: `php artisan tinker`
  - Descrição: Abre o REPL interativo do Laravel.

- **`artkey`**
  - Comando: `php artisan key:generate`
  - Descrição: Gera uma nova chave de aplicação.

- **`artopt`**
  - Comando: `php artisan optimize:clear`
  - Descrição: Limpa todos os caches e otimizações.

- **`artschedule`**
  - Comando: `php artisan schedule:work`
  - Descrição: Inicia o worker de tarefas agendadas.

- **`artdb`**
  - Comando: `php artisan db`
  - Descrição: Abre conexão interativa com o banco de dados.

- **`artmodel`**
  - Comando: `php artisan make:model`
  - Descrição: Cria um Model.

- **`artjob`**
  - Comando: `php artisan make:job`
  - Descrição: Cria um Job para filas.

- **`artevent`**
  - Comando: `php artisan event:list`
  - Descrição: Lista todos os eventos registrados.

- **`ci`**
  - Comando: `composer install`
  - Descrição: Instala dependências do composer.json.

- **`cu`**
  - Comando: `composer update`
  - Descrição: Atualiza dependências.

- **`creq`**
  - Comando: `composer require`
  - Descrição: Adiciona um pacote.

- **`creqd`**
  - Comando: `composer require --dev`
  - Descrição: Adiciona pacote como dev-dependency.

- **`cdump`**
  - Comando: `composer dump-autoload`
  - Descrição: Regenera o autoload do Composer.

- **`crun`**
  - Comando: `composer run`
  - Descrição: Executa um script do composer.json.

## Node / JavaScript

- **`ni`**
  - Comando: `npm install`
  - Descrição: Instala todas as dependências do package.json.

- **`nid`**
  - Comando: `npm install --save-dev`
  - Descrição: Instala pacote como dependência de desenvolvimento.

- **`nr`**
  - Comando: `npm run`
  - Descrição: Executa script do package.json.

- **`nrd`**
  - Comando: `npm run dev`
  - Descrição: Inicia o servidor de desenvolvimento.

- **`nrb`**
  - Comando: `npm run build`
  - Descrição: Executa o build de produção.

- **`nrt`**
  - Comando: `npm run test`
  - Descrição: Executa os testes.

- **`nx`**
  - Comando: `npx`
  - Descrição: Executa pacote Node sem instalar globalmente.

- **`bi`**
  - Comando: `bun install`
  - Descrição: Instala dependências com Bun.

- **`br`**
  - Comando: `bun run`
  - Descrição: Executa script com Bun.

- **`brd`**
  - Comando: `bun run dev`
  - Descrição: Inicia o dev server com Bun.

- **`brb`**
  - Comando: `bun run build`
  - Descrição: Build de produção com Bun.

- **`bx`**
  - Comando: `bunx`
  - Descrição: Executa pacote sem instalar, via Bun.

- **`pn`**
  - Comando: `pnpm`
  - Descrição: Atalho para o pnpm.

- **`pni`**
  - Comando: `pnpm install`
  - Descrição: Instala dependências com pnpm.

- **`pnr`**
  - Comando: `pnpm run`
  - Descrição: Executa script do package.json via pnpm.

- **`pnd`**
  - Comando: `pnpm run dev`
  - Descrição: Inicia o dev server com pnpm.

- **`pnb`**
  - Comando: `pnpm run build`
  - Descrição: Build de produção com pnpm.

- **`pnt`**
  - Comando: `pnpm run test`
  - Descrição: Executa os testes com pnpm.

- **`pnx`**
  - Comando: `pnpm dlx`
  - Descrição: Executa pacote sem instalar via pnpm.

- **`pnadd`**
  - Comando: `pnpm add`
  - Descrição: Adiciona dependência com pnpm.

- **`pnaddd`**
  - Comando: `pnpm add -D`
  - Descrição: Adiciona dev-dependency com pnpm.

## Python / uv

- **`py`**
  - Comando: `python3`
  - Descrição: Atalho para Python 3.

- **`pyv`**
  - Comando: `python3 --version`
  - Descrição: Exibe a versão ativa do Python.

- **`uvi`**
  - Comando: `uv pip install`
  - Descrição: Instala pacote Python com uv.

- **`uvs`**
  - Comando: `uv run`
  - Descrição: Executa script com uv.

- **`venv`**
  - Comando: `python3 -m venv .venv && source .venv/bin/activate`
  - Descrição: Cria e ativa virtualenv local.

- **`activate`**
  - Comando: `source .venv/bin/activate`
  - Descrição: Ativa o virtualenv local do diretório.

## Ruby / rbenv

- **`rbv`**
  - Comando: `rbenv versions`
  - Descrição: Lista versões do Ruby instaladas via rbenv.

- **`rblocal`**
  - Comando: `rbenv local`
  - Descrição: Define versão do Ruby para o diretório atual.

- **`rbglobal`**
  - Comando: `rbenv global`
  - Descrição: Define a versão global do Ruby.

- **`be`**
  - Comando: `bundle exec`
  - Descrição: Executa comando no contexto do Bundler.

- **`binstall`**
  - Comando: `bundle install`
  - Descrição: Instala gems do Gemfile.

- **`bupdate`**
  - Comando: `bundle update`
  - Descrição: Atualiza gems do Gemfile.

## Rust / Cargo

- **`cb`**
  - Comando: `cargo build`
  - Descrição: Compila o projeto Rust em modo debug.

- **`cbr`**
  - Comando: `cargo build --release`
  - Descrição: Compila em modo release otimizado.

- **`crun2`**
  - Comando: `cargo run`
  - Descrição: Compila e executa o projeto Rust.

- **`ct`**
  - Comando: `cargo test`
  - Descrição: Executa os testes do projeto.

- **`ccheck`**
  - Comando: `cargo check`
  - Descrição: Verifica erros sem gerar o binário.

- **`clippy`**
  - Comando: `cargo clippy`
  - Descrição: Executa o linter do Rust.

- **`cfmt`**
  - Comando: `cargo fmt`
  - Descrição: Formata o código com rustfmt.

- **`cadd`**
  - Comando: `cargo add`
  - Descrição: Adiciona dependência ao projeto Rust.

- **`crem`**
  - Comando: `cargo remove`
  - Descrição: Remove dependência do projeto Rust.

- **`cupdate`**
  - Comando: `cargo update`
  - Descrição: Atualiza todas as dependências do Cargo.lock.

- **`cdoc`**
  - Comando: `cargo doc --open`
  - Descrição: Gera e abre a documentação do projeto no browser.

## Go

- **`gobuild`**
  - Comando: `go build ./...`
  - Descrição: Compila todos os pacotes do projeto Go.

- **`gorun`**
  - Comando: `go run .`
  - Descrição: Executa o pacote principal.

- **`gotest`**
  - Comando: `go test ./...`
  - Descrição: Executa todos os testes do projeto.

- **`gomod`**
  - Comando: `go mod tidy`
  - Descrição: Remove dependências não utilizadas do go.mod.

- **`govet`**
  - Comando: `go vet ./...`
  - Descrição: Verifica problemas comuns no código Go.

- **`gofmt`**
  - Comando: `gofmt -w .`
  - Descrição: Formata todos os arquivos Go do diretório.

- **`goget`**
  - Comando: `go get`
  - Descrição: Adiciona dependência ao projeto Go.

- **`goclean`**
  - Comando: `go clean -cache`
  - Descrição: Remove o cache de build do Go.

- **`gocover`**
  - Comando: `go test ./... -coverprofile...`
  - Descrição: Cobertura HTML.

- **`gowork`**
  - Comando: `go work`
  - Descrição: Gerencia workspaces Go.

## Ansible

- **`anp`**
  - Comando: `ansible-playbook`
  - Descrição: Executa um playbook.

- **`ani`**
  - Comando: `ansible-inventory --list`
  - Descrição: Exibe o inventário em formato JSON.

- **`anping`**
  - Comando: `ansible all -m ping`
  - Descrição: Testa conectividade com todos os hosts.

- **`anv`**
  - Comando: `ansible-vault`
  - Descrição: Gerencia arquivos criptografados com Vault.

- **`anve`**
  - Comando: `ansible-vault encrypt`
  - Descrição: Criptografa um arquivo com Vault.

- **`anvd`**
  - Comando: `ansible-vault decrypt`
  - Descrição: Descriptografa um arquivo com Vault.

- **`anvr`**
  - Comando: `ansible-vault rekey`
  - Descrição: Recriptografa com nova senha.

- **`ancheck`**
  - Comando: `ansible-playbook --check`
  - Descrição: Simula execução do playbook sem aplicar mudanças.

- **`andiff`**
  - Comando: `ansible-playbook --check --diff`
  - Descrição: Simula e exibe diff das mudanças.

- **`anfacts`**
  - Comando: `ansible all -m setup`
  - Descrição: Coleta facts de todos os hosts do inventário.

## Sistema

- **`topc`**
  - Comando: `top -o cpu` (macOS) / `top -bn1 | head -20` (Linux)
  - Descrição: Monitora processos ordenados por uso de CPU.

- **`topm`** (macOS)
  - Comando: `top -o mem`
  - Descrição: Monitora processos ordenados por uso de memória.

- **`psg`**
  - Comando: `ps aux | grep`
  - Descrição: Busca processos por nome.

- **`df`**
  - Comando: `df -h`
  - Descrição: Uso de disco com tamanhos legíveis.

- **`meminfo`** (Linux)
  - Comando: `free -h`
  - Descrição: Exibe uso de memória RAM e swap.

- **`diskinfo`** (Linux)
  - Comando: `df -h`
  - Descrição: Exibe uso de disco de todas as partições.

- **`cpuinfo`** (Linux)
  - Comando: `lscpu`
  - Descrição: Exibe informações detalhadas sobre a CPU.

- **`sysinfo`** (Linux)
  - Comando: `hostnamectl`
  - Descrição: Exibe informações do sistema operacional e hostname.

## Serviços (systemd) - Linux

- **`sstatus`**
  - Comando: `sudo systemctl status`
  - Descrição: Exibe o status de um serviço.

- **`sstart`**
  - Comando: `sudo systemctl start`
  - Descrição: Inicia um serviço.

- **`sstop`**
  - Comando: `sudo systemctl stop`
  - Descrição: Para um serviço.

- **`srestart`**
  - Comando: `sudo systemctl restart`
  - Descrição: Reinicia um serviço.

- **`senable`**
  - Comando: `sudo systemctl enable`
  - Descrição: Habilita um serviço para iniciar no boot.

- **`sdisable`**
  - Comando: `sudo systemctl disable`
  - Descrição: Desabilita um serviço no boot.

- **`slogs`**
  - Comando: `sudo journalctl -u`
  - Descrição: Exibe logs de um serviço específico.

- **`syslog`**
  - Comando: `sudo journalctl -f`
  - Descrição: Segue o log do sistema em tempo real.

## Rede

- **`myip`**
  - Comando: `curl -s ifconfig.me`
  - Descrição: Exibe o IP público da máquina.

- **`localip`**
  - Comando: `ipconfig getifaddr en0` (macOS) / `hostname -I...` (Linux)
  - Descrição: Exibe o IP local principal da máquina.

- **`ports`**
  - Comando: `lsof -iTCP -sTCP:LISTEN...` (macOS) / `ss -tulnp` (Linux)
  - Descrição: Lista todas as portas TCP em escuta.

- **`wholistening`** (Linux)
  - Comando: `ss -tulnp`
  - Descrição: Alias alternativo para listar portas em escuta.

- **`flush`**
  - Comando: `dscacheutil -flushcache...` (macOS) / `sudo systemd-resolve...` (Linux)
  - Descrição: Limpa o cache de DNS.

## cURL / HTTP

- **`get`**
  - Comando: `curl -s`
  - Descrição: GET request simples.

- **`post`**
  - Comando: `curl -s -X POST -H 'Content-Type: application/json'`
  - Descrição: POST JSON.

- **`headers`**
  - Comando: `curl -sI`
  - Descrição: Exibe apenas os headers HTTP da resposta.

- **`httpcode`**
  - Comando: `curl -o /dev/null -s -w '%{http_code}\n'`
  - Descrição: Exibe somente o código HTTP da resposta.

- **`timing`**
  - Comando: `curl -o /dev/null -s -w 'dns:%{time_namelookup}s...'`
  - Descrição: Latência detalhada.

## JSON / YAML

- **`jpp`**
  - Comando: `python3 -m json.tool`
  - Descrição: Formata e valida JSON.

- **`jsonf`**
  - Comando: `jq .`
  - Descrição: Formata JSON com cores via jq.

## Segurança & Certificados

- **`certinfo`**
  - Comando: `openssl x509 -text -noout -in`
  - Descrição: Exibe detalhes de um certificado .pem.

- **`certexpiry`**
  - Comando: `openssl x509 -enddate -noout -in`
  - Descrição: Exibe a data de expiração de um certificado.

- **`sslcheck`**
  - Comando: `openssl s_client -connect`
  - Descrição: Inspeciona TLS de um host.

- **`genpass`**
  - Comando: `openssl rand -base64 32`
  - Descrição: Gera uma senha aleatória segura de 32 bytes.

## Ambiente

- **`envls`**
  - Comando: `env | sort`
  - Descrição: Lista todas as variáveis de ambiente ordenadas.

- **`envg`**
  - Comando: `env | grep`
  - Descrição: Filtra variáveis de ambiente.

- **`dotenv`**
  - Comando: `export $(cat .env | grep -v '^#' | xargs)`
  - Descrição: Carrega variáveis do arquivo .env atual.

---
> Follow the formatting guide: [Markdown Format Guide](.claude/commands/markdown-format.md)
