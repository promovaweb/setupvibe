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
import { shellRemoveSteps, shellSteps, agentAliasesEnabled } from "../shell/config.ts";
import { homedir } from "../system/home.ts";
import { detectV1Here, migrateSteps } from "../legacy/v1.ts";
import { DRY_RUN_OPTION, executePlan } from "./execute.ts";

const applyCommand: Command = {
  name: "apply",
  description: "Write the SetupVibe shell block, aliases, Starship preset and tmux settings.",
  options: [DRY_RUN_OPTION, { name: "--preset", argument: { name: "name" }, description: "Apply a preset from starship preset --list." }],
  exitCodes: [ExitCode.PARTIAL, ExitCode.UNSUPPORTED_SYSTEM],
  examples: [`${manifest.bin} shell apply --dry-run`],
  run: (ctx) => {
    const inventory = edition().inventory as Inventory;
    const detected = detectSystem(inventory.systems);
    if (!detected.system || detected.unsupportedReason) return { code: ExitCode.UNSUPPORTED_SYSTEM, data: {}, text: `✗ ${detected.unsupportedReason}` };
    const preset = ctx.options.preset as string | undefined;
    if (preset !== undefined && (detected.system === "windows" || !/^[a-z0-9][a-z0-9-]*$/.test(preset))) {
      return { code: ExitCode.USAGE, data: {}, text: "Use um preset de starship preset --list no Linux, WSL ou macOS." };
    }
    const config = readState<Record<string, unknown>>("config.json", {});
    const legacy = detectV1Here(homedir());
    const steps = [...(manifest.edition !== "omarchy" && legacy.found ? migrateSteps({ home: homedir(), detection: { ...legacy, sshCopyId: false } }) : []), ...shellSteps({
      system: detected.system,
      edition: manifest.edition,
      bin: manifest.bin,
      user: currentUser().username,
      agentAliases: agentAliasesEnabled(config),
      zsh: Boolean(Bun.which("zsh")),
      tmux: Boolean(Bun.which("tmux")),
      starship: true,
      preset,
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
