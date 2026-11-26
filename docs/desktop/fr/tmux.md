# Guide Tmux
>
> Configuration do multiplexeur de terminal — v0.41.9

SetupVibe installe et configure tmux avec [TPM](https://github.com/tmux-plugins/tpm) et un ensemble de plugins sélectionnés. L'édition Desktop utilise [`conf/tmux-desktop.conf`](../../../conf/tmux-desktop.conf), téléchargée automatiquement lors de l'installation.

L'édition Server utilise une [`conf/tmux-server.conf`](../../../conf/tmux-server.conf) plus légère — mêmes raccourcis, mais sans les plugins `docker`, `mise` et `tmux-open`, et avec une barre de statut simplifiée (`git · cwd` à gauche).

---

## Qu'est-ce que tmux ?

tmux est un **multiplexeur de terminaux** — il permet d'exécuter plusieurs sessions de terminal dans une seule fenêtre, de garder les sessions actives après déconnexion et de diviser votre écran en panneaux. Essentiel pour les serveurs distants et les utilisateurs avancés.

**Concepts de base :**

| Concept     | Description                                                          |
| ----------- | -------------------------------------------------------------------- |
| **Session** | Une collection de fenêtres. Survit à la déconnexion.                 |
| **Fenêtre** | Comme un onglet de navigateur — une vue plein écran dans une session. |
| **Panneau** | Une division dans une fenêtre. Plusieurs panneaux par fenêtre.       |
| **Préfixe** | `Ctrl + b` — pressé avant chaque raccourci tmux.                    |

---

## Prise en main

```bash
# Démarrer une nouvelle session
tmux

# Démarrer une session nommée
tmux new -s myproject

# Lister les sessions
tmux ls

# S'attacher à la dernière session
tmux attach

# S'attacher à une session nommée
tmux attach -t myproject

# Supprimer une session
tmux kill-session -t myproject
```

Après avoir ouvert tmux, appuyez sur `prefix + I` (i majuscule) pour installer tous les plugins.

---

## Raccourcis clavier par défaut

> Tous les raccourcis nécessitent d'appuyer d'abord sur **`Ctrl + b`**, puis sur la touche.

### Sessions

| Touche       | Action                                               |
| ------------ | ---------------------------------------------------- |
| `prefix + s` | Lister et changer de session (interactif)            |
| `prefix + $` | Renommer la session actuelle                         |
| `prefix + d` | Se détacher de la session (la session reste active)  |
| `prefix + (` | Passer à la session précédente                       |
| `prefix + )` | Passer à la session suivante                         |
| `prefix + L` | Passer à la dernière session utilisée                |

### Fenêtres

| Touche         | Action                                     |
| -------------- | ------------------------------------------ |
| `prefix + c`   | Créer une nouvelle fenêtre                 |
| `prefix + ,`   | Renommer la fenêtre actuelle               |
| `prefix + &`   | Fermer la fenêtre actuelle                 |
| `prefix + n`   | Fenêtre suivante                           |
| `prefix + p`   | Fenêtre précédente                         |
| `prefix + l`   | Dernière fenêtre (bascule)                 |
| `prefix + w`   | Lister et changer de fenêtre (interactif)  |
| `prefix + 0–9` | Aller à la fenêtre par son numéro          |
| `prefix + '`   | Demander le numéro de fenêtre où aller     |
| `prefix + .`   | Déplacer la fenêtre vers un autre index    |
| `prefix + f`   | Trouver une fenêtre par son nom            |

### Panneaux

| Touche                 | Action                                                                   |
| ---------------------- | ------------------------------------------------------------------------ |
| `prefix + %`           | Diviser verticalement (gauche/droite)                                     |
| `prefix + "`           | Diviser horizontalement (haut/bas)                                       |
| `prefix + o`           | Passer au panneau suivant                                                |
| `prefix + ;`           | Basculer vers le dernier panneau actif                                   |
| `prefix + x`           | Fermer le panneau actuel                                                 |
| `prefix + z`           | Zoom/unzoom du panneau (basculer en plein écran)                         |
| `prefix + q`           | Afficher les numéros de panneaux (appuyer pour y aller)                  |
| `prefix + {`           | Échanger le panneau avec le précédent                                    |
| `prefix + }`           | Échanger le panneau avec le suivant                                      |
| `prefix + Alt+1–5`     | Changer pour les mises en page prédéfinies (even-h, even-v, ...)         |
| `prefix + !`           | Transformer le panneau en sa propre fenêtre                              |
| `prefix + m`           | Marquer le panneau                                                       |
| `prefix + M`           | Effacer le panneau marqué                                                |
| `↑ ↓ ← →`              | Naviguer entre les panneaux par direction                                |
| `prefix + Ctrl + ↑↓←→` | Redimensionner le panneau (1 cellule)                                    |
| `prefix + Alt + ↑↓←→`  | Redimensionner le panneau (5 cellules)                                   |

### Mode Copie

| Touche                 | Action                                     |
| ---------------------- | ------------------------------------------ |
| `prefix + [`           | Entrer en mode copie                       |
| `prefix + ]`           | Coller le dernier buffer copié             |
| `prefix + #`           | Lister les buffers de collage              |
| `prefix + =`           | Choisir un buffer à coller depuis la liste |
| `prefix + -`           | Supprimer le buffer le plus récent         |
| `q` (en mode copie)    | Sortir du mode copie                       |
| `Space` (mode copie)   | Commencer la sélection                     |
| `Enter` (mode copie)   | Copier la sélection et sortir              |
| `/` (mode copie)       | Rechercher vers l'avant                    |
| `?` (mode copie)       | Rechercher vers l'arrière                  |

### Divers

| Touche            | Action                               |
| ----------------- | ------------------------------------ |
| `prefix + :`      | Ouvrir l'invite de commande tmux     |
| `prefix + ?`      | Lister tous les raccourcis           |
| `prefix + r`      | Recharger la configuration tmux      |
| `prefix + t`      | Afficher l'horloge                   |
| `prefix + i`      | Afficher les infos de la fenêtre     |
| `prefix + ~`      | Afficher les messages tmux           |
| `prefix + D`      | Choisir un client à déconnecter      |
| `prefix + E`      | Répartir les panneaux équitablement  |
| `prefix + Ctrl+z` | Suspendre le client tmux             |

---

## Plugins

### Cœur

| Plugin                                                                      | Description           |
| --------------------------------------------------------------------------- | --------------------- |
| [tmux-plugins/tpm](https://github.com/tmux-plugins/tpm)                     | Gestionnaire de plugins |
| [tmux-plugins/tmux-sensible](https://github.com/tmux-plugins/tmux-sensible) | Paramètres sensés     |

**Raccourcis TPM :**

| Touche           | Action                          |
| ---------------- | ------------------------------- |
| `prefix + I`     | Installer les plugins           |
| `prefix + U`     | Mettre à jour les plugins       |
| `prefix + Alt+u` | Supprimer les plugins inutilisés |

---

### Navigation et contrôle des panneaux

#### [tmux-pain-control](https://github.com/tmux-plugins/tmux-pain-control)

Raccourcis cohérents et intuitifs pour diviser et redimensionner les panneaux.

| Touche             | Action                                | Remplace le défaut                       |
| ------------------ | ------------------------------------- | ---------------------------------------- |
| `prefix + \|`      | Diviser verticalement (gauche/droite) | `prefix + %` fonctionne toujours         |
| `prefix + -`       | Diviser horizontalement (haut/bas)    | Remplace `delete-buffer` (rarement utilisé) |
| `prefix + \`       | Diviser verticalement toute largeur   | —                                        |
| `prefix + _`       | Diviser horizontalement toute hauteur | —                                        |
| `prefix + h`       | Sélectionner panneau à gauche         | —                                        |
| `prefix + j`       | Sélectionner panneau en bas           | —                                        |
| `prefix + k`       | Sélectionner panneau en haut          | —                                        |
| `prefix + l`       | Sélectionner panneau à droite         | `last-window` restauré après plugin      |
| `prefix + H/J/K/L` | Redimensionner panneau (5 cellules)   | —                                        |

#### [christoomey/vim-tmux-navigator](https://github.com/christoomey/vim-tmux-navigator)

Naviguez entre les panneaux tmux et les splits vim avec les mêmes touches.

| Touche     | Action                        |
| ---------- | ----------------------------- |
| `Ctrl + h` | Aller à gauche                |
| `Ctrl + j` | Aller en bas                  |
| `Ctrl + k` | Aller en haut                 |
| `Ctrl + l` | Aller à droite                |
| `Ctrl + \` | Aller au panneau précédent    |

> Pas de préfixe nécessaire. Fonctionne de manière transparente dans vim/neovim.

---

### Souris

#### [NHDaly/tmux-better-mouse-mode](https://github.com/NHDaly/tmux-better-mouse-mode)

| Fonction                       | Comportement                                           |
| ------------------------------ | ------------------------------------------------------ |
| Défiler vers le bas (copie)    | Sort du mode copie automatiquement                     |
| Défiler sur un panneau         | Ne change pas le panneau actif                         |
| Défiler dans vim/less/man      | Envoie les événements au programme (buffer alternatif) |

---

### Copie et Presse-papiers

#### [tmux-plugins/tmux-yank](https://github.com/tmux-plugins/tmux-yank)

| Touche       | Contexte   | Action                                        |
| ------------ | ---------- | --------------------------------------------- |
| `prefix + y` | Normal     | Copier le texte de la ligne de commande       |
| `prefix + Y` | Normal     | Copier le répertoire de travail actuel        |
| `y`          | Mode copie | Copier la sélection vers le presse-papiers    |
| `Y`          | Mode copie | Copier la sélection et coller sur la commande |

#### [CrispyConductor/tmux-copy-toolkit](https://github.com/CrispyConductor/tmux-copy-toolkit)

| Touche       | Action                   |
| ------------ | ------------------------ |
| `prefix + e` | Activer le copy toolkit  |

#### [abhinav/tmux-fastcopy](https://github.com/abhinav/tmux-fastcopy)

Copie basée sur des indices (style vimium). Met en évidence les motifs de texte à l'écran et permet de les copier en tapant de courtes lettres.

| Touche       | Action                       |
| ------------ | ---------------------------- |
| `prefix + F` | Activer les indices fastcopy |

Reconnaît : URLs, IPs, hashes Git, chemins de fichiers, UUIDs, couleurs hex, nombres, etc.

> Utilise `prefix + F` (majuscule) — `prefix + f` est préservé pour le `find-window` intégré.

---

### Ouverture d'URLs et fichiers

#### [tmux-plugins/tmux-open](https://github.com/tmux-plugins/tmux-open)

| Touche      | Contexte   | Action                                     |
| ----------- | ---------- | ------------------------------------------ |
| `o`         | Mode copie | Ouvrir avec l'application système par défaut |
| `Ctrl + o`  | Mode copie | Ouvrir avec `$EDITOR`                      |
| `Shift + s` | Mode copie | Rechercher la sélection dans le navigateur |

#### [wfxr/tmux-fzf-url](https://github.com/wfxr/tmux-fzf-url)

| Touche       | Action                    |
| ------------ | ------------------------- |
| `prefix + u` | Ouvrir le sélecteur d'URL |

---

### Gestion des sessions

#### [tmux-plugins/tmux-resurrect](https://github.com/tmux-plugins/tmux-resurrect)

Sauvegarde et restaure tout l'environnement tmux après redémarrage.

| Touche            | Action             |
| ----------------- | ------------------ |
| `prefix + Ctrl+s` | Sauvegarder        |
| `prefix + Ctrl+r` | Restaurer          |

Sauvegarde : fenêtres, panneaux, répertoires, contenu des panneaux, programmes en cours.

#### [tmux-plugins/tmux-continuum](https://github.com/tmux-plugins/tmux-continuum)

| Fonction                   | Valeur             |
| -------------------------- | ------------------ |
| Intervalle de sauvegarde   | Toutes les 10 mins |
| Restauration auto au démarrage | Activée            |

Pas de raccourci — fonctionne automatiquement en arrière-plan.

#### [omerxx/tmux-sessionx](https://github.com/omerxx/tmux-sessionx)

Gestionnaire de sessions complet avec aperçu fzf.

| Touche       | Action                           |
| ------------ | -------------------------------- |
| `prefix + S` | Ouvrir le gestionnaire de sessions |

Dans sessionx : `Ctrl+d` supprimer, `Ctrl+r` renommer, `Tab` basculer l'aperçu.

> Utilise `prefix + S` (majuscule) — `prefix + o` est préservé pour le `rotate-pane` intégré.

---

### Fuzzy Finder

#### [sainnhe/tmux-fzf](https://github.com/sainnhe/tmux-fzf)

Gérer sessions, fenêtres, panneaux et exécuter des commandes via fzf.

| Touche                   | Action                  |
| ------------------------ | ----------------------- |
| `prefix + F` (majuscule) | Ouvrir le menu tmux-fzf |

---

### Aides UI

#### [Freed-Wu/tmux-digit](https://github.com/Freed-Wu/tmux-digit)

| Touche         | Action                                 |
| -------------- | -------------------------------------- |
| `prefix + 0–9` | Sauter directement à la fenêtre numéro |

#### [anghootys/tmux-ip-address](https://github.com/anghootys/tmux-ip-address)

Affiche l'adresse IP actuelle de la machine dans la barre de statut. Pas de raccourci.

#### [tmux-plugins/tmux-prefix-highlight](https://github.com/tmux-plugins/tmux-prefix-highlight)

Met en évidence la barre de statut quand le préfixe est actif, en mode copie ou sync.

#### [alexwforsythe/tmux-which-key](https://github.com/alexwforsythe/tmux-which-key)

| Touche           | Action                   |
| ---------------- | ------------------------ |
| `prefix + Space` | Ouvrir le menu which-key |

> `prefix + Space` est dédié à which-key. Next-layout reste disponible via `prefix + Alt+1–5`.

#### [jaclu/tmux-menus](https://github.com/jaclu/tmux-menus)

| Touche       | Action                   |
| ------------ | ------------------------ |
| `prefix + g` | Ouvrir le menu contextuel |

---

### Thème

#### [2KAbhishek/tmux2k](https://github.com/2KAbhishek/tmux2k)

**Desktop** (`tmux-desktop.conf`) :

| Position | Widgets                            |
| -------- | ---------------------------------- |
| Gauche   | `git` · `cwd` · `docker` · `mise`  |
| Droite   | `cpu` · `ram` · `network` · `time` |

**Server** (`tmux-server.conf`) :

| Position | Widgets                            |
| -------- | ---------------------------------- |
| Gauche   | `git` · `cwd`                      |
| Droite   | `cpu` · `ram` · `network` · `time` |

**Thème :** `onedark` avec séparateurs powerline dans les deux éditions.

---

## Résolution des conflits de touches

| Touche           | Défaut tmux                   | Plugin            | Résolution                                                               |
| ---------------- | ----------------------------- | ----------------- | ------------------------------------------------------------------------ |
| `prefix + f`     | `find-window`                 | tmux-fastcopy     | Fastcopy déplacé vers `prefix + F` — défaut préservé                     |
| `prefix + o`     | `rotate-pane`                 | tmux-sessionx     | Sessionx déplacé vers `prefix + S` — défaut préservé                     |
| `prefix + l`     | `last-window`                 | tmux-pain-control | Défaut restauré avec `bind-key l last-window` après TPM                  |
| `prefix + -`     | `delete-buffer`               | tmux-pain-control | Pain-control remplace par split-h — accepté (défaut peu utilisé)          |
| `prefix + \`     | *(pain-control split)*        | tmux-menus        | Menus déplacés vers `prefix + g` — split pain-control préservé           |
| `prefix + M`     | `select-pane -M` (clear mark) | tmux-menus        | Menus déplacés vers `prefix + g` — défaut préservé                       |
| `prefix + Space` | `next-layout`                 | tmux-which-key    | which-key prend Space — next-layout dispo via `prefix + Alt+1–5`         |

---
