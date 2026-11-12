import "../../../desktop/src/edition.ts";
/** Real conversation with the MCP server over stdio using the SDK Client. */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { HOME_VARIABLE } from "../../core/config/paths.ts";
import { manifest } from "../../core/app/manifest.ts";

let dir: string;
let client: Client;

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "termfy-mcp-"));
  client = new Client({ name: "test", version: "0.0.0" });
  const transport = new StdioClientTransport({
    command: "bun",
    args: ["run", "desktop/src/main.ts", "mcp"],
    cwd: join(import.meta.dir, "../../.."),
    env: { ...(process.env as Record<string, string>), [HOME_VARIABLE]: dir },
    // Piped, not ignored: a failing start leaves its message on transport.stderr.
    stderr: "pipe",
  });
  await client.connect(transport);
});

afterAll(async () => {
  await client.close();
  rmSync(dir, { recursive: true, force: true });
});

describe("mcp stdio", () => {
  test("lists tools", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toEqual(expect.arrayContaining(["about", "skill", "credentials_status"]));
  });

  test("calls about", async () => {
    const r = await client.callTool({ name: "about", arguments: {} });
    const sc = r.structuredContent as { version: string; bin: string };
    expect(sc.version).toBe(manifest.version);
    expect(sc.bin).toBe(manifest.bin);
  });

  test("skill by topic", async () => {
    const r = await client.callTool({ name: "skill", arguments: { topic: "mcp" } });
    const text = (r.content as Array<{ type: string; text: string }>)[0]?.text ?? "";
    expect(text).toContain("# MCP");
  });

  test("reads the exit-codes resource", async () => {
    const r = await client.readResource({ uri: `${manifest.bin}://exit-codes` });
    const json = JSON.parse((r.contents[0] as { text: string }).text);
    expect(json.codes[0].code).toBe(0);
  });

  test("credentials_status does not expose values", async () => {
    const r = await client.callTool({ name: "credentials_status", arguments: {} });
    const sc = r.structuredContent as Record<string, unknown>;
    expect(Object.keys(sc)).not.toContain("values");
    expect(sc.count).toBe(0);
  });

  test("operate prompt", async () => {
    const r = await client.getPrompt({ name: "operate", arguments: { task: "list config" } });
    expect((r.messages[0]?.content as { text: string }).text).toContain("list config");
  });
});
