# Data Browser Pattern

A master-detail interface for browsing, searching, filtering, and inspecting structured data (database records, API resources, file metadata, etc.).

---

## Use When

- Browsing database records, logs, API resources
- Any list → detail → edit workflow
- Data-heavy tools requiring search and filtering

---

## Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│  Records                                          1,247 total        │
├──────────────────────────────────────────────────────────────────────┤
│  /: filter   [All]  [Active]  [Archived]  [+ New]                    │
├────────────────────────────────┬─────────────────────────────────────┤
│  Name           Status   Age   │  Record: config.yaml                │
│  ─────────────  ───────  ───── │                                     │
│ ▸ config.yaml     active   2h  │                                     │
│   README.md       active   1d  │                                     │
│   main.go         staged   3d  │                                     │
│   go.mod          active   3d  │                                     │
│   Makefile        active   5d  │                                     │
│   .gitignore      active   5d  │                                     │
│  deploy.sh      draft    1w    │                                     │
│  Dockerfile     active   2w    │  Content preview:                   │
│                                │  ┌─────────────────────────────────┐│
│                                │  │ server:                          │
│                                │  │   port: 8080                     │
│                                │  │   host: 0.0.0.0                  │
│                                │  │   ...                            │
│                                │  └─────────────────────────────────┘│
│                                │                                     │
│                                │  [e] Edit  [d] Delete  [Esc] Back   │
├────────────────────────────────┴─────────────────────────────────────┤
│ ● Connected │ Showing 8 of 1,247 │ j/k: nav  Enter: open  /: filter  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Components

### Filter Bar (top)

- Search input activated by `/`
- Tab-style filter buttons (All, Active, Archived, etc.)
- New/Create action button
- Active filter shown with highlight

### Data Table (left panel)

- Sortable columns with header click or key shortcut
- Selected row indicator (`▸` or accent highlight)
- Pagination or virtual scrolling for large datasets
- Truncated cells with `…` overflow

### Detail Panel (right panel)

- Key-value pairs for selected record
- Content preview area (scrollable)
- Contextual actions at the bottom

### Status Bar

- Connection state
- Record count with filter status
- Key hints

---

## Interaction

### Navigation

| Key | Action |
|-----|--------|
| `j/k` | Move selection in table |
| `Enter` | Open selected record (drill down or show in detail panel) |
| `Tab` | Toggle focus between table and detail panel |
| `g` / `G` | Jump to first / last record |

### Filtering and Search

| Key | Action |
|-----|--------|
| `/` | Focus search input |
| `Esc` | Clear filter / unfocus search |
| `1-9` | Quick select filter tab |

### Actions

| Key | Action |
|-----|--------|
| `n` | New record |
| `e` | Edit selected record |
| `d` | Delete selected record |
| `Space` | Multi-select toggle |
| `r` | Refresh data |

### Sorting

| Key | Action |
|-----|--------|
| `s` | Cycle sort column |
| `Shift+S` | Toggle sort direction |

---

## State Handling

### Empty (no records)

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│                     No records found                     │
│                                                          │
│    Press `n` to create your first record,                │
│    or `/` to search existing records.                    │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Loading

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  Loading records... ⠋                                    │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Filtered to Empty

```
  No records match "server config"

  Try adjusting your search terms.
  Press Esc to clear the filter.
```

### Detail Panel (no selection)

```
  Select a record to view details.
  Use j/k to navigate the list.
```

---

## Variations

### Compact (narrow terminal)

Hide detail panel, use drill-down instead:

- `Enter` opens a full-screen detail view
- `Esc` returns to the list

### Split Detail (wide terminal)

Show list and detail side-by-side as shown above.

### Edit Mode

When editing, the detail panel transforms into a form:

```
│  Edit Record: config.yaml              │
│                                        │
│  Name                                  │
│  ┌──────────────────────────────────┐  │
│  │ config.yaml                      │  │
│  └──────────────────────────────────┘  │
│                                        │
│  Status                                │
│  ┌──────────────────────────────────┐  │
│  │ ▾ active                         │  │
│  └──────────────────────────────────┘  │
│                                        │
│  Tags (comma-separated)                │
│  ┌──────────────────────────────────┐  │
│  │ config, prod                     │  │
│  └──────────────────────────────────┘  │
│                                        │
│  [Ctrl+S] Save        [Esc] Cancel     │
```

---

## Design Notes

- Table should take 50-60% of width, detail takes the rest
- Column widths should be proportional to content, not equal
- Detail panel should scroll independently
- Multi-select rows should show count in status bar ("3 selected")
- Search should be live-filtering (not submit-based)
- Sort direction indicator: `Name ▲` or `Name ▼`
