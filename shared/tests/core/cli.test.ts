import "../../../desktop/src/edition.ts";
/** End-to-end CLI runs in a subprocess with an isolated data directory. */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HOME_VARIABLE } from "../../core/config/paths.ts";
import { manifest } from "../../core/app/manifest.ts";
import { root } from "../../core/cli/commands.ts";

let dir: string;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "termfy-cli-"));
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

async function run(args: string[], stdin?: string) {
  const proc = Bun.spawn(["bun", "run", "desktop/src/main.ts", ...args], {
    cwd: join(import.meta.dir, "../../.."),
    env: { ...process.env, [HOME_VARIABLE]: dir, NO_COLOR: "1" },
    stdin: stdin === undefined ? "ignore" : new Response(stdin),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  const code = await proc.exited;
  return { code, stdout, stderr };
}

describe("cli", () => {
  test("--version", async () => {
    const r = await run(["--version"]);
    expect(r.code).toBe(0);
    expect(r.stdout.trim()).toBe(`${manifest.bin} ${manifest.version}`);
  });

  test("--help lists commands and exit codes", async () => {
    const r = await run(["--help"]);
    expect(r.code).toBe(0);
    for (const c of ["about", "config", "credentials", "mcp", "skill", "tui"]) expect(r.stdout).toContain(c);
    expect(r.stdout).toContain("NO_TTY");
  });

  test("the skeleton registers only its own commands", () => {
    // Derived projects add commands; the template itself ships only these.
    if (manifest.bin !== "termfy") return;
    const names = (root.subcommands ?? []).map((c) => c.name).sort();
    expect(names).toEqual(["about", "completion", "config", "credentials", "doctor", "mcp", "skill", "tui"]);
  });

  test("no arguments and no TTY prints help and exits with 2", async () => {
    const r = await run([]);
    expect(r.code).toBe(2);
    expect(r.stdout).toContain("Usage");
  });

  test("about --json returns the envelope", async () => {
    const r = await run(["about", "--json"]);
    expect(r.code).toBe(0);
    const json = JSON.parse(r.stdout);
    expect(json.ok).toBe(true);
    expect(json.command).toBe(`${manifest.bin} about`);
    expect(json.data.version).toBe(manifest.version);
  });

  test("config set/get and a config error as JSON", async () => {
    expect((await run(["config", "set", "tui.theme", "day"])).code).toBe(0);
    const get = await run(["config", "get", "tui.theme"]);
    expect(get.stdout.trim()).toBe("day");
    const errorJson = await run(["config", "get", "does.not.exist", "--json"]);
    expect(errorJson.code).toBe(3);
    expect(JSON.parse(errorJson.stdout).error.name).toBe("CONFIG");
  });

  test("credentials set via stdin, list and masked get", async () => {
    const set = await run(["credentials", "set", "github.token", "--stdin"], "ghp_abcdefghijklmnop\n");
    expect(set.code).toBe(0);
    const list = await run(["credentials", "list", "--json"]);
    expect(JSON.parse(list.stdout).data.names).toEqual(["github.token"]);
    const get = await run(["credentials", "get", "github.token"]);
    expect(get.stdout.trim()).not.toContain("abcdefghijklmnop");
    const reveal = await run(["credentials", "get", "github.token", "--reveal"]);
    expect(reveal.stdout.trim()).toBe("ghp_abcdefghijklmnop");
    const missing = await run(["credentials", "get", "x.y"]);
    expect(missing.code).toBe(4);
  });

  test("an unknown option exits with 2", async () => {
    const r = await run(["about", "--nothing"]);
    expect(r.code).toBe(2);
    expect(r.stderr).toContain("Unknown option");
  });

  test("tui without a TTY exits with 8", async () => {
    const r = await run(["tui"]);
    expect(r.code).toBe(8);
  });

  test("--skill prints the documentation with the generated reference", async () => {
    const r = await run(["--skill"]);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("# CLI");
    expect(r.stdout).toContain("# MCP");
    expect(r.stdout).toContain(`\`${manifest.bin} credentials set\``);
    const topic = await run(["--skill", "exit-codes", "--json"]);
    expect(JSON.parse(topic.stdout).data.topic).toBe("exit-codes");
  });

  test("--opencli returns a valid document", async () => {
    const r = await run(["--opencli"]);
    const doc = JSON.parse(r.stdout);
    expect(doc.opencli).toBe("0.1");
    expect(doc.command.name).toBe(manifest.bin);
    expect(doc.command.commands.map((c: { name: string }) => c.name)).toContain("credentials");
    expect(doc.command.exitCodes.find((e: { code: number }) => e.code === 0)).toBeTruthy();
  });

  test("mcp --list enumerates tools, resources and prompts", async () => {
    const r = await run(["mcp", "--list", "--json"]);
    expect(r.code).toBe(0);
    const d = JSON.parse(r.stdout).data;
    expect(d.tools.map((t: { name: string }) => t.name)).toEqual(
      expect.arrayContaining(["about", "exit_codes", "skill", "config_list", "config_get", "credentials_status"]),
    );
    expect(d.resources.length).toBeGreaterThanOrEqual(4);
    expect(d.prompts[0].name).toBe("operate");
  });
});
