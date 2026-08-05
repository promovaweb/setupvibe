# SetupVibe — Édition Bureau

> Configuration de l'environnement de développement multiplateforme — v0.41.11

Installe et configure un stack complet de développeur en une seule commande. Supporte macOS et les principales distributions Linux.

## Configuration Requise

|                   | Supporté                        |
| ----------------- | ------------------------------- |
| **macOS**          | 12 Monterey et plus récent      |
| **Ubuntu**         | 24.04+                          |
| **Debian**         | 12+                             |
| **Zorin OS**       | 18+                             |
| **Linux Mint**     | 21+                             |
| **Architectures**  | x86_64 (amd64), ARM64 (aarch64) |

> Ne **pas** exécuter avec `sudo` sur macOS — Homebrew refusera de s'installer en tant que root. Exécutez normalement et le script vous demandera votre mot de passe si nécessaire.

## Installation

```bash
curl -sSL desktop.setupvibe.dev | bash
```

Ou localement :

```bash
bash desktop.sh
```

Le script affiche une feuille de route interactive et demande confirmation avant de commencer. Il propose également de configurer l'identité Git si elle n'est pas déjà définie.

---

## Ce qui est installé

**14 étapes, entièrement automatisées.**

### Étape 1 — Système de Base et Outils de Build

**Linux :** installation via APT — `build-essential`, `git`, `wget`, `unzip`, `curl`, `tmux`, `ffmpeg`, `imagemagick`, bibliothèques SSL/compression et le dépôt APT Charmbracelet (pour `glow`).

