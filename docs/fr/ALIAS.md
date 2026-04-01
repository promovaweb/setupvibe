# Aliases SetupVibe

Voici la liste exhaustive de tous les aliases configurés par SetupVibe sur toutes les plateformes.

**Légende de Disponibilité :**
- 🖥️ **Desktop** : Disponible dans l'édition Desktop (macOS et Linux Desktop).
- ☁️ **Server** : Disponible dans l'édition Server (Linux).
- 🌐 **Les deux** : Disponible dans toutes les éditions.

---

## SetupVibe

- **`setupvibe`**
  - Disponibilité : 🌐 Les deux
  - Commande : `curl -sSL desktop.setupvibe.dev | bash` (Desktop) / `curl -sSL server.setupvibe.dev | bash` (Server)
  - Description : Réinstalle ou met à jour SetupVibe.
  - Exemple : `setupvibe`

## CLIs d'IA

- **`ge`**
  - Disponibilité : 🌐 Les deux
  - Commande : `gemini --approval-mode=yolo`
  - Description : Gemini CLI sans confirmations.
  - Exemple : `ge`

- **`cc`**
  - Disponibilité : 🌐 Les deux
  - Commande : `claude --permission-mode=auto --dangerously-skip-permissions`
  - Description : Claude CLI sans confirmations.
  - Exemple : `cc`

## CLI Skills

- **`skl`**
  - Disponibilité : 🌐 Les dos
  - Commande : `npx skills list`
  - Description : Liste toutes les skills installées.
  - Exemple : `skl`

- **`skf`**
  - Disponibilité : 🌐 Les deux
  - Commande : `npx skills find`
  - Description : Recherche des skills dans le registre.
  - Exemple : `skf react`

- **`ska`**
  - Disponibilité : 🌐 Les deux
  - Commande : `npx skills add`
  - Description : Installe une nouvelle skill.
  - Exemple : `ska owner/repo`

- **`sku`**
  - Disponibilité : 🌐 Les deux
  - Commande : `npx skills update`
  - Description : Met à jour toutes les skills installées.
  - Exemple : `sku`

- **`skun`**
  - Disponibilité : 🌐 Les deux
  - Commande : `npx skills remove`
  - Description : Supprime une skill installée.
  - Exemple : `skun nom`

- **`skc`**
  - Disponibilité : 🌐 Les deux
  - Commande : `npx skills check`
  - Description : Vérifie les mises à jour disponibles.
  - Exemple : `skc`

## Shell & Utilitaires

- **`zconfig`**
  - Disponibilité : 🌐 Les deux
  - Commande : `nano ~/.zshrc`
  - Description : Modifie le fichier de configuration ZSH.
  - Exemple : `zconfig`

- **`reload`**
  - Disponibilité : 🌐 Les deux
  - Commande : `source ~/.zshrc`
  - Description : Recharge les paramètres ZSH sans redémarrer le terminal.
  - Exemple : `reload`

- **`path`**
  - Disponibilité : 🌐 Les deux
  - Commande : `echo -e ${PATH//:/\\n}`
  - Description : Affiche chaque entrée du PATH sur une ligne séparée.
  - Exemple : `path`

- **`h`**
  - Disponibilité : 🌐 Les deux
  - Commande : `history | grep`
  - Description : Recherche dans l'historique des commandes.
  - Exemple : `h docker`

- **`cls`**
  - Disponibilité : 🌐 Les deux
  - Commande : `clear`
  - Description : Efface le terminal.
  - Exemple : `cls`

- **`please`**
  - Disponibilité : 🌐 Les deux
  - Commande : `sudo`
  - Description : Raccourci convivial pour sudo.
  - Exemple : `please apt update`

- **`week`**
  - Disponibilité : 🌐 Les deux
  - Commande : `date +%V`
  - Description : Affiche le numéro de la semaine actuelle.
  - Exemple : `week`

## Navigation & Système de fichiers

- **`..`**
  - Disponibilité : 🌐 Les deux
  - Commande : `cd ..`
  - Description : Remonte d'un niveau de répertoire.
  - Exemple : `..`

- **`...`**
  - Disponibilité : 🌐 Les deux
  - Commande : `cd ../..`
  - Description : Remonte de deux niveaux de répertoire.
  - Exemple : `...`

- **`....`**
  - Disponibilité : 🌐 Les deux
  - Commande : `cd ../../..`
  - Description : Remonte de trois niveaux de répertoire.
  - Exemple : `....`

- **`ll`**
  - Disponibilité : 🌐 Les deux
  - Commande : `ls -lhA` (macOS) / `ls -lhA --color=auto` (Linux)
  - Description : Liste les fichiers avec détails et taille lisible.
  - Exemple : `ll`

- **`la`**
  - Disponibilité : 🌐 Les deux
  - Commande : `ls -A` (macOS) / `ls -A --color=auto` (Linux)
  - Description : Liste tous les fichiers, y compris les fichiers cachés.
  - Exemple : `la`

- **`lsd`**
  - Disponibilité : 🌐 Les deux
  - Commande : `ls -d */ 2>/dev/null`
  - Description : Liste uniquement les répertoires.
  - Exemple : `lsd`

- **`md`**
  - Disponibilité : 🌐 Les deux
  - Commande : `mkdir -p`
  - Description : Crée automatiquement un répertoire et ses sous-répertoires.
  - Exemple : `md projet/src/css`

- **`rmf`**
  - Disponibilité : 🌐 Les deux
  - Commande : `rm -rf`
  - Description : Supprime récursivement les fichiers et répertoires sans confirmation.
  - Exemple : `rmf vieux_dossier`

- **`du1`**
  - Disponibilité : 🌐 Les deux
  - Commande : `du -h -d 1` (macOS) / `du -h --max-depth=1` (Linux)
  - Description : Utilisation du disque du répertoire actuel, sur un niveau.
  - Exemple : `du1`

## Tmux

- **`t`**
  - Disponibilité : 🌐 Les deux
  - Commande : `tmux`
  - Description : Raccourci pour tmux.
  - Exemple : `t`

- **`tn`**
  - Disponibilité : 🌐 Les deux
  - Commande : `tmux new -s`
  - Description : Crée une nouvelle session tmux.
  - Exemple : `tn mon-projet`

- **`ta`**
  - Disponibilité : 🌐 Les deux
  - Commande : `tmux attach -t`
  - Description : Se reconnecte à une session existante.
  - Exemple : `ta mon-projet`

- **`tl`**
  - Disponibilité : 🌐 Les deux
  - Commande : `tmux ls`
  - Description : Liste toutes les sessions tmux actives.
  - Exemple : `tl`

