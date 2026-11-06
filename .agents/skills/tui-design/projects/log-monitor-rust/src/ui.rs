//! Rendering: stats header, log viewport, filter bar, banners, status bar.

use crate::app::App;
use crate::ring::Level;
use ratatui::prelude::*;
use ratatui::widgets::{Block, Borders, Padding, Paragraph};

struct Theme {
    base: Style,
    muted: Style,
    accent: Style,
    success: Style,
    warn: Style,
    error: Style,
    border: Style,
}

impl Theme {
    fn new() -> Self {
        Self {
            base: Style::default().fg(Color::White),
            muted: Style::default().fg(Color::DarkGray),
            accent: Style::default().fg(Color::Cyan),
            success: Style::default().fg(Color::Green),
            warn: Style::default().fg(Color::Yellow),
            error: Style::default().fg(Color::Red),
            border: Style::default().fg(Color::DarkGray),
        }
    }
}

const MIN_WIDTH: u16 = 50;
const MIN_HEIGHT: u16 = 12;

pub fn draw(f: &mut Frame, app: &App) {
    let theme = Theme::new();

    if app.width < MIN_WIDTH || app.height < MIN_HEIGHT {
        let msg = format!(
            "Terminal too small ({}x{}). Minimum: {}x{}.",
            app.width, app.height, MIN_WIDTH, MIN_HEIGHT
        );
        f.render_widget(
            Paragraph::new(msg).style(theme.error).alignment(Alignment::Center),
            f.area(),
        );
        return;
    }

    let rows = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(1), // stats
            Constraint::Length(1), // separator
            Constraint::Min(1),    // logs
            Constraint::Length(1), // status
        ])
        .split(f.area());

    draw_stats(f, rows[0], app, &theme);
    draw_separator(f, rows[1], &theme);

    // Logs area shrinks when the filter bar or help banner is up.
    let mut constraints = vec![];
    if app.filter_mode {
        constraints.push(Constraint::Length(1));
    }
    if app.show_help {
        constraints.push(Constraint::Length(6));
    }
    constraints.push(Constraint::Min(1));
    let mid = Layout::default()
        .direction(Direction::Vertical)
        .constraints(constraints)
        .split(rows[2]);

    let mut next = 0;
    if app.filter_mode {
        draw_filter_bar(f, mid[next], app, &theme);
        next += 1;
    }
    if app.show_help {
        draw_help(f, mid[next], &theme);
        next += 1;
    }
    draw_logs(f, mid[next], app, &theme);

    if app.producer.failed {
        // Disconnect banner overlays the stats line — old logs stay visible.
        draw_disconnect(f, rows[0], &theme);
    }
    draw_status_bar(f, rows[3], app, &theme);
}

fn draw_stats(f: &mut Frame, area: Rect, app: &App, theme: &Theme) {
    let visible = app.visible().len();
    let state = if app.paused {
        Span::styled("❚❚ paused", theme.warn)
    } else {
        Span::styled("▶ streaming", theme.success)
    };
    let line = Line::from(vec![
        Span::styled(" log-monitor", theme.accent),
        Span::raw("  "),
        state,
        Span::raw("  "),
        Span::styled(format!("buffer {}/{}", app.ring.len(), app.ring.cap()), theme.muted),
        Span::raw("  "),
        Span::styled(format!("total {}", app.ring.total()), theme.muted),
        Span::raw("  "),
        Span::styled(
            format!("dropped {}", app.ring.dropped()),
            if app.ring.dropped() > 0 { theme.warn } else { theme.muted },
        ),
        Span::raw("  "),
        Span::styled(format!("matching {visible}"), theme.muted),
        Span::raw("  "),
        Span::styled(format!("errors {}", app.error_count()), theme.error),
    ]);
    f.render_widget(Paragraph::new(line), area);
}

