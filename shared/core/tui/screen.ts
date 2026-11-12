/**
 * Contract of a TUI screen (tab).
 *
 * Each screen lives in `screens/<id>.ts`, exports a `Screen` object and is
 * registered in `screens/index.ts`. The screen receives the renderer and the
 * theme on mount and returns the root renderable of its content. `onEnter`
 * and `onLeave` start and stop timers or subscriptions. The stub in
 * `template/screen/` shows the minimal skeleton.
 */
import type { CliRenderer, Renderable } from "@opentui/core";
import type { Theme } from "./theme.ts";

/** A key hint of the status bar. With `press`, a click on it acts like that key. */
export interface ScreenKey {
  key: string;
  action: string;
  /** Key name sent when the hint is clicked. */
  press?: string;
}

export interface ScreenContext {
  renderer: CliRenderer;
  theme: Theme;
  /** Opens a module by id (the Home is "overview"). */
  open: (id: string) => void;
  /** Same as open, kept for screens written for tabs. */
  goTo: (id: string) => void;
  /** Back to the Home. */
  back: () => void;
  /** Closes the TUI. */
  quit: () => void;
}

export interface Screen {
  /** Stable identifier, used by `tui.initialTab` and `--tab`. */
  id: string;
  /** Short tab title. */
  title: string;
  /** Line shown under the tabs when the tab is focused. */
  description: string;
  /** Screen-specific key hints, shown in the bottom bar. */
  keys?: ReadonlyArray<ScreenKey>;
  /** Builds the content. Called once. */
  mount: (ctx: ScreenContext) => Renderable;
  /** Called when the tab is shown. */
  onEnter?: (ctx: ScreenContext) => void;
  /** Called when the tab is hidden. */
  onLeave?: (ctx: ScreenContext) => void;
  /** Keys handled by the screen itself. Returns `true` when consumed. */
  onKey?: (name: string, ctx: ScreenContext) => boolean;
}
