/**
 * Modern unix TUI theme.
 *
 * Two palettes: `night` (default) and `day`. Color names follow their role
 * in the interface, not the hue, so switching palettes never touches the
 * screens. Rounded borders, dimmed labels and strong values build the visual
 * hierarchy. The choice comes from `tui.theme` in settings.json.
 */
import { readSettings, getPath } from "../config/settings.ts";

export interface Theme {
  name: string;
  background: string;
  surface: string;
  surfaceHigh: string;
  border: string;
  borderActive: string;
  text: string;
  textDim: string;
  textStrong: string;
  accent: string;
  accentSecondary: string;
  ok: string;
  warn: string;
  error: string;
  barBackground: string;
  barText: string;
  keyBackground: string;
  keyText: string;
}

export const themes: Record<"night" | "day", Theme> = {
  night: {
    name: "night",
    background: "#1a1b26",
    surface: "#1f2335",
    surfaceHigh: "#24283b",
    border: "#3b4261",
    borderActive: "#7aa2f7",
    text: "#c0caf5",
    textDim: "#565f89",
    textStrong: "#e0e6ff",
    accent: "#7aa2f7",
    accentSecondary: "#bb9af7",
    ok: "#9ece6a",
    warn: "#e0af68",
    error: "#f7768e",
    barBackground: "#16161e",
    barText: "#a9b1d6",
    keyBackground: "#3d59a1",
    keyText: "#ffffff",
  },
  day: {
    name: "day",
    background: "#e1e2e7",
    surface: "#d6d8df",
    surfaceHigh: "#c4c8da",
    border: "#a8aecb",
    borderActive: "#2e7de9",
    text: "#3760bf",
    textDim: "#848cb5",
    textStrong: "#1b2a5e",
    accent: "#2e7de9",
    accentSecondary: "#9854f1",
    ok: "#587539",
    warn: "#8c6c3e",
    error: "#f52a65",
    barBackground: "#c4c8da",
    barText: "#3760bf",
    keyBackground: "#2e7de9",
    keyText: "#ffffff",
  },
};

/** Reads `tui.theme` and returns the palette. Any failure falls back to `night`. */
export function currentTheme(): Theme {
  try {
    const name = getPath(readSettings(), "tui.theme");
    if (name === "day") return themes.day;
  } catch {
    // Without readable settings, keep the default palette.
  }
  return themes.night;
}

/** Glyphs used by the screens; all fit in one cell. */
export const glyphs = {
  bullet: "•",
  arrow: "→",
  ok: "✓",
  warn: "!",
  error: "✗",
  separator: "│",
  block: "▌",
};
