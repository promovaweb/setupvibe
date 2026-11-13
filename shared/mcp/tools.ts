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
 * | doctor | `doctor`: runtime checks and SetupVibe findings |
 * | health | only the SetupVibe findings of doctor |
 * | report | `report`: Markdown report for an issue, without secrets |
 * | init | `init [--dry-run]` |
 * | migrate | `migrate --dry-run`, or the real run with confirm |
 * | logs | last runs and the events of one (read from ~/.setupvibe/logs) |
 * | tailscale | local Tailscale client: this machine, tailnet, peers, serve |
 * | machine | system, CPU, memory, disks, network and top processes |
 *
 * Resources: `setupvibe://inventory` (the edition inventory) and
 * `setupvibe://selection` (what this machine selected and installed).
 */
import { z } from "zod";
import type { Registrar } from "../core/mcp/server.ts";
import { manifest } from "../core/app/manifest.ts";
import { edition } from "../core/app/edition.ts";
import { selfArgv } from "../commands/auto.ts";
import { readState } from "../state/store.ts";
import { machineFindings } from "../commands/maintenance.ts";
import { logEvents, logFiles } from "../tui/model.ts";
import { collect } from "../tailscale/status.ts";
import { machineInfo } from "../system/info.ts";
import { LiveSampler } from "../system/live.ts";

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

/** A JSON value as an MCP tool result. */
function json(data: Record<string, unknown>, isError = false) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }], structuredContent: data, isError };
}

