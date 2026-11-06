# Textual (Python) — Framework Guide

## Overview

Textual is a modern Python TUI framework with a rich widget system, CSS-based styling, async support, and a reactive programming model. It is the fastest way to build a polished TUI.

**Best for:** Data tools, dashboards, admin panels, internal tools. Fastest iteration cycle.

---

## Architecture

Textual uses a widget tree with reactive state and message passing:

```
App
├── Header
├── Container
│   ├── Sidebar (Widget)
│   │   └── NavList (Widget)
│   └── Content (Widget)
│       ├── Toolbar
│       └── DataTable
├── Footer
└── Modal (overlays)
```

- **App** — Root application, manages screens and global state
- **Screens** — Full-screen views with their own widget trees
- **Widgets** — Composable UI components
- **Messages** — Events propagated through the widget tree
- **Reactive** — Reactive attributes that trigger re-renders
- **Workers** — Async background tasks for I/O

---

## Project Structure (Recommended)

```
myapp/
├── __main__.py          # Entry point
├── app.py               # Main App class
├── screens/
│   ├── dashboard.py     # Dashboard screen
│   ├── records.py       # Records browser screen
│   ├── record_detail.py # Record detail/edit screen
│   └── settings.py      # Settings screen
├── widgets/
│   ├── sidebar.py       # Navigation sidebar widget
│   ├── record_table.py  # Custom data table widget
│   ├── status_bar.py    # Custom status bar
│   ├── search_bar.py    # Search/filter input
│   └── confirm_modal.py # Confirmation dialog
├── domain/
│   ├── models.py        # Data models
│   └── service.py       # Data access layer
├── styles/
│   └── main.tcss        # Global CSS styles
├── pyproject.toml
└── README.md
```

---

## App and Screens

```python
# app.py
from textual.app import App, ComposeResult
from textual.binding import Binding
from screens.dashboard import DashboardScreen

class MyApp(App):
    CSS_PATH = "styles/main.tcss"
    TITLE = "MyApp"
    BINDINGS = [
        Binding("q", "quit", "Quit"),
        Binding("question_mark", "help", "Help", key_display="?"),
    ]

    def on_mount(self) -> None:
        self.push_screen(DashboardScreen())
```

### Screen Pattern

```python
# screens/records.py
from textual.screen import Screen
from textual.binding import Binding
from textual.widgets import Header, Footer, DataTable, Input

class RecordsScreen(Screen):
    BINDINGS = [
        Binding("escape", "pop_screen", "Back"),
        Binding("slash", "focus_search", "Search", key_display="/"),
        Binding("n", "new_record", "New"),
    ]

    def compose(self) -> ComposeResult:
        yield Header()
        yield SearchBar(id="search")
        yield DataTable(id="records-table")
        yield Footer()

    def on_mount(self) -> None:
        self.query_one(DataTable).focus()
        self.load_records()

    def on_data_table_row_selected(self, event) -> None:
        record_id = event.row_key.value
        self.app.push_screen(RecordDetailScreen(record_id))

    @work
    async def load_records(self) -> None:
        table = self.query_one(DataTable)
        records = await fetch_records()
        table.clear()
        for r in records:
            table.add_row(r.name, r.status, r.date, key=r.id)
```

---

## Styling with TCSS

Textual uses a CSS-like language for styling. Keep styles in `.tcss` files, not inline.

```css
/* styles/main.tcss */

/* Sidebar navigation */
Sidebar {
    width: 24;
    dock: left;
    background: $surface;
    border-right: solid $border;
    padding: 1 2;
}

Sidebar .nav-item {
    padding: 0 1;
    height: 3;
}

Sidebar .nav-item.active {
    text-style: bold;
    color: $accent;
    background: $boost;
}

/* Data table */
DataTable {
    height: 1fr;
}

DataTable > .datatable--header {
    text-style: bold;
    color: $text-muted;
    background: $surface;
}

/* Status bar */
StatusBar {
    dock: bottom;
    height: 1;
    background: $primary;
    color: $text;
    padding: 0 2;
}

/* Modal */
ConfirmModal {
    align: center middle;
}

ConfirmModal > Container {
    width: 60;
    height: auto;
    max-height: 20;
    padding: 2 4;
    border: solid $accent;
    background: $surface;
}
```

### Design Tokens

Textual provides built-in design tokens:

```
$background    $surface      $primary      $secondary
$accent        $warning      $error        $success
$text          $text-muted   $border       $boost
$panel         $input
```

Use these consistently — they adapt to light/dark themes.

---

## Reactive State

```python
from textual.reactive import reactive

class RecordsScreen(Screen):
    filter_query: reactive[str] = reactive("")
    selected_id: reactive[str] = reactive("")
    loading: reactive[bool] = reactive(False)

    def watch_filter_query(self, new_query: str) -> None:
        # Called when filter_query changes
        self.filter_records(new_query)

    def watch_loading(self, is_loading: bool) -> None:
        # Show/hide loading indicator
        loading = self.query_one("#loading-indicator")
        loading.display = is_loading
```

---

## Widgets (Composition)

### Custom Widget

