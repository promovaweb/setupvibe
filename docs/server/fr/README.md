# SetupVibe — Édition Serveur

> Configuration de serveur Linux — v0.41.11

Un script de configuration léger et ciblé pour les serveurs Linux. Pas de Homebrew, pas d'écosystèmes de langages, pas d'outils de bureau. Installe uniquement ce dont un serveur de production a besoin : Docker, Ansible, réseau, shell, tmux et outils AI CLI.

## Configuration Requise

|                   | Supporté                        |
| ----------------- | ------------------------------- |
| **Ubuntu**        | 24.04+                          |
| **Debian**        | 12+                             |
| **Zorin OS**      | 18+                             |
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

Pour initialiser Docker Swarm automatiquement après le setup, passez `--manager` :

```bash
curl -sSL server.setupvibe.dev | bash -s -- --manager
```

```bash
bash server.sh --manager
```

Pour une installation sans interaction, ajoutez `--yes`. Pour choisir explicitement l'adresse ou l'interface Swarm, utilisez `--advertise-addr ADRESSE` ; cette option implique `--manager`.

Le script valide le système d'exploitation, la version, l'architecture, l'utilisateur cible et les arguments avant de modifier le système. Il affiche ensuite une feuille de route interactive, demande confirmation, attend jusqu'à cinq minutes la libération des verrous APT et réessaie les commandes APT en échec. Les étapes s'arrêtent à la première erreur, le résumé identifie celles qui n'ont pas été exécutées et le script renvoie un statut différent de zéro. Si `--manager` n'est pas fourni, les installations interactives demandent à la fin si Docker Swarm doit être configuré.

---

## Ce qui est installé

**9 étapes entièrement automatisées (Étapes 0–8), plus une Étape 9 optionnelle pour la configuration du Docker Swarm Manager.**

### Étape 0 — Prérequis et Vérification de l'Architecture

Indique le système d'exploitation validé, la base des dépôts de la distribution, l'architecture du processeur, l'utilisateur cible et son répertoire personnel avant le début de l'installation.

### Étape 1 — Outils du système de base

Installe via APT :

- Utilitaires principaux : `curl`, `file`, `figlet`, `fontconfig`, `fzf`, `git`, `gnupg`, `iproute2`, `jq`, `nano`, `procps`, `psmisc`, `sshpass`, `tmux`, `unzip`, `wget`
- Services système : `cron`, `logrotate`, `rsyslog`
- **zoxide** via son installateur officiel
- Active `cron` sans créer de tâches et supprime uniquement les anciennes tâches de démonstration ajoutées par SetupVibe v0.41.4-v0.41.6

### Étape 2 — Docker, Ansible et GitHub CLI

**Docker** — installé depuis le dépôt APT officiel de Docker :

- `docker-ce`, `docker-ce-cli`, `containerd.io`, `docker-compose-plugin`, `docker-buildx-plugin`
- L'utilisateur est ajouté au groupe `docker`

**Ansible :**

- Ubuntu → via PPA `ansible/ansible`
- Debian → `ansible-core` depuis APT

**GitHub CLI (`gh`)** — via le dépôt APT officiel de GitHub

**Portainer CE** — utilise le canal d'image `lts` et expose HTTPS sur le port `9443` ; le port HTTP historique `9000` et le port optionnel `8000` pour Edge Agent ne sont pas ouverts

### Étape 3 — Réseau, Surveillance et Tailscale

Paquets APT :
`rsync`, `net-tools`, `dnsutils`, `mtr-tiny`, `nmap`, `tcpdump`, `iftop`, `nload`, `iotop`, `sysstat`, `whois`, `iputils-ping`, `speedtest-cli`, `glances`, `htop`, `btop`

