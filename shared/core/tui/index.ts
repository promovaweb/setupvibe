/**
 * TUI assembly, without tabs.
 *
 *   ┌ header: brand › module, PT · EN switch, system and variant ────────┐
 *   │ Home (bento grid of module cards) or the open module              │
 *   └ status bar: available keys ────────────────────────────────────────┘
 *
 * The Home is a bento grid with one card per module (shared/tui/home.ts).
 * Enter or a click opens a module full screen; Esc or Backspace goes back to
 * the Home. The number keys open a module from anywhere, L switches the
 * language, ? toggles the help and q quits (Esc quits on the Home). With the
 * mouse (`tui.mouse`, on by default) the cards, the breadcrumb, the PT · EN
 * switch and every key in the status bar are clickable, and a click outside
 * the help closes it. Switching the language rebuilds the interface in place.
 * The renderer is destroyed on every exit path to hand the terminal back.
 */
import { BoxRenderable, TextRenderable, TextAttributes, bold, createCliRenderer, fg, t, type CliRenderer, type KeyEvent, type Renderable } from "@opentui/core";
import { manifest } from "../app/manifest.ts";
import { systemSummary } from "../cli/commands/about.ts";
import { icon } from "../../tui/icons.ts";
import { hasText, otherLanguage, resetTuiLanguage, setTuiLanguage, tr, tuiLanguage } from "../../tui/i18n.ts";
import { readSettings, getPath, setPath, writeSettings } from "../config/settings.ts";
import { glyphs, currentTheme, themes, type Theme } from "./theme.ts";
import { home, screens } from "./screens/index.ts";
import type { ScreenContext, Screen, ScreenKey } from "./screen.ts";

export interface TuiOptions {
  /** "overview" (the Home) or a module id. */
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
  return typeof value === "string" ? value : "overview";
}

/** True unless `tui.mouse` is false. */
export function mouseEnabled(): boolean {
  return setting("tui.mouse") !== false;
}

/** Width a key hint takes in the bar. */
const hintWidth = (p: ScreenKey) => p.key.length + p.action.length + 5;

/**
 * Keys that fit the width: the screen keys first, then the global ones; the
 * last two global keys (help and quit) always stay. Exported for tests.
 */
export function fitKeys(screenKeys: ReadonlyArray<ScreenKey>, globalKeys: ReadonlyArray<ScreenKey>, width: number): { screen: ScreenKey[]; global: ScreenKey[] } {
  // Help and quit always stay: help lists every key that did not fit.
  const kept = globalKeys.slice(-2);
  const rest = globalKeys.slice(0, -2);
  const budget = width - 4 - kept.reduce((s, p) => s + hintWidth(p), 0) - 3;
  const screen: ScreenKey[] = [];
  const global: ScreenKey[] = [];
  let used = 0;
  for (const p of screenKeys) {
    if (used + hintWidth(p) > budget) break;
    screen.push(p);
    used += hintWidth(p);
  }
  for (const p of rest) {
    if (used + hintWidth(p) > budget) break;
    global.push(p);
    used += hintWidth(p);
  }
  global.push(...kept);
  return { screen, global };
}

