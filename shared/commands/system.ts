/**
 * `system` command: what SetupVibe detected about this machine.
 *
 * Shows the supported system, version, architecture, WSL, headless and
 * public IP flags, the variant (local, remote-headless or remote-exposed)
 * and whether a newer SetupVibe exists. Exits with UNSUPPORTED_SYSTEM when
 * this edition cannot run here.
 */
import { manifest } from "../core/app/manifest.ts";
import { edition } from "../core/app/edition.ts";
import { ExitCode } from "../core/app/exit-codes.ts";
import { blocks, section, table } from "../core/cli/format.ts";
import type { Command } from "../core/cli/registry.ts";
import type { Inventory } from "../inventory.ts";
import { detectSystem } from "../system/detect.ts";
import { checkForUpdate } from "../state/update.ts";

export const systemCommand: Command = {
  name: "system",
  description: "Show the detected system, machine variant and update status.",
  options: [{ name: "--no-update-check", description: "Skip the update check." }],
  exitCodes: [ExitCode.UNSUPPORTED_SYSTEM],
  examples: [`${manifest.bin} system`, `${manifest.bin} system --json`],
  run: async (ctx) => {
    const inventory = edition().inventory as Inventory;
    const detected = detectSystem(inventory.systems);
    const update = ctx.options["no-update-check"] ? undefined : await checkForUpdate(manifest.version, "stable");
    const data = { edition: manifest.edition, ...detected, update };
    const yes = (b: boolean) => (b ? "yes" : "no");
    return {
      data,
      code: detected.unsupportedReason ? ExitCode.UNSUPPORTED_SYSTEM : ExitCode.SUCCESS,
      text: () =>
        blocks(
          section("System"),
          table([
            ["System", detected.system ?? `unsupported (${detected.id})`],
            ["Name", detected.name],
            ["Version", detected.version || "-"],
            ["Architecture", detected.arch],
            ["WSL", yes(detected.wsl)],
            ["Headless", yes(detected.headless)],
            ["Public IP", yes(detected.publicIp)],
            ["Variant", detected.variant],
            ["Supported", detected.unsupportedReason ?? "yes"],
          ]),
          update
            ? blocks(
                section("Update"),
                table([
                  ["Current", update.current],
                  ["Latest", update.latest ?? "unknown (offline)"],
                  ["Update", update.updateRequired ? "required" : update.updateAvailable ? "available" : "up to date"],
                ]),
              )
            : "",
        ),
    };
  },
};
