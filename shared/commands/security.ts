/**
 * `security` commands: apply the shared security module.
 *
 * Server applies it during auto. Desktop applies it on exposed machines.
 * `security apply` runs it on demand.
 */
import { existsSync, readFileSync } from "node:fs";
import { currentUser } from "../system/user.ts";
import { manifest } from "../core/app/manifest.ts";
import { edition } from "../core/app/edition.ts";
import { ExitCode } from "../core/app/exit-codes.ts";
import { confirm } from "../core/cli/input.ts";
import type { Command, Context, Result } from "../core/cli/registry.ts";
import type { Inventory } from "../inventory.ts";
import { detectSystem, hasGraphicalSession, type DetectedSystem } from "../system/detect.ts";
import { securityPlan } from "../security/plan.ts";
import { readSecurityRecord, securityRecordPath, securityRemovePlan } from "../security/record.ts";
import { DRY_RUN_OPTION, executePlan } from "./execute.ts";

export const CONFIRM_SECURITY_OPTION = {
  name: "--confirm-security",
  description: "Confirm Server firewall, fail2ban and SSH changes on a machine with a graphical session.",
} as const;

export async function confirmSecurity(ctx: Context, system: DetectedSystem, applies: boolean, dryRun: boolean): Promise<boolean | Result> {
  if (manifest.edition !== "server" || !applies || dryRun) return false;
  if (ctx.options["confirm-security"]) return true;
  if (system.headless && !hasGraphicalSession()) return false;
  const message = "The Server security module will apply UFW, fail2ban and SSH hardening on this machine with a graphical session.";
  if (!ctx.interactive || ctx.json) {
    return { code: ExitCode.USAGE, data: { securityConfirmation: true, message }, text: `✗ ${message} Pass --confirm-security after reviewing the plan.` };
  }
  if (!(await confirm(`${message} Continue?`))) return { code: ExitCode.INTERRUPTED, data: { securityConfirmation: false }, text: "Cancelled." };
  return true;
}

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
    CONFIRM_SECURITY_OPTION,
  ],
  exitCodes: [ExitCode.PARTIAL, ExitCode.UNSUPPORTED_SYSTEM, ExitCode.INTERRUPTED],
  examples: [`${manifest.bin} security apply --dry-run`, `${manifest.bin} security apply --timezone America/Sao_Paulo`],
  run: async (ctx) => {
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
    const refusal = await confirmSecurity(ctx, detected, plan.steps.length > 0, Boolean(ctx.options["dry-run"]));
    if (typeof refusal !== "boolean") return refusal;
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
