# Terminal Compatibility

A TUI runs inside an arbitrary terminal emulator the user chose, possibly
wrapped in tmux/zellij, possibly over SSH. Assume nothing: detect
capability, degrade gracefully, and never require a feature that is not
universal. Load this reference when choosing features (colors, mouse,
hyperlinks, keyboard protocols) or when a TUI misbehaves on a specific
terminal.

---

## 1. The Universal Baseline

Features that work essentially everywhere (xterm-derived, 1980s-2020s):

- 80x24 minimum grid, resize via SIGWINCH (Unix) / window-buffer events (Windows)
- 16 ANSI colors + bold/dim/reverse/underline
- Alternate screen (`\x1b[?1049h`), cursor show/hide/move
- Basic key codes (arrows, Enter, Esc, Tab, Backspace, F1-F12)
- UTF-8 text (with a Unicode font; the *terminal* supports it, the *font* may not)

Everything beyond this list is optional. Design the core experience to work
on the baseline; use the features below as enhancements.

---

## 2. Capability Matrix

Snapshots vary by version — verify before relying on a cell. `✓` broadly
supported, `~` partial/version-dependent, `✗` not supported.

| Feature | Kitty | Ghostty | WezTerm | Alacritty | iTerm2 | Windows Terminal | tmux | zellij |
|---|---|---|---|---|---|---|---|---|
| Truecolor (24-bit) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (3.2+) | ✓ |
| 256 colors | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Kitty keyboard protocol | ✓ | ✓ | ✓ (opt-in) | ✗ | ✗ | ~ | pass-through | ✓ |
| Mouse (SGR 1006) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | via `mouse on` | ✓ |
| Bracketed paste | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | pass-through | ✓ |
| OSC 8 hyperlinks | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | `allow-passthrough` | ✓ (0.30+) |
| OSC 52 clipboard | ✓ | ✓ | ✓ | ✗ | ✓ | ~ | `allow-passthrough` | ~ |
| Synchronized output (2026) | ✓ | ✓ | ✓ | ✗ | ✓ (3.5+) | ✓ (1.22+) | pass-through | ~ |
| Kitty graphics protocol | ✓ | ~ | ~ | ✗ | ✗ (imgcat instead) | ✗ | pass-through | ~ |
| BiDi / RTL text | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | emulator decides | emulator decides |
| Emoji (ZWJ, flags) | ✓ | ✓ | ✓ | ~ | ✓ | ✓ | emulator decides | emulator decides |

Notes:

- **tmux/zellij render nothing themselves** — text is re-rendered by the
  emulator behind them. Color, BiDi, and emoji quality depend on that
  emulator; passthrough controls which escape sequences reach it.
- **OSC 8/52 in tmux** require `set -g allow-passthrough on`.
- **Alacritty** deliberately omits OSC 52 and the kitty keyboard protocol;
  don't make clipboard paste or disambiguation features depend on them.

---

## 3. Feature-Specific Fallbacks

For each optional feature, the graceful-degradation chain:

| Feature | Detection hint | Fallback |
|---|---|---|
| Truecolor | `COLORTERM=truecolor`/`24bit`, `TERM` ends `-direct` | 256 → 16 → mono. Respect `NO_COLOR` |
| Mouse | Try SGR mode; if no `MouseEvent`s arrive, app must remain fully keyboard-operable | Keyboard only; status hint "mouse unsupported" |
| Hyperlinks | No reliable probe; emit OSC 8 anyway | Print the URL as plain text (always do this in fallback mode) |
| Clipboard write | Emit OSC 52 only when emulator known to support it | Show the text and tell the user to copy; `xclip`/`pbcopy` as optional bridge |
| Synchronized output | Wrap frames in `\x1b[?2026h/l` unconditionally | Harmless no-op on terminals without it |
| Kitty keyboard | Probe via `\x1b[?u`; or just parse both legacy and kitty forms | Legacy key parsing loses Shift+Enter and some disambiguation |
| BiDi | Cannot probe; render logical text always | If emulator lacks BiDi, Arabic shows LTR — document this (see `rtl-and-bidi.md`) |
| Alternate screen | Universal baseline — always safe | n/a |