- **`tk`**
  - Disponibilité : 🌐 Les deux
  - Commande : `tmux kill-session -t`
  - Description : Termine une session tmux.
  - Exemple : `tk mon-projet`

- **`tka`**
  - Disponibilité : 🌐 Les deux
  - Commande : `tmux kill-server`
  - Description : Termine toutes les sessions tmux.
  - Exemple : `tka`

- **`td`**
  - Disponibilité : 🌐 Les deux
  - Commande : `tmux detach`
  - Description : Se déconnecte de la session sans la terminer.
  - Exemple : `td`

- **`tw`**
  - Disponibilité : 🌐 Les deux
  - Commande : `tmux new-window`
  - Description : Crée une nouvelle fenêtre dans la session actuelle.
  - Exemple : `tw`

- **`ts`**
  - Disponibilité : 🌐 Les deux
  - Commande : `tmux split-window -v`
  - Description : Divise le panneau horizontalement (nouveau panneau en dessous).
  - Exemple : `ts`

- **`tsh`**
  - Disponibilité : 🌐 Les deux
  - Commande : `tmux split-window -h`
  - Description : Divise le panneau verticalement (nouveau panneau à droite).
  - Exemple : `tsh`

- **`trename`**
  - Disponibilité : 🌐 Les deux
  - Commande : `tmux rename-session`
  - Description : Renomme la session actuelle.
  - Exemple : `trename nouveau-nom`

- **`twrename`**
  - Disponibilité : 🌐 Les deux
  - Commande : `tmux rename-window`
  - Description : Renomme la fenêtre actuelle.
  - Exemple : `twrename editeur`

- **`treload`**
  - Disponibilité : 🌐 Les deux
  - Commande : `tmux source ~/.tmux.conf`
  - Description : Recharge les paramètres tmux.
  - Exemple : `treload`

- **`tconfig`**
  - Disponibilité : 🌐 Les deux
  - Commande : `nano ~/.tmux.conf`
  - Description : Modifie le fichier de configuration tmux.
  - Exemple : `tconfig`

## Git

- **`gs`**
  - Disponibilité : 🌐 Les deux
  - Commande : `git status`
  - Description : Affiche l'état actuel du dépôt.
  - Exemple : `gs`

- **`ga`**
  - Disponibilité : 🌐 Les deux
  - Commande : `git add`
  - Description : Ajoute des fichiers à l'index (staging).
  - Exemple : `ga fichier.txt`

- **`gaa`**
  - Disponibilité : 🌐 Les deux
  - Commande : `git add .`
  - Description : Ajoute tous les fichiers modifiés à l'index.
  - Exemple : `gaa`

- **`gc`**
  - Disponibilité : 🌐 Les deux
  - Commande : `git commit`
  - Description : Ouvre l'éditeur pour écrire le message de commit.
  - Exemple : `gc`

- **`gcm`**
  - Disponibilité : 🌐 Les deux
  - Commande : `git commit -m`
  - Description : Commit avec message en ligne.
  - Exemple : `gcm 'fix: typo'`

- **`gco`**
  - Disponibilité : 🌐 Les deux
  - Commande : `git checkout`
  - Description : Change de branche ou restaure des fichiers.
  - Exemple : `gco main`

- **`gcb`**
  - Disponibilité : 🌐 Les deux
  - Commande : `git checkout -b`
  - Description : Crée et change pour une nouvelle branche.
  - Exemple : `gcb feature/nouvelle-fonction`

- **`gp`**
  - Disponibilité : 🌐 Les deux
  - Commande : `git push`
  - Description : Envoie les commits vers le dépôt distant.
  - Exemple : `gp`

- **`gpl`**
  - Disponibilité : 🌐 Les deux
  - Commande : `git pull`
  - Description : Télécharge et intègre les modifications du dépôt distant.
  - Exemple : `gpl`

- **`gf`**
  - Disponibilité : 🌐 Les deux
  - Commande : `git fetch`
  - Description : Récupère les mises à jour du distant sans les appliquer.
  - Exemple : `gf`

- **`gfa`**
  - Disponibilité : 🌐 Les deux
  - Commande : `git fetch --all --prune`
  - Description : Récupère de tous les distants et supprime les branches supprimées.
  - Exemple : `gfa`

- **`gm`**
  - Disponibilité : 🌐 Les deux
  - Commande : `git merge`
  - Description : Fusionne une branche.
  - Exemple : `gm feature/x`

- **`grb`**
  - Disponibilité : 🌐 Les deux
  - Commande : `git rebase`
  - Description : Réapplique les commits sur une autre base.
  - Exemple : `grb main`

- **`gcp`**
  - Disponibilité : 🌐 Les deux
  - Commande : `git cherry-pick`
  - Description : Applique un commit spécifique sur la branche actuelle.
  - Exemple : `gcp abc123`

- **`gl`**
  - Disponibilité : 🌐 Les deux
  - Commande : `git log --oneline --graph --decorate`
  - Description : Log compact avec graphe de branches.
  - Exemple : `gl`

- **`glamelog`**
  - Disponibilité : 🌐 Les deux
  - Commande : `git log --pretty=format:"%h %ad %s" --date=short`
  - Description : Log compact avec dates.
  - Exemple : `glamelog`

- **`gd`**
  - Disponibilité : 🌐 Les deux
  - Commande : `git diff`
  - Description : Affiche les différences non indexées.
  - Exemple : `gd`

- **`gds`**
  - Disponibilité : 🌐 Les deux
  - Commande : `git diff --staged`
  - Description : Affiche les différences déjà indexées.
  - Exemple : `gds`

- **`gb`**
  - Disponibilité : 🌐 Les deux
  - Commande : `git branch`
  - Description : Liste les branches locales.
  - Exemple : `gb`

- **`gba`**
  - Disponibilité : 🌐 Les deux
  - Commande : `git branch -a`
  - Description : Liste toutes les branches, y compris distantes.
  - Exemple : `gba`

- **`gbd`**
  - Disponibilité : 🌐 Les deux
  - Commande : `git branch -d`
  - Description : Supprime une branche locale.
  - Exemple : `gbd feature/x`

- **`gtag`**
  - Disponibilité : 🌐 Les deux
  - Commande : `git tag`
  - Description : Crée ou liste des tags.
  - Exemple : `gtag v1.0.0`

- **`gclone`**
  - Disponibilité : 🌐 Les deux
  - Commande : `git clone`
  - Description : Clone un dépôt.
  - Exemple : `gclone https://github.com/utilisateur/depot.git`