fn draw_disconnect(f: &mut Frame, area: Rect, theme: &Theme) {
    let line = Line::from(Span::styled(
        " ● producer disconnected (simulated) — previous logs kept — R: retry",
        theme.error,
    ));
    f.render_widget(
        Paragraph::new(line).style(Style::default().bg(Color::Rgb(60, 20, 20))),
        area,
    );
}

fn draw_separator(f: &mut Frame, area: Rect, theme: &Theme) {
    let width = area.width as usize;
    f.render_widget(
        Paragraph::new(Line::from(Span::styled("─".repeat(width), theme.border))),
        area,
    );
}

fn draw_logs(f: &mut Frame, area: Rect, app: &App, theme: &Theme) {
    let visible = app.visible();
    let rows = area.height as usize;

    if visible.is_empty() {
        let msg = if app.filter.is_empty() {
            "waiting for lines…"
        } else {
            "no lines match — esc clears the filter"
        };
        f.render_widget(
            Paragraph::new(Span::styled(format!("   {msg}"), theme.muted)),
            area,
        );
        return;
    }

    // scroll is the offset back from the tail (0 = follow).
    let end = visible.len().saturating_sub(app.scroll);
    let start = end.saturating_sub(rows);
    let mut lines = Vec::with_capacity(rows);
    for l in &visible[start..end.min(visible.len())] {
        let level_style = match l.level {
            Level::Error => theme.error,
            Level::Warn => theme.warn,
            Level::Info => theme.muted,
        };
        lines.push(Line::from(vec![
            Span::styled(format!(" {:>8} ", l.ts), theme.muted),
            Span::styled(format!("{:<5}", format!("{:?}", l.level)), level_style),
            Span::styled(l.msg.clone(), theme.base),
        ]));
    }
    if app.scroll > 0 {
        lines.push(Line::from(Span::styled(
            format!("   … scrolled back {} lines — G to follow tail", app.scroll),
            theme.accent,
        )));
    }
    f.render_widget(
        Paragraph::new(lines).block(Block::default().padding(Padding::horizontal(1))),
        area,
    );
}

fn draw_filter_bar(f: &mut Frame, area: Rect, app: &App, theme: &Theme) {
    let line = Line::from(vec![
        Span::styled(" filter ", theme.accent),
        Span::styled(format!("{}▌", app.filter), theme.base),
        Span::styled("   enter/esc apply+close   live, AND-substring", theme.muted),
    ]);
    f.render_widget(
        Paragraph::new(line).style(Style::default().bg(Color::DarkGray)),
        area,
    );
}

fn draw_help(f: &mut Frame, area: Rect, theme: &Theme) {
    let text = vec![
        Line::from(Span::styled(" HELP", theme.accent)),
        Line::from(Span::styled("  space pause   j/k scroll   pgup/pgdn page   g top   G follow tail", theme.base)),
        Line::from(Span::styled("  / or ctrl+f filter   B burst 20k lines (backpressure demo)", theme.base)),
        Line::from(Span::styled("  e simulate disconnect   R reconnect   ? help   q quit", theme.base)),
        Line::from(Span::styled("  esc closes filter/help", theme.muted)),
    ];
    f.render_widget(
        Paragraph::new(text).block(
            Block::default()
                .borders(Borders::TOP)
                .border_style(theme.border)
                .padding(Padding::horizontal(1)),
        ),
        area,
    );
}

fn draw_status_bar(f: &mut Frame, area: Rect, app: &App, theme: &Theme) {
    let status = if app.status.is_empty() {
        if app.filter_mode {
            "filtering".to_string()
        } else {
            "ready".to_string()
        }
    } else {
        app.status.clone()
    };
    let hints = "space pause  j/k scroll  / filter  B burst  e fail  R retry  ? help  q quit";
    let line = Line::from(vec![
        Span::styled(format!(" {status} "), theme.accent),
        Span::styled(" │ ", theme.muted),
        Span::styled(hints, theme.muted),
    ]);
    f.render_widget(
        Paragraph::new(line).style(Style::default().bg(Color::DarkGray)),
        area,
    );
}
