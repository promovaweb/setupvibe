# Color and Emphasis Strategy

## Philosophy: Start Monochrome

The best TUIs start in monochrome and add color only where it earns its place. Color is a communication tool, not decoration. Every color choice should answer: "what does this color tell the user?"

---

## Color Palette Structure

### Recommended Palette (4-5 colors max)

| Role | Purpose | Example (Dark Terminal) |
|------|---------|------------------------|
| Base | Normal text, default state | Default foreground (#CCCCCC or white) |
| Muted | Secondary text, hints, labels | Dim/bright black (#666666) |
| Accent | Active focus, selection, primary actions | Cyan, blue, or green |
| Warning | Important, degraded state | Yellow or orange |
| Error | Destructive, failure, critical | Red |

### Extended Palette (6-8 colors, for data-heavy apps)

| Role | Purpose | Example |
|------|---------|---------|
| Base | Normal text | Default fg |
| Muted | Secondary info | Dim |
| Accent | Focus, selection | Cyan |
| Success | Positive state, healthy | Green |
| Warning | Caution, degraded | Yellow |
| Error | Failure, critical | Red |
| Info | Neutral highlight | Blue |
| Special | Brand, unique element | Magenta or custom |

---

## Where to Use Color

### Good Uses (color communicates meaning)

- **Status indicators** — green/yellow/red for healthy/warning/error
- **Active focus** — accent color on the focused element
- **Selected items** — accent or reverse video
- **Keybindings in hints** — accent color for the key, muted for description: `j/k` navigate
- **Errors and validation** — red for error text
- **Diff/change indicators** — green for added, red for removed
- **Category tags** — consistent colors per category

### Bad Uses (color is noise)

- Coloring every label differently
- Using color for entire blocks of text (hard to read)
- Background colors on large areas (reduces contrast)
- More than 3-4 colors visible at once
- Color as the only indicator (not accessible to color-blind users)

---

## Emphasis Techniques (When Color Isn't Enough)

### Weight

- **Bold** — Titles, selected items, key values, active states
- **Normal** — Body text, data values
- **Dim** — Hints, labels, timestamps, secondary info

### Contrast

- Reverse video for focused items — unambiguous, works in any terminal
- High contrast for important values
- Low contrast for ambient information

### Position

- Primary content gets the most prominent position
- Status indicators in consistent locations
- Key hints always in the same place (footer)

### Symbols and Icons

Use Unicode symbols to supplement color:

| Symbol | Meaning |
|--------|---------|
| `●` | Active, healthy, bullet |
| `○` | Inactive, empty |
| `▸` | Selected, current item |
| `✓` | Success, completed |
| `✗` | Failure, error |
| `⚠` | Warning |
| `…` | Truncated, more available |
| `▸▸` | Play, start |
| `■` | Stop, end |
| `◆` | Important, pinned |

---

## Terminal Compatibility

### Color Support Levels

1. **No color** — `NO_COLOR` env var set or `TERM=dumb`. Use emphasis only (bold, dim).
2. **16 colors** — Standard ANSI. Most compatible. Use named colors.
3. **256 colors** — Extended palette. Good balance of compatibility and options.
4. **Truecolor (24-bit)** — Modern terminals. Best appearance, least compatible.

### Strategy

- Detect terminal capability at startup
- Provide a `--no-color` flag and respect `NO_COLOR` environment variable
- Design for 16 colors first — treat 256/truecolor as enhancement
- Test your palette in both dark and light terminal themes
- Never rely on color alone — always pair with emphasis or symbols

### ANSI 16-Color Quick Reference (Dark Theme)

```
  Standard:
  30 Black    31 Red      32 Green    33 Yellow
  34 Blue     35 Magenta  36 Cyan     37 White

  Bright:
  90 Bright Black (Gray)   91 Bright Red
  92 Bright Green          93 Bright Yellow
  94 Bright Blue           95 Bright Magenta
  96 Bright Cyan           97 Bright White
```

### Recommended Mapping (Dark Terminal)

```
  Base:     White (37) or Bright White (97)
  Muted:    Bright Black (90) — appears as gray
  Accent:   Cyan (36) or Bright Cyan (96)
  Success:  Green (32) or Bright Green (92)
  Warning:  Yellow (33) or Bright Yellow (93)
  Error:    Red (31) or Bright Red (91)
```

---

## Dark vs Light Terminal Considerations

### Dark Terminal (most common)

- Default foreground is light text on dark background
- Muted text should be noticeably dimmer but still readable
- Accent colors can be saturated — they stand out against dark
- Avoid bright colors on bright background areas

### Light Terminal

- Default foreground is dark text on light background
- Dim text may be invisible — use different emphasis strategy
- Saturated colors may be harder to read — prefer darker tones
- Test your palette with inverted terminal theme

### Adapting

Best practice: query the terminal for its color scheme if possible, or provide a `--theme=light|dark` flag. At minimum, ensure your UI is functional (not broken) in both modes.

---

## Styling by Component

### Header / Title

- Bold, base color. No special color needed — weight + position is enough.
- Optional: subtle accent underline or separator.

### Sidebar Navigation

- Active item: bold + accent color + indicator
- Inactive items: base color
- Section headers: muted, uppercase

### Data Table

- Header row: bold, muted color
- Data rows: base color
- Selected row: reverse video or accent background
- Sorted column header: accent underline

### Status Bar

- Reverse video or subtle background
- Status dot: colored by state (green/yellow/red)
- Key hints: accent for keys, muted for descriptions

### Modal

- Border: accent color or base
- Title: bold
- Destructive action: red accent
- Safe action: base or accent

### Form Inputs

- Label: base color, bold
- Input field: base color with border
- Active input: accent border
- Error text: red, below the field
- Placeholder: muted

### Toasts

- Success: green accent or symbol
- Error: red accent or symbol
- Warning: yellow accent or symbol
- Info: base or accent

---

## Anti-Patterns

- Rainbow status bars or headers
- Different colors for every table row
- Background colors on entire panels (hard to read, clashes with terminal theme)
- Red for non-error items (user will associate red with failure)
- More than 4 colors in any single screen
- Color as the sole differentiator between states (not accessible)
- Assuming the user's terminal background color
