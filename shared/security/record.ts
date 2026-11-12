/**
 * State of the machine before the security module (spec section 12).
 *
 * The first `security apply` (alone or inside auto) records what was there
 * before in ~/.setupvibe/state/security.json: whether UFW and fail2ban were
 * active and which configuration files already existed. `security remove`
 * reads it to undo only what SetupVibe changed. Later applies keep the first
 * record, so a second run never takes SetupVibe's own changes for the
 * original state.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { Runner, Step } from "../exec/runner.ts";
import { statePath } from "../state/store.ts";
import { SSHD_DROPIN } from "./plan.ts";

export const FAIL2BAN_JAIL = "/etc/fail2ban/jail.d/setupvibe.local";
export const AUTO_UPGRADES = "/etc/apt/apt.conf.d/20auto-upgrades";

export interface SecurityRecord {
  schemaVersion: 1;
  at: string;
  ufwActive: boolean;
  fail2banActive: boolean;
  /** Files that existed before SetupVibe wrote them; they are never deleted. */
  existed: string[];
}

/** Path of the record. */
export function securityRecordPath(): string {
  return statePath("state", "security.json");
}

/** Reads the record, or undefined when security was never applied. */
export function readSecurityRecord(path = securityRecordPath()): SecurityRecord | undefined {
  if (!existsSync(path)) return undefined;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as SecurityRecord;
  } catch {
    return undefined;
  }
}

/** Probes the current state through the runner (UFW needs sudo). */
export async function probeSecurity(runner: Runner, exists: (p: string) => boolean = existsSync): Promise<SecurityRecord> {
  const ufw = await runner.exec({ argv: ["ufw", "status"], sudo: true });
  const f2b = await runner.exec({ argv: ["systemctl", "is-active", "fail2ban"] });
  return {
    schemaVersion: 1,
    at: new Date().toISOString(),
    ufwActive: ufw.code === 0 && /Status:\s*active/i.test(ufw.stdout),
    fail2banActive: f2b.code === 0 && f2b.stdout.trim() === "active",
    existed: [SSHD_DROPIN, FAIL2BAN_JAIL, AUTO_UPGRADES].filter((p) => exists(p)),
  };
}

/** First step of the security module: records the previous state once. */
export function recordStep(path = securityRecordPath()): Step {
  return {
    id: "security-record",
    description: "Record the state before the security module",
    commands: [],
    actionDescription: `write ${path} when it does not exist`,
    actionSudo: true,
    action: async (runner) => {
      if (existsSync(path)) return;
      const record = await probeSecurity(runner);
      mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
      writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`, { mode: 0o600 });
    },
  };
}

/**
 * Steps that undo the security module from the record. Files SetupVibe
 * created are deleted; UFW and fail2ban go back to off when they were off.
 * The packages stay installed.
 */
export function securityRemovePlan(record: SecurityRecord, path = securityRecordPath()): Step[] {
  const created = (p: string) => !record.existed.includes(p);
  const steps: Step[] = [];
  if (created(SSHD_DROPIN)) {
    steps.push({
      id: "ssh-hardening",
      description: "SSH: remove the SetupVibe drop-in and reload",
      // Nothing to undo when the hardening was skipped (no authorized key).
      skipIf: { argv: ["test", "!", "-e", SSHD_DROPIN] },
      commands: [
        { argv: ["rm", "-f", SSHD_DROPIN], sudo: true },
        { argv: ["sshd", "-t"], sudo: true },
        { argv: ["sh", "-c", "systemctl reload ssh 2>/dev/null || systemctl reload sshd"], sudo: true, optional: true },
      ],
    });
  }
  if (created(FAIL2BAN_JAIL) || !record.fail2banActive) {
    steps.push({
      id: "fail2ban",
      description: record.fail2banActive ? "fail2ban: remove the SetupVibe jail" : "fail2ban: remove the SetupVibe jail and stop the service",
      commands: [
        ...(created(FAIL2BAN_JAIL) ? [{ argv: ["rm", "-f", FAIL2BAN_JAIL], sudo: true }] : []),
        record.fail2banActive
          ? { argv: ["systemctl", "restart", "fail2ban"], sudo: true, optional: true }
          : { argv: ["systemctl", "disable", "--now", "fail2ban"], sudo: true, optional: true },
      ],
    });
  }
  if (created(AUTO_UPGRADES)) {
    steps.push({ id: "unattended-upgrades", description: "Remove the automatic updates setting", commands: [{ argv: ["rm", "-f", AUTO_UPGRADES], sudo: true }] });
  }
  if (!record.ufwActive) {
    steps.push({ id: "ufw", description: "Firewall: turn UFW off, as before", commands: [{ argv: ["ufw", "--force", "disable"], sudo: true, optional: true }] });
  }
  steps.push({ id: "security-record", description: "Delete the security record", commands: [{ argv: ["rm", "-f", path] }] });
  return steps;
}
