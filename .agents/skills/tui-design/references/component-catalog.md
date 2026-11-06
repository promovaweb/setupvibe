# Component Catalog

Reusable TUI component patterns with visual examples and implementation guidance.

---

## 1. Table / Data Grid

The workhorse component for data-heavy TUIs.

### Visual Pattern

```
  Name              Status      Size       Modified
  ────────────────  ──────────  ─────────  ──────────────
▸ config.yaml       modified    2.4 KB     2 hours ago
  README.md         committed   8.1 KB     yesterday
  main.go           staged      12 KB      3 days ago
  go.mod            committed   340 B      3 days ago
                                          [1-4 of 48]
```

### Design Notes

- Header row should be bold or dim — visually distinct from data rows
- Column alignment: text left, numbers right, status center
- Active row indicator: `▸` prefix or reverse video
- Sort indicator in header: `Name ▲` or `Size ▼`
- Pagination at bottom-right, unobtrusive
- Truncate with `…` when content exceeds column width
- Zebra striping optional — only if rows are visually dense

### Interaction

- `j/k` or arrows: navigate rows
- `Enter`: open/inspect selected row
- `s` on column header: sort
- `/`: filter rows
- `Space`: multi-select toggle

### Edge Cases

- Empty table: show message + action ("No records yet. Press `n` to create one.")
- Loading: show skeleton or spinner in table area
- Single row: still render as a table for consistency

---

## 2. Sidebar / Navigation Panel

### Visual Pattern

```
┌──────────┐
│ PROJECT  │
│          │
│ > Home   │
│   Files  │
│   Logs   │
│          │
│ SYSTEM   │
│          │
│   Config │
│   About  │
└──────────┘
```

### Design Notes

- Active item: bold + accent color + indicator (`>`, `▸`, or `●`)
- Section headers: uppercase, dim, with spacing above
- Fixed width (18-24 chars typical), content gets the rest
- Collapsible: at narrow widths, hide and show via key toggle

### Interaction

- `j/k`: navigate items
- `Enter`: select and move focus to content
- `Tab`: toggle focus between sidebar and content
- `[`: collapse sidebar

---

## 3. Status Bar / Footer

### Visual Pattern

```
  Normal: 8 services │ 3 healthy │ 2 warning │ 3 critical │ ↑ 3s ago    │ j/k: navigate  ?: help
```

or with sections:

```
  ● Connected     Records: 1,247     Last sync: 3s ago     j/k: nav  /: search  q: quit
```

### Design Notes

- Single line, always visible at the bottom
- Left: status indicators (connection, sync state)
- Center: contextual info (count, time, mode)
- Right: key hints for current context
- Reverse video or subtle background to separate from content
- Keep text concise — truncate from the center outward

### Content Strategy

- Status bar content should answer: "Where am I? What's happening? What can I do?"
- Update in real-time for dynamic data
- Show transient messages (saved, error) that fade after a few seconds

---

## 4. Modal / Dialog

### Visual Pattern

```
                ┌──────────────────────────────────┐
                │  Delete Record                   │
                │                                  │
                │  Are you sure you want to delete │
                │  "config.yaml"? This cannot be   │
                │  undone.                         │
                │                                  │
                │       [Cancel]   [Delete]        │
                └──────────────────────────────────┘
```

### Design Notes

- Centered, with clear visual boundary (border)
- Title at top, message body, actions at bottom
- Destructive actions: red accent, non-default focus
- Dim or blur background content
- Focus trapped within modal

### Interaction

- `Tab`: cycle between action buttons
- `Enter`: confirm focused action
- `Esc`: cancel (always supported)
- Default focus on safest action

---

## 5. Form / Input Group

### Visual Pattern

```
  Create New Record
  ─────────────────

  Name
  ┌─────────────────────────────────────────────┐
  │ my-record-name                              │
  └─────────────────────────────────────────────┘

  Type
  ┌─────────────────────────────────────────────┐
  │ ▾ Configuration                             │
  └─────────────────────────────────────────────┘

  Description (optional)
  ┌─────────────────────────────────────────────┐
  │ A brief description of this record...       │
  └─────────────────────────────────────────────┘

  Enabled  [x]

         [Cancel]              [Create]
```

### Design Notes

- Label above the input, not beside it (better for narrow terminals)
- Clear visual boundary around inputs
- Required vs optional indicated in label
- Validation errors appear below the field
- Submit/Cancel at the bottom, right-aligned
- Cursor visible in active input field

### Interaction

- `Tab` / `Shift+Tab`: cycle between fields
- `Enter` on last field: submit (or explicit Submit button)
- `Esc`: cancel and go back
- `Space`: toggle checkboxes

---

## 6. List / Selectable List

### Visual Pattern (Single Select)

```
  Choose a template:

    Blank project
  ▸ Web application
    REST API
    CLI tool
    Background worker
```

