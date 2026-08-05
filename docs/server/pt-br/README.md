# SetupVibe — Edição Servidor

> Configuração de servidor Linux — v0.41.11

Um script de configuração focado em servidores Linux. Sem Homebrew, ecossistemas de linguagens ou ferramentas de desktop, ele instala Docker, Ansible, recursos de rede, shell, tmux e ferramentas de CLI de IA.

## Requisitos do Sistema

|                  | Suportado                       |
| ---------------- | ------------------------------- |
| **Ubuntu**       | 24.04+                          |
| **Debian**       | 12+                             |
| **Zorin OS**     | 18+                             |
| **Arquiteturas** | x86_64 (amd64), ARM64 (aarch64) |

> Somente Linux. O script encerra imediatamente se executado no macOS.

## Instalação

```bash
curl -sSL server.setupvibe.dev | bash
```

Ou localmente:

```bash
bash server.sh
```

Para inicializar o Docker Swarm automaticamente após o setup, passe `--manager`:

```bash
curl -sSL server.setupvibe.dev | bash -s -- --manager
```

```bash
bash server.sh --manager
```

Para uma instalação não interativa, adicione `--yes`. Para escolher explicitamente o endereço ou a interface do Swarm, use `--advertise-addr ENDERECO`. Essa opção implica `--manager`.

O script valida o sistema operacional, a versão, a arquitetura, o usuário de destino e os argumentos antes de alterar o sistema. Em seguida, exibe um roteiro interativo, solicita confirmação, aguarda por até cinco minutos a liberação dos locks do APT e repete comandos APT que falharem. As etapas param no primeiro erro, o resumo identifica as etapas não executadas e o script retorna um status diferente de zero. Se `--manager` não for informado, instalações interativas perguntam ao final se o Docker Swarm deve ser configurado.

---

## O Que é Instalado

**9 etapas totalmente automatizadas (Etapas 0–8), mais uma Etapa 9 opcional para configuração do Docker Swarm Manager.**

### Etapa 0 — Pré-requisitos e Verificação de Arquitetura

Informa o sistema operacional, a base de repositórios da distribuição, a arquitetura da CPU, o usuário de destino e o diretório inicial validados antes do início da instalação.

### Etapa 1 — Ferramentas do Sistema Base

Instala via APT:

- Utilitários principais: `curl`, `file`, `figlet`, `fontconfig`, `fzf`, `git`, `gnupg`, `iproute2`, `jq`, `nano`, `procps`, `psmisc`, `sshpass`, `tmux`, `unzip`, `wget`
- Serviços do sistema: `cron`, `logrotate`, `rsyslog`
- **zoxide** pelo instalador oficial
- Habilita o `cron` sem criar tarefas e remove somente as tarefas de demonstração legadas adicionadas pelo SetupVibe v0.41.4-v0.41.6

### Etapa 2 — Docker, Ansible e GitHub CLI

**Docker** — instalado a partir do repositório APT oficial do Docker:

- `docker-ce`, `docker-ce-cli`, `containerd.io`, `docker-compose-plugin`, `docker-buildx-plugin`
- O usuário é adicionado ao grupo `docker`

**Ansible:**

- Ubuntu → via PPA `ansible/ansible`
- Debian → `ansible-core` via APT

**GitHub CLI (`gh`)** — via repositório APT oficial do GitHub

**Portainer CE** — usa o canal de imagem `lts` e expõe HTTPS na porta `9443`. A porta HTTP legada `9000` e a porta opcional `8000` para Edge Agent não são abertas

### Etapa 3 — Rede, Monitoramento e Tailscale

Pacotes APT:
`rsync`, `net-tools`, `dnsutils`, `mtr-tiny`, `nmap`, `tcpdump`, `iftop`, `nload`, `iotop`, `sysstat`, `whois`, `iputils-ping`, `speedtest-cli`, `glances`, `htop`, `btop`

- **ctop** — binário baixado em `~/.local/bin/ctop` (v0.7.7, detecta arquitetura, SHA-256 verificado)
- **Tailscale** — via script oficial de instalação (`https://tailscale.com/install.sh`)

### Etapa 4 — Servidor SSH

- Instala `openssh-server` e `openssh-client`
- Habilita e inicia o serviço systemd `ssh`
- Valida a configuração efetiva com `sshd -t`
- Preserva a política de autenticação existente. Não habilita login de root nem autenticação por senha

### Etapa 5 — Shell (ZSH e Starship)

- Instala ZSH via APT
- Instala Oh My Zsh (sem interação)
- Clona `zsh-autosuggestions` e `zsh-syntax-highlighting`
- Instala o prompt Starship em `~/.local/bin` e aplica o preset **Gruvbox Rainbow**
- Baixa scripts auxiliares de [`bin/`](../../../bin) para `~/.setupvibe/bin`. Veja [Executáveis](../../pt-br/EXECUTABLES.md)
- Baixa [`conf/zshrc-server.zsh`](../../../conf/zshrc-server.zsh) para `~/.zshrc`
- Preserva uma vez os arquivos `.zshrc`, `.bashrc` e `.tmux.conf` existentes com o sufixo `.pre-setupvibe` antes de substituir ou acrescentar conteúdo
- Define o ZSH como shell padrão via `chsh`

