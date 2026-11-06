# Advanced TUI Patterns

Patterns for data-dense, multi-view TUI applications — the difference between a
toy and a tool. Modeled on mature data browsers (dbview, k9s, btop): virtualized
tables, live filtering, runtime theming, and safe destructive actions.

Load this reference when the app needs any of: large datasets, pagination,
multi-field filtering, inline editing, command/query history, runtime theme
switching, or clipboard support.

---

## 1. Virtualized Tables and Pagination

Two strategies for large datasets. Choose one per view, not both:

| Strategy | Use when | Cost |
|----------|----------|------|
| **Pagination** | Server-backed data, DB cursors, APIs | Simple; page state is trivial to persist |
| **Virtual scrolling** | Local data, logs, streams | Render window only; needs scroll-offset math |

### Pagination rules

- Page size derives from viewport height: `pageSize = visibleRows`. Never a
  hardcoded constant — it must survive a resize.
- Show absolute position: `rows 101–150 of 12,480`, not just `page 3/250`.
- Bound the page index on every mutation. After filtering or deleting a row,
  clamp `page = min(page, lastPage)` — a stale page past the end is a blank
  screen bug users report constantly.
- Keys: `[` `]` prev/next page, `{` `}` first/last. Keep them out of the way —
  they are low-frequency, so modifier-free punctuation is fine.

### Virtual scrolling rules

- Maintain `scrollOffset` + `cursor` as independent values. `cursor` is the
  selected item (absolute index), `scrollOffset` is the first rendered row.
- After every cursor move, clamp the cursor into the window:
  `scrollOffset <= cursor < scrollOffset + visibleRows`.
- Total memory for 10M rows must stay O(visible), either via a ring buffer
  (streams) or by never materializing rows you don't render (lazy sources).

---

## 2. Column Sorting

- Sort key selection via number keys `1`-`9` mapping to visible columns. This
  is faster than a sort menu and self-documents once the hint is in the footer.
- Same key toggles direction: first press ASC, second DESC, third back to
  "no sort" (natural order) if the data source has one.
- Always show direction on the header: `Name ▲` / `Name ▼`.
- Sort **stable** (preserve original order for ties) — unstable sorts make
  rows visibly jump between identical renders and look like flicker.
- Sort on typed values, not rendered strings: `"10" < "9"` is wrong. Keep the
  column's value type in the column definition and dispatch on it.
- Sorting re-orders the *full* result set, then pagination slices it. Never
  sort a single page — that produces page-local order that breaks at page
  boundaries.

---

## 3. Live Filtering (Multi-Term, AND Logic)

The filter model used by dbview and similar tools — all terms must match:

1. `ctrl+f` enters filter mode. Typing filters **live** (each keystroke
   re-applies the filter — no submit button).
2. `enter` commits the term. `term1 + term2` commits two terms at once;
   quotes are stripped (`"pending" + "err"`).
3. Committed terms render as removable chips: `pending ×  err ×`.
4. `backspace` on an empty input removes the last committed term.
5. `esc` clears everything and returns to the data view.
6. `↑` / `↓` in the input walks **filter history** — users re-run the same
   filters constantly. Cap history at ~50 entries.

Implementation rules:

- Match case-insensitively across all visible cells; report match count
  immediately (`4,201 of 12,480 rows`).
- Keep the *unfiltered* result set; filters compose over it. Re-filtering from
  source on every keystroke is O(n) per key and will jank on large data.
- Filtered-to-empty is a designed state: show the active terms, hint `Esc to
  clear`. Never render a bare empty table.

---

## 4. Multi-View Apps With a View Stack

Data tools are not one screen — they are a small set of peer views sharing one
dataset: list → data → schema → query. Model this as a stack, not a state
machine with enum soup:

```
type view int

const (
    viewTables view = iota
    viewData
    viewSchema
    viewQuery
    viewLog
)

// stack holds the navigation path; esc pops.
```

Rules:

- `esc` always means "go back one view" and is reliable from every view. If a
  view has an input mode, first `esc` exits input mode, second `esc` pops.
- Each view owns its own keymap; **global keys** (`?`, `q`, `T`, theme, quit)
  dispatch before view-local keys. A global key must work identically
  everywhere — that is what makes `q` trustworthy.
- Every view renders its own key hints in the same status bar slot. The user
  should never have to open help to know what a view does.
- Preserve per-view state across navigation: returning from schema to data
  must restore page, cursor, sort, and filters. Losing position on `esc` is a
  top complaint in data tools.

---