- **`gst`**
  - Disponibilité : 🌐 Les deux
  - Commande : `git stash`
  - Description : Sauvegarde temporairement les modifications dans un stash.
  - Exemple : `gst`

- **`gstp`**
  - Disponibilité : 🌐 Les deux
  - Commande : `git stash pop`
  - Description : Restaure les dernières modifications du stash.
  - Exemple : `gstp`

- **`grh`**
  - Disponibilité : 🌐 Les deux
  - Commande : `git reset HEAD~1`
  - Description : Annule le dernier commit en conservant les modifications.
  - Exemple : `grh`

- **`gundo`**
  - Disponibilité : 🌐 Les deux
  - Commande : `git restore .`
  - Description : Annule toutes les modifications non indexées.
  - Exemple : `gundo`

- **`gwip`**
  - Disponibilité : 🌐 Les deux
  - Commande : `git add -A && git commit -m "WIP"`
  - Description : Sauvegarde rapidement le travail en cours.
  - Exemple : `gwip`

## GitHub CLI

- **`ghpr`**
  - Disponibilité : 🌐 Les deux
  - Commande : `gh pr create`
  - Description : Ouvre un assistant pour créer une Pull Request.
  - Exemple : `ghpr`

- **`ghprl`**
  - Disponibilité : 🌐 Les deux
  - Commande : `gh pr list`
  - Description : Liste les Pull Requests ouvertes.
  - Exemple : `ghprl`

- **`ghprv`**
  - Disponibilité : 🌐 Les deux
  - Commande : `gh pr view`
  - Description : Affiche les détails de la PR actuelle.
  - Exemple : `ghprv`

- **`ghprc`**
  - Disponibilité : 🌐 Les deux
  - Commande : `gh pr checkout`
  - Description : Effectue le checkout d'une PR par numéro.
  - Exemple : `ghprc 42`

- **`ghprs`**
  - Disponibilité : 🌐 Les deux
  - Commande : `gh pr status`
  - Description : État des PR liées à la branche actuelle.
  - Exemple : `ghprs`

- **`ghrl`**
  - Disponibilité : 🌐 Les deux
  - Commande : `gh repo list`
  - Description : Liste les dépôts de l'utilisateur authentifié.
  - Exemple : `ghrl`

- **`ghrc`**
  - Disponibilité : 🌐 Les deux
  - Commande : `gh repo clone`
  - Description : Clone un dépôt.
  - Exemple : `ghrc owner/repo`

- **`ghiss`**
  - Disponibilité : 🌐 Les deux
  - Commande : `gh issue list`
  - Description : Liste les issues ouvertes du dépôt.
  - Exemple : `ghiss`

- **`ghissn`**
  - Disponibilité : 🌐 Les deux
  - Commande : `gh issue create`
  - Description : Ouvre un assistant pour créer une nouvelle issue.
  - Exemple : `ghissn`

- **`ghrun`**
  - Disponibilité : 🌐 Les deux
  - Commande : `gh run list`
  - Description : Liste les exécutions de CI/CD GitHub Actions.
  - Exemple : `ghrun`

- **`ghrunw`**
  - Disponibilité : 🌐 Les deux
  - Commande : `gh run watch`
  - Description : Suit l'exécution du workflow en temps réel.
  - Exemple : `ghrunw`

- **`ghwf`**
  - Disponibilité : 🌐 Les deux
  - Commande : `gh workflow list`
  - Description : Liste les workflows GitHub Actions.
  - Exemple : `ghwf`

- **`ghwfr`**
  - Disponibilité : 🌐 Les deux
  - Commande : `gh workflow run`
  - Description : Lance un workflow manuellement.
  - Exemple : `ghwfr deploy.yml`

- **`ghrel`**
  - Disponibilité : 🌐 Les deux
  - Commande : `gh release list`
  - Description : Liste les releases du dépôt.
  - Exemple : `ghrel`

- **`ghrelc`**
  - Disponibilité : 🌐 Les deux
  - Commande : `gh release create`
  - Description : Crée une nouvelle release.
  - Exemple : `ghrelc v1.0.0`

- **`ghgist`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `gh gist create`
  - Description : Crée un Gist à partir d'un fichier.
  - Exemple : `ghgist fichier.sh`

- **`ghssh`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `gh ssh-key list`
  - Description : Liste les clés SSH enregistrées sur le compte GitHub.
  - Exemple : `ghssh`

## SSH

- **`ssha`**
  - Disponibilité : 🌐 Les deux
  - Commande : `ssh-add`
  - Description : Ajoute une clé SSH à l'agent.
  - Exemple : `ssha ~/.ssh/id_ed25519`

- **`sshal`**
  - Disponibilité : 🌐 Les deux
  - Commande : `ssh-add -l`
  - Description : Liste les clés chargées dans l'agent SSH.
  - Exemple : `sshal`

- **`sshkeys`**
  - Disponibilité : 🌐 Les deux
  - Commande : `ls -la ~/.ssh/`
  - Description : Liste tous les fichiers de clés SSH.
  - Exemple : `sshkeys`

- **`sshconfig`**
  - Disponibilité : 🌐 Les deux
  - Commande : `nano ~/.ssh/config`
  - Description : Modifie le fichier de configuration SSH.
  - Exemple : `sshconfig`

- **`keygen`**
  - Disponibilité : 🌐 Les deux
  - Commande : `ssh-keygen -t ed25519 -C`
  - Description : Génère une nouvelle clé SSH Ed25519.
  - Exemple : `keygen 'email@x.com'`

## Docker

- **`d`**
  - Disponibilité : 🌐 Les deux
  - Commande : `docker`
  - Description : Raccourci pour la commande docker.
  - Exemple : `d ps`

- **`dc`**
  - Disponibilité : 🌐 Les deux
  - Commande : `docker compose`
  - Description : Raccourci pour docker compose.
  - Exemple : `dc up -d`

- **`dps`**
  - Disponibilité : 🌐 Les deux
  - Commande : `docker ps`
  - Description : Liste les conteneurs en cours d'exécution.
  - Exemple : `dps`

- **`dpsa`**
  - Disponibilité : 🌐 Les deux
  - Commande : `docker ps -a`
  - Description : Liste tous les conteneurs, y compris ceux arrêtés.
  - Exemple : `dpsa`

- **`dimg`**
  - Disponibilité : 🌐 Les deux
  - Commande : `docker images`
  - Description : Liste les images Docker disponibles localement.
  - Exemple : `dimg`

- **`dlog`**
  - Disponibilité : 🌐 Les deux
  - Commande : `docker logs -f`
  - Description : Suit les logs d'un conteneur.
  - Exemple : `dlog mon-conteneur`

