/**
 * Publishes the state file schemas as JSON Schema in shared/schemas/.
 *
 * Usage: bun scripts/state-schemas.ts          (check, exit 1 when stale)
 *        bun scripts/state-schemas.ts --write  (rewrite the files)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { jsonSchemaFor, STATE_SCHEMAS } from "../shared/state/schemas.ts";

const dir = join(import.meta.dir, "..", "shared", "schemas");
let stale = 0;
for (const file of Object.keys(STATE_SCHEMAS) as Array<keyof typeof STATE_SCHEMAS>) {
  const path = join(dir, file.replace(".json", ".schema.json"));
  const text = `${JSON.stringify(jsonSchemaFor(file), null, 2)}\n`;
  let current = "";
  try {
    current = readFileSync(path, "utf8");
  } catch {
    // Missing: stale.
  }
  if (current === text) continue;
  stale++;
  if (process.argv.includes("--write")) writeFileSync(path, text);
  console.log(`${process.argv.includes("--write") ? "wrote" : "stale"} ${path}`);
}
if (stale && !process.argv.includes("--write")) process.exit(1);
