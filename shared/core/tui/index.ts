/**
 * TUI assembly.
 *
 * Screen layout:
 *
 *   ┌ header: brand and version, PT · EN switch, system and variant ─────┐
 *   │ numbered tabs (TabSelect)                                          │
 *   │ active tab content (flexGrow)                                      │
 *   └ status bar: available keys ────────────────────────────────────────┘
 *
 * Global keys: Left/Right or [ ] switch tabs, 1..6 jump to the tab with that
 * number, Tab moves forward, L switches the language, q or Esc quit, ? toggles
 * the help box. With the mouse (`tui.mouse`, on by default) tabs, the PT · EN
 * switch and every key in the status bar are clickable, and a click outside
 * the help box closes it. Switching the language rebuilds the interface, so
 * every title, label and key hint is drawn again in the new language. The
 * renderer is destroyed on every exit path to hand the terminal back.
 */
import {
  BoxRenderable,
  TabSelectRenderable,
  TabSelectRenderableEvents,
  TextRenderable,
  TextAttributes,
  createCliRenderer,
  fg,
  t,
  type CliRenderer,
  type KeyEvent,
  type Renderable,
} from "@opentui/core";
import { manifest } from "../app/manifest.ts";
import { systemSummary } from "../cli/commands/about.ts";
import { otherLanguage, resetTuiLanguage, setTuiLanguage, tr, tuiLanguage } from "../../tui/i18n.ts";
import { readSettings, getPath } from "../config/settings.ts";
import { glyphs, currentTheme, type Theme } from "./theme.ts";
import { screens } from "./screens/index.ts";
import type { ScreenContext, Screen, ScreenKey } from "./screen.ts";

export interface TuiOptions {
  initialTab?: string;
}

function setting(key: string): unknown {
  try {
    return getPath(readSettings(), key);
  } catch {
    return undefined;
  }
}

function defaultInitialTab(): string {
  const value = setting("tui.initialTab");
  return typeof value === "string" ? value : (screens[0]?.id ?? "overview");
}

/** True unless `tui.mouse` is false. */
export function mouseEnabled(): boolean {
  return setting("tui.mouse") !== false;
}

function keyBar(renderer: CliRenderer, theme: Theme, pairs: ReadonlyArray<ScreenKey>, press: (name: string) => void): BoxRenderable {
  const bar = new BoxRenderable(renderer, {
    height: 1,
    flexDirection: "row",
    backgroundColor: theme.barBackground,
    paddingLeft: 1,
    gap: 2,
  });
  for (const pair of pairs) {
    // Items keep their width; on a narrow terminal the bar is cut at the right instead of losing the labels.
    const item = new BoxRenderable(renderer, { flexDirection: "row", flexShrink: 0 });
    item.add(new TextRenderable(renderer, { content: ` ${pair.key} `, fg: theme.keyText, bg: theme.keyBackground, selectable: false, flexShrink: 0 }));
    item.add(new TextRenderable(renderer, { content: ` ${pair.action}`, fg: theme.barText, selectable: false, flexShrink: 0 }));
    const name = pair.press;
    if (name)
      item.onMouseDown = (e) => {
        // Stop here: the app closes the help on clicks that reach it.
        e.stopPropagation();
        press(name);
      };
    bar.add(item);
  }
  return bar;
}

