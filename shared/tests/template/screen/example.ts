/**
 * Screen stub with scrollable selection, activation and reset shortcuts.
 * Copy to src/tui/screens/<id>.ts, adjust the imports and register
 * `createExampleScreen()` in src/tui/screens/index.ts.
 *
 * The factory keeps the list and the status line per instance, so two
 * mounts of the TUI (or two tests) never share selection or renderables.
 */
import { BoxRenderable, TextRenderable } from "@opentui/core";
import { listPanel } from "../../../core/tui/components.ts";
import type { Screen } from "../../../core/tui/screen.ts";

export function createExampleScreen(entries: string[] = ["First item", "Second item", "Third item"]): Screen {
  let items: ReturnType<typeof listPanel> | undefined;
  return {
    id: "example",
    title: "Example",
    description: "Select an item and press Enter",
    keys: [{ key: "↑/↓ j/k", action: "move" }, { key: "Enter", action: "select" }, { key: "r", action: "reset" }],
    mount: ({ renderer, theme }) => {
      const root = new BoxRenderable(renderer, { flexDirection: "column", flexGrow: 1 });
      const status = new TextRenderable(renderer, { content: "Choose an item", height: 1, flexShrink: 0, fg: theme.textDim });
      items = listPanel(renderer, theme, {
        title: "Items", items: entries,
        onSelect: (index) => { status.content = `Selected item ${index + 1}`; },
      });
      root.add(items.box);
      root.add(status);
      return root;
    },
    onKey: (name) => {
      if (!items) return false;
      if (name === "up" || name === "k") { items.move(-1); return true; }
      if (name === "down" || name === "j") { items.move(1); return true; }
      if (name === "return" || name === "enter") { items.select(items.selected()); return true; }
      if (name === "r") { items.move(-items.selected()); return true; }
      return false;
    },
  };
}