- **`dex`**
  - Disponibilité : 🌐 Les deux
  - Commande : `docker exec -it`
  - Description : Exécute une commande interactive dans un conteneur.
  - Exemple : `dex app bash`

- **`dstart`**
  - Disponibilité : 🌐 Les deux
  - Commande : `docker start`
  - Description : Démarre un conteneur arrêté.
  - Exemple : `dstart mon-conteneur`

- **`dstop`**
  - Disponibilité : 🌐 Les deux
  - Commande : `docker stop`
  - Description : Arrête un conteneur en cours d'exécution.
  - Exemple : `dstop mon-conteneur`

- **`drm`**
  - Disponibilité : 🌐 Les deux
  - Commande : `docker rm`
  - Description : Supprime un conteneur.
  - Exemple : `drm mon-conteneur`

- **`drmi`**
  - Disponibilité : 🌐 Les deux
  - Commande : `docker rmi`
  - Description : Supprime une image.
  - Exemple : `drmi mon-image`

- **`dpull`**
  - Disponibilité : 🌐 Les deux
  - Commande : `docker pull`
  - Description : Télécharge une image depuis un registre.
  - Exemple : `dpull nginx:alpine`

- **`dbuild`**
  - Disponibilité : 🌐 Les deux
  - Commande : `docker build -t`
  - Description : Construit une image avec un tag.
  - Exemple : `dbuild app:latest .`

- **`dstats`**
  - Disponibilité : 🌐 Les deux
  - Commande : `docker stats`
  - Description : Surveille l'utilisation CPU/mémoire des conteneurs en temps réel.
  - Exemple : `dstats`

- **`dins`**
  - Disponibilité : 🌐 Les deux
  - Commande : `docker inspect`
  - Description : Inspecte les détails d'un conteneur ou d'une image.
  - Exemple : `dins app`

- **`dip`**
  - Disponibilité : 🌐 Les deux
  - Commande : `docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}'`
  - Description : Récupère l'IP du conteneur.
  - Exemple : `dip app`

- **`dnet`**
  - Disponibilité : 🌐 Les deux
  - Commande : `docker network ls`
  - Description : Liste les réseaux Docker disponibles.
  - Exemple : `dnet`

- **`dvol`**
  - Disponibilité : 🌐 Les deux
  - Commande : `docker volume ls`
  - Description : Liste les volumes Docker créés.
  - Exemple : `dvol`

- **`dprune`**
  - Disponibilité : 🌐 Les deux
  - Commande : `docker system prune -af --volumes`
  - Description : Supprime toutes les ressources Docker inutilisées.
  - Exemple : `dprune`

- **`dcup`**
  - Disponibilité : 🌐 Les deux
  - Commande : `docker compose up -d`
  - Description : Lance les services en arrière-plan.
  - Exemple : `dcup`

- **`dcdown`**
  - Disponibilité : 🌐 Les deux
  - Commande : `docker compose down`
  - Description : Arrête et supprime les conteneurs du compose.
  - Exemple : `dcdown`

- **`dcstop`**
  - Disponibilité : 🌐 Les deux
  - Commande : `docker compose stop`
  - Description : Arrête les services sans supprimer les conteneurs.
  - Exemple : `dcstop`

- **`dcrestart`**
  - Disponibilité : 🌐 Les deux
  - Commande : `docker compose restart`
  - Description : Redémarre tous les services du compose.
  - Exemple : `dcrestart`

- **`dcps`**
  - Disponibilité : 🌐 Les deux
  - Commande : `docker compose ps`
  - Description : Liste les services du compose et leurs états.
  - Exemple : `dcps`

- **`dclog`**
  - Disponibilité : 🌐 Les deux
  - Commande : `docker compose logs -f`
  - Description : Suit les logs de tous les services du compose.
  - Exemple : `dclog`

- **`dclogs`**
  - Disponibilité : 🌐 Les deux
  - Commande : `docker compose logs --tail=100`
  - Description : Affiche les 100 dernières lignes des logs du compose.
  - Exemple : `dclogs`

- **`dcbuild`**
  - Disponibilité : 🌐 Les deux
  - Commande : `docker compose build --no-cache`
  - Description : Reconstruit les images sans cache.
  - Exemple : `dcbuild`

- **`dcpull`**
  - Disponibilité : 🌐 Les deux
  - Commande : `docker compose pull`
  - Description : Met à jour les images des services du compose.
  - Exemple : `dcpull`

- **`dcexec`**
  - Disponibilité : 🌐 Les deux
  - Commande : `docker compose exec`
  - Description: Exécute une commande dans un service.
  - Exemple: `dcexec app bash`

  ## Portainer

  - **`portainer-start`**
  - Disponibilité : 🌐 Les deux
  - Commande : `docker compose -f ~/.setupvibe/portainer-compose.yml up -d`
  - Description : Démarre le conteneur Portainer.
  - Exemple : `portainer-start`

  - **`portainer-stop`**
  - Disponibilité : 🌐 Les deux
  - Commande : `docker compose -f ~/.setupvibe/portainer-compose.yml stop`
  - Description : Arrête le conteneur Portainer.
  - Exemple : `portainer-stop`

  - **`portainer-restart`**
  - Disponibilité : 🌐 Les deux
  - Commande : `docker compose -f ~/.setupvibe/portainer-compose.yml restart`
  - Description : Redémarre le conteneur Portainer.
  - Exemple : `portainer-restart`

  - **`portainer-update`**
  - Disponibilité : 🌐 Les deux
  - Commande : `docker compose -f ~/.setupvibe/portainer-compose.yml pull && docker compose -f ~/.setupvibe/portainer-compose.yml up -d`
  - Description : Met à jour l'image et redémarre Portainer.
  - Exemple : `portainer-update`

  ## PM2

  - **`p`**
    - Disponibilité : 🌐 Les deux
    - Commande : `pm2`
    - Description : Raccourci pour a commande PM2.
    - Exemple : `p list`

  - **`p-start`**
    - Disponibilité : 🌐 Les deux
    - Commande : `pm2 start ~/ecosystem.config.js`
    - Description : Démarre toutes les applications définies dans le fichier ecosystem global.
    - Exemple : `p-start`

  - **`p-stop`**
    - Disponibilité : 🌐 Les deux
    - Commande : `pm2 stop ~/ecosystem.config.js`
    - Description : Arrête toutes les applications définies dans le fichier ecosystem.
    - Exemple : `p-stop`

  - **`p-restart`**
    - Disponibilité : 🌐 Les deux
    - Commande : `pm2 restart ~/ecosystem.config.js`
    - Description : Redémarre toutes les applications définies dans le fichier ecosystem.
    - Exemple : `p-restart`

  - **`pl`**  - Disponibilité : 🌐 Les deux
  - Commande : `pm2 list`
  - Description : Liste tous les processus gérés par PM2.
  - Exemple : `pl`

  - **`psave`**
  - Disponibilité : 🌐 Les deux
  - Commande : `pm2 save`
  - Description : Sauvegarde la liste des processus pour restauration au démarrage.
  - Exemple : `psave`

  - **`plog`**
  - Disponibilité : 🌐 Les deux
  - Commande : `pm2 logs`
  - Description : Suit les logs de tous les processus en temps réel.
  - Exemple : `plog`

  ## Agentlytics

  - **`agl-start`**
  - Disponibilité : 🌐 Les deux
  - Commande : `pm2 start agentlytics`
  - Description : Démarre le processus Agentlytics dans PM2.
  - Exemple : `agl-start`

  - **`agl-stop`**
  - Disponibilité : 🌐 Les deux
  - Commande : `pm2 stop agentlytics`
  - Description : Arrête le processus Agentlytics.
  - Exemple : `agl-stop`

  - **`agl-restart`**
  - Disponibilité : 🌐 Les deux
  - Commande : `pm2 restart agentlytics`
  - Description : Redémarre le processus Agentlytics.
  - Exemple : `agl-restart`

  - **`agl-logs`**
  - Disponibilité : 🌐 Les deux
  - Commande : `pm2 logs agentlytics`
  - Description : Affiche les logs spécifiques à Agentlytics.
  - Exemple : `agl-logs`

  ## Gestionnaires de Paquets
