# States and Feedback Patterns

## State Categories

Every TUI component exists in one of several states. Handling all states gracefully is what separates a polished TUI from a prototype.

The core states:

1. **Empty** — No data yet
2. **Loading** — Data is being fetched
3. **Loaded** — Data is present and displayed
4. **Error** — Something went wrong
5. **Interactive** — User is actively engaging (editing, selecting, filtering)

---

## Empty States

An empty state is not a blank screen. It is a designed experience that guides the user forward.

### Principles

- Explain what would normally be here
- Provide a clear next action
- Use the available space — center the message, give it room
- Be friendly but concise

### Visual Pattern

```
┌─────────────────────────────────────────────────┐
│                                                 │
│                                                 │
│             No records found                    │
│                                                 │
│       Press `n` to create your first record,    │
│       or `/` to search existing records.        │
│                                                 │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Variations

**First-run empty:**

```
  Welcome to ProjectName

  Get started by adding your first item.
  Press `n` to begin.
```

**Filtered to empty:**

```
  No records match "server error"

  Try adjusting your search terms.
  Press `Esc` to clear the filter.
```

**Permission empty:**

```
  No access to records

  You need the "viewer" role to see records.
  Contact your administrator.
```

### Anti-Patterns

- Showing an empty table with just headers (feels broken)
- "No data" with no suggested action (dead end)
- Blank space with no explanation (confusing)

---

## Loading States

### Principles

- Show loading state immediately — never leave the user wondering if anything is happening
- Indicate what is loading
- For long operations, show progress
- Allow cancellation for operations taking more than 2 seconds

### Indeterminate Loading (unknown duration)

```
  Loading records... ⠋
```

Use a braille spinner that animates: `⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏`

### Skeleton Loading

Show the outline of the content that will appear:

```
  Name              Status      Size
  ────────────────  ──────────  ─────────
  ░░░░░░░░░░░░░░░  ░░░░░░░░░░  ░░░░░░░░
  ░░░░░░░░░░░░░░░  ░░░░░░░░░░  ░░░░░░░░
  ░░░░░░░░░░░░░░░  ░░░░░░░░░░  ░░░░░░░░
```

Skeleton loading feels faster than spinners because the user sees structure forming.

### Determinate Progress

```
  Syncing records... ████████████░░░░ 68% (342 of 500)
```

### Inline Loading

For individual items or sections that load independently:

```
  ● Server 1 — healthy
  ● Server 2 — healthy
  ⠋ Server 3 — checking...
  ● Server 4 — healthy
```

### Initial Load vs Refresh

- **Initial load** — Replace entire content area with loading state
- **Background refresh** — Show existing data with a subtle indicator (spinning icon in header, timestamp updating)
- **Never flash** — Don't briefly show loading then data then loading again. Batch updates.

---

## Error States

### Principles

- Be specific about what went wrong
- Suggest a recovery action
- Don't show raw error messages to the user
- Preserve user state (don't lose their work)
- Distinguish severity: transient errors are subtle, critical errors are prominent

### Error Types and Treatment

**Network/Connection Error (transient)**

```
  ● Connection lost — retrying in 5s...  [r] retry now
```

Show in status bar or toast. Auto-retry. Don't block the UI.

**Validation Error (inline)**

```
  Name
  ┌─────────────────────────────────────────────┐
  │ record-42                                   │
  └─────────────────────────────────────────────┘
  Names cannot contain hyphens
```

Show below the relevant field. Focus the field. Clear error when user edits.

**Not Found**

```
  Record #42 not found

  It may have been deleted or moved.
  Press `Esc` to go back, or `/` to search.
```

**Permission Denied**

```
  Access denied

  You need editor permissions to modify records.
  Press `Esc` to go back.
```

**Critical Error (full screen)**

```
  ┌─────────────────────────────────────────┐
  │  Critical Error                         │
  │                                         │
  │  Unable to connect to the database.     │
  │  Last successful connection: 5 min ago. │
  │                                         │
  │  [r] Retry    [q] Quit                  │
  └─────────────────────────────────────────┘
```

### Error Recovery Patterns

- **Retry** — Always offer retry for network/timeout errors
- **Fallback** — Show cached/stale data with a warning when fresh data is unavailable
- **Undo** — For destructive actions that succeeded unexpectedly
- **Dismiss** — Let the user dismiss non-critical errors
- **Escalate** — Critical errors should require explicit user action before continuing

---

## Transient Feedback

Brief, non-blocking notifications for completed actions.

### Success Feedback

```
  ✓ Record saved
```

Auto-dismiss after 2-3 seconds. Show in status bar or toast area.

### Warning Feedback

```
  ⚠ Slow connection detected — responses may be delayed
```

Persist longer. Show dismiss option.

### Action Confirmation

```
  3 items deleted  [u] undo
```

Offer undo for a brief window (5-10 seconds). After window, dismiss.

### Progress Completion

```
  ✓ Sync complete — 48 records updated
```

Show summary of what happened. Auto-dismiss.

---

## Interactive States

States that reflect user engagement.

### Focused

```
  ┌─▸ Active Item ◄───────────────────────┐
```

Focused element is visually distinct (reverse video, accent color, border change).

### Selected / Checked

```
  [x] Feature enabled
```

```
  ▸ This row is selected         ← accent color + indicator
    This row is not selected     ← base color
```

### Hover (mouse)

```
  ┌─ Hovered Item ────────────────────────┐
```

Subtle highlight on mouse hover. Should not be the only interaction indicator — keyboard focus must also be visible.

### Editing

```
  Name
  ┌────────────────────────────────────────┐
  │ my-record█                             │
  └────────────────────────────────────────┘
```

Visible cursor. Clear boundary. Validation feedback.

### Disabled / Unavailable

```
  Delete  (select an item first)
```

Dim or grayed out. Show why it's disabled or what precondition is needed.

### Dragging / Reordering

```
  Item A
  ┌─ Item B ──────────────┐  ← being moved
  │  Drop here            │
  └───────────────────────┘
  Item C
```

Show drop target clearly. Use line indicators for insertion point.

---

## State Transitions

### Smooth Transitions

Avoid jarring state changes:

- **Loading → Data** — Replace spinner with data instantly, don't fade through an intermediate state
- **Data → Empty** — If the user deletes the last item, show empty state immediately with a confirmation message
- **Error → Retry → Loading** — Show retry attempt, then loading state

### State History

For destructive flows (delete, overwrite), keep enough state to offer undo for a brief window.

### Optimistic Updates

For fast operations, show the expected result immediately, then confirm or revert:

- User deletes item → item disappears immediately → if server confirms, done; if error, item reappears with error message

This makes the UI feel instant. Use only when the operation is likely to succeed and the user expects immediate feedback.

---

## Status Bar State Communication

The status bar should always communicate the current system state:

| Situation | Status Bar Content |
|-----------|-------------------|
| Normal | `● Connected  │  48 records  │  Last sync: 3s ago` |
| Loading | `⠋ Syncing...  │  48 records  │  Loading updates` |
| Error | `✗ Offline  │  48 records  │  Last sync: 2m ago  [r] retry` |
| Filtered | `● Connected  │  Showing 12 of 48  │  /: clear filter` |
| Editing | `● Connected  │  Editing record #42  │  Ctrl+S: save  Esc: cancel` |
