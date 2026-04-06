# Cronboard Guide
> Cron TUI for dashboard monitoring — v0.41.6

SetupVibe installs [Cronboard](https://github.com/antoniorodr/cronboard) to provide a terminal user interface (TUI) for managing cron tasks.

---

## What is Cronboard?

Cronboard is a terminal-based dashboard for managing cron jobs locally and on remote servers. It allows you to visualize, create, edit, pause, and delete tasks intuitively, without manually editing text files.

**Key Features:**

- **Visual Interface (TUI):** User-friendly management via keyboard.
- **Validation:** Real-time feedback on cron expression validity.
- **Natural Language:** Converts cron expressions into human-readable descriptions (e.g., "Every day at 00:00").
- **Remote Support:** SSH connection to manage crontabs on other servers.
- **Search:** Quickly filter jobs by keywords.

---

## Basic Usage

```bash
# Open Cronboard dashboard
cronboard

# Or use the SetupVibe shortcut
cronb
```

### Keyboard Commands in the Dashboard

| Key | Action |
|---|---|
| `j` / `k` or `↑` / `↓` | Navigate between tasks |
| `n` | Create a new task |
| `e` | Edit the selected task |
| `p` | Pause/Resume task (comment/uncomment in crontab) |
| `d` | Delete task |
| `s` | Save changes |
| `f` | Filter tasks |
| `q` | Quit Cronboard |

---

## Remote Management

Cronboard allows you to manage servers via SSH. You can configure connections in the Cronboard configuration file.

For more details on advanced settings, visit the [official documentation](https://antoniorodr.github.io/cronboard/configuration/).

---
