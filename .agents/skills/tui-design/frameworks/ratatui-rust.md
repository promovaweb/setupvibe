# Ratatui (Rust) — Framework Guide

## Overview

Ratatui is a Rust TUI framework built on immediate-mode rendering. It gives maximum control and performance. Crossterm handles the terminal backend.

**Best for:** High-performance tools, long-running monitors, system utilities where Rust is already the language.

---

## Architecture

Ratatui is immediate-mode: you describe what to render each frame, and the framework diffs it to the terminal.

```
App State → handle_events() → update state → draw(state, frame) → diff → terminal
```

- **App State** — Struct holding all application state
- **handle_events** — Reads crossterm events, maps to actions
- **update** — Applies action to state (pure logic)
- **draw** — Renders state to frame (pure rendering)
- **Terminal** — Ratatui handles efficient diffing to the actual terminal

---

## Project Structure (Recommended)

```
myapp/
├── src/
│   ├── main.rs          // Entry point, terminal setup, event loop
│   ├── app.rs           // App state, update logic
│   ├── event.rs         // Event handling, async event reader
│   ├── ui.rs            // Top-level draw function
│   ├── screens/
│   │   ├── mod.rs
│   │   ├── dashboard.rs // Dashboard screen rendering + state
│   │   ├── records.rs   // Records screen
│   │   └── settings.rs  // Settings screen
│   ├── components/
│   │   ├── mod.rs
│   │   ├── table.rs     // Reusable table component
│   │   ├── sidebar.rs   // Navigation sidebar
│   │   ├── input.rs     // Text input component
│   │   └── statusbar.rs // Status bar
│   ├── theme.rs         // Colors, styles, spacing constants
│   ├── keybind.rs       // Keybinding definitions
│   └── domain/
│       ├── mod.rs
│       ├── models.rs    // Domain types
│       └── service.rs   // Data access, async operations
├── Cargo.toml
└── README.md
```

---

## Event Loop

```rust
// main.rs
use crossterm::event::{self, Event};
use ratatui::prelude::*;
use std::io;

fn main() -> Result<(), io::Error> {
    // Setup terminal
    crossterm::execute!(io::stdout(), crossterm::terminal::EnterAlternateScreen)?;
    crossterm::terminal::enable_raw_mode()?;
    let backend = CrosstermBackend::new(io::stdout());
    let mut terminal = Terminal::new(backend)?;

    // App state
    let mut app = App::new();

    // Event loop
    loop {
        terminal.draw(|f| ui::draw(f, &app))?;

        if event::poll(std::time::Duration::from_millis(100))? {
            if let Event::Key(key) = event::read()? {
                if app.handle_key(key).should_quit() {
                    break;
                }
            }
        }
    }

    // Restore terminal
    crossterm::execute!(io::stdout(), crossterm::terminal::LeaveAlternateScreen)?;
    crossterm::terminal::disable_raw_mode()?;
    Ok(())
}
```

---

## App State and Actions

```rust
// app.rs
use crossterm::event::KeyEvent;

pub struct App {
    pub should_quit: bool,
    pub current_screen: Screen,
    pub width: u16,
    pub height: u16,
    pub records: Vec<Record>,
    pub records_state: LoadingState<Vec<Record>>,
    pub selected_record: usize,
    pub sidebar_selected: usize,
}

pub enum Screen {
    Dashboard,
    Records,
    Settings,
}

pub enum LoadingState<T> {
    Idle,
    Loading,
    Loaded(T),
    Error(String),
}

impl App {
    pub fn new() -> Self {
        Self {
            should_quit: false,
            current_screen: Screen::Dashboard,
            width: 0,
            height: 0,
            records: Vec::new(),
            records_state: LoadingState::Idle,
            selected_record: 0,
            sidebar_selected: 0,
        }
    }

    pub fn handle_key(&mut self, key: KeyEvent) -> &Self {
        match self.current_screen {
            Screen::Dashboard => self.handle_dashboard_key(key),
            Screen::Records => self.handle_records_key(key),
            Screen::Settings => self.handle_settings_key(key),
        }
        self
    }

    pub fn should_quit(&self) -> bool {
        self.should_quit
    }

    pub fn resize(&mut self, width: u16, height: u16) {
        self.width = width;
        self.height = height;
    }
}
```

---

## Theme and Styling

