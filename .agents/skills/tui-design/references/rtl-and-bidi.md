# Arabic and RTL Text

Guidance for TUIs that display Arabic, Hebrew, or mixed RTL/LTR content.
The cardinal rules: **never reverse Arabic strings manually**, and **never
mutate logical text to make it look visually correct**. Load this reference
whenever the app renders RTL text.

---

## 1. Logical Text vs Visual Presentation

```text
Logical text   — the characters as stored, in the order they were typed:
                 "مرحبا"  (m-ر-ح-ب-a, right-to-left reading order)

Visual order   — how a rendering engine lays the glyphs out on screen,
                 after BiDi reordering and Arabic shaping
```

These differ, and only a BiDi/shaping engine is allowed to produce the
second from the first:

- **Arabic shaping** — letterforms change by position (isolated, initial,
  medial, final). `ب` alone is not the same glyph as `ب` at the start of a
  word, which is not the same as in the middle. Only a shaping engine
  (HarfBuzz, DirectWrite, CoreText) computes these.
- **BiDi algorithm** (Unicode UAX #9) — decides the visual order of runs
  with mixed directions, including numbers and punctuation inside RTL text.

A terminal cell grid is LTR. What actually happens to RTL text in a TUI:

1. The app writes logical-order text to the grid.
2. The terminal emulator may run BiDi + shaping when rendering the frame.
   Kitty, WezTerm, Ghostty, iTerm2, and Windows Terminal do; Alacritty and
   many others do not.
3. Inside tmux/zellij, the *underlying emulator* decides — multiplexers
   render nothing.

**None of the four TUI frameworks (Ratatui, Bubble Tea, Textual, Ink)
implements BiDi or shaping.** If the app pre-reverses text to "fix" a
terminal that lacks BiDi, it will then be *double-reversed* on terminals
that have it. That is why manual reversal is forbidden: the correct
behavior depends on the emulator, so the only universally correct choice is
to always send logical text.

---

## 2. What the App May Do

The app is allowed — and encouraged — to handle *presentation* concerns
that don't alter logical order:

- **Alignment**: right-align standalone RTL text (e.g. `مرحبا` at the right
  edge of a panel). Alignment is presentation, not reversal.
- **Detect direction**: use a BiDi base-direction detector (Rust:
  `unicode-bidi`; Go: `golang.org/x/text/unicode/bidi`; Python:
  `python-bidi`; JS: `bidi-js` or the Intl API) to decide alignment and
  the placement of decorations like list markers.
- **Keep logical order everywhere**: storage, search, sorting, clipboard,
  undo history, files. Only the emulator reorders, and only for display.

### Mixed content rules

- **Arabic + English**: "Hello مرحبا" is stored exactly like that. Inside
  an RTL paragraph the BiDi algorithm inserts directional runs; the app
  does nothing.
- **Arabic + numbers**: "السعر 123 دينار" — numbers stay in their logical
  position; don't transcribe 123 to ١٢٣ unless the domain truly requires
  it (currency display is a presentation choice, not a data change).
- **Arabic punctuation**: `؟` `،` `؛` are part of the text and flow with
  it. Do not "fix" them into Latin punctuation.
- **Email/URLs embedded in RTL text** stay LTR — the BiDi algorithm
  handles this; wrapping them in U+2066…U+2069 (LRI…PDI) isolates is the
  only acceptable manual assist, and only when the app renders text that
  a BiDi-aware emulator will display.

---

## 3. Cursor, Selection, and Editing

Interactive text (input fields, editors) is where RTL gets hardest:

- **Cursor position**: stored as a logical offset. In an LTR-cell emulator
  with BiDi, visual cursor placement follows reordering; in one without,
  cursor and text disagree. Do not compute cursor cells from string length
  — use the width rules in `unicode-and-text.md` and accept that visual
  position is approximate without emulator BiDi.
- **Selection**: mouse selection is performed by the emulator using its
  own BiDi. When the emulator has no BiDi, selection order is logical —
  a limitation to document, not to fight.
- **Editing mixed text**: recommend against building a full RTL text
  editor unless the deployment terminals are known to support BiDi. For
  short fields (names, labels), logical-order editing with right-aligned
  display is acceptable and predictable.

---

## 4. If the Terminal Cannot Render RTL

Document the limitation instead of pretending support:

```text
Arabic text is sent to the terminal in logical (stored) order.
On terminals without BiDi support (e.g. Alacritty, some SSH setups)
Arabic appears left-to-right and unshaped. Use Kitty, Ghostty,
WezTerm, iTerm2, or Windows Terminal for correct Arabic display.
```

Options, in order of preference:

1. **Rely on emulator BiDi** — send logical text; note the requirement in
   the README (works on Kitty/Ghostty/WezTerm/iTerm2/Windows Terminal).
2. **Degrade gracefully** — if a probe suggests no BiDi (rarely reliable),
   right-align RTL lines and show a hint; still never pre-reverse.
3. **Full application-level BiDi** — only for products where Arabic is the
   primary language and terminal choice is uncontrolled. Requires a
   shaping + BiDi stack (Rust: `unicode-bidi` + `rustybuzz`; Python:
   `arabic-reshaper` + `python-bidi`; JS: HarfBuzz via WASM) and
   re-implementing the grid's reordering. This is a large, bug-prone
   undertaking — treat it as a last resort and verify against UAX #9
   conformance tests. Note that pre-shaped output must then be sent to a
   terminal that does *not* re-shape, or it renders twice-shaped.

---

## 5. Required Tests

```text
stored_text("مرحبا") == "مرحبا"           # unchanged by any pipeline
render_path("Hello مرحبا") preserves order # no reversal anywhere
alignment: RTL text right-aligns, LTR left-aligns
numbers survive: "السعر 123" keeps "123"  # no digit transcription
mixed: "العربية English 123" stored byte-for-byte as input
```

See `testing-tuis.md` for wiring these into the unit suite, and
`troubleshooting.md` for diagnosing broken Arabic rendering.
