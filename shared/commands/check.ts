/**
 * `check` command: verifies the selected inventory items.
 *
 * Reads the selection from selection.json (or the essencial profile when
 * there is none) and runs each item's verify command. Exits with PARTIAL
 * when an item is missing or has the wrong version.
 */
import { manifest } from "../core/app/manifest.ts";
import { edition } from "../core/app/edition.ts";
import { ExitCode } from "../core/app/exit-codes.ts";
import { color } from "../core/cli/format.ts";
import type { Command } from "../core/cli/registry.ts";
import type { Inventory } from "../inventory.ts";
import { profileItems } from "../inventory.ts";
import { realRunner } from "../exec/runner.ts";
import { detectSystem } from "../system/detect.ts";
import { readState } from "../state/store.ts";
import { installable } from "../auto/selection.ts";
import { checkItems } from "../auto/check.ts";

export const checkCommand: Command = {
  name: "check",
  description: "Verify that the selected inventory items are installed with the pinned versions.",
  arguments: [{ name: "items", description: "Item ids to check; the selection when omitted.", variadic: true }],
  exitCodes: [ExitCode.PARTIAL, ExitCode.UNSUPPORTED_SYSTEM],
  examples: [`${manifest.bin} check`, `${manifest.bin} check node php --json`],
  run: async (ctx) => {
    const inventory = edition().inventory as Inventory;
    const detected = detectSystem(inventory.systems);
    if (!detected.system || detected.unsupportedReason) return { code: ExitCode.UNSUPPORTED_SYSTEM, data: { system: detected }, text: `✗ ${detected.unsupportedReason}` };
    const system = detected.system;
    const selection = readState<{ items?: { id: string }[] }>("selection.json", {});
    const ids = ctx.args.length ? ctx.args : selection.items?.map((i) => i.id) ?? profileItems(inventory, "essencial");
    const unknown = ids.filter((id) => !inventory.items.some((i) => i.id === id));
    if (unknown.length) return { code: ExitCode.USAGE, data: { unknown }, text: `✗ Unknown items: ${unknown.join(", ")}` };
    const items = inventory.items.filter((i) => ids.includes(i.id) && installable(i, system) && !i.securityModule && !i.initOnly);
    const results = await checkItems(items, realRunner());
    const failed = results.filter((r) => r.status === "fail");
    return {
      code: failed.length ? ExitCode.PARTIAL : ExitCode.SUCCESS,
      data: { system, results },
      text: () => results.map((r) => `${r.status === "ok" ? color.ok("✓") : color.error("✗")} ${r.id} ${color.dim(r.output || "not found")}${r.status === "fail" && r.expected ? color.dim(` (expected ${r.expected})`) : ""}`).join("\n"),
    };
  },
};
