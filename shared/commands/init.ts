/**
 * `init` command: checks requirements, installs the prerequisites (build
 * dependencies and mise) and records the init state in config.json.
 *
 * Refuses to run as root, on an unsupported system or when the other edition
 * is already set up (spec sections 1, 3, 6 and 17).
 */
import { homedir } from "node:os";
import { manifest } from "../core/app/manifest.ts";
import { edition } from "../core/app/edition.ts";
import { ExitCode } from "../core/app/exit-codes.ts";
import { blocks, color, section } from "../core/cli/format.ts";
import type { Command } from "../core/cli/registry.ts";
import type { Inventory, System } from "../inventory.ts";
import { realRunner } from "../exec/runner.ts";
import { installable } from "../auto/selection.ts";
import { checkItems } from "../auto/check.ts";
import type { SelectedItem } from "../ops/inventory-ops.ts";
import { isRoot } from "../exec/runner.ts";
import { detectSystem } from "../system/detect.ts";
import { ensureStateDirs, readState, writeState } from "../state/store.ts";
import { initPlan, type InitRecord } from "../init/plan.ts";
import {
  checkDisk,
  checkEdition,
  checkLocale,
  checkMemory,
  checkNetworkAndClock,
  checkRoot,
  exitCodeOf,
  freeDiskGb,
  totalMemoryGb,
  type RequirementCheck,
} from "../init/requirements.ts";
import { DRY_RUN_OPTION, executePlan } from "./execute.ts";
import { applyNetworkOptions, NETWORK_OPTIONS } from "../exec/network.ts";
import { windowsHealth, windowsHealthFinding } from "../ops/windows-health.ts";

const icon = (c: RequirementCheck) => (c.status === "ok" ? color.ok("✓") : c.status === "warn" ? color.warn("!") : color.error("✗"));

export function requirementsText(checks: RequirementCheck[]): string {
  return checks.map((c) => `${icon(c)} ${c.name}: ${c.detail}${c.fix && c.status !== "ok" ? `\n  ${color.dim(c.fix)}` : ""}`).join("\n");
}

export const initCommand: Command = {
  name: "init",
  description: "Check requirements and install the prerequisites (build dependencies and mise).",
  longDescription: "Install commands, the TUI and auto only install inventory items after init has completed. Run init again when doctor reports new prerequisites.",
  options: [DRY_RUN_OPTION, { name: "--skip-network-check", description: "Skip the network and clock check.", hidden: true }, ...NETWORK_OPTIONS],
  exitCodes: [ExitCode.PARTIAL, ExitCode.UNSUPPORTED_SYSTEM, ExitCode.ROOT, ExitCode.DISK_SPACE, ExitCode.NETWORK_OR_API],
  examples: [`${manifest.bin} init --dry-run`, `${manifest.bin} init`, `${manifest.bin} init --json`],
  run: async (ctx) => {
    applyNetworkOptions(ctx.options);
    const inventory = edition().inventory as Inventory;
    const detected = detectSystem(inventory.systems);
    if (detected.unsupportedReason || !detected.system) {
      return { code: ExitCode.UNSUPPORTED_SYSTEM, data: { system: detected }, text: `${color.error("✗")} ${detected.unsupportedReason}` };
    }
    const config = readState<Record<string, unknown>>("config.json", {});
    const checks: RequirementCheck[] = [
      checkRoot(isRoot(), false),
      checkEdition(config.edition as string | undefined, manifest.edition),
      checkDisk(freeDiskGb(), manifest.edition),
      checkMemory(totalMemoryGb()),
      checkLocale(process.env),
      ...(ctx.options["skip-network-check"] ? [] : await checkNetworkAndClock()),
      ...windowsHealthChecks(),
    ];
    const blocked = exitCodeOf(checks);
    if (blocked !== ExitCode.SUCCESS) {
      return { code: blocked, data: { system: detected, checks }, text: () => blocks(section("Requirements"), requirementsText(checks)) };
    }
    const steps = initPlan({ inventory, system: detected.system, arch: String(detected.arch), distro: detected.distro, home: homedir() });
    const result = await executePlan(ctx, "init", steps, { system: detected, checks });
    if (!ctx.options["dry-run"] && result.code === ExitCode.SUCCESS) {
      ensureStateDirs();
      const record: InitRecord = {
        done: true,
        at: new Date().toISOString(),
        version: manifest.version,
        system: detected.system,
        prerequisites: inventory.items.filter((i) => i.initOnly).map((i) => i.id),
      };
      const git = ctx.interactive ? askGitIdentity() : undefined;
      writeState("config.json", { ...config, edition: manifest.edition, system: detected.system, init: record, ...(git ? { git } : {}) });
      const adopted = await adoptExistingItems(inventory, detected.system, detected.headless);
      if (adopted.length && !ctx.json) ctx.stderr(`✓ ${adopted.length} item(s) already installed were added to the selection: ${adopted.join(", ")}`);
    }
    const resultText = result.text;
    return { ...result, text: () => blocks(section("Requirements"), requirementsText(checks), typeof resultText === "function" ? resultText() : resultText) };
  },
};

/**
 * Windows component store health as a warning of init (spec section 14.6);
 * the repair is `doctor --repair-windows`. Empty outside Windows.
 */
export function windowsHealthChecks(health = windowsHealth()): RequirementCheck[] {
  const finding = windowsHealthFinding(health);
  if (!finding) return [];
  return [{ name: "Windows health", status: finding.level === "ok" ? "ok" : "warn", detail: finding.text, ...(finding.fix ? { fix: finding.fix } : {}) }];
}

/** Reads `git config --global <key>`, or undefined. */
function gitConfig(key: string): string | undefined {
  const r = Bun.spawnSync(["git", "config", "--global", key], { stdout: "pipe", stderr: "ignore" });
  return r.stdout.toString().trim() || undefined;
}

/**
 * Asks for the Git name and e-mail once, when Git has none (spec section 7).
 * The answer goes to git config and to config.json.
 */
export function askGitIdentity(read: (question: string) => string | null = (q) => prompt(q)): { name?: string; email?: string } | undefined {
  const current = { name: gitConfig("user.name"), email: gitConfig("user.email") };
  if (current.name && current.email) return current;
  const name = current.name ?? (read("Git name (empty to skip):")?.trim() || undefined);
  const email = current.email ?? (read("Git e-mail (empty to skip):")?.trim() || undefined);
  if (name && !current.name) Bun.spawnSync(["git", "config", "--global", "user.name", name]);
  if (email && !current.email) Bun.spawnSync(["git", "config", "--global", "user.email", email]);
  return name || email ? { ...(name ? { name } : {}), ...(email ? { email } : {}) } : undefined;
}

/**
 * Builds the first selection from what the machine already has (spec section
 * 16): on a machine set up by SetupVibe 1, or by hand, items that pass their
 * check are recorded as installed. Nothing is installed or removed.
 */
export async function adoptExistingItems(inventory: Inventory, system: System, headless: boolean): Promise<string[]> {
  const current = readState<{ items?: SelectedItem[] }>("selection.json", {}).items ?? [];
  if (current.length) return [];
  const candidates = inventory.items.filter((i) => !i.initOnly && !i.securityModule && installable(i, system) && !(headless && (i.flags ?? []).includes("gui")));
  const checks = await checkItems(candidates, realRunner());
  const adopted = candidates.filter((i) => checks.find((c) => c.id === i.id)?.status === "ok");
  if (adopted.length) writeState("selection.json", { items: adopted.map((i) => ({ id: i.id, version: i.version, status: "ok", adopted: true })) });
  return adopted.map((i) => i.id);
}
