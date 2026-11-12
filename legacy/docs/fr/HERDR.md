# Herdr dans SetupVibe

> Multiplexeur d'agents installé par les éditions Desktop et Server.

[Herdr](https://github.com/herdrdev/herdr) organise les agents de code dans des workspaces persistants au sein du terminal. Chaque workspace peut contenir des onglets et des panneaux, tandis que la barre latérale indique si un agent détecté travaille, attend une réponse, a terminé ou reste inactif.

## Disponibilité

| Édition | Systèmes | État |
| --- | --- | --- |
| Desktop | macOS, Linux et WSL | Installé |
| Server | Distributions Linux compatibles | Installé |
| Windows (Beta) | Windows natif | Non installé |

L'édition Windows de SetupVibe n'installe pas Herdr, car la prise en charge native de cette plateforme reste en preview dans le projet d'origine. Sous Windows, l'édition Desktop peut être exécutée dans WSL pour utiliser le binaire Linux stable.

## Installation de Herdr par SetupVibe

Les installateurs Desktop et Server lisent le manifeste officiel disponible à l'adresse `https://herdr.dev/latest.json`, sélectionnent le binaire correspondant au système d'exploitation et à l'architecture détectés, puis n'acceptent que les assets publiés dans le chemin officiel des releases GitHub du projet d'origine.

Le binaire sélectionné passe par les vérifications de téléchargement de SetupVibe avant d'être installé dans :

```text
~/.local/bin/herdr
```

Après l'installation, SetupVibe exécute `herdr --version` avec le `PATH` de l'utilisateur cible. L'étape échoue si le téléchargement ne se termine pas, si l'architecture n'est pas compatible, si le manifeste pointe vers une origine inattendue ou si la commande installée ne peut pas être exécutée.

Une nouvelle exécution de SetupVibe consulte le manifeste actuel et remplace le binaire géré par la release stable disponible pour la machine.

## Première Session

Ouvrez le répertoire d'un projet et démarrez Herdr :

```bash
cd ~/projets/mon-projet
herdr
```

Herdr crée ou connecte le client à la session par défaut exécutée en background. Dans un panneau, lancez l'agent de code avec sa commande habituelle :

```bash
codex
```

Vous pouvez également exécuter `claude`, `copilot` ou un autre agent compatible avec Herdr. L'authentification, les permissions et les instructions du projet restent sous la responsabilité de chaque CLI et dépôt.

## Commandes Essentielles

| Commande | Fonction |
| --- | --- |
| `herdr` | Crée ou connecte le client à la session par défaut. |
| `herdr --version` | Affiche la version installée. |
| `herdr --help` | Liste les commandes et les options disponibles. |
| `herdr config check` | Valide la configuration de Herdr. |
| `herdr update` | Met à jour une installation gérée par l'installateur de Herdr. |
| `herdr server stop` | Arrête le serveur par défaut et les processus de ses panneaux. |

Relancer SetupVibe est la méthode recommandée pour actualiser le binaire géré par SetupVibe. Utilisez `herdr update` uniquement si vous souhaitez confier les mises à jour à Herdr.

## Raccourcis Initiaux

Herdr utilise `Ctrl+B` comme préfixe par défaut. Appuyez sur le préfixe, relâchez les touches, puis appuyez sur la touche de l'action.

| Action | Raccourci |
| --- | --- |
| Diviser à droite | `prefix`, puis `v` |
| Diviser vers le bas | `prefix`, puis `-` |
| Créer un onglet | `prefix`, puis `c` |
| Onglet suivant ou précédent | `prefix`, puis `n` ou `p` |
| Naviguer entre les workspaces | `prefix`, puis `w` |
| Détacher le client | `prefix`, puis `q` |
| Afficher les raccourcis actifs | `prefix`, puis `?` |

Détacher le client ou fermer le terminal laisse le serveur Herdr et les processus des panneaux en cours d'exécution. Lancez de nouveau `herdr` pour revenir à la même session.

## Herdr et Tmux

SetupVibe continue d'installer tmux dans les éditions Desktop et Server. Herdr privilégie les workspaces et la visibilité de l'état des agents de code, tandis que tmux reste adapté aux sessions shell générales, aux routines distantes déjà établies et à la configuration de plugins fournie par SetupVibe.

Utilisez un seul multiplexeur comme session externe pour une routine donnée. Exécuter Herdr dans tmux, ou tmux dans Herdr, ajoute une couche de préfixes et de capture des entrées qui rend les conflits de clavier et de souris plus difficiles à diagnostiquer.

## Mises à Jour et Sessions Actives

Une mise à jour qui modifie le protocole entre le client et le serveur Herdr peut nécessiter le redémarrage de la session. Lisez le message de mise à jour avant d'exécuter :

```bash
herdr server stop
```

Cette commande arrête également les processus exécutés dans les panneaux. Si vous souhaitez seulement quitter l'interface sans arrêter les agents, utilisez `prefix`, puis `q`.

## Dépannage

| Symptôme | Vérification |
| --- | --- |
| `herdr: command not found` | Ouvrez un nouveau shell et confirmez que `~/.local/bin` figure dans le `PATH`. |
| SetupVibe ne trouve pas d'asset | Confirmez que la machine utilise x86_64 ou ARM64 et peut accéder à `herdr.dev` et GitHub. |
| Un agent de code n'est pas détecté | Confirmez que l'agent s'exécute directement dans un panneau Herdr et consultez la liste des agents compatibles. |
| Les raccourcis atteignent le mauvais programme | Recherchez un autre multiplexeur imbriqué ou des raccourcis du terminal utilisant le même préfixe. |
| Le client signale une incompatibilité de protocole | Terminez le travail actuel, arrêtez le serveur concerné et relancez Herdr avec le binaire mis à jour. |

## Pour Aller Plus Loin

- [Dépôt Herdr](https://github.com/herdrdev/herdr)
- [Documentation Herdr](https://herdr.dev/docs/)
- [Index de la documentation SetupVibe](../README.md)
