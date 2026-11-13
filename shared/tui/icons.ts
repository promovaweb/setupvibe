/**
 * Icons of the TUI.
 *
 * SetupVibe installs a Nerd Font (JetBrains Mono Nerd Font) on desktops, so
 * the TUI uses its glyphs for modules, inventory categories and states. On a
 * terminal without a Nerd Font, `tui.icons` set to false (or
 * SETUPVIBE_ICONS=0) switches to plain symbols that every font has.
 */
import { getPath, readSettings } from "../core/config/settings.ts";

const NERD: Record<string, string> = {
  overview: "", // house
  inventory: "", // archive box
  user: "", // user
  doctor: "", // stethoscope
  logs: "", // book
  tailscale: "󰌗", // network wired
  machine: "", // desktop
  about: "", // info circle
  // inventory categories
  system: "",
  languages: "",
  terminal: "",
  shell: "",
  devops: "",
  network: "",
  ai: "󰚩",
  security: "",
  remote: "",
  // states
  cpu: "",
  memory: "󰍛",
  disk: "",
  process: "",
  services: "",
  peers: "",
  details: "",
  checklist: "",
  heart: "",
  binary: "",
  project: "",
  standards: "",
  categories: "",
  plan: "",
  events: "",
  health: "",
  check: "󰄲",
  uncheck: "󰄱",
  clock: "",
  back: "",
  update: "",
  ok: "",
  warn: "",
  error: "",
};

const PLAIN: Record<string, string> = {
  overview: "⌂",
  inventory: "▣",
  user: "◉",
  doctor: "✚",
  logs: "≡",
  tailscale: "⇄",
  machine: "▤",
  about: "ⓘ",
  system: "⚙",
  languages: "λ",
  terminal: "›",
  shell: "$",
  devops: "◆",
  network: "≈",
  ai: "✦",
  security: "◈",
  remote: "☁",
  cpu: "▦",
  memory: "▥",
  disk: "◫",
  process: "≣",
  services: "◎",
  peers: "◍",
  details: "ⓘ",
  checklist: "☑",
  heart: "♥",
  binary: "▤",
  project: "▢",
  standards: "▸",
  categories: "☰",
  plan: "☰",
  events: "↺",
  health: "♥",
  check: "☑",
  uncheck: "☐",
  clock: "◷",
  back: "←",
  update: "↻",
  ok: "✓",
  warn: "!",
  error: "✗",
};

let enabled: boolean | undefined;

/** True when Nerd Font icons are on (`tui.icons`, SETUPVIBE_ICONS). */
export function iconsEnabled(): boolean {
  if (enabled !== undefined) return enabled;
  if (process.env.SETUPVIBE_ICONS === "0") return (enabled = false);
  try {
    enabled = getPath(readSettings(), "tui.icons") !== false;
  } catch {
    enabled = true;
  }
  return enabled;
}

/** Forgets the cached choice (tests, settings changes). */
export function resetIcons(): void {
  enabled = undefined;
}

/** Icon for a module, category or state; empty when unknown. */
export function icon(name: string): string {
  return (iconsEnabled() ? NERD[name] : PLAIN[name]) ?? "";
}
