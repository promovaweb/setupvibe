# TUI Design Principles

## The Terminal as a Design Medium

The terminal is a constrained canvas: monospace characters, limited color, no smooth animations. These constraints are a feature, not a bug. They demand discipline. A well-designed TUI achieves elegance through restraint — every character, every space, every color choice must earn its place.

---

## 1. Visual Hierarchy

Visual hierarchy answers: what should the user look at first?

### Techniques

- **Position** — Top-left carries the most weight in LTR reading. Place primary content there.
- **Size** — Larger elements (wider tables, taller panels) feel more important.
- **Contrast** — Bright/colored text on dark background, or bold on regular. Use sparingly.
- **Isolation** — Important elements surrounded by whitespace draw the eye.
- **Grouping** — Related items grouped together; unrelated items separated by space or dividers.

### Hierarchy Levels

Every screen should have 3-4 clear levels:

1. **Primary** — The main content or data the user came for
2. **Secondary** — Supporting context, labels, metadata
3. **Tertiary** — Navigation hints, status, footer info
4. **Ambient** — Borders, decorative structure, separators

If everything looks the same level of importance, the hierarchy is flat and the user is overwhelmed.

---

## 2. Spacing

Spacing is the single most impactful design choice in a TUI.

### Rules of Thumb

- **Padding** — Minimum 1 cell of padding inside any bordered container. Prefer 2.
- **Gutters** — 2-4 cells between major panels. 1 cell between tightly related elements.
- **Margins** — Leave 1 cell margin at screen edges. Content should not touch the terminal border.
- **Sections** — 1 blank line between logical sections within a panel.

### Common Mistakes

- No padding inside borders — text touching borders looks cramped
- Inconsistent spacing between similar elements — destroys rhythm
- Maximizing content density at the expense of readability
- No breathing room between the UI and the terminal edge

### Spacing System

Define a spacing scale and stick to it:

| Token | Cells | Use |
|-------|-------|-----|
| xs | 1 | Tight element gaps |
| sm | 2 | Inter-element spacing |
| md | 4 | Panel gutters, section breaks |
| lg | 6 | Major section separation |
| xl | 8 | Screen-level margins |

---

## 3. Alignment

In a monospace grid, alignment is both easy and critical.

### Rules

- Left-align text content. Always. Right-align only for numbers in columns.
- Columnar data must align precisely — off-by-one alignment is visually jarring.
- Labels and values in key-value pairs should align on the colon/separator.
- Panel content should align across panels at the same vertical position when they share a row.

### Grid Alignment

Treat the terminal as a grid. Plan column positions:

```
Col  5   10   15   20   25   30   35   40   45   50
     |    |    |    |    |    |    |    |    |    |

     +----+----+--------------+---+----+----+---------+
     |         NAVIGATION     |      CONTENT          |
     +----+----+--------------+---+----+----+---------+
```

---

## 4. Borders and Containers

### When to Use Borders

- To group related elements into a named panel
- To separate distinct functional areas (sidebar vs content)
- To frame a modal or overlay

### When NOT to Use Borders

- Around every individual element
- When whitespace alone creates sufficient separation
- Around the entire screen (the terminal edge is the border)

### Border Styles

- **Rounded** — Friendly, modern. Good for primary panels.
- **Square** — Technical, precise. Good for data tables.
- **Thick** — Emphasis on a focused element (modal, important panel).
- **None** — For content that flows freely or uses spacing for separation.

Pick one style and use it consistently. Mixing border styles looks chaotic.

### Border Alternatives

- Horizontal lines (`─`) to separate sections within a panel
- Subtle color differences between panel backgrounds
- Indentation to show hierarchy without borders
- Whitespace alone (the most elegant option when it works)

---

## 5. Typography in the Terminal

"Typography" in the terminal means: weight, style, emphasis.

### Techniques

- **Bold** — For titles, selected items, important values. Use intentionally.
- **Dim/Faint** — For secondary info, hints, disabled items.
- **Underline** — For links, interactive elements, current sort column.
- **Reverse video** — For focused/selected items, highlights.
- **Italic** — Rarely supported; avoid relying on it.

### Text Sizing

You can't change font size in the terminal. Use spacing and emphasis instead:

- A title with generous padding above and below feels "bigger."
- A bold line with dim surrounding lines stands out more than making everything bold.

---

## 6. Layout Composition

### Common Layout Patterns

**Sidebar + Content** — Navigation on the left, main view on the right. Classic, works for most apps.

```
+----------+----------------------------------+
| Sidebar  |  Content                         |
|          |                                  |
|          |                                  |
+----------+----------------------------------+
```

**Header + Body + Footer** — Title bar, main content, status bar. Good for focused tools.

```
+--------------------------------------------------+
| Header / Title Bar                               |
+--------------------------------------------------+
|                                                  |
|  Main Content                                    |
|                                                  |
+--------------------------------------------------+
| Status Bar                                       |
+--------------------------------------------------+
```

**Master-Detail** — List on the left, detail on the right. For browsing data.

```
+------------------+-------------------------------+
| List / Index     |  Detail View                  |
|                  |                               |
|                  |                               |
+------------------+-------------------------------+
```

**Dashboard Grid** — Multiple panels in a grid. For monitoring and overview.

```
+-------------------+-------------------+
| Panel A           | Panel B           |
+-------------------+-------------------+
| Panel C                               |
+---------------------------------------+
```

**Tabs + Content** — Tab bar at top, content below. For multi-mode tools.

```
+--------------------------------------------------+
| [Tab 1] [Tab 2] [Tab 3]                          |
+--------------------------------------------------+
|                                                  |
|  Content for active tab                          |
|                                                  |
+--------------------------------------------------+
```

### Choosing a Layout

- Single purpose, single workflow → Header + Body + Footer
- Navigation between features → Sidebar + Content
- Browse and inspect data → Master-Detail
- Monitor multiple data sources → Dashboard Grid
- Switch between modes/views → Tabs + Content

Many apps combine these: a sidebar with a header and footer, where the content area uses tabs or master-detail.

---

## 7. Responsive Terminal Design

Terminals resize. Your TUI must handle it.

### Strategies

- **Define minimum size** — Below a certain size, show a message instead of a broken UI.
- **Flexible panels** — Some panels have fixed width (sidebar), others take remaining space.
- **Progressive disclosure** — Show less detail at small sizes, more at large sizes.
- **Collapse** — Collapse sidebar into a menu at narrow widths. Collapse secondary panels.

### Breakpoints

| Category | Width | Strategy |
|----------|-------|----------|
| Tiny | < 40 cols | Show error message or minimal view |
| Narrow | 40-60 cols | Single column, no sidebar |
| Standard | 60-100 cols | Standard two-panel layout |
| Wide | 100-140 cols | Full dashboard with sidebars |
| Ultra-wide | > 140 cols | Extra panels or wider content |

---

## 8. Aesthetic Taste

### What Makes a TUI Look Premium

- Generous whitespace — the fastest upgrade from "looks like a debug tool" to "looks like a product"
- Consistent alignment — every element respects the grid
- Restrained color — a few colors used well, not every color available
- Clear focus — the user always knows where they are and what's active
- Thoughtful empty states — not just a blank screen
- Status bar with helpful hints — always visible, always useful

### What Makes a TUI Look Cheap

- Walls of text with no visual breaks
- Borders around every element
- Rainbow color usage
- Inconsistent spacing (2 cells here, 3 there, 1 elsewhere)
- No visual distinction between what's clickable and what's not
- Missing or invisible focus indicators
- Error messages that dump raw errors into the UI
