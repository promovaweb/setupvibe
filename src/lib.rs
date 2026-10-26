//! Núcleo compartilhado pelas interfaces do SetupVibe 2.

pub mod adapters;
pub mod catalog;
pub mod domain;
pub mod error;
pub mod executor;
pub mod output;
pub mod planner;
pub mod process;
pub mod state;

/// Versão canônica do executável, definida no manifesto Cargo.
pub const VERSION: &str = env!("CARGO_PKG_VERSION");

pub mod vendor;

pub mod docker;
pub mod services;

pub mod engine;
pub mod swarm;

pub mod swarm_services;

pub mod collector;
pub mod metrics;
pub mod supervisor;
pub mod tailscale;
pub mod tui;
