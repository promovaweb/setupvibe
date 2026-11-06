# dbview-go — Advanced Data Browser (Bubble Tea)

A complete, runnable Bubble Tea app modeled on
[dbview](https://github.com/pageton/dbview): a multi-view database browser
with pagination, typed sorting, live multi-term filtering, query history,
inline editing, and confirmed destructive actions. It is the reference
implementation for `references/advanced-patterns.md`.

Runs entirely on an in-memory dataset (no database server needed), so the
full interaction model is observable out of the box.

## Run

```bash
cd projects/dbview-go
go run .          # TUI
go test ./...     # logic + render smoke tests (no TTY needed)
```

## What It Demonstrates

| Feature | Keys | Reference |
|---------|------|-----------|
| Multi-view stack (tables → data → schema → query → log) | `esc` always pops | advanced-patterns §4 |
| Pagination derived from viewport height | `[` `]` `{` `}` | §1 |
| Stable typed sorting (numbers sort as numbers) | `1`-`9` toggle ▲▼ | §2 |
| Live AND filtering, `a + b` multi-commit, history | `ctrl+f`, `↑↓` | §3 |
| Confirm-before-delete with exact target | `x`, then `y`/`n` | §5 |
| Query + filter history | `↑↓` in inputs, `Q` log | §6 |
| Runtime theme cycling (mono / ocean / ember) | `T` | §7 |
| Clipboard with status feedback | `c` cell, `C` row | §8 |
| Three-zone status bar, per-view hints | — | §9 |
| Inline cell edit | `e`, `enter` save | — |

Stability practices on display: minimum-size gate (`references/stability-and-robustness.md`
§1), simulated async loads with stale-generation discard (§2), designed
empty/filtered-empty/loading states (§4), empty viewport and 3-terminal-size
render smoke tests (`render_test.go`).

## Architecture

```
main.go    Model, view stack, layout math (pageSize derives from height)
update.go  Key routing: modal > edit > input > view, globals last
store.go   Domain: tables, typed columns, filter/sort/paginate, history
view.go    Rendering: grid, status bar, modals, themes
theme.go   Palette structs — components read styles, never constants
```

Key routing order is the safety story: while an input mode is active, `q`
types the letter `q` instead of quitting (`TestTypingQInFilterDoesNotQuit`).