**macOS :** repose sur les Xcode Command Line Tools (vérifie et quitte s'ils sont absents). Les outils de base sont installés via Homebrew à l'étape suivante.

### Étape 2 — Homebrew

- **macOS :** installe Homebrew s'il est absent, puis installe les outils de base (`wget`, `curl`, `tmux`, `ffmpeg`, `imagemagick`, `openssl`, `readline`, etc.)
- **Linux :** installe Linuxbrew sous `/home/linuxbrew/.linuxbrew` ; ajoute les entrées PATH à `~/.bashrc`, `~/.profile`, `~/.zshrc` ; exécute `brew upgrade` s'il est déjà présent

### Étape 3 — Écosystème PHP 8.5

| Composant          | macOS                                       | Linux                                                                                               |
| ------------------ | ------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| PHP 8.5            | via Homebrew                                | via PPA ondrej/php (Ubuntu) ou sury.org (Debian)                                                    |
| Extensions         | redis, xdebug, imagick via PECL             | php8.5-{curl,mbstring,xml,zip,bcmath,intl,mysql,pgsql,sqlite3,gd,imagick,redis,mongodb,yaml,xdebug} |
| Composer           | via Homebrew                                | binaire dans `~/.local/bin/composer`                                                               |
| Installateur Laravel | `composer global require laravel/installer` | identique                                                                                           |

### Étape 4 — Écosystème Ruby

| Composant       | macOS                       | Linux                                   |
| --------------- | --------------------------- | --------------------------------------- |
| rbenv           | via Homebrew                | cloné depuis GitHub vers `~/.rbenv`     |
| ruby-build      | via Homebrew                | cloné vers `~/.rbenv/plugins/ruby-build` |
| Ruby            | 3.4.10 compilé via rbenv    | identique                               |
| Bundler + Rails | `gem install bundler rails` | identique                               |

### Étape 5 — Langages

| Langage  | macOS                      | Linux                                              |
| -------- | -------------------------- | -------------------------------------------------- |
| Python 3 | `python@3.14` via Homebrew | via APT (`python3`, `python3-pip`, `python3-venv`) |
| uv       | via script d'installation  | identique                                          |
| qrcode   | `pip --user`; CLI `qr`     | identique                                          |
| Go       | via Homebrew               | binaire 1.26.5 vérifié dans `~/.local/go`          |
| Rust     | via rustup                 | identique                                          |

### Étape 6 — JavaScript

| Outil      | macOS                     | Linux                   |
| ---------- | ------------------------- | ----------------------- |
| Node.js 24 | `node@24` via Homebrew    | via dépôt APT NodeSource |
| PNPM       | `npm install -g pnpm`     | identique               |
| PM2        | `npm install -g pm2`      | identique               |
| Bun        | via script d'installation  | identique               |

Sous Linux, les paquets npm globaux utilisent le préfixe accessible en écriture
`~/.npm-global` de l'utilisateur cible, même lorsque l'installateur est lancé
via `sudo`. PNPM, PM2 et Bun sont validés après l'installation.

### Étape 7 — DevOps

| Outil             | macOS                            | Linux                                                                        |
| ----------------- | -------------------------------- | ---------------------------------------------------------------------------- |
| Docker            | Docker Desktop via Homebrew Cask | docker-ce + docker-compose-plugin + docker-buildx-plugin via dépôt APT Docker |
| Ansible           | via Homebrew                     | via PPA ansible/ansible (Ubuntu) ou ansible-core (Debian)                    |
| GitHub CLI (`gh`) | via Homebrew                     | via dépôt APT GitHub                                                         |

### Étape 8 — Outils Unix Modernes

Installés via Homebrew sur les deux plateformes.

| Outil        | Description                             |
| ------------ | --------------------------------------- |
| `bat`        | `cat` avec coloration syntaxique        |
| `eza`        | Remplacement moderne de `ls`            |
| `zoxide`     | `cd` plus intelligent                   |
| `fzf`        | Recherche floue (avec raccourcis shell) |
| `ripgrep`    | Remplacement rapide de `grep`           |
| `fd`         | Remplacement rapide de `find`           |
| `lazygit`    | Interface terminal pour git             |
| `lazydocker` | Interface terminal pour Docker          |
| `neovim`     | Vim moderne                             |
| `glow`       | Rendu Markdown                          |
| `jq`         | Processeur JSON                         |
| `tldr`       | Pages simplifiées fournies par `tlrc`   |
| `fastfetch`  | Outil d'infos système                   |
| `duf`        | `df` moderne                            |
| `mise`       | Gestionnaire de versions de runtime     |

### Étape 9 — Réseau, Surveillance et Tailscale

**macOS :** `wget`, `nmap`, `mtr`, `htop`, `btop`, `glances`, `speedtest-cli` via Homebrew ; `bandwhich`, `gping`, `trippy`, `rustscan` via Cargo ; `ctop` via Homebrew ; Tailscale via Cask.

**Linux :** mêmes outils via APT + Cargo + binaire ctop vérifié par SHA-256 vers `~/.local/bin` ; Tailscale via le script d'installation officiel.

### Étape 10 — Serveur SSH *(Linux uniquement)*

- Installe `openssh-server`
- Active et démarre le service systemd `ssh`
- Configure `PermitRootLogin prohibit-password` et `PasswordAuthentication yes`
- Sauvegarde le `sshd_config` original avant modification

### Étape 11 — Shell (ZSH et Starship)

- Installe ZSH (Linux via APT ; déjà par défaut sur macOS)
- Installe Oh My Zsh (sans intervention)
- Clone les plugins `zsh-autosuggestions` et `zsh-syntax-highlighting`
- Installe les Nerd Fonts : **FiraCode** et **JetBrains Mono** (Homebrew Cask sur macOS ; v3.4.0 téléchargée vers `~/.local/share/fonts` sur Linux)
- Installe le prompt Starship et applique le preset **Gruvbox Rainbow**
- Télécharge les scripts auxiliaires depuis [`bin/`](../../../bin) vers `~/.setupvibe/bin` ; consultez [Exécutables](../../fr/EXECUTABLES.md)
- Télécharge le `.zshrc` approprié :
  - macOS → [`conf/zshrc-macos.zsh`](../../../conf/zshrc-macos.zsh)
  - Linux → [`conf/zshrc-linux.zsh`](../../../conf/zshrc-linux.zsh)

### Étape 12 — Tmux et Plugins

- Clone [TPM](https://github.com/tmux-plugins/tpm) vers `~/.tmux/plugins/tpm`
- Télécharge [`conf/tmux-desktop.conf`](../../../conf/tmux-desktop.conf) vers `~/.tmux.conf`
- Arrête toute session tmux en cours pour appliquer la nouvelle config

Appuyez sur `prefix + I` dans tmux pour installer tous les plugins. Voir [tmux.md](tmux.md) pour la référence complète des plugins et des raccourcis clavier.

### Étape 13 — Outils d'IA (CLI)

Installe les paquets npm globalement, ainsi que Herdr et Antigravity CLI
depuis leurs manifestes officiels de releases :

| Outil              | Installation                     |
| ------------------ | -------------------------------- |
| Agentlytics        | `agentlytics`                    |
| Claude Code        | `@anthropic-ai/claude-code`      |
| OpenAI Codex       | `@openai/codex`                  |
| GitHub Copilot CLI | `@github/copilot`                |
| OpenCode CLI       | `opencode-ai`                    |
| Skills CLI         | `skills`                         |
| Herdr              | Binaire du manifeste officiel    |
| Antigravity CLI    | Binaire du manifeste officiel    |

Chaque CLI répertorié est validé après l'installation. [Herdr](https://github.com/herdrdev/herdr) est installé dans `~/.local/bin` selon le système d'exploitation et l'architecture détectés ; consultez le [guide Herdr](../../fr/HERDR.md) pour les sessions, les raccourcis, les mises à jour et le dépannage. Antigravity CLI est installé dans `~/.local/bin` sous le nom `agy` : le manifeste versionné et le checksum SHA-512 du flux officiel de releases de Google sont résolus et vérifiés directement (le bootstrapper officiel Unix ne transmet pas `--skip-aliases`/`--skip-path` à son étape interne `agy install`), puis `agy install --skip-aliases --skip-path` est exécuté explicitement pour ne pas modifier les profils shell. **Spec-Kit** est installé via `uv tool install specify-cli`. Consultez [SPECKIT.md](SPECKIT.md) pour le guide complet du Spec-Driven Development et les alias.

### Étape 14 — Finalisation et Nettoyage

**macOS :** `brew cleanup --prune=all`, `brew autoremove` et supprime uniquement les fichiers temporaires de SetupVibe.

**Linux :** `apt autoremove`, `apt clean`, supprime les archives temporaires et nettoie les logs journal ; vide `~/.cache/pip`, `~/.cache/composer`, `~/.npm/_npx`, `~/.bundle/cache`.

**Les deux :** configure le démarrage automatique de PM2 (launchd sur macOS, systemd sur Linux), exécute `pm2 save`, définit `pm2:autodump true` et télécharge `ecosystem.config.js` avec des tentatives HTTPS limitées vers `~/ecosystem.config.js`.

Voir [pm2.md](pm2.md) pour la référence complète de PM2.

---

## Configuration du Shell

Chaque plateforme reçoit un `.zshrc` dédié :

| Fichier                                               | Plateforme | Chemins clés                                 |
| ----------------------------------------------------- | ---------- | -------------------------------------------- |
| [`zshrc-macos.zsh`](../../../conf/zshrc-macos.zsh)    | macOS      | Homebrew, Cargo, Composer, Go, Bun           |
| [`zshrc-linux.zsh`](../../../conf/zshrc-linux.zsh)    | Linux      | Linuxbrew, npm-global, Cargo, Go, Bun, rbenv |

### Alias

| Alias      | Commande                                                                                 |
| ---------- | ---------------------------------------------------------------------------------------- |
| `reload`   | `source ~/.zshrc`                                                                        |
| `zconfig`  | `nano ~/.zshrc`                                                                          |
| `ssh_copy_id` | `ssh_copy_id --host HOTE --user UTILISATEUR [--pass MOT_DE_PASSE]`                    |
| `update`   | `brew update && brew upgrade` (macOS) / `sudo apt update && sudo apt upgrade` (Linux)      |
| `brewup`   | `brew update && brew upgrade && brew cleanup`                                            |
| `cc`       | `claude --permission-mode=auto --dangerously-skip-permissions`                        |
| `skl`      | `skills list`                                                                         |
| `skf`      | `skills find`                                                                         |
| `ska`      | `skills add`                                                                          |
| `sku`      | `skills update`                                                                       |
| `d`        | `docker`                                                                              |

| `dc`       | `docker compose`                                                                         |
| `art`      | `php artisan`                                                                            |
| `syslog`   | `sudo journalctl -f` *(Linux uniquement)*                                                |
| `ports`    | `ss -tulnp` *(Linux uniquement)*                                                         |
| `meminfo`  | `free -h` *(Linux uniquement)*                                                           |
| `diskinfo` | `df -h` *(Linux uniquement)*                                                             |
| `cpuinfo`  | `lscpu` *(Linux uniquement)*                                                             |

### Plugins Oh My Zsh

`git rsync cp extract zoxide fzf zsh-autosuggestions zsh-syntax-highlighting brew gh ansible docker docker-compose laravel composer rails ruby python pip node npm bun golang rust` + `macos` (macOS uniquement) / `nmap tmux` (Linux uniquement)

## Contribution

Toutes les contributions de toutes tailles sont les bienvenues ! Veuillez lire notre [Guide de Contribution](../../../CONTRIBUTING.md) pour commencer.

---

## Licence

Sous licence **GNU General Public License v3.0** — voir [LICENSE](../../../LICENSE) pour plus de détails.

Maintenu par [promovaweb.com](https://promovaweb.com) · <contato@promovaweb.com>

---
