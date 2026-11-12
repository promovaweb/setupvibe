/**
 * Text output formatting.
 *
 * Centralizes ANSI colors, two-column tables and section titles. Colors
 * honor, in this order: `--no-color`, `NO_COLOR`, absence of a TTY and the
 * `output.colors` preference in settings.json. JSON never goes through here.
 */
import { readSettings, getPath } from "../config/settings.ts";

let forcedColors: boolean | undefined;

/** Lets `main.ts` disable colors from `--no-color`. */
export function forceColors(enabled: boolean | undefined): void {
  forcedColors = enabled;
}

/** Decides whether text output uses colors. */
export function useColors(): boolean {
  if (forcedColors !== undefined) return forcedColors;
  if (process.env.NO_COLOR && process.env.NO_COLOR !== "") return false;
  if (!process.stdout.isTTY) return false;
  try {
    return getPath(readSettings(), "output.colors") !== false;
  } catch {
    return true;
  }
}

function paint(code: string, text: string): string {
  return useColors() ? `\u001b[${code}m${text}\u001b[0m` : text;
}

/** Minimal text palette. Names follow the role, not the hue. */
export const color = {
  title: (t: string) => paint("1;36", t),
  strong: (t: string) => paint("1", t),
  dim: (t: string) => paint("2", t),
  ok: (t: string) => paint("32", t),
  warn: (t: string) => paint("33", t),
  error: (t: string) => paint("31", t),
  code: (t: string) => paint("35", t),
};

/** Two-column table aligned to the widest key. */
export function table(rows: Array<[string, string]>, indent = 2): string {
  if (rows.length === 0) return "";
  const width = Math.max(...rows.map(([k]) => k.length));
  const pad = " ".repeat(indent);
  return rows.map(([k, v]) => `${pad}${color.strong(k.padEnd(width))}  ${v}`).join("\n");
}

/** Section header in help and command output. */
export function section(title: string): string {
  return color.title(title);
}

/** Joins blocks with a blank line, skipping empty ones. */
export function blocks(...parts: Array<string | undefined | false>): string {
  return parts.filter((p): p is string => typeof p === "string" && p.length > 0).join("\n\n");
}