// Inventory ids, or with external a mise tool such as terraform@1.13.4 or aqua:sst/opencode; the CLI validates both.
const items = z.array(z.string().regex(/^[a-z0-9][a-z0-9:/._-]*(@[A-Za-z0-9._+-]+)?$/)).min(1).describe("Inventory item ids, as listed by the list tool; with external, one mise tool (tool or tool@version).");

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
      inputSchema: {
        items,
        dry_run: z.boolean().default(true).describe("Preview without changes. Set false to install."),
        force: z.boolean().default(false).describe("Reinstall items that already pass their check."),
        external: z.boolean().default(false).describe("items holds one mise tool outside the inventory (tool or tool@version); the version is pinned in external.json."),
      },
    },
    async ({ items: ids, dry_run, force, external }) => reply(await runCli(["install", ...(external ? ["--external"] : []), ...ids, ...(dry_run ? ["--dry-run"] : []), ...(force ? ["--force"] : [])])),
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
        force: z.boolean().default(false).describe("Remove even when other selected items require it, or when init found the item on the machine before SetupVibe."),
        external: z.boolean().default(false).describe("items holds one app installed with install external."),
      },
      annotations: { destructiveHint: true },
    },
    async ({ items: ids, dry_run, confirm, include_native, force, external }) => {
      if (!dry_run && !confirm) {
        const data = { exitCode: 2, ok: false, error: "Removal needs confirm: true. Show the dry-run plan to the user and ask first." };
        return { content: [{ type: "text" as const, text: JSON.stringify(data) }], structuredContent: data, isError: true };
      }
      return reply(await runCli(["remove", ...(external ? ["--external"] : []), ...ids, "--yes", ...(dry_run ? ["--dry-run"] : []), ...(include_native ? ["--include-native"] : []), ...(force ? ["--force"] : [])]));
    },
  );

  add("update", "Updates selected items whose pinned version changed; a dry run unless dry_run is false.");
  server.registerTool(
    "update",
    { title: "Update items", description: "Reinstalls selected items whose pinned version changed in the inventory.", inputSchema: { dry_run: z.boolean().default(true).describe("Preview without changes.") } },
    async ({ dry_run }) => reply(await runCli(["update", ...(dry_run ? ["--dry-run"] : [])])),
  );

  add("health", "Only the SetupVibe findings of doctor (prerequisites, items, shell, leftovers), without the runtime checks.");
  server.registerTool("health", { title: "SetupVibe health", description: "Doctor findings for the SetupVibe installation.", inputSchema: {}, annotations: { readOnlyHint: true } }, async () => {
    // The same findings as `setupvibe doctor` and the TUI Doctor module.
    const findings = machineFindings();
    return json({ ok: findings.every((f) => f.level === "ok"), findings });
  });

  add("doctor", "Runtime checks and SetupVibe findings, each with the command that fixes it; the same as setupvibe doctor.");
  server.registerTool("doctor", { title: "Doctor", description: "Runs setupvibe doctor: runtime, terminal and configuration checks plus the SetupVibe findings (prerequisites, items, shell, SetupVibe 1 leftovers, exposed containers). Read-only.", inputSchema: {}, annotations: { readOnlyHint: true } }, async () =>
    reply(await runCli(["doctor"])),
  );

  add("report", "Markdown report of this machine for a GitHub issue, without secrets.");
  server.registerTool("report", { title: "Machine report", description: "Returns the report that setupvibe report prints: system, versions, selection and the last run, with secrets removed.", inputSchema: {}, annotations: { readOnlyHint: true } }, async () =>
    reply(await runCli(["report"])),
  );

  add("init", "Checks requirements and installs the prerequisites; a dry run unless dry_run is false.");
  server.registerTool(
    "init",
    { title: "Init", description: "Installs the build dependencies and mise. Returns the plan when dry_run is true (default).", inputSchema: { dry_run: z.boolean().default(true).describe("Preview without changes. Set false to run.") } },
    async ({ dry_run }) => reply(await runCli(["init", ...(dry_run ? ["--dry-run"] : [])])),
  );

  add("migrate", "Moves a SetupVibe 1 machine to SetupVibe 2; a dry run unless dry_run is false and confirm is true.");
  server.registerTool(
    "migrate",
    {
      title: "Migrate from SetupVibe 1",
      description: "Converts ~/.zshrc and ~/.tmux.conf from SetupVibe 1 and adopts what is installed. Returns the plan when dry_run is true (default). A real run needs confirm: true, after showing the plan to the user.",
      inputSchema: {
        dry_run: z.boolean().default(true).describe("Preview without changes."),
        confirm: z.boolean().default(false).describe("The user confirmed the migration."),
        remove_legacy: z.array(z.enum(["go", "rbenv", "npm-global", "nodesource", "all"])).optional().describe("SetupVibe 1 duplicates to remove in the real run."),
      },
      annotations: { destructiveHint: true },
    },
    async ({ dry_run, confirm, remove_legacy }) => {
      if (!dry_run && !confirm) return json({ exitCode: 2, ok: false, error: "Migration needs confirm: true. Show the dry-run plan to the user and ask first." }, true);
      return reply(await runCli(["migrate", ...(dry_run ? ["--dry-run"] : []), ...(remove_legacy?.length ? ["--remove-legacy", remove_legacy.join(",")] : [])]));
    },
  );

  add("logs", "Recent SetupVibe runs and the events of one of them.");
  server.registerTool(
    "logs",
    { title: "Run logs", description: "Lists the run logs in ~/.setupvibe/logs, newest first, and returns the events (item, action, status, message) of the chosen run.", inputSchema: { run: z.string().optional().describe("Log file name from runs; the newest when left out.") }, annotations: { readOnlyHint: true } },
    async ({ run }) => {
      const runs = logFiles();
      const file = run ?? runs[0];
      if (run && !runs.includes(run)) return json({ ok: false, error: `Unknown run: ${run}`, runs }, true);
      const events = file ? logEvents(file) : [];
      return json({ ok: true, runs, run: file ?? null, events, failed: events.filter((e) => e.status === "fail").length });
    },
  );

  add("tailscale", "Local Tailscale client: this machine, tailnet, peers with connection type, serve and health.");
  server.registerTool("tailscale", { title: "Tailscale", description: "Reads the local Tailscale client (tailscale status and serve), without the Tailscale API. Returns installed: false when the client is missing.", inputSchema: {}, annotations: { readOnlyHint: true } }, async () =>
    json({ ok: true, ...(await collect()) } as Record<string, unknown>),
  );

  add("machine", "System, CPU, memory, swap, disks, network rates and the processes using the most CPU.");
  server.registerTool("machine", { title: "Machine", description: "One reading of this machine: host, kernel, uptime, CPU (over one second), load, memory, swap, disks, network rates and the top processes.", inputSchema: { processes: z.number().int().min(0).max(50).default(8).describe("How many processes to return.") }, annotations: { readOnlyHint: true } }, async ({ processes }) => {
    const sampler = new LiveSampler();
    // CPU and rates are deltas: wait a second between the two readings.
    await Bun.sleep(1000);
    sampler.tick(processes);
    const live = sampler.tick(processes);
    const { cpuHistory: _c, memHistory: _m, ...reading } = live;
    return json({ ok: true, info: machineInfo(), live: reading } as Record<string, unknown>);
  });

  const scheme = manifest.bin;
  catalog.resources.push({ uri: `${scheme}://inventory`, name: "inventory", description: "The edition inventory (items, versions, install methods) as JSON." });
  server.registerResource("inventory", `${scheme}://inventory`, { title: "Inventory", description: "The edition inventory as JSON.", mimeType: "application/json" }, async (uri) => ({
    contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(edition().inventory, null, 2) }],
  }));
  catalog.resources.push({ uri: `${scheme}://selection`, name: "selection", description: "Items this machine selected, with the installed version and status, as JSON." });
  server.registerResource("selection", `${scheme}://selection`, { title: "Selection", description: "selection.json of this machine.", mimeType: "application/json" }, async (uri) => ({
    contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(readState("selection.json", { items: [] }), null, 2) }],
  }));
}
