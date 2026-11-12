/** State files, run log, checksums and update check (spec sections 4, 9 and 11). */
import "../../desktop/src/edition.ts";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HOME_VARIABLE } from "../core/config/paths";
import { ensureStateDirs, readState, registerMigration, SCHEMA_VERSIONS, statePath, writeState } from "../state/store";
import { maskSecrets, openRunLog } from "../state/log";
import { ChecksumMismatch, digest, findInChecksumList, verify } from "../state/checksum";
import { checkForUpdate, compareSemver, type VersionManifest } from "../state/update";

let dir: string;
const previous = process.env[HOME_VARIABLE];

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "setupvibe-state-"));
  process.env[HOME_VARIABLE] = dir;
  ensureStateDirs();
});
afterAll(() => {
  if (previous === undefined) delete process.env[HOME_VARIABLE];
  else process.env[HOME_VARIABLE] = previous;
  rmSync(dir, { recursive: true, force: true });
});

describe("state files", () => {
  test("missing files return the fallback with the current schema", () => {
    expect(readState<Record<string, unknown>>("selection.json", { items: [] })).toEqual({ items: [], schemaVersion: SCHEMA_VERSIONS["selection.json"] });
  });

  test("writes are atomic and carry schemaVersion", () => {
    writeState("config.json", { user: "deploy" });
    const data = JSON.parse(readFileSync(statePath("config.json"), "utf8"));
    expect(data).toEqual({ user: "deploy", schemaVersion: 1 });
    expect(readdirSync(dir).some((f) => f.includes(".tmp-"))).toBe(false);
  });

  test("older files are migrated and backed up", () => {
    writeFileSync(statePath("external.json"), JSON.stringify({ schemaVersion: 0, apps: ["jq"] }));
    registerMigration("external.json", 0, (d) => ({ apps: (d.apps as string[]).map((tool) => ({ tool })) }));
    expect(readState<Record<string, unknown>>("external.json", { apps: [] })).toEqual({ apps: [{ tool: "jq" }], schemaVersion: 1 });
    expect(readdirSync(statePath("backups")).some((f) => f.startsWith("external.json.schema-0"))).toBe(true);
  });

  test("newer files are refused", () => {
    writeFileSync(statePath("selection.json"), JSON.stringify({ schemaVersion: 99 }));
    expect(() => readState("selection.json", {})).toThrow("newer than this SetupVibe");
  });
});

describe("run log", () => {
  test("writes NDJSON events and masks secrets", () => {
    const log = openRunLog("auto", { now: () => new Date("2026-11-12T10:00:00Z") });
    process.env.TAILSCALE_AUTHKEY = "tskey-secret-1234";
    log.event({ item: "tailscale", action: "install", status: "ok", message: "joined with tskey-secret-1234" });
    delete process.env.TAILSCALE_AUTHKEY;
    expect(log.path).toContain("2026-11-12T10-00-00-000Z-auto.log");
    const line = JSON.parse(readFileSync(log.path, "utf8").trim());
    expect(line).toMatchObject({ item: "tailscale", action: "install", status: "ok", message: "joined with ***" });
  });

  test("maskSecrets leaves text without secrets unchanged", () => {
    expect(maskSecrets("nothing here", {})).toBe("nothing here");
  });
});

describe("checksums", () => {
  test("digests and verification", () => {
    expect(digest("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(() => verify("abc", "BA7816BF8F01CFEA414140DE5DAE2223B00361A396177A9CB410FF61F20015AD", "sha256", "abc")).not.toThrow();
    expect(() => verify("abd", digest("abc"), "sha256", "abd")).toThrow(ChecksumMismatch);
  });

  test("finds a file in a checksum list", () => {
    const list = `${"a".repeat(64)}  node-v24.tar.gz\n${"b".repeat(64)} *other.zip\n`;
    expect(findInChecksumList(list, "other.zip")).toBe("b".repeat(64));
    expect(findInChecksumList(list, "missing")).toBeUndefined();
  });
});

describe("update check", () => {
  const manifest: VersionManifest = {
    schemaVersion: 1,
    channels: {
      stable: { version: "2.0.0", minimum: "2.0.0-dev.2", changelog: "x" },
      beta: { version: "2.1.0-beta.1", minimum: "2.0.0", changelog: "x" },
    },
  };
  const fetcher = (async () => new Response(JSON.stringify(manifest))) as unknown as typeof fetch;
  const failing = (async () => {
    throw new Error("offline");
  }) as unknown as typeof fetch;

  test("compares prereleases", () => {
    expect(compareSemver("2.0.0-dev.2", "2.0.0-dev.10")).toBeLessThan(0);
    expect(compareSemver("2.0.0-dev.10", "2.0.0")).toBeLessThan(0);
    expect(compareSemver("v2.0.0", "2.0.0")).toBe(0);
  });

  test("reports available and required updates, then serves the cache", async () => {
    const now = new Date("2026-11-12T10:00:00Z");
    const first = await checkForUpdate("2.0.0-dev.1", "stable", { now, fetcher, force: true });
    expect(first).toMatchObject({ latest: "2.0.0", updateAvailable: true, updateRequired: true, source: "network" });
    expect(existsSync(statePath("state", "update-check.json"))).toBe(true);
    const cached = await checkForUpdate("2.0.0", "beta", { now: new Date("2026-11-12T12:00:00Z"), fetcher: failing });
    expect(cached).toMatchObject({ latest: "2.1.0-beta.1", updateAvailable: true, updateRequired: false, source: "cache" });
  });

  test("carries on offline when the cache is stale", async () => {
    const status = await checkForUpdate("2.0.0", "stable", { now: new Date("2026-11-13T10:00:00Z"), fetcher: failing });
    expect(status).toMatchObject({ updateAvailable: false, source: "offline" });
  });
});

test("version.json at the repository root is a valid manifest for this version", async () => {
  const pkg = (await import("../../package.json")).default;
  const file = JSON.parse(readFileSync(join(import.meta.dir, "../../version.json"), "utf8")) as VersionManifest;
  expect(file.schemaVersion).toBe(1);
  for (const channel of ["stable", "beta"] as const) {
    expect(compareSemver(file.channels[channel].version, pkg.version)).toBe(0);
    expect(file.channels[channel].changelog).toContain("/blob/v2/");
  }
});