```python
# widgets/sidebar.py
from textual.widgets import Static, ListItem, ListView
from textual.message import Message

class Sidebar(Static):
    DEFAULT_CSS = """
    Sidebar {
        width: 24;
        dock: left;
        padding: 1 2;
        border-right: solid $border;
    }
    """

    class NavSelected(Message):
        def __init__(self, section: str) -> None:
            self.section = section
            super().__init__()

    def compose(self):
        yield Label("NAVIGATION", classes="nav-header")
        with ListView(id="nav-list"):
            yield ListItem(Label("Dashboard"))
            yield ListItem(Label("Records"))
            yield ListItem(Label("Logs"))
            yield ListItem(Label("Settings"))

    def on_list_view_selected(self, event: ListView.Selected) -> None:
        label = event.item.query_one(Label).renderable
        self.post_message(self.NavSelected(str(label)))
```

### Composing Widgets

```python
class DashboardScreen(Screen):
    def compose(self) -> ComposeResult:
        yield Header()
        with Horizontal():
            yield Sidebar()
            with Vertical(id="content"):
                yield Label("Dashboard", id="title")
                with Horizontal(id="stats-row"):
                    yield StatCard("Total", "1,247")
                    yield StatCard("Active", "892")
                    yield StatCard("Errors", "3")
                yield DataTable(id="recent-table")
        yield Footer()
```

---

## Async Workers

```python
from textual.work import work

class RecordsScreen(Screen):
    @work(exclusive=True)
    async def load_records(self) -> None:
        self.loading = True
        try:
            records = await self.app.service.fetch_records()
            table = self.query_one(DataTable)
            table.clear()
            for r in records:
                table.add_row(r.name, r.status, key=r.id)
        except Exception as e:
            self.notify(f"Failed to load records: {e}", severity="error")
        finally:
            self.loading = False

    @work(exclusive=True, thread=True)
    def sync_records(self) -> None:
        # Runs in a thread (for sync I/O)
        self.app.service.sync()
        self.call_from_thread(self.load_records)
```

---

## Keybindings

```python
class MyScreen(Screen):
    BINDINGS = [
        Binding("j", "cursor_down", "Down", show=False),
        Binding("k", "cursor_up", "Up", show=False),
        Binding("enter", "select", "Select"),
        Binding("escape", "back", "Back"),
        Binding("slash", "search", "Search", key_display="/"),
        Binding("n", "new", "New"),
        Binding("r", "refresh", "Refresh"),
        Binding("question_mark", "toggle_help", "Help", key_display="?"),
    ]
```

Use `show=False` for keys that are internal navigation (don't clutter the footer).

---

## Messages (Event System)

```python
# Define custom messages for inter-widget communication
class RecordChanged(Message):
    def __init__(self, record_id: str, action: str) -> None:
        self.record_id = record_id
        self.action = action
        super().__init__()

# Post from a widget
self.post_message(RecordChanged("42", "updated"))

# Handle in parent screen
def on_record_changed(self, event: RecordChanged) -> None:
    self.query_one(StatusBar).show_toast(f"Record {event.action}")
```

---

## Best Practices

1. **Use TCSS files** — Keep styles separate from logic. CSS makes iteration fast.
2. **Use design tokens** — `$accent`, `$text-muted`, etc. They adapt to themes.
3. **Compose widgets** — Build screens from small, focused widgets.
4. **Use `@work` for I/O** — Never block the UI thread. Use `exclusive=True` to prevent duplicate operations.
5. **Use `reactive` for derived state** — Let reactivity handle re-renders.
6. **Use Screens for navigation** — `push_screen`/`pop_screen` for drill-down flows.
7. **Use `notify()` for toasts** — Built-in toast notification system.
8. **Set `TITLE` and `SUB_TITLE`** — Shown in the built-in Header widget.
9. **Focus management** — Use `.focus()` and `Screen.focused` to control focus.
10. **Test with `pilot`** — Textual's testing framework for programmatic interaction.

---

## Testing

```python
import pytest
from myapp.app import MyApp

async def test_dashboard_loads():
    app = MyApp()
    async with app.run_test() as pilot:
        # Dashboard screen should be visible
        assert app.screen.name == "dashboard"

        # Navigate to records
        await pilot.press("2")  # or whatever key
        assert app.screen.name == "records"

        # Check table has data
        table = app.screen.query_one(DataTable)
        assert table.row_count > 0
```

---

## Common Mistakes

- Blocking the event loop with sync I/O (use `@work`)
- Overusing inline styles instead of TCSS
- Not using `reactive` for state that drives rendering
- Creating a single monolithic Screen class instead of composable widgets
- Ignoring the built-in widget library (DataTable, ListView, etc.)
- Hardcoding dimensions — Textual handles responsive sizing via CSS

---

## Installation

```bash
# Runtime
pip install textual
# or: uv add textual

# Development (devtools, docs, snapshot testing)
pip install textual-dev

# Nix ad-hoc shell
nix shell nixpkgs#python3Packages.textual
```

- **Runtime**: `textual` only (depends on `rich`, which supplies the
  width/segment handling).
- **Dev**: `textual run app.py --dev` (hot reload + console),
  `textual-dev` (includes `pytest-textual-snapshot`), `ruff`.
- Requires a UTF-8 terminal; Python 3.8+ (3.9+ for recent Textual).

## Unicode Notes

- Textual measures display width via Rich internally — widgets pad and
  truncate correctly. Don't pre-pad strings yourself.
- No BiDi/RTL support: Arabic renders in logical order (documented
  limitation) — see `references/rtl-and-bidi.md`.
