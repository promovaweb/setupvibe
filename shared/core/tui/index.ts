/**
 * TUI assembly.
 *
 * Screen layout:
 *
 *   ┌ header: title, version and description ────────────────────────────┐
 *   │ tabs (TabSelect)                                                   │
 *   │ active tab content (flexGrow)                                      │
 *   └ status bar: available keys ────────────────────────────────────────┘
 *
 * Global keys: Left/Right or [ ] switch tabs, 1..9 jump to the tab with
 * that number, Tab moves forward, q or Esc quit, ? toggles the help box.
 * The renderer is destroyed on every exit path to hand the terminal back.
 */
import {
  BoxRenderable,
  TabSelectRenderable,
  TabSelectRenderableEvents,
  TextRenderable,
  TextAttributes,
  createCliRenderer,
  type CliRenderer,
  type KeyEvent,
  type Renderable,
} from "@opentui/core";
import { manifest } from "../app/manifest.ts";
import { readSettings, getPath } from "../config/settings.ts";
import { glyphs, currentTheme, type Theme } from "./theme.ts";
import { screens } from "./screens/index.ts";
import type { ScreenContext, Screen } from "./screen.ts";

export interface TuiOptions {
  initialTab?: string;
}

function defaultInitialTab(): string {
  try {
    const value = getPath(readSettings(), "tui.initialTab");
    if (typeof value === "string") return value;
  } catch {
    // Without settings, use the first tab.
  }
  return screens[0]?.id ?? "overview";
}

function keyBar(renderer: CliRenderer, theme: Theme, pairs: ReadonlyArray<{ key: string; action: string }>): BoxRenderable {
  const bar = new BoxRenderable(renderer, {
    height: 1,
    flexDirection: "row",
    backgroundColor: theme.barBackground,
    paddingLeft: 1,
    gap: 2,
  });
  for (const { key, action } of pairs) {
    const item = new BoxRenderable(renderer, { flexDirection: "row" });
    item.add(new TextRenderable(renderer, { content: ` ${key} `, fg: theme.keyText, bg: theme.keyBackground, selectable: false }));
    item.add(new TextRenderable(renderer, { content: ` ${action}`, fg: theme.barText, selectable: false }));
    bar.add(item);
  }
  return bar;
}

/** Opens the TUI on a real terminal and returns only when the user quits. */
export async function startTui(options: TuiOptions = {}): Promise<void> {
  const theme = currentTheme();
  const renderer = await createCliRenderer({ exitOnCtrlC: true, backgroundColor: theme.background, targetFps: 30 });
  await mountTui(renderer, options, theme);
}

/**
 * Mounts the interface on an existing renderer and returns when it is
 * destroyed. Separated from `startTui` so tests can use the renderer from
 * `@opentui/core/testing` and capture frames without a real terminal.
 */
