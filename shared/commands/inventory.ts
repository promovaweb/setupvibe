/**
 * Inventory commands: `list`, `install`, `remove` and `update` (spec section 8).
 *
 * Installing requires a completed init (section 6). Every command that
 * changes the machine accepts `--dry-run`, records the result in
 * selection.json (or external.json for apps outside the inventory) and exits
 * with PARTIAL when some steps fail.
 */
import { currentUser } from "../system/user.ts";
import { manifest } from "../core/app/manifest.ts";
import { edition } from "../core/app/edition.ts";
import { ExitCode } from "../core/app/exit-codes.ts";
import { blocks, color, section } from "../core/cli/format.ts";
import { confirm } from "../core/cli/input.ts";
import type { Command, Context, Result } from "../core/cli/registry.ts";
import type { Inventory, Item, System } from "../inventory.ts";
import { flagsFor, resolveInstall } from "../inventory.ts";
import { realRunner, runSteps } from "../exec/runner.ts";
import { detectSystem, type DetectedSystem } from "../system/detect.ts";
import { readState, writeState } from "../state/store.ts";
import type { InitRecord } from "../init/plan.ts";
import { resolveAnswers } from "../auto/answers.ts";
import { selectItems } from "../auto/selection.ts";
import { autoPlan } from "../auto/plan.ts";
import { checkItems } from "../auto/check.ts";
import { hasAuthorizedKey } from "./security.ts";
import { executePlan, DRY_RUN_OPTION } from "./execute.ts";
import { totalMemoryGb } from "../init/requirements.ts";
import {
  dependentsOf,
  dropFromSelection,
  externalInstallStep,
  externalRemoveStep,
  mergeSelection,
  MISE_TOOL,
  outdatedItems,
  removePlan,
  splitToolSpec,
  type ExternalApp,
  type SelectedItem,
} from "../ops/inventory-ops.ts";

interface Machine {
  inventory: Inventory;
  detected: DetectedSystem;
  system: System;
  config: Record<string, unknown>;
  selection: SelectedItem[];
}

/** Detects the machine; returns a Result to print when it cannot continue. */
function machine(needInit: boolean): Machine | Result {
  const inventory = edition().inventory as Inventory;
  const detected = detectSystem(inventory.systems);
  if (!detected.system || detected.unsupportedReason) {
    return { code: ExitCode.UNSUPPORTED_SYSTEM, data: { system: detected }, text: `✗ ${detected.unsupportedReason}` };
  }
  const config = readState<Record<string, unknown>>("config.json", {});
  if (needInit && !(config.init as InitRecord | undefined)?.done) {
    return { code: ExitCode.CONFIG, data: { init: false }, text: `✗ init has not been completed. Run: ${manifest.bin} init` };
  }
  const selection = readState<{ items?: SelectedItem[] }>("selection.json", {}).items ?? [];
  return { inventory, detected, system: detected.system, config, selection };
}

const isResult = (m: Machine | Result): m is Result => "text" in m;

/** Status of an item on this system, for `list` and the TUI. */
export function itemStatus(item: Item, system: System, headless: boolean, selected: SelectedItem[]): string {
  const entry = resolveInstall(item, system);
  if (!entry || entry.method === "unsupported") return "unavailable";
  if (entry.method === "preinstalled") return "system";
  if (item.initOnly) return "init";
  const s = selected.find((x) => x.id === item.id);
  if (s) return s.version === item.version ? (s.status === "fail" ? "failed" : "installed") : "outdated";
  if (headless && flagsFor(item, system).includes("gui")) return "gui";
  return "available";
}

