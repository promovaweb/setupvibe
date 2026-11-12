/**
 * `migrate`: moves a machine set up by SetupVibe 1 to SetupVibe 2
 * (spec section 16).
 *
 * 1. Converts the SetupVibe 1 `.zshrc` and `.tmux.conf` to the SetupVibe 2
 *    blocks: the files are backed up and the lines the person added go to the
 *    `.local` files.
 * 2. Replaces the Omarchy block and keeps `ssh_copy_id` as a shortcut.
 * 3. Writes the SetupVibe 2 shell blocks and builds the first selection from
 *    what already passes its check (items marked `adopted`).
 * 4. Offers to remove each SetupVibe 1 duplicate (Go, rbenv, ~/.npm-global,
 *    the NodeSource repository): one question per item in a terminal, or the
 *    ids given to `--remove-legacy` without a terminal. Linuxbrew is never
 *    removed by SetupVibe; the command shows its uninstaller.
 *
 * `--dry-run` prints the plan, including the lines that would move.
 */
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "../system/home.ts";
import { join } from "node:path";
import { manifest } from "../core/app/manifest.ts";
import { edition } from "../core/app/edition.ts";
import { ExitCode } from "../core/app/exit-codes.ts";
import { confirm } from "../core/cli/input.ts";
import type { Command } from "../core/cli/registry.ts";
import type { Inventory } from "../inventory.ts";
import type { Step } from "../exec/runner.ts";
import { detectSystem } from "../system/detect.ts";
import { currentUser } from "../system/user.ts";
import { ensureStateDirs, readState, writeState } from "../state/store.ts";
import { shellSteps } from "../shell/config.ts";
import { legacyFindings } from "../ops/maintenance.ts";
import { addedLines, detectV1Here, maskSecretLine, legacyRemoveStep, LINUXBREW_UNINSTALL, migrateSteps, V1_TMUX, V1_ZSHRC } from "../legacy/v1.ts";
import { adoptExistingItems } from "./init.ts";
import { DRY_RUN_OPTION, executePlan } from "./execute.ts";

/** Ids accepted by --remove-legacy. */
export const LEGACY_IDS = ["go", "rbenv", "npm-global", "nodesource"] as const;

/** Parses `--remove-legacy go,rbenv` or `all` into finding ids. */
export function parseRemoveLegacy(value: unknown): string[] {
  if (typeof value !== "string" || !value.trim()) return [];
  const names = value.trim() === "all" ? [...LEGACY_IDS] : value.split(",").map((v) => v.trim()).filter(Boolean);
  const unknown = names.filter((n) => !(LEGACY_IDS as readonly string[]).includes(n));
  if (unknown.length) throw new Error(`Unknown --remove-legacy item(s): ${unknown.join(", ")}. Accepted: ${LEGACY_IDS.join(", ")} or all.`);
  return names.map((n) => `legacy-${n}`);
}