### Visual Pattern (Multi-Select)

```
  Select features:

  [x] Authentication
  [ ] Database migrations
  [x] Logging
  [ ] Monitoring
  [x] Docker support
```

### Design Notes

- Clear indicator for selected item (`▸`, `>`, `●`, or bold)
- Multi-select uses `[x]`/`[ ]` markers
- Scroll indicator when list overflows: show position (e.g., "3 of 12")
- Type-ahead filtering for long lists

---

## 7. Tabs

### Visual Pattern

```
  [ Overview ]  Activity  Settings
  ────────────────────────────────

  Content for Overview tab goes here.
```

### Design Notes

- Active tab: highlighted background or bold + underline
- Inactive tabs: dim or default styling
- Tab bar is one line — no wrapping
- If too many tabs: truncate or use scrollable tab bar
- Number shortcuts: `1-9` to jump to tab

---

## 8. Split Pane

### Visual Pattern (Horizontal Split)

```
┌─────────────────────────────────────────────┐
│  Top Pane                                   │
│  Logs output scrolling here...              │
│                                             │
├─────────────────────────────────────────────┤
│  Bottom Pane                                │
│  Detail view for selected log entry         │
└─────────────────────────────────────────────┘
```

### Visual Pattern (Vertical Split)

```
┌──────────────────────┬──────────────────────┐
│ Left Pane            │ Right Pane           │
│                      │                      │
│ File tree            │ File content         │
│                      │                      │
└──────────────────────┴──────────────────────┘
```

### Design Notes

- Divider should be a single character line (─ or │) or thin double line
- Resizable divider (drag or key combo) is a nice-to-have
- Minimum pane size enforced — don't let one pane collapse to zero
- Focus cycles between panes with Tab or dedicated keys

---

## 9. Progress Indicator

### Spinner (indeterminate)

```
  Loading data... ⠋
```

Use braille spinners: `⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏`

### Progress Bar (determinate)

```
  Uploading... ████████████░░░░░ 68%
```

### Design Notes

- Show what's loading, not just that something is loading
- For determinate progress: show percentage and estimated items
- For long operations: show elapsed time or item count
- Cancel should always be available for long operations

---

## 10. Toast / Notification

### Visual Pattern

```
  ✓ Saved successfully                                    (auto-dismisses in 3s)
```

or

```
  ⚠ Connection lost — retrying in 5s...  [r] retry now
```

### Design Notes

- Appears at top or bottom of screen
- Non-blocking — doesn't steal focus
- Auto-dismisses after 2-3 seconds for success messages
- Error/warning toasts persist longer or until dismissed
- Maximum one toast visible at a time; queue subsequent ones

---

## 11. Search / Filter Bar

### Visual Pattern

```
  Search: │server erro│_│                                      [Esc to close]
```

### Design Notes

- Inline bar that appears at the top or within a panel
- Live filtering as user types
- Show result count: "3 of 48 matches"
- Highlight matches in the filtered content
- `Esc` closes search and restores original view
- `/` opens search, common vim convention

---

## 12. Breadcrumb

### Visual Pattern

```
  Projects > my-app > Records > config.yaml
```

### Design Notes

- Single line at top of content area
- Use `>` or `›` as separator
- Clickable segments (keyboard-navigable)
- Truncate from the left if too long: `... > Records > config.yaml`

---

## 13. Empty State

### Visual Pattern

```

         No records found

    Press `n` to create your first record,
    or `/` to search existing records.

```

### Design Notes

- Center the message in the available space
- Include an illustration or icon if possible (ASCII art)
- Always provide an action the user can take
- Don't show an empty table/grid — the empty state replaces it

---

## 14. Detail Panel

### Visual Pattern

```
  ┌─ Record: config.yaml ──────────────────────┐
  │                                            │
  │  Status      modified                      │
  │  Size        2.4 KB                        │
  │  Modified    2 hours ago                   │
  │  Created     3 days ago                    │
  │  Encoding    UTF-8                         │
  │                                            │
  │  [e] Edit    [d] Delete    [Esc] Back      │
  └────────────────────────────────────────────┘
```

### Design Notes

- Key-value pairs, left-aligned labels, aligned values
- Actions at the bottom with key hints
- Scrollable if content overflows
- Show in a side panel (master-detail) or as a full-screen drill-down

---

## Combining Components

Components should compose naturally. A dashboard screen might use:

```
Header (title + breadcrumb)
├── Sidebar (navigation)
├── Content Area
│   ├── Search Bar
│   ├── Toolbar (filter tabs + action buttons)
│   ├── Data Table
│   └── Detail Panel (conditional, slides in)
└── Status Bar (status + key hints)
```

A modal overlays everything and traps focus:

```
[Background: Dashboard]
[Overlay: Confirmation Modal]
```