- **`update`**
  - Disponibilité : 🌐 Les deux
  - Commande : `brew update && brew upgrade` (macOS) / `sudo apt update...` (Linux)
  - Description : Met à jour le système et les gestionnaires de paquets.
  - Exemple : `update`

- **`apti`**
  - Disponibilité : ☁️ Server / 🖥️ Desktop Linux
  - Commande : `sudo apt install`
  - Description : Installe un paquet via APT.
  - Exemple : `apti htop`

- **`aptr`**
  - Disponibilité : ☁️ Server / 🖥️ Desktop Linux
  - Commande : `sudo apt remove`
  - Description : Supprime un paquet via APT.
  - Exemple : `aptr htop`

- **`apts`**
  - Disponibilité : ☁️ Server / 🖥️ Desktop Linux
  - Commande : `apt search`
  - Description : Recherche des paquets dans les dépôts APT.
  - Exemple : `apts nginx`

- **`aptshow`**
  - Disponibilité : ☁️ Server / 🖥️ Desktop Linux
  - Commande : `apt show`
  - Description : Affiche les détails d'un paquet APT.
  - Exemple : `aptshow git`

- **`aptls`**
  - Disponibilité : ☁️ Server / 🖥️ Desktop Linux
  - Commande : `dpkg -l | grep`
  - Description : Filtre les paquets installés.
  - Exemple : `aptls nginx`

- **`brewup`**
  - Disponibilité : 🖥️ Desktop / ☁️ Server si installé
  - Commande : `brew update && brew upgrade && brew cleanup`
  - Description : Met à jour Homebrew et supprime les anciennes versions.
  - Exemple : `brewup`

- **`brewls`**
  - Disponibilité : 🖥️ Desktop / ☁️ Server si installé
  - Commande : `brew list`
  - Description : Liste tous les paquets installés via Homebrew.
  - Exemple : `brewls`

- **`brewinfo`**
  - Disponibilité : 🖥️ Desktop / ☁️ Server si installé
  - Commande : `brew info`
  - Description : Affiche les informations d'un paquet.
  - Exemple : `brewinfo git`

- **`brewsearch`**
  - Disponibilité : 🖥️ Desktop / ☁️ Server si installé
  - Commande : `brew search`
  - Description : Recherche des paquets dans Homebrew.
  - Exemple : `brewsearch ripgrep`

## Langages & Frameworks (🖥️ Desktop)

### Laravel / PHP
- **`art`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `php artisan`
  - Description : Raccourci pour PHP Artisan.
  - Exemple : `art list`

- **`artm`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `php artisan migrate`
  - Description : Exécute les migrations en attente.
  - Exemple : `artm`

- **`artmf`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `php artisan migrate:fresh`
  - Description : Recrée toutes les tables à zéro.
  - Exemple : `artmf`

- **`artmfs`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `php artisan migrate:fresh --seed`
  - Description : Recrée les tables et les peuple avec les seeders.
  - Exemple : `artmfs`

- **`arts`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `php artisan serve`
  - Description : Lance le serveur de développement Laravel.
  - Exemple : `arts`

- **`artq`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `php artisan queue:work`
  - Description : Lance le worker de files d'attente.
  - Exemple : `artq`

- **`artc`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `php artisan cache:clear && php artisan config:clear && php artisan route:clear && php artisan view:clear`
  - Description : Efface tous les caches Laravel.
  - Exemple : `artc`

- **`artt`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `php artisan test`
  - Description : Exécute la suite de tests Laravel.
  - Exemple : `artt`

- **`artmake`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `php artisan make`
  - Description : Raccourci pour la génération de code.
  - Exemple : `artmake:controller UserController`

- **`artr`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `php artisan route:list`
  - Description : Liste toutes les routes de l'application.
  - Exemple : `artr`

- **`arttink`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `php artisan tinker`
  - Description : Ouvre le REPL interactif de Laravel.
  - Exemple : `arttink`

- **`artkey`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `php artisan key:generate`
  - Description : Génère une nouvelle clé d'application.
  - Exemple : `artkey`

- **`artopt`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `php artisan optimize:clear`
  - Description : Efface tous les caches et optimisations.
  - Exemple : `artopt`

- **`artschedule`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `php artisan schedule:work`
  - Description : Lance le worker des tâches planifiées.
  - Exemple : `artschedule`

- **`artdb`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `php artisan db`
  - Description : Ouvre une connexion interactive à la base de données.
  - Exemple : `artdb`

- **`artmodel`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `php artisan make:model`
  - Description : Crée un Modèle.
  - Exemple : `artmodel Post -m`

- **`artjob`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `php artisan make:job`
  - Description : Crée un Job pour les files d'attente.
  - Exemple : `artjob ProcessPayment`

- **`artevent`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `php artisan event:list`
  - Description : Liste tous les événements et listeners enregistrés.
  - Exemple : `artevent`

- **`ci`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `composer install`
  - Description : Installe les dépendances du composer.json.
  - Exemple : `ci`