/** Opens the TUI on a real terminal and returns only when the user quits. */
export async function startTui(options: TuiOptions = {}): Promise<void> {
  const theme = currentTheme();
  const renderer = await createCliRenderer({ exitOnCtrlC: true, backgroundColor: theme.background, targetFps: 30, useMouse: mouseEnabled() });
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
  resetTuiLanguage();

  let app: BoxRenderable | undefined;
  let tabs: TabSelectRenderable | undefined;
  let mounted = new Map<string, Renderable>();
  let active: Screen | undefined;
  let helpBox: BoxRenderable | undefined;
  let onKeyActive: ((name: string) => void) | undefined;

  const context: ScreenContext = {
    renderer,
    theme,
    goTo: (id) => {
      const index = screens.findIndex((s) => s.id === id);
      if (index >= 0) tabs?.setSelectedIndex(index);
    },
    quit,
  };

  const closeHelp = () => {
    if (!helpBox) return;
    renderer.root.remove(helpBox);
    helpBox = undefined;
  };

  const toggleHelp = () => {
    if (helpBox) return closeHelp();
    helpBox = new BoxRenderable(renderer, {
      position: "absolute",
      right: 2,
      top: 5,
      width: 60,
      flexDirection: "column",
      borderStyle: "rounded",
      borderColor: theme.borderActive,
      backgroundColor: theme.surfaceHigh,
      title: ` ${tr("help.title")} `,
      titleColor: theme.accent,
      paddingLeft: 1,
      paddingRight: 1,
      zIndex: 10,
    });
    const rows: Array<[string, string]> = [
      ["←  →  [  ]", tr("help.tabs")],
      ["Tab", tr("help.next")],
      ["1 … 6", tr("help.go")],
      ["L", tr("help.language")],
      ["?", tr("help.toggle")],
      ["q  Esc  Ctrl+C", tr("help.quit")],
    ];
    for (const [k, v] of rows) {
      const row = new BoxRenderable(renderer, { flexDirection: "row" });
      row.add(new TextRenderable(renderer, { content: k.padEnd(16), fg: theme.accent, flexShrink: 0 }));
      row.add(new TextRenderable(renderer, { content: v, fg: theme.text }));
      helpBox.add(row);
    }
    helpBox.add(new TextRenderable(renderer, { content: tr("help.mouse"), fg: theme.textDim, wrapMode: "word" }));
    // Clicks inside the box stay in it; a click anywhere else closes it (see the app handler).
    helpBox.onMouseDown = (e) => e.stopPropagation();
    renderer.root.add(helpBox);
  };

  /** Builds the whole interface in the current language, keeping the tab. */
  const build = (initialIndex: number) => {
    closeHelp();
    if (app) renderer.root.remove(app);
    mounted = new Map();
    active = undefined;

    const root = new BoxRenderable(renderer, { width: "100%", height: "100%", flexDirection: "column", backgroundColor: theme.background });
    root.onMouseDown = () => closeHelp();
    app = root;

    const header = new BoxRenderable(renderer, { height: 1, marginTop: 1, flexDirection: "row", paddingLeft: 1, paddingRight: 1, gap: 2 });
    const brand = new BoxRenderable(renderer, { flexDirection: "row", flexShrink: 0 });
    brand.add(new TextRenderable(renderer, { content: `${glyphs.block} `, fg: theme.accent, selectable: false }));
    brand.add(new TextRenderable(renderer, { content: manifest.title, fg: theme.textStrong, attributes: TextAttributes.BOLD }));
    brand.add(new TextRenderable(renderer, { content: ` v${manifest.version}`, fg: theme.textDim }));
    header.add(brand);
    // Language switch: the active language is highlighted; a click or L switches it.
    const pt = tuiLanguage() === "pt-BR";
    const languageSwitch = new TextRenderable(renderer, {
      content: t`${fg(pt ? theme.accent : theme.textDim)(pt ? "[PT]" : " PT ")}${fg(theme.textDim)("·")}${fg(!pt ? theme.accent : theme.textDim)(!pt ? "[EN]" : " EN ")}`,
      flexShrink: 0,
      selectable: false,
    });
    languageSwitch.onMouseDown = (e) => {
      e.stopPropagation();
      switchLanguage();
    };
    header.add(languageSwitch);
    // The description lives on the About tab; the header shows where SetupVibe runs.
    header.add(new BoxRenderable(renderer, { flexGrow: 1, flexShrink: 1, minWidth: 0 }));
    header.add(new TextRenderable(renderer, { content: systemSummary(), fg: theme.textDim, flexShrink: 1, minWidth: 0, wrapMode: "none", height: 1 }));
    root.add(header);

    const rule = new BoxRenderable(renderer, { height: 1, paddingLeft: 1, paddingRight: 1 });
    rule.add(new TextRenderable(renderer, { content: "─".repeat(400), fg: theme.border, wrapMode: "none", height: 1, selectable: false }));
    root.add(rule);

    const tabWidth = Math.max(...screens.map((s) => s.title.length)) + 6;
    const tabBar = new TabSelectRenderable(renderer, {
      width: "100%",
      height: 2,
      // Numbered titles show the number shortcuts.
      tabWidth,
      options: screens.map((s, i) => ({ name: `${i + 1} ${s.title}`, description: s.description })),
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
    tabBar.onMouseDown = (e) => {
      e.stopPropagation();
      closeHelp();
      const index = Math.floor((e.x - tabBar.x) / tabWidth);
      if (index >= 0 && index < screens.length) tabBar.setSelectedIndex(index);
    };
    tabs = tabBar;
    root.add(tabBar);

    const content = new BoxRenderable(renderer, { flexGrow: 1, flexDirection: "column", paddingLeft: 1, paddingRight: 1 });
    root.add(content);

    const globalKeys: ScreenKey[] = [
      { key: "←/→", action: tr("global.tab"), press: "tab" },
      { key: "1-6", action: tr("global.go") },
      { key: "L", action: tr("global.language"), press: "L" },
      { key: "?", action: tr("global.help"), press: "?" },
      { key: "q", action: tr("global.quit"), press: "q" },
    ];
    const press = (name: string) => onKeyActive?.(name);
    let footer = keyBar(renderer, theme, globalKeys, press);
    root.add(footer);
    renderer.root.add(root);

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
      root.remove(footer);
      footer = keyBar(renderer, theme, [...(screen.keys ?? []), ...globalKeys], press);
      root.add(footer);
    };

    tabBar.on(TabSelectRenderableEvents.SELECTION_CHANGED, (index: number) => show(index));
    tabBar.on(TabSelectRenderableEvents.ITEM_SELECTED, (index: number) => show(index));
    tabBar.focus();
    tabBar.setSelectedIndex(initialIndex);
    show(initialIndex);
  };

  const switchLanguage = () => {
    setTuiLanguage(otherLanguage());
    build(tabs?.getSelectedIndex() ?? 0);
  };

  /** Handles a key by name: the active screen first, then the global keys. */
  const handle = (name: string) => {
    if (active?.onKey?.(name, context)) return;
    switch (name) {
      case "q":
      case "escape":
        quit();
        return;
      case "?":
        toggleHelp();
        return;
      case "L":
        switchLanguage();
        return;
      case "tab":
        tabs?.setSelectedIndex(((tabs?.getSelectedIndex() ?? 0) + 1) % screens.length);
        return;
      default:
        break;
    }
    if (/^[1-9]$/.test(name)) {
      const index = Number(name) - 1;
      if (index < screens.length) tabs?.setSelectedIndex(index);
    }
  };
  onKeyActive = handle;

  const onKey = (key: KeyEvent) => {
    // Shift+l is L (language); plain l stays with the screens.
    handle(key.name === "l" && key.shift ? "L" : key.name);
  };
  renderer.keyInput.on("keypress", onKey);
  renderer.once("destroy", () => renderer.keyInput.off("keypress", onKey));

  const initial = options.initialTab ?? defaultInitialTab();
  build(Math.max(0, screens.findIndex((s) => s.id === initial)));

  await closed;
}
