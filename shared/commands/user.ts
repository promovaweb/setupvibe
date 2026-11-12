/**
 * `user` commands: create the working user and manage its sudo rule.
 *
 * `user create` is one of the two commands allowed to run as root (spec
 * section 3). It asks for the name in a terminal when it is not given, so
 * the TUI and the CLI share the same flow.
 */
import { readFileSync } from "node:fs";
import { manifest } from "../core/app/manifest.ts";
import { edition } from "../core/app/edition.ts";
import { ExitCode } from "../core/app/exit-codes.ts";
import type { Command } from "../core/cli/registry.ts";
import type { Inventory } from "../inventory.ts";
import { detectSystem } from "../system/detect.ts";
import { nopasswdStep, removeNopasswdStep, userCreatePlan } from "../users/create.ts";
import { readState, writeState } from "../state/store.ts";
import { DRY_RUN_OPTION, executePlan } from "./execute.ts";

/** Reads `--ssh-key`: a file path or the key itself. */
export function readSshKey(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (/^(ssh-|ecdsa-|sk-)/.test(value.trim())) return value.trim();
  return readFileSync(value, "utf8").trim().split("\n")[0];
}

const createCommand: Command = {
  name: "create",
  description: "Create the working user with sudo, an SSH key and an optional sudo rule without password.",
  arguments: [{ name: "name", description: "User name (lowercase letters, digits, - and _). Asked in a terminal when omitted." }],
  options: [
    { name: "--ssh-key", argument: { name: "key-or-file" }, description: "SSH public key, or a file with it, for ~/.ssh/authorized_keys." },
    { name: "--nopasswd", description: "Allow sudo without a password (needed by automation)." },
    DRY_RUN_OPTION,
  ],
  exitCodes: [ExitCode.PARTIAL, ExitCode.UNSUPPORTED_SYSTEM],
  examples: [`${manifest.bin} user create deploy --ssh-key ~/.ssh/id_ed25519.pub`, `${manifest.bin} user create deploy --dry-run`],
  run: async (ctx) => {
    const inventory = edition().inventory as Inventory;
    const detected = detectSystem(inventory.systems);
    if (!detected.system || detected.unsupportedReason) {
      return { code: ExitCode.UNSUPPORTED_SYSTEM, data: { system: detected }, text: `✗ ${detected.unsupportedReason}` };
    }
    const name = ctx.args[0] ?? (ctx.interactive ? (prompt("Working user name:") ?? "").trim() : "");
    if (!name) return { code: ExitCode.USAGE, data: {}, text: "✗ Missing the user name. Pass it as an argument: user create <name>." };
    let steps;
    try {
      steps = userCreatePlan({ name, system: detected.system, sshKey: readSshKey(ctx.options["ssh-key"] as string | undefined), nopasswd: Boolean(ctx.options.nopasswd) });
    } catch (e) {
      return { code: ExitCode.USAGE, data: { error: String(e) }, text: `✗ ${(e as Error).message}` };
    }
    const result = await executePlan(ctx, "user-create", steps, { user: name });
    if (!ctx.options["dry-run"] && result.code === ExitCode.SUCCESS) {
      const config = readState<Record<string, unknown>>("config.json", {});
      writeState("config.json", { ...config, user: name, nopasswd: Boolean(ctx.options.nopasswd) });
      const before = result.text;
      // Spec section 3: after creating the user, tell the person how to continue.
      const next = `Next: log in as ${name} (ssh ${name}@<host>, or su - ${name}) and run: ${manifest.bin} init`;
      return { ...result, data: { ...(result.data as object), next }, text: () => `${typeof before === "function" ? before() : (before ?? "")}\n\n${next}` };
    }
    return result;
  },
};

const nopasswdCommand: Command = {
  name: "nopasswd",
  description: "Add or remove the SetupVibe sudo rule without password for a user.",
  arguments: [{ name: "name", description: "User name.", required: true }],
  options: [{ name: "--remove", description: "Remove the rule instead of adding it." }, DRY_RUN_OPTION],
  exitCodes: [ExitCode.PARTIAL],
  examples: [`${manifest.bin} user nopasswd deploy --remove`],
  run: (ctx) => {
    const name = ctx.args[0]!;
    return executePlan(ctx, "user-nopasswd", [ctx.options.remove ? removeNopasswdStep(name) : nopasswdStep(name)], { user: name });
  },
};

export const userCommand: Command = {
  name: "user",
  description: "Create the working user and manage its sudo rule.",
  subcommands: [createCommand, nopasswdCommand],
};