- **`cu`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `composer update`
  - Description : Met à jour les dépendances selon les versions autorisées.
  - Exemple : `cu`

- **`creq`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `composer require`
  - Description : Ajoute un paquet.
  - Exemple : `creq vendor/paquet`

- **`creqd`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `composer require --dev`
  - Description : Ajoute un paquet comme dev-dependency.
  - Exemple : `creqd phpunit/phpunit`

- **`cdump`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `composer dump-autoload`
  - Description : Régénère l'autoload de Composer.
  - Exemple : `cdump`

- **`crun`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `composer run`
  - Description : Exécute un script du composer.json.
  - Exemple : `crun dev`

### Node / JavaScript
- **`ni`**
  - Disponibilité : 🌐 Les deux
  - Commande : `npm install`
  - Description : Installe toutes les dépendances du package.json.
  - Exemple : `ni`

- **`nid`**
  - Disponibilité : 🌐 Les dos
  - Commande : `npm install --save-dev`
  - Description : Installe un paquet comme dépendance de développement.
  - Exemple : `nid typescript`

- **`nr`**
  - Disponibilité : 🌐 Les deux
  - Commande : `npm run`
  - Description : Exécute un script du package.json.
  - Exemple : `nr build`

- **`nrd`**
  - Disponibilité : 🌐 Les deux
  - Commande : `npm run dev`
  - Description : Lance le serveur de développement.
  - Exemple : `nrd`

- **`nrb`**
  - Disponibilité : 🌐 Les deux
  - Commande : `npm run build`
  - Description : Exécute le build de production.
  - Exemple : `nrb`

- **`nrt`**
  - Disponibilité : 🌐 Les deux
  - Commande : `npm run test`
  - Description : Exécute les tests.
  - Exemple : `nrt`

- **`nx`**
  - Disponibilité : 🌐 Les deux
  - Commande : `npx`
  - Description : Exécute un paquet Node sans l'installer globalement.
  - Exemple : `nx create-react-app my-app`

- **`bi`**
  - Disponibilité : 🌐 Les deux
  - Commande : `bun install`
  - Description : Installe les dépendances avec Bun.
  - Exemple : `bi`

- **`br`**
  - Disponibilité : 🌐 Les deux
  - Commande : `bun run`
  - Description : Exécute un script avec Bun.
  - Exemple : `br dev`

- **`brd`**
  - Disponibilité : 🌐 Les deux
  - Commande : `bun run dev`
  - Description : Lance le dev server avec Bun.
  - Exemple : `brd`

- **`brb`**
  - Disponibilité : 🌐 Les deux
  - Commande : `bun run build`
  - Description : Build de production avec Bun.
  - Exemple : `brb`

- **`bx`**
  - Disponibilité : 🌐 Les deux
  - Commande : `bunx`
  - Description : Exécute un paquet sans installer, via Bun.
  - Exemple : `bx cowsay hello`

- **`pn`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `pnpm`
  - Description : Raccourci pour pnpm.
  - Exemple : `pn add axios`

- **`pni`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `pnpm install`
  - Description : Installe les dépendances avec pnpm.
  - Exemple : `pni`

- **`pnr`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `pnpm run`
  - Description : Exécute un script du package.json via pnpm.
  - Exemple : `pnr build`

- **`pnd`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `pnpm run dev`
  - Description : Lance le dev server avec pnpm.
  - Exemple : `pnd`

- **`pnb`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `pnpm run build`
  - Description : Build de production avec pnpm.
  - Exemple : `pnb`

- **`pnt`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `pnpm run test`
  - Description : Exécute les tests avec pnpm.
  - Exemple : `pnt`

- **`pnx`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `pnpm dlx`
  - Description : Exécute un paquet sans l'installer via pnpm.
  - Exemple : `pnx create-next-app`

- **`pnadd`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `pnpm add`
  - Description : Ajoute une dépendance avec pnpm.
  - Exemple : `pnadd axios`

- **`pnaddd`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `pnpm add -D`
  - Description : Ajoute une dev-dependency avec pnpm.
  - Exemple : `pnaddd vitest`

### Python / uv
- **`py`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `python3`
  - Description : Raccourci pour Python 3.
  - Exemple : `py main.py`

- **`pyv`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `python3 --version`
  - Description : Affiche la version active de Python.
  - Exemple : `pyv`

- **`uvi`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `uv pip install`
  - Description : Installe un paquet Python avec uv.
  - Exemple : `uvi requests`

- **`uvs`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `uv run`
  - Description : Exécute un script avec uv.
  - Exemple : `uvs main.py`

- **`venv`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `python3 -m venv .venv && source .venv/bin/activate`
  - Description : Crée et active un virtualenv local.
  - Exemple : `venv`

- **`activate`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `source .venv/bin/activate`
  - Description : Active le virtualenv local du répertoire.
  - Exemple : `activate`

### Ruby / rbenv
- **`rbv`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `rbenv versions`
  - Description : Liste les versions de Ruby installées via rbenv.
  - Exemple : `rbv`

- **`rblocal`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `rbenv local`
  - Description : Définit la version de Ruby pour le répertoire actuel.
  - Exemple : `rblocal 3.2.0`

- **`rbglobal`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `rbenv global`
  - Description : Définit la version globale de Ruby.
  - Exemple : `rbglobal 3.2.0`

- **`be`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `bundle exec`
  - Description : Exécute une commande dans le contexte de Bundler.
  - Exemple : `be rails s`

- **`binstall`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `bundle install`
  - Description : Installe les gems du Gemfile.
  - Exemple : `binstall`

- **`bupdate`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `bundle update`
  - Description : Met à jour les gems du Gemfile.
  - Exemple : `bupdate`

### Rust / Cargo
- **`cb`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `cargo build`
  - Description : Compile le projet Rust en mode debug.
  - Exemple : `cb`

- **`cbr`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `cargo build --release`
  - Description : Compile en mode release optimisé.
  - Exemple : `cbr`

- **`crun2`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `cargo run`
  - Description : Compile et lance le projet Rust.
  - Exemple : `crun2`

- **`ct`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `cargo test`
  - Description : Exécute les tests du projet.
  - Exemple : `ct`

- **`ccheck`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `cargo check`
  - Description : Vérifie les erreurs sans générer de binaire.
  - Exemple : `ccheck`

- **`clippy`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `cargo clippy`
  - Description : Exécute le linter Rust.
  - Exemple : `clippy`

- **`cfmt`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `cargo fmt`
  - Description : Formate le code avec rustfmt.
  - Exemple : `cfmt`

