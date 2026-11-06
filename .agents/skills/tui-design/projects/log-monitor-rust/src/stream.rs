//! Simulated log producer.
//!
//! A real monitor tails a file, socket, or `k logs -f`; this generator stands
//! in for that source so the app runs anywhere. `burst()` simulates a
//! producer stampede so backpressure/drop behavior can be observed live.

use crate::ring::{Level, LogLine};
use std::time::{SystemTime, UNIX_EPOCH};

pub struct Producer {
    seq: u64,
    /// Set to simulate a producer disconnect; `retry()` reconnects.
    pub failed: bool,
}

impl Producer {
    pub fn new() -> Self {
        Self { seq: 0, failed: false }
    }

    /// Generate `n` lines with a realistic level distribution.
    pub fn generate(&mut self, n: usize) -> Vec<LogLine> {
        (0..n)
            .map(|_| {
                self.seq += 1;
                let roll = self.seq % 17;
                let level = if roll == 0 {
                    Level::Error
                } else if roll % 5 == 0 {
                    Level::Warn
                } else {
                    Level::Info
                };
                LogLine {
                    level,
                    ts: self.timestamp(),
                    msg: self.message(level).to_string(),
                }
            })
            .collect()
    }

    /// A producer stampede: far more lines than the viewport or ring.
    pub fn burst(&mut self, n: usize) -> Vec<LogLine> {
        self.generate(n)
    }

    pub fn fail(&mut self) {
        self.failed = true;
    }

    pub fn retry(&mut self) {
        self.failed = false;
        self.seq = self.seq.next_power_of_two(); // resume with a gap, like a real reconnect
    }

    fn message(&self, level: Level) -> &'static str {
        match (level, self.seq % 7) {
            (Level::Error, _) => "connection reset by peer",
            (Level::Warn, 1) => "disk usage 91%",
            (Level::Warn, _) => "slow query: 1.4s",
            (_, 2) => "cache miss key=user:1042",
            (_, 3) => "request served in 42ms",
            (_, 4) => "gc pause 18ms",
            (_, 5) => "health check ok",
            _ => "request served in 17ms",
        }
    }

    fn timestamp(&self) -> String {
        let secs = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);
        format!(
            "{:02}:{:02}:{:02}",
            (secs / 3600) % 24,
            (secs / 60) % 60,
            secs % 60
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generate_produces_requested_count() {
        let mut p = Producer::new();
        assert_eq!(p.generate(10).len(), 10);
    }

    #[test]
    fn failure_gate_and_retry() {
        let mut p = Producer::new();
        p.fail();
        assert!(p.failed);
        p.retry();
        assert!(!p.failed);
    }
}
