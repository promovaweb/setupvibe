# Gestionnaire de Fichiers Yazi

> Commandes natives et utilisation essentielle de Yazi — v0.41.9

[Yazi](https://github.com/sxyazi/yazi) est un gestionnaire de fichiers
asynchrone pour terminal, avec aperçus, onglets multiples, opérations par lots
et intégration aux outils déjà installés par SetupVibe.

## Disponibilité

SetupVibe installe Yazi dans les deux éditions Desktop :

- macOS, Linux et WSL via Homebrew à l'Étape 8 de `desktop.sh`
- Windows via le paquet WinGet officiel `sxyazi.yazi`

L'installation valide les deux exécutables natifs :

- `yazi` ouvre le gestionnaire de fichiers.
- `ya` gère les paquets, plugins et thèmes de Yazi.

SetupVibe ne crée ni alias `y` ni wrapper de shell. Utilisez directement la
commande native `yazi`.

## Démarrer Yazi

Ouvrez le répertoire courant ou indiquez un chemin :

```bash
yazi
yazi ~/projets
```

Vérifiez les commandes installées :

```bash
yazi --version
ya --version
```

## Touches Essentielles

| Touche                        | Action                                                              |
| ----------------------------- | ------------------------------------------------------------------- |
| `h`, `j`, `k`, `l` ou flèches | Naviguer                                                            |
| `Enter`                       | Ouvrir le fichier ou répertoire sélectionné                         |
| `Space`                       | Basculer la sélection                                               |
| `y`                           | Copier les éléments sélectionnés                                    |
| `x`                           | Couper les éléments sélectionnés                                    |
| `p`                           | Coller les éléments copiés ou coupés                                |
| `a`                           | Créer un fichier ; terminez le nom par `/` pour créer un répertoire |
| `r`                           | Renommer les éléments sélectionnés                                  |
| `d`                           | Déplacer les éléments sélectionnés vers la corbeille                |
| `.`                           | Afficher ou masquer les fichiers cachés                             |
| `s`                           | Rechercher les noms de fichiers avec `fd`                           |
| `S`                           | Rechercher dans le contenu avec `ripgrep`                           |
| `z`                           | Naviguer avec `fzf`                                                 |
| `Z`                           | Naviguer avec `zoxide`                                              |
| `F1` ou `~`                   | Ouvrir l'aide intégrée                                              |
| `q`                           | Quitter                                                             |

## Intégrations SetupVibe

SetupVibe installe également `file`, `ffmpeg`, ImageMagick, `jq`, `fd`,
`ripgrep`, `fzf`, `zoxide` et les Nerd Fonts lorsque la plateforme les prend
en charge. Yazi utilise ces outils pour la détection des fichiers, les aperçus,
la recherche, la navigation et les icônes.

Sous Windows, SetupVibe définit la variable d'environnement utilisateur
`YAZI_FILE_ONE` vers `usr\bin\file.exe` de Git for Windows, comme requis pour
une détection MIME fiable. Le mode de désinstallation restaure la valeur
précédente tant qu'elle reste gérée par SetupVibe.

La configuration utilisateur se trouve dans :

- `~/.config/yazi/` sous macOS, Linux et WSL
- `%APPDATA%\yazi\config\` sous Windows

SetupVibe ne modifie pas ces fichiers de configuration appartenant à
l'utilisateur.

## Références

- [Dépôt Yazi](https://github.com/sxyazi/yazi)
- [Guide d'installation officiel](https://yazi-rs.github.io/docs/installation/)
- [Guide de démarrage officiel](https://yazi-rs.github.io/docs/quick-start/)
