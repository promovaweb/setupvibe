# Troubleshooting

When a TUI misbehaves, attribute the problem before fixing it. The blame
ladder is:

```text
application ──► TUI framework ──► terminal protocol ──► terminal emulator ──► font/rendering
```

Each layer is isolated with a different check. Fixing the wrong layer
(e.g. adding workaround code for an emulator bug) creates double bugs.

---

## 1. Isolating the Layer

| To test | Command / check | What it proves |
|---|---|---|
| Application logic | Run the unit/state tests (`testing-tuis.md`) | Logic correct without any terminal |
| Framework output | Dump what the framework writes: `./app > out.bin 2>&1; xxd out.bin` — look for the expected escape sequences | Framework emits what you think |
| Terminal protocol | Run the app under `script`/`unbuffer` or pipe output to a file and `cat` it later | Protocol bytes well-formed |
| Terminal emulator | Same app in a *different* emulator (e.g. from kitty to xterm) | Bug travels with emulator or app |
| Font/rendering | Open a static string with the suspicious glyphs (`printf 'مرحبا 中文 👨‍💻\n'`) in the emulator | Font coverage vs app bug |
| Raw-mode damage | `reset` (or `stty sane; printf '\e[?1049l\e[0m'`) fixes the shell | Terminal state was left dirty |

Heuristics: if it reproduces in every emulator, it is the app or framework.
If only one emulator, it is the emulator. If the bytes are right but the
screen is wrong, it is the emulator/font.

---

## 2. Symptom Table

### Broken Unicode (�, tofu, garbage)

- **Check order**: locale/encoding of the source file and terminal
  (`locale` shows `LC_ALL`/`LANG` must be UTF-8; `locale -a`) → terminal's
  UTF-8 mode (modern emulators are always UTF-8; over SSH an old locale
  may downgrade it) → font coverage.
- **App-side cause**: decoding bytes with the wrong charset, or slicing
  UTF-8 by byte (see `unicode-and-text.md`).
- **Fix**: end-to-end UTF-8 (source, storage, terminal). Fall back to
  ASCII-only glyphs if the target can't be guaranteed (`TERM=dumb` path).

### Incorrect character width / misaligned columns

- Almost always **app-side**: measuring with `len()` instead of a
  display-width helper. Prove it: paste CJK or emoji into one field — if
  the whole row shifts, width math is broken.
- Emoji may also render 2 or 4 cells depending on the emulator's ZWJ
  support — that is an emulator difference; don't "fix" it in the app.
- See `unicode-and-text.md` §2 and §4.

### Arabic rendering problems (reversed, disconnected letters, left-to-right)

- **Emulator layer**: disconnected letters (`ب ت` instead of `بت`) = no
  shaping → emulator lacks Arabic support (Alacritty, some SSH setups).
  Left-to-right order = no BiDi. Verify with `printf 'مرحبا\n'` — if the
  raw printf is also broken, the app cannot fix it.
- **App-side cause**: the app pre-reversed or pre-shaped text. Remove
  that code — it is always wrong (see `rtl-and-bidi.md`).
- **Fix**: use a BiDi-capable emulator (Kitty, Ghostty, WezTerm, iTerm2,
  Windows Terminal); app always sends logical text.

### Terminal colors wrong or absent

- `tput colors` → 0/8/16/256; `printf '\e[38;5;196mred\e[0m\n'` and
  `printf '\e[38;2;255;0;0mtrue-red\e[0m\n'` distinguish 256 from
  truecolor.
- `TERM` unset/wrong (`dumb`) disables everything; `NO_COLOR` set disables
  by policy — respect it.
- Under tmux: truecolor needs tmux ≥ 3.2 or `terminal-overrides` config.
  zellij: truecolor works by default; older versions needed a theme tweak.
- **Fix**: capability-based palette (see `terminal-compatibility.md` §3).

### Flickering