```rust
// theme.rs
use ratatui::style::{Color, Modifier, Style};

pub struct Theme {
    pub base: Style,
    pub muted: Style,
    pub accent: Style,
    pub bold: Style,
    pub error: Style,
    pub success: Style,
    pub warning: Style,
    pub border: Style,
    pub active_border: Style,
    pub highlight: Style,
    pub header: Style,
}

impl Theme {
    pub fn new() -> Self {
        Self {
            base: Style::default().fg(Color::White),
            muted: Style::default().fg(Color::DarkGray),
            accent: Style::default().fg(Color::Cyan),
            bold: Style::default().add_modifier(Modifier::BOLD),
            error: Style::default().fg(Color::Red),
            success: Style::default().fg(Color::Green),
            warning: Style::default().fg(Color::Yellow),
            border: Style::default().fg(Color::DarkGray),
            active_border: Style::default().fg(Color::Cyan),
            highlight: Style::default()
                .bg(Color::DarkGray)
                .add_modifier(Modifier::BOLD),
            header: Style::default()
                .fg(Color::White)
                .add_modifier(Modifier::BOLD),
        }
    }
}

// Spacing constants
pub const PADDING_XS: u16 = 1;
pub const PADDING_SM: u16 = 2;
pub const PADDING_MD: u16 = 4;
pub const SIDEBAR_WIDTH: u16 = 22;
pub const STATUS_BAR_HEIGHT: u16 = 1;
pub const HEADER_HEIGHT: u16 = 1;
pub const MIN_WIDTH: u16 = 50;
pub const MIN_HEIGHT: u16 = 20;
```

---

## Drawing (Rendering)

```rust
// ui.rs
use ratatui::prelude::*;
use crate::app::App;
use crate::theme::Theme;

pub fn draw(f: &mut Frame, app: &App) {
    let theme = Theme::new();

    // Handle minimum size
    if app.width < MIN_WIDTH || app.height < MIN_HEIGHT {
        let msg = format!(
            "Terminal too small ({}x{}). Minimum: {}x{}",
            app.width, app.height, MIN_WIDTH, MIN_HEIGHT
        );
        let paragraph = Paragraph::new(msg)
            .style(theme.error)
            .alignment(Alignment::Center);
        f.render_widget(paragraph, f.area());
        return;
    }

    // Layout: header + content + status bar
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(HEADER_HEIGHT),
            Constraint::Min(0),       // Content
            Constraint::Length(STATUS_BAR_HEIGHT),
        ])
        .split(f.area());

    draw_header(f, chunks[0], app, &theme);
    draw_content(f, chunks[1], app, &theme);
    draw_status_bar(f, chunks[2], app, &theme);
}

fn draw_content(f: &mut Frame, area: Rect, app: &App, theme: &Theme) {
    let columns = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Length(SIDEBAR_WIDTH),
            Constraint::Min(0),
        ])
        .split(area);

    draw_sidebar(f, columns[0], app, theme);
    draw_main_panel(f, columns[1], app, theme);
}

fn draw_sidebar(f: &mut Frame, area: Rect, app: &App, theme: &Theme) {
    let block = Block::default()
        .borders(Borders::RIGHT)
        .border_style(theme.border)
        .padding(Padding::new(PADDING_SM, PADDING_SM, PADDING_XS, PADDING_XS));

    let items = vec!["Dashboard", "Records", "Logs", "Settings"];
    let list = List::new(items.iter().enumerate().map(|(i, item)| {
        let style = if i == app.sidebar_selected {
            theme.highlight
        } else {
            theme.base
        };
        ListItem::new(Line::from(format!(
            "{} {}",
            if i == app.sidebar_selected { "▸" } else { " " },
            item
        )))
        .style(style)
    }))
    .block(block);

    f.render_widget(list, area);
}

fn draw_status_bar(f: &mut Frame, area: Rect, app: &App, theme: &Theme) {
    let status = Span::styled(" ● Connected", theme.success);
    let spacer = Span::raw("  ");
    let hints = Span::styled(
        " j/k: navigate  Enter: select  ?: help  q: quit",
        theme.muted,
    );

    let line = Line::from(vec![status, spacer, hints]);
    let paragraph = Paragraph::new(line).style(
        Style::default().bg(Color::DarkGray),
    );

    f.render_widget(paragraph, area);
}
```

---

## Async Events

Use tokio for async operations:

```rust
// event.rs
use crossterm::event::{Event, KeyEvent};
use tokio::sync::mpsc;

pub enum AppEvent {
    Key(KeyEvent),
    Resize(u16, u16),
    RecordsLoaded(Vec<Record>),
    LoadError(String),
    Tick,
}

pub async fn event_listener(tx: mpsc::UnboundedSender<AppEvent>) {
    loop {
        // Poll crossterm events
        if crossterm::event::poll(Duration::from_millis(100)).unwrap() {
            match crossterm::event::read().unwrap() {
                Event::Key(key) => tx.send(AppEvent::Key(key)).unwrap(),
                Event::Resize(w, h) => tx.send(AppEvent::Resize(w, h)).unwrap(),
                _ => {}
            }
        }
    }
}
```

---

## Component Pattern

