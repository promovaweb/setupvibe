# SetupVibe para Omarchy 4

> Camada de desenvolvimento da Promovaweb sobre Omarchy 4 — v0.41.10

`omarchy.sh` configura o SetupVibe em uma instalação Omarchy 4 existente. A
edição reconhece que o Omarchy já entrega o ambiente principal e trabalha por
adição: não remove pacotes, não troca o shell, não apaga aliases e não
sobrescreve os arquivos de configuração do Omarchy.

## Requisitos

- Omarchy 4, branch Quattro, instalado sobre Arch Linux.
- Arquitetura `x86_64`.
- Usuário com acesso a `sudo` para o `pacman` e serviços systemd.
- Terminal interativo, exceto quando `--yes` for usado.

O script confere `/usr/share/omarchy`, o comando `omarchy`, o pacote instalado
e a versão major 4 antes de alterar qualquer coisa.

## Instalação

```bash
# Execução local
bash omarchy.sh

# Execução local sem confirmação
bash omarchy.sh --yes

# Execução remota pela branch principal
curl -fsSL https://raw.githubusercontent.com/promovaweb/setupvibe/main/omarchy.sh | bash

# Execução remota sem confirmação
curl -fsSL https://raw.githubusercontent.com/promovaweb/setupvibe/main/omarchy.sh | bash -s -- --yes

# Ver ajuda sem executar a instalação
bash omarchy.sh --help
```

## O que o Omarchy já fornece

A edição não repete os componentes documentados pelo [manual oficial do
Omarchy](https://omarchy.org/manual/). Entre eles estão:

- Bash, Starship, aliases e shell functions do Omarchy.
- Foot, Tmux e a configuração de Tmux do sistema.
- `mise`, Node configurado por mise e o fluxo para outros runtimes.
- Docker, Buildx, Compose, LazyDocker e o grupo `docker`.
- `bat`, `eza`, `fzf`, `fd`, `ripgrep`, `zoxide`, `lazygit`, `tldr`,
  `fastfetch`, `jq` e Neovim.
- Ruby, Herdr, fontes JetBrains Mono Nerd Font e os CLIs de IA instalados
  pelos hooks de usuário do Omarchy, como Codex, Claude, Gemini, Copilot e
  OpenCode.

As referências técnicas são a [lista de pacotes da branch
`quattro`](https://github.com/basecamp/omarchy/blob/quattro/install/omarchy-base.packages)
e os [scripts oficiais de finalização do usuário](https://github.com/basecamp/omarchy/blob/quattro/install/user/all.sh).

## O que o SetupVibe adiciona

O script usa `omarchy pkg add`, que instala somente pacotes ausentes e não
executa `pacman -R`. Os itens adicionados são:

- PHP, Composer, extensões PHP disponíveis no repositório, Laravel Installer e
  Rails sobre o Ruby que já existe.
- Go, Rust, Python, `uv`, `qrcode` com o comando `qr` e Cronboard, somente
  quando o comando ainda não está disponível.
- Node e Bun por mise somente quando ainda faltam; `pnpm` e PM2 pelo npm.
- Ansible, utilitários de rede ausentes e Tailscale quando os pacotes estão
  disponíveis.
- Skills CLI, Kimi Code, Agentlytics, Antigravity CLI, Hermes Agent e
  Spec-Kit, sem repetir os CLIs já instalados pelo Omarchy. O Hermes Agent é só
  instalado, pelo instalador oficial com `--skip-setup`; configure provedor,
  modelo e chaves com `hermes setup`. O instalador acrescenta ao `~/.bashrc` e
  ao `~/.profile` uma linha que só põe `~/.local/bin` no `PATH` quando ele
  ainda não está lá.
- `ssh_copy_id`, `ecosystem.config.js` e o compose do Portainer em
  `~/.setupvibe/`.

Os arquivos de configuração adicionados ficam em `~/.config/setupvibe/`:

- `starship.toml`: preset Gruvbox Rainbow independente do arquivo do Omarchy.
- `aliases.bash`: aliases e funções adicionais, carregados depois dos aliases
  do Omarchy e protegidos contra colisões.

O `~/.bashrc` recebe somente um bloco marcado que aponta para esses arquivos.
O `~/.config/starship.toml` do Omarchy e as configurações do Tmux não são
substituídos. O serviço SSH é apenas habilitado quando já existe, sem alteração
do `sshd_config`. O Portainer só é iniciado se o Docker estiver disponível.

## Validação após a instalação

```bash
bash -n omarchy.sh
source ~/.bashrc
command -v starship
command -v composer
command -v pm2
command -v ssh_copy_id
docker compose -f ~/.setupvibe/portainer-compose.yml config
```

Abra um novo terminal depois da execução para carregar o bloco adicionado ao
`.bashrc`.