## 5. Destructive Actions: Confirm, Never Undo

Terminal UIs have no native undo. The safety model is **confirm up front**:

```
┌────────────────────────────────────────────┐
│  Delete row 42 from `orders`?              │
│                                            │
│    id=1042  status=pending  total=$89.00   │
│                                            │
│    y  confirm      n / esc  cancel         │
└────────────────────────────────────────────┘
```

- Destructive keys (`x` delete, `D` drop, `F` flush) open a modal naming the
  **exact target** (table, row id, count). `y` confirms; anything else —
  `n`, `esc`, or an unrelated key — cancels.
- Modal focus is total: while open, no data-view keys fire. Route keys through
  the modal first.
- Uppercase vs lowercase matters for risk: in dbview `x` deletes a row
  (confirmed) while `X`-class actions (drop table) use shift-keys precisely
  because they are rarer and worse. Keep that mapping: frequent-and-small on
  lowercase, rare-and-large on shift.
- For bulk deletes, show the count in the modal (`Delete 137 rows?`), not just
  "selection".
- If you must offer undo, snapshot the affected rows in memory before the
  mutation and expose a single-level `u` undo with a status-bar toast. One
  level, in-memory, per session — no history log.

---

## 6. Query and Command History

Any view with a text input that produces results (query editor, filter, jump)
gets history:

- `↑` / `↓` inside the input walks history; unsent text is restored when the
  user returns past the newest entry.
- Persist history to disk (`~/.cache/<app>/history`) on exit, load on start,
  cap at ~100 entries, dedupe consecutive duplicates.
- Show history count in the view (`12 entries`) so the feature is discoverable.
- A query **log view** (`Q` in dbview) lists past queries/filters with result
  counts and timestamps; `enter` expands an entry. This turns one-off inputs
  into reviewable, re-runnable state.

---

## 7. Runtime Theming

Ship multiple themes and let the user cycle them live (`T`). The mechanism:

```go
type theme struct {
    name    string
    base    lipgloss.Style
    muted   lipgloss.Style
    accent  lipgloss.Style
    success lipgloss.Style
    danger  lipgloss.Style
}

var themes = []theme{monoTheme, oceanTheme, emberTheme} // cycled with T
```

- Components never reference global color constants; they read colors from the
  current theme. The theme cycle is then a single field swap + re-render.
- 3-6 themes max, each still within the 3-4 color budget. A theme is a
  *palette*, not a redesign — structure and spacing never change.
- Announce the switch in the status bar (`theme: ember`) — the user must see
  that the keypress did something.
- Persist the chosen theme in config; start with it next run.
- Test every theme with `TERM=dumb` and with a 16-color terminal. A theme that
  only works in truecolor is a bug, not a feature.

---

## 8. Clipboard

- `c` copies the selected cell, `C` the whole row. Show feedback in the status
  bar (`copied 42 bytes`) — clipboard has no visible effect otherwise.
- OSC 52 is the only clipboard mechanism that works over SSH: emit the
  escape sequence and let the terminal handle it. Fall back to
  `xclip`/`wl-copy`/`pbcopy` locally when OSC 52 is unsupported.
- Copy the *value*, not the rendered cell (no padding, no truncation).

---

## 9. Status Bar Contract

For multi-view apps the status bar is the single most valuable piece of real
estate. Fix its three zones and never vary the layout between views:

```
● Connected │ orders: rows 101-150 of 12,480, 2 filters │ [ ] page  1-9 sort  ? help
  (left: state)         (center: view context)               (right: key hints)
```

- Left: connection/health state with a colored dot.
- Center: everything the current view wants the user to know — position,
  active filters, sort, selection count.
- Right: the 3-5 most relevant hints for this view. Rotate contextually; the
  hints for the data view differ from the schema view.
- The bar spans the full terminal width with a distinct background. It must
  survive resize at any width — truncate the center zone before the hints.

---

## 10. Interaction Budget

Advanced features fail when every key does something. Rules that keep a
30-keymap app learnable:

- One key, one meaning, per view. `s` = schema in list/data views; if a view
  has no natural `s` action, leave it unbound rather than inventing one.
- Mnemonic > position: `e` edit, `d` delete, `c` copy, `/` search, `?` help.
  Vim-consistent `hjkl` movement everywhere.
- Case as a modifier: `r` reload, `R` force reload; `c` copy cell, `C` copy
  row. Shift marks "bigger, rarer, or more dangerous".
- Everything reachable from the footer or `?`. If a key can't be discovered
  within two views of where a user would want it, remove it or re-scope it.
