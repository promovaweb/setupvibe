/**
 * Data behind the SetupVibe TUI screens, kept free of rendering so it can be
 * tested without a terminal.
 *
 * - inventory: categories with their items, status and marks;
 * - user: the checklist of permissions and folders (spec section 3);
 * - doctor: requirements, pending prerequisites and failed items.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "../system/home.ts";
import { currentUser } from "../system/user.ts";
import { join } from "node:path";
import type { Inventory, Item, System } from "../inventory.ts";
import { resolveInstall } from "../inventory.ts";
import { itemStatus } from "../commands/inventory.ts";
import type { SelectedItem } from "../ops/inventory-ops.ts";
import type { InitRecord } from "../init/plan.ts";
import { missingPrerequisites } from "../init/plan.ts";
import { statePath } from "../state/store.ts";
import { otherManagerPath } from "../ops/other-manager.ts";

export interface InventoryRow {
  item: Item;
  status: string;
  /** How the item installs on this system, for the detail panel. */
  method: string;
  /** Version recorded when SetupVibe installed it. */
  installed?: string;
  /** Path of a copy installed by another manager. */
  elsewhere?: string;
}

export interface InventoryCategory {
  id: string;
  title: string;
  rows: InventoryRow[];
}

/** Status glyphs used in the item list. */
export const STATUS_GLYPH: Record<string, string> = {
  installed: "●",
  outdated: "↑",
  failed: "✗",
  available: "○",
  gui: "◌",
  system: "◆",
  init: "◇",
  unavailable: "·",
  other: "◐",
};

/** Categories of the inventory with the status of each item. */
export function inventoryModel(
  inventory: Inventory,
  system: System,
  headless: boolean,
  selection: SelectedItem[],
  language: "en" | "pt-BR" = "pt-BR",
  other: (item: Item) => string | undefined = (item) => otherManagerPath(item),
): InventoryCategory[] {
  return inventory.categories
    .map((c) => ({
      id: c.id,
      title: c.name[language],
      rows: inventory.items
        .filter((i) => i.category === c.id)
        .map((item) => {
          const entry = resolveInstall(item, system);
          let status = itemStatus(item, system, headless, selection);
          const elsewhere = status === "available" ? other(item) : undefined;
          if (elsewhere) status = "other";
          const installed = selection.find((s) => s.id === item.id)?.version;
          return { item, status, method: entry ? (entry.method === "mise" ? `mise ${entry.tool}` : entry.method) : "-", ...(installed ? { installed } : {}), ...(elsewhere ? { elsewhere } : {}) };
        }),
    }))
    .filter((c) => c.rows.length > 0);
}

/** One line of the item list. */
export function rowLabel(row: InventoryRow, marked: boolean): string {
  const mark = marked ? "[x]" : "[ ]";
  return `${mark} ${STATUS_GLYPH[row.status] ?? " "} ${row.item.id.padEnd(22)} ${row.item.version.slice(0, 12).padEnd(13)} ${row.status}`;
}

/** True when an item can be marked for install or removal in the TUI. */
export function markable(row: InventoryRow): boolean {
  return !["unavailable", "system", "init"].includes(row.status);
}

export interface ChecklistEntry {
  label: string;
  ok: boolean;
  detail: string;
  /** Section of the user screen. */
  group?: "permissions" | "folders" | "setupvibe";
}

function mode(path: string): number | undefined {
  try {
    return statSync(path).mode & 0o777;
  } catch {
    return undefined;
  }
}

/**
 * Checklist of the user screen: groups, sudo, folders and their modes.
 *
 * @param probes replaceable facts, for tests
 */
export function userChecklist(probes: { groups: string[]; sudoNoPassword: boolean; home?: string; path?: string; initDone: boolean; agentAliases?: boolean }): ChecklistEntry[] {
  const home = probes.home ?? homedir();
  const dataMode = mode(join(home, ".setupvibe"));
  const sshMode = mode(join(home, ".ssh"));
  const keysMode = mode(join(home, ".ssh", "authorized_keys"));
  const localBin = join(home, ".local", "bin");
  const inPath = (probes.path ?? process.env.PATH ?? "").split(":").includes(localBin);
  const admin = probes.groups.includes("sudo") || probes.groups.includes("wheel") || probes.groups.includes("admin");
  const octal = (m: number | undefined) => (m === undefined ? "missing" : m.toString(8).padStart(3, "0"));
  return [
    { group: "permissions", label: "sudo or wheel group", ok: admin, detail: probes.groups.join(", ") || "none" },
    { group: "permissions", label: "sudo without password", ok: probes.sudoNoPassword, detail: probes.sudoNoPassword ? "available (needed by auto)" : "asks for a password" },
    { group: "folders", label: "~/.setupvibe is 700", ok: dataMode === 0o700, detail: octal(dataMode) },
    { group: "folders", label: "~/.local/bin in PATH", ok: existsSync(localBin) && inPath, detail: !existsSync(localBin) ? "missing" : inPath ? "yes" : "not in PATH" },
    { group: "folders", label: "~/.ssh is 700", ok: sshMode === undefined || sshMode === 0o700, detail: octal(sshMode) },
    { group: "folders", label: "authorized_keys is 600", ok: keysMode === undefined || keysMode === 0o600, detail: octal(keysMode) },
    { group: "setupvibe", label: "init completed", ok: probes.initDone, detail: probes.initDone ? "yes" : "run setupvibe init" },
    // The agent aliases start Claude Code, Codex and OpenCode without permission prompts (spec section 12).
    probes.agentAliases === false
      ? { group: "setupvibe", label: "agent aliases off", ok: true, detail: "cco, cxo and oco are not defined" }
      : { group: "setupvibe", label: "agent aliases skip permissions", ok: false, detail: "cco, cxo and oco bypass prompts; turn off: config set shell.agentAliases false" },
  ];
}

