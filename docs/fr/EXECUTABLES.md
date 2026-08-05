# Exécutables SetupVibe

> Scripts exécutables auxiliaires — v0.41.11

SetupVibe conserve les scripts auxiliaires réutilisables dans le répertoire [`bin/`](../../bin) du dépôt. Pendant l'installation, les éditions Desktop et Server téléchargent ces fichiers directement depuis le dépôt vers `~/.setupvibe/bin` et les rendent exécutables.

## Emplacement d'Installation

| Fichier source | Chemin installé | Éditions |
| -------------- | --------------- | -------- |
| [`bin/ssh_copy_id`](../../bin/ssh_copy_id) | `~/.setupvibe/bin/ssh_copy_id` | Desktop et Server |

L'alias du shell pointe vers l'exécutable installé :

```bash
alias ssh_copy_id="$HOME/.setupvibe/bin/ssh_copy_id"
```

Les installateurs téléchargent le fichier depuis :

```text
https://raw.githubusercontent.com/promovaweb/setupvibe/main/bin/ssh_copy_id
```

## `ssh_copy_id`

Copie votre clé SSH publique locale vers un serveur distant avec authentification par mot de passe. Il crée `~/.ssh/authorized_keys` sur le serveur distant si nécessaire, applique des permissions sûres et évite d'ajouter deux fois la même clé.

### Prérequis

- `ssh`
- `sshpass`
- Une clé SSH publique locale, généralement l'une de celles-ci :
  - `~/.ssh/id_ed25519.pub`
  - `~/.ssh/id_rsa.pub`
  - `~/.ssh/id_ecdsa.pub`

### Utilisation

```bash
ssh_copy_id --host HOTE --user UTILISATEUR [--pass MOT_DE_PASSE] [--key ~/.ssh/id_ed25519.pub] [--port 22]
```

### Arguments

| Argument | Obligatoire | Par défaut | Description |
| -------- | ----------- | ---------- | ----------- |
| `--host` | Oui | aucun | Nom d'hôte ou adresse IP du serveur distant. |
| `--user` | Oui | aucun | Utilisateur SSH distant. |
| `--pass` | Non | invite | Mot de passe SSH distant. S'il est omis, le script le demande avec une saisie masquée. |
| `--key` | Non | détection automatique | Fichier de clé publique à copier. Un chemin de clé privée sans `.pub` est accepté si le fichier `.pub` correspondant existe. |
| `--port` | Non | `22` | Port SSH distant. |
| `-h`, `--help` | Non | aucun | Affiche l'aide d'utilisation. |

### Exemples

Demander le mot de passe de façon sûre :

```bash
ssh_copy_id --host 192.0.2.10 --user root
```

Passer le mot de passe inline :

```bash
ssh_copy_id --host 192.0.2.10 --user root --pass 'secret'
```

Utiliser une clé publique et un port SSH personnalisés :

```bash
ssh_copy_id --host 192.0.2.10 --user deploy --key ~/.ssh/id_rsa.pub --port 2222
```

### Comportement

- Utilise `sshpass -e` pour passer le mot de passe via la variable d'environnement `SSHPASS` plutôt que comme argument direct de `sshpass`.
- Utilise `StrictHostKeyChecking=accept-new` pour accepter une nouvelle clé d'hôte lors de la première connexion tout en rejetant les clés modifiées.
- Désactive l'authentification par clé publique pendant l'étape de copie afin d'utiliser le mot de passe fourni.
- Définit les permissions distantes `700` pour `~/.ssh` et `600` pour `authorized_keys`.
- Vérifie une correspondance exacte avant d'ajouter la clé, donc les exécutions répétées sont idempotentes.

### Notes de Sécurité

Préférez omettre `--pass` pour que le script demande le mot de passe avec une saisie masquée. Passer `--pass` inline est pratique pour l'automatisation, mais peut exposer le mot de passe dans l'historique du shell ou dans les métadonnées de processus selon l'environnement.

### Dépannage

| Message | Cause | Correction |
| ------- | ----- | ---------- |
| `sshpass não encontrado` | `sshpass` n'est pas installé ou n'est pas dans le `PATH`. | Relancez SetupVibe ou installez `sshpass`. |
| `chave pública SSH não encontrada` | Aucune clé publique prise en charge n'a été trouvée. | Créez-en une avec `ssh-keygen -t ed25519 -C 'email@exemple.com'` ou utilisez `--key`. |
| `informe --pass ou execute em um terminal interativo` | La commande a été exécutée sans `--pass` dans un contexte non interactif. | Passez `--pass` ou exécutez depuis un terminal interactif. |
| `Falha ao adicionar a chave SSH` | La connexion SSH ou la commande distante a échoué. | Vérifiez l'hôte, l'utilisateur, le mot de passe, le port et si l'authentification par mot de passe est activée sur le serveur. |

## Ajouter de Nouveaux Exécutables

Lors de l'ajout d'un autre exécutable auxiliaire :

1. Ajoutez le script dans `bin/`.
2. Gardez le shebang sur la ligne 1.
3. Ajoutez un en-tête avec nom, auteur, version, description et exemples d'utilisation.
4. Rendez-le exécutable avec `chmod +x`.
5. Ajoutez une référence directe `safe_download` dans `desktop.sh` et `server.sh`.
6. Ajoutez ou mettez à jour les alias dans `conf/zshrc-*.zsh`.
7. Documentez-le dans ce fichier et mettez à jour la référence des alias si nécessaire.
8. Validez avec `bash -n`, `zsh -n` et `markdownlint`.