- **`cadd`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `cargo add`
  - Description : Ajoute une dépendance au projet Rust.
  - Exemple : `cadd serde`

- **`crem`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `cargo remove`
  - Description : Supprime une dépendance du projet Rust.
  - Exemple : `crem serde`

- **`cupdate`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `cargo update`
  - Description : Met à jour toutes les dépendances du Cargo.lock.
  - Exemple : `cupdate`

- **`cdoc`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `cargo doc --open`
  - Description : Génère et ouvre la documentation du projet dans le navigateur.
  - Exemple : `cdoc`

### Go
- **`gobuild`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `go build ./...`
  - Description : Compile tous les paquets du projet Go.
  - Exemple : `gobuild`

- **`gorun`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `go run .`
  - Description : Exécute le paquet principal.
  - Exemple : `gorun`

- **`gotest`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `go test ./...`
  - Description : Exécute tous les tests du projet.
  - Exemple : `gotest`

- **`gomod`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `go mod tidy`
  - Description : Supprime les dépendances inutilisées du go.mod.
  - Exemple : `gomod`

- **`govet`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `go vet ./...`
  - Description : Vérifie les problèmes courants dans le code Go.
  - Exemple : `govet`

- **`gofmt`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `gofmt -w .`
  - Description : Formate tous les fichiers Go du répertoire.
  - Exemple : `gofmt`

- **`goget`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `go get`
  - Description : Ajoute une dépendance au projet Go.
  - Exemple : `goget github.com/gin-gonic/gin`

- **`goclean`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `go clean -cache`
  - Description : Supprime le cache de build de Go.
  - Exemple : `goclean`

- **`gocover`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `go test ./... -coverprofile=coverage.out && go tool cover -html=coverage.out`
  - Description : Couverture HTML.
  - Exemple : `gocover`

- **`gowork`**
  - Disponibilité : 🖥️ Desktop
  - Commande : `go work`
  - Description : Gère les workspaces Go.
  - Exemple : `gowork use ./pkg`

## DevOps & Système

- **`anp`**
  - Disponibilité : 🌐 Les deux
  - Commande : `ansible-playbook`
  - Description : Exécute un playbook.
  - Exemple : `anp site.yml -i hosts`

- **`ani`**
  - Disponibilité : 🌐 Les deux
  - Commande : `ansible-inventory --list`
  - Description : Affiche l'inventaire au format JSON.
  - Exemple : `ani`

- **`anping`**
  - Disponibilité : 🌐 Les deux
  - Commande : `ansible all -m ping`
  - Description : Teste la connectivité avec tous les hôtes.
  - Exemple : `anping`

- **`anv`**
  - Disponibilité : 🌐 Les deux
  - Commande : `ansible-vault`
  - Description : Gère les fichiers chiffrés avec Vault.
  - Exemple : `anv edit secrets.yml`

- **`anve`**
  - Disponibilité : 🌐 Les deux
  - Commande : `ansible-vault encrypt`
  - Description : Chiffre un fichier avec Vault.
  - Exemple : `anve secrets.yml`

- **`anvd`**
  - Disponibilité : 🌐 Les deux
  - Commande : `ansible-vault decrypt`
  - Description : Déchiffre un fichier avec Vault.
  - Exemple : `anvd secrets.yml`

- **`anvr`**
  - Disponibilité : 🌐 Les deux
  - Commande : `ansible-vault rekey`
  - Description : Rechiffre avec un nouveau mot de passe.
  - Exemple : `anvr secrets.yml`

- **`ancheck`**
  - Disponibilité : 🌐 Les deux
  - Commande : `ansible-playbook --check`
  - Description : Simule l'exécution du playbook sans appliquer de changements.
  - Exemple : `ancheck site.yml`

- **`andiff`**
  - Disponibilité : 🌐 Les deux
  - Commande : `ansible-playbook --check --diff`
  - Description : Simule et affiche le diff des changements qui seraient appliqués.
  - Exemple : `andiff site.yml`

- **`anfacts`**
  - Disponibilité : 🌐 Les deux
  - Commande : `ansible all -m setup`
  - Description : Collecte les facts de tous les hôtes de l'inventaire.
  - Exemple : `anfacts`

### Cron & Planification

- **`cronb`**
  - Disponibilité : 🌐 Les deux
  - Commande : `cronboard`
  - Description : Ouvre le tableau de bord Cronboard TUI pour gérer les tâches cron.
  - Exemple : `cronb`

- **`cronl`**
  - Disponibilité : 🌐 Les deux
  - Commande : `crontab -l`
  - Description : Liste les tâches cron de l'utilisateur actuel.
  - Exemple : `cronl`

- **`crone`**
  - Disponibilité : 🌐 Les deux
  - Commande : `crontab -e`
  - Description : Modifie les tâches cron de l'utilisateur actuel.
  - Exemple : `crone`

- **`cronr`**
  - Disponibilité : 🌐 Les deux
  - Commande : `crontab -r`
  - Description : Supprime toutes les tâches cron de l'utilisateur actuel (ATTENTION).
  - Exemple : `cronr`

### Surveillance & Processus
- **`topc`**
  - Disponibilité : 🌐 Les deux
  - Commande : `top -o cpu` (macOS) / `top -bn1 | head -20` (Linux)
  - Description : Surveille les processus triés par utilisation CPU.
  - Exemple : `topc`

- **`topm`**
  - Disponibilité : 🖥️ Desktop macOS
  - Commande : `top -o mem`
  - Description : Surveille les processus triés par utilisation mémoire.
  - Exemple : `topm`

- **`psg`**
  - Disponibilité : 🌐 Les deux
  - Commande : `ps aux | grep`
  - Description : Recherche des processus par nom.
  - Exemple : `psg nginx`

- **`df`**
  - Disponibilité : 🌐 Les deux
  - Commande : `df -h`
  - Description : Utilisation du disque avec tailles lisibles.
  - Exemple : `df`

- **`meminfo`**
  - Disponibilité : ☁️ Server / 🖥️ Desktop Linux
  - Commande : `free -h`
  - Description : Affiche l'utilisation de la mémoire RAM et du swap.
  - Exemple : `meminfo`

- **`diskinfo`**
  - Disponibilité : ☁️ Server / 🖥️ Desktop Linux
  - Commande : `df -h`
  - Description : Affiche l'utilisation du disque de toutes les partitions.
  - Exemple : `diskinfo`

- **`cpuinfo`**
  - Disponibilité : ☁️ Server / 🖥️ Desktop Linux
  - Commande : `lscpu`
  - Description : Affiche des informations détaillées sur le CPU.
  - Exemple : `cpuinfo`

