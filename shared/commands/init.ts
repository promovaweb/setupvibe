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
import type { Inventory } from "../inventory.ts";
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

const icon = (c: RequirementCheck) => (c.status === "ok" ? color.ok("✓") : c.status === "warn" ? color.warn("!") : color.error("✗"));

export function requirementsText(checks: RequirementCheck[]): string {
  return checks.map((c) => `${icon(c)} ${c.name}: ${c.detail}${c.fix && c.status !== "ok" ? `\n  ${color.dim(c.fix)}` : ""}`).join("\n");
}

export const initCommand: Command = {
  name: "init",
  description: "Check requirements and install the prerequisites (build dependencies and mise).",
  longDescription: "Install commands, the TUI and auto only install inventory items after init has completed. Run init again when doctor reports new prerequisites.",
  options: [DRY_RUN_OPTION, { name: "--skip-network-check", description: "Skip the network and clock check.", hidden: true }],
  exitCodes: [ExitCode.PARTIAL, ExitCode.UNSUPPORTED_SYSTEM, ExitCode.ROOT, ExitCode.DISK_SPACE, ExitCode.NETWORK_OR_API],
  examples: [`${manifest.bin} init --dry-run`, `${manifest.bin} init`, `${manifest.bin} init --json`],
  run: async (ctx) => {
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
      writeState("config.json", { ...config, edition: manifest.edition, system: detected.system, init: record });
    }
    const resultText = result.text;
    return { ...result, text: () => blocks(section("Requirements"), requirementsText(checks), typeof resultText === "function" ? resultText() : resultText) };
  },
};