Rules:

- **Never hard-fail on a missing optional feature.** The only hard
  requirements are: a TTY, UTF-8, and the minimum grid size.
- **Emit, don't ask.** Probing the terminal (DA/DECRQM) is slow and
  unreliable across tmux/SSH. Prefer env heuristics and harmless-by-default
  sequences.
- **Feature-detect at startup once**, store a `Capabilities` struct, and
  pass it to rendering. Don't re-detect per frame.

Useful environment variables: `TERM`, `COLORTERM`, `TERM_PROGRAM`,
`VTE_VERSION`, `WT_SESSION`, `KITTY_WINDOW_ID`, `GHOSTTY_RESOURCES_DIR`,
`TMUX`, `ZELLIJ`, `SSH_TTY`, `NO_COLOR`, `CLICOLOR(_FORCE)`.

---

## 4. Keyboard Protocols

Three families exist, and key *identity* differs between them:

1. **Legacy ANSI** — `Esc [ A` = Up, `Esc [ Z` = Shift+Tab, `Esc [ 11~` =
   F1. Ambiguities: `Ctrl+I` = Tab, `Esc` alone is indistinguishable from
   the start of a sequence (needs a timeout), no Shift+Enter.
2. **Kitty keyboard protocol** (`\x1b[>1u` progressive enhancement) —
   disambiguates modifiers, Esc, and release events. Supported by Kitty,
   Ghostty, WezTerm (opt-in), foot, contour; *not* Alacritty/iTerm2.
3. **Windows VT sequences** — largely ANSI-compatible subset handled by
   Windows Terminal and ConHost.

Consequences for the agent:

- Support the legacy forms first; treat kitty protocol as an enhancement
  (Ratatui: `PushKeyboardEnhancementFlags`; Bubble Tea: recent versions
  negotiate it automatically).
- **Never bind**: `Ctrl+C` (SIGINT — users expect quit; catch it, don't
  repurpose) and `Ctrl+Z` (SIGTSTP/suspend). `Ctrl+S`/`Ctrl+Q` are
  XOFF/XON flow control — dead keys unless the app disables flow control
  (termios IXON off, which many editors do to support `Ctrl+S` save);
  don't bind them otherwise.
  `Ctrl+D` is the shell-EOF convention but is safe and common inside a raw-mode
  TUI (scroll-down in vim-style apps) — just don't rely on it outside raw mode.
- `Esc`-prefixed bindings must tolerate the escape-sequence timeout:
  after a lone `Esc`, wait ~50-100ms before acting (frameworks do this).

---

## 5. Mouse, Paste, and Payload Protocols

- **Mouse**: enable SGR encoding (`\x1b[?1006h`) + the motion mode you need
  (`1000` press/release, `1002` drag, `1003` all motion). Always disable on
  exit. Under tmux, `set -g mouse on` is required for events to be
  delivered at all.
- **Bracketed paste** (`\x1b[?2004h`): paste arrives wrapped in
  `\x1b[200~ … \x1b[201~`. Without it, a paste looks like a flood of
  keystrokes — including `q`, `Enter`, and your action keys. Always enable
  it for inputs and treat pasted content as data, never as key events.
- **Resize**: SIGWINCH may fire many times per second during a drag.
  Debounce layout recomputation (~50ms) and re-render fully on the last one.

---

## 6. Defining Your App's Terminal Requirements

Every TUI should state its minimum contract (put this in the README):

```text
Required:  UTF-8 terminal, 80x24 minimum
Enhanced:  truecolor, mouse
Optional:  OSC 8 hyperlinks, synchronized output
Unsupported:  BiDi shaping by the app (rendered by the emulator)
```

And the app must behave when requirements are missing: mono palette,
keyboard-only navigation, plain-text links. See `review-checklist.md`
(Terminal Resilience) and `troubleshooting.md` for when reality diverges.
