/**
 * Daily inventory health check (spec section 17).
 *
 * - Every APT repository key is downloaded and its primary fingerprint must
 *   still match the inventory: a vendor key rotation shows up here before it
 *   breaks an installation.
 * - Every pinned archive must still download and match its SHA-256.
 * - Every installer, manifest and repository URL must still answer.
 *
 * Exits with 1 when something changed. Run by .github/workflows/v2-health.yml.
 *
 * Usage: bun run scripts/inventory-health.ts
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import type { Inventory } from "../shared/inventory.ts";

interface Problem {
  where: string;
  detail: string;
}

/** Fills the placeholders of a repository URL for one distribution. */
export function fillRepoUrl(url: string, distro: string, codename: string): string {
  return url.replaceAll("{distro}", distro).replaceAll("{codename}", codename).replaceAll("{ubuntu_codename}", codename);
}

/** Primary fingerprint of an OpenPGP key, through gpg. */
function fingerprint(key: Uint8Array): string | undefined {
  const r = Bun.spawnSync(["gpg", "--show-keys", "--with-colons"], { stdin: key, stdout: "pipe", stderr: "ignore" });
  return r.stdout.toString().split("\n").find((l) => l.startsWith("fpr:"))?.split(":")[9];
}

async function get(url: string): Promise<Response | undefined> {
  try {
    return await fetch(url, { signal: AbortSignal.timeout(60_000), redirect: "follow" });
  } catch {
    return undefined;
  }
}

if (import.meta.main) {
  const problems: Problem[] = [];
  const seen = new Set<string>();
  for (const file of ["desktop/inventory.json", "server/inventory.json"]) {
    const inv = JSON.parse(readFileSync(file, "utf8")) as Inventory;
    for (const [name, repo] of Object.entries(inv.repositories)) {
      if (seen.has(`repo:${name}`)) continue;
      seen.add(`repo:${name}`);
      const distro = repo.systems.includes("debian") ? "debian" : "ubuntu";
      const codename = distro === "debian" ? "trixie" : "noble";
      const res = await get(fillRepoUrl(repo.key, distro, codename));
      if (!res?.ok) {
        problems.push({ where: `repository ${name}`, detail: `key URL answered ${res?.status ?? "no response"}` });
        continue;
      }
      const fpr = fingerprint(new Uint8Array(await res.arrayBuffer()));
      if (!fpr || !repo.fingerprints.includes(fpr)) problems.push({ where: `repository ${name}`, detail: `fingerprint ${fpr ?? "missing"} is not ${repo.fingerprints.join(", ")}` });
      else console.log(`✓ repository ${name}: ${fpr}`);
    }
    for (const item of inv.items) {
      for (const entry of Object.values(item.install)) {
        for (const archive of entry?.files ?? []) {
          const url = archive.url.replaceAll("{version}", item.version);
          if (seen.has(url)) continue;
          seen.add(url);
          const res = await get(url);
          if (!res?.ok) {
            problems.push({ where: `${item.id} archive`, detail: `${url} answered ${res?.status ?? "no response"}` });
            continue;
          }
          const sha = createHash("sha256").update(new Uint8Array(await res.arrayBuffer())).digest("hex");
          if (sha !== archive.sha256) problems.push({ where: `${item.id} archive`, detail: `${url} has SHA-256 ${sha}, inventory pins ${archive.sha256}` });
          else console.log(`✓ ${item.id}: ${url.split("/").pop()}`);
        }
        if (entry?.method === "installer" && entry.url && !entry.url.includes("{os}")) {
          const url = entry.url.replaceAll("{version}", item.version);
          if (seen.has(url)) continue;
          seen.add(url);
          const res = await get(url);
          if (!res?.ok) problems.push({ where: `${item.id} installer`, detail: `${url} answered ${res?.status ?? "no response"}` });
          else console.log(`✓ ${item.id}: ${url}`);
        }
      }
    }
  }
  if (problems.length) {
    console.error(`\n✗ ${problems.length} problem(s):`);
    for (const p of problems) console.error(`- ${p.where}: ${p.detail}`);
    process.exit(1);
  }
  console.log("\n✓ Inventory sources are healthy.");
}
