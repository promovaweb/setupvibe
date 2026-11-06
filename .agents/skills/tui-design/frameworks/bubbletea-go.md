# Bubble Tea (Go) — Framework Guide

## Overview

Bubble Tea is the Elm Architecture for Go terminals. It is the most popular Go TUI framework, with a rich ecosystem (Lip Gloss for styling, Bubbles for components, Harmonica for animations).

**Best for:** CLI tools, DevOps utilities, system monitors, deployable single binaries.

---

## Architecture

Bubble Tea follows the Elm Architecture:

```
Model → Update(Msg) → (Model, Cmd) → View(Model) → string
```

- **Model** — Your application state (struct)
- **Update** — Handles messages, returns new model + optional commands
- **View** — Renders model to a string
- **Cmd** — Describes async side effects (I/O, HTTP, timers)
- **Msg** — Events and results (key presses, command results)

### Core Interface

```go
type Model struct {
    // All your state lives here
}

func (m Model) Init() tea.Cmd {
    // Initial commands (e.g., fetch data)
    return nil
}

func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    // Handle messages, return new state + commands
    return m, nil
}

func (m Model) View() string {
    // Render to string
    return "Hello"
}
```

---

## Project Structure (Recommended)

```
myapp/
├── main.go              // Entry point, tea.NewProgram
├── model.go             // Central model definition
├── update.go            // Update logic (or split by screen)
├── view.go              // View logic (or split by screen)
├── keybind.go           // Keybinding definitions
├── messages.go          // Message type definitions
├── commands.go          // Cmd constructors (async operations)
├── components/
│   ├── table.go         // Custom table component
│   ├── sidebar.go       // Sidebar component
│   ├── input.go         // Enhanced input
│   └── statusbar.go     // Status bar
├── screens/
│   ├── dashboard.go     // Dashboard screen (model/update/view)
│   ├── records.go       // Records screen
│   └── settings.go      // Settings screen
├── style/
│   ├── theme.go         // Color palette, border styles
│   └── spacing.go       // Spacing constants
└── domain/
    ├── types.go         // Domain data types
    └── service.go       // Data access, business logic
```

---

## Styling with Lip Gloss

Lip Gloss provides layout and styling primitives.

### Theme Definition

```go
// style/theme.go
package style

import "github.com/charmbracelet/lipgloss"

var (
    Base     = lipgloss.NewStyle().Foreground(lipgloss.Color("252"))
    Muted    = lipgloss.NewStyle().Foreground(lipgloss.Color("243"))
    Accent   = lipgloss.NewStyle().Foreground(lipgloss.Color("86"))  // Cyan
    Bold     = lipgloss.NewStyle().Bold(true)
    Error    = lipgloss.NewStyle().Foreground(lipgloss.Color("203")) // Red
    Success  = lipgloss.NewStyle().Foreground(lipgloss.Color("78"))  // Green
    Warning  = lipgloss.NewStyle().Foreground(lipgloss.Color("221")) // Yellow

    BorderStyle = lipgloss.NewStyle().
        BorderStyle(lipgloss.RoundedBorder()).
        BorderForeground(lipgloss.Color("243")).
        Padding(1, 2)

    ActiveBorder = BorderStyle.
        BorderForeground(lipgloss.Color("86")) // Accent

    Spacing = struct{ XS, SM, MD, LG int}{
        XS: 1, SM: 2, MD: 4, LG: 6,
    }
)
```

### Layout with Lip Gloss

```go
// Horizontal layout
content := lipgloss.JoinHorizontal(lipgloss.Top,
    sidebar.Render(),
    lipgloss.NewStyle().
        Width(remainingWidth).
        Render(mainContent),
)

// Vertical layout
fullUI := lipgloss.JoinVertical(lipgloss.Left,
    header,
    content,
    statusBar,
)
```

### Responsive Sizing

```go
func (m Model) View() string {
    width, height := m.width, m.height

    sidebarWidth := 20
    if width < 60 {
        sidebarWidth = 0 // Hide sidebar on narrow terminals
    }

    contentWidth := width - sidebarWidth - 4 // 4 for padding + borders
    // ...render with computed dimensions
}
```

---

## Keybindings

Define keybindings centrally, not scattered in update functions:

```go
// keybind.go
type KeyMap struct {
    Up      key.Binding
    Down    key.Binding
    Enter   key.Binding
    Back    key.Binding
    Quit    key.Binding
    Search  key.Binding
    Help    key.Binding
    Refresh key.Binding
}

var Keys = KeyMap{
    Up:      key.NewBinding(key.WithKeys("k", "up")),
    Down:    key.NewBinding(key.WithKeys("j", "down")),
    Enter:   key.NewBinding(key.WithKeys("enter")),
    Back:    key.NewBinding(key.WithKeys("esc")),
    Quit:    key.NewBinding(key.WithKeys("q", "ctrl+c")),
    Search:  key.NewBinding(key.WithKeys("/")),
    Help:    key.NewBinding(key.WithKeys("?")),
    Refresh: key.NewBinding(key.WithKeys("r")),
}
```

