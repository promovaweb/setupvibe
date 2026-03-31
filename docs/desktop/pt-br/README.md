# SetupVibe — Edição Desktop

> Configuração de ambiente de desenvolvimento multiplataforma — v0.37.0

Instala e configura uma stack completa de desenvolvimento em um único comando. Suporta macOS e as principais distribuições Linux.

## Requisitos do Sistema

|                    | Suportado                       |
| ------------------ | ------------------------------- |
| **macOS**          | 12 Monterey ou superior         |
| **Ubuntu**         | 24.04+                          |
| **Debian**         | 12+                             |
| **Zorin OS**       | 18+                             |
| **Linux Mint**     | 21+                             |
| **Arquiteturas**   | x86_64 (amd64), ARM64 (aarch64) |

> **Não** execute com `sudo` no macOS — o Homebrew se recusa a instalar como root. Execute normalmente e o script solicitará sua senha quando necessário.

## Instalação

```bash
curl -sSL desktop.setupvibe.dev | bash
```

Ou localmente:

```bash
bash desktop.sh
```

O script exibe um roteiro interativo e solicita confirmação antes de iniciar. Também solicita a configuração da identidade do Git, caso ainda não esteja definida.

---

## O Que é Instalado

**14 etapas, totalmente automatizadas.**

### Etapa 1 — Sistema Base e Ferramentas de Build

**Linux:** instalação via APT — `build-essential`, `git`, `wget`, `unzip`, `curl`, `tmux`, bibliotecas SSL/compressão e o repositório APT do Charmbracelet (para o `glow`).

**macOS:** depende do Xcode Command Line Tools (verifica e encerra se não estiver presente). As ferramentas base são instaladas via Homebrew na próxima etapa.

### Etapa 2 — Homebrew

- **macOS:** instala o Homebrew se ausente, depois instala ferramentas base (`wget`, `curl`, `tmux`, `openssl`, `readline`, etc.)
- **Linux:** instala o Linuxbrew em `/home/linuxbrew/.linuxbrew`; adiciona entradas de PATH ao `~/.bashrc`, `~/.profile`, `~/.zshrc`; executa `brew upgrade` se já presente

### Etapa 3 — Ecossistema PHP 8.4

| Componente          | macOS                                       | Linux                                                                                               |
| ------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| PHP 8.4             | via Homebrew                                | via PPA ondrej/php (Ubuntu) ou sury.org (Debian)                                                    |
| Extensões           | redis, xdebug, imagick via PECL             | php8.4-{curl,mbstring,xml,zip,bcmath,intl,mysql,pgsql,sqlite3,gd,imagick,redis,mongodb,yaml,xdebug} |
| Composer            | via Homebrew                                | binário em `~/.local/bin/composer`                                                                  |
| Laravel installer   | `composer global require laravel/installer` | igual                                                                                               |

### Etapa 4 — Ecossistema Ruby

| Componente      | macOS                       | Linux                                   |
| --------------- | --------------------------- | --------------------------------------- |
| rbenv           | via Homebrew                | clonado do GitHub em `~/.rbenv`         |
| ruby-build      | via Homebrew                | clonado em `~/.rbenv/plugins/ruby-build` |
| Ruby            | 3.3.0 compilado via rbenv   | igual                                   |
| Bundler + Rails | `gem install bundler rails` | igual                                   |

### Etapa 5 — Linguagens

| Linguagem | macOS                      | Linux                                              |
| --------- | -------------------------- | -------------------------------------------------- |
| Python 3  | `python@3.12` via Homebrew | via APT (`python3`, `python3-pip`, `python3-venv`) |
| uv        | via script de instalação   | igual                                              |
| Go        | via Homebrew               | binário 1.22.2 em `~/.local/go`                    |
| Rust      | via rustup                 | igual                                              |

### Etapa 6 — JavaScript

| Ferramenta | macOS                     | Linux                   |
| ---------- | ------------------------- | ----------------------- |
| Node.js 24 | `node@24` via Homebrew    | via repositório APT NodeSource |
| PNPM       | `npm install -g pnpm`     | igual                   |
| PM2        | `npm install -g pm2`      | igual                   |
| n8n        | `npm install -g @n8n/cli` | igual                   |
| Bun        | via script de instalação  | igual                   |

### Etapa 7 — DevOps

| Ferramenta          | macOS                            | Linux                                                                        |
| ------------------- | -------------------------------- | ---------------------------------------------------------------------------- |
| Docker              | Docker Desktop via Homebrew Cask | docker-ce + docker-compose-plugin + docker-buildx-plugin via repositório APT do Docker |
| Ansible             | via Homebrew                     | via PPA ansible/ansible (Ubuntu) ou ansible-core (Debian)                    |
| GitHub CLI (`gh`)   | via Homebrew                     | via repositório APT do GitHub                                                |

### Etapa 8 — Ferramentas Unix Modernas

Instaladas via Homebrew em ambas as plataformas.

| Ferramenta   | Descrição                             |
| ------------ | ------------------------------------- |
| `bat`        | `cat` com realce de sintaxe           |
| `eza`        | Substituto moderno do `ls`            |
| `zoxide`     | `cd` mais inteligente                 |
| `fzf`        | Buscador fuzzy (com atalhos de shell) |
| `ripgrep`    | Substituto rápido do `grep`           |
| `fd`         | Substituto rápido do `find`           |
| `lazygit`    | Interface terminal para git           |
| `lazydocker` | Interface terminal para Docker        |
| `neovim`     | Vim moderno                           |
| `glow`       | Renderizador de Markdown              |
| `jq`         | Processador JSON                      |
| `tldr`       | Páginas de manual simplificadas       |
| `fastfetch`  | Ferramenta de informações do sistema  |
| `duf`        | `df` moderno                          |
| `mise`       | Gerenciador de versões de runtime     |