function keyBar(renderer: CliRenderer, theme: Theme, screenKeys: ReadonlyArray<ScreenKey>, globalKeys: ReadonlyArray<ScreenKey>, press: (name: string) => void): BoxRenderable {
  const bar = new BoxRenderable(renderer, { height: 1, flexDirection: "row", backgroundColor: theme.barBackground, paddingLeft: 1, gap: 2, flexShrink: 0 });
  const { screen, global } = fitKeys(screenKeys, globalKeys, renderer.width);
  const pairs = [...screen, ...(screen.length ? [{ key: "│", action: "" } as ScreenKey] : []), ...global];
  for (const pair of pairs) {
    if (pair.key === "│" && !pair.action) {
      bar.add(new TextRenderable(renderer, { content: "│", fg: theme.border, selectable: false, flexShrink: 0 }));
      continue;
    }
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
  let content: BoxRenderable | undefined;
  let footer: BoxRenderable | undefined;
  let crumb: TextRenderable | undefined;
  let moduleBar: BoxRenderable | undefined;
  let clock: TextRenderable | undefined;
  const tickClock = () => {
    if (!clock) return;
    const now = new Date();
    clock.content = `${icon("clock")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  };
  // The clock moves on its own; the timer stops with the TUI.
  const clockTimer = setInterval(tickClock, 15_000);
  clockTimer.unref?.();
  let moduleTitle: TextRenderable | undefined;
  let mounted = new Map<string, Renderable>();
  let active: Screen | undefined;
  let helpBox: BoxRenderable | undefined;

  const all = (): Screen[] => [home, ...screens];
  const find = (id: string) => all().find((s) => s.id === id);

  const context: ScreenContext = {
    renderer,
    theme,
    open: (id) => show(id),
    goTo: (id) => show(id),
    back: () => show(home.id),
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
      top: 4,
      width: 62,
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
    // Keys of the open module first (some may not fit the bottom bar), then the global ones.
    const moduleKeys = (active?.keys ?? []).filter((k) => k.key !== "│");
    if (moduleKeys.length) {
      helpBox.add(new TextRenderable(renderer, { content: tr("help.moduleKeys"), fg: theme.textDim }));
      for (const k of moduleKeys) {
        const row = new BoxRenderable(renderer, { flexDirection: "row" });
        row.add(new TextRenderable(renderer, { content: k.key.padEnd(16), fg: theme.accent, flexShrink: 0 }));
        row.add(new TextRenderable(renderer, { content: k.action, fg: theme.text }));
        helpBox.add(row);
      }
      helpBox.add(new TextRenderable(renderer, { content: " ", height: 1 }));
      helpBox.add(new TextRenderable(renderer, { content: tr("help.globalKeys"), fg: theme.textDim }));
    }
    const rows: Array<[string, string]> = [
      ["←↑↓→  h j k l", tr("help.tabs")],
      ["Enter", tr("help.next")],
      [`1 … ${screens.length}`, tr("help.go")],
      ["Esc  Backspace", tr("help.back")],
      ["L", tr("help.language")],
      ["T", tr("help.theme")],
      ["?", tr("help.toggle")],
      ["q  Ctrl+C", tr("help.quit")],
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

  const globalKeys = (onHome: boolean): ScreenKey[] => [
    ...(onHome ? [] : [{ key: "esc", action: tr("global.back"), press: "escape" }]),
    { key: `1-${screens.length}`, action: tr("global.go") },
    { key: "L", action: tr("global.language"), press: "L" },
    { key: "T", action: tr("global.theme"), press: "T" },
    { key: "?", action: tr("global.help"), press: "?" },
    { key: "q", action: tr("global.quit"), press: "q" },
  ];

  /** Shows the Home or a module, mounting it on first use. */
  const show = (id: string) => {
    const screen = find(id) ?? home;
    if (!app || !content) return;
    closeHelp();
    if (active === screen) return;
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
    const onHome = screen === home;
    if (crumb) crumb.content = onHome ? t`${fg(theme.textDim)("  ")}${fg(theme.barText)(`${icon("overview")} ${home.title}`)}` : t`${fg(theme.textDim)("  ›  ")}${fg(theme.accent)(`${icon(screen.id)} ${screen.title}`)}`;
    // Module header: back button, title and what the module shows; hidden on the Home.
    if (moduleBar && moduleTitle) {
      moduleBar.visible = !onHome;
      moduleTitle.content = onHome ? "" : t`${fg(theme.accent)(icon(screen.id))}  ${bold(fg(theme.textStrong)(screen.title))}   ${fg(theme.textDim)(hasText(`sub.${screen.id}`) ? tr(`sub.${screen.id}` as never) : screen.description)}`;
    }
    if (footer) app.remove(footer);
    footer = keyBar(renderer, theme, screen.keys ?? [], globalKeys(onHome), handle);
    app.add(footer);
  };

  /** Builds the whole interface in the current language, keeping the open screen. */
  const build = (id: string) => {
    closeHelp();
    // The open module stops its timers before the interface is rebuilt.
    active?.onLeave?.(context);
    if (app) renderer.root.remove(app);
    mounted = new Map();
    active = undefined;

    const root = new BoxRenderable(renderer, { width: "100%", height: "100%", flexDirection: "column", backgroundColor: theme.background });
    root.onMouseDown = () => closeHelp();
    app = root;

    // Header band: brand pill, version and where you are on the left; clock, PT · EN and the system on the right.
    const header = new BoxRenderable(renderer, { height: 1, flexDirection: "row", backgroundColor: theme.barBackground, paddingRight: 1, gap: 2, flexShrink: 0 });
    const brand = new BoxRenderable(renderer, { flexDirection: "row", flexShrink: 0 });
    const name = new TextRenderable(renderer, { content: t`${bold(fg(theme.background)(" ▲ SetupVibe "))}`, bg: theme.accent, selectable: false });
    // A click on the name goes back to the Home, like a breadcrumb.
    name.onMouseDown = (e) => {
      e.stopPropagation();
      show(home.id);
    };
    brand.add(name);
    brand.add(new TextRenderable(renderer, { content: ` v${manifest.version}`, fg: theme.textDim, bg: theme.barBackground }));
    crumb = new TextRenderable(renderer, { content: "", flexShrink: 0, bg: theme.barBackground });
    brand.add(crumb);
    header.add(brand);
    header.add(new BoxRenderable(renderer, { flexGrow: 1, flexShrink: 1, minWidth: 0 }));
    const system = new TextRenderable(renderer, { content: systemSummary(), fg: theme.textDim, flexShrink: 1, minWidth: 0, wrapMode: "none", height: 1, bg: theme.barBackground });
    header.add(system);
    // Language switch: the active language is highlighted; a click or L switches it.
    const pt = tuiLanguage() === "pt-BR";
    const languageSwitch = new TextRenderable(renderer, {
      content: t`${fg(pt ? theme.accent : theme.textDim)(pt ? "[PT]" : " PT ")}${fg(theme.textDim)("·")}${fg(!pt ? theme.accent : theme.textDim)(!pt ? "[EN]" : " EN ")}`,
      flexShrink: 0,
      selectable: false,
      bg: theme.barBackground,
    });
    languageSwitch.onMouseDown = (e) => {
      e.stopPropagation();
      switchLanguage();
    };
    header.add(languageSwitch);
    // Theme switch: moon for the dark palette, sun for the light one; a click or T switches it.
    const themeSwitch = new TextRenderable(renderer, { content: ` ${icon(theme.name === "day" ? "day" : "night")} `, fg: theme.accent, flexShrink: 0, selectable: false, bg: theme.barBackground });
    themeSwitch.onMouseDown = (e) => {
      e.stopPropagation();
      switchTheme();
    };
    header.add(themeSwitch);
    clock = new TextRenderable(renderer, { content: "", fg: theme.barText, flexShrink: 0, bg: theme.barBackground });
    header.add(clock);
    tickClock();
    root.add(header);

    moduleBar = new BoxRenderable(renderer, { height: 1, marginTop: 1, flexDirection: "row", gap: 2, paddingLeft: 1, paddingRight: 1, flexShrink: 0 });
    const backButton = new TextRenderable(renderer, { content: ` ${icon("back")}  ${tr("global.backButton")} `, fg: theme.keyText, bg: theme.keyBackground, selectable: false, flexShrink: 0 });
    backButton.onMouseDown = (e) => {
      e.stopPropagation();
      show(home.id);
    };
    moduleTitle = new TextRenderable(renderer, { content: "", wrapMode: "none", flexShrink: 1, minWidth: 0 });
    moduleBar.add(backButton);
    moduleBar.add(moduleTitle);
    moduleBar.visible = false;
    root.add(moduleBar);

    content = new BoxRenderable(renderer, { flexGrow: 1, flexDirection: "column", paddingLeft: 1, paddingRight: 1 });
    root.add(content);
    footer = undefined;
    renderer.root.add(root);
    show(id);
  };

  /** Switches between the dark and light palettes, saves the choice and rebuilds in place. */
  const switchTheme = () => {
    theme = theme.name === "day" ? themes.night : themes.day;
    context.theme = theme;
    renderer.setBackgroundColor(theme.background);
    try {
      const settings = readSettings();
      setPath(settings, "tui.theme", theme.name);
      writeSettings(settings);
    } catch {
      // A read-only settings file keeps the choice for this session only.
    }
    build(active?.id ?? home.id);
  };

  const switchLanguage = () => {
    setTuiLanguage(otherLanguage());
    build(active?.id ?? home.id);
  };

  /** Handles a key by name: the open screen first, then the global keys. */
  function handle(name: string): void {
    if (active?.onKey?.(name, context)) return;
    const onHome = active === home;
    switch (name) {
      case "q":
        quit();
        return;
      case "escape":
      case "backspace":
        if (helpBox) closeHelp();
        else if (onHome) {
          if (name === "escape") quit();
        } else show(home.id);
        return;
      case "?":
        toggleHelp();
        return;
      case "L":
        switchLanguage();
        return;
      case "T":
        switchTheme();
        return;
      default:
        break;
    }
    if (/^[1-9]$/.test(name)) {
      const module = screens[Number(name) - 1];
      if (module) show(module.id);
    }
  }

  const onKey = (key: KeyEvent) => {
    // Shift+l is L (language); plain l stays with the screens.
    handle(key.name === "l" && key.shift ? "L" : key.name === "t" && key.shift ? "T" : key.name);
  };
  renderer.keyInput.on("keypress", onKey);
  renderer.once("destroy", () => {
    renderer.keyInput.off("keypress", onKey);
    clearInterval(clockTimer);
    // Timers of the open module (Machine refreshes every two seconds) stop with the TUI.
    active?.onLeave?.(context);
  });

  build(options.initialTab ?? defaultInitialTab());
  await closed;
}
