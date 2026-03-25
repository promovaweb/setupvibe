# SetupVibe — Édition Server

> Configuration de serveur Linux — v0.36.0

Un script de configuration léger et ciblé pour les serveurs Linux. Pas de Homebrew, pas d'écosystèmes de langages, pas d'outils desktop. Installe uniquement ce dont un serveur de production a besoin : Docker, Ansible, réseau, shell, tmux et outils IA via CLI.

## Configuration Requise

|                   | Supporté                        |
| ----------------- | ------------------------------- |
| **Ubuntu**        | 24.04+                          |
| **Debian**        | 12+                             |
| **Zorin OS**      | 18+                             |
| **Linux Mint**    | 21+                             |
| **Architectures** | x86_64 (amd64), ARM64 (aarch64) |

> Linux uniquement. Le script s'arrête immédiatement s'il est exécuté sur macOS.

## Installation

```bash
curl -sSL server.setupvibe.dev | bash
```

Ou localement :

```bash
bash server.sh
```

Le script attend que tout verrou APT en cours soit libéré (utile sur les VMs cloud neuves où `unattended-upgrades` s'exécute au boot), affiche une feuille de route interactive, puis demande confirmation. Il propose également de configurer l'identité Git si elle n'est pas déjà définie.

---

## Ce qui est installé

**9 étapes, entièrement automatisées.**

### Étape 1 — Système de base et outils de compilation

Installe via APT :

- `build-essential`, `git`, `wget`, `unzip`, `curl`, `tmux`, `fontconfig`, `sshpass`
- Bibliothèques SSL/compression : `libssl-dev`, `zlib1g-dev`, `libbz2-dev`, `libreadline-dev`, `libsqlite3-dev`, `libncurses5-dev`, `xz-utils`, `libffi-dev`, `liblzma-dev`, `libyaml-dev`
- Python : `python3`, `python3-pip`, `python3-venv`, `python-is-python3`
- Daemons système : `cron`, `logrotate`, `rsyslog`
- Gestionnaire de paquets Python [uv](https://github.com/astral-sh/uv) (installé dans `~/.local/bin`)

### Étape 2 — Docker, Ansible et GitHub CLI

**Docker** — installé depuis le dépôt APT officiel de Docker :

- `docker-ce`, `docker-ce-cli`, `containerd.io`, `docker-compose-plugin`, `docker-buildx-plugin`
- L'utilisateur est ajouté au groupe `docker`

**Ansible :**

- Ubuntu → via PPA `ansible/ansible`
- Debian → `ansible-core` depuis APT

**GitHub CLI (`gh`)** — via le dépôt APT officiel de GitHub

### Étape 3 — Réseau, Surveillance et Tailscale

Paquets APT :
`rsync`, `net-tools`, `dnsutils`, `mtr-tiny`, `nmap`, `tcpdump`, `iftop`, `nload`, `iotop`, `sysstat`, `whois`, `iputils-ping`, `speedtest-cli`, `glances`, `htop`, `btop`

- **ctop** — binaire téléchargé dans `~/.local/bin/ctop` (v0.7.7, adapté à l'architecture)
- **Tailscale** — via le script d'installation officiel (`https://tailscale.com/install.sh`)

### Étape 4 — Serveur SSH

- Installe `openssh-server` et `openssh-client`
- Active et démarre le service systemd `ssh`
- Sauvegarde le `/etc/ssh/sshd_config` original
- Configure `PermitRootLogin yes` et `PasswordAuthentication yes`
- Valide la config avec `sshd -t` avant de redémarrer ; restaure la sauvegarde si la validation échoue

### Étape 5 — Shell (ZSH et Starship)

- Installe ZSH via APT
- Installe Oh My Zsh (sans intervention)
- Clone `zsh-autosuggestions` et `zsh-syntax-highlighting`
- Installe le prompt Starship dans `~/.local/bin` et applique le preset **Gruvbox Rainbow**
- Télécharge [`conf/zshrc-server.zsh`](../../../conf/zshrc-server.zsh) vers `~/.zshrc`
- Définit ZSH comme shell par défaut via `chsh`

#### Alias du Shell

| Alias          | Commande                              |
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

### Étape 6 — Tmux et Plugins

- Clone [TPM](https://github.com/tmux-plugins/tpm) vers `~/.tmux/plugins/tpm`
- Télécharge [`conf/tmux-server.conf`](../../../conf/tmux-server.conf) vers `~/.tmux.conf`
- Si exécuté en root avec un `REAL_HOME` non-root, installe aussi dans `/root/.tmux.conf`
- Arrête toute session tmux en cours pour appliquer la nouvelle config

Appuyez sur `prefix + I` dans tmux pour installer tous les plugins. Voir le [Guide Tmux](../../desktop/fr/tmux.md) pour la référence complète des plugins et raccourcis.

### Étape 7 — Outils CLI IA

Installe **Node.js 24** via le dépôt APT NodeSource, puis installe globalement via `npm install -g` :

| Outil              | Paquet                           |
| ------------------ | -------------------------------- |
| Claude Code        | `@anthropic-ai/claude-code`      |
| Gemini CLI         | `@google/gemini-cli`             |
| OpenAI Codex       | `@openai/codex`                  |
| GitHub Copilot CLI | `@githubnext/github-copilot-cli` |

Les paquets globaux npm sont installés dans `~/.npm-global` (configuré avec `npm config set prefix`) lorsqu'il n'est pas exécuté en tant que root.

### Étape 8 — Finalisation & Nettoyage

- APT : `autoremove`, `autoclean`, `clean`, supprime `/var/lib/apt/lists/*`
- Supprime les fichiers temporaires : `/tmp/ctop`, `/tmp/starship`
- Nettoie les journaux journalctl de plus de 7 jours
- Efface les caches utilisateur : `~/.cache/pip`, `~/.npm/_npx`, `~/.bundle/cache`, `~/.cache/composer`

---

## Licence

Sous licence **GNU General Public License v3.0** — voir [LICENSE](../../LICENSE) pour plus de détails.

Maintenu par [promovaweb.com](https://promovaweb.com) · <contato@promovaweb.com>

---
> Follow the formatting guide: [Markdown Format Guide](.claude/commands/markdown-format.md)
