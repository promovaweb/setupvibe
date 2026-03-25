# SetupVibe — Edição Server

> Configuração de servidor Linux — v0.36.0

Um script de configuração enxuto e focado para servidores Linux. Sem Homebrew, sem ecossistemas de linguagens, sem ferramentas de desktop. Instala apenas o que um servidor de produção precisa: Docker, Ansible, rede, shell, tmux e ferramentas de IA via CLI.

## Requisitos do Sistema

|                    | Suportado                       |
| ------------------ | ------------------------------- |
| **Ubuntu**         | 24.04+                          |
| **Debian**         | 12+                             |
| **Zorin OS**       | 18+                             |
| **Linux Mint**     | 21+                             |
| **Arquiteturas**   | x86_64 (amd64), ARM64 (aarch64) |

> Somente Linux. O script encerra imediatamente se executado no macOS.

## Instalação

```bash
curl -sSL server.setupvibe.dev | bash
```

Ou localmente:

```bash
bash server.sh
```

O script aguarda a liberação de qualquer bloqueio do APT (útil em VMs de nuvem recém-criadas onde o `unattended-upgrades` é executado no boot), exibe um roteiro interativo e solicita confirmação. Também solicita a configuração da identidade do Git, caso ainda não esteja definida.

---

## O Que é Instalado

**9 etapas, totalmente automatizadas.**

### Etapa 1 — Sistema Base e Ferramentas de Build

Instala via APT:

- `build-essential`, `git`, `wget`, `unzip`, `curl`, `tmux`, `fontconfig`, `sshpass`
- Bibliotecas SSL/compressão: `libssl-dev`, `zlib1g-dev`, `libbz2-dev`, `libreadline-dev`, `libsqlite3-dev`, `libncurses5-dev`, `xz-utils`, `libffi-dev`, `liblzma-dev`, `libyaml-dev`
- Python: `python3`, `python3-pip`, `python3-venv`, `python-is-python3`
- Daemons de sistema: `cron`, `logrotate`, `rsyslog`
- Gerenciador de pacotes Python [uv](https://github.com/astral-sh/uv) (instalado em `~/.local/bin`)

### Etapa 2 — Docker, Ansible e GitHub CLI

**Docker** — instalado a partir do repositório APT oficial do Docker:

- `docker-ce`, `docker-ce-cli`, `containerd.io`, `docker-compose-plugin`, `docker-buildx-plugin`
- O usuário é adicionado ao grupo `docker`

**Ansible:**

- Ubuntu → via PPA `ansible/ansible`
- Debian → `ansible-core` via APT

**GitHub CLI (`gh`)** — via repositório APT oficial do GitHub

### Etapa 3 — Rede, Monitoramento e Tailscale

Pacotes APT:
`rsync`, `net-tools`, `dnsutils`, `mtr-tiny`, `nmap`, `tcpdump`, `iftop`, `nload`, `iotop`, `sysstat`, `whois`, `iputils-ping`, `speedtest-cli`, `glances`, `htop`, `btop`

- **ctop** — binário baixado em `~/.local/bin/ctop` (v0.7.7, detecta arquitetura)
- **Tailscale** — via script oficial de instalação (`https://tailscale.com/install.sh`)

### Etapa 4 — Servidor SSH

- Instala `openssh-server` e `openssh-client`
- Habilita e inicia o serviço systemd `ssh`
- Faz backup do `/etc/ssh/sshd_config` original
- Configura `PermitRootLogin yes` e `PasswordAuthentication yes`
- Valida a configuração com `sshd -t` antes de reiniciar; restaura o backup se a validação falhar

### Etapa 5 — Shell (ZSH e Starship)

- Instala ZSH via APT
- Instala Oh My Zsh (sem interação)
- Clona `zsh-autosuggestions` e `zsh-syntax-highlighting`
- Instala o prompt Starship em `~/.local/bin` e aplica o preset **Gruvbox Rainbow**
- Baixa [`conf/zshrc-server.zsh`](../../../conf/zshrc-server.zsh) para `~/.zshrc`
- Define o ZSH como shell padrão via `chsh`

#### Aliases do Shell

| Alias          | Comando                               |
| -------------- | ------------------------------------- |
| `reload`       | `source ~/.zshrc`                     |
| `zconfig`      | `nano ~/.zshrc`                       |
| `update`       | `sudo apt update && sudo apt upgrade` |
| `d`            | `docker`                              |
| `dc`           | `docker compose`                      |
| `syslog`       | `sudo journalctl -f`                  |
| `ports`        | `ss -tulnp`                           |
| `meminfo`      | `free -h`                             |
| `diskinfo`     | `df -h`                               |
| `cpuinfo`      | `lscpu`                               |
| `wholistening` | `ss -tulnp`                           |

#### Plugins Oh My Zsh

`git rsync nmap cp extract zoxide fzf zsh-autosuggestions zsh-syntax-highlighting tmux brew gh ansible docker docker-compose`

### Etapa 6 — Tmux e Plugins

- Clona o [TPM](https://github.com/tmux-plugins/tpm) em `~/.tmux/plugins/tpm`
- Baixa [`conf/tmux-server.conf`](../../../conf/tmux-server.conf) para `~/.tmux.conf`
- Se executado como root com um `REAL_HOME` não-root, também instala em `/root/.tmux.conf`
- Encerra qualquer sessão tmux em execução para aplicar a nova configuração

Pressione `prefix + I` dentro do tmux para instalar todos os plugins. Consulte o [Guia do Tmux](../../desktop/pt-br/tmux.md) para a referência completa de plugins e atalhos.

### Passo 7 — Ferramentas de IA CLI

Instala o **Node.js 24** via repositório NodeSource APT, e então instala globalmente via `npm install -g`:

| Ferramenta         | Pacote                           |
| ------------------ | -------------------------------- |
| Claude Code        | `@anthropic-ai/claude-code`      |
| Gemini CLI         | `@google/gemini-cli`             |
| OpenAI Codex       | `@openai/codex`                  |
| GitHub Copilot CLI | `@githubnext/github-copilot-cli` |

Os pacotes globais do npm são instalados em `~/.npm-global` (configurado com `npm config set prefix`) quando não está rodando como root.

### Passo 8 — Finalização e Limpeza

- APT: `autoremove`, `autoclean`, `clean`, remove `/var/lib/apt/lists/*`
- Remove arquivos temporários: `/tmp/ctop`, `/tmp/starship`
- Limpa logs do journal com mais de 7 dias
- Limpa caches do usuário: `~/.cache/pip`, `~/.npm/_npx`, `~/.bundle/cache`, `~/.cache/composer`

---

## Licença

Licenciado sob a **GNU General Public License v3.0** — veja [LICENSE](../../LICENSE) para detalhes.

Mantido por [promovaweb.com](https://promovaweb.com) · <contato@promovaweb.com>

---
> Follow the formatting guide: [Markdown Format Guide](.claude/commands/markdown-format.md)