#### Aliases do Shell

| Alias          | Comando                                                        |
| -------------- | -------------------------------------------------------------- |
| `reload`       | `source ~/.zshrc`                                              |
| `zconfig`      | `nano ~/.zshrc`                                                |
| `ssh_copy_id`   | `ssh_copy_id --host HOST --user USUARIO [--pass SENHA]`         |
| `update`       | `sudo apt update && sudo apt upgrade`                          |
| `cc`           | `claude --permission-mode=auto --dangerously-skip-permissions` |
| `skl`          | `skills list`                                                  |
| `skf`          | `skills find`                                                  |
| `ska`          | `skills add`                                                   |
| `sku`          | `skills update`                                                |
| `skun`         | `skills remove`                                                |
| `d`            | `docker`                                                       |
| `dc`           | `docker compose`                                               |
| `syslog`       | `sudo journalctl -f`                                           |
| `ports`        | `ss -tulnp`                                                    |
| `meminfo`      | `free -h`                                                      |
| `diskinfo`     | `df -h`                                                        |
| `cpuinfo`      | `lscpu`                                                        |
| `wholistening` | `ss -tulnp`                                                    |

#### Plugins Oh My Zsh

`git rsync nmap cp extract zoxide fzf zsh-autosuggestions zsh-syntax-highlighting tmux gh ansible docker docker-compose`

### Etapa 6 — Tmux e Plugins

- Clona o [TPM](https://github.com/tmux-plugins/tpm) em `~/.tmux/plugins/tpm`
- Baixa [`conf/tmux-server.conf`](../../../conf/tmux-server.conf) para `~/.tmux.conf`
- Se executado como root com um `REAL_HOME` não-root, também instala em `/root/.tmux.conf`
- Preserva as sessões tmux em execução. A nova configuração é aplicada às novas sessões

Pressione `prefix + I` dentro do tmux para instalar todos os plugins. Consulte o [Guia do Tmux](../../desktop/pt-br/tmux.md) para a referência completa de plugins e atalhos.

### Passo 7 — Ferramentas de IA CLI

Instala o **Node.js 24** pelo repositório APT do NodeSource, instala os pacotes npm globalmente e obtém o Herdr pelo manifesto oficial de releases:

| Ferramenta         | Instalação                       |
| ------------------ | -------------------------------- |
| Claude Code        | `@anthropic-ai/claude-code`      |
| OpenAI Codex       | `@openai/codex`                  |
| GitHub Copilot CLI | `@github/copilot`                |
| OpenCode CLI       | `opencode-ai`                    |
| Skills CLI         | `skills`                         |
| Herdr              | Binário do manifesto oficial     |

O [Vercel Labs Skills CLI](https://github.com/vercel-labs/skills), o [Herdr](https://github.com/herdrdev/herdr) e cada comando de CLI de IA são validados após a instalação. O Herdr é instalado em `~/.local/bin` conforme a arquitetura detectada. Consulte o [guia do Herdr](../../pt-br/HERDR.md) para entender sessões, atalhos, atualizações e diagnóstico. O pacote descontinuado `@githubnext/github-copilot-cli` é removido. Os pacotes globais do npm são instalados em `~/.npm-global` sempre que o usuário de destino não for root, inclusive quando o instalador for executado por `sudo`.

### Passo 8 — Finalização e Limpeza

- Executa `autoclean` e `clean` do APT
- Remove as listas de pacotes baixadas pelo APT
- Preserva pacotes instalados, logs do sistema e caches do usuário

### Passo 9 — Docker Swarm Manager (opcional)

Ativado passando `--manager` ou respondendo **sim** ao prompt interativo exibido ao final do setup.

1. **Detecta o IPv4 roteável principal** pela tabela de rotas local, sem consultar serviços externos de IP. Use `--advertise-addr ENDERECO` para informar um endereço ou uma interface específica.
2. **Inicializa o Docker Swarm** com `docker swarm init --advertise-addr <ENDERECO>`. Idempotente — ignora a inicialização se a máquina já for manager e falha claramente se ela já for worker.
3. **Cria a rede overlay** `network_swarm_public` com `--driver overlay --attachable`. Idempotente — ignora se a rede já existir.
4. **Exibe os tokens de ingresso** para as roles worker e manager, permitindo adicionar novos nós imediatamente.

## Contribuição

Contribuições de todos os tamanhos são bem-vindas! Por favor, leia nosso [Guia de Contribuição](../../../CONTRIBUTING.md) para começar.

---

## Licença

Licenciado sob a **GNU General Public License v3.0** — veja [LICENSE](../../../LICENSE) para detalhes.

Mantido por [promovaweb.com](https://promovaweb.com) · <contato@promovaweb.com>

---
