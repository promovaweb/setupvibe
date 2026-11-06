# Framework Selection

How to pick a TUI framework for a project. No framework is universally
better — each makes a different trade. Select on project requirements, not
fashion. Load this reference before recommending a framework for a new or
existing project.

---

## 1. The Four Candidates

| | Bubble Tea (Go) | Textual (Python) | Ratatui (Rust) | Ink (TypeScript) |
|---|---|---|---|---|
| Rendering model | Immediate-mode strings (Elm Architecture) | Retained widget tree + CSS | Immediate-mode frame buffer, diffed | React reconciler + flexbox (Yoga) |
| Ecosystem | Large (Charmbracelet: Bubbles, Lip Gloss, Huh, Glamour) | Large (Textualize: widgets, CSS, dev tools) | Growing (Ratatui org: ratatui-widgets, tui-* crates) | Large via npm, but TUI-specific libs thin |
| Performance | Good for typical apps; full string rebuild per update | Good; incremental widget updates | Excellent; only diffs changed cells | OK for small apps; degrades with high-frequency updates |
| Async support | Solid (`tea.Cmd` + goroutines) | Excellent (asyncio native, workers, threads) | Manual (tokio task + channel) | React effects + promises |
| Unicode width | Good (Lip Gloss uses `uniseg`) | Good (Rich/wcwidth-based) | Good (`unicode-width` crate) | Good (`string-width` package) |
| RTL/BiDi | Not supported (logical order, LTR grid) | Not supported | Not supported | Not supported |
| Testing | Pure Update + golden View strings; `teatest` for end-to-end | `run_test()` pilot + snapshot plugin — best in class | `TestBackend` buffer assertions — excellent | `ink-testing-library`; smaller surface |
| Maturity | Mature, very active | Mature, very active | Mature, very active | Mature (v5), maintained |
| Terminal compatibility | Alt screen, mouse, bracketed paste, kitty keyboard protocol (recent versions) | Broad; requires UTF-8 terminal; Windows supported | Via Crossterm: broadest backend coverage, kitty keyboard protocol | No alt screen by default; no built-in mouse; depends on stdout/readline |
| Distribution | Single static binary | Python runtime + venv | Single binary, static cross-compile | Node runtime + deps |

Framework-agnostic facts that affect every choice:

- None of the four implements BiDi layout. Arabic/RTL text renders in
  logical order; the terminal emulator may reorder it visually (see
  `rtl-and-bidi.md`). Do not pick a framework expecting it to "fix" RTL.
- All four support Unicode strings; the differences are in display-width
  helpers and which one is already pulled in (see `unicode-and-text.md`).

---

## 2. Decision Rules

Ask in order:

1. **Language constraint** — If the team/project is already Rust, Go,
   Python, or TypeScript, that dominates. Rewriting a codebase to use a
   "better" framework is rarely worth it.
2. **Deployment target** — Single binary for arbitrary servers: Go or Rust.
   Pip/venv acceptable: Python. npm bundle acceptable: TypeScript.
3. **Interaction depth** — High interactivity (widgets, focus rings, modals,
   forms): Textual or Ink (retained models handle this ergonomically).
   Render-mostly dashboards/monitors: Ratatui or Bubble Tea.
4. **Update frequency** — Sub-100ms streams, millions of rows: Ratatui
   (diffing + zero-copy buffers). Occasional updates: any.
5. **Team fluency** — Fastest to correct: the framework closest to patterns
   the team already knows (Elm/React/HTML-CSS/plain loops).
6. **Test investment** — If the TUI must have strong automated tests,
   Textual and Ratatui have the most deterministic harnesses.

### Choose-when summary

- **Bubble Tea** — DevOps/CLI tools, installers, anything Charmbracelet
  already solves (huh forms, glamour markdown). Single-binary Go deployment.
  Avoid when you need retained widgets with fine-grained focus management.
- **Textual** — Dashboards, admin panels, data tools needing rich widgets,
  CSS theming, or the best interaction-test story. Avoid when a Python
  runtime per machine is a burden or startup time matters.
- **Ratatui** — Long-running monitors, very large tables, high-frequency
  updates, teams that want maximum control and can afford more code. Avoid
  when iteration speed matters more than performance.
- **Ink** — JS-native developer tools, onboarding flows, CLIs that need
  React's composition and the npm ecosystem. Avoid for full-screen
  mouse-driven or very high-frequency apps (no built-in alt screen/mouse;
  `fullscreen-ink` fills some gaps).

### When not to use a TUI at all

- Scripted/non-interactive use → plain CLI (see `SKILL.md`, CLI/TUI
  Integration).
- Output consumed by other programs → stdout text, not a fullscreen app.
- Non-TTY context (CI, cron, `| less`) → detect `!isatty(stdout)` and fall
  back to plain output or exit with a clear message.

---

## 3. Feature Matrix Details

### Rendering model consequences

- **Immediate-mode** (Bubble Tea, Ratatui): render the whole frame from
  state every tick. Simple mental model, trivially deterministic — snapshot
  tests are easy. Cost: full rebuild each frame (Ratatui diffs it away;
  Bubble Tea stringifies everything).
- **Retained-mode** (Textual, Ink): the framework keeps a component tree and
  patches changes. Complex interactivity (focus rings, animations,
  internal state) is easier; full-frame snapshots are harder.

### Performance expectations (order of magnitude, measured where it matters)

- Ratatui redraws 10k-cell frames at hundreds of FPS; diffing makes
  unchanged cells free.
- Textual handles typical app updates smoothly; very high-frequency streams
  should be throttled in app code.
- Bubble Tea is fine up to typical dashboard scale; huge tables should use
  viewport-based components, not whole-list string building.
- Ink re-renders the React tree per update; cap update frequency (see
  `stability-and-robustness.md` §7).

### Terminal compatibility

- Ratatui + Crossterm abstracts the terminal best (terminfo, mouse
  protocols, kitty keyboard protocol with `PushKeyboardEnhancementFlags`).
- Bubble Tea covers alt screen/mouse/paste internally; kitty keyboard
  protocol supported in recent releases.
- Textual runs on all major emulators and Windows; requires a UTF-8-aware
  terminal.
- Ink writes to stdout; alt screen and resize are opt-in
  (`fullscreen-ink`), mouse is not built in.

---

## 4. What to Record When Choosing

When you select a framework for the user, state:

1. The chosen framework and the **2-3 requirements that decided it**.
2. The runner-up and why it lost.
3. Known limitations of the choice that will hit *this* project
   (e.g. "no BiDi", "Python runtime required", "no built-in mouse").

This forces a decision grounded in requirements rather than familiarity.
