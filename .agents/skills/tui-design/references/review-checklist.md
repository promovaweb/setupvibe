# TUI UX Review Checklist

Use this checklist when reviewing TUI code or evaluating a TUI design. Score each category 1-5 and identify specific issues.

---

## Visual Design (Score: ___/5)

- [ ] **Visual hierarchy is clear** — The most important content is visually prominent; secondary info is subdued
- [ ] **Spacing is generous and consistent** — No cramped elements; spacing scale is uniform
- [ ] **Alignment is precise** — Text, columns, and panels align on a grid
- [ ] **Borders are used intentionally** — Not on every element; used for grouping, not decoration
- [ ] **Color is restrained and purposeful** — Under 4 colors visible; each color communicates meaning
- [ ] **Text emphasis is clear** — Bold for important, dim for secondary; not everything bold or nothing bold
- [ ] **No visual noise** — Every element earns its place; no decorative clutter

**Common issues:**

- Borders around every panel regardless of grouping need
- Inconsistent padding (2 cells vs 3 vs 1 in similar contexts)
- Labels, values, and hints all the same weight
- Color used decoratively without semantic meaning

---

## Layout and Composition (Score: ___/5)

- [ ] **Layout pattern fits the use case** — Sidebar+content for navigation, master-detail for browsing, etc.
- [ ] **Panels have clear proportional sizing** — Important panels get more space
- [ ] **Responsive to terminal width changes** — Works at 60 cols and 140 cols
- [ ] **Minimum size is handled** — Shows message below minimum instead of breaking
- [ ] **Content doesn't touch screen edges** — At least 1 cell margin
- [ ] **Layout is stable** — No flicker or jump when data loads or changes

**Common issues:**

- Fixed-width layout that breaks on narrow terminals
- No minimum size check — UI breaks at 40 cols
- Layout shifts when loading spinner appears/disappears
- Sidebar too wide, starving content area

---

## Information Architecture (Score: ___/5)

- [ ] **Content is prioritized** — Most important data is most visible
- [ ] **Labels are clear and concise** — No ambiguous labels or acronyms without context
- [ ] **Data density is appropriate** — Not overwhelming, not sparse for the use case
- [ ] **Grouping is logical** — Related items are visually grouped
- [ ] **Navigation depth is manageable** — User can reach any feature in 2-3 keypresses

**Common issues:**

- Too much information on one screen without visual grouping
- Labels that only make sense to the developer
- Deep navigation stacks requiring many keypresses to reach common features

---

## Interaction Design (Score: ___/5)

- [ ] **Keyboard navigation works everywhere** — Every action reachable via keyboard
- [ ] **Keybindings are conventional** — vim-style j/k, q to quit, / to search, Esc to cancel
- [ ] **Focus is always visible** — The active element is clearly indicated
- [ ] **Focus movement is predictable** — Tab order follows reading order
- [ ] **No focus traps** — Every state has an escape key
- [ ] **Keybindings are discoverable** — Shown in status bar or help screen
- [ ] **Mouse support is additive** — Mouse works but nothing requires it

**Common issues:**

- Focus indicator missing or too subtle
- j/k works in one list but not another
- No way to escape a modal besides the confirm button
- Keybindings shown only in a help screen, never in context

---

## State Handling (Score: ___/5)

- [ ] **Empty states are designed** — Not just blank; shows message + action
- [ ] **Loading states are shown** — Spinner or skeleton while data loads
- [ ] **Errors are user-friendly** — Specific message + recovery action; no raw errors
- [ ] **Transient feedback works** — Success/error toasts for completed actions
- [ ] **State transitions are smooth** — No jarring visual jumps between states
- [ ] **Optimistic updates where appropriate** — UI responds instantly, confirms async

**Common issues:**

- Empty list shows just table headers with no rows
- Loading state only on first load, not on refresh
- Raw error string dumped into the UI
- No feedback after save/delete/successful action

---

## Navigation (Score: ___/5)

- [ ] **Current location is clear** — User always knows which screen/panel they're on
- [ ] **Back navigation works** — Esc or dedicated key returns to previous screen
- [ ] **Navigation is consistent** — Same keys do the same thing across screens
- [ ] **Breadcrumb or title shows context** — Where am I in the hierarchy?
- [ ] **Deep linking or command palette available** — Power users can jump to any feature

