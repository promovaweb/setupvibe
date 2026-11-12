/**
 * Commands run in this process with a simulated context (task 16).
 *
 * The end-to-end runs live in the container tests and the CI runners; these
 * call each command's `run` directly, in dry-run or read-only mode, with HOME
 * and the data directory in a temporary folder, so they count for coverage
 * and never change the machine.
 */
import "../../desktop/src/edition.ts";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HOME_VARIABLE } from "../core/config/paths";
import { root } from "../core/cli/commands";
import type { Command, Context, Result } from "../core/cli/registry";
import { ExitCode } from "../core/app/exit-codes";
import { edition } from "../core/app/edition";
import type { Inventory } from "../inventory";
import { V1_ZSHRC } from "../legacy/v1";

let home: string;
const saved = { HOME: process.env.HOME, data: process.env[HOME_VARIABLE], lang: process.env.SETUPVIBE_LANG, xdg: process.env.XDG_CONFIG_HOME };

function find(path: string[]): Command {
  let c: Command | undefined = root;
  for (const name of path) c = c?.subcommands?.find((s) => s.name === name);
  if (!c) throw new Error(`no command ${path.join(" ")}`);
  return c;
}

async function run(path: string[], options: Record<string, string | boolean> = {}, args: string[] = []) {
  const out: string[] = [];
  const err: string[] = [];
  const ctx: Context = { args, options, json: false, path, stdout: (t) => out.push(t), stderr: (t) => err.push(t), interactive: false };
  const r = (await find(path).run!(ctx)) as Result;
  const text = typeof r.text === "function" ? r.text() : r.text;
  return { code: r.code ?? ExitCode.SUCCESS, data: r.data as Record<string, unknown>, text, stderr: err.join("\n") };
}

const data = (...p: string[]) => join(home, ".setupvibe", ...p);
const initRecord = () => {
  const inventory = edition().inventory as Inventory;
  mkdirSync(data(), { recursive: true });
  writeFileSync(data("config.json"), JSON.stringify({ schemaVersion: 1, init: { done: true, at: "2026-11-12T00:00:00Z", version: "2", system: "debian", prerequisites: inventory.items.filter((i) => i.initOnly).map((i) => i.id) } }));
};