const listCommand: Command = {
  name: "list",
  description: "Show the inventory with the status of each item on this system.",
  options: [
    { name: "--category", argument: { name: "id" }, description: "Only one category." },
    { name: "--check", description: "Also run each selected item's check." },
  ],
  exitCodes: [ExitCode.UNSUPPORTED_SYSTEM],
  examples: [`${manifest.bin} list`, `${manifest.bin} list --category ai --json`],
  run: async (ctx) => {
    const m = machine(false);
    if (isResult(m)) return m;
    const category = ctx.options.category as string | undefined;
    const items = m.inventory.items.filter((i) => !category || i.category === category);
    const checks = ctx.options.check ? await checkItems(items.filter((i) => m.selection.some((s) => s.id === i.id)), realRunner()) : [];
    const rows = items.map((i) => ({
      id: i.id,
      name: i.name,
      category: i.category,
      version: i.version,
      default: i.default,
      status: itemStatus(i, m.system, m.detected.headless, m.selection),
      ...(checks.length ? { check: checks.find((c) => c.id === i.id)?.status } : {}),
    }));
    return {
      data: { system: m.system, items: rows },
      text: () =>
        m.inventory.categories
          .filter((c) => rows.some((r) => r.category === c.id))
          .map((c) =>
            blocks(
              section(c.name.en),
              rows
                .filter((r) => r.category === c.id)
                .map((r) => `  ${r.status === "installed" ? color.ok("●") : r.status === "outdated" || r.status === "failed" ? color.warn("●") : color.dim("○")} ${r.id.padEnd(22)} ${r.version.slice(0, 12).padEnd(13)} ${color.dim(r.status)}`)
                .join("\n"),
            ),
          )
          .join("\n\n"),
    };
  },
};

/** Builds and runs the plan for explicit items, then records the selection. */
async function installItems(ctx: Context, m: Machine, ids: string[], force: boolean): Promise<Result> {
  let selection;
  try {
    selection = selectItems({ inventory: m.inventory, system: m.system, headless: m.detected.headless, ids });
  } catch (e) {
    return { code: ExitCode.USAGE, data: { error: String(e) }, text: `✗ ${(e as Error).message}` };
  }
  const dryRun = Boolean(ctx.options["dry-run"]);
  if (!force && !dryRun) {
    const already = await checkItems(selection.items.filter((i) => !i.securityModule), realRunner());
    const done = already.filter((c) => c.status === "ok").map((c) => c.id);
    if (done.length) {
      selection = { items: selection.items.filter((i) => !done.includes(i.id)), skipped: [...selection.skipped, ...done.map((id) => ({ id, reason: "already installed with the pinned version (use --force to reinstall)" }))] };
    }
  }
  const user = currentUser();
  const plan = autoPlan({
    inventory: m.inventory,
    edition: manifest.edition,
    system: m.system,
    arch: String(m.detected.arch),
    distro: m.detected.distro,
    variant: m.detected.variant,
    user: user.username,
    userHasKey: hasAuthorizedKey(user.homedir),
    initDone: true,
    memoryGb: totalMemoryGb(),
    answers: resolveAnswers({}, {}),
    selection,
    createdNopasswd: false,
    shell: selection.items.some((i) => ["zsh", "tmux", "tpm", "starship", "oh-my-zsh"].includes(i.id)),
    agentAliases: (m.config.shell as { agentAliases?: boolean } | undefined)?.agentAliases ?? true,
  });
  const steps = selection.items.length ? plan.steps.filter((s) => s.id !== "git-identity") : [];
  for (const s of selection.skipped) if (!ctx.json) ctx.stderr(`- ${s.id}: ${s.reason}`);
  const result = await executePlan(ctx, "install", steps, { items: selection.items.map((i) => i.id), skipped: selection.skipped });
  if (!dryRun && selection.items.length) {
    const checked = await checkItems(selection.items.filter((i) => !i.securityModule), realRunner());
    const added = selection.items.map((i) => ({ id: i.id, version: i.version, status: checked.find((c) => c.id === i.id)?.status ?? ("ok" as const) }));
    writeState("selection.json", { items: mergeSelection(m.selection, added) });
    if (checked.some((c) => c.status === "fail")) return { ...result, code: ExitCode.PARTIAL, data: { ...(result.data as object), checks: checked } };
  }
  return result;
}

