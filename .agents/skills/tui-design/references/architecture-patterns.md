# TUI Architecture Patterns

## Application Architecture

A well-architected TUI separates concerns into clear layers. This is not over-engineering — it is the minimum structure needed for a TUI that grows beyond a single screen.

---

## Layer Model

```
┌─────────────────────────────────┐
│         Rendering / View        │  Layout, styling, visual output
├─────────────────────────────────┤
│       UI State / ViewModel      │  Focus, selection, navigation, display mode
├─────────────────────────────────┤
│       Application State         │  Current screen, routing, global flags
├─────────────────────────────────┤
│        Domain / Business        │  Data, rules, side effects, I/O
└─────────────────────────────────┘
```

### Domain Layer

- Pure data types and business rules
- Data access (API calls, file I/O, database queries)
- State mutations driven by user actions
- No knowledge of terminal dimensions or rendering

### Application State

- Which screen/view is active
- Navigation stack (for push/pop navigation)
- Global flags (loading, error, dirty state)
- Screen-level state (active tab, selected filter)

### UI State

- Focused element
- Cursor position
- Scroll offset
- Text input contents
- Hover state (if mouse-enabled)

### Rendering / View

- Layout computation based on terminal size and state
- Component composition
- Styling (colors, borders, emphasis)
- Pure functions: state + size → output

---

## State Management Patterns

### Central State (Recommended for most apps)

Single state object that holds everything. Updates produce a new state.

```
App {
    screen: Screen,          // which view is active
    nav_stack: [Screen],     // navigation history
    ui: UIState,             // focus, scroll, input
    data: DataState,         // domain data
    async: AsyncState,       // loading, pending requests
}
```

Updates are explicit:

```
fn update(state, action) -> (state, [Effect])
```

Where Effect represents async work (API call, file read). The update function is pure — it describes what happened and what should happen next, without performing I/O.

### Component-Local State

Some state is purely visual and belongs to a specific component:

- Scroll position within a list
- Whether a dropdown is open
- Text input cursor position

Keep this local when it doesn't affect other components. Promote to global state when multiple components need to coordinate around it.

---

## Component Architecture

### Component Contract

Every component should define:

1. **Props/Config** — What it needs to render (data, dimensions, options)
2. **State** — What it manages internally (scroll, focus, selection)
3. **Events/Actions** — What user interactions it produces (on_select, on_change, on_submit)
4. **Render** — A pure function from (props, state, width, height) → visual output

### Component Composition

Build screens by composing components, not by writing monolithic render functions.

```
Screen
├── Header
│   ├── Title
│   └── Breadcrumb
├── Sidebar
│   └── NavList
├── Content
│   ├── Toolbar
│   │   ├── SearchInput
│   │   ├── FilterDropdown
│   │   └── ActionButtons
│   ├── DataTable
│   │   ├── TableHeader
│   │   ├── TableRows
│   │   └── TablePagination
│   └── DetailPanel (conditional)
└── Footer
    ├── StatusBar
    └── KeyHints
```

### Component Sizing

Components should accept available dimensions and adapt:

- Fixed-size components (status bar, header): declare their height
- Flexible components (content area): take remaining space
- Components should handle being too small gracefully (truncate, collapse, show message)

---

## Navigation Patterns

### Flat Navigation (Tabs)

Best for: tools with 3-8 distinct modes

```
State: active_tab: int
Keys: 1-9 or Tab to switch
```

### Sidebar Navigation

Best for: apps with many sections or deep hierarchies

```
State: selected_nav_item: int, visible_panels: [Panel]
Keys: j/k in sidebar, Tab to move focus to content
```

### Stack Navigation (Push/Pop)

Best for: drill-down flows (list → detail → edit)

```
State: nav_stack: [Screen]
Keys: Enter to push, Esc to pop
```

### Command Palette

Best for: power-user access to any action

```
State: palette_open: bool, palette_query: string
Keys: Ctrl+P or : to open, type to filter, Enter to execute
```

---

## File Organization

### Small App (1-3 screens)

```
src/
├── main.go         // Entry point, app setup
├── model.go        // State definition
├── update.go       // All update logic
├── view.go         // All rendering
└── keybind.go      // Keybinding definitions
```

### Medium App (4-10 screens)

```
src/
├── main.go
├── app/
│   ├── model.go        // Central state
│   ├── update.go       // Root update, delegates to screens
│   └── keybind.go      // Global keybindings
├── screens/
│   ├── dashboard.go    // Dashboard screen model/update/view
│   ├── records.go      // Records screen
│   └── settings.go     // Settings screen
├── components/
│   ├── table.go        // Reusable table component
│   ├── sidebar.go      // Reusable sidebar
│   ├── statusbar.go    // Reusable status bar
│   └── input.go        // Reusable text input
├── domain/
│   ├── data.go         // Data types and access
│   └── actions.go      // Domain action definitions
└── style/
    └── theme.go        // Colors, borders, spacing constants
```

### Large App (10+ screens)

```
src/
├── main.go
├── app/
│   ├── model.go
│   ├── update.go
│   ├── commands.go     // Async command definitions
│   └── router.go       // Screen routing logic
├── screens/
│   ├── dashboard/
│   │   ├── model.go
│   │   ├── update.go
│   │   └── view.go
│   └── records/
│       ├── model.go
│       ├── update.go
│       ├── view.go
│       └── components/  // Screen-specific components
├── components/          // Shared components
│   ├── table/
│   ├── sidebar/
│   └── modal/
├── domain/
│   ├── models/
│   ├── services/
│   └── store/
├── style/
│   ├── theme.go
│   └── spacing.go
└── keybind/
    ├── global.go
    └── screens.go
```

---

## Async Operations

TUIs frequently need to load data, make API calls, or perform I/O. Handle this cleanly:

### Pattern: Command/Effect

1. User action triggers an update
2. Update returns a new state + a command (description of async work)
3. Runtime executes the command in a background goroutine/task
4. When complete, a result message is sent back into the update loop
5. Update processes the result and sets the new state

This keeps the update function pure and testable.

### Loading States

Every async operation should track its status:

```
enum AsyncState<T> {
    Idle,
    Loading,
    Loaded(T),
    Error(String),
}
```

The view renders differently for each state. Never assume data is loaded.

---

## Testing Strategy

### Unit Tests

- Update functions: given state + action → assert new state
- Component render: given props + dimensions → assert output contains expected elements
- Domain logic: pure functions, easy to test

### Integration Tests

- Navigation flow: can the user reach every screen?
- Key binding coverage: does every key do what it should?

### Visual Tests

- Snapshot terminal output for key screens
- Compare before/after snapshots on changes
- Test at multiple terminal sizes

---

## Error Handling in UI

### Principles

- Never show raw error strings in the main UI area
- Distinguish between: connection errors, validation errors, not-found, permission denied
- Show errors contextually (near the relevant component) when possible
- Global errors (connection lost) go in a prominent but dismissable banner
- Always offer a recovery action (retry, go back, dismiss)

### Error Display Options

- **Inline** — Below the relevant field or component (validation errors)
- **Toast/Banner** — Temporary message at top or bottom (transient errors)
- **Modal** — For critical errors requiring user decision
- **Status bar** — For non-critical background errors
