/**
 * Writes dist/SHA256SUMS for the release binaries.
 *
 * The one-line installers download `SHA256SUMS` from the GitHub Release and
 * refuse a binary that is not listed or does not match. Run after
 * `bun run build:all`.
 *
 * Usage: bun run scripts/checksums.ts
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const files = readdirSync("dist")
  .filter((name) => /^setupvibe(-server)?-(linux|darwin|windows)-(x64|arm64)(\.exe)?$/.test(name))
  .sort();
if (files.length === 0) {
  console.error("✗ No release binaries in dist/. Run: bun run build:all");
  process.exit(1);
}
const lines = files.map((name) => `${createHash("sha256").update(readFileSync(join("dist", name))).digest("hex")}  ${name}`);
writeFileSync(join("dist", "SHA256SUMS"), `${lines.join("\n")}\n`);
console.log(`✓ dist/SHA256SUMS (${files.length} files)`);