const installCommand: Command = {
  name: "install",
  description: "Install inventory items, or an app outside the inventory with --external.",
  arguments: [{ name: "items", description: "Item ids, or one mise tool with --external (tool or tool@version).", required: true, variadic: true }],
  options: [
    { name: "--external", description: "Install a mise tool that is not in the inventory; the version is pinned and recorded in external.json." },
    { name: "--force", description: "Reinstall items that already pass their check." },
    DRY_RUN_OPTION,
  ],
  exitCodes: [ExitCode.PARTIAL, ExitCode.CONFIG, ExitCode.UNSUPPORTED_SYSTEM],
  examples: [`${manifest.bin} install docker`, `${manifest.bin} install go rust --dry-run`, `${manifest.bin} install --external terraform@1.13.4`],
  run: async (ctx) => {
    const m = machine(true);
    if (isResult(m)) return m;
    if (!ctx.options.external) return installItems(ctx, m, ctx.args, Boolean(ctx.options.force));

    if (ctx.args.length !== 1 || !MISE_TOOL.test(ctx.args[0]!)) return { code: ExitCode.USAGE, data: {}, text: "✗ --external takes one mise tool, such as terraform or terraform@1.13.4." };
    const { tool, version: given } = splitToolSpec(ctx.args[0]!);
    let version = given;
    if (!version) {
      const latest = await realRunner().exec({ argv: [`${currentUser().homedir}/.local/bin/mise`, "latest", tool] });
      version = latest.stdout.trim();
      if (latest.code !== 0 || !version) return { code: ExitCode.NOT_FOUND, data: { tool }, text: `✗ mise does not know ${tool}.` };
    }
    const result = await executePlan(ctx, "install-external", [externalInstallStep(tool, version)], { tool, version });
    if (!ctx.options["dry-run"] && result.code === ExitCode.SUCCESS) {
      const apps = readState<{ apps?: ExternalApp[] }>("external.json", {}).apps ?? [];
      writeState("external.json", { apps: [...apps.filter((a) => a.tool !== tool), { tool, version, installedAt: new Date().toISOString() }] });
    }
    return result;
  },
};

