# Form Workflow Pattern

A multi-field form for data entry, editing, and configuration. Designed for keyboard efficiency and clear validation.

---

## Use When

- Creating or editing records
- Configuration screens
- Settings panels
- Any structured data input

---

## Layout

```
+──────────────────────────────────────────────────────────────────────+
│  ← Back to Records                          Create New Record        │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Name *                                                              │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ my-record-name                                                 │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  Type                                                                │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ ▾ Configuration                                                │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  Description                                                         │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ A brief description of this record and its purpose...          │  │
│  │                                                                │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  Priority                                                            │
│  ○ Low    ● Medium    ○ High    ○ Critical                           │
│                                                                      │
│  Tags (comma-separated)                                              │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ config, production                                             │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  Enabled  [x]                                                        │
│                                                                      │
│                          [Esc: Cancel]    [Ctrl+S: Save]             │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│  Tab: next field  Shift+Tab: prev field  Ctrl+S: save  Esc: cancel   │
+──────────────────────────────────────────────────────────────────────+
```

---

## Components

### Text Input

- Single-line: bordered box, cursor visible
- Multi-line: bordered box, taller, supports line wrapping
- Placeholder text (muted) when empty

### Dropdown / Select

- Shows current selection with indicator (`▾`)
- Opens vertically below the field on activation
- Navigable with `j/k`, confirm with `Enter`
- Type-ahead filtering for long option lists

### Radio Buttons

- Horizontal layout when few options
- Clear selected indicator (`●`) vs unselected (`○`)
- Navigate with arrow keys, select with `Enter` or `Space`

### Checkbox / Toggle

- `[x]` / `[ ]` indicators
- Toggle with `Space`
- Label to the right

### Validation

- Error message below the field, red text
- Icon prefix: field border turns red
- Clear error when user starts editing

---

## Interaction

| Key | Action |
|-----|--------|
| `Tab` | Move to next field |
| `Shift+Tab` | Move to previous field |
| `Enter` | In dropdown: confirm selection. On last field: submit |
| `Space` | Toggle checkbox/radio |
| `Ctrl+S` | Save/Submit form |
| `Esc` | Cancel (with confirmation if dirty) |
| `j/k` | Navigate within dropdown options |

---

## State Handling

### New (empty form)

- All fields empty or at defaults
- Focus on first field
- Optional fields marked "(optional)"
- Required fields marked with `*`

### Editing (pre-filled)

- Fields populated with current values
- Title indicates editing: "Edit Record: config.yaml"
- Unsaved changes tracked for dirty state

### Validation Errors

```
  Email
  ┌──────────────────────────────────────────────────────────────┐
  │ not-an-email                                                 │
  └──────────────────────────────────────────────────────────────┘
  ✗ Please enter a valid email address
```

- Focus jumps to first error field
- Error clears on edit

### Saving

- Show "Saving..." in submit button area or status bar
- Disable form fields during save
- On success: toast + navigate away (or stay if editing)
- On error: show error inline, re-enable form

### Unsaved Changes (on Esc)

```
  ┌───────────────────────────────────────┐
  │  Unsaved Changes                      │
  │                                       │
  │  You have unsaved changes.            │
  │                                       │
  │  [d] Discard  [c] Continue editing    │
  └───────────────────────────────────────┘
```

---

## Design Notes

- Labels above inputs, not beside them — works better at all terminal widths
- Required fields marked with `*` — never hide which fields are required
- Group related fields visually with spacing
- Use consistent input width across the form
- Cancel/Save actions at the bottom right
- Don't auto-submit on Enter from any field — let Enter confirm dropdowns and navigate
- Explicit save action (`Ctrl+S`) gives user control
- For long forms, consider scrolling with a sticky save bar
