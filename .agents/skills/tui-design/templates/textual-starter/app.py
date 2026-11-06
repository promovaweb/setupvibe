"""TUI Starter — Textual (Python)

A clean starter template for a sidebar + content TUI with keyboard navigation.
Run: textual run app.py --dev
"""

from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.widgets import Header, Footer, Static, ListView, ListItem
from textual.containers import Horizontal, Vertical
from textual.reactive import reactive


class NavItem(ListItem):
    """A navigation sidebar item."""

    def __init__(self, label: str, icon: str = "") -> None:
        super().__init__()
        self.nav_label = label
        self.nav_icon = icon


class Sidebar(Vertical):
    """Navigation sidebar component."""

    DEFAULT_CSS = """
    Sidebar {
        width: 24;
        dock: left;
        padding: 1 2;
        border-right: solid $border;
        background: $surface;
    }

    Sidebar .nav-header {
        color: $text-muted;
        text-style: bold;
        margin-bottom: 1;
    }

    Sidebar ListItem {
        padding: 0 1;
        height: 3;
    }

    Sidebar ListItem:hover {
        background: $boost;
    }

    Sidebar ListView:focus > ListItem.--highlight {
        background: $accent 20%;
        text-style: bold;
        color: $accent;
    }
    """

    def compose(self) -> ComposeResult:
        yield Static("NAVIGATION", classes="nav-header")
        with ListView(id="nav-list"):
            yield NavItem("Dashboard", "▸")
            yield NavItem("Records", "")
            yield NavItem("Logs", "")
            yield NavItem("Settings", "")


SECTION_DESCRIPTIONS = {
    "Dashboard": "System overview and recent activity.",
    "Records": "Browse and manage your records.",
    "Logs": "Recent events and diagnostics.",
    "Settings": "Application preferences.",
}

HELP_TEXT = (
    "j/k      Navigate the sidebar\n"
    "enter    Select the highlighted item\n"
    "?        Toggle this help\n"
    "q        Quit"
)


class ContentPanel(Vertical):
    """Main content area that responds to navigation."""

    DEFAULT_CSS = """
    ContentPanel {
        padding: 2 3;
        height: 1fr;
    }

    ContentPanel .title {
        text-style: bold;
        margin-bottom: 1;
    }

    ContentPanel .subtitle {
        color: $text-muted;
        margin-bottom: 2;
    }
    """

    active_section: reactive[str] = reactive("Dashboard", init=False)
    show_help: reactive[bool] = reactive(False, init=False)

    def compose(self) -> ComposeResult:
        yield Static(self.active_section, id="content-title", classes="title")
        yield Static(self._body_text(), id="content-body", classes="subtitle")

    def _body_text(self) -> str:
        if self.show_help:
            return HELP_TEXT
        return SECTION_DESCRIPTIONS.get(self.active_section, "")

    def _refresh(self) -> None:
        self.query_one("#content-title", Static).update(self.active_section)
        self.query_one("#content-body", Static).update(self._body_text())

    def watch_active_section(self, section: str) -> None:
        self._refresh()

    def watch_show_help(self, show: bool) -> None:
        self._refresh()


class TUIStarter(App):
    """A polished TUI starter with sidebar navigation and content area."""

    CSS_PATH = None  # Styles are inline for portability

    BINDINGS = [
        Binding("q", "quit", "Quit"),
        Binding("question_mark", "toggle_help", "Help", key_display="?"),
        Binding("j", "cursor_down", "Down", show=False),
        Binding("k", "cursor_up", "Up", show=False),
    ]

    def compose(self) -> ComposeResult:
        yield Header()
        with Horizontal():
            yield Sidebar()
            yield ContentPanel()
        yield Footer()

    def action_toggle_help(self) -> None:
        self.query_one(ContentPanel).show_help = not self.query_one(ContentPanel).show_help

    def action_cursor_down(self) -> None:
        self.query_one("#nav-list", ListView).action_cursor_down()

    def action_cursor_up(self) -> None:
        self.query_one("#nav-list", ListView).action_cursor_up()

    def on_list_view_selected(self, event: ListView.Selected) -> None:
        if isinstance(event.item, NavItem):
            content = self.query_one(ContentPanel)
            content.show_help = False
            content.active_section = event.item.nav_label
