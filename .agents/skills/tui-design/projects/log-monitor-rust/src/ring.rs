//! Bounded log buffer with drop accounting.
//!
//! A stream producer can outrun the renderer at any moment; the buffer's
//! contract is: never block, never grow unbounded, and *count what you drop*
//! so the UI can surface it honestly.

use std::collections::VecDeque;

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Level {
    Info,
    Warn,
    Error,
}

#[derive(Clone, Debug)]
pub struct LogLine {
    pub level: Level,
    pub ts: String,
    pub msg: String,
}

pub struct Ring {
    cap: usize,
    items: VecDeque<LogLine>,
    dropped: u64,
    total: u64,
}

impl Ring {
    pub fn new(cap: usize) -> Self {
        Self {
            cap: cap.max(1),
            items: VecDeque::new(),
            dropped: 0,
            total: 0,
        }
    }

    /// Push a line. Returns true if an older line was evicted (dropped).
    pub fn push(&mut self, line: LogLine) -> bool {
        self.total += 1;
        if self.items.len() == self.cap {
            self.items.pop_front();
            self.dropped += 1;
            self.items.push_back(line);
            true
        } else {
            self.items.push_back(line);
            false
        }
    }

    pub fn len(&self) -> usize {
        self.items.len()
    }

    pub fn dropped(&self) -> u64 {
        self.dropped
    }

    pub fn total(&self) -> u64 {
        self.total
    }

    pub fn cap(&self) -> usize {
        self.cap
    }

    /// Snapshot of lines matching a case-insensitive substring filter.
    /// An empty filter matches everything.
    pub fn filtered(&self, filter: &str) -> Vec<&LogLine> {
        let needle = filter.to_lowercase();
        self.items
            .iter()
            .filter(|l| {
                needle.is_empty() || l.msg.to_lowercase().contains(&needle) || format!("{:?}", l.level).to_lowercase().contains(&needle)
            })
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn line(msg: &str) -> LogLine {
        LogLine {
            level: Level::Info,
            ts: "12:00:00".into(),
            msg: msg.into(),
        }
    }

    #[test]
    fn evicts_oldest_and_counts_drops() {
        let mut r = Ring::new(3);
        for i in 0..5 {
            r.push(line(&format!("m{i}")));
        }
        assert_eq!(r.len(), 3);
        assert_eq!(r.total(), 5);
        assert_eq!(r.dropped(), 2);
        let names: Vec<&str> = r.filtered("").iter().map(|l| l.msg.as_str()).collect();
        assert_eq!(names, vec!["m2", "m3", "m4"]);
    }

    #[test]
    fn empty_filter_matches_all() {
        let mut r = Ring::new(10);
        r.push(line("alpha"));
        r.push(line("beta"));
        assert_eq!(r.filtered("").len(), 2);
    }

    #[test]
    fn filter_is_case_insensitive_substring() {
        let mut r = Ring::new(10);
        r.push(line("Request served"));
        r.push(line("cache miss"));
        assert_eq!(r.filtered("request").len(), 1);
        assert_eq!(r.filtered("MISS").len(), 1);
        assert_eq!(r.filtered("zzz").len(), 0);
    }

    #[test]
    fn filter_matches_level_name() {
        let mut r = Ring::new(10);
        let mut err = line("boom");
        err.level = Level::Error;
        r.push(line("fine"));
        r.push(err);
        assert_eq!(r.filtered("error").len(), 1);
    }

    #[test]
    fn zero_capacity_is_clamped_to_one() {
        let mut r = Ring::new(0);
        assert_eq!(r.cap(), 1);
        r.push(line("a"));
        r.push(line("b"));
        assert_eq!(r.len(), 1);
        assert_eq!(r.dropped(), 1);
    }
}
