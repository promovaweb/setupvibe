/**
 * `shell` commands: apply or remove the environment configuration (spec
 * section 7) on demand. `auto` applies it on its own.
 */
import { currentUser } from "../system/user.ts";
import { manifest } from "../core/app/manifest.ts";
import { edition } from "../core/app/edition.ts";
import { ExitCode } from "../core/app/exit-codes.ts";
import type { Command } from "../core/cli/registry.ts";
import type { Inventory } from "../inventory.ts";
import { detectSystem } from "../system/detect.ts";
import { readState } from "../state/store.ts";
import { shellRemoveSteps, shellSteps } from "../shell/config.ts";
import { homedir } from "node:os";
import { detectV1Here, migrateSteps } from "../legacy/v1.ts";
import { DRY_RUN_OPTION, executePlan } from "./execute.ts";

const applyCommand: Command = {
  name: "apply",
  description: "Write the SetupVibe shell block, aliases, Starship preset and tmux settings.",
  options: [DRY_RUN_OPTION],
  exitCodes: [ExitCode.PARTIAL, ExitCode.UNSUPPORTED_SYSTEM],
  examples: [`${manifest.bin} shell apply --dry-run`],
  run: (ctx) => {
    const inventory = edition().inventory as Inventory;
    const detected = detectSystem(inventory.systems);
    if (!detected.system || detected.unsupportedReason) return { code: ExitCode.UNSUPPORTED_SYSTEM, data: {}, text: `✗ ${detected.unsupportedReason}` };
    const config = readState<Record<string, unknown>>("config.json", {});
    const legacy = detectV1Here(homedir());
    const steps = [...(legacy.found ? migrateSteps({ home: homedir(), detection: { ...legacy, sshCopyId: false } }) : []), ...shellSteps({
      system: detected.system,
      edition: manifest.edition,
      bin: manifest.bin,
      user: currentUser().username,
      agentAliases: (config.shell as { agentAliases?: boolean } | undefined)?.agentAliases ?? true,
      zsh: Boolean(Bun.which("zsh")),
      tmux: Boolean(Bun.which("tmux")),
      starship: true,
    })];
    return executePlan(ctx, "shell-apply", steps);
  },
};

const removeCommand: Command = {
  name: "remove",
  description: "Remove the SetupVibe blocks from ~/.zshrc, ~/.bashrc and ~/.tmux.conf, keeping everything else.",
  options: [DRY_RUN_OPTION],
  exitCodes: [ExitCode.PARTIAL],
  examples: [`${manifest.bin} shell remove`],
  run: (ctx) => executePlan(ctx, "shell-remove", shellRemoveSteps()),
};

export const shellCommand: Command = {
  name: "shell",
  description: "Apply or remove the SetupVibe shell configuration.",
  subcommands: [applyCommand, removeCommand],
};
