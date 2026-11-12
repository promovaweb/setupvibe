/**
 * Visual components shared by the screens.
 *
 * `panel` creates a box with a rounded border and a title. `keyValueRow`
 * builds "label  value" with a dimmed label. `list` stacks items with a
 * marker. Everything receives the theme so screens never hard-code colors.
 */
import { ScrollBoxRenderable, BoxRenderable, TextRenderable, TextAttributes, type CliRenderer } from "@opentui/core";
import { glyphs, type Theme } from "./theme.ts";

/** Creates a themed bordered panel. */
export function panel(
  renderer: CliRenderer,
  theme: Theme,
  options: { title: string; flexGrow?: number; width?: number | "auto" | `${number}%`; height?: number | "auto" | `${number}%`; active?: boolean },
): BoxRenderable {
  return new BoxRenderable(renderer, {
    flexGrow: options.flexGrow,
    width: options.width,
    height: options.height,
    flexDirection: "column",
    borderStyle: "rounded",
    borderColor: options.active ? theme.borderActive : theme.border,
    title: ` ${options.title} `,
    titleColor: options.active ? theme.accent : theme.textDim,
    backgroundColor: theme.surface,
    paddingLeft: 1,
    paddingRight: 1,
  });
}

/** Creates one aligned key/value row. */
export function keyValueRow(
  renderer: CliRenderer,
  theme: Theme,
  key: string,
  value: string,
  keyWidth: number,
  valueColor?: string,
): BoxRenderable {
  const row = new BoxRenderable(renderer, { flexDirection: "row", height: 1 });
  row.add(new TextRenderable(renderer, { content: key.padEnd(keyWidth), fg: theme.textDim, selectable: false }));
  row.add(new TextRenderable(renderer, { content: "  " }));
  row.add(new TextRenderable(renderer, { content: value, fg: valueColor ?? theme.text, wrapMode: "none" }));
  return row;
}

/** Creates aligned key/value rows. */
export function keyValueTable(renderer: CliRenderer, theme: Theme, pairs: Array<[string, string, string?]>): BoxRenderable {
  const box = new BoxRenderable(renderer, { flexDirection: "column" });
  const width = Math.max(...pairs.map(([k]) => k.length));
  for (const [k, v, c] of pairs) box.add(keyValueRow(renderer, theme, k, v, width, c));
  return box;
}

/** Creates a strong heading. */
export function heading(renderer: CliRenderer, theme: Theme, text: string): TextRenderable {
  return new TextRenderable(renderer, { content: text, fg: theme.textStrong, attributes: TextAttributes.BOLD });
}

/** Creates secondary text. */
export function dim(renderer: CliRenderer, theme: Theme, text: string): TextRenderable {
  return new TextRenderable(renderer, { content: text, fg: theme.textDim });
}

/** Creates a static bulleted list. */
export function list(renderer: CliRenderer, theme: Theme, items: string[], marker = glyphs.bullet): BoxRenderable {
  const box = new BoxRenderable(renderer, { flexDirection: "column" });
  for (const item of items) {
    const row = new BoxRenderable(renderer, { flexDirection: "row" });
    row.add(new TextRenderable(renderer, { content: `${marker} `, fg: theme.accent }));
    row.add(new TextRenderable(renderer, { content: item, fg: theme.text }));
    box.add(row);
  }
  return box;
}

/** Creates vertical spacing. */
export function spacer(renderer: CliRenderer, height = 1): BoxRenderable {
  return new BoxRenderable(renderer, { height });
}

/**
 * Creates a scrollable selection list. move changes the highlight silently;
 * select highlights and activates an item. Empty lists return selected() = -1.
 * Screens may forward keys to box.handleKeyPress or call move/select in onKey.
 */
export function listPanel(renderer: CliRenderer, theme: Theme, options: {
  title: string;
  items: string[];
  onSelect?: (index: number) => void;
}) {
  const box = new ScrollBoxRenderable(renderer, {
    title: ` ${options.title} `, titleColor: theme.accent,
    borderStyle: "rounded", borderColor: theme.borderActive,
    backgroundColor: theme.surface, paddingLeft: 1, paddingRight: 1,
    flexGrow: 1, minHeight: 0, scrollY: true, scrollX: false,
    contentOptions: { flexDirection: "column" },
  });
  let index = options.items.length ? 0 : -1;
  const rows = options.items.map((item) => {
    const row = new TextRenderable(renderer, { content: item, height: 1, flexShrink: 0, wrapMode: "none", fg: theme.text });
    box.add(row);
    return row;
  });
  const highlight = (next: number) => {
    if (!rows.length || !Number.isFinite(next)) return;
    index = Math.max(0, Math.min(rows.length - 1, Math.trunc(next)));
    rows.forEach((row, i) => {
      row.content = `${i === index ? ">" : " "} ${options.items[i]}`;
      row.fg = i === index ? theme.accent : theme.text;
      row.bg = i === index ? theme.surfaceHigh : theme.surface;
    });
    box.scrollChildIntoView(rows[index]!);
  };
  const select = (next: number) => {
    if (!rows.length || !Number.isFinite(next)) return;
    highlight(next);
    options.onSelect?.(index);
  };
  const move = (delta: number) => highlight(index + delta);
  box.handleKeyPress = (key) => {
    if (key.name === "up" || key.name === "k") { move(-1); return true; }
    if (key.name === "down" || key.name === "j") { move(1); return true; }
    if (key.name === "return" || key.name === "enter") { select(index); return true; }
    return false;
  };
  highlight(index);
  return { box, select, selected: () => index, move };
}
