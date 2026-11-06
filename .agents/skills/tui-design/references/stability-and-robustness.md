# Stability and Robustness

How TUI applications survive bad terminals, slow data, panics, and their own
complexity. A beautiful TUI that crashes on resize or wedges on a slow query
is a failed TUI. Load this reference when reviewing for production readiness,
when the app talks to networks/databases/files, or when the user asks about
crashes, freezes, flicker, or resize behavior.

---

## 1. The Terminal Is an Adversary

Assume nothing about the terminal you are drawn into:

- **Minimum size gate.** Define `minWidth x minHeight` per app (data tables
  need more than menus). Below it, render a one-line polite message
  (`Resize to at least 80x24`) instead of a broken frame. Re-check on every
  `WindowSizeMsg`.
- **Resize is an event, not a startup fact.** Store width/height in the model
  and derive *all* layout — column widths, page size, pane splits — from it.
  Zero layout constants may survive a resize untouched.
- **`TERM=dumb` and no-color environments.** Detect missing color support and
  drop to mono emphasis (bold/reverse) instead of producing garbage escape
  sequences. Lip Gloss handles most of this; verify your custom styles do too.
- **Slow or noisy scrollback.** Full-screen alt-screen apps must always
  restore the terminal on exit — even on panic (see §3). Inline-rendered apps
  must render a *fixed number of lines* or they will pollute scrollback.
- **Unknown byte sequences.** Never parse raw input with panicking indexing.
  Multi-byte key events and pasted text arrive as rune slices; treat input as
  UTF-8 end to end. Bracketed paste can deliver 100KB in one event — see §5.

---

## 2. Async Safety: The App Never Blocks the Render Loop

Every framework splits into an event loop plus a render path. The render path
must never wait on I/O. Rules, in order of how often they are violated:

1. **All I/O is a command/task/future**, never a call inside the update or
   draw function. In Bubble Tea: `tea.Cmd` → `tea.Msg`. In Ratatui: a worker
   thread + channel. In Textual: `run_worker` / async actions. In Ink: hooks
   with effects.
2. **One in-flight request per resource.** Rapid `r` reloads must not stack
   three queries racing to mutate the same state. Track an in-flight flag or
   generation counter; stale responses (older generation) are discarded on
   arrival.
3. **Every request has a timeout** and a rendering for it: spinner → success,
   spinner → error banner with the timeout named. A request without a timeout
   is a future freeze.
4. **Debounce live inputs.** Search-as-you-type over a database should fire
   at most every 100-300ms, not per keystroke. Filter locally first; debounce
   the remote round-trip.
5. **Cancellation on navigation.** Leaving a view cancels its pending loads.
   Arriving data for an abandoned view must be dropped, not rendered.
6. **Backpressure for streams.** A log tail or event feed pushes faster than
   you render. Use a bounded channel and *count what you drop* — a status-bar
   `dropped 1,204` line is honest; silently lagging 30 seconds behind is not.

---

## 3. Crash and Panic Recovery

A panic inside fullscreen mode leaves the user's shell broken (no echo, no
cursor). The exit path must be bulletproof:

- **Restore terminal state in all paths** — normal exit, error exit, and
  panic. Most frameworks do this in `Run()`'s defer; if you manage the
  terminal yourself (Ratatui), wrap the whole loop:
  `let res = run_app(&mut terminal, app); terminal::restore(); res?;`
- **Install a panic hook** that restores the terminal *before* the default
  panic printer, so the panic message lands in a usable shell. In Go:
  `defer func() { if r := recover(); r != nil { fmt.Print("\x1b[?1049l"); panic(r) } }()`
  In Rust: a `std::panic::set_hook` that calls `terminal::restore()`.
- **Panics are bugs; errors are states.** A missing file, failed connection,
  or bad query must surface as a designed error state (banner + retry hint),
  never as a crash. Reserve panic for genuinely impossible invariants.
- **Fail closed on startup.** If required resources are missing, print a
  clean one-line error to stderr and exit non-zero *before* entering
  fullscreen — not after painting a UI that can't work.
