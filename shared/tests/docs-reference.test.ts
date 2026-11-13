/**
 * Embedded reference coverage.
 *
 * The manuals in `desktop/docs/` and `server/docs/` publish the configuration
 * keys and the exit codes of the binary. This test reads the same code the
 * binary reads and refuses a manual that drops a key, a code, one of the five
 * examples of `config set`, `config get` and `config unset`, a link to a file
 * of the folder or a relative link whose target does not exist.
 *
 * The settings schema lives behind the edition registry, so the desktop entry
 * point is imported first, as in the other tests.
 */
import "../../desktop/src/edition.ts";
import { expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { SETTINGS_SCHEMA } from "../core/config/settings.ts";
import { exitCodeDescriptions } from "../core/app/exit-codes.ts";

const repo = join(import.meta.dir, "..", "..");

/** Folders of the embedded documentation, one language each. */
const folders = ["desktop/docs", "desktop/docs/en", "server/docs", "server/docs/en"];

/** Manuals this test owns; `cli.md` and `mcp.md` have their own coverage. */
const manuals = ["README.md", "configuration.md", "exit-codes.md", "tui.md", "troubleshooting.md", "migration.md"];

const read = (folder: string, file: string) => readFileSync(join(repo, folder, file), "utf8");

test("every folder publishes the six reference manuals", () => {
  for (const folder of folders) {
    const missing = manuals.filter((file) => !existsSync(join(repo, folder, file)));
    expect({ folder, missing }).toEqual({ folder, missing: [] });
  }
});

test("every settings key appears in the four configuration manuals", () => {
  for (const folder of folders) {
    const markdown = read(folder, "configuration.md");
    const missing = SETTINGS_SCHEMA.map((def) => def.key).filter((key) => !markdown.includes(`\`${key}\``));
    expect({ folder, missing }).toEqual({ folder, missing: [] });
  }
});

test("every settings type, default and accepted value is documented", () => {
  for (const folder of folders) {
    const markdown = read(folder, "configuration.md");
    const gaps = SETTINGS_SCHEMA.flatMap((def) => {
      const problems: string[] = [];
      if (!markdown.includes(def.type)) problems.push(`${def.key}: type ${def.type}`);
      if (!markdown.includes(String(def.default))) problems.push(`${def.key}: default ${def.default}`);
      for (const value of def.values ?? []) if (!markdown.includes(value)) problems.push(`${def.key}: value ${value}`);
      return problems;
    });
    expect({ folder, gaps }).toEqual({ folder, gaps: [] });
  }
});

test("configuration manuals keep five distinct examples of set, get and unset", () => {
  for (const folder of folders) {
    const markdown = read(folder, "configuration.md");
    const lines = (verb: string) =>
      new Set(markdown.split("\n").filter((line) => line.includes(`{{bin}} config ${verb} `)).map((line) => line.trim()));
    const short = { set: lines("set").size, get: lines("get").size, unset: lines("unset").size };
    expect({ folder, short: Object.entries(short).filter(([, count]) => count < 5) }).toEqual({ folder, short: [] });
  }
});

test("every exit code appears with its name in the four tables", () => {
  for (const folder of folders) {
    const markdown = read(folder, "exit-codes.md");
    const missing = exitCodeDescriptions
      .filter((entry) => !markdown.includes(`| ${entry.code} | \`${entry.name}\` |`))
      .map((entry) => `${entry.code} ${entry.name}`);
    expect({ folder, missing }).toEqual({ folder, missing: [] });
  }
});

test("each README links to every manual of its folder", () => {
  for (const folder of folders) {
    const markdown = read(folder, "README.md");
    const files = readdirSync(join(repo, folder)).filter((file) => file.endsWith(".md") && file !== "README.md");
    const missing = files.filter((file) => !markdown.includes(`](${file})`));
    expect({ folder, missing }).toEqual({ folder, missing: [] });
  }
});

test("relative links of the reference manuals resolve", () => {
  for (const folder of folders) {
    for (const file of manuals) {
      const markdown = read(folder, file);
      const broken = [...markdown.matchAll(/\]\(([^)]+)\)/g)]
        .map((match) => match[1]!)
        .filter((target) => !target.startsWith("#") && !/^[a-z]+:/i.test(target))
        .filter((target) => !existsSync(normalize(join(repo, folder, dirname(file), target.split("#")[0]!))));
      expect({ folder, file, broken }).toEqual({ folder, file, broken: [] });
    }
  }
});
