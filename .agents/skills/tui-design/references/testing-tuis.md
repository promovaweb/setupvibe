# Testing TUIs

Testing is a first-class requirement, not a nice-to-have. A TUI is mostly
pure functions (state → state, state → frame) — that is the most testable
code there is, and it needs no TTY to verify. The example projects in this
skill (`projects/dbview-go`, `projects/log-monitor-rust`) prove the
contract: logic + render smoke tests that run headless in CI.

---

## 1. Test Layers

```text
Unit           state transitions, event→action, layout math, wrapping, width
Snapshot       input → state → render → expected frame (golden)
Interaction    key sequences → deterministic state/frame transitions
Unicode        width/truncation/RTL cases (always, not just "if localized")
```

All four run headless. Only exploratory/manual checks need a real terminal.

---

## 2. Unit Tests

Test the pure core. If a function needs a terminal to be tested, it is
probably mixing concerns (see `architecture-patterns.md`).

Targets:

- **State transitions** — `update(state, action) == expected_state`
  (select, move, sort, paginate, filter).
- **Event handling** — `action_from_key("j") == Some(Down)`, including
  modifiers, unknown keys, and `ctrl+c` → quit.
- **Layout math** — `split(120, 30) == rects`, column widths at several
  sizes including below minimum.
- **Wrapping** — a word-wrap function's output for ASCII, CJK, and emoji.
- **Display width** — the cases in `unicode-and-text.md` §5.

Example (Ratatui app state, the pattern the log-monitor project uses):

```rust
#[test]
fn down_arrow_clamps_at_end() {
    let mut app = App::with_items(3);
    app.selected = 2;
    app.handle_action(Action::Down);
    assert_eq!(app.selected, 2);
}
```

---

## 3. Snapshot / Golden Tests

Render a deterministic frame from a deterministic state and compare to a
stored golden. Deterministic means: fixed dimensions, no timestamps (inject
a clock), no network, no randomness.

```text
input ──► state ──► render ──► expected frame
```

Per framework:

- **Ratatui** — `TestBackend` is the reference implementation of this:
  render into an in-memory buffer, assert per-cell or compare buffers.

  ```rust
  let backend = TestBackend::new(80, 24);
  let mut terminal = Terminal::new(backend).unwrap();
  terminal.draw(|f| ui::draw(f, &app)).unwrap();
  terminal.backend().assert_buffer(&expected);
  ```

- **Bubble Tea** — `View()` returns a plain string; save golden files and
  diff them. Style codes are part of the string — either strip ANSI for
  layout-only snapshots or keep them for full fidelity (they are stable,
  so either works). `gotest.tools/v3/golden` makes this a one-liner:

  ```go
  golden.Assert(t, m.View())
  ```

- **Textual** — `pytest-textual-snapshot` provides `snap_compare` for
  widget/app snapshots on top of `run_test()`.

- **Ink** — `ink-testing-library` renders to a string; strip ANSI
  (`strip-ansi` package) for layout assertions.

When layout intentionally changes, update the golden file — never weaken
the test to keep the pipeline green.

---

## 4. Interaction Tests

Simulate key sequences and assert deterministic outcomes:

```text
Down
Down
Enter
```

- **Textual** (best in class): `async with app.run_test() as pilot:
  await pilot.press("down", "down", "enter")`, then assert screen/widget
  state and focus.
- **Bubble Tea**: feed `tea.KeyMsg` into `Update` directly —
  `m, _ = m.Update(tea.KeyMsg{Type: tea.KeyDown})` — assert state after a
  scripted sequence.
- **Ratatui**: call `handle_action`/`handle_key` with synthetic
  `KeyEvent`s, then render to `TestBackend` and assert the buffer.
- **Ink**: drive `useInput` by writing to the app's stdin through
  `ink-testing-library`'s `stdin` helper.

Cover at minimum: full navigation loop (first ↔ last item), quit from
every screen, modal open/confirm/cancel, and one paste event.

---

## 5. Unicode Tests

Explicit cases, regardless of whether the app "targets" other languages —
user data will contain all of this eventually:

```text
Arabic          width("مرحبا") == 5, text round-trips unchanged
RTL/LTR mix     width("Hello مرحبا") == 11
Emoji           width("👨‍💻") == 2, truncation never splits the cluster
CJK             width("中文") == 4, column alignment holds
Combining       width("é") == 1, no dangling marks after truncation
Flags           width("🇮🇶") == 2
```

And the RTL rules from `rtl-and-bidi.md` §5 (no reversal, no
transcription).

---

## 6. Running the Tests

- **No TTY required** — CI runs them plain. If a test needs a pty, it is
  an integration test; keep those separate and optional.
- **Determinism** — fixed terminal size, injected time source, seeded
  RNG, no real network. This is what makes golden files stable.
- **The example projects in this repo** wire this end-to-end:
  `projects/dbview-go` (Go: `go test ./...`) and
  `projects/log-monitor-rust` (Rust: `cargo test`).

Do not claim a TUI is complete — or that a change didn't break layout —
without running these tests. Verification is part of the task, not an
optional follow-up (see the Verification Checklist in `SKILL.md`).