const removeCommand: Command = {
  name: "remove",
  description: "Remove inventory items, or an app installed with install --external.",
  arguments: [{ name: "items", description: "Item ids, or one tool with --external.", required: true, variadic: true }],
  options: [
    { name: "--external", description: "Remove an app installed outside the inventory." },
    { name: "--include-native", description: "Also remove packages installed by the system package manager." },
    { name: "--force", description: "Remove even when other selected items require it." },
    { name: "--yes", aliases: ["-y"], description: "Do not ask for confirmation." },
    DRY_RUN_OPTION,
  ],
  exitCodes: [ExitCode.PARTIAL, ExitCode.UNSUPPORTED_SYSTEM, ExitCode.INTERRUPTED],
  examples: [`${manifest.bin} remove go --yes`, `${manifest.bin} remove docker --include-native --dry-run`, `${manifest.bin} remove --external terraform --yes`],
  run: async (ctx) => {
    const m = machine(false);
    if (isResult(m)) return m;
    const dryRun = Boolean(ctx.options["dry-run"]);
    const ask = async (what: string): Promise<Result | undefined> => {
      if (dryRun || ctx.options.yes) return undefined;
      if (!ctx.interactive) return { code: ExitCode.USAGE, data: {}, text: "✗ Removal needs confirmation. Pass --yes in non-interactive runs." };
      return (await confirm(`Remove ${what}?`)) ? undefined : { code: ExitCode.INTERRUPTED, data: {}, text: "Cancelled." };
    };

    if (ctx.options.external) {
      const tool = ctx.args[0]!;
      const apps = readState<{ apps?: ExternalApp[] }>("external.json", {}).apps ?? [];
      if (!apps.some((a) => a.tool === tool)) return { code: ExitCode.NOT_FOUND, data: { tool }, text: `✗ ${tool} was not installed with install --external.` };
      const stop = await ask(tool);
      if (stop) return stop;
      const result = await executePlan(ctx, "remove-external", [externalRemoveStep(tool)], { tool });
      if (!dryRun && result.code === ExitCode.SUCCESS) writeState("external.json", { apps: apps.filter((a) => a.tool !== tool) });
      return result;
    }

    const unknown = ctx.args.filter((id) => !m.inventory.items.some((i) => i.id === id));
    if (unknown.length) return { code: ExitCode.USAGE, data: { unknown }, text: `✗ Unknown items: ${unknown.join(", ")}` };
    const selectedIds = m.selection.map((s) => s.id);
    if (!ctx.options.force) {
      const blocked = ctx.args.map((id) => ({ id, by: dependentsOf(id, selectedIds.filter((s) => !ctx.args.includes(s)), m.inventory) })).filter((b) => b.by.length);
      if (blocked.length) return { code: ExitCode.USAGE, data: { blocked }, text: blocked.map((b) => `✗ ${b.id} is required by ${b.by.join(", ")}. Remove those too, or pass --force.`).join("\n") };
    }
    const items = m.inventory.items.filter((i) => ctx.args.includes(i.id));
    const plan = removePlan(items, m.system, { includeNative: Boolean(ctx.options["include-native"]) });
    for (const r of plan.refused) if (!ctx.json) ctx.stderr(`- ${r.id}: ${r.reason}`);
    if (!plan.steps.length) return { code: plan.refused.length ? ExitCode.PARTIAL : ExitCode.SUCCESS, data: { refused: plan.refused }, text: "Nothing removed." };
    const stop = await ask(plan.steps.map((s) => s.id).join(", "));
    if (stop) return stop;
    const result = await executePlan(ctx, "remove", plan.steps, { refused: plan.refused });
    if (!dryRun) {
      const removed = (result.results ?? []).filter((r) => r.status === "ok").map((r) => r.id);
      writeState("selection.json", { items: dropFromSelection(m.selection, removed) });
    }
    return plan.refused.length && result.code === ExitCode.SUCCESS ? { ...result, code: ExitCode.PARTIAL } : result;
  },
};

const updateCommand: Command = {
  name: "update",
  description: "Update the selected items whose pinned version changed in this SetupVibe's inventory.",
  options: [DRY_RUN_OPTION],
  exitCodes: [ExitCode.PARTIAL, ExitCode.CONFIG, ExitCode.UNSUPPORTED_SYSTEM],
  examples: [`${manifest.bin} update --dry-run`, `${manifest.bin} update`],
  run: async (ctx) => {
    const m = machine(true);
    if (isResult(m)) return m;
    const outdated = outdatedItems(m.selection, m.inventory);
    if (!outdated.length) return { data: { outdated: [] }, text: `${color.ok("✓")} Every selected item matches the inventory.` };
    if (!ctx.json) for (const o of outdated) ctx.stderr(`↑ ${o.item.id}: ${o.from} → ${o.to}`);
    const result = await installItems(ctx, m, outdated.map((o) => o.item.id), true);
    return { ...result, data: { ...(result.data as object), outdated: outdated.map((o) => ({ id: o.item.id, from: o.from, to: o.to })) } };
  },
};

/** Installs explicit items after the usual checks; used by config import. */
export async function installItemsFor(ctx: Context, ids: string[]): Promise<Result> {
  const m = machine(true);
  if (isResult(m)) return m;
  return installItems(ctx, m, ids, false);
}

export const inventoryCommands: Command[] = [listCommand, installCommand, removeCommand, updateCommand];

/** Re-exported for tests. */
export { runSteps };
