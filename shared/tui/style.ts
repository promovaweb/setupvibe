/**
 * Visual pieces shared by the TUI modules.
 *
 * `meter` is the one progress bar of the interface: a thin solid track
 * (`━`), the done part in the state color and the rest in the border color.
 * It returns two text chunks to place side by side inside a `t` template.
 * `usageColor` maps a percentage to green, amber (75%) and red (90%).
 */
import { fg } from "@opentui/core";
import type { Theme } from "../core/tui/theme.ts";

/** Color of a usage percentage: green, amber from 75%, red from 90%. */
export function usageColor(theme: Theme, percent: number): string {
  return percent >= 90 ? theme.error : percent >= 75 ? theme.warn : theme.ok;
}

/** Mixes two #rrggbb colors: `ratio` of `a` over `b` (a soft tint of the accent, for example). */
export function tint(a: string, b: string, ratio: number): string {
  const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  const mix = (i: number) => Math.round(channel(a, i) * ratio + channel(b, i) * (1 - ratio)).toString(16).padStart(2, "0");
  return `#${mix(0)}${mix(1)}${mix(2)}`;
}

/** Thin bar of `width` cells: [done part, rest]. */
export function meter(theme: Theme, value: number, max: number, width: number, color?: string) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const filled = Math.round(ratio * width);
  const tone = color ?? usageColor(theme, Math.round(ratio * 100));
  return [fg(tone)("━".repeat(filled)), fg(theme.border)("━".repeat(Math.max(0, width - filled)))] as const;
}