```rust
// components/table.rs
use ratatui::prelude::*;

pub struct TableState {
    pub selected: usize,
    pub scroll_offset: usize,
}

pub fn draw_data_table<'a>(
    f: &mut Frame,
    area: Rect,
    columns: &[(&str, u16)],
    rows: &[Vec<Span<'a>>],
    state: &mut TableState,
    theme: &Theme,
) {
    let header = Row::new(
        columns.iter().map(|(name, _)| {
            Cell::from(*name).style(theme.header)
        }),
    )
    .bottom_margin(1);

    let data_rows: Vec<Row> = rows
        .iter()
        .enumerate()
        .map(|(i, cells)| {
            let style = if i == state.selected {
                theme.highlight
            } else {
                theme.base
            };
            Row::new(cells.iter().map(|c| Cell::from(c.clone()))).style(style)
        })
        .collect();

    let widths: Vec<Constraint> = columns
        .iter()
        .map(|(_, w)| Constraint::Length(*w))
        .collect();

    let table = ratatui::widgets::Table::new(data_rows, &widths)
        .header(header)
        .block(Block::default().padding(Padding::horizontal(1)));

    let mut table_state = ratatui::widgets::TableState::default();
    table_state.select(Some(state.selected));
    f.render_stateful_widget(table, area, &mut table_state);
}
```

---

## Keybindings

```rust
// keybind.rs
use crossterm::event::{KeyCode, KeyEvent, KeyModifiers};

pub enum Action {
    Up,
    Down,
    Enter,
    Back,
    Quit,
    Search,
    Help,
    Refresh,
    NextPanel,
    PrevPanel,
}

impl Action {
    pub fn from_key(key: KeyEvent) -> Option<Self> {
        match (key.modifiers, key.code) {
            (KeyModifiers::NONE, KeyCode::Char('j')) | (KeyModifiers::NONE, KeyCode::Down) => Some(Action::Down),
            (KeyModifiers::NONE, KeyCode::Char('k')) | (KeyModifiers::NONE, KeyCode::Up) => Some(Action::Up),
            (KeyModifiers::NONE, KeyCode::Enter) => Some(Action::Enter),
            (KeyModifiers::NONE, KeyCode::Esc) => Some(Action::Back),
            (KeyModifiers::NONE, KeyCode::Char('q')) => Some(Action::Quit),
            (KeyModifiers::CONTROL, KeyCode::Char('c')) => Some(Action::Quit),
            (KeyModifiers::NONE, KeyCode::Char('/')) => Some(Action::Search),
            (KeyModifiers::NONE, KeyCode::Char('?')) => Some(Action::Help),
            (KeyModifiers::NONE, KeyCode::Char('r')) => Some(Action::Refresh),
            (KeyModifiers::NONE, KeyCode::Tab) => Some(Action::NextPanel),
            (KeyModifiers::SHIFT, KeyCode::BackTab) => Some(Action::PrevPanel),
            _ => None,
        }
    }
}
```

---

## Best Practices

1. **Always restore terminal state** — Use `EnterAlternateScreen`/`LeaveAlternateScreen` and `enable_raw_mode`/`disable_raw_mode` in a `Drop` guard
2. **Use `Layout` and constraints** — `Constraint::Min(0)` for flexible areas, `Constraint::Length(n)` for fixed
3. **Keep draw functions pure** — They should only read state and produce output
4. **Use `Block` for padding and borders** — Don't add spaces manually
5. **Handle resize** — Listen for `Event::Resize` and update stored dimensions
6. **Use `Padding` struct** — Consistent padding via `Block::padding(Padding::new(...))`
7. **Test update logic** — Since state updates are pure functions, they're straightforward to test
8. **Use `Line` and `Span` for styled text** — Compose styled text declaratively

---

## Common Mistakes

- Not restoring terminal state on panic (use a `Drop` guard)
- Computing layout in the event handler instead of the draw function
- Hardcoding dimensions instead of using `f.area()` and `Layout`
- Not using the `Table` widget's stateful rendering for selection
- Blocking the event loop with sync I/O (use channels + async tasks)
- Forgetting that `Layout::split` borrows the area — clone if needed

---

## Dependencies

```bash
cargo add ratatui crossterm
cargo add tokio --features full          # only if you need async I/O
cargo add unicode-width                  # display width (usually already a transitive dep)
```

Nix ad-hoc shell:

```bash
nix shell nixpkgs#rustc nixpkgs#cargo
```

- **Runtime**: `ratatui` + a backend (`crossterm` is the default; termion
  and termwiz exist). Add `unicode-width` only if you call it directly.
- **Optional**: `ratatui-widgets`, `tui-textarea`, `tui-tree-widget`,
  `ratatui-image` (kitty graphics). Add only when used.
- **Dev**: `cargo fmt`, `cargo clippy -- -D warnings`, `cargo test`.

## Unicode Notes

- Ratatui measures width via `unicode-width`; `Line`/`Span` handle it
  internally. Don't hand-roll padding/truncation.
- No BiDi/RTL: text renders in logical order — see
  `references/rtl-and-bidi.md` and `references/unicode-and-text.md`.

## Testing Notes

- `ratatui::backend::TestBackend` renders to an in-memory buffer:
  `terminal.backend().assert_buffer(&expected)` — deterministic snapshot
  tests with no TTY. Full guidance: `references/testing-tuis.md`.
