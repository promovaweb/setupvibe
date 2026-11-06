//! log-monitor — a resilient Ratatui log streamer.
//!
//! Demonstrates the stability contract from
//! `references/stability-and-robustness.md`: guaranteed terminal restore
//! (Drop + panic hook), backpressure with drop accounting, pause/resume,
//! disconnect/retry, and a minimum-size gate.
//!
//! Run: cargo run

mod app;
mod ring;
mod stream;
mod ui;

use app::App;
use crossterm::event;
use std::io;
use std::time::Duration;

type Tui = ratatui::Terminal<ratatui::backend::CrosstermBackend<io::Stdout>>;

fn main() -> io::Result<()> {
    // Crash safety: a panic in fullscreen leaves the user's shell broken
    // (no echo, no cursor). Restore the terminal *before* the default
    // panic printer runs.
    let default_hook = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        let _ = restore_terminal();
        default_hook(info);
    }));

    let mut terminal = init_terminal()?;
    let mut app = App::new();

    // Startup is the first resize fact: query the size up front instead of
    // waiting for a Resize event that may never come.
    let (w, h) = crossterm::terminal::size()?;
    app.resize(w, h);

    loop {
        terminal.draw(|f| ui::draw(f, &app))?;

        // Tick: the simulated producer emits a small batch per interval.
        // A real monitor would read from a bounded channel here; the loop
        // stays non-blocking either way.
        if event::poll(Duration::from_millis(100))? {
            match event::read()? {
                event::Event::Key(key) => app.handle_key(key),
                event::Event::Resize(w, h) => app.resize(w, h),
                _ => {}
            }
        }
        app.tick();

        if app.should_quit {
            break;
        }
    }

    restore_terminal()?;
    Ok(())
}

fn init_terminal() -> io::Result<Tui> {
    crossterm::terminal::enable_raw_mode()?;
    crossterm::execute!(
        io::stdout(),
        crossterm::terminal::EnterAlternateScreen,
        crossterm::event::EnableMouseCapture
    )?;
    let backend = ratatui::backend::CrosstermBackend::new(io::stdout());
    ratatui::Terminal::new(backend)
}

fn restore_terminal() -> io::Result<()> {
    crossterm::execute!(
        io::stdout(),
        crossterm::event::DisableMouseCapture,
        crossterm::terminal::LeaveAlternateScreen
    )?;
    crossterm::terminal::disable_raw_mode()?;
    Ok(())
}
