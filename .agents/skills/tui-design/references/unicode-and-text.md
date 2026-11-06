# Unicode and Text Width

The #1 source of misaligned TUIs is assuming:

```text
byte length == character count == terminal display width
```

All three are different numbers for most real-world text. Load this
reference whenever a TUI displays user-generated text, CJK, Arabic, emoji,
or does any column math, truncation, padding, or centering.

---

## 1. The Three Lengths

```text
"中文"       bytes=6  chars=2  width=4
"é"         bytes=3  chars=2  width=1   (e + U+0301 combining acute)
"👨‍💻"  bytes=11 chars=3  width=2   (👨 + ZWJ + 💻 sequence)
"🇮🇶"      bytes=8  chars=2  width=2   (regional indicators)
```

- **Bytes** — `len()` in Go, `str::len()` in Rust, `len(s.encode())` in Python.
- **Characters** — Go `[]rune`, Rust `.chars()`, Python `str` itself,
  JS `[...s]` (code points; grapheme clusters still differ).
- **Display width** — what matters for layout. One grapheme cluster is the
  visual unit; terminals advance the cursor by its width in *cells*.

Rules of thumb (Unicode East Asian Width + emoji conventions):

| Category | Example | Width |
|---|---|---|
| ASCII / Latin / Arabic letters | `a`, `A`, `ا`, `ب` | 1 |
| Combining marks | U+0301, vowel marks, hamza below | 0 (combines with previous) |
| Zero-width chars | ZWJ U+200D, ZWNJ U+200C, ZWSP U+200B, variation selectors U+FE0F | 0 |
| Wide chars | CJK ideographs, Hangul, fullwidth forms | 2 |
| Emoji (single) | `👍` | 2 |
| Emoji ZWJ sequence | `👨‍💻` | 2 (as a cluster) |
| Flags | `🇮🇶` | 2 (regional-indicator pair) |
| Control/ANSI escape | `\x1b[31m` | 0 (strip before measuring) |

Emoji caveat: terminals with weak emoji font support may render ZWJ
sequences or flags as 4+ cells or tofu. Width math assumes 2; don't build
layouts whose correctness depends on emoji rendering.

---

## 2. The Rules

1. **Store text unmodified.** Never strip or replace combining marks, ZWJ,
   or variation selectors "to be safe" — that corrupts the data (see
   `rtl-and-bidi.md` for the same rule about Arabic).
2. **Measure with a display-width function, not `len()`.** Every layout
   decision — column widths, padding, truncation, centering, cursor
   position — uses display width.
3. **Truncate by width.** Cut a grapheme cluster cleanly (never split a
   ZWJ sequence or a combining mark from its base), then append `…`
   (width 1).
4. **Pad by width.** Right-pad a string with `spaces = target_width -
   display_width(s)`; clamp at zero.
5. **Strip ANSI before measuring.** Style codes have width 0 but break
   naive slicing. Measure the unstyled string; apply styles to the result.
6. **Never index by byte offset** into text for cursor math. Use
   character/cluster offsets.

### Width helpers per ecosystem

| Ecosystem | Helper |
|---|---|
| Rust | `unicode-width` crate: `"中文".width()` |
| Go | `github.com/mattn/go-runewidth` or `github.com/rivo/uniseg` (Lip Gloss uses uniseg internally) |
| Python | `wcwidth` package: `wcswidth("中文")`; Textual/Rich do this internally |
| TypeScript | `string-width` npm package (Ink/cli-truncate already use it) |

Prefer whatever the chosen framework already depends on — don't add a
second width implementation (see the dependency rule in `SKILL.md`).

---

## 3. Worked Examples

Display width for the canonical cases:

```text
Hello              → 5
مرحبا              → 5
Hello مرحبا        → 11   (5 + space + 5)
العربية English 123 → 19   (7 + space + 7 + space + 3)
é                  → 1    (e + combining acute)
é                  → 1    (precomposed)
👨‍💻           → 2    (ZWJ sequence)
🇮🇶               → 2    (flag)
中文               → 4
```

### Truncation

```text
truncate("العربية English 123", width=12) → "العربية Eng…"
truncate("👨‍💻 dev", width=4)          → "👨‍💻 …"   (never "👨" + "…")
```

### Padding a mixed column

```text
"مرحبا"  padded to width 8 → "مرحبا   "   (3 trailing spaces)
"中文"   padded to width 8 → "中文    "   (4 trailing spaces)
```

Both end at the same cell — that is the whole point of width-aware padding.

---

## 4. Where Bugs Hide

- **Column headers vs data** — header aligned by `len()`, data by width.
- **Progress bars / gauges** — width math on labels containing emoji.
- **Input cursor** — cursor position advanced by byte offset while the
  line contains CJK; backspace deletes half a character.
- **Centering titles** — `(width - len(s)) / 2` instead of display width.
- **Status bar overflow** — truncation drops a combining mark, leaving a
  dangling accent.
- **Search highlight spans** — byte offsets from the search engine applied
  to rune-indexed text.

---

## 5. Required Tests

Unicode behavior is testable — add cases like these to the unit suite
(see `testing-tuis.md`):

```text
width("Hello") == 5
width("مرحبا") == 5
width("Hello مرحبا") == 11
width("é") == 1            (combining)
width("👨‍💻") == 2       (ZWJ emoji)
width("🇮🇶") == 2        (flag)
width("中文") == 4
truncate("العربية English 123", 12).ends_with("…")
pad("中文", 8) has display width 8
```

If the framework's width helper disagrees with these, file a bug — the
test is right and the app will misalign in production.