- **ctop** — binaire téléchargé dans `~/.local/bin/ctop` (v0.7.7, adapté à l'architecture, SHA-256 vérifié)
- **Tailscale** — via le script d'installation officiel (`https://tailscale.com/install.sh`)

### Étape 4 — Serveur SSH

- Installe `openssh-server` et `openssh-client`
- Active et démarre le service systemd `ssh`
- Valide la configuration effective avec `sshd -t`
- Préserve la politique d'authentification existante ; n'active ni la connexion root ni l'authentification par mot de passe

### Étape 5 — Shell (ZSH et Starship)

- Installe ZSH via APT
- Installe Oh My Zsh (sans intervention)
- Clone `zsh-autosuggestions` et `zsh-syntax-highlighting`
- Installe le prompt Starship dans `~/.local/bin` et applique le preset **Gruvbox Rainbow**
- Télécharge les scripts auxiliaires depuis [`bin/`](../../../bin) vers `~/.setupvibe/bin` ; consultez [Exécutables](../../fr/EXECUTABLES.md)
- Télécharge [`conf/zshrc-server.zsh`](../../../conf/zshrc-server.zsh) vers `~/.zshrc`
- Préserve une fois les fichiers `.zshrc`, `.bashrc` et `.tmux.conf` existants avec le suffixe `.pre-setupvibe` avant de les remplacer ou d'y ajouter du contenu
- Définit ZSH comme shell par défaut via `chsh`

#### Alias du Shell

| Alias          | Commande                                                          |
| -------------- | ----------------------------------------------------------------- |
| `reload`       | `source ~/.zshrc`                                                 |
| `zconfig`      | `nano ~/.zshrc`                                                   |
| `ssh_copy_id`   | `ssh_copy_id --host HOTE --user UTILISATEUR [--pass MOT_DE_PASSE]` |
| `update`       | `sudo apt update && sudo apt upgrade`                             |
| `cc`           | `claude --permission-mode=auto --dangerously-skip-permissions`    |
| `skl`          | `skills list`                                                     |
| `skf`          | `skills find`                                                     |
| `ska`          | `skills add`                                                      |
| `sku`          | `skills update`                                                   |
| `skun`         | `skills remove`                                                   |
| `d`            | `docker`                                                          |
| `dc`           | `docker compose`                                                  |
| `syslog`       | `sudo journalctl -f`                                              |
| `ports`        | `ss -tulnp`                                                       |
| `meminfo`      | `free -h`                                                         |
| `diskinfo`     | `df -h`                                                           |
| `cpuinfo`      | `lscpu`                                                           |
| `wholistening` | `ss -tulnp`                                                       |

#### Plugins Oh My Zsh

`git rsync nmap cp extract zoxide fzf zsh-autosuggestions zsh-syntax-highlighting tmux gh ansible docker docker-compose`

### Étape 6 — Tmux et Plugins

- Clone [TPM](https://github.com/tmux-plugins/tpm) vers `~/.tmux/plugins/tpm`
- Télécharge [`conf/tmux-server.conf`](../../../conf/tmux-server.conf) vers `~/.tmux.conf`
- Si exécuté en root avec un `REAL_HOME` non-root, installe aussi dans `/root/.tmux.conf`
- Préserve les sessions tmux en cours ; la nouvelle configuration s'applique aux nouvelles sessions

Appuyez sur `prefix + I` dans tmux pour installer tous les plugins. Voir le [Guide Tmux](../../desktop/fr/tmux.md) pour la référence complète des plugins et raccourcis.

### Étape 7 — Outils CLI IA

Installe **Node.js 24** depuis le dépôt APT NodeSource, installe les paquets npm globalement et récupère Herdr depuis son manifeste officiel de releases :

| Outil              | Installation                     |
| ------------------ | -------------------------------- |
| Claude Code        | `@anthropic-ai/claude-code`      |
| OpenAI Codex       | `@openai/codex`                  |
| GitHub Copilot CLI | `@github/copilot`                |
| OpenCode CLI       | `opencode-ai`                    |
| Skills CLI         | `skills`                         |
| Herdr              | Binaire du manifeste officiel    |

Le [CLI Skills de Vercel Labs](https://github.com/vercel-labs/skills), [Herdr](https://github.com/herdrdev/herdr) et chaque commande CLI d'IA sont validés après l'installation. Herdr est installé dans `~/.local/bin` selon l'architecture détectée ; consultez le [guide Herdr](../../fr/HERDR.md) pour les sessions, les raccourcis, les mises à jour et le dépannage. Le paquet obsolète `@githubnext/github-copilot-cli` est supprimé. Les paquets globaux npm sont installés dans `~/.npm-global` chaque fois que l'utilisateur cible n'est pas root, y compris lorsque l'installateur est exécuté avec `sudo`.

### Étape 8 — Finalisation & Nettoyage

- Exécute `autoclean` et `clean` d'APT
- Supprime les listes de paquets téléchargées par APT
- Préserve les paquets installés, les journaux système et les caches utilisateur

### Étape 9 — Docker Swarm Manager (optionnel)

Activé en passant `--manager` ou en répondant **oui** au prompt interactif affiché en fin de setup.

1. **Détecte l'adresse IPv4 routable principale** à partir de la table de routage locale, sans contacter de services IP externes. Utilisez `--advertise-addr ADRESSE` pour indiquer une adresse ou une interface précise.
2. **Initialise Docker Swarm** avec `docker swarm init --advertise-addr <ADRESSE>`. Idempotent — ignore l'initialisation si la machine est déjà manager et échoue clairement si elle est déjà worker.
3. **Crée le réseau overlay** `network_swarm_public` avec `--driver overlay --attachable`. Idempotent — ignoré si le réseau existe déjà.
4. **Affiche les tokens de rejoindre** pour les rôles worker et manager, permettant d'ajouter de nouveaux nœuds immédiatement.

## Contribution

Toutes les contributions de toutes tailles sont les bienvenues ! Veuillez lire notre [Guide de Contribution](../../../CONTRIBUTING.md) pour commencer.

---

## Licence

Sous licence **GNU General Public License v3.0** — voir [LICENSE](../../../LICENSE) pour plus de détails.

Maintenu par [promovaweb.com](https://promovaweb.com) · <contato@promovaweb.com>

---
