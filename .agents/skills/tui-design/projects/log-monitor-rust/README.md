# log-monitor — Resilient Log Streamer (Ratatui)

A Ratatui log-streaming monitor built to demonstrate the contract in
`references/stability-and-robustness.md`: backpressure with honest drop
accounting, pause/resume, simulated disconnect/retry, guaranteed terminal
restore (including panics), and a minimum-size gate.

The producer is simulated (a few lines per tick, deterministic patterns), so
the app runs anywhere a terminal does.

## Run

```bash
cd projects/log-monitor-rust
RUSTC_WRAPPER="" cargo run     # TUI
RUSTC_WRAPPER="" cargo test    # 14 unit tests: ring, producer, input model
```

> `RUSTC_WRAPPER=""` is only needed if your environment configures sccache.

## What It Demonstrates

| Stability concern | Mechanism | Try it |
|-------------------|-----------|--------|
| Backpressure + drop accounting | Bounded 5,000-line ring; drops are counted and shown in the header | `B` — burst 20,000 lines, watch `dropped` climb while the UI stays responsive |
| Disconnect/retry | Producer failure gate; old logs stay visible behind the banner | `e` fail, `R` reconnect |
| Pause/resume | Tick-gated ingest | `space` |
| Scrollback without unbounded memory | Scroll offset over the capped ring | `j/k`, `pgup/pgdn`, `g` top, `G` follow tail |
| Live filtering that never hijacks keys | Filter input owns the keyboard; `q` types while filtering | `/` or `ctrl+f` |
| Panic-safe terminal restore | `Drop` guard + panic hook restoring before the default printer | run, `ctrl+c`, or induce a panic — shell always survives |
| Minimum size gate | Red message below 50x12 | shrink the terminal |
| Designed empty states | Waiting / no-match messages | filter for gibberish |

## Architecture

```
main.rs    Terminal setup/restore, event loop (never blocks the render path)
app.rs     State + input model (fully unit-tested, no TTY required)
ring.rs    Bounded ring buffer with drop/total accounting
stream.rs  Simulated producer (stand-in for a real tail/socket source)
ui.rs      Stats header, log viewport, filter bar, banners, status bar
```

The test suite exercises exactly the behaviors that break in production:
burst ingestion against the cap (`burst_respects_ring_cap_and_counts_drops`),
scroll clamping at both ends, filter-mode key isolation, and viewport math at
a 3-row terminal.
