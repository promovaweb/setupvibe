/** SetupVibe MCP tools and mcp install (spec section 13). */
import "../../desktop/src/edition.ts";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { HOME_VARIABLE } from "../core/config/paths";
import { lastEnvelope } from "../mcp/tools";
import { findAgent, mcpInstallPlan, mergeOpenCodeConfig, serverCommand } from "../commands/mcp-install";
import { describeCmd } from "../exec/runner";

describe("helpers", () => {
  test("the last envelope wins over NDJSON events", () => {
    const out = `{"time":"t","action":"install","status":"ok"}\n{"ok":true,"command":"setupvibe install","data":{"x":1}}\n`;
    expect(lastEnvelope(out)).toEqual({ ok: true, command: "setupvibe install", data: { x: 1 } } as never);
    expect(lastEnvelope('{\n  "ok": false,\n  "error": "e"\n}')).toEqual({ ok: false, error: "e" } as never);
    expect(lastEnvelope("garbage")).toBeUndefined();
  });

  test("server command for compiled and source runs", () => {
    expect(serverCommand(["/usr/local/bin/setupvibe"])).toEqual(["/usr/local/bin/setupvibe", "mcp"]);
    expect(serverCommand(["/usr/bin/bun", "/repo/desktop/src/main.ts"], "setupvibe")).toEqual(["setupvibe", "mcp"]);
  });

  test("OpenCode config keeps other servers and settings", () => {
    const merged = mergeOpenCodeConfig({ theme: "x", mcp: { other: { type: "remote" } } }, ["setupvibe", "mcp"]);
    expect(merged).toEqual({ theme: "x", mcp: { other: { type: "remote" }, setupvibe: { type: "local", command: ["setupvibe", "mcp"], enabled: true } } });
  });

  test("only installed agents get a step, each skipped when already configured", () => {
    const plan = mcpInstallPlan({ claude: "/home/test/.local/bin/claude", opencode: "/usr/bin/opencode" }, ["setupvibe", "mcp"], "/home/test");
    expect(plan.steps.map((s) => s.id)).toEqual(["claude-code", "opencode"]);
    expect(plan.skipped).toEqual(["codex"]);
    expect(describeCmd(plan.steps[0]!.commands[0]!)).toBe("/home/test/.local/bin/claude mcp add --scope user setupvibe -- setupvibe mcp");
    expect(describeCmd(plan.steps[0]!.skipIf!)).toBe("/home/test/.local/bin/claude mcp get setupvibe");
  });

  test("agents are found in ~/.local/bin even outside PATH", () => {
    const home = mkdtempSync(join(tmpdir(), "sv-agent-"));
    mkdirSync(join(home, ".local", "bin"), { recursive: true });
    writeFileSync(join(home, ".local", "bin", "claude"), "#!/bin/sh\n");
    chmodSync(join(home, ".local", "bin", "claude"), 0o755);
    expect(findAgent("claude", home, join(home, "empty"))).toBe(join(home, ".local", "bin", "claude"));
    expect(findAgent("not-an-agent-xyz", home, join(home, "empty"))).toBeUndefined();
    rmSync(home, { recursive: true, force: true });
  });
});

describe("tools over stdio", () => {
  let dir: string;
  let client: Client;
  const root = join(import.meta.dir, "../..");

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), "sv-mcp-"));
    client = new Client({ name: "test", version: "0.0.0" });
    await client.connect(
      new StdioClientTransport({
        command: "bun",
        args: ["run", "desktop/src/main.ts", "mcp"],
        cwd: root,
        env: { ...(process.env as Record<string, string>), [HOME_VARIABLE]: dir },
        stderr: "pipe",
      }),
    );
  });
  afterAll(async () => {
    await client.close();
    rmSync(dir, { recursive: true, force: true });
  });

  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const r = await client.callTool({ name, arguments: args });
    return { isError: Boolean(r.isError), data: r.structuredContent as { exitCode: number; ok: boolean; data?: Record<string, unknown>; error?: unknown; findings?: unknown[] } };
  };

  test("the SetupVibe tools are registered", async () => {
    const names = (await client.listTools()).tools.map((t) => t.name);
    for (const n of ["system", "list", "check", "install", "remove", "update", "health"]) expect(names).toContain(n);
  });

  test("list returns the inventory", async () => {
    const r = await call("list", { category: "ai" });
    expect(r.isError).toBe(false);
    expect((r.data.data!.items as { id: string }[]).map((i) => i.id)).toContain("claude-code");
  });

  test("install defaults to a dry run and needs init", async () => {
    const r = await call("install", { items: ["go"] });
    expect(r.data.exitCode).toBe(3);
  });

  test("a real removal needs confirm", async () => {
    const r = await call("remove", { items: ["go"], dry_run: false });
    expect(r.isError).toBe(true);
    expect(String(r.data.error)).toContain("confirm: true");
  });

  test("health reports pending init", async () => {
    const r = await call("health");
    expect(r.data.ok).toBe(false);
    expect(JSON.stringify(r.data.findings)).toContain("setupvibe init");
  });
});

describe("tool handlers (task 16)", () => {
  const { registerSetupVibeTools } = require("../mcp/tools") as typeof import("../mcp/tools");
  type Handler = (args: Record<string, unknown>) => Promise<{ structuredContent: Record<string, unknown>; isError?: boolean }>;
  const handlers: Record<string, Handler> = {};
  const calls: string[][] = [];
  const server = { registerTool: (name: string, _def: unknown, handler: Handler) => void (handlers[name] = handler) };
  const catalog = { tools: [] as Array<{ name: string; description: string }> };
  registerSetupVibeTools({ server, catalog } as never, async (args) => {
    calls.push(args);
    return { exitCode: 0, envelope: { ok: true, data: { args } } };
  });

  test("every tool is registered and listed in the catalog", () => {
    expect(Object.keys(handlers).sort()).toEqual(["check", "health", "install", "list", "remove", "system", "update"]);
    expect(catalog.tools.length).toBe(7);
  });

  test("read-only tools pass their filters to the CLI", async () => {
    await handlers.system!({});
    await handlers.list!({ category: "ai" });
    await handlers.check!({ items: ["node"] });
    expect(calls.slice(-3)).toEqual([["system", "--no-update-check"], ["list", "--category", "ai"], ["check", "node"]]);
  });

  test("install and update default to a dry run; force and dry_run false are passed", async () => {
    await handlers.install!({ items: ["go"], dry_run: true, force: false });
    await handlers.install!({ items: ["go"], dry_run: false, force: true });
    await handlers.update!({ dry_run: true });
    expect(calls.slice(-3)).toEqual([["install", "go", "--dry-run"], ["install", "go", "--force"], ["update", "--dry-run"]]);
  });

  test("a real removal needs confirm; the dry run does not", async () => {
    const refused = await handlers.remove!({ items: ["go"], dry_run: false, confirm: false, include_native: false });
    expect(refused.isError).toBe(true);
    await handlers.remove!({ items: ["go"], dry_run: true, confirm: false, include_native: true });
    expect(calls.at(-1)).toEqual(["remove", "go", "--yes", "--dry-run", "--include-native"]);
  });

  test("health returns the doctor findings without running the CLI", async () => {
    const before = calls.length;
    const r = await handlers.health!({});
    expect(Array.isArray(r.structuredContent.findings)).toBe(true);
    expect(calls.length).toBe(before);
  });
});
