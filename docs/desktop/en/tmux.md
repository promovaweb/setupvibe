# Tmux Guide
>
> Terminal multiplexer configuration — v0.41.9

SetupVibe installs and configures tmux with [TPM](https://github.com/tmux-plugins/tpm) and a curated plugin set. The Desktop edition uses [`conf/tmux-desktop.conf`](../../../conf/tmux-desktop.conf), downloaded automatically during setup.

The Server edition uses a leaner [`conf/tmux-server.conf`](../../../conf/tmux-server.conf) — same keybindings, but without the `docker`, `mise`, and `tmux-open` plugins, and with a simplified status bar (`git · cwd` on the left).

---

## What is tmux?

tmux is a **terminal multiplexer** — it lets you run multiple terminal sessions inside a single window, keep sessions alive after disconnecting, and split your screen into panes. Essential for remote servers and power users.

**Core concepts:**

| Concept     | Description                                               |
| ----------- | --------------------------------------------------------- |
| **Session** | A collection of windows. Survives disconnection.          |
| **Window**  | Like a browser tab — a full-screen view inside a session. |
| **Pane**    | A split within a window. Multiple panes share one window. |
| **Prefix**  | `Ctrl + b` — pressed before every tmux keybind.           |

---

## Getting Started

```bash
# Start a new session
tmux

# Start a named session
tmux new -s myproject

# List sessions
tmux ls

# Attach to last session
tmux attach

# Attach to named session
tmux attach -t myproject

# Kill a session
tmux kill-session -t myproject
```

After opening tmux, press `prefix + I` (capital i) to install all plugins.

---

## Default Keybindings

> All keybinds require pressing **`Ctrl + b`** first, then the key.

### Sessions

| Keybind      | Action                                      |
| ------------ | ------------------------------------------- |
| `prefix + s` | List and switch sessions (interactive)      |
| `prefix + $` | Rename current session                      |
| `prefix + d` | Detach from session (session keeps running) |
| `prefix + (` | Switch to previous session                  |
| `prefix + )` | Switch to next session                      |
| `prefix + L` | Switch to last (previously used) session    |

### Windows

| Keybind        | Action                                |
| -------------- | ------------------------------------- |
| `prefix + c`   | Create new window                     |
| `prefix + ,`   | Rename current window                 |
| `prefix + &`   | Kill current window                   |
| `prefix + n`   | Next window                           |
| `prefix + p`   | Previous window                       |
| `prefix + l`   | Last window (toggle)                  |
| `prefix + w`   | List and switch windows (interactive) |
| `prefix + 0–9` | Switch to window by number            |
| `prefix + '`   | Prompt for window number to switch to |
| `prefix + .`   | Move window to a different index      |
| `prefix + f`   | Find window by name                   |

### Panes

| Keybind                | Action                                                                |
| ---------------------- | --------------------------------------------------------------------- |
| `prefix + %`           | Split vertically (left/right)                                         |
| `prefix + "`           | Split horizontally (top/bottom)                                       |
| `prefix + o`           | Rotate to next pane                                                   |
| `prefix + ;`           | Toggle to last active pane                                            |
| `prefix + x`           | Kill current pane                                                     |
| `prefix + z`           | Zoom/unzoom pane (toggle fullscreen)                                  |
| `prefix + q`           | Show pane numbers (press number to jump)                              |
| `prefix + {`           | Swap pane with previous                                               |
| `prefix + }`           | Swap pane with next                                                   |
| `prefix + Alt+1–5`     | Switch to preset pane layouts (even-h, even-v, main-h, main-v, tiled) |
| `prefix + !`           | Break pane into its own window                                        |
| `prefix + m`           | Mark pane                                                             |
| `prefix + M`           | Clear marked pane                                                     |
| `↑ ↓ ← →`              | Navigate panes by direction                                           |
| `prefix + Ctrl + ↑↓←→` | Resize pane (1 cell)                                                  |
| `prefix + Alt + ↑↓←→`  | Resize pane (5 cells)                                                 |

### Copy Mode

| Keybind                | Action                           |
| ---------------------- | -------------------------------- |
| `prefix + [`           | Enter copy mode                  |
| `prefix + ]`           | Paste last copied buffer         |
| `prefix + #`           | List paste buffers               |
| `prefix + =`           | Choose buffer to paste from list |
| `prefix + -`           | Delete most recent buffer        |
| `q` (in copy mode)     | Exit copy mode                   |
| `Space` (in copy mode) | Start selection                  |
| `Enter` (in copy mode) | Copy selection and exit          |
| `/` (in copy mode)     | Search forward                   |
| `?` (in copy mode)     | Search backward                  |

### Misc

| Keybind           | Action                    |
| ----------------- | ------------------------- |
| `prefix + :`      | Open tmux command prompt  |
| `prefix + ?`      | List all keybindings      |
| `prefix + r`      | Reload tmux config        |
| `prefix + t`      | Show clock                |
| `prefix + i`      | Show window info          |
| `prefix + ~`      | Show tmux messages        |
| `prefix + D`      | Choose a client to detach |
| `prefix + E`      | Spread panes evenly       |
| `prefix + Ctrl+z` | Suspend tmux client       |

---

## Plugins

### Core

| Plugin                                                                      | Description       |
| --------------------------------------------------------------------------- | ----------------- |
| [tmux-plugins/tpm](https://github.com/tmux-plugins/tpm)                     | Plugin manager    |
| [tmux-plugins/tmux-sensible](https://github.com/tmux-plugins/tmux-sensible) | Sensible defaults |

**TPM keybinds:**

| Keybind          | Action                |
| ---------------- | --------------------- |
| `prefix + I`     | Install plugins       |
| `prefix + U`     | Update plugins        |
| `prefix + Alt+u` | Remove unused plugins |

---

### Navigation & Pane Control

#### [tmux-pain-control](https://github.com/tmux-plugins/tmux-pain-control)

Consistent, intuitive pane splitting and resizing keybinds.

| Keybind            | Action                          | Replaces default                          |
| ------------------ | ------------------------------- | ----------------------------------------- |
| `prefix + \|`      | Split vertically (left/right)   | `prefix + %` still works                  |
| `prefix + -`       | Split horizontally (top/bottom) | Overrides `delete-buffer` (rarely used)   |
| `prefix + \`       | Split full-width vertically     | —                                         |
| `prefix + _`       | Split full-height horizontally  | —                                         |
| `prefix + h`       | Select pane left                | —                                         |
| `prefix + j`       | Select pane down                | —                                         |
| `prefix + k`       | Select pane up                  | —                                         |
| `prefix + l`       | Select pane right               | `last-window` restored after plugin loads |
| `prefix + H/J/K/L` | Resize pane (5 cells)           | —                                         |

#### [christoomey/vim-tmux-navigator](https://github.com/christoomey/vim-tmux-navigator)

Navigate between tmux panes and vim splits with the same keys.

| Keybind    | Action                |
| ---------- | --------------------- |
| `Ctrl + h` | Move left             |
| `Ctrl + j` | Move down             |
| `Ctrl + k` | Move up               |
| `Ctrl + l` | Move right            |
| `Ctrl + \` | Move to previous pane |

> No prefix needed. Works transparently inside vim/neovim.

---

### Mouse

#### [NHDaly/tmux-better-mouse-mode](https://github.com/NHDaly/tmux-better-mouse-mode)

| Feature                  | Behavior                                          |
| ------------------------ | ------------------------------------------------- |
| Scroll down in copy mode | Exits copy mode automatically                     |
| Scroll over pane         | Does not change active pane                       |
| Scroll in vim/less/man   | Sends scroll events to the app (alternate buffer) |

---

### Copy & Clipboard

#### [tmux-plugins/tmux-yank](https://github.com/tmux-plugins/tmux-yank)

| Keybind      | Context   | Action                                   |
| ------------ | --------- | ---------------------------------------- |
| `prefix + y` | Normal    | Copy text on command line                |
| `prefix + Y` | Normal    | Copy current working directory           |
| `y`          | Copy mode | Copy selection to clipboard              |
| `Y`          | Copy mode | Copy selection and paste to command line |

#### [CrispyConductor/tmux-copy-toolkit](https://github.com/CrispyConductor/tmux-copy-toolkit)

| Keybind      | Action                |
| ------------ | --------------------- |
| `prefix + e` | Activate copy toolkit |

#### [abhinav/tmux-fastcopy](https://github.com/abhinav/tmux-fastcopy)

Hint-based copying (vimium-style). Highlights text patterns on screen and lets you copy them by typing short hint letters.

| Keybind      | Action                  |
| ------------ | ----------------------- |
| `prefix + F` | Activate fastcopy hints |

Recognizes: URLs, IPs, Git hashes, file paths, UUIDs, hex colors, numbers, and more.

> Uses `prefix + F` (uppercase) — `prefix + f` is preserved for tmux's built-in `find-window`.

---

### URL & File Opening

#### [tmux-plugins/tmux-open](https://github.com/tmux-plugins/tmux-open)

| Keybind     | Context   | Action                       |
| ----------- | --------- | ---------------------------- |
| `o`         | Copy mode | Open with system default app |
| `Ctrl + o`  | Copy mode | Open with `$EDITOR`          |
| `Shift + s` | Copy mode | Search selection in browser  |

#### [wfxr/tmux-fzf-url](https://github.com/wfxr/tmux-fzf-url)

| Keybind      | Action          |
| ------------ | --------------- |
| `prefix + u` | Open URL picker |

---

### Session Management

#### [tmux-plugins/tmux-resurrect](https://github.com/tmux-plugins/tmux-resurrect)

Save and restore the entire tmux environment across reboots.

| Keybind           | Action          |
| ----------------- | --------------- |
| `prefix + Ctrl+s` | Save session    |
| `prefix + Ctrl+r` | Restore session |

Saves: windows, panes, working directories, pane contents, running programs.

#### [tmux-plugins/tmux-continuum](https://github.com/tmux-plugins/tmux-continuum)

| Feature               | Value            |
| --------------------- | ---------------- |
| Auto-save interval    | Every 10 minutes |
| Auto-restore on start | Enabled          |

No keybinds — works automatically in the background.

#### [omerxx/tmux-sessionx](https://github.com/omerxx/tmux-sessionx)

Full-featured session manager with fzf preview.

| Keybind      | Action               |
| ------------ | -------------------- |
| `prefix + S` | Open session manager |

Inside sessionx: `Ctrl+d` delete session, `Ctrl+r` rename, `Tab` switch preview.

> Uses `prefix + S` (uppercase) — `prefix + o` is preserved for tmux's built-in `rotate-pane`.

---

### Fuzzy Finder

#### [sainnhe/tmux-fzf](https://github.com/sainnhe/tmux-fzf)

Manage sessions, windows, panes, and run commands via fzf.

| Keybind                  | Action             |
| ------------------------ | ------------------ |
| `prefix + F` (uppercase) | Open tmux-fzf menu |

---

### UI Helpers

#### [Freed-Wu/tmux-digit](https://github.com/Freed-Wu/tmux-digit)

| Keybind        | Action                           |
| -------------- | -------------------------------- |
| `prefix + 0–9` | Jump directly to window by index |

#### [anghootys/tmux-ip-address](https://github.com/anghootys/tmux-ip-address)

Displays the machine's current IP address in the status bar. No keybinds.

#### [tmux-plugins/tmux-prefix-highlight](https://github.com/tmux-plugins/tmux-prefix-highlight)

Highlights the status bar when the prefix key is active, in copy mode, or in sync mode. No keybinds.

#### [alexwforsythe/tmux-which-key](https://github.com/alexwforsythe/tmux-which-key)

| Keybind          | Action              |
| ---------------- | ------------------- |
| `prefix + Space` | Open which-key menu |

> `prefix + Space` is intentionally given to which-key. Next-layout is still available via `prefix + Alt+1–5`.

#### [jaclu/tmux-menus](https://github.com/jaclu/tmux-menus)

| Keybind      | Action            |
| ------------ | ----------------- |
| `prefix + g` | Open context menu |

---

### Theme

#### [2KAbhishek/tmux2k](https://github.com/2KAbhishek/tmux2k)

**Desktop** (`tmux-desktop.conf`):

| Position | Widgets                            |
| -------- | ---------------------------------- |
| Left     | `git` · `cwd` · `docker` · `mise`  |
| Right    | `cpu` · `ram` · `network` · `time` |

**Server** (`tmux-server.conf`):

| Position | Widgets                            |
| -------- | ---------------------------------- |
| Left     | `git` · `cwd`                      |
| Right    | `cpu` · `ram` · `network` · `time` |

**Theme:** `onedark` with powerline separators on both editions.

---

## Key Conflict Resolution

| Key              | tmux default                  | Plugin            | Resolution                                                                 |
| ---------------- | ----------------------------- | ----------------- | -------------------------------------------------------------------------- |
| `prefix + f`     | `find-window`                 | tmux-fastcopy     | Fastcopy moved to `prefix + F` — default preserved                         |
| `prefix + o`     | `rotate-pane`                 | tmux-sessionx     | Sessionx moved to `prefix + S` — default preserved                         |
| `prefix + l`     | `last-window`                 | tmux-pain-control | Default restored with `bind-key l last-window` after TPM loads             |
| `prefix + -`     | `delete-buffer`               | tmux-pain-control | Pain-control overrides with split-h — accepted (rarely used default)       |
| `prefix + \`     | *(pain-control split)*        | tmux-menus        | Menus moved to `prefix + g` — pain-control split preserved                 |
| `prefix + M`     | `select-pane -M` (clear mark) | tmux-menus        | Menus moved to `prefix + g` — default preserved                            |
| `prefix + Space` | `next-layout`                 | tmux-which-key    | which-key takes Space — next-layout still available via `prefix + Alt+1–5` |

---