- **`sysinfo`**
  - Disponibilité : ☁️ Server / 🖥️ Desktop Linux
  - Commande : `hostnamectl`
  - Description : Affiche les informations du système d'exploitation et du nom d'hôte.
  - Exemple : `sysinfo`

### Systemd (Linux)
- **`sstatus`**
  - Disponibilité : ☁️ Server / 🖥️ Desktop Linux
  - Commande : `sudo systemctl status`
  - Description : Affiche le statut d'un service.
  - Exemple : `sstatus nginx`

- **`sstart`**
  - Disponibilité : ☁️ Server / 🖥️ Desktop Linux
  - Commande : `sudo systemctl start`
  - Description : Démarre un service.
  - Exemple : `sstart nginx`

- **`sstop`**
  - Disponibilité : ☁️ Server / 🖥️ Desktop Linux
  - Commande : `sudo systemctl stop`
  - Description : Arrête un service.
  - Exemple : `sstop nginx`

- **`srestart`**
  - Disponibilité : ☁️ Server / 🖥️ Desktop Linux
  - Commande : `sudo systemctl restart`
  - Description : Redémarre un service.
  - Exemple : `srestart nginx`

- **`senable`**
  - Disponibilité : ☁️ Server / 🖥️ Desktop Linux
  - Commande : `sudo systemctl enable`
  - Description : Active un service au démarrage.
  - Exemple : `senable nginx`

- **`sdisable`**
  - Disponibilité : ☁️ Server / 🖥️ Desktop Linux
  - Commande : `sudo systemctl disable`
  - Description : Désactive un service au démarrage.
  - Exemple : `sdisable nginx`

- **`slogs`**
  - Disponibilité : ☁️ Server / 🖥️ Desktop Linux
  - Commande : `sudo journalctl -u`
  - Description : Affiche les logs d'un service spécifique.
  - Exemple : `slogs nginx`

- **`syslog`**
  - Disponibilité : ☁️ Server / 🖥️ Desktop Linux
  - Commande : `sudo journalctl -f`
  - Description : Suit le log du système en temps réel.
  - Exemple : `syslog`

## Réseau & Web

- **`myip`**
  - Disponibilité : 🌐 Les deux
  - Commande : `curl -s ifconfig.me`
  - Description : Affiche l'IP publique de la machine.
  - Exemple : `myip`

- **`localip`**
  - Disponibilité : 🌐 Les deux
  - Commande : `ipconfig getifaddr en0` (macOS) / `hostname -I...` (Linux)
  - Description : Affiche l'IP locale principale de la machine.
  - Exemple : `localip`

- **`ports`**
  - Disponibilité : 🌐 Les deux
  - Commande : `lsof -iTCP -sTCP:LISTEN -n -P` (macOS) / `ss -tulnp` (Linux)
  - Description : Liste tous les ports en écoute.
  - Exemple : `ports`

- **`wholistening`**
  - Disponibilité : ☁️ Server / 🖥️ Desktop Linux
  - Commande : `ss -tulnp`
  - Description : Alias alternatif pour lister les ports en écoute.
  - Exemple : `wholistening`

- **`flush`**
  - Disponibilité : 🌐 Les deux
  - Commande : `dscacheutil...` (macOS) / `sudo systemd-resolve...` (Linux)
  - Description : Vide le cache DNS.
  - Exemple : `flush`

### cURL / HTTP
- **`get`**
  - Disponibilité : 🌐 Les deux
  - Commande : `curl -s`
  - Description : Requête GET simple.
  - Exemple : `get https://api.github.com`

- **`post`**
  - Disponibilité : 🌐 Les deux
  - Commande : `curl -s -X POST -H 'Content-Type: application/json'`
  - Description : Requête POST JSON simple.
  - Exemple : `post url -d '{"key":"val"}'`

- **`headers`**
  - Disponibilité : 🌐 Les deux
  - Commande : `curl -sI`
  - Description : Affiche uniquement les headers HTTP de la réponse.
  - Exemple : `headers google.com`

- **`httpcode`**
  - Disponibilité : 🌐 Les deux
  - Commande : `curl -o /dev/null -s -w '%{http_code}\n'`
  - Description : Affiche seulement le code HTTP de la réponse.
  - Exemple : `httpcode google.com`

- **`timing`**
  - Disponibilité : 🌐 Les deux
  - Commande : `curl -o /dev/null -s -w 'dns:%{time_namelookup}s...'`
  - Description : Informations détaillées sur la latence.
  - Exemple : `timing google.com`

### JSON / YAML
- **`jpp`**
  - Disponibilité : 🌐 Les deux
  - Commande : `python3 -m json.tool`
  - Description : Formate et valide le JSON.
  - Exemple : `cat data.json | jpp`

- **`jsonf`**
  - Disponibilité : 🌐 Les deux
  - Commande : `jq .`
  - Description : Formate le JSON avec des couleurs via jq.
  - Exemple : `cat data.json | jsonf`

### Sécurité & Certificats
- **`certinfo`**
  - Disponibilité : 🌐 Les deux
  - Commande : `openssl x509 -text -noout -in`
  - Description : Affiche les détails d'un certificat .pem.
  - Exemple : `certinfo cert.pem`

- **`certexpiry`**
  - Disponibilité : 🌐 Les deux
  - Commande : `openssl x509 -enddate -noout -in`
  - Description : Affiche la date d'expiration d'un certificat.
  - Exemple : `certexpiry cert.pem`

- **`sslcheck`**
  - Disponibilité : 🌐 Les deux
  - Commande : `openssl s_client -connect`
  - Description : Inspecte le TLS d'un hôte.
  - Exemple : `sslcheck google.com:443`

- **`genpass`**
  - Disponibilité : 🌐 Les deux
  - Commande : `openssl rand -base64 32`
  - Description : Génère un mot de passe aléatoire sécurisé de 32 octets.
  - Exemple : `genpass`

### Environnement
- **`envls`**
  - Disponibilité : 🌐 Les deux
  - Commande : `env | sort`
  - Description : Liste toutes les variables d'environnement triées.
  - Exemple : `envls`

- **`envg`**
  - Disponibilité : 🌐 Les deux
  - Commande : `env | grep`
  - Description : Filtre les variables d'environnement.
  - Exemple : `envg PATH`

- **`dotenv`**
  - Disponibilité : 🌐 Les deux
  - Commande : `export $(cat .env | grep -v '^#' | xargs)`
  - Description : Charge les variables du fichier .env actuel.
  - Exemple : `dotenv`

---
> Follow the formatting guide: [Markdown Format Guide](.claude/commands/markdown-format.md)
