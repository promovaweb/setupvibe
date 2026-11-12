/**
 * Reading and writing settings.json.
 *
 * The file keeps preferences in plain text. Nested keys use dot notation
 * (`output.format`). The schema below lists the keys the skeleton knows;
 * derived projects extend `SETTINGS_SCHEMA` and get validation, defaults and
 * automatic documentation in the `config` command help.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { paths, exists, ensureBaseDir } from "./paths.ts";
import { classifyFsError, error } from "../app/errors.ts";
import { ExitCode } from "../app/exit-codes.ts";

/** Type accepted by a settings key. */
export type SettingType = "string" | "number" | "boolean" | "enum";

/** Description of a known key. */
export interface SettingDefinition {
  key: string;
  type: SettingType;
  default: string | number | boolean;
  description: string;
  /** Accepted values when `type` is `enum`. */
  values?: readonly string[];
}

/** Schema of the keys the skeleton recognizes. */
export const SETTINGS_SCHEMA: readonly SettingDefinition[] = Object.freeze([
  {
    key: "output.format",
    type: "enum",
    default: "text",
    values: ["text", "json"],
    description: "Default CLI output format when --json is not given.",
  },
  {
    key: "output.colors",
    type: "boolean",
    default: true,
    description: "Use ANSI colors in text output. NO_COLOR=1 always disables them.",
  },
  {
    key: "tui.initialTab",
    type: "enum",
    default: "overview",
    values: ["overview", "inventory", "user", "doctor", "logs", "tailscale", "machine", "about"],
    description: "Tab opened when the TUI starts; overview is the Home tab.",
  },
  {
    key: "tui.language",
    type: "enum",
    default: "pt-BR",
    values: ["pt-BR", "en"],
    description: "TUI language; the L key or the PT · EN switch in the header changes it.",
  },
  {
    key: "tui.mouse",
    type: "boolean",
    default: true,
    description: "Mouse in the TUI: click tabs, items, buttons and keys, scroll lists. Shift+drag still selects text.",
  },
  {
    key: "shell.agentAliases",
    type: "boolean",
    default: true,
    description: "Write the agent aliases (cco, cxo, oco, cx, oc) that skip the permission prompts. Run shell apply after changing it.",
  },
  {
    key: "tui.theme",
    type: "enum",
    default: "night",
    values: ["night", "day"],
    description: "TUI palette. `night` is the default modern unix palette.",
  },
  {
    key: "telemetry.enabled",
    type: "boolean",
    default: false,
    description: "Reserved for derived projects. The skeleton sends nothing.",
  },
]);

export type Settings = Record<string, unknown>;

/** Returns an object with every default value, already nested. */
export function defaultSettings(): Settings {
  const result: Settings = {};
  for (const def of SETTINGS_SCHEMA) setPath(result, def.key, def.default);
  return result;
}

/** Reads settings.json. A missing file yields the defaults. */
export function readSettings(): Settings {
  const path = paths.settings();
  if (!exists(path)) return defaultSettings();
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (e) {
    throw classifyFsError(e, ExitCode.CONFIG, `Failed to read ${path}`);
  }
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw error.config(`${path} does not contain valid JSON.`, { path });
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw error.config(`${path} must contain a JSON object.`, { path });
  }
  return merge(defaultSettings(), data as Settings);
}

/** Writes settings.json with two-space indentation. */
export function writeSettings(settings: Settings): string {
  ensureBaseDir();
  const path = paths.settings();
  try {
    writeFileSync(path, `${JSON.stringify(settings, null, 2)}\n`, { mode: 0o600 });
  } catch (e) {
    throw classifyFsError(e, ExitCode.CONFIG, `Failed to write ${path}`);
  }
  return path;
}

/** Reads a value by dot path. Returns `undefined` when absent. */
export function getPath(object: Settings, key: string): unknown {
  return key.split(".").reduce<unknown>((current, part) => {
    if (current && typeof current === "object") return (current as Record<string, unknown>)[part];
    return undefined;
  }, object);
}

/** Sets a value by dot path, creating intermediate levels. */
export function setPath(object: Settings, key: string, value: unknown): void {
  const parts = key.split(".");
  let current: Record<string, unknown> = object;
  for (const part of parts.slice(0, -1)) {
    if (!current[part] || typeof current[part] !== "object") current[part] = {};
    current = current[part] as Record<string, unknown>;
  }
  current[parts[parts.length - 1] as string] = value;
}

/** Removes a value by dot path. Returns `true` when something was removed. */
export function removePath(object: Settings, key: string): boolean {
  const parts = key.split(".");
  let current: Record<string, unknown> = object;
  for (const part of parts.slice(0, -1)) {
    const next = current[part];
    if (!next || typeof next !== "object") return false;
    current = next as Record<string, unknown>;
  }
  const last = parts[parts.length - 1] as string;
  if (!(last in current)) return false;
  delete current[last];
  return true;
}

/** Finds the schema definition of a key. */
export function definitionOf(key: string): SettingDefinition | undefined {
  return SETTINGS_SCHEMA.find((def) => def.key === key);
}

/**
 * Converts the text typed in the terminal to the type declared in the
 * schema. Keys outside the schema are accepted as strings, leaving room for
 * derived-project extensions; `--help` marks them as free keys.
 */
export function convertValue(key: string, text: string): unknown {
  const def = definitionOf(key);
  if (!def) return text;
  switch (def.type) {
    case "boolean": {
      const lower = text.toLowerCase();
      if (["true", "1", "yes", "on"].includes(lower)) return true;
      if (["false", "0", "no", "off"].includes(lower)) return false;
      throw error.config(`"${key}" expects true or false; got "${text}".`, { key, value: text });
    }
    case "number": {
      const number = Number(text);
      if (!Number.isFinite(number)) {
        throw error.config(`"${key}" expects a number; got "${text}".`, { key, value: text });
      }
      return number;
    }
    case "enum": {
      if (!def.values?.includes(text)) {
        throw error.config(`"${key}" accepts only: ${def.values?.join(", ")}; got "${text}".`, {
          key,
          value: text,
          accepted: def.values,
        });
      }
      return text;
    }
    default:
      return text;
  }
}

/** Flattens a nested object into `dot.key = value` pairs. */
export function flatten(object: Settings, prefix = ""): Array<[string, unknown]> {
  const pairs: Array<[string, unknown]> = [];
  for (const [k, v] of Object.entries(object)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) pairs.push(...flatten(v as Settings, key));
    else pairs.push([key, v]);
  }
  return pairs.sort((a, b) => a[0].localeCompare(b[0]));
}

function merge(base: Settings, extra: Settings): Settings {
  const out: Settings = { ...base };
  for (const [k, v] of Object.entries(extra)) {
    const current = out[k];
    if (v && typeof v === "object" && !Array.isArray(v) && current && typeof current === "object") {
      out[k] = merge(current as Settings, v as Settings);
    } else {
      out[k] = v;
    }
  }
  return out;
}