beforeAll(() => {
  home = mkdtempSync(join(tmpdir(), "sv-cmd-"));
  process.env.HOME = home;
  process.env[HOME_VARIABLE] = join(home, ".setupvibe");
  process.env.SETUPVIBE_LANG = "en";
  // Git reads ~/.config/git/config too: keep it inside the temporary home.
  process.env.XDG_CONFIG_HOME = join(home, ".config");
});
afterAll(() => {
  rmSync(home, { recursive: true, force: true });
  for (const [k, v] of [["HOME", saved.HOME], [HOME_VARIABLE, saved.data], ["SETUPVIBE_LANG", saved.lang], ["XDG_CONFIG_HOME", saved.xdg]] as const) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

describe("read-only commands", () => {
  test("system describes the machine and SetupVibe 1", async () => {
    const r = await run(["system"], { "no-update-check": true });
    expect(r.data.edition).toBe("desktop");
    expect((r.data.setupvibe1 as { found: boolean }).found).toBe(false);
    expect(r.text).toContain("SetupVibe 1");
  });

  test("list shows every category and filters by one", async () => {
    const all = await run(["list"]);
    expect((all.data.items as unknown[]).length).toBeGreaterThan(30);
    const one = await run(["list"], { category: "ai" });
    expect((one.data.items as Array<{ category: string }>).every((i) => i.category === "ai")).toBe(true);
    expect(one.text).toContain("claude-code");
  });

  test("doctor reports the missing init as a failure with its fix", async () => {
    const r = await run(["doctor"]);
    expect(r.code).toBe(ExitCode.CONFIG);
    expect(JSON.stringify(r.data)).toContain("setupvibe init");
  });

  test("docs prints a topic", async () => {
    const r = await run(["docs"], {}, ["inventory"]);
    expect(r.text).toContain("## ");
  });
});

describe("commands that need init", () => {
  test("install and update refuse before init", async () => {
    for (const path of [["install"], ["update"]]) {
      const r = await run(path, { "dry-run": true }, ["node"]);
      expect(r.code).toBe(ExitCode.CONFIG);
    }
  });

  test("install --dry-run plans the mise install and warns about unknown items", async () => {
    initRecord();
    const r = await run(["install"], { "dry-run": true }, ["uv"]);
    expect(r.code).toBe(ExitCode.SUCCESS);
    expect(JSON.stringify(r.data)).toContain("uv");
    expect((await run(["install"], { "dry-run": true }, ["no-such-item"])).code).toBe(ExitCode.USAGE);
  });

  test("remove keeps adopted items without --force and plans the rest", async () => {
    writeFileSync(data("selection.json"), JSON.stringify({ schemaVersion: 1, items: [{ id: "uv", version: "0", status: "ok", adopted: true }, { id: "pnpm", version: "0", status: "ok" }] }));
    const kept = await run(["remove"], { "dry-run": true, yes: true }, ["uv"]);
    expect(kept.code).toBe(ExitCode.PARTIAL);
    expect(JSON.stringify(kept.data)).toContain("before SetupVibe");
    const planned = await run(["remove"], { "dry-run": true, yes: true }, ["pnpm"]);
    expect(planned.text).toContain("pnpm");
    expect((await run(["remove"], { external: true, yes: true }, ["nothing"])).code).toBe(ExitCode.NOT_FOUND);
  });

  test("update --dry-run lists outdated items", async () => {
    const r = await run(["update"], { "dry-run": true });
    expect([ExitCode.SUCCESS, ExitCode.PARTIAL] as number[]).toContain(r.code);
    expect(r.text.length).toBeGreaterThan(0);
  });

  test("check reports the selected items", async () => {
    const r = await run(["check"], {}, ["pnpm"]);
    expect(JSON.stringify(r.data)).toContain("pnpm");
  });
});

describe("plans in dry-run", () => {
  test("auto --dry-run plans init, items, shell and the git skip", async () => {
    const r = await run(["auto"], { "dry-run": true, profile: "essencial", "skip-network-check": true });
    expect([ExitCode.SUCCESS, ExitCode.DISK_SPACE] as number[]).toContain(r.code);
    if (r.code === ExitCode.SUCCESS) {
      expect(JSON.stringify(r.data)).toContain("shell-block");
      expect(r.text).toContain("Skipped");
    }
  });

  test("init --dry-run checks the requirements", async () => {
    const r = await run(["init"], { "dry-run": true, "skip-network-check": true });
    expect(JSON.stringify(r.data)).toContain("checks");
  });

  test("security apply and shell apply plan their steps; security remove needs a record", async () => {
    const sec = await run(["security", "apply"], { "dry-run": true });
    expect(sec.text).toContain("Record the state before the security module");
    expect((await run(["security", "remove"], { "dry-run": true })).code).toBe(ExitCode.CONFIG);
    const shell = await run(["shell", "apply"], { "dry-run": true });
    expect(shell.text).toContain("SetupVibe block");
  });

  test("user create --dry-run and its argument check", async () => {
    const ok = await run(["user", "create"], { "dry-run": true }, ["deploy"]);
    expect(ok.text).toContain("deploy");
    expect((await run(["user", "create"], { "dry-run": true }, [])).code).toBe(ExitCode.USAGE);
  });

  test("self uninstall --dry-run keeps backups; doctor --repair-windows plans DISM and sfc", async () => {
    const un = await run(["self", "uninstall"], { "dry-run": true, yes: true, "keep-data": true });
    expect(un.text).toContain("shell");
    const repair = await run(["doctor"], { "repair-windows": true, "dry-run": true });
    expect(repair.text).toContain("sfc.exe /scannow");
  });

  test("config export writes the answers file and import reads it", async () => {
    const file = join(home, "answers.json");
    await run(["config", "export"], {}, [file]);
    expect(JSON.parse(readFileSync(file, "utf8")).edition).toBe("desktop");
    const imported = await run(["config", "import"], { "dry-run": true }, [file]);
    expect([ExitCode.SUCCESS, ExitCode.PARTIAL] as number[]).toContain(imported.code);
  });

  test("report writes Markdown without secrets", async () => {
    const file = join(home, "report.md");
    await run(["report"], { output: file });
    expect(readFileSync(file, "utf8")).toContain("# SetupVibe report");
  });

  test("ssh copy-id refuses a bad target", async () => {
    expect((await run(["ssh", "copy-id"], {}, ["bad target!"])).code).toBe(ExitCode.USAGE);
  });
});

describe("migrate", () => {
  test("nothing to migrate on a clean home", async () => {
    const r = await run(["migrate"], { "dry-run": true });
    // System-wide leftovers (Linuxbrew, NodeSource) may exist on the host; the home itself has nothing.
    expect(r.text).toMatch(/Nothing to (migrate|do)/);
  });

  test("a SetupVibe 1 home gets a plan with the moved lines", async () => {
    writeFileSync(join(home, ".zshrc"), `${V1_ZSHRC[0]}\nexport API_TOKEN=abc\n`);
    mkdirSync(join(home, ".local", "go"), { recursive: true });
    const r = await run(["migrate"], { "dry-run": true });
    expect(r.text).toContain("export API_TOKEN=****");
    expect(r.text).toContain("legacy-go");
    expect((await run(["migrate"], { "dry-run": true, "remove-legacy": "linuxbrew" })).code).toBe(ExitCode.USAGE);
    const chosen = await run(["migrate"], { "dry-run": true, "remove-legacy": "go" });
    expect(chosen.text).toContain(".local/go");
    expect(existsSync(join(home, ".local", "go"))).toBe(true);
  });
});

describe("execution and prompts", () => {
  const { executePlan, planText } = require("../commands/execute") as typeof import("../commands/execute");
  const { dryRunner } = require("../exec/runner") as typeof import("../exec/runner");
  const { askGitIdentity, adoptExistingItems } = require("../commands/init") as typeof import("../commands/init");
  const { confirm } = require("../core/cli/input") as typeof import("../core/cli/input");
  const ctx = (options: Record<string, string | boolean> = {}): Context => ({ args: [], options, json: false, path: ["x"], stdout: () => {}, stderr: () => {}, interactive: false });

  test("a real run logs each step and returns PARTIAL when one fails", async () => {
    const runner = { ...dryRunner({ "false-step": { code: 1, stderr: "boom" } }), dryRun: false };
    const steps = [
      { id: "ok", description: "Works", commands: [{ argv: ["true-step"] }] },
      { id: "bad", description: "Fails", commands: [{ argv: ["false-step"] }] },
      { id: "opt", description: "Optional failure", commands: [{ argv: ["false-step"], optional: true }] },
    ];
    const r = await executePlan(ctx(), "unit", steps, { extra: 1 }, runner);
    expect(r.code).toBe(ExitCode.PARTIAL);
    expect((r.results ?? []).map((x) => x.status)).toEqual(["ok", "fail", "ok"]);
    const log = (r.data as { log: string }).log;
    expect(readFileSync(log, "utf8")).toContain('"item":"bad"');
    expect(typeof r.text === "function" ? r.text() : r.text).toContain("1 of 3 steps failed");
    const all = await executePlan(ctx(), "unit", [steps[0]!], {}, runner);
    expect(all.code ?? 0).toBe(ExitCode.SUCCESS);
  });

  test("the dry-run listing shows commands, actions and skip conditions", () => {
    const text = planText([{ id: "a", description: "Step A", commands: [{ argv: ["echo", "hi there"], optional: true }], skipIf: { argv: ["test", "-e", "/x"] }, actionDescription: "write a file" }]);
    expect(text).toContain("1. Step A");
    expect(text).toContain("$ echo 'hi there'  (optional)");
    expect(text).toContain("→ write a file");
    expect(text).toContain("skipped when: test -e /x");
  });

  test("init asks for the Git identity once and saves it in the temporary home", () => {
    const answers = ["Test User", "test@example.com"];
    const git = askGitIdentity(() => answers.shift() ?? null);
    expect(git).toEqual({ name: "Test User", email: "test@example.com" });
    expect(readFileSync(join(home, ".gitconfig"), "utf8")).toContain("test@example.com");
    expect(askGitIdentity(() => "ignored")).toEqual({ name: "Test User", email: "test@example.com" });
  });

  test("init adopts items that already pass their check, once", async () => {
    rmSync(data("selection.json"), { force: true });
    const inventory = edition().inventory as Inventory;
    // Every check succeeds with empty output: items without an expected version are adopted.
    const runner = { ...dryRunner(), dryRun: false };
    const adopted = await adoptExistingItems(inventory, "debian", true, runner);
    expect(adopted.length).toBeGreaterThan(0);
    const sel = JSON.parse(readFileSync(data("selection.json"), "utf8")) as { items: Array<{ adopted?: boolean }> };
    expect(sel.items.every((i) => i.adopted)).toBe(true);
    expect(await adoptExistingItems(inventory, "debian", true, runner)).toEqual([]);
  });

  test("confirm without a terminal returns the fallback", async () => {
    expect(await confirm("Proceed?", true)).toBe(true);
    expect(await confirm("Proceed?", false)).toBe(false);
  });
});

describe("core commands in this process", () => {
  const { AppError, classifyFsError, error: errors } = require("../core/app/errors") as typeof import("../core/app/errors");
  /** Runs a command and turns an AppError into its exit code. */
  async function attempt(path: string[], options: Record<string, string | boolean> = {}, args: string[] = []) {
    try {
      return await run(path, options, args);
    } catch (e) {
      if (e instanceof AppError) return { code: e.code, data: {}, text: e.message, stderr: "" };
      throw e;
    }
  }

  test("about shows the binary, the system and the credits", async () => {
    const r = await run(["about"]);
    expect(r.text).toContain("Credits");
    expect(r.text).toContain("System");
  });

  test("config list, set, get and an unknown key", async () => {
    expect((await run(["config", "list"])).text).toContain("tui.language");
    await run(["config", "set"], {}, ["tui.language", "en"]);
    expect((await run(["config", "get"], {}, ["tui.language"])).text).toContain("en");
    expect((await attempt(["config", "get"], {}, ["no.such.key"])).code).not.toBe(ExitCode.SUCCESS);
    expect((await attempt(["config", "set"], {}, ["tui.mouse", "maybe"])).code).not.toBe(ExitCode.SUCCESS);
  });

  test("credentials list, status, get and remove of a missing name, clear", async () => {
    expect((await run(["credentials", "list"])).code).toBe(ExitCode.SUCCESS);
    expect((await run(["credentials", "status"])).text.length).toBeGreaterThan(0);
    expect((await attempt(["credentials", "get"], {}, ["missing.name"])).code).not.toBe(ExitCode.SUCCESS);
    // Removing a missing name is idempotent or an error, depending on the vault state; it never throws past AppError.
    expect(typeof (await attempt(["credentials", "remove"], {}, ["missing.name"])).code).toBe("number");
    expect((await attempt(["credentials", "clear"], { yes: true })).code).toBe(ExitCode.SUCCESS);
  });

  test("mcp install --dry-run plans for the agents it finds", async () => {
    const r = await run(["mcp", "install"], { "dry-run": true });
    expect([ExitCode.SUCCESS, ExitCode.NOT_FOUND] as number[]).toContain(r.code);
  });

  test("errors carry their exit code and file errors are classified", () => {
    const e = errors.usage("bad");
    expect(e).toBeInstanceOf(AppError);
    expect(e.code).toBe(ExitCode.USAGE);
    const fsError = Object.assign(new Error("nope"), { code: "EACCES" });
    expect(classifyFsError(fsError, ExitCode.CONFIG, "reading x").code).toBe(ExitCode.PERMISSION);
    expect(classifyFsError(new Error("other"), ExitCode.CONFIG, "reading x").code).toBe(ExitCode.CONFIG);
  });
});
