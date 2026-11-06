# Interaction Guide: Keybindings, Focus, and Navigation

## Keyboard-First Philosophy

The keyboard is the primary input device for TUI users. Every action must be reachable via keyboard. Mouse support is additive, not required.

---

## Keybinding Conventions

### Universal Bindings

These should work consistently across all TUIs:

| Key | Action |
|-----|--------|
| `q` / `Ctrl+C` | Quit / Exit current context |
| `Esc` | Cancel / Close overlay / Go back |
| `?` | Show help / keybinding reference |
| `Tab` | Move focus to next element |
| `Shift+Tab` | Move focus to previous element |
| `Enter` | Activate / Confirm / Submit |
| `/` | Search / Filter (vim convention) |
| `Ctrl+P` | Command palette (if supported) |

### Navigation (Vim-style, strongly recommended)

| Key | Action |
|-----|--------|
| `j` / `Down` | Move down / Next item |
| `k` / `Up` | Move up / Previous item |
| `h` / `Left` | Move left / Collapse / Go back |
| `l` / `Right` | Move right / Expand / Go forward |
| `g` / `Home` | Go to top / First item |
| `G` / `End` | Go to bottom / Last item |
| `Ctrl+U` | Scroll up half page |
| `Ctrl+D` | Scroll down half page |
| `Ctrl+B` | Scroll up full page |
| `Ctrl+F` | Scroll down full page |

### Selection and Action

| Key | Action |
|-----|--------|
| `Space` | Toggle selection / Mark item |
| `a` | Select all |
| `A` | Deselect all |
| `x` | Delete / Remove selected |
| `e` | Edit selected item |
| `n` | New / Create |
| `s` | Save |
| `r` | Refresh / Reload |
| `f` | Filter / Focus filter input |

### Panel Navigation

When the UI has multiple panels (sidebar, content, detail):

| Key | Action |
|-----|--------|
| `Tab` | Cycle focus through panels |
| `1-9` | Jump to panel/tab by number |
| `Ctrl+H` / `Ctrl+Left` | Focus panel to the left |
| `Ctrl+L` / `Ctrl+Right` | Focus panel to the right |

### Modal / Overlay

| Key | Action |
|-----|--------|
| `Esc` | Close modal |
| `Enter` | Confirm (primary action) |
| `Tab` | Cycle between modal buttons/fields |

---

## Focus Management

### Rules

1. **Always visible** — The focused element must be visually distinct. No ambiguity.
2. **Always one focus** — Exactly one element is focused at all times. Never zero, never two.
3. **Predictable movement** — Focus moves in reading order (top-to-bottom, left-to-right) or in a logical loop.
4. **Context-aware** — Focus behavior changes based on what's on screen. In a list, j/k moves selection. In a form, Tab moves between fields.
5. **Restore on return** — When returning to a screen, restore focus to where it was.

### Focus Indicators

Use one or more of these visual treatments for the focused element:

- **Reverse video** (swapped foreground/background) — strongest signal
- **Bold + accent color** — clear and attractive
- **Border highlight** — change border color/style on focused panel
- **Cursor character** — visible cursor for text inputs (`▎` or `█`)
- **Underline** — for tab items or menu entries

### Focus Traps

Modals and overlays create focus traps — focus cycles within the overlay until dismissed. This prevents the user from accidentally interacting with background content.

### Focus and Scroll

When focus moves to an off-screen element, scroll to make it visible. Scroll should show context around the focused element — ideally 3-5 items above and below.

---

## Navigation Models

### Flat (Tab-based)

Best for: 3-8 peer views with no hierarchy.

```
[Dashboard]  Records  Logs  Settings
─────────────────────────────────────

j/k: navigate items      Tab: switch view
```

Focus model: Tab switches views, j/k navigates within the active view.

### Hierarchical (Sidebar)

Best for: Many sections, some with sub-sections.

```
+ Projects ────────+──────────────────────+
│ > Dashboard      │                      │
│   Records        │   [Content Area]     │
│   Logs           │                      │
│                  │                      │
│ Settings         │                      │
+──────────────────+──────────────────────+
```

Focus model: `Tab` toggles between sidebar and content. j/k navigates within the focused panel. `Enter` in sidebar selects and moves focus to content.

### Stack (Drill-down)

Best for: List → Detail → Edit flows.

```
Navigation stack: [Records] → [Record #42] → [Edit Record]
```

Focus model: `Enter` pushes next screen onto stack. `Esc` pops back. Each screen manages its own focus independently.

### Hybrid

Most real apps combine these: a sidebar with tabs in the content area, where each tab might have drill-down flows.

---

## Input Patterns

### Text Input

- Show a clear input field with a label or placeholder
- Cursor must be visible and blinking (if terminal supports it)
- Support standard editing: arrow keys, Home/End, Ctrl+A/E, Ctrl+W (delete word), Ctrl+U (delete line)
- Show validation errors below the field, not as popups

### Selection / Dropdown

- Show current selection with an indicator (▾ or ▸)
- Open on Enter or Space
- Navigate with j/k, confirm with Enter
- Close on Esc without changing selection
- Support type-ahead filtering for long lists

### Toggle / Checkbox

- Clear visual states: `[x]` / `[ ]` or `●` / `○`
- Toggle on Space or Enter
- Show the label clearly

### Confirmation Dialogs

```
┌─────────────────────────────────────┐
│  Delete this record?                │
│                                     │
│  This action cannot be undone.      │
│                                     │
│       [Cancel]    [Delete]          │
└─────────────────────────────────────┘
```

- Destructive action default should be "Cancel" (not the destructive option)
- Tab between choices, Enter to confirm
- Destructive option should be visually distinct (red accent, different emphasis)

---

## Discoverability

### Status Bar Key Hints

Always show contextual key hints in a footer/status bar:

```
 j/k: navigate  Enter: select  /: filter  ?: help  q: quit
```

Rules:

- Show only keys relevant to the current context
- Group logically (navigation | actions | global)
- Update when context changes (different hints for a modal vs main screen)
- Keep the format consistent: `key: description`

### Help Screen (`?`)

A dedicated help screen should show:

- All keybindings organized by category
- Current context's bindings first, then global
- Brief description of each action

### First-Run Guidance

For complex apps, show a brief overlay on first launch:

- Arrow keys or highlight indicating navigation
- Key insight (e.g., "Press ? anytime for help")
- Dismissible with any key
- Never shown again after first dismiss

---

## Transient Feedback

Actions should produce visible, brief feedback:

### Toast Messages

Show at top or bottom for 2-3 seconds:

```
 ✓ Record saved
 ✗ Connection failed — press 'r' to retry
```

### Inline Status

Near the relevant component:

```
  Filtering: showing 23 of 150 records  [Esc to clear]
```

### Spinner / Progress

For async operations:

```
  Loading records... ⠋
  Uploading... ████████░░ 80%
```

### Undo Prompts

After destructive actions:

```
  3 records deleted  [u to undo]
```

---

## Anti-Patterns

- **Hidden actions** — If a keybinding exists but isn't shown, it's effectively unavailable
- **Inconsistent keybindings** — `j` moves down in one list but `Down` in another
- **Focus jumps** — Focus unexpectedly moving to a different panel
- **Trapped focus** — No way to escape a component (missing Esc handler)
- **Modal stacking** — Opening modals on top of modals without clear back navigation
- **Missing escape routes** — Any state the user can enter, they must be able to exit
- **Context-free keybinding display** — Showing all keys at once including irrelevant ones
