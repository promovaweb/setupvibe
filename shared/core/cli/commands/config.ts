/**
 * `config` command: reads and writes settings.json.
 *
 * Subcommands: `list`, `get`, `set`, `unset`, `path` and `schema`. Keys use
 * dot notation. Values are converted according to `SETTINGS_SCHEMA`.
 */
import { manifest } from "../../app/manifest.ts";
import { ExitCode } from "../../app/exit-codes.ts";
import { error } from "../../app/errors.ts";
import { paths, exists } from "../../config/paths.ts";
import {
  SETTINGS_SCHEMA,
  flatten,
  convertValue,
  definitionOf,
  setPath,
  writeSettings,
  readSettings,
  getPath,
  removePath,
} from "../../config/settings.ts";
import { blocks, color, section, table } from "../format.ts";
import type { Command } from "../registry.ts";

const codes = [ExitCode.CONFIG, ExitCode.PERMISSION, ExitCode.NOT_FOUND] as const;

const list: Command = {
  name: "list",
  aliases: ["ls"],
  description: "List every key with its effective value (file merged with defaults).",
  exitCodes: codes,
  examples: [`${manifest.bin} config list`, `${manifest.bin} config list --json`],
  run: () => {
    const settings = readSettings();
    const pairs = flatten(settings);
    return {
      data: { file: paths.settings(), exists: exists(paths.settings()), values: Object.fromEntries(pairs) },
      text: () =>
        blocks(
          `${color.dim("File:")} ${paths.settings()}${exists(paths.settings()) ? "" : color.dim(" (not created yet; defaults)")}`,
          table(pairs.map(([k, v]) => [k, JSON.stringify(v)])),
        ),
    };
  },
};

const get: Command = {
  name: "get",
  description: "Show the value of a key.",
  arguments: [{ name: "key", description: "Key in dot notation, e.g. output.format.", required: true }],
  exitCodes: codes,
  examples: [`${manifest.bin} config get tui.initialTab`],
  run: (ctx) => {
    const key = ctx.args[0] as string;
    const value = getPath(readSettings(), key);
    if (value === undefined) {
      throw error.config(`Key "${key}" does not exist. See "${manifest.bin} config schema".`, { key });
    }
    return { data: { key, value }, text: () => (typeof value === "string" ? value : JSON.stringify(value)) };
  },
};

const set: Command = {
  name: "set",
  description: "Write a value to settings.json, converting the type according to the schema.",
  arguments: [
    { name: "key", description: "Key in dot notation.", required: true },
    { name: "value", description: "Value as text. Booleans accept true/false, yes/no, 1/0, on/off.", required: true },
  ],
  exitCodes: codes,
  examples: [`${manifest.bin} config set output.format json`, `${manifest.bin} config set output.colors false`],
  run: (ctx) => {
    const [key, text] = ctx.args as [string, string];
    const value = convertValue(key, text);
    const settings = readSettings();
    setPath(settings, key, value);
    const file = writeSettings(settings);
    const unknownKey = definitionOf(key) === undefined;
    return {
      data: { key, value, file, unknownKey },
      text: () => `${color.ok("✓")} ${key} = ${JSON.stringify(value)}${unknownKey ? color.dim(" (key outside the schema, stored as text)") : ""}`,
    };
  },
};

const unset: Command = {
  name: "unset",
  aliases: ["rm"],
  description: "Remove a key from the file. The key falls back to its default, if any.",
  arguments: [{ name: "key", description: "Key in dot notation.", required: true }],
  exitCodes: codes,
  examples: [`${manifest.bin} config unset telemetry.enabled`],
  run: (ctx) => {
    const key = ctx.args[0] as string;
    const settings = exists(paths.settings()) ? readSettings() : {};
    const removed = removePath(settings, key);
    if (removed) writeSettings(settings);
    return {
      data: { key, removed },
      text: () => (removed ? `${color.ok("✓")} ${key} removed` : `${color.warn("•")} ${key} was not stored`),
    };
  },
};

const path: Command = {
  name: "path",
  description: "Print the data directory and file paths.",
  examples: [`${manifest.bin} config path`],
  run: () => {
    const d = { base: paths.base(), settings: paths.settings(), credentials: paths.credentials(), masterKey: paths.masterKey() };
    return {
      data: d,
      text: () =>
        table([
          ["Directory", d.base],
          ["settings.json", d.settings],
          ["credentials.json", d.credentials],
          ["master.key", d.masterKey],
        ]),
    };
  },
};

const schema: Command = {
  name: "schema",
  description: "List the known keys with type, default and description.",
  examples: [`${manifest.bin} config schema --json`],
  run: () => ({
    data: { keys: SETTINGS_SCHEMA.map((d) => ({ ...d })) },
    text: () =>
      blocks(
        section("Known keys"),
        table(
          SETTINGS_SCHEMA.map((d) => [
            d.key,
            `${d.description} ${color.dim(`[${d.type}${d.values ? `: ${d.values.join("|")}` : ""}; default ${JSON.stringify(d.default)}]`)}`,
          ]),
        ),
      ),
  }),
};

export const configCommand: Command = {
  name: "config",
  description: `Read and write preferences in ~/.${manifest.bin}/settings.json.`,
  longDescription:
    `Preferences are stored in plain text at ${paths.settings()}. Nested keys use dot\n` +
    `notation. Keys outside the schema are accepted as text to leave room for project\n` +
    `extensions. Secrets never go here: use "${manifest.bin} credentials".`,
  subcommands: [list, get, set, unset, path, schema],
  exitCodes: codes,
};