export const migrateCommand: Command = {
  name: "migrate",
  description: "Move a machine set up by SetupVibe 1 to SetupVibe 2, keeping your settings.",
  longDescription:
    "Backs up the SetupVibe 1 .zshrc and .tmux.conf, moves the lines you added to ~/.zshrc.local and ~/.tmux.conf.local, writes the SetupVibe 2 blocks, keeps ssh_copy_id as a shortcut and records what is already installed. Duplicates left by SetupVibe 1 are removed only after you confirm each one.",
  options: [
    DRY_RUN_OPTION,
    { name: "--remove-legacy", argument: { name: "items" }, description: `Without a terminal, SetupVibe 1 duplicates to remove: ${LEGACY_IDS.join(", ")} or all.` },
  ],
  exitCodes: [ExitCode.PARTIAL, ExitCode.UNSUPPORTED_SYSTEM, ExitCode.SUDO_PASSWORD],
  examples: [
    `${manifest.bin} migrate --dry-run`,
    `${manifest.bin} migrate`,
    `${manifest.bin} migrate --json --dry-run`,
    `${manifest.bin} migrate --remove-legacy go,rbenv`,
    `${manifest.bin} migrate --remove-legacy all`,
  ],
  run: async (ctx) => {
    const inventory = edition().inventory as Inventory;
    const detected = detectSystem(inventory.systems);
    if (!detected.system || detected.unsupportedReason) {
      return { code: ExitCode.UNSUPPORTED_SYSTEM, data: { system: detected }, text: `✗ ${detected.unsupportedReason}` };
    }
    let requested: string[];
    try {
      requested = parseRemoveLegacy(ctx.options["remove-legacy"]);
    } catch (e) {
      return { code: ExitCode.USAGE, data: { error: String(e) }, text: `✗ ${(e as Error).message}` };
    }
    const home = homedir();
    const v1 = detectV1Here(home);
    const legacy = legacyFindings(existsSync, home);
    if (!v1.found && !legacy.length) {
      return { data: { v1, migrated: false }, text: "✓ No SetupVibe 1 traces on this machine. Nothing to migrate." };
    }

    // What would move to the .local files, shown in the plan.
    const read = (p: string) => (existsSync(p) ? readFileSync(p, "utf8") : "");
    // Secrets in those lines are masked in the plan; the files keep them as they are.
    const moved = {
      zshrc: v1.zshrc ? addedLines(read(join(home, ".zshrc")), V1_ZSHRC).map(maskSecretLine) : [],
      tmux: v1.tmux ? addedLines(read(join(home, ".tmux.conf")), V1_TMUX).map(maskSecretLine) : [],
    };

    const config = readState<Record<string, unknown>>("config.json", {});
    const steps: Step[] = [...migrateSteps({ home, detection: v1 })];
    if (detected.system !== "windows" && (v1.zshrc || v1.tmux || v1.omarchyBlock)) {
      steps.push(
        ...shellSteps({
          system: detected.system,
          edition: manifest.edition,
          bin: manifest.bin,
          user: currentUser().username,
          home,
          agentAliases: (config.shell as { agentAliases?: boolean } | undefined)?.agentAliases ?? true,
          zsh: v1.zshrc || Boolean(Bun.which("zsh")),
          tmux: v1.tmux || Boolean(Bun.which("tmux")),
          starship: Boolean(Bun.which("starship")),
        }).filter((s) => s.id !== "login-shell"),
      );
    }

    // Duplicates: one question each in a terminal, otherwise only the ids given.
    const removable = legacy.filter((f) => legacyRemoveStep(f.id, home));
    const chosen: string[] = [];
    for (const f of removable) {
      if (requested.includes(f.id)) chosen.push(f.id);
      else if (ctx.interactive && !ctx.options["dry-run"] && (await confirm(`${f.text}\nRemove it now?`, false))) chosen.push(f.id);
    }
    for (const id of chosen) steps.push(legacyRemoveStep(id, home)!);
    const kept = legacy.filter((f) => !chosen.includes(f.id)).map((f) => f.id);
    const linuxbrew = legacy.some((f) => f.id === "legacy-linuxbrew");

    const extra = { v1, moved, removeLegacy: chosen, keptLegacy: kept, ...(linuxbrew ? { linuxbrewUninstall: LINUXBREW_UNINSTALL } : {}) };
    if (!ctx.options["dry-run"]) ensureStateDirs();
    const result = await executePlan(ctx, "migrate", steps, extra);
    if (ctx.options["dry-run"]) {
      const notes = [
        moved.zshrc.length ? `Lines that move to ~/.zshrc.local:\n${moved.zshrc.map((l) => `  ${l}`).join("\n")}` : "",
        moved.tmux.length ? `Lines that move to ~/.tmux.conf.local:\n${moved.tmux.map((l) => `  ${l}`).join("\n")}` : "",
        kept.length ? `Duplicates kept (remove with --remove-legacy, or answer yes in a terminal): ${kept.join(", ")}` : "",
      ].filter(Boolean);
      const base = result.text;
      return { ...result, text: () => [typeof base === "function" ? base() : (base ?? ""), ...notes].join("\n\n") };
    }
    if (result.code === ExitCode.SUCCESS || result.code === ExitCode.PARTIAL) {
      writeState("config.json", { ...readState<Record<string, unknown>>("config.json", {}), migratedFromV1: { at: new Date().toISOString(), edition: v1.edition ?? null } });
      const adopted = (config.init as { done?: boolean } | undefined)?.done ? await adoptExistingItems(inventory, detected.system, detected.headless) : [];
      if (adopted.length && !ctx.json) ctx.stderr(`✓ ${adopted.length} item(s) already installed were added to the selection.`);
      if (linuxbrew && !ctx.json) ctx.stderr(`! Linuxbrew stays: other formulas may use it. To remove it: ${LINUXBREW_UNINSTALL}`);
    }
    return result;
  },
};