- **App-side**: drawing without buffering (per-line writes instead of one
  frame flush), or re-rendering far more often than needed. Buffer the
  frame; batch events (see `stability-and-robustness.md` §7).
- **Enhancement**: wrap frames in synchronized-output mode
  (`\x1b[?2026h … \x1b[?2026l`) — a no-op where unsupported.
- If flicker only occurs under tmux/zellij, it is a multiplexer redraw
  issue, not the app.

### Incorrect resize behavior

- **App-side**: not storing width/height in state and deriving all layout
  from it, or not re-rendering on SIGWINCH. Resize may fire dozens of
  times per second — debounce (~50ms).
- Test: run at 200x60, drag to 40x10, back. Panic or broken layout = bug
  (see the checklist in `stability-and-robustness.md` §8).

### Mouse not working

- Mouse requires **enabling** reporting (SGR 1006 + a motion mode) — it is
  opt-in in every framework.
- tmux: `set -g mouse on` (otherwise events never reach the app).
- zellij: mouse is handled by zellij's UI layer unless passed through —
  check its config.
- SSH: mouse reporting works over a pty; if using mosh, behavior differs —
  test with plain ssh first.
- Fallback: app must stay fully keyboard-operable (it must anyway).

### Ctrl+C not working (or quitting when it shouldn't)

- In raw mode the app receives `\x03`; it must handle it explicitly —
  Ctrl+C does not terminate the process by itself anymore. Missing
  handler = "doesn't work".
- If the app *must* exit on Ctrl+C from any screen, route it globally, and
  still restore the terminal (the trap below).

### Terminal left in raw mode / alternate screen stuck after exit

- **Cause**: exit path skipped restore — panic, `os.Exit`, `process.exit`,
  or an unhandled signal (SIGTERM, SIGHUP) bypassing cleanup.
- **Fix**: restore in a guard/defer that runs on *all* paths including
  panic (see `stability-and-robustness.md` §3), and install signal
  handlers that run the same restore.
- **Recovery for the user**: `reset`, or `stty sane && printf '\e[?1049l'`.

### tmux / zellij incompatibility

- Truecolor, OSC 8 hyperlinks, OSC 52 clipboard, and the kitty keyboard
  protocol all need passthrough enabled in some configurations
  (tmux: `allow-passthrough on`, `mouse on`; zellij: per-feature options).
- Multiplexers re-render with the *outer* emulator's capabilities — BiDi,
  emoji, and color quality come from the emulator behind them, not from
  the multiplexer.
- Isolate: run the app outside the multiplexer first; if the problem
  disappears, it is a passthrough/config issue.

### SSH differences

- `TERM` is forwarded but the remote's terminfo database may lack that
  entry (`infocmp <term>` fails) → the framework emits nothing or garbage.
  Workaround: `TERM=xterm-256color` on the remote.
- Locale may be non-UTF-8 on the remote → `locale` first, then the app.
- Latency makes full-frame redraws visibly laggy; synchronized output and
  reduced redraw frequency help. mosh adds its own rendering quirks —
  test with plain ssh to attribute correctly.

### Unsupported terminal features

- OSC 8 hyperlinks, OSC 52, and synchronized output are *silently dropped*
  by terminals that don't support them — no error is reported. That is why
  the fallback table in `terminal-compatibility.md` §3 exists: always
  render the plain-text equivalent (URLs, copyable text) alongside.

---

## 3. Debugging Procedure

1. Reproduce in the simplest possible form (static string, minimal app).
2. Run the layer checks from §1 top-down.
3. Fix at the layer where the divergence appears.
4. Re-run the unit/snapshot tests (`testing-tuis.md`) to prove the fix.
5. Verify on at least two different emulators, one of them plain xterm.

If the problem is an emulator limitation with no app-side fix, document it
in the app's README under "Terminal Compatibility" — a known, documented
limitation is correct engineering; a silent workaround is a bug farm.
