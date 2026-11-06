# Database Browser Pattern

A multi-view interface for exploring a database: list tables, browse rows with
pagination/sorting/filtering, inspect schema, and run ad-hoc queries. Modeled
on tools like dbview — the canonical "serious data tool" layout.

Use `patterns/data-browser.md` for simple list+detail screens; use this
pattern when the app has **multiple peer views over one dataset** and needs
query, schema, and destructive-action support.

---

## Use When

- Browsing tables, collections, buckets, or topics in a data store
- The user inspects rows, not documents: many rows, many columns
- Ad-hoc querying, schema inspection, import/export are first-class
- Writes happen in-session (edit cell, delete/duplicate row) and must be guarded

---

## Layout — Data View (primary screen)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  dbv — orders                                                            │
│  2 filters: pending ×  total>100 ×                      12,480 rows      │
├──────────────────────────────────────────────────────────────────────────┤
│      id ▲   customer      status     total   items   created_at          │
│   ─────────────────────────────────────────────────────────────          │
│ ▸ 1,042   acme-corp      pending      $182       3   2026-09-01          │
│   1,043   globex         shipped      $ 61       1   2026-09-01          │
│   1,044   initech        pending      $340      12   2026-09-02          │
│   1,045   acme-corp      shipped      $ 99       2   2026-09-02          │
│   1,046   umbrella       cancelled    $ 12       1   2026-09-03          │
│   1,047   stark-ind      pending      $228       7   2026-09-03          │
│   1,048   wayne-enter    shipped      $560      15   2026-09-04          │
│   1,049   wonka-ind      pending      $ 45       2   2026-09-04          │
├──────────────────────────────────────────────────────────────────────────┤
│  rows 1,009-1,016 of 12,480            page 64 of 1,560                  │
│  [ ] page   { } ends   1-9 sort   ←→ col   ctrl+f filter   s schema      │
└──────────────────────────────────────────────────────────────────────────┘
```

The header carries context (active filter chips, row counts), the grid is the
hero, the footer carries absolute position and the keymap. Nothing else.

---

## Views

Peer views over one connection, navigated as a stack (`esc` always pops):

| View | Purpose | Enter via |
|------|---------|-----------|
| Tables | List all tables/collections, row estimates | start, `esc` from data |
| Data | Rows of one table: page, sort, filter, edit | `enter` on a table |
| Schema | Columns, types, keys, indexes of one table | `s` |
| Query | Ad-hoc input with history; results in a grid | `/` |
| Query log | Past queries and filters, re-runnable | `Q` |

Per-view state (page, cursor, sort, filters) is preserved when navigating
away and back. Returning from Schema to Data must land exactly where you left.

---

## Components

### Filter Chips (header, data view)

- Committed terms render as `term ×` chips; `×` or `ctrl+d` removes the last
  one. Typing (`ctrl+f`) filters live before commit; `a + b` commits two.
- AND logic: a row must match every term. Match count updates per keystroke.

### Data Grid

- Numbered-key sort `1`-`9` toggling `▲`/`▼` on the header (see
  `references/advanced-patterns.md` §2).
- Column cursor (`←→`/`hl`) for cell-scoped actions (`c` copy cell).
- Fixed row height; truncate cells with `…`; right-align numerics.
- Page size derived from viewport height, clamped after every mutation.

### Confirm Modal

- Any destructive key (`x` delete row, `X`/drop-class actions) opens a modal
  naming the exact target. `y` confirms, everything else cancels. While open,
  no other view keys fire.

### Status Bar (all views, same 3 zones)

- Left: connection dot (`● connected` / `● retrying in 4s`)
- Center: view context — position, filters, sort, selection
- Right: 3-5 hints for the current view

---

## Interaction

### Global (work identically in every view)

| Key | Action |
|-----|--------|
| `?` | Help overlay |
| `T` | Cycle theme (announced in status bar) |
| `Q` | Query/filter log |
| `q` | Quit |
| `esc` | Back / cancel |
| `ctrl+c` | Force quit (double-press escape hatch) |

### Tables View

| Key | Action |
|-----|--------|
| `↑↓` / `jk` | Navigate |
| `enter` | Open table → Data view |
| `s` | Schema view |
| `r` | Reload table list |

### Data View

| Key | Action |
|-----|--------|
| `↑↓` / `←→` | Row / column cursor |
| `1`-`9` | Sort by column N (toggle ASC/DESC) |
| `[` `]` / `{` `}` | Prev/next page / first/last page |
| `ctrl+f` | Live filter (AND terms, history via `↑↓`) |
| `ctrl+d` / `backspace` | Remove last committed filter |
| `e` | Edit cell (confirm) |
| `x` / `d` | Delete row (confirm) / duplicate row |
| `c` / `C` | Copy cell / copy row |
| `s` / `r` | Schema / reload data |

### Query View

| Key | Action |
|-----|--------|
| (type) | Live result preview |
| `enter` | Run query, results in grid |
| `↑↓` | Query history |
| `esc` | Back |

---

## State Handling

### Empty table

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│                          orders has no rows                              │
│                                                                          │
│        `a` add row    `I` import CSV/JSON    `esc` back to tables        │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Filtered to empty

```
│   no rows match: pending ×  total>100 ×                                  │
│   `esc` clears all filters, `ctrl+d` removes the last term               │
```

### Disconnected (stability contract)

```
│ ● retrying in 4s (attempt 3/5)          previous rows kept, `r` retry now │
```

Old data stays visible during outages; the banner names the next action.
Never blank the grid because a refresh failed.

### Loading (first open only)

```
│   loading orders… ⠋                                                      │
```

Subsequent reloads keep old rows on screen and show a status-bar spinner.

---

## Design Notes

- Data grid owns 100% of the body; schemas and query results borrow the same
  grid component — one table implementation, four consumers.
- Numerics right-aligned, timestamps ISO-8601 `YYYY-MM-DD`, money with fixed
  decimals and aligned decimal points — column types drive alignment.
- Destructive vs frequent keys follow case-risk mapping: `x` delete row
  (confirmed), shift-class keys reserved for drop/flush operations.
- The pattern's stability obligations (resize gate, timeouts, reconnect,
  drop-count for streams) are specified in
  `references/stability-and-robustness.md`.
