# PM2 Guide
>
> Process management guide — v0.41.8

SetupVibe installs [PM2](https://pm2.keymetrics.io/) globally and configures it for auto-startup on the Desktop edition.

- **macOS:** auto-startup via launchd; downloads and starts `ecosystem.config.js` from the repository to `~/ecosystem.config.js`
- **Linux:** auto-startup via systemd; downloads and starts `ecosystem.config.js` from the repository to `~/ecosystem.config.js`

---

## What is PM2?

PM2 is a **production process manager for Node.js** — it keeps your applications alive, restarts them on crash, handles log management, and integrates with system init systems.

**Core concepts:**

| Concept            | Description                                                     |
| ------------------ | --------------------------------------------------------------- |
| **App**            | A process managed by PM2 (Node.js, Python, Go, or any binary)   |
| **Ecosystem file** | `ecosystem.config.js` — declarative config for one or more apps |
| **Cluster mode**   | Spawns multiple instances across CPU cores (Node.js only)       |
| **Fork mode**      | Single process, works with any runtime (default)                |

---

## Getting Started

```bash
# Start an app directly
pm2 start app.js

# Start with a name
pm2 start app.js --name myapp

# Start using ecosystem file
pm2 start ecosystem.config.js

# Start a specific app from ecosystem file
pm2 start ecosystem.config.js --only myapp

# Start with a specific environment
pm2 start ecosystem.config.js --env production

# List all managed processes
pm2 list

# Show detailed info for one app
pm2 show myapp

# Monitor all apps in real time
pm2 monit
```

---

## Common Commands

### Process Control

```bash
pm2 stop myapp          # Stop (keeps in list)
pm2 restart myapp       # Restart
pm2 reload myapp        # Zero-downtime reload (cluster mode)
pm2 delete myapp        # Stop and remove from list

pm2 stop all            # Stop all apps
pm2 restart all         # Restart all apps
pm2 delete all          # Remove all apps
```

### Logs

```bash
pm2 logs                # Stream all logs
pm2 logs myapp          # Stream logs for one app
pm2 logs --lines 200    # Show last 200 lines
pm2 flush               # Clear all log files
pm2 reloadLogs          # Reopen log files (useful after rotation)
```

### Persistence

```bash
pm2 save                # Save current process list to disk
pm2 resurrect           # Restore saved process list
```

### Startup

```bash
# Generate and configure init system integration
pm2 startup             # Outputs a command — run it with sudo

# Remove startup hook
pm2 unstartup
```

---

## Ecosystem File

The ecosystem file (`ecosystem.config.js`) is the recommended way to manage apps. A template is generated at `~/ecosystem.config.js` during setup.

### Default Template

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

## Configuration Reference

### General

| Option             | Type    | Default         | Description                                                        |
| ------------------ | ------- | --------------- | ------------------------------------------------------------------ |
| `name`             | string  | script filename | App identifier used in `pm2 list` and commands                     |
| `script`           | string  | —               | Path to the entry script (required)                                |
| `cwd`              | string  | —               | Working directory for the process                                  |
| `args`             | string  | —               | CLI arguments passed to the script                                 |
| `interpreter`      | string  | `node`          | Path to the runtime interpreter                                    |
| `interpreter_args` | string  | —               | Flags passed to the interpreter (e.g. `--max-old-space-size=4096`) |
| `force`            | boolean | `false`         | Allow launching the same script more than once                     |

### Scaling

| Option      | Type   | Default | Description                                      |
| ----------- | ------ | ------- | ------------------------------------------------ |
| `instances` | number | `1`     | Number of instances; `-1` = all CPU cores        |
| `exec_mode` | string | `fork`  | `fork` (any runtime) or `cluster` (Node.js only) |

### Stability & Restart

| Option                  | Type          | Default | Description                                                        |
| ----------------------- | ------------- | ------- | ------------------------------------------------------------------ |
| `autorestart`           | boolean       | `true`  | Restart on crash                                                   |
| `max_restarts`          | number        | `10`    | Max consecutive unstable restarts before stopping                  |
| `min_uptime`            | string/number | —       | Minimum uptime to be considered stable (ms or `"2s"`)              |
| `restart_delay`         | number        | `0`     | Milliseconds to wait before restarting a crashed app               |
| `max_memory_restart`    | string        | —       | Restart if RSS exceeds this value (e.g. `"300M"`, `"1G"`)          |
| `kill_timeout`          | number        | `1600`  | Milliseconds before SIGKILL after SIGTERM                          |
| `shutdown_with_message` | boolean       | `false` | Use `process.send('shutdown')` instead of SIGTERM                  |
| `wait_ready`            | boolean       | `false` | Wait for `process.send('ready')` before considering the app online |
| `listen_timeout`        | number        | —       | Milliseconds to wait for `ready` signal before forcing reload      |

### Watch

| Option         | Type          | Default | Description                                              |
| -------------- | ------------- | ------- | -------------------------------------------------------- |
| `watch`        | boolean/array | `false` | Restart on file changes; pass an array of paths to watch |
| `ignore_watch` | array         | —       | Paths or glob patterns excluded from watch               |

### Logging

| Option                        | Type    | Default                        | Description                                       |
| ----------------------------- | ------- | ------------------------------ | ------------------------------------------------- |
| `log_date_format`             | string  | —                              | Timestamp format (e.g. `"YYYY-MM-DD HH:mm:ss"`)   |
| `out_file`                    | string  | `~/.pm2/logs/<name>-out.log`   | Path for stdout log                               |
| `error_file`                  | string  | `~/.pm2/logs/<name>-error.log` | Path for stderr log                               |
| `log_file`                    | string  | —                              | Path for combined stdout+stderr log               |
| `merge_logs` / `combine_logs` | boolean | `false`                        | Disable per-instance log suffixes in cluster mode |
| `time`                        | boolean | `false`                        | Auto-prefix every log line with a timestamp       |

### Environment

| Option            | Type    | Description                                                                 |
| ----------------- | ------- | --------------------------------------------------------------------------- |
| `env`             | object  | Variables injected in all modes                                             |
| `env_<name>`      | object  | Variables injected when started with `--env <name>` (e.g. `env_production`) |
| `filter_env`      | array   | Strip global env variables matching these prefixes                          |
| `instance_var`    | string  | Variable name holding the instance index (default: `NODE_APP_INSTANCE`)     |
| `appendEnvToName` | boolean | Append the environment name to the app name                                 |

### Source Maps & Misc

| Option               | Type    | Default | Description                                                 |
| -------------------- | ------- | ------- | ----------------------------------------------------------- |
| `source_map_support` | boolean | `true`  | Enable source map support for stack traces                  |
| `vizion`             | boolean | `true`  | Track version control metadata                              |
| `cron_restart`       | string  | —       | Cron expression for scheduled restarts (e.g. `"0 3 * * *"`) |
| `post_update`        | array   | —       | Commands to run after a `pm2 pull` update                   |

---

## Global PM2 Settings

SetupVibe configures these during setup:

| Setting               | Value                 | Description                              |
| --------------------- | --------------------- | ---------------------------------------- |
| `pm2:autodump`        | `true`                | Auto-save the process list on any change |
| `pm2:log_date_format` | `YYYY-MM-DD HH:mm:ss` | Default timestamp format for all logs    |

```bash
pm2 set pm2:autodump true
pm2 set pm2:log_date_format "YYYY-MM-DD HH:mm:ss"
pm2 get                      # List all current PM2 module settings
```

---

## Cluster Mode (Node.js)

```js
{
  instances: "max",   // or a number, or -1
  exec_mode: "cluster",
}
```

```bash
pm2 reload myapp      # Zero-downtime rolling reload in cluster mode
pm2 scale myapp 4     # Scale to 4 instances at runtime
pm2 scale myapp +2    # Add 2 more instances
```

---

## Auto-Startup

SetupVibe configures PM2 to start automatically on boot:

- **macOS** — registers a launchd agent (`pm2 startup launchd`)
- **Linux** — registers a systemd service (`pm2 startup systemd`)

To redo this manually:

```bash
pm2 startup            # Prints the command to run
pm2 save               # Saves the current process list
```

To remove:

```bash
pm2 unstartup
```

---
