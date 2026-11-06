# File Explorer Pattern

A terminal file browser for navigating, inspecting, and acting on files and directories.

---

## Use When

- Browsing file systems or directory trees
- File selection dialogs
- Project navigation tools

---

## Layout

````
+──────────────────────────────────────────────────────────────────────+
│  ~/Projects/myapp                                 23 items           │
├──────────────────────────────────────────────────────────────────────┤
│  /: filter  n: new  d: delete  y: copy  r: rename                    │
├──────────────────────────────────┬───────────────────────────────────┤
│  Files                           │  README.md                        │
│                                  │                                   │
│  ▸ .github/                      │  Size        8.1 KB               │
│    src/                          │  Modified    yesterday            │
│    tests/                        │  Type        Markdown             │
│    .gitignore                    │  Encoding    UTF-8                │
│    Dockerfile                    │                                   │
│    go.mod                        │  # My Application                 │
│    go.sum                        │                                   │
│    Makefile                      │  A brief description of the app   │
│    README.md                     │  and what it does.                │
│    config.yaml                   │                                   │
│                                  │  ## Getting Started               │
│                                  │                                   │
│                                  │  ```bash                          │
│                                  │  make build                       │
│                                  │  make run                         │
│                                  │  ```                              │
│                                  │                                   │
│                                  │  ...                              │
├──────────────────────────────────┴───────────────────────────────────┤
│ ● ~/Projects/myapp │ 23 items │ j/k: nav  Enter: open  h/l: collapse │
+──────────────────────────────────────────────────────────────────────+
````

---

## Components

### File Tree (left panel)

- Directories with expand/collapse indicators (`▸`/`▾`)
- Indented hierarchy showing depth
- File type indicators via symbols or colors
- Current selection highlighted

### Preview Panel (right panel)

- File metadata at top (size, modified, type)
- Content preview (text files, truncated)
- For images/binary: show file info only
- For directories: show item count and summary

### Breadcrumb / Path Bar (header)

- Current directory path
- Clickable/navigable segments

---

## Visual Treatment for File Types

Use icons or prefixes to distinguish file types:

| Type | Symbol | Color |
|------|--------|-------|
| Directory | `▸`/`▾` | Accent (blue/cyan) |
| Symlink | `→` | Muted |
| Executable | `*` | Success (green) |
| Config file | `⚙` | Muted |
| Hidden file | dim name | Dim |
| Text file | none | Base |
| Code file | none | Base |
| Image/Binary | `■` | Muted |

---

## Interaction

| Key | Action |
|-----|--------|
| `j/k` | Move selection up/down |
| `h` | Collapse directory / Go to parent directory |
| `l` or `Enter` | Expand directory / Open file |
| `g` / `G` | Jump to first / last item |
| `n` | New file or directory |
| `d` | Delete selected item (with confirmation) |
| `r` | Rename selected item |
| `y` | Copy path to clipboard |
| `/` | Filter files by name |
| `.` | Toggle hidden files |
| `s` | Sort (name/size/date cycle) |
| `Tab` | Toggle focus between tree and preview |

---

## State Handling

### Empty Directory

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│                 This directory is empty                  │
│                                                          │
│    Press `n` to create a new file,                       │
│    or `h` to go to the parent directory.                 │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Loading (scanning large directory)

```
  Scanning directory... ⠋
  Found 2,340 files so far.
```

### Permission Denied

```
  Cannot access: Permission denied

  /etc/shadow — you don't have read permissions.
  Press Esc to go back.
```

### Binary File Preview

```
  README.md

  Size        8.1 KB
  Modified    yesterday
  Type        Markdown
  Encoding    UTF-8

  ┌──────────────────────────────────────┐
  │  # My Application                    │
  │                                      │
  │  A brief description of the app      │
  │  and what it does.                   │
  │                                      │
  │  ...                                 │
  └──────────────────────────────────────┘
```

---

## Tree Navigation Behavior

### Expanding/Collapsing

- `Enter` or `l` on a collapsed directory: expand it
- `h` on an expanded directory: collapse it
- `h` on a collapsed directory: navigate to parent
- Maintain expand/collapse state when navigating

### Scrolling

- Keep selected item visible when expanding
- Scroll to keep context around selected item
- Virtual scrolling for directories with thousands of entries

### Deep Navigation

- Don't recursively expand all subdirectories
- Only expand the selected directory's immediate children
- Lazy-load directory contents on expand

---

## Design Notes

- Tree indentation: 2 spaces per level
- Preview panel takes 50-60% of width on wide terminals
- Hide preview panel on narrow terminals (< 60 cols)
- Show relative or absolute paths depending on starting point
- Sort directories first, then files (or configurable)
- Hidden files toggle should persist during session
- File size formatting: human-readable (KB, MB, GB)
- Date formatting: relative for recent, absolute for old
