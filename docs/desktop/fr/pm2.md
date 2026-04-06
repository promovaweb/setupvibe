# Guide PM2
> Guide de gestion de processus — v0.41.6

SetupVibe installe [PM2](https://pm2.keymetrics.io/) globalement et le configure pour un démarrage automatique sur l'édition Desktop.

- **macOS :** démarrage automatique via launchd ; télécharge et démarre `ecosystem.config.js` depuis le dépôt vers `~/ecosystem.config.js`
- **Linux :** démarrage automatique via systemd ; télécharge et démarre `ecosystem.config.js` depuis le dépôt vers `~/ecosystem.config.js`

---

## Qu'est-ce que PM2 ?

PM2 est un **gestionnaire de processus de production pour Node.js** — il maintient vos applications en vie, les redémarre en cas de crash, gère les logs et s'intègre aux systèmes d'initialisation (init) du système.

**Concepts clés :**

| Concept            | Description                                                               |
| ------------------ | ------------------------------------------------------------------------- |
| **App**            | Un processus géré par PM2 (Node.js, Python, Go ou n'importe quel binaire) |
| **Ecosystem file** | `ecosystem.config.js` — config déclarative pour une ou plusieurs apps     |
| **Cluster mode**   | Lance plusieurs instances sur les cœurs du CPU (Node.js uniquement)       |
| **Fork mode**      | Processus unique, fonctionne avec n'importe quel runtime (par défaut)     |

---

## Prise en main

```bash
# Démarrer une app directement
pm2 start app.js

# Démarrer avec um nom
pm2 start app.js --name myapp

# Démarrer via le fichier ecosystem
pm2 start ecosystem.config.js

# Démarrer une app spécifique du fichier ecosystem
pm2 start ecosystem.config.js --only myapp

# Démarrer avec un environnement spécifique
pm2 start ecosystem.config.js --env production

# Lister tous les processus gérés
pm2 list

# Afficher les infos détaillées d'une app
pm2 show myapp

# Surveiller toutes les apps en temps réel
pm2 monit
```

---

## Commandes courantes

### Contrôle des processus

```bash
pm2 stop myapp          # Arrêter (garde dans la liste)
pm2 restart myapp       # Redémarrer
pm2 reload myapp        # Rechargement sans interruption (mode cluster)
pm2 delete myapp        # Arrêter et supprimer de la liste

pm2 stop all            # Arrêter toutes les apps
pm2 restart all         # Redémarrer toutes les apps
pm2 delete all          # Supprimer toutes les apps
```

### Logs

```bash
pm2 logs                # Flux de tous les logs
pm2 logs myapp          # Flux des logs d'une app
pm2 logs --lines 200    # Afficher les 200 dernières lignes
pm2 flush               # Effacer tous les fichiers de logs
pm2 reloadLogs          # Rouvrir les fichiers de logs (utile après rotation)
```

### Persistance

```bash
pm2 save                # Sauvegarder la liste actuelle sur le disque
pm2 resurrect           # Restaurer la liste sauvegardée
```

### Démarrage automatique

```bash
# Générer et configurer l'intégration au système init
pm2 startup             # Affiche une commande — exécutez-la avec sudo

# Supprimer le hook de démarrage
pm2 unstartup
```

---

## Fichier Ecosystem

Le fichier ecosystem (`ecosystem.config.js`) est la méthode recommandée pour gérer les apps. Un modèle est généré à `~/ecosystem.config.js` lors de l'installation.

### Modèle par défaut

```js
module.exports = {
  apps: [
    {
      name: "app",
      script: "./index.js",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      ignore_watch: ["node_modules", "logs", ".git"],
      max_memory_restart: "300M",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true,
      time: true,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 1000,
      kill_timeout: 3000,
      wait_ready: false,
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};
```

---

## Référence de configuration

### Général

| Option             | Type    | Défaut         | Description                                                        |
| ------------------ | ------- | -------------- | ------------------------------------------------------------------ |
| `name`             | string  | nom du fichier | Identifiant utilisé dans `pm2 list` et les commandes               |
| `script`           | string  | —              | Chemin vers le script d'entrée (requis)                            |
| `cwd`              | string  | —              | Répertoire de travail pour le processus                            |
| `args`             | string  | —              | Arguments CLI passés au script                                     |
| `interpreter`      | string  | `node`         | Chemin vers l'interpréteur du runtime                              |
| `interpreter_args` | string  | —              | Drapeaux passés à l'interpréteur (ex: `--max-old-space-size=4096`) |
| `force`            | boolean | `false`        | Autoriser le lancement du même script plusieurs fois               |

### Mise à l'échelle

| Option      | Type   | Défaut | Description                                             |
| ----------- | ------ | ------ | ------------------------------------------------------- |
| `instances` | number | `1`    | Nombre d'instances ; `-1` = tous les cœurs CPU          |
| `exec_mode` | string | `fork` | `fork` (tout runtime) ou `cluster` (Node.js uniquement) |

### Stabilité et Redémarrage

| Option                  | Type          | Défaut  | Description                                                         |
| ----------------------- | ------------- | ------- | ------------------------------------------------------------------- |
| `autorestart`           | boolean       | `true`  | Redémarrer en cas de crash                                          |
| `max_restarts`          | number        | `10`    | Max redémarrages instables consécutifs avant l'arrêt                |
| `min_uptime`            | string/number | —       | Temps mini pour être considéré stable (ms ou `"2s"`)                |
| `restart_delay`         | number        | `0`     | Millisecondes à attendre avant de redémarrer une app crashée        |
| `max_memory_restart`    | string        | —       | Redémarrer si le RSS dépasse cette valeur (ex: `"300M"`, `"1G"`)    |
| `kill_timeout`          | number        | `1600`  | Millisecondes avant SIGKILL après SIGTERM                           |
| `shutdown_with_message` | boolean       | `false` | Utiliser `process.send('shutdown')` au lieu de SIGTERM              |
| `wait_ready`            | boolean       | `false` | Attendre `process.send('ready')` avant de considérer l'app en ligne |
| `listen_timeout`        | number        | —       | Millisecondes d'attente du signal `ready` avant recharge forcée     |

### Watch

| Option         | Type          | Défaut  | Description                                                         |
| -------------- | ------------- | ------- | ------------------------------------------------------------------- |
| `watch`        | boolean/array | `false` | Redémarrer sur changement de fichier ; passer un tableau de chemins |
| `ignore_watch` | array         | —       | Chemins ou motifs glob exclus du watch                              |

### PM2 Logs

| Option                        | Type    | Défaut                         | Description                                          |
| ----------------------------- | ------- | ------------------------------ | ---------------------------------------------------- |
| `log_date_format`             | string  | —                              | Format de l'horodatage (ex: `"YYYY-MM-DD HH:mm:ss"`) |
| `out_file`                    | string  | `~/.pm2/logs/<name>-out.log`   | Chemin pour le log stdout                            |
| `error_file`                  | string  | `~/.pm2/logs/<name>-error.log` | Chemin pour le log stderr                            |
| `log_file`                    | string  | —                              | Chemin pour le log combiné stdout+stderr             |
| `merge_logs` / `combine_logs` | boolean | `false`                        | Désactiver les suffixes de log par instance          |
| `time`                        | boolean | `false`                        | Préfixer chaque ligne de log avec un horodatage      |

### Environnement

| Option            | Type    | Description                                                                   |
| ----------------- | ------- | ----------------------------------------------------------------------------- |
| `env`             | object  | Variables injectées dans tous les modes                                       |
| `env_<name>`      | object  | Variables injectées avec `--env <name>` (ex: `env_production`)                |
| `filter_env`      | array   | Retirer les variables d'env globales correspondant à ces préfixes             |
| `instance_var`    | string  | Nom de la variable contenant l'index d'instance (défaut: `NODE_APP_INSTANCE`) |
| `appendEnvToName` | boolean | Ajouter le nom de l'environnement au nom de l'app                             |

### Source Maps et Divers

| Option               | Type    | Défaut | Description                                                     |
| -------------------- | ------- | ------ | --------------------------------------------------------------- |
| `source_map_support` | boolean | `true` | Activer le support des source maps pour les stack traces        |
| `vizion`             | boolean | `true` | Suivre les métadonnées du contrôle de version                   |
| `cron_restart`       | string  | —      | Expression cron pour redémarrages planifiés (ex: `"0 3 * * *"`) |
| `post_update`        | array   | —      | Commandes à exécuter après une mise à jour `pm2 pull`           |

---

## Paramètres globaux PM2

SetupVibe configure ceci lors de l'installation :

| Paramètre             | Valeur                | Description                                           |
| --------------------- | --------------------- | ----------------------------------------------------- |
| `pm2:autodump`        | `true`                | Sauvegarde auto de la liste lors de chaque changement |
| `pm2:log_date_format` | `YYYY-MM-DD HH:mm:ss` | Format d'horodatage par défaut pour tous les logs     |

```bash
pm2 set pm2:autodump true
pm2 set pm2:log_date_format "YYYY-MM-DD HH:mm:ss"
pm2 get                      # Lister tous les paramètres actuels du module PM2
```

---

## Mode Cluster (Node.js)

```js
{
  instances: "max",   // ou un nombre, ou -1
  exec_mode: "cluster",
}
```

```bash
pm2 reload myapp      # Rechargement progressif sans interruption en mode cluster
pm2 scale myapp 4     # Mettre à l'échelle vers 4 instances à chaud
pm2 scale myapp +2    # Ajouter 2 instances supplémentaires
```

---

## Démarrage automatique PM2

SetupVibe configure PM2 pour démarrer automatiquement au boot :

- **macOS** — enregistre un agent launchd (`pm2 startup launchd`)
- **Linux** — enregistre un service systemd (`pm2 startup systemd`)

Pour refaire cela manuellement :

```bash
pm2 startup            # Affiche la commande à exécuter
pm2 save               # Sauvegarde la liste actuelle des processus
```

Pour supprimer :

```bash
pm2 unstartup
```

---