- **Save state before risky operations** (§6), so a crash during a mutation
  does not lose the user's position or in-progress input.

---

## 4. Error States That Keep the App Alive

| Failure | Wrong behavior | Right behavior |
|---------|----------------|----------------|
| Query fails | Blank table, app stuck | Keep old rows; red toast/banner with the error; `r` retries |
| Connection drops | Crash or infinite spinner | Status dot → red `Disconnected`; auto-retry with backoff (1s→2s→4s…cap 30s); reconnect restores state |
| One row is malformed | Whole table fails to render | Render the row with a `?` placeholder; count `3 unreadable rows` |
| Timeout | Silent hang | Cancel, banner with timeout value, view stays interactive |
| Partial export | Quiet truncation | `Exported 9,800 of 10,000 rows (limit hit)` in status bar |

Rules:

- Errors are **transient overlays or status-bar messages**, never view
  replacements. The user's position, filters, and cursor survive every error.
- Give every error a **next action**: `r: retry  esc: dismiss`. An error the
  user can't act on is a dead end.
- Rate-limit repeated error toasts; collapsing identical consecutive errors
  into one with a count (`x12`) prevents a red strobe during an outage.
- Auto-retry must be visible (status shows `retrying in 4s`) and bounded —
  after N failures stop and let the user decide.

---

## 5. Input and Payload Extremes

- **Flood-proof keymaps.** Holding `j` generates dozens of events per second;
  each must be a cheap bounds-checked move, and rendering coalesces (the
  framework's render loop does this — don't force a render per key event).
- **Paste safety.** Pasting into a single-line input: strip newlines, cap
  length visibly (status shows `truncated to 200 chars`), never let paste
  trigger action keys.
- **Giant cells and lines.** A 1MB cell or a 500k-char log line must be
  truncated for display (with `…`) and never laid out whole — that is a
  freeze users can trigger with one bad row.
- **Empty is normal, missing is not.** `null` vs `""` vs absent column each
  render distinctly (`∅`, blank, `—`) so users can tell broken data from
  empty data.

---

## 6. State Persistence and Graceful Exit

- **Persist user state** (last view, cursor, sort, filters, theme, history)
  to a cache/config dir on exit and on significant transitions — not only on
  clean exit, since crashes happen. Write to a temp file + atomic rename so a
  crash mid-write can't corrupt config.
- **Quit is instant and always available.** `q` and `ctrl+c` work from every
  view, including modals and inputs. If a long operation must finish before
  quit, show `saving…` and finish it — never ignore the quit key.
- **Second `ctrl+c` force-quits** (dbview convention): the first may be
  swallowed by a confirm modal, so double-press as an escape hatch.
- On restart, offer to restore context (`restored filters: 2 terms — esc to
  clear`) instead of silently dropping or silently applying it.

---

## 7. Rendering Stability

- **No flicker:** draw the whole frame into a buffer, then flush once per
  frame (Ratatui's model; Bubble Tea and Textual do this internally). Never
  `println!` from inside a fullscreen loop.
- **Don't render more than the viewport.** Emitting 10k lines into a
  50-line viewport wastes CPU and can exceed the terminal's buffer.
- **Debounce resize redraws** if your app is expensive to layout — sizes
  can change many times per second during a drag.
- **Test with a slow producer:** pipe data at 10x your render rate for a
  minute. The correct outcome is dropped-count increments and a responsive
  UI, not a growing queue.

---

## 8. Verification Checklist

Stability is testable. Before calling a TUI production-ready:

- [ ] Resize from 200x60 to 40x10 and back — no broken layout, no panic
- [ ] `TERM=dumb` run — mono, usable, exits cleanly
- [ ] Kill the network/DB mid-query — banner + retry, UI responsive
- [ ] Hold a navigation key for 5s — no freeze, no unbounded memory
- [ ] Paste 100KB into every input — no crash, visible truncation
- [ ] `ctrl+c` during a modal — app exits, terminal restored
- [ ] Trigger the error path (bad file/bad query) — old state intact
- [ ] Run under a 16-color terminal — palette degrades, no unreadable pairs
- [ ] Kill the process mid-write — config/history files uncorrupted
