/**
 * Looks for newer versions of the inventory items installed through mise and
 * updates the inventories (spec section 17: `inventory bump`).
 *
 * Only items with `versionPolicy: "exact"` are checked. For a mise install
 * entry the version comes from `mise latest <tool>`. Items pinned by series
 * (`node@24`, `python@3.14`, `ruby@3.4`) stay on their line. For an
 * `archive` entry downloaded from GitHub releases (Nerd Fonts), the version
 * comes from the latest release and every file is downloaded again to record
 * its new SHA-256, so the bump never leaves a stale checksum behind.
 *
 * Usage:
 *   bun run scripts/inventory-bump.ts            # report only
 *   bun run scripts/inventory-bump.ts --write    # update the inventory files
 *   bun run scripts/inventory-bump.ts --write --pr
 *     # also commit on a new branch and open a pull request against v2 with gh
 *
 * Run `bun test shared/tests` after --write: tests catch a version that no
 * longer matches its check.
 */
import { readFileSync, writeFileSync } from "node:fs";
import type { Inventory, Item } from "../shared/inventory.ts";

/** Lines that stay pinned to a major or minor series. */
export const SERIES: Record<string, string> = { node: "24", python: "3.14", ruby: "3.4" };

/** mise tool to query for an item, without a version suffix. */
export function bumpTool(item: Item): string | undefined {
  if (item.versionPolicy !== "exact") return undefined;
  const entry = item.install.all ?? item.install.unix ?? item.install.linux;
  if (!entry || entry.method !== "mise" || !entry.tool) return undefined;
  const tool = entry.tool.replace(/@v?\{version\}$/, "");
  if (tool.includes("git+")) return undefined;
  const series = SERIES[item.id];
  return series ? `${tool}@${series}` : tool;
}

/** Applies a new version to an item, keeping verify.expect in step. */
export function applyVersion(item: Item, version: string): Item {
  const expect = item.verify.expect === item.version ? version : item.verify.expect?.replace(item.version, version);
  return { ...item, version, verify: { ...item.verify, ...(expect ? { expect } : {}) } };
}

/** GitHub owner/repo of an exact item installed from release archives. */
export function archiveRepo(item: Item): string | undefined {
  if (item.versionPolicy !== "exact") return undefined;
  for (const entry of Object.values(item.install)) {
    if (entry?.method !== "archive") continue;
    const m = entry.files?.[0]?.url.match(/^https:\/\/github\.com\/([^/]+\/[^/]+)\/releases\/download\/v?\{version\}\//);
    if (m) return m[1];
  }
  return undefined;
}

/** URL templates of the archive files of an item. */
export function archiveUrls(item: Item): string[] {
  return [...new Set(Object.values(item.install).flatMap((e) => (e?.method === "archive" ? (e.files ?? []).map((f) => f.url) : [])))];
}

/** Applies a new version and the new checksums (by URL template) to an archive item. */
export function applyArchiveVersion(item: Item, version: string, hashes: Record<string, string>): Item {
  const install = Object.fromEntries(
    Object.entries(item.install).map(([key, e]) => [key, e?.method === "archive" ? { ...e, files: (e.files ?? []).map((f) => ({ ...f, sha256: hashes[f.url] ?? f.sha256 })) } : e]),
  ) as Item["install"];
  return { ...applyVersion(item, version), install };
}

async function latestRelease(repo: string): Promise<string | undefined> {
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  const r = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, { headers: { accept: "application/vnd.github+json", ...(token ? { authorization: `Bearer ${token}` } : {}) } });
  if (!r.ok) return undefined;
  const tag = ((await r.json()) as { tag_name?: string }).tag_name?.replace(/^v/, "");
  return tag && /^\d+(\.\d+)+$/.test(tag) ? tag : undefined;
}

async function sha256Of(url: string): Promise<string> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return new Bun.CryptoHasher("sha256").update(new Uint8Array(await r.arrayBuffer())).digest("hex");
}

function latest(tool: string): string | undefined {
  const r = Bun.spawnSync(["mise", "latest", tool], { stdout: "pipe", stderr: "ignore" });
  const v = r.stdout.toString().trim();
  return r.exitCode === 0 && /^\d+(\.\d+)+$/.test(v) ? v : undefined;
}

if (import.meta.main) {
  const write = process.argv.includes("--write");
  const pr = process.argv.includes("--pr");
  const files = ["desktop/inventory.json", "server/inventory.json"];
  const changes: { id: string; from: string; to: string }[] = [];
  const cache = new Map<string, string | undefined>();
  for (const file of files) {
    const inv = JSON.parse(readFileSync(file, "utf8")) as Inventory;
    const archived: Item[] = [];
    for (const item of inv.items) {
      const repo = archiveRepo(item);
      if (!repo) {
        archived.push(item);
        continue;
      }
      if (!cache.has(repo)) cache.set(repo, await latestRelease(repo));
      const next = cache.get(repo);
      if (!next || next === item.version) {
        archived.push(item);
        continue;
      }
      if (!changes.some((c) => c.id === item.id)) changes.push({ id: item.id, from: item.version, to: next });
      // Checksums are only computed when writing: each archive can be large.
      const hashes: Record<string, string> = {};
      if (write) for (const url of archiveUrls(item)) hashes[url] = await sha256Of(url.replaceAll("{version}", next));
      archived.push(write ? applyArchiveVersion(item, next, hashes) : item);
    }
    inv.items = archived.map((item) => {
      const tool = bumpTool(item);
      if (!tool) return item;
      if (!cache.has(tool)) cache.set(tool, latest(tool));
      const next = cache.get(tool);
      if (!next || next === item.version) return item;
      if (!changes.some((c) => c.id === item.id)) changes.push({ id: item.id, from: item.version, to: next });
      return applyVersion(item, next);
    });
    if (write && changes.length) {
      inv.updated = new Date().toISOString().slice(0, 10);
      writeFileSync(file, `${JSON.stringify(inv, null, 2)}\n`);
    }
  }
  if (!changes.length) {
    console.log("✓ Every mise and archive item is on its latest version.");
    process.exit(0);
  }
  for (const c of changes) console.log(`↑ ${c.id.padEnd(20)} ${c.from} → ${c.to}`);
  if (!write) {
    console.log(`\n${changes.length} update(s). Run with --write to apply.`);
    process.exit(0);
  }
  if (pr) {
    const branch = `inventory-bump-${new Date().toISOString().slice(0, 10)}`;
    const body = changes.map((c) => `- ${c.id}: ${c.from} → ${c.to}`).join("\n");
    for (const argv of [
      ["git", "switch", "-c", branch],
      ["git", "add", ...files],
      ["git", "commit", "-m", `chore(inventory): bump ${changes.length} item(s)\n\n${body}`],
      ["git", "push", "-u", "origin", branch],
      ["gh", "pr", "create", "--base", "v2", "--title", `Inventory bump: ${changes.length} item(s)`, "--body", `${body}\n\nGenerated by scripts/inventory-bump.ts. Review, run bun run validate and the container tests before merging.`],
    ]) {
      const r = Bun.spawnSync(argv, { stdout: "inherit", stderr: "inherit" });
      if (r.exitCode !== 0) process.exit(r.exitCode ?? 1);
    }
  }
}