export async function mountTui(renderer: CliRenderer, options: TuiOptions = {}, theme: Theme = currentTheme()): Promise<void> {
  const closed = new Promise<void>((resolve) => renderer.once("destroy", () => resolve()));
  const quit = () => renderer.destroy();

  const app = new BoxRenderable(renderer, {
    width: "100%",
    height: "100%",
    flexDirection: "column",
    backgroundColor: theme.background,
  });

  const header = new BoxRenderable(renderer, {
    height: 1,
    flexDirection: "row",
    paddingLeft: 1,
    paddingRight: 1,
    gap: 2,
  });
  const brand = new BoxRenderable(renderer, { flexDirection: "row", flexShrink: 0 });
  brand.add(new TextRenderable(renderer, { content: `${glyphs.block} `, fg: theme.accent, selectable: false }));
  brand.add(new TextRenderable(renderer, { content: manifest.title, fg: theme.textStrong, attributes: TextAttributes.BOLD }));
  brand.add(new TextRenderable(renderer, { content: ` v${manifest.version}`, fg: theme.textDim }));
  header.add(brand);
  header.add(
    new TextRenderable(renderer, {
      content: `${glyphs.separator}  ${manifest.description}`,
      fg: theme.textDim,
      wrapMode: "none",
      flexGrow: 1,
      flexShrink: 1,
      minWidth: 0,
      height: 1,
    }),
  );
  header.add(
    new TextRenderable(renderer, {
      content: `${process.platform}-${process.arch} ${glyphs.bullet} Bun ${Bun.version}`,
      fg: theme.textDim,
      flexShrink: 0,
      wrapMode: "none",
    }),
  );
  app.add(header);

  const rule = new BoxRenderable(renderer, { height: 1, paddingLeft: 1, paddingRight: 1 });
  rule.add(new TextRenderable(renderer, { content: "─".repeat(400), fg: theme.border, wrapMode: "none", height: 1, selectable: false }));
  app.add(rule);

  const tabs = new TabSelectRenderable(renderer, {
    width: "100%",
    height: 2,
    tabWidth: 14,
    options: screens.map((s) => ({ name: s.title, description: s.description })),
    backgroundColor: theme.background,
    textColor: theme.textDim,
    focusedBackgroundColor: theme.background,
    focusedTextColor: theme.textDim,
    selectedBackgroundColor: theme.surfaceHigh,
    selectedTextColor: theme.accent,
    selectedDescriptionColor: theme.textDim,
    showDescription: false,
    showScrollArrows: false,
    wrapSelection: true,
  });
  app.add(tabs);

  const content = new BoxRenderable(renderer, { flexGrow: 1, flexDirection: "column", paddingLeft: 1, paddingRight: 1 });
  app.add(content);

  const globalKeys = [
    { key: "←/→", action: "tab" },
    { key: "1-9", action: "go" },
    { key: "?", action: "help" },
    { key: "q", action: "quit" },
  ];
  let footer = keyBar(renderer, theme, globalKeys);
  app.add(footer);
  renderer.root.add(app);

  const mounted = new Map<string, Renderable>();
  let active: Screen | undefined;
  let helpVisible = false;
  let helpBox: BoxRenderable | undefined;

  const context: ScreenContext = {
    renderer,
    theme,
    goTo: (id) => {
      const index = screens.findIndex((s) => s.id === id);
      if (index >= 0) tabs.setSelectedIndex(index);
    },
    quit,
  };

  const refreshFooter = (screen: Screen) => {
    app.remove(footer);
    footer = keyBar(renderer, theme, [...(screen.keys ?? []), ...globalKeys]);
    app.add(footer);
  };

  const show = (index: number) => {
    const screen = screens[index];
    if (!screen || screen === active) return;
    if (active) {
      active.onLeave?.(context);
      const previous = mounted.get(active.id);
      if (previous) content.remove(previous);
    }
    let node = mounted.get(screen.id);
    if (!node) {
      node = screen.mount(context);
      mounted.set(screen.id, node);
    }
    content.add(node);
    active = screen;
    screen.onEnter?.(context);
    refreshFooter(screen);
  };

  const toggleHelp = () => {
    helpVisible = !helpVisible;
    if (helpVisible) {
      helpBox = new BoxRenderable(renderer, {
        position: "absolute",
        right: 2,
        top: 4,
        width: 46,
        flexDirection: "column",
        borderStyle: "rounded",
        borderColor: theme.borderActive,
        backgroundColor: theme.surfaceHigh,
        title: " Keys ",
        titleColor: theme.accent,
        paddingLeft: 1,
        paddingRight: 1,
        zIndex: 10,
      });
      const rows: Array<[string, string]> = [
        ["←  →  [  ]", "previous / next tab"],
        ["Tab", "next tab"],
        ["1 … 9", "go to the tab with that number"],
        ["?", "show or hide this help"],
        ["q  Esc  Ctrl+C", "quit"],
      ];
      for (const [k, v] of rows) {
        const row = new BoxRenderable(renderer, { flexDirection: "row" });
        row.add(new TextRenderable(renderer, { content: k.padEnd(16), fg: theme.accent }));
        row.add(new TextRenderable(renderer, { content: v, fg: theme.text }));
        helpBox.add(row);
      }
      renderer.root.add(helpBox);
    } else if (helpBox) {
      renderer.root.remove(helpBox);
      helpBox = undefined;
    }
  };

  tabs.on(TabSelectRenderableEvents.SELECTION_CHANGED, (index: number) => show(index));
  tabs.on(TabSelectRenderableEvents.ITEM_SELECTED, (index: number) => show(index));

  const onKey = (key: KeyEvent) => {
    if (active?.onKey?.(key.name, context)) return;
    switch (key.name) {
      case "q":
      case "escape":
        quit();
        return;
      case "?":
        toggleHelp();
        return;
      case "tab":
        tabs.setSelectedIndex((tabs.getSelectedIndex() + 1) % screens.length);
        return;
      default:
        break;
    }
    if (/^[1-9]$/.test(key.name)) {
      const index = Number(key.name) - 1;
      if (index < screens.length) tabs.setSelectedIndex(index);
    }
  };
  renderer.keyInput.on("keypress", onKey);
  renderer.once("destroy", () => renderer.keyInput.off("keypress", onKey));

  const initial = options.initialTab ?? defaultInitialTab();
  const initialIndex = Math.max(0, screens.findIndex((s) => s.id === initial));
  tabs.focus();
  tabs.setSelectedIndex(initialIndex);
  show(initialIndex);

  await closed;
}
