//! TUI Starter — Ratatui (Rust)
//!
//! A clean starter template for a sidebar + content TUI with keyboard navigation.
//! Build: cargo run

use crossterm::event::{self, Event, KeyCode, KeyEvent};
use ratatui::prelude::*;
use ratatui::widgets::{Block, Borders, List, ListItem, ListState, Padding, Paragraph, Wrap};
use std::io;

// --- Theme ---

struct Theme {
    base: Style,
    muted: Style,
    accent: Style,
    bold: Style,
    success: Style,
    error: Style,
    border: Style,
    active_border: Style,
}

impl Theme {
    fn new() -> Self {
        Self {
            base: Style::default().fg(Color::White),
            muted: Style::default().fg(Color::DarkGray),
            accent: Style::default().fg(Color::Cyan),
            bold: Style::default().add_modifier(Modifier::BOLD),
            success: Style::default().fg(Color::Green),
            error: Style::default().fg(Color::Red),
            border: Style::default().fg(Color::DarkGray),
            active_border: Style::default().fg(Color::Cyan),
        }
    }
}

// --- App State ---

struct App {
    should_quit: bool,
    nav_items: Vec<&'static str>,
    selected: usize,
    active: Option<usize>,
    show_help: bool,
    width: u16,
    height: u16,
}

impl App {
    fn new() -> Self {
        Self {
            should_quit: false,
            nav_items: vec!["Dashboard", "Records", "Logs", "Settings"],
            selected: 0,
            active: None,
            show_help: false,
            width: 0,
            height: 0,
        }
    }

    fn handle_key(&mut self, key: KeyEvent) {
        match key.code {
            KeyCode::Char('q') | KeyCode::Char('c') if key.modifiers.contains(event::KeyModifiers::CONTROL) => {
                self.should_quit = true;
            }
            KeyCode::Char('q') => self.should_quit = true,
            KeyCode::Up | KeyCode::Char('k') => {
                if self.selected > 0 {
                    self.selected -= 1;
                }
            }
            KeyCode::Down | KeyCode::Char('j') => {
                if self.selected < self.nav_items.len() - 1 {
                    self.selected += 1;
                }
            }
            KeyCode::Enter => {
                self.active = Some(self.selected);
                self.show_help = false;
            }
            KeyCode::Char('?') => self.show_help = !self.show_help,
            _ => {}
        }
    }

    fn resize(&mut self, w: u16, h: u16) {
        self.width = w;
        self.height = h;
    }
}

// --- Drawing ---

fn draw(f: &mut Frame, app: &App) {
    let theme = Theme::new();

    const MIN_WIDTH: u16 = 50;
    const MIN_HEIGHT: u16 = 15;
    const SIDEBAR_WIDTH: u16 = 22;
    const STATUS_HEIGHT: u16 = 1;

    if app.width < MIN_WIDTH || app.height < MIN_HEIGHT {
        let msg = format!(
            "Terminal too small ({}x{}). Minimum: {}x{}.",
            app.width, app.height, MIN_WIDTH, MIN_HEIGHT
        );
        let paragraph = Paragraph::new(msg)
            .style(theme.error)
            .alignment(Alignment::Center);
        f.render_widget(paragraph, f.area());
        return;
    }

    // Layout: content + status bar
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Min(0), Constraint::Length(STATUS_HEIGHT)])
        .split(f.area());

    let content_area = chunks[0];
    let status_area = chunks[1];

    // Content: sidebar + main panel
    let columns = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Length(SIDEBAR_WIDTH), Constraint::Min(0)])
        .split(content_area);

    draw_sidebar(f, columns[0], app, &theme);
    draw_main_panel(f, columns[1], app, &theme);
    draw_status_bar(f, status_area, &theme);
}

