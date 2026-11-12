/**
 * SetupVibe MCP tools (spec section 13).
 *
 * The tools run the binary's own CLI in a subprocess with `--json`, so an
 * agent gets exactly what a person gets from the terminal. Tools that change
 * the machine default to a dry run; `remove` also needs `confirm: true`.
 *
 * | Tool | CLI |
 * | --- | --- |
 * | system | `system --no-update-check` |
 * | list | `list [--category]` |
 * | check | `check [items]` |
 * | install | `install <items> [--dry-run]` |
 * | remove | `remove <items> --yes [--dry-run]` |
 * | update | `update [--dry-run]` |
 * | health | doctor findings: prerequisites, failing and outdated items |
 */
import { z } from "zod";
import type { Registrar } from "../core/mcp/server.ts";
import { edition } from "../core/app/edition.ts";
import { selfArgv } from "../commands/auto.ts";
import type { Inventory } from "../inventory.ts";
import { readState } from "../state/store.ts";
import type { InitRecord } from "../init/plan.ts";
import type { SelectedItem } from "../ops/inventory-ops.ts";
import { doctorFindings } from "../tui/model.ts";

/** Result of a CLI run with `--json`. */
export interface CliRun {
  exitCode: number;
  envelope: { ok: boolean; data?: unknown; error?: unknown } | undefined;
}

/** Runs the CLI with `--json` and parses the final envelope. */
export async function runCliJson(args: string[]): Promise<CliRun> {
  const proc = Bun.spawn([...selfArgv(), ...args, "--json"], { stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  const stdout = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;
  return { exitCode, envelope: lastEnvelope(stdout) };
}

/** Last JSON object with `ok` in the output (NDJSON events come before it). */
export function lastEnvelope(stdout: string): CliRun["envelope"] {
  const text = stdout.trim();
  try {
    const whole = JSON.parse(text);
    if (whole && typeof whole === "object" && "ok" in whole) return whole;
  } catch {
    // Not a single JSON document: look for the last envelope line.
  }
  for (const line of text.split("\n").reverse()) {
    try {
      const value = JSON.parse(line);
      if (value && typeof value === "object" && "ok" in value) return value;
    } catch {
      // Skip non-JSON lines.
    }
  }
  return undefined;
}

function reply(run: CliRun) {
  const data = { exitCode: run.exitCode, ...(run.envelope ?? { ok: false, error: "no JSON output" }) };
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }], structuredContent: data, isError: run.exitCode !== 0 };
}

const items = z.array(z.string().regex(/^[a-z0-9][a-z0-9-]*$/)).min(1).describe("Inventory item ids, as listed by the list tool.");

/** Registers the SetupVibe tools on the MCP server. */
export function registerSetupVibeTools({ server, catalog }: Registrar, runCli: (args: string[]) => Promise<CliRun> = runCliJson): void {
  const add = (name: string, description: string) => catalog.tools.push({ name, description });

  add("system", "Detected system, version, architecture, WSL, headless and public IP flags, and the machine variant.");
  server.registerTool("system", { title: "Detected system", description: "Returns what SetupVibe detected about this machine.", inputSchema: {}, annotations: { readOnlyHint: true } }, async () =>
    reply(await runCli(["system", "--no-update-check"])),
  );

  add("list", "Inventory items with their status on this system.");
  server.registerTool(
    "list",
    { title: "Inventory", description: "Lists inventory items with status (installed, outdated, failed, available, gui, system, init, unavailable).", inputSchema: { category: z.string().optional().describe("Only one category id.") }, annotations: { readOnlyHint: true } },
    async ({ category }) => reply(await runCli(["list", ...(category ? ["--category", category] : [])])),
  );

  add("check", "Verifies installed items against their pinned versions.");
  server.registerTool(
    "check",
    { title: "Check items", description: "Runs each item's check. Without items, checks the selection.", inputSchema: { items: items.optional() }, annotations: { readOnlyHint: true } },
    async ({ items: ids }) => reply(await runCli(["check", ...(ids ?? [])])),
  );

  add("install", "Installs inventory items; a dry run unless dry_run is false.");
  server.registerTool(
    "install",
    {
      title: "Install items",
      description: "Installs items and their requirements. Returns the plan when dry_run is true (default). Requires a completed init.",
      inputSchema: { items, dry_run: z.boolean().default(true).describe("Preview without changes. Set false to install."), force: z.boolean().default(false).describe("Reinstall items that already pass their check.") },
    },
    async ({ items: ids, dry_run, force }) => reply(await runCli(["install", ...ids, ...(dry_run ? ["--dry-run"] : []), ...(force ? ["--force"] : [])])),
  );

  add("remove", "Removes inventory items; needs confirm: true unless it is a dry run.");
  server.registerTool(
    "remove",
    {
      title: "Remove items",
      description: "Removes items installed in the user's space. Returns the plan when dry_run is true (default). A real removal needs confirm: true, after showing the plan to the user.",
      inputSchema: {
        items,
        dry_run: z.boolean().default(true).describe("Preview without changes."),
        confirm: z.boolean().default(false).describe("The user confirmed the removal."),
        include_native: z.boolean().default(false).describe("Also remove system packages."),
      },
      annotations: { destructiveHint: true },
    },
    async ({ items: ids, dry_run, confirm, include_native }) => {
      if (!dry_run && !confirm) {
        const data = { exitCode: 2, ok: false, error: "Removal needs confirm: true. Show the dry-run plan to the user and ask first." };
        return { content: [{ type: "text" as const, text: JSON.stringify(data) }], structuredContent: data, isError: true };
      }
      return reply(await runCli(["remove", ...ids, "--yes", ...(dry_run ? ["--dry-run"] : []), ...(include_native ? ["--include-native"] : [])]));
    },
  );

  add("update", "Updates selected items whose pinned version changed; a dry run unless dry_run is false.");
  server.registerTool(
    "update",
    { title: "Update items", description: "Reinstalls selected items whose pinned version changed in the inventory.", inputSchema: { dry_run: z.boolean().default(true).describe("Preview without changes.") } },
    async ({ dry_run }) => reply(await runCli(["update", ...(dry_run ? ["--dry-run"] : [])])),
  );

  add("health", "Pending prerequisites, failing and outdated items, with the command that fixes each.");
  server.registerTool("health", { title: "SetupVibe health", description: "Doctor findings for the SetupVibe installation.", inputSchema: {}, annotations: { readOnlyHint: true } }, async () => {
    const config = readState<Record<string, unknown>>("config.json", {});
    const selection = readState<{ items?: SelectedItem[] }>("selection.json", {}).items ?? [];
    const findings = doctorFindings(edition().inventory as Inventory, config.init as InitRecord | undefined, selection);
    const data = { ok: findings.every((f) => f.level === "ok"), findings };
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }], structuredContent: data };
  });
}