**Common issues:**

- No indication of which screen is active
- Esc sometimes closes the app instead of going back
- Different keys for the same action on different screens

---

## Component Quality (Score: ___/5)

- [ ] **Tables handle long content** — Truncation with ellipsis, not overflow
- [ ] **Forms have validation** — Inline errors, clear labels, logical tab order
- [ ] **Modals trap focus** — Tab cycles within modal, Esc closes
- [ ] **Lists handle selection** — Visual indicator, scroll to selected, type-ahead
- [ ] **Inputs show cursor** — Active text input has visible cursor
- [ ] **Dropdowns close cleanly** — Esc closes without changing selection

**Common issues:**

- Long text overflows table cells without truncation
- Form inputs have no visual boundary
- Modals allow tabbing to background content
- No visible cursor in active text input

---

## Accessibility (Score: ___/5)

- [ ] **No color-only indicators** — Status uses symbols + color, not color alone
- [ ] **Works in no-color mode** — Respects `NO_COLOR` env var
- [ ] **High contrast** — Readable on both dark and light terminals
- [ ] **Screen reader compatible** — Structured output for assistive tech (where applicable)
- [ ] **No reliance on mouse** — All functionality keyboard-accessible

**Common issues:**

- Status shown only as colored text (red/green) without symbols
- Unreadable on light terminal backgrounds
- Critical actions only available via mouse click

---

## Architecture and Code Quality (Score: ___/5)

- [ ] **Separation of concerns** — View, state, and domain logic are separated
- [ ] **Composable components** — Screens built from reusable components
- [ ] **Single source of truth** — State is centralized, not scattered
- [ ] **Framework idioms used** — Uses framework patterns, not fighting them
- [ ] **File organization is logical** — Related code grouped, clear structure
- [ ] **Testable** — Update logic can be tested independently of rendering

**Common issues:**

- All logic in a single render function
- State mutated directly in view code
- Framework features reimplemented (custom event loop, custom layout)
- No separation between data fetching and display

---

## Terminal Resilience (Score: ___/5)

- [ ] **Handles resize gracefully** — Layout adapts to terminal size changes
- [ ] **No hardcoded dimensions** — All sizes computed from terminal dimensions
- [ ] **Handles missing Unicode** — Falls back to ASCII borders/symbols
- [ ] **Cleanup on exit** — Restores terminal state on quit (cursor, alternate screen)
- [ ] **No flicker** — Render is clean, no visual artifacts between frames

**Common issues:**

- Layout breaks when terminal is resized
- Hardcoded column widths that overflow
- Unicode symbols displayed as `?` on limited terminals
- Terminal left in broken state after quit (cursor hidden, alternate screen stuck)

---

## Scoring Guide

| Score | Meaning |
|-------|---------|
| 5 | Excellent — Production quality, delightful UX |
| 4 | Good — Solid with minor improvements possible |
| 3 | Adequate — Functional but needs polish |
| 2 | Below standard — Significant UX problems |
| 1 | Poor — Needs major redesign |

### Overall Assessment

**Total Score: ___/50**

| Range | Rating |
|-------|--------|
| 45-50 | Production premium — Ship it |
| 35-44 | Good with polish needed — Address P0s |
| 25-34 | Functional prototype — Needs significant UX work |
| 15-24 | Needs redesign — Core UX issues |
| < 15 | Start over — Fundamental problems |

### Priority Issues

**P0 (Must fix before shipping):**

- Missing focus indicators
- No keyboard navigation for core flows
- Empty/loading/error states missing
- Terminal state not restored on exit

**P1 (Should fix):**

- Inconsistent spacing
- Missing keybinding hints
- Color-only status indicators
- No resize handling

**P2 (Nice to have):**

- Command palette
- Skeleton loading
- Undo support
- Mouse support
- Responsive layout at all sizes

**P3 (Future consideration):**

- Custom theme support
- Configurable keybindings
- Accessibility enhancements
- Animation/polish passes
