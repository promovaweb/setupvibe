import { EDITIONS, edition, isEdition, type EditionId } from "../core/app/edition.ts";
import { AppError } from "../core/app/errors.ts";
import { ExitCode } from "../core/app/exit-codes.ts";
import type { Command } from "../core/cli/registry.ts";
import { readState, writeState } from "../state/store.ts";
import { ALL_SYSTEMS, type Inventory } from "../inventory.ts";
import { detectSystem, hasGraphicalSession, type DetectedSystem } from "../system/detect.ts";
import { isRoot } from "../exec/runner.ts";

export const EDITION_REQUIRED = "Choose an edition: setupvibe <desktop|server|omarchy> <command>, or run setupvibe edition set <edition>.";

export function savedEdition(): EditionId | undefined {
  const { edition } = readState<Record<string, unknown>>("edition.json", {});
  return isEdition(edition) ? edition : undefined;
}

export function suggestedEdition(system?: DetectedSystem, platform = process.platform): EditionId {
  const detected = system ?? detectSystem(ALL_SYSTEMS);
  if (detected.system === "omarchy") return "omarchy";
  const graphical = !detected.headless || (!system && platform === "linux" && hasGraphicalSession());
  return platform === "linux" && !graphical ? "server" : "desktop";
}

export function editionRefusal(id: EditionId, system: DetectedSystem, platform = process.platform): string | undefined {
  if (id === "omarchy" && system.system !== "omarchy") return "The Omarchy edition requires Omarchy (/usr/share/omarchy).";
  if (id === "server" && platform !== "linux") return "The Server edition runs on Linux only.";
  return system.unsupportedReason;
}

export function editionChange(before: EditionId | undefined, after: EditionId): string {
  return `Default edition: ${before ?? "none"} → ${after}. The TUI and commands without an edition will use the ${after} inventory. Installed items and system settings stay as they are.`;
}

export function saveEdition(id: EditionId): void {
  if (isRoot() && id !== "server") throw new AppError(ExitCode.ROOT, `The ${id} edition does not run as root.`);
  const refusal = editionRefusal(id, detectSystem((edition(id).inventory as Inventory).systems));
  if (refusal) throw new AppError(ExitCode.UNSUPPORTED_SYSTEM, refusal);
  writeState("edition.json", { edition: id });
}

export const editionCommand: Command = {
  name: "edition",
  description: "Show the edition saved for this user.",
  examples: ["setupvibe edition", "setupvibe edition --json", "setupvibe edition set desktop", "setupvibe edition set server", "setupvibe edition set omarchy"],
  run: () => {
    const current = savedEdition();
    return { data: { edition: current ?? null }, text: current ? `Saved edition: ${current}` : `No edition saved. ${EDITION_REQUIRED}` };
  },
  subcommands: [{
    name: "set",
    description: "Show what changes and save the default edition for this user.",
    arguments: [{ name: "edition", required: true, values: EDITIONS, description: "Edition used by the TUI and by commands that omit the edition." }],
    exitCodes: [ExitCode.ROOT, ExitCode.UNSUPPORTED_SYSTEM],
    examples: ["setupvibe edition set desktop", "setupvibe edition set server", "setupvibe edition set omarchy", "setupvibe edition set desktop --json", "setupvibe edition set server --json"],
    run: (ctx) => {
      const id = ctx.args[0];
      if (!isEdition(id)) throw new AppError(ExitCode.USAGE, EDITION_REQUIRED);
      const previous = savedEdition();
      ctx.stderr(editionChange(previous, id));
      saveEdition(id);
      return { data: { previous: previous ?? null, edition: id }, text: `Saved edition: ${id}` };
    },
  }],
};