fn draw_sidebar(f: &mut Frame, area: Rect, app: &App, theme: &Theme) {
    let items: Vec<ListItem> = app
        .nav_items
        .iter()
        .enumerate()
        .map(|(i, item)| {
            let (prefix, style) = if i == app.selected {
                ("▸ ", theme.accent.add_modifier(Modifier::BOLD))
            } else {
                ("  ", theme.base)
            };
            ListItem::new(Line::from(format!("{}{}", prefix, item))).style(style)
        })
        .collect();

    let nav_header = Paragraph::new("NAVIGATION")
        .style(theme.muted.add_modifier(Modifier::BOLD))
        .block(
            Block::default()
                .borders(Borders::RIGHT)
                .border_style(theme.border)
                .padding(Padding::new(2, 2, 1, 0)),
        );

    let list = List::new(items)
        .style(theme.base)
        .block(
            Block::default()
                .borders(Borders::RIGHT)
                .border_style(theme.border)
                .padding(Padding::horizontal(2)),
        );

    let sidebar_chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Length(3), Constraint::Min(0)])
        .split(area);

    f.render_widget(nav_header, sidebar_chunks[0]);

    let mut state = ListState::default();
    state.select(Some(app.selected));
    f.render_stateful_widget(list, sidebar_chunks[1], &mut state);
}

fn draw_main_panel(f: &mut Frame, area: Rect, app: &App, theme: &Theme) {
    let lines: Vec<Line> = if app.show_help {
        let mut lines = vec![Line::from(Span::styled("Help", theme.bold)), Line::from("")];
        for entry in [
            "j/k      Navigate the sidebar",
            "enter    Select the highlighted item",
            "?        Toggle this help",
            "q        Quit",
        ] {
            lines.push(Line::from(Span::styled(entry, theme.base)));
        }
        lines
    } else if let Some(idx) = app.active {
        let item = app.nav_items[idx];
        vec![
            Line::from(Span::styled(item.to_uppercase(), theme.bold)),
            Line::from(""),
            Line::from(Span::styled(
                format!("This is the {} section.", item),
                theme.muted,
            )),
            Line::from(Span::styled(
                "Press ? for help or q to quit.",
                theme.muted,
            )),
        ]
    } else {
        let title = app.nav_items[app.selected];
        vec![
            Line::from(vec![
                Span::styled(title, theme.bold),
                Span::styled(
                    " — Select an item from the sidebar, or press ? for help.",
                    theme.muted,
                ),
            ]),
            Line::from(""),
            Line::from(Span::styled(
                "Use j/k to navigate, Enter to select, q to quit.",
                theme.muted,
            )),
        ]
    };

    let content = Paragraph::new(lines)
        .wrap(Wrap { trim: true })
        .block(
            Block::default()
                .border_style(theme.active_border)
                .padding(Padding::new(2, 2, 1, 1)),
        );

    f.render_widget(content, area);
}

fn draw_status_bar(f: &mut Frame, area: Rect, theme: &Theme) {
    let line = Line::from(vec![
        Span::styled(" ● Connected", theme.success),
        Span::raw("  "),
        Span::styled(
            "j/k: navigate  Enter: select  ?: help  q: quit",
            theme.muted,
        ),
    ]);

    let bar = Paragraph::new(line)
        .style(Style::default().bg(Color::DarkGray))
        .block(Block::default().padding(Padding::horizontal(2)));

    f.render_widget(bar, area);
}

// --- Terminal Guard ---

struct TerminalGuard;

impl TerminalGuard {
    fn init() -> io::Result<Terminal> {
        crossterm::execute!(io::stdout(), crossterm::terminal::EnterAlternateScreen)?;
        crossterm::terminal::enable_raw_mode()?;
        let backend = CrosstermBackend::new(io::stdout());
        Ok(Terminal::new(backend)?)
    }
}

impl Drop for TerminalGuard {
    fn drop(&mut self) {
        let _ = crossterm::terminal::disable_raw_mode();
        let _ = crossterm::execute!(io::stdout(), crossterm::terminal::LeaveAlternateScreen);
    }
}

type Terminal = ratatui::Terminal<CrosstermBackend<io::Stdout>>;

// --- Main ---

fn main() -> io::Result<()> {
    let mut terminal = TerminalGuard::init()?;
    let mut app = App::new();

    loop {
        terminal.draw(|f| draw(f, &app))?;

        if event::poll(std::time::Duration::from_millis(100))? {
            if let Event::Key(key) = event::read()? {
                app.handle_key(key);
            } else if let Event::Resize(w, h) = event::read()? {
                app.resize(w, h);
            }
        }

        if app.should_quit {
            break;
        }
    }

    Ok(())
}
