//! Application state and input handling.

use crate::ring::{Level, LogLine, Ring};
use crate::stream::Producer;
use crossterm::event::{KeyCode, KeyEvent, KeyModifiers};

pub const RING_CAP: usize = 5_000;
pub const BURST_SIZE: usize = 20_000;

pub struct App {
    pub ring: Ring,
    pub producer: Producer,
    pub paused: bool,
    /// Lines scrolled back from the tail. 0 = follow tail.
    pub scroll: usize,
    pub filter_mode: bool,
    pub filter: String,
    pub show_help: bool,
    pub width: u16,
    pub height: u16,
    pub should_quit: bool,
    pub status: String,
}

impl App {
    pub fn new() -> Self {
        Self {
            ring: Ring::new(RING_CAP),
            producer: Producer::new(),
            paused: false,
            scroll: 0,
            filter_mode: false,
            filter: String::new(),
            show_help: false,
            width: 0,
            height: 0,
            should_quit: false,
            status: String::new(),
        }
    }

    /// Ingest a batch; new lines reset the follow-tail offset unless the
    /// user is scrolled back reviewing history.
    pub fn ingest(&mut self, lines: Vec<LogLine>) {
        if self.producer.failed || lines.is_empty() {
            return;
        }
        for line in lines {
            self.ring.push(line);
        }
        if self.scroll > 0 {
            // Keep the user's position while scrolled back.
            self.scroll = self.scroll.saturating_add(0);
        }
    }

    pub fn tick(&mut self) {
        if !self.paused && !self.producer.failed {
            let batch = self.producer.generate(3);
            self.ingest(batch);
        }
    }

    pub fn visible(&self) -> Vec<&LogLine> {
        self.ring.filtered(&self.filter)
    }

    pub fn handle_key(&mut self, key: KeyEvent) {
        // Filter input owns the keyboard while active — typing must never
        // trigger actions (this is why 'q' while filtering doesn't quit).
        if self.filter_mode {
            match key.code {
                KeyCode::Esc => {
                    self.filter_mode = false;
                    self.filter.clear();
                }
                KeyCode::Enter => self.filter_mode = false,
                KeyCode::Backspace => {
                    self.filter.pop();
                }
                KeyCode::Char(c) => {
                    self.filter.push(c);
                    self.scroll = 0; // new filter -> follow tail of matches
                }
                _ => {}
            }
            return;
        }

        let ctrl = key.modifiers.contains(KeyModifiers::CONTROL);
        match key.code {
            KeyCode::Char('c') if ctrl => self.should_quit = true,
            KeyCode::Char('q') => self.should_quit = true,
            KeyCode::Char(' ') => {
                self.paused = !self.paused;
                self.status = if self.paused { "paused" } else { "streaming" }.into();
            }
            KeyCode::Char('f') if ctrl => {
                self.filter_mode = true;
            }
            KeyCode::Char('/') => {
                self.filter_mode = true;
            }
            KeyCode::Char('j') | KeyCode::Down => {
                self.scroll = self.scroll.saturating_sub(1);
            }
            KeyCode::Char('k') | KeyCode::Up => {
                self.scroll = self.scroll.saturating_add(1).min(self.max_scroll());
            }
            KeyCode::PageUp => {
                let page = self.viewport_rows().max(1) as usize;
                self.scroll = self.scroll.saturating_add(page).min(self.max_scroll());
            }
            KeyCode::PageDown => {
                let page = self.viewport_rows().max(1) as usize;
                self.scroll = self.scroll.saturating_sub(page);
            }
            KeyCode::Char('G') => self.scroll = 0,
            KeyCode::Char('g') => self.scroll = self.max_scroll(),
            KeyCode::Char('B') => {
                let burst = self.producer.burst(BURST_SIZE);
                self.ingest(burst);
                self.status = format!("burst ingested (dropped total: {})", self.ring.dropped());
            }
            KeyCode::Char('e') => {
                self.producer.fail();
                self.status = "producer disconnected (simulated)".into();
            }
            KeyCode::Char('R') => {
                self.producer.retry();
                self.status = "producer reconnected".into();
            }
            KeyCode::Char('?') => self.show_help = !self.show_help,
            _ => {}
        }
    }

