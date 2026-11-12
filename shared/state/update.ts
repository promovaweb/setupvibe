/**
 * Update check.
 *
 * At start-up, the TUI and the CLI check `version.json` on the v2 branch for
 * a newer SetupVibe. The check has a short timeout and caches the answer for
 * six hours in `~/.setupvibe/state/update-check.json`; without network the
 * binary carries on. Spec sections 10 and 11.
 */
import { existsSync, readFileSync } from "node:fs";
import { VERSION_MANIFEST_URL } from "../repo.ts";
import { statePath, writeJsonAtomic } from "./store.ts";

export type Channel = "stable" | "beta";

/** Content of version.json at the root of the v2 branch. */
export interface VersionManifest {
  schemaVersion: 1;
  channels: Record<Channel, { version: string; minimum: string; changelog: string }>;
}

export interface UpdateStatus {
  current: string;
  latest?: string;
  minimum?: string;
  changelog?: string;
  updateAvailable: boolean;
  updateRequired: boolean;
  checkedAt: string;
  source: "network" | "cache" | "offline";
}

/** Cache lifetime: six hours. */
export const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

/**
 * Compares SemVer versions, prerelease included
 * (`2.0.0-dev.2` < `2.0.0-dev.10` < `2.0.0`).
 */
export function compareSemver(a: string, b: string): number {
  const parse = (v: string) => {
    const [core, pre] = v.replace(/^v/, "").split("-", 2) as [string, string | undefined];
    return { nums: core.split(".").map((n) => Number.parseInt(n, 10) || 0), pre };
  };
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < 3; i++) {
    const diff = (pa.nums[i] ?? 0) - (pb.nums[i] ?? 0);
    if (diff !== 0) return diff;
  }
  if (pa.pre === pb.pre) return 0;
  if (pa.pre === undefined) return 1;
  if (pb.pre === undefined) return -1;
  const ia = pa.pre.split(".");
  const ib = pb.pre.split(".");
  for (let i = 0; i < Math.max(ia.length, ib.length); i++) {
    const x = ia[i];
    const y = ib[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const nx = Number(x);
    const ny = Number(y);
    if (!Number.isNaN(nx) && !Number.isNaN(ny)) {
      if (nx !== ny) return nx - ny;
    } else if (x !== y) {
      return x < y ? -1 : 1;
    }
  }
  return 0;
}

/** Status for `current` against a manifest channel. */
export function evaluate(current: string, manifest: VersionManifest, channel: Channel, source: UpdateStatus["source"], now: Date): UpdateStatus {
  const entry = manifest.channels[channel];
  return {
    current,
    latest: entry.version,
    minimum: entry.minimum,
    changelog: entry.changelog,
    updateAvailable: compareSemver(entry.version, current) > 0,
    updateRequired: compareSemver(current, entry.minimum) < 0,
    checkedAt: now.toISOString(),
    source,
  };
}

interface CacheFile {
  fetchedAt: string;
  manifest: VersionManifest;
}

/**
 * Checks for updates, using the cache when it is fresh.
 *
 * @param options.fetcher replaceable in tests; defaults to `fetch`
 * @param options.timeoutMs network timeout, two seconds by default
 */
export async function checkForUpdate(
  current: string,
  channel: Channel,
  options: { now?: Date; fetcher?: typeof fetch; timeoutMs?: number; force?: boolean } = {},
): Promise<UpdateStatus> {
  const now = options.now ?? new Date();
  const cachePath = statePath("state", "update-check.json");
  if (!options.force && existsSync(cachePath)) {
    try {
      const cache = JSON.parse(readFileSync(cachePath, "utf8")) as CacheFile;
      if (now.getTime() - new Date(cache.fetchedAt).getTime() < CACHE_TTL_MS) {
        return evaluate(current, cache.manifest, channel, "cache", now);
      }
    } catch {
      // A broken cache is ignored and replaced.
    }
  }
  try {
    const response = await (options.fetcher ?? fetch)(VERSION_MANIFEST_URL, { signal: AbortSignal.timeout(options.timeoutMs ?? 2000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const manifest = (await response.json()) as VersionManifest;
    writeJsonAtomic(cachePath, { fetchedAt: now.toISOString(), manifest } satisfies CacheFile);
    return evaluate(current, manifest, channel, "network", now);
  } catch {
    return { current, updateAvailable: false, updateRequired: false, checkedAt: now.toISOString(), source: "offline" };
  }
}
