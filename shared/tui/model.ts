/**
 * Data behind the SetupVibe TUI screens, kept free of rendering so it can be
 * tested without a terminal.
 *
 * - inventory: categories with their items, status and marks;
 * - user: the checklist of permissions and folders (spec section 3);
 * - doctor: requirements, pending prerequisites and failed items.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { currentUser } from "../system/user.ts";
import { join } from "node:path";
import type { Inventory, Item, System } from "../inventory.ts";
import { resolveInstall } from "../inventory.ts";
import { itemStatus } from "../commands/inventory.ts";
import type { SelectedItem } from "../ops/inventory-ops.ts";
import type { InitRecord } from "../init/plan.ts";
import { missingPrerequisites } from "../init/plan.ts";
import { statePath } from "../state/store.ts";

export interface InventoryRow {
  item: Item;
  status: string;
  /** How the item installs on this system, for the detail panel. */
  method: string;
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
};

/** Categories of the inventory with the status of each item. */
export function inventoryModel(inventory: Inventory, system: System, headless: boolean, selection: SelectedItem[], language: "en" | "pt-BR" = "pt-BR"): InventoryCategory[] {
  return inventory.categories
    .map((c) => ({
      id: c.id,
      title: c.name[language],
      rows: inventory.items
        .filter((i) => i.category === c.id)
        .map((item) => {
          const entry = resolveInstall(item, system);
          return { item, status: itemStatus(item, system, headless, selection), method: entry ? (entry.method === "mise" ? `mise ${entry.tool}` : entry.method) : "-" };
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
export function userChecklist(probes: { groups: string[]; sudoNoPassword: boolean; home?: string; path?: string; initDone: boolean }): ChecklistEntry[] {
  const home = probes.home ?? homedir();
  const dataMode = mode(join(home, ".setupvibe"));
  const sshMode = mode(join(home, ".ssh"));
  const keysMode = mode(join(home, ".ssh", "authorized_keys"));
  const localBin = join(home, ".local", "bin");
  const inPath = (probes.path ?? process.env.PATH ?? "").split(":").includes(localBin);
  const admin = probes.groups.includes("sudo") || probes.groups.includes("wheel") || probes.groups.includes("admin");
  const octal = (m: number | undefined) => (m === undefined ? "missing" : m.toString(8).padStart(3, "0"));
  return [
    { label: "sudo or wheel group", ok: admin, detail: probes.groups.join(", ") || "none" },
    { label: "sudo without password", ok: probes.sudoNoPassword, detail: probes.sudoNoPassword ? "available (needed by auto)" : "asks for a password" },
    { label: "~/.setupvibe is 700", ok: dataMode === 0o700, detail: octal(dataMode) },
    { label: "~/.local/bin in PATH", ok: existsSync(localBin) && inPath, detail: !existsSync(localBin) ? "missing" : inPath ? "yes" : "not in PATH" },
    { label: "~/.ssh is 700", ok: sshMode === undefined || sshMode === 0o700, detail: octal(sshMode) },
    { label: "authorized_keys is 600", ok: keysMode === undefined || keysMode === 0o600, detail: octal(keysMode) },
    { label: "init completed", ok: probes.initDone, detail: probes.initDone ? "yes" : "run setupvibe init" },
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

export interface DoctorFinding {
  level: "ok" | "warn" | "fail";
  text: string;
  fix?: string;
}

/** Findings of the doctor screen. */
export function doctorFindings(inventory: Inventory, init: InitRecord | undefined, selection: SelectedItem[]): DoctorFinding[] {
  const out: DoctorFinding[] = [];
  const missing = missingPrerequisites(inventory, init);
  out.push(missing.length ? { level: "fail", text: `Prerequisites pending: ${missing.join(", ")}`, fix: "setupvibe init" } : { level: "ok", text: "init completed" });
  const failed = selection.filter((s) => s.status === "fail").map((s) => s.id);
  out.push(failed.length ? { level: "warn", text: `Items failing their check: ${failed.join(", ")}`, fix: `setupvibe install ${failed.join(" ")} --force` } : { level: "ok", text: "selected items pass their checks" });
  const outdated = selection.filter((s) => inventory.items.find((i) => i.id === s.id)?.version !== s.version).map((s) => s.id);
  out.push(outdated.length ? { level: "warn", text: `Outdated items: ${outdated.join(", ")}`, fix: "setupvibe update" } : { level: "ok", text: "selected items match the inventory" });
  return out;
}

/** The working user name. */
export function userName(config: Record<string, unknown>): string {
  return typeof config.user === "string" ? config.user : currentUser().username;
}