    fn max_scroll(&self) -> usize {
        let n = self.visible().len();
        let rows = self.viewport_rows().max(1) as usize;
        n.saturating_sub(rows)
    }

    pub fn viewport_rows(&self) -> u16 {
        // stats(1) + sep(1) + banner(0..1) + status(1) margins
        let chrome = 4 + u16::from(self.producer.failed || self.show_help);
        self.height.saturating_sub(chrome)
    }

    pub fn resize(&mut self, w: u16, h: u16) {
        self.width = w;
        self.height = h;
    }

    pub fn error_count(&self) -> usize {
        self.ring
            .filtered("")
            .iter()
            .filter(|l| l.level == Level::Error)
            .count()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn key(code: KeyCode) -> KeyEvent {
        KeyEvent::from(code)
    }

    fn app_with(n: usize) -> App {
        let mut app = App::new();
        app.width = 100;
        app.height = 30;
        let mut p = Producer::new();
        app.ingest(p.generate(n));
        app
    }

    #[test]
    fn pause_blocks_ingest() {
        let mut app = app_with(0);
        app.paused = true;
        app.tick();
        assert_eq!(app.ring.len(), 0);
        app.paused = false;
        app.tick();
        assert_eq!(app.ring.len(), 3);
    }

    #[test]
    fn failed_producer_blocks_ingest() {
        let mut app = app_with(0);
        app.producer.fail();
        app.tick();
        assert_eq!(app.ring.len(), 0);
        app.producer.retry();
        app.tick();
        assert_eq!(app.ring.len(), 3);
    }

    #[test]
    fn burst_respects_ring_cap_and_counts_drops() {
        let mut app = app_with(0);
        let burst = app.producer.burst(BURST_SIZE);
        app.ingest(burst);
        assert_eq!(app.ring.len(), RING_CAP);
        assert_eq!(app.ring.dropped() as usize, BURST_SIZE - RING_CAP);
    }

    #[test]
    fn scroll_clamps_at_both_ends() {
        let mut app = app_with(500);
        for _ in 0..1000 {
            app.handle_key(key(KeyCode::Up));
        }
        assert!(app.scroll <= app.max_scroll());
        for _ in 0..2000 {
            app.handle_key(key(KeyCode::Down));
        }
        assert_eq!(app.scroll, 0);
    }

    #[test]
    fn follow_tail_resets_on_filter_typing() {
        let mut app = app_with(100);
        app.handle_key(key(KeyCode::Up));
        app.handle_key(key(KeyCode::Up));
        assert!(app.scroll > 0);
        app.filter_mode = true;
        app.handle_key(key(KeyCode::Char('e')));
        assert_eq!(app.scroll, 0);
        // Typing 'e' while filtering must not quit or pause.
        assert!(!app.should_quit);
        assert!(!app.paused);
    }

    #[test]
    fn q_quits_but_only_outside_filter_mode() {
        let mut app = app_with(10);
        app.handle_key(key(KeyCode::Char('q')));
        assert!(app.should_quit);

        let mut app = app_with(10);
        app.filter_mode = true;
        app.handle_key(key(KeyCode::Char('q')));
        assert!(!app.should_quit);
        assert_eq!(app.filter, "q");
    }

    #[test]
    fn resize_updates_viewport() {
        let mut app = App::new();
        app.resize(80, 24);
        assert!(app.viewport_rows() >= 1);
        app.resize(80, 3); // tiny terminal must not panic
        assert_eq!(app.viewport_rows(), 0);
        app.handle_key(key(KeyCode::Up)); // scroll math on empty viewport
    }
}
