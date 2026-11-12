/**
 * `security` commands: apply the shared security module.
 *
 * `setupvibe-server` applies it during init and auto; `setupvibe` applies it
 * on exposed machines (spec sections 12 and 18). `security apply` runs it on
 * demand.
 */
import { existsSync, readFileSync } from "node:fs";
import { currentUser } from "../system/user.ts";
import { manifest } from "../core/app/manifest.ts";
import { edition } from "../core/app/edition.ts";
import { ExitCode } from "../core/app/exit-codes.ts";
import type { Command } from "../core/cli/registry.ts";
import type { Inventory } from "../inventory.ts";
import { detectSystem } from "../system/detect.ts";
import { securityPlan } from "../security/plan.ts";
import { readSecurityRecord, securityRecordPath, securityRemovePlan } from "../security/record.ts";
import { DRY_RUN_OPTION, executePlan } from "./execute.ts";

/** True when the user has at least one key in ~/.ssh/authorized_keys. */
export function hasAuthorizedKey(home: string): boolean {
  const file = `${home}/.ssh/authorized_keys`;
  if (!existsSync(file)) return false;
  return readFileSync(file, "utf8")
    .split("\n")
    .some((l) => /^(ssh-|ecdsa-|sk-)/.test(l.trim()));
}

const applyCommand: Command = {
  name: "apply",
  description: "Apply the firewall, fail2ban, automatic updates, SSH key-only login and time sync.",
  options: [
    { name: "--timezone", argument: { name: "zone" }, description: "Time zone, such as America/Sao_Paulo." },
    { name: "--swarm", description: "Open the Docker Swarm ports (server only)." },
    DRY_RUN_OPTION,
  ],
  exitCodes: [ExitCode.PARTIAL, ExitCode.UNSUPPORTED_SYSTEM],
  examples: [`${manifest.bin} security apply --dry-run`, `${manifest.bin} security apply --timezone America/Sao_Paulo`],
  run: (ctx) => {
    const inventory = edition().inventory as Inventory;
    const detected = detectSystem(inventory.systems);
    if (!detected.system || detected.unsupportedReason) {
      return { code: ExitCode.UNSUPPORTED_SYSTEM, data: { system: detected }, text: `✗ ${detected.unsupportedReason}` };
    }
    const user = currentUser();
    const plan = securityPlan({
      system: detected.system,
      edition: manifest.edition,
      user: user.username,
      userHasKey: hasAuthorizedKey(user.homedir),
      swarm: Boolean(ctx.options.swarm),
      timezone: ctx.options.timezone as string | undefined,
    });
    for (const s of plan.skipped) if (!ctx.json) ctx.stderr(`- ${s.part}: ${s.reason}`);
    return executePlan(ctx, "security", plan.steps, { skipped: plan.skipped });
  },
};

const removeCommand: Command = {
  name: "remove",
  description: "Undo the security module from the state recorded before it was applied; packages stay installed.",
  longDescription: "Deletes the files SetupVibe created (SSH drop-in, fail2ban jail, automatic updates), and turns UFW and fail2ban off when they were off before. Files that existed before SetupVibe are kept.",
  options: [DRY_RUN_OPTION],
  exitCodes: [ExitCode.PARTIAL, ExitCode.CONFIG],
  examples: [`${manifest.bin} security remove --dry-run`, `${manifest.bin} security remove`],
  run: (ctx) => {
    const record = readSecurityRecord();
    if (!record) return { code: ExitCode.CONFIG, data: { record: false }, text: `✗ No security record in ${securityRecordPath()}: the module was not applied by this SetupVibe.` };
    return executePlan(ctx, "security-remove", securityRemovePlan(record), { record });
  },
};

export const securityCommand: Command = {
  name: "security",
  description: "Manage the shared security module.",
  subcommands: [applyCommand, removeCommand],
};