/** Current user's groups. */
export function currentGroups(): string[] {
  const proc = Bun.spawnSync(["id", "-nG"], { stdout: "pipe", stderr: "ignore" });
  return proc.stdout.toString().trim().split(/\s+/).filter(Boolean);
}

/** Whether sudo works without a password right now. */
export function sudoWithoutPassword(): boolean {
  if (process.platform === "win32") return false;
  return Bun.spawnSync(["sudo", "-n", "true"], { stdout: "ignore", stderr: "ignore" }).exitCode === 0;
}

/** Log files, newest first. */
export function logFiles(): string[] {
  const dir = statePath("logs");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".log"))
    .sort()
    .reverse();
}

/** Last events of a log file, as readable lines. */
export function logTail(file: string, lines = 30): string[] {
  try {
    return readFileSync(statePath("logs", file), "utf8")
      .trim()
      .split("\n")
      .slice(-lines)
      .map((l) => {
        try {
          const e = JSON.parse(l) as { time: string; item?: string; action: string; status: string; message?: string };
          return `${e.time.slice(11, 19)} ${e.status.padEnd(5)} ${e.action} ${e.item ?? ""}${e.message ? ` · ${e.message}` : ""}`;
        } catch {
          return l;
        }
      });
  } catch {
    return [];
  }
}

/** The working user name. */
export function userName(config: Record<string, unknown>): string {
  return typeof config.user === "string" ? config.user : currentUser().username;
}

/**
 * Step descriptions from a `--dry-run --json` envelope, for the plan preview
 * shown before an install or remove runs.
 */
export function planFromEnvelope(stdout: string): string[] {
  try {
    const envelope = JSON.parse(stdout) as { data?: { steps?: Array<{ description?: string; id?: string }> } };
    return (envelope.data?.steps ?? []).map((s) => `• ${s.description ?? s.id ?? "step"}`);
  } catch {
    return [];
  }
}

/** Items of a category by status, for the category list and the summaries. */
export interface StatusCounts {
  installed: number;
  outdated: number;
  failed: number;
  available: number;
  other: number;
  /** Items that can be installed or removed here. */
  markable: number;
}

/** Counts the statuses of some rows. */
export function statusCounts(rows: InventoryRow[]): StatusCounts {
  const n = (s: string) => rows.filter((r) => r.status === s).length;
  return { installed: n("installed"), outdated: n("outdated"), failed: n("failed"), available: n("available"), other: n("other"), markable: rows.filter(markable).length };
}

/** One event of a run log. */
export interface LogEvent {
  time: string;
  item: string;
  action: string;
  status: string;
  message?: string;
}

/** Last events of a log file, parsed; lines that are not JSON are skipped. */
export function logEvents(file: string, lines = 200): LogEvent[] {
  try {
    return readFileSync(statePath("logs", file), "utf8")
      .trim()
      .split("\n")
      .slice(-lines)
      .flatMap((l) => {
        try {
          const e = JSON.parse(l) as Partial<LogEvent>;
          return e.action ? [{ time: (e.time ?? "").slice(11, 19), item: e.item ?? "", action: e.action, status: e.status ?? "", ...(e.message ? { message: e.message } : {}) }] : [];
        } catch {
          return [];
        }
      });
  } catch {
    return [];
  }
}

/**
 * Readable name of a log file: "2026-11-12T10-00-00-000Z-auto.log" becomes
 * "12/11 10:00  auto" (day and month in local order are kept simple: dd/mm).
 */
export function runLabel(file: string): string {
  const m = file.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-\d{2}-\d{3}Z-(.+)\.log$/);
  if (!m) return file;
  return `${m[3]}/${m[2]} ${m[4]}:${m[5]}  ${m[6]}`;
}

/** Text bar of `width` cells with `part` of `total` filled. */
export function progressBar(part: number, total: number, width = 20): string {
  const filled = total > 0 ? Math.round((part / total) * width) : 0;
  return "█".repeat(filled) + "░".repeat(width - filled);
}

/** Shortens a text to `width` cells with an ellipsis. */
export function fit(text: string, width: number): string {
  return text.length <= width ? text.padEnd(width) : `${text.slice(0, Math.max(0, width - 1))}…`;
}