### Etapa 9 — Rede, Monitoramento e Tailscale

**macOS:** `wget`, `nmap`, `mtr`, `htop`, `btop`, `glances`, `speedtest-cli` via Homebrew; `bandwhich`, `gping`, `trippy`, `rustscan` via Cargo; `ctop` via Homebrew; Tailscale via Cask.

**Linux:** mesmas ferramentas via APT + Cargo + binário ctop em `~/.local/bin`; Tailscale via script oficial de instalação.

### Etapa 10 — Servidor SSH *(somente Linux)*

- Instala `openssh-server`
- Habilita e inicia o serviço systemd `ssh`
- Configura `PermitRootLogin yes` e `PasswordAuthentication yes`
- Faz backup do `sshd_config` original antes de modificar

### Etapa 11 — Shell (ZSH e Starship)

- Instala ZSH (Linux via APT; já padrão no macOS)
- Instala Oh My Zsh (sem interação)
- Clona os plugins `zsh-autosuggestions` e `zsh-syntax-highlighting`
- Instala Nerd Fonts: **FiraCode** e **JetBrains Mono** (Homebrew Cask no macOS; baixadas em `~/.local/share/fonts` no Linux)
- Instala o prompt Starship e aplica o preset **Gruvbox Rainbow**
- Baixa o `.zshrc` adequado:
  - macOS → [`conf/zshrc-macos.zsh`](../../../conf/zshrc-macos.zsh)
  - Linux → [`conf/zshrc-linux.zsh`](../../../conf/zshrc-linux.zsh)

### Etapa 12 — Tmux e Plugins

- Clona o [TPM](https://github.com/tmux-plugins/tpm) em `~/.tmux/plugins/tpm`
- Baixa [`conf/tmux-desktop.conf`](../../../conf/tmux-desktop.conf) para `~/.tmux.conf`
- Encerra qualquer sessão tmux em execução para aplicar a nova configuração

Pressione `prefix + I` dentro do tmux para instalar todos os plugins. Consulte [tmux.md](tmux.md) para a referência completa de plugins e atalhos de teclado.

### Etapa 13 — Ferramentas de IA via CLI

Instaladas globalmente via `npm install -g`:

| Ferramenta         | Pacote                           |
| ------------------ | -------------------------------- |
| Agentlytics        | `agentlytics`                    |
| Claude Code        | `@anthropic-ai/claude-code`      |
| Gemini CLI         | `@google/gemini-cli`             |
| OpenAI Codex       | `@openai/codex`                  |
| GitHub Copilot CLI | `@githubnext/github-copilot-cli` |

### Etapa 14 — Finalização e Limpeza

**macOS:** `brew cleanup --prune=all`, `brew autoremove`, limpa `~/Library/Caches` e `~/.Trash`.

**Linux:** `apt autoremove`, `apt clean`, remove arquivos temporários e limpa logs do journal; limpa `~/.cache/pip`, `~/.cache/composer`, `~/.npm/_npx`, `~/.bundle/cache`.

**Ambos:** configura inicialização automática do PM2 (launchd no macOS, systemd no Linux), executa `pm2 save`, define `pm2:autodump true`, baixa `ecosystem.config.js` para `~/ecosystem.config.js`.

Consulte [pm2.md](pm2.md) para a referência completa do PM2.

---

## Configuração do Shell

Cada plataforma recebe um `.zshrc` dedicado:

| Arquivo                                               | Plataforma | Caminhos principais                               |
| ----------------------------------------------------- | ---------- | ------------------------------------------------- |
| [`zshrc-macos.zsh`](../../../conf/zshrc-macos.zsh)    | macOS      | Homebrew, Cargo, Composer, Go, Bun                |
| [`zshrc-linux.zsh`](../../../conf/zshrc-linux.zsh)    | Linux      | Linuxbrew, npm-global, Cargo, Go, Bun, rbenv      |

### Aliases

| Alias      | Comando                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------ |
| `reload`   | `source ~/.zshrc`                                                                          |
| `zconfig`  | `nano ~/.zshrc`                                                                            |
| `update`   | `brew update && brew upgrade` (macOS) / `sudo apt update && sudo apt upgrade` (Linux)      |
| `brewup`   | `brew update && brew upgrade && brew cleanup`                                              |
| `ge`       | `gemini --approval-mode=yolo`                                                              |
| `cc`       | `claude --permission-mode=auto --dangerously-skip-permissions`                             |
| `d`        | `docker`                                                                                   |
| `dc`       | `docker compose`                                                                           |
| `art`      | `php artisan`                                                                              |
| `syslog`   | `sudo journalctl -f` *(somente Linux)*                                                     |
| `ports`    | `ss -tulnp` *(somente Linux)*                                                              |
| `meminfo`  | `free -h` *(somente Linux)*                                                                |
| `diskinfo` | `df -h` *(somente Linux)*                                                                  |
| `cpuinfo`  | `lscpu` *(somente Linux)*                                                                  |

### Plugins Oh My Zsh

`git rsync cp extract zoxide fzf zsh-autosuggestions zsh-syntax-highlighting brew gh ansible docker docker-compose laravel composer rails ruby python pip node npm bun golang rust` + `macos` (somente macOS) / `nmap tmux` (somente Linux)

---

## Licença

Licenciado sob a **GNU General Public License v3.0** — veja [LICENSE](../../LICENSE) para detalhes.

Mantido por [promovaweb.com](https://promovaweb.com) · <contato@promovaweb.com>

---
> Follow the formatting guide: [Markdown Format Guide](.claude/commands/markdown-format.md)
