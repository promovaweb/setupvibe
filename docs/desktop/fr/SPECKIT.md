# Guide Spec-Kit

SetupVibe installe [Spec-Kit](https://github.com/github/spec-kit) sur l'édition Desktop (macOS et Linux bureau) via `uv tool install specify-cli`.

> Guide des outils — v0.41.7

- **Commande :** `specify`
- **Paquet :** `specify-cli` (PyPI)
- **Prérequis :** Python 3.11+, `uv`, Git et un agent d'IA

---

## Qu'est-ce que Spec-Kit ?

Spec-Kit est un **ensemble d'outils open-source pour le Spec-Driven Development (SDD)** — une méthodologie qui inverse l'approche traditionnelle du développement logiciel en rendant les spécifications exécutables avant que tout code ne soit écrit.

Au lieu de passer directement au code ("vibe coding"), le SDD vous guide à travers trois phases :

| Phase | Commande | Objectif |
|---|---|---|
| **Specify** | `/speckit.specify` | Définir *quoi* construire et *pourquoi* |
| **Plan** | `/speckit.plan` | Définir *comment* construire (architecture, stack technique) |
| **Tasks** | `/speckit.tasks` | Découper le plan en parties d'implémentation exploitables |

---

## Premiers Pas

```bash
# Vérifier que toutes les dépendances sont installées
spcheck

# Initialiser un nouveau projet dans un nouveau dossier
spinit mon-projet

# Initialiser dans le répertoire actuel avec Claude
spci

# Initialiser dans le répertoire actuel avec Gemini
spgi

# Initialiser dans le répertoire actuel avec Copilot
spkpi
```

---

## Installation et Mise à Jour

```bash
# Installer Spec-Kit manuellement (si nécessaire)
uv tool install specify-cli

# Mettre à jour vers la dernière version
spup
```

---

## Référence CLI

### `specify init`

Prépare un projet pour le Spec-Driven Development.

```bash
specify init <NOM_DU_PROJET> [options]
```

| Option | Description |
|---|---|
| `--ai <agent>` | Agent d'IA à utiliser : `claude`, `copilot`, `gemini`, `codebuddy`, `pi` |
| `--script <type>` | Type de script : `sh` (Bash) ou `ps` (PowerShell) |
| `--here` | Initialiser dans le répertoire actuel au lieu d'un nouveau dossier |
| `--offline` | Utiliser les ressources intégrées sans les récupérer sur le réseau |
| `--ignore-agent-tools` | Ignorer la validation des outils de l'agent d'IA |

### `specify check`

Vérifie que toutes les dépendances requises (Python, uv, Git, agent d'IA) sont installées et accessibles.

```bash
specify check
```

---

## Alias SetupVibe

Ces alias sont disponibles après avoir exécuté SetupVibe Desktop sur macOS ou Linux.

| Alias | Commande | Description |
|---|---|---|
| `sp` | `specify` | Raccourci vers la commande principale |
| `spinit` | `specify init` | Initialiser le SDD dans un nouveau répertoire |
| `spcheck` | `specify check` | Vérifier les dépendances installées |
| `sphere` | `specify init --here` | Initialiser le SDD dans le répertoire actuel |
| `spci` | `specify init --here --ai claude` | Démarrer un projet SDD avec Claude Code |
| `spgi` | `specify init --here --ai gemini` | Démarrer un projet SDD avec Gemini CLI |
| `spkpi` | `specify init --here --ai copilot` | Démarrer un projet SDD avec GitHub Copilot |
| `spup` | `uv tool upgrade specify-cli` | Mettre à jour Spec-Kit |

---

## Flux de Travail Typique

### 1. Préparer le projet

```bash
mkdir mon-app && cd mon-app
spci
```

Cela crée la structure Spec-Kit avec Claude Code comme agent d'IA.

### 2. Rédiger la spécification

Ouvrez votre agent d'IA et exécutez la commande `/speckit.specify`. Répondez aux invites pour définir :

- Quel problème résolvez-vous ?
- Qui sont les utilisateurs ?
- Quels sont les scénarios principaux et les résultats attendus ?

### 3. Créer le plan technique

Exécutez `/speckit.plan` dans votre agent d'IA pour produire :

- Décisions d'architecture
- Choix de la stack technologique
- Points d'intégration et contraintes

### 4. Découper en tâches

Exécutez `/speckit.tasks` pour générer une liste numérotée et ordonnée de tâches d'implémentation à partir du plan.

### 5. Implémenter

Utilisez `/speckit.implement` ou travaillez tâche par tâche avec votre agent d'IA, en vous référant à la spécification et au plan à chaque étape.

---

## Agents d'IA Supportés

| Agent | Flag | Notes |
|---|---|---|
| Claude Code | `--ai claude` | Recommandation par défaut pour les utilisateurs de SetupVibe |
| GitHub Copilot | `--ai copilot` | Nécessite un abonnement Copilot |
| Gemini CLI | `--ai gemini` | Niveau gratuit disponible |
| CodeBuddy | `--ai codebuddy` | Assistant d'IA de Tencent Cloud |
| Pi | `--ai pi` | Assistant d'IA d'Inflection |

---

## Conseils

- Exécutez `spcheck` avant de commencer tout projet pour confirmer que votre environnement est prêt.
- Utilisez `--offline` dans les environnements isolés ou lorsque le réseau n'est pas fiable.
- Le flag `--here` (alias `sphere`) est utile lorsque le dossier du projet existe déjà.
- Commitez les fichiers de spécification générés avec votre code — ils servent de documentation vivante.
- Exécutez `spup` périodiquement pour rester sur la dernière version de Spec-Kit.

---
