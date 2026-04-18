# Guide de Contribution (FR)

Bienvenue dans le guide de contribution de **SetupVibe** ! Nous sommes ravis de vous avoir ici. Ce document décrit les normes et les flux de travail nécessaires pour contribuer à ce projet.

## 🚀 Commencer

1. **Forkez** le dépôt.
2. **Clonez** votre fork localement.
3. **Créez une branche** pour votre fonctionnalité ou correction (ex : `feat/nouvel-outil` ou `fix/lien-mort`).
4. **Implémentez** vos modifications en suivant les normes ci-dessous.
5. **Soumettez une Pull Request** avec une description claire de vos changements.

---

## 🛠 Normes de Code (Bash)

SetupVibe s'appuie sur deux scripts principaux : `desktop.sh` et `server.sh`. Tout le code Shell doit respecter ces modèles :

### 1. Élévation Inteligente des Privilèges

N'utilisez jamais `sudo` directement à l'intérieur des fonctions, sauf si cela est strictement nécessaire pour des raisons spécifiques. Utilisez nos fonctions auxiliaires :

- **`user_do`** : Exécute une commande en tant qu'utilisateur réel (même se le script a été lancé avec `sudo`). Utilisez ceci pour installer des outils dans `$HOME`, configurer Git ou gérer les dotfiles de l'utilisateur.
- **`sys_do`** : Exécute une commande avec des privilèges élevés. Utilisez ceci pour la gestion des paquets système (`apt`), la modification de `/etc` ou la gestion des services système.

### 2. Architecture Modulaire

Les scripts sont organisés en fonctions modulaires nommées `step_N`. Si vous ajoutez une nouvelle fonctionnalité :

1. Ajoutez le titre au tableau `STEPS`.
2. Créez une fonction `step_N` correspondante.
3. Assurez-vous que la logique gère à la fois **macOS (`$IS_MACOS`)** et **Linux (`$IS_LINUX`)** le cas échéant.

### 3. Idempotence

Les scripts doivent pouvoir être exécutés plusieurs fois en toute sécurité. Vérifiez toujours si un outil est déjà installé ou si une configuration existe déjà avant d'appliquer des changements.

### 4. Gestion des Keyrings (Linux)

N'utilisez pas `apt-key` (obsolète). Stockez toujours les clés GPG APT dans `/etc/apt/keyrings/` en utilisant les auxiliaires `install_key` ou `sys_do`.

---

## 📝 Normes de Documentation (Markdown)

Tous les fichiers `.md` doivent suivre strictement ces règles :

1. **Hiérarchie** : Utilisez des titres hiérarchiques (H1 → H2 → H3). Ne sautez jamais de niveaux.
2. **Tableaux** : Alignez les colonnes avec des pipes `|` et incluez une ligne de séparation `|---|`.
3. **Blocs de Code** : Spécifiez toujours la langue (ex : ` ```bash `).
4. **Liens** : Utilisez le format `[texte](url)`. Pas d'URLs nues.
5. **Listes** : Utilisez des tirets `-` pour les listes non ordonnées.
6. **Espacement** : Une ligne blanche avant et après les titres, les blocs de code et les tableaux.
7. **Pas d'HTML** : Évitez `<br>`, `<b>`, `<i>` ou d'autres balises HTML.

---

## 🔢 Processus de Versionnage

Lors de la mise à jour de la version (ex : de `0.41.9` à `0.42.0`), vous **devez** mettre à jour la chaîne de version dans tous les emplacements suivants :

- `desktop.sh` (variable `VERSION`)
- `server.sh` (variable `VERSION`)
- `CHANGELOG.md` (ajouter une nouvelle entrée)
- `README.md` (présentation du projet à la racine)
- `GEMINI.md` (visão geral do projeto para o agente)
- `CLAUDE.md` (visão geral do projeto para o agente)
- Tous les fichiers `README.md` dans `docs/` et ses sous-répertoires.

---

## 🤖 Automatisation & Skills

Ce projet utilise des **Agent Skills** (situées dans `.gemini/skills` et `.claude/skills`) pour automatiser les tâches.

- Si vous êtes un agent IA, vous **devez** activer les skills pertinentes (ex : `markdown-format`, `make-changelog`) avant d'effectuer des tâches.
- Si vous êtes un humain, sachez que ces skills renforcent les normes mentionnées ci-dessus.

---