---

## Component Pattern

Wrap sub-models as composable components:

```go
type Table struct {
    rows       []Row
    selected   int
    scrollY    int
    width      int
    height     int
    columns    []Column
}

func (t Table) Update(msg tea.Msg) Table {
    switch msg := msg.(type) {
    case tea.KeyMsg:
        switch msg.String() {
        case "j", "down":
            if t.selected < len(t.rows)-1 {
                t.selected++
            }
        case "k", "up":
            if t.selected > 0 {
                t.selected--
            }
        }
    }
    return t
}

func (t Table) View() string {
    // Render table within t.width x t.height
    // ...
}
```

---

## Async Operations (Commands)

```go
// messages.go
type RecordsLoadedMsg struct{ Records []Record }
type RecordsErrorMsg struct{ Err error }

// commands.go
func LoadRecords() tea.Cmd {
    return func() tea.Msg {
        records, err := fetchRecords()
        if err != nil {
            return RecordsErrorMsg{Err: err}
        }
        return RecordsLoadedMsg{Records: records}
    }
}

// update.go
func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    switch msg := msg.(type) {
    case RecordsLoadedMsg:
        m.records = msg.Records
        m.loading = false
        return m, nil
    case RecordsErrorMsg:
        m.err = msg.Err.Error()
        m.loading = false
        return m, nil
    }
}
```

---

## Multi-Screen Navigation

```go
type screen int
const (
    screenDashboard screen = iota
    screenRecords
    screenSettings
)

type Model struct {
    currentScreen screen
    // Screen-specific state embedded or in sub-models
    dashboard DashboardModel
    records   RecordsModel
    settings  SettingsModel
}

func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    // Delegate to active screen
    switch m.currentScreen {
    case screenDashboard:
        return m.dashboard.Update(msg, &m)
    case screenRecords:
        return m.records.Update(msg, &m)
    case screenSettings:
        return m.settings.Update(msg, &m)
    }
}
```

---

## Best Practices

1. **Use `tea.WindowSizeMsg`** to track terminal dimensions — store width/height in your model
2. **Use the alternate screen buffer** for full-screen apps: `tea.WithAltScreen()`
3. **Use `tea.WithMouseCellMotion()`** for mouse support in full-screen apps
4. **Compose with Lip Gloss** — `JoinHorizontal`/`JoinVertical` for layout, `Place` for centering
5. **Use Bubbles** for common components: `viewport`, `textinput`, `spinner`, `list`, `table`
6. **Keep update pure** — return commands for side effects, don't do I/O in update
7. **Handle window resize** — recompute all dimensions on `tea.WindowSizeMsg`
8. **Clean up on exit** — return `tea.Quit` command to exit cleanly
9. **Test update functions** — they're pure functions of (model, msg) → (model, cmd)

---

## Common Mistakes

- Putting I/O in the `Update` function (blocks rendering)
- Not handling `tea.WindowSizeMsg` (layout breaks on resize)
- Over-styling — Lip Gloss makes it easy to add colors/borders everywhere
- Ignoring the Bubbles library and reimplementing components
- Not using the alternate screen buffer for full-screen apps (messes up terminal history)

---

## Dependencies

```bash
go mod init myapp
go get github.com/charmbracelet/bubbletea
go get github.com/charmbracelet/lipgloss
go get github.com/charmbracelet/bubbles     # component kit: list, table, viewport, textinput
go get github.com/charmbracelet/harmonica   # optional: animations
```

Nix ad-hoc shell:

```bash
nix shell nixpkgs#go
```

- **Runtime**: `bubbletea`; `lipgloss` for styling/layout (nearly always
  used). Display-width helpers come via `rivo/uniseg` (already a Lip Gloss
  dependency — don't add a second width library).
- **Optional**: `bubbles`, `huh` (forms), `glamour` (markdown).
- **Dev**: `gofmt`, `go vet ./...`, `go test ./...`.

## Unicode Notes

- Lip Gloss pads/truncates by display width (uniseg). Use its
  `.Width(n)`/`.MaxWidth(n)` instead of manual slicing.
- No BiDi/RTL — see `references/rtl-and-bidi.md`.

## Testing Notes

- `Update(model, msg)` is pure: feed `tea.KeyMsg`s directly and assert
  state. `View()` returns a string — golden-file snapshots are trivial.
- End-to-end interaction: `teatest`. Full guidance:
  `references/testing-tuis.md`.
