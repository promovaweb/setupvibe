# Guía de PM2
> Guía de gestión de procesos — v0.41.6

SetupVibe instala [PM2](https://pm2.keymetrics.io/) globalmente y lo configura para que se inicie automáticamente en la edición Desktop.

- **macOS:** inicio automático mediante launchd; descarga e inicia `ecosystem.config.js` del repositorio a `~/ecosystem.config.js`
- **Linux:** inicio automático mediante systemd; descarga e inicia `ecosystem.config.js` del repositorio a `~/ecosystem.config.js`

---

## ¿Qué es PM2?

PM2 es un **administrador de procesos de producción para Node.js**: mantiene sus aplicaciones activas, las reinicia en caso de caída, maneja la gestión de logs e integra con los sistemas de inicio (init) del sistema operativo.

**Conceptos clave:**

| Concepto           | Descripción                                                               |
| ------------------ | ------------------------------------------------------------------------- |
| **App**            | Un proceso administrado por PM2 (Node.js, Python, Go o cualquier binario) |
| **Ecosystem file** | `ecosystem.config.js`: config declarativa para una o más aplicaciones     |
| **Cluster mode**   | Lanza múltiples instancias en los núcleos de la CPU (solo Node.js)        |
| **Fork mode**      | Proceso único, funciona con cualquier runtime (por defecto)               |

---

## Primeros Pasos

```bash
# Iniciar una app directamente
pm2 start app.js

# Iniciar con un nombre
pm2 start app.js --name myapp

# Iniciar usando el archivo ecosystem
pm2 start ecosystem.config.js

# Iniciar una app específica del archivo ecosystem
pm2 start ecosystem.config.js --only myapp

# Iniciar con un entorno específico
pm2 start ecosystem.config.js --env production

# Listar todos los procesos administrados
pm2 list

# Mostrar información detallada de una app
pm2 show myapp

# Monitorear todas las apps en tiempo real
pm2 monit
```

---

## Comandos Comunes

### Control de Procesos

```bash
pm2 stop myapp          # Detener (mantiene en la lista)
pm2 restart myapp       # Reiniciar
pm2 reload myapp        # Recarga sin tiempo de inactividad (modo cluster)
pm2 delete myapp        # Detener y eliminar de la lista

pm2 stop all            # Detener todas las apps
pm2 restart all         # Reiniciar todas las apps
pm2 delete all          # Eliminar todas las apps
```

### Logs

```bash
pm2 logs                # Ver todos los logs en tiempo real
pm2 logs myapp          # Ver logs de una app específica
pm2 logs --lines 200    # Mostrar las últimas 200 líneas
pm2 flush               # Limpiar todos los archivos de log
pm2 reloadLogs          # Reabrir archivos de log (útil después de rotación)
```

### Persistencia

```bash
pm2 save                # Guardar la lista de procesos actual en el disco
pm2 resurrect           # Restaurar la lista de procesos guardada
```

### Inicio automático

```bash
# Generar y configurar la integración con el sistema de inicio
pm2 startup             # Muestra un comando que debes ejecutar con sudo

# Eliminar el hook de inicio
pm2 unstartup
```

---

## Archivo Ecosystem

El archivo ecosystem (`ecosystem.config.js`) es la forma recomendada de administrar aplicaciones. Se genera una plantilla en `~/ecosystem.config.js` durante la instalación.

### Plantilla por defecto

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

## Referencia de Configuración

### General

| Opción             | Tipo    | Defecto        | Descripción                                                   |
| ------------------ | ------- | -------------- | ------------------------------------------------------------- |
| `name`             | string  | nombre archivo | Identificador usado en `pm2 list` y comandos                  |
| `script`           | string  | —              | Ruta al script de entrada (requerido)                         |
| `cwd`              | string  | —              | Directorio de trabajo para el proceso                         |
| `args`             | string  | —              | Argumentos CLI pasados al script                              |
| `interpreter`      | string  | `node`         | Ruta al intérprete del runtime                                |
| `interpreter_args` | string  | —              | Flags pasadas al intérprete (ej: `--max-old-space-size=4096`) |
| `force`            | boolean | `false`        | Permitir lanzar el mismo script más de una vez                |

### Escalabilidad

| Opción      | Tipo   | Defecto | Descripción                                           |
| ----------- | ------ | ------- | ----------------------------------------------------- |
| `instances` | number | `1`     | Número de instancias; `-1` = todos los núcleos de CPU |
| `exec_mode` | string | `fork`  | `fork` (cualquier runtime) o `cluster` (solo Node.js) |

### Estabilidad y Reinicio

| Opción                  | Tipo          | Defecto | Descripción                                                         |
| ----------------------- | ------------- | ------- | ------------------------------------------------------------------- |
| `autorestart`           | boolean       | `true`  | Reiniciar en caso de caída                                          |
| `max_restarts`          | number        | `10`    | Máximo de reinicios inestables consecutivos antes de detenerse      |
| `min_uptime`            | string/number | —       | Tiempo mínimo para considerarse estable (ms o `"2s"`)               |
| `restart_delay`         | number        | `0`     | Milisegundos a esperar antes de reiniciar una app caída             |
| `max_memory_restart`    | string        | —       | Reiniciar si el RSS excede este valor (ej: `"300M"`, `"1G"`)        |
| `kill_timeout`          | number        | `1600`  | Milisegundos antes de SIGKILL tras SIGTERM                          |
| `shutdown_with_message` | boolean       | `false` | Usar `process.send('shutdown')` en lugar de SIGTERM                 |
| `wait_ready`            | boolean       | `false` | Esperar a `process.send('ready')` antes de considerar la app online |
| `listen_timeout`        | number        | —       | Milisegundos para esperar señal `ready` antes de forzar recarga     |

### Watch

| Opción         | Tipo          | Defecto | Descripción                                                      |
| -------------- | ------------- | ------- | ---------------------------------------------------------------- |
| `watch`        | boolean/array | `false` | Reiniciar al cambiar archivos; pasar un array de rutas a vigilar |
| `ignore_watch` | array         | —       | Rutas o patrones glob excluidos de la vigilancia                 |

### Logging

| Opción                        | Tipo    | Defecto                        | Descripción                                              |
| ----------------------------- | ------- | ------------------------------ | -------------------------------------------------------- |
| `log_date_format`             | string  | —                              | Formato de marca de tiempo (ej: `"YYYY-MM-DD HH:mm:ss"`) |
| `out_file`                    | string  | `~/.pm2/logs/<name>-out.log`   | Ruta para el log stdout                                  |
| `error_file`                  | string  | `~/.pm2/logs/<name>-error.log` | Ruta para el log stderr                                  |
| `log_file`                    | string  | —                              | Ruta para log combinado stdout+stderr                    |
| `merge_logs` / `combine_logs` | boolean | `false`                        | Desactivar sufijos de log por instancia en cluster       |
| `time`                        | boolean | `false`                        | Prefijar cada línea de log con una marca de tiempo       |

### Entorno

| Opción            | Tipo    | Descripción                                                                         |
| ----------------- | ------- | ----------------------------------------------------------------------------------- |
| `env`             | object  | Variables inyectadas en todos los modos                                             |
| `env_<name>`      | object  | Variables inyectadas al iniciar con `--env <name>` (ej: `env_production`)           |
| `filter_env`      | array   | Eliminar variables de entorno globales que coincidan con estos prefijos             |
| `instance_var`    | string  | Nombre de la variable con el índice de instancia (por defecto: `NODE_APP_INSTANCE`) |
| `appendEnvToName` | boolean | Añadir el nombre del entorno al nombre de la aplicación                             |

### Source Maps y Otros

| Opción               | Tipo    | Defecto | Descripción                                                   |
| -------------------- | ------- | ------- | ------------------------------------------------------------- |
| `source_map_support` | boolean | `true`  | Habilitar soporte de source maps para stack traces            |
| `vizion`             | boolean | `true`  | Rastrear metadados del control de versiones                   |
| `cron_restart`       | string  | —       | Expresión cron para reinicios programados (ej: `"0 3 * * *"`) |
| `post_update`        | array   | —       | Comandos a ejecutar tras una actualización con `pm2 pull`     |

---

## Configuración Global de PM2

SetupVibe configura estas opciones durante la instalación:

| Opción                | Valor                 | Descripción                                                |
| --------------------- | --------------------- | ---------------------------------------------------------- |
| `pm2:autodump`        | `true`                | Guarda automáticamente la lista de procesos tras cambios   |
| `pm2:log_date_format` | `YYYY-MM-DD HH:mm:ss` | Formato de marca de tiempo por defecto para todos los logs |

```bash
pm2 set pm2:autodump true
pm2 set pm2:log_date_format "YYYY-MM-DD HH:mm:ss"
pm2 get                      # Listar todas las configuraciones actuales del módulo PM2
```

---

## Modo Cluster (Node.js)

```js
{
  instances: "max",   // o un número, o -1
  exec_mode: "cluster",
}
```

```bash
pm2 reload myapp      # Recarga progresiva sin tiempo de inactividad en modo cluster
pm2 scale myapp 4     # Escalar a 4 instancias en tiempo real
pm2 scale myapp +2    # Añadir 2 instancias más
```

---

## Inicio Automático

SetupVibe configura PM2 para que se inicie automáticamente al arrancar el sistema:

- **macOS**: registra un agente de launchd (`pm2 startup launchd`)
- **Linux**: registra un servicio de systemd (`pm2 startup systemd`)

Para rehacer esto manualmente:

```bash
pm2 startup            # Imprime el comando que debes ejecutar
pm2 save               # Guarda la lista actual de procesos
```

Para eliminar:

```bash
pm2 unstartup
```

---
