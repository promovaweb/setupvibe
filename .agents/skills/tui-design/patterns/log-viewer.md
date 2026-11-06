# Log Viewer Pattern

A real-time, filterable log viewer for streaming, searching, and inspecting log entries.

---

## Use When

- Viewing application logs, system logs, or event streams
- Debugging with real-time log tailing
- Searching and filtering historical logs

---

## Layout

```
+──────────────────────────────────────────────────────────────────────+
│  Logs — production                             ⠋ Streaming           │
├──────────────────────────────────────────────────────────────────────┤
│  /: search  [All] [Error] [Warn] [Info]  f: follow  c: clear         │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  10:42:31.204  INFO   server.start        Listening on :8080         │
│  10:42:31.205  INFO   db.connect          Connected to postgres      │
│  10:42:31.512  INFO   server.request      GET /api/records 200 12ms  │
│  10:42:31.890  WARN   cache.miss          Cache miss for key: user42 │
│  10:42:32.001  INFO   server.request      GET /api/users 200 45ms    │
▸│  10:42:32.114  ERROR  db.query            Timeout after 30s         │
│  10:42:32.115  ERROR  server.request      GET /api/records 500 30s   │
│  10:42:32.340  INFO   server.request      GET /health 200 2ms        │
│  10:42:33.001  INFO   cache.refresh       Refreshed 42 entries       │
│  10:42:33.210  INFO   server.request      POST /api/records 201 8ms  │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│  10:42:32 ERROR  db.query — Timeout after 30s                        │
│                                                                      │
│  query: SELECT * FROM records WHERE status = $1                      │
│  params: ["active"]                                                  │
│  error: connection timeout: context deadline exceeded                │
│                                                                      │
│  [c] Copy  [Esc] Close                                               │
├──────────────────────────────────────────────────────────────────────┤
│ ● Streaming │ 10,247 entries │ Showing errors │ ↑ newest  /: search  │
+──────────────────────────────────────────────────────────────────────+
```

---

## Components

### Filter Bar

- Level filters as toggle buttons (All, Error, Warn, Info, Debug)
- Search input activated by `/`
- Follow mode toggle (auto-scroll to bottom)
- Clear action

### Log Stream (main area)

- Columns: timestamp, level, source, message
- Level-based color coding: ERROR (red), WARN (yellow), INFO (default), DEBUG (dim)
- Selected line highlighted
- Auto-scrolls to bottom in follow mode
- Pauses auto-scroll when user scrolls up

### Detail Panel (bottom, collapsible)

- Shows expanded view of selected log entry
- Structured data (key-value pairs from JSON/structured logs)
- Full error message and stack trace
- Copy action for selected entry

### Status Bar

- Streaming state (live/paused)
- Total entry count
- Active filter description
- Scroll position indicator

---

## Interaction

| Key | Action |
|-----|--------|
| `j/k` | Scroll through log entries |
| `G` / `End` | Jump to newest (bottom) |
| `g` / `Home` | Jump to oldest (top) |
| `Enter` | Toggle detail panel for selected entry |
| `/` | Open search |
| `f` | Toggle follow mode (auto-scroll) |
| `c` | Clear all visible logs |
| `e` | Toggle error-only filter |
| `1-5` | Filter by level (All/Debug/Info/Warn/Error) |
| `n` / `N` | Next/previous search match |
| `Space` | Toggle follow mode pause |
| `Ctrl+C` | Stop streaming |

---

## State Handling

### Loading

```
  Loading log entries... ⠋
  Fetching last 1000 entries from production.
```

### Streaming (live)

- Auto-append new entries at bottom
- Show streaming indicator in header: `⠋ Streaming`
- In follow mode: auto-scroll to show newest
- Entry count updates in real-time

### Paused

- When user scrolls up, auto-pause follow mode
- Show indicator: `Paused — Press f to resume`
- New entries still buffer but don't scroll the view

### Empty (no matching logs)

```
  No log entries match your filter.

  47,291 total entries hidden by filters.
  Press 1 to show all levels, or Esc to clear search.
```

### Error (connection lost)

```
  ⚠ Connection lost — log stream interrupted
  Last entry received: 5 seconds ago
  [r] Reconnect  [q] Quit
```

---

## Performance Considerations

- **Virtual scrolling** — Only render visible lines, not the entire log buffer
- **Ring buffer** — Cap in-memory log entries (e.g., 10,000 newest)
- **Debounced search** — Filter on typing pause, not every keystroke
- **Lazy detail** — Only parse structured data when entry is selected
- **Batched rendering** — Don't re-render for every single new log entry; batch updates (e.g., every 100ms)

---

## Color Strategy

```
  Timestamp:    Muted (dim gray)
  Level INFO:  Base (default foreground)
  Level WARN:  Warning (yellow)
  Level ERROR: Error (red)
  Level DEBUG: Muted (dim)
  Source:      Muted
  Message:     Base
```

Don't color entire lines — color only the level badge and relevant parts. The message should remain readable.

---

## Variations

### Compact (no detail panel)

Detail shows inline on selection or via drill-down:

```
▸ 10:42:32 ERROR db.query — Timeout after 30s
      query: SELECT * FROM records WHERE status = $1
      error: context deadline exceeded
```

### Multi-Source (tabbed)

Multiple log sources in tabs:

```
  [App]  [Nginx]  [Postgres]  [Redis]
```

### Split (two streams)

```
┌─────────────────────────────────┬───────────────────────────────────┐
│  Logs — app                     │  Logs — nginx                     │
│  ...                            │  ...                              │
└─────────────────────────────────┴───────────────────────────────────┘
```
