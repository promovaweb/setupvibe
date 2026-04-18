# Guide Cronboard
>
> Tableau de bord de surveillance Cron TUI — v0.41.7

SetupVibe installe [Cronboard](https://github.com/antoniorodr/cronboard) pour fournir une interface utilisateur de terminal (TUI) pour la gestion des tâches cron.

---

## Qu'est-ce que Cronboard ?

Cronboard est um tableau de bord basé sur le terminal pour gérer les tâches cron localement et sur des serveurs distants. Il vous permet de visualiser, créer, éditer, mettre en pause et supprimer des tâches de manière intuitive, sans avoir à éditer manuellement des fichiers texte.

**Caractéristiques principales :**

- **Interface Visuelle (TUI) :** Gestion conviviale via le clavier.
- **Validation :** Retour en temps réel sur la validité de l'expression cron.
- **Langage Naturel :** Convertit les expressions cron en descriptions lisibles (ex : "Tous les jours à 00:00").
- **Support à Distance :** Connexion via SSH pour gérer les crontabs sur d'autres serveurs.
- **Recherche :** Filtrez rapidement les tâches par mots-clés.

---

## Utilisation de Base

```bash
# Ouvrir le tableau de bord Cronboard
cronboard

# Ou utilisez le raccourci SetupVibe
cronb
```

### Commandes Clavier dans le Tableau de Bord

| Touche | Action |
|---|---|
| `j` / `k` ou `↑` / `↓` | Naviguer entre les tâches |
| `n` | Créer une nouvelle tâche |
| `e` | Éditer la tâche sélectionnée |
| `p` | Mettre en pause/Reprendre la tâche (commente/décommente dans le crontab) |
| `d` | Supprimer la tâche |
| `s` | Enregistrer les modifications |
| `f` | Filtrer les tâches |
| `q` | Quitter Cronboard |

---

## Gestion à Distance

Cronboard permet de gérer des serveurs via SSH. Vous pouvez configurer des connexions dans le fichier de configuration de Cronboard.

Pour plus de détails sur les paramètres avancés, visitez la [documentation officielle](https://antoniorodr.github.io/cronboard/configuration/).

---
