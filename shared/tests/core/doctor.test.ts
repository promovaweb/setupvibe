import "../../../desktop/src/edition.ts";
/** Verifies diagnostic health, redaction and MCP parity. */
import { afterEach, beforeEach, expect, test } from "bun:test";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { collectDoctorChecks, doctorCommand } from "../../core/cli/commands/doctor.ts";
import { HOME_VARIABLE, MASTER_KEY_VARIABLE, paths } from "../../core/config/paths.ts";
import { setCredential } from "../../core/config/credentials.ts";
import { registerDoctorTools } from "../../core/mcp/tools/doctor.ts";
import { ExitCode } from "../../core/app/exit-codes.ts";
import type { Context } from "../../core/cli/registry.ts";

let dir: string;
let home: string | undefined;
let key: string | undefined;
beforeEach(() => {
  home = process.env[HOME_VARIABLE]; key = process.env[MASTER_KEY_VARIABLE];
  dir = mkdtempSync(join(tmpdir(), "doctor-")); process.env[HOME_VARIABLE] = dir; delete process.env[MASTER_KEY_VARIABLE];
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  if (home === undefined) delete process.env[HOME_VARIABLE]; else process.env[HOME_VARIABLE] = home;
  if (key === undefined) delete process.env[MASTER_KEY_VARIABLE]; else process.env[MASTER_KEY_VARIABLE] = key;
});
test("fresh installation only warns; old Bun and loose permissions fail", () => {
  const data = collectDoctorChecks({ version: "1.4.4", stdin: false, stdout: false });
  expect(data.ok).toBe(true);
  expect(data.checks.find((c) => c.name === "master-key")?.detail).toBe("none");
  expect(collectDoctorChecks({ version: "1.4.3", stdin: true, stdout: true }).ok).toBe(false);
  chmodSync(dir, 0o755);
  expect(collectDoctorChecks().checks.find((c) => c.name === "directory")?.status).toBe("fail");
});
test("corrupt settings and undecryptable vault fail without exposing content", async () => {
  setCredential("test.token", "private-token-value");
  const original = readFileSync(paths.credentials(), "utf8");
  expect(collectDoctorChecks().ok).toBe(true);
  writeFileSync(paths.settings(), "private-invalid-json");
  process.env[MASTER_KEY_VARIABLE] = "00".repeat(32);
  const data = collectDoctorChecks();
  expect(data.ok).toBe(false);
  expect(data.checks.find((c) => c.name === "credentials")?.status).toBe("fail");
  expect(JSON.stringify(data)).not.toContain("private");
  expect(readFileSync(paths.credentials(), "utf8")).toBe(original);
  const result = await doctorCommand.run!({} as Context);
  expect(result.code).toBe(ExitCode.CONFIG);
  expect(result.text).toContain("✗ settings");
});
test("MCP returns the shared checks and marks failures", async () => {
  const server = new McpServer({ name: "test", version: "1" });
  const catalog = { name: "test", version: "1", tools: [], resources: [], prompts: [] };
  registerDoctorTools({ server, catalog });
  const client = new Client({ name: "test", version: "1" });
  const [left, right] = InMemoryTransport.createLinkedPair();
  await server.connect(left); await client.connect(right);
  try {
    expect((await client.listTools()).tools.map((t) => t.name)).toContain("doctor");
    const result = await client.callTool({ name: "doctor", arguments: {} });
    expect(result.structuredContent).toEqual(collectDoctorChecks());
    expect(result.isError).toBe(false);
    writeFileSync(paths.settings(), "[]");
    expect((await client.callTool({ name: "doctor", arguments: {} })).isError).toBe(true);
  } finally { await client.close(); await server.close(); }
});

test("CLI doctor reports TTY warnings and fails while init or settings are broken", () => {
  const run = () => Bun.spawnSync([process.execPath, "run", "desktop/src/main.ts", "doctor", "--json"], {
    env: { ...process.env }, stdin: "ignore",
  });
  const pending = run();
  // SetupVibe adds its findings: without init the doctor fails with CONFIG.
  expect(pending.exitCode).toBe(ExitCode.CONFIG);
  const data = JSON.parse(pending.stdout.toString()).data;
  expect(data.findings.find((f: { id: string }) => f.id === "init").level).toBe("fail");
  for (const name of ["stdin", "stdout"]) expect(data.runtime.find((c: { name: string }) => c.name === name).status).toBe("warn");
  writeFileSync(paths.settings(), "invalid");
  const failure = run();
  expect(failure.exitCode).toBe(ExitCode.CONFIG);
  expect(JSON.parse(failure.stdout.toString()).data.ok).toBe(false);
});
