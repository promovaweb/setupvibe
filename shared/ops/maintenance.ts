/**
 * Logic behind the maintenance commands: doctor findings and fixes, config
 * export, upgrade asset selection, the support report, self uninstall and
 * ssh copy-id. Kept free of I/O where possible so it can be tested.
 *
 * Spec sections 8, 10, 16 and 17.
 */
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Inventory } from "../inventory.ts";
import type { InitRecord } from "../init/plan.ts";
import { missingPrerequisites } from "../init/plan.ts";
import type { SelectedItem } from "./inventory-ops.ts";
import type { Step } from "../exec/runner.ts";
import { BLOCK_START, dropBlock } from "../shell/config.ts";
import { maskSecrets } from "../state/log.ts";

export type Level = "ok" | "warn" | "fail";

export interface Finding {
  id: string;
  level: Level;
  text: string;
  /** Command that fixes it. */
  fix?: string;
  /** `doctor --fix` may apply this fix on its own. */
  safe?: boolean;
}

/** Leftovers of SetupVibe 1 that duplicate what SetupVibe 2 manages through mise (spec section 16). */
export function legacyFindings(exists: (p: string) => boolean, home = homedir()): Finding[] {
  const checks: [string, string, string][] = [
    ["legacy-go", join(home, ".local", "go"), "Go from SetupVibe 1 in ~/.local/go; SetupVibe 2 installs Go with mise. Remove it after installing: rm -rf ~/.local/go"],
    ["legacy-rbenv", join(home, ".rbenv"), "rbenv from SetupVibe 1; SetupVibe 2 installs Ruby with mise. Remove it after installing: rm -rf ~/.rbenv"],
    ["legacy-linuxbrew", "/home/linuxbrew/.linuxbrew", "Linuxbrew from SetupVibe 1; SetupVibe 2 installs terminal tools with mise on Linux."],
    ["legacy-npm-global", join(home, ".npm-global"), "Global npm packages from SetupVibe 1 in ~/.npm-global; SetupVibe 2 installs the AI CLIs with mise."],
    ["legacy-nodesource", "/etc/apt/sources.list.d/nodesource.list", "NodeSource repository from SetupVibe 1; SetupVibe 2 installs Node with mise."],
  ];
  return checks.filter(([, path]) => exists(path)).map(([id, , text]) => ({ id, level: "warn" as const, text }));
}

/** SetupVibe findings for doctor. */
export function setupvibeFindings(input: {
  inventory: Inventory;
  supported: string | undefined;
  init: InitRecord | undefined;
  selection: SelectedItem[];
  home?: string;
  path?: string;
  exists?: (p: string) => boolean;
  rcHasBlock: boolean;
  /** Detected variant, such as desktop-remote. */
  variant?: string;
  /** Path of the other edition binary when both are installed. */
  otherEdition?: string;
  /** Docker containers publishing a port on every interface, as "name ports". */
  exposedContainers?: string[];
  /** Selected tools whose command resolves to another manager first. */
  elsewhere?: Array<{ id: string; path: string }>;
  /** A restart is pending (reboot-required on Linux, registry keys on Windows). */
  rebootPending?: boolean;
  /** Windows with the WSL base selected: explain the Hyper-V firewall. */
  wslOnWindows?: boolean;
  /** SetupVibe 1 traces not migrated yet. */
  v1Traces?: string[];
  /** Windows component store finding (windows-health.ts). */
  windowsHealth?: Finding;
}): Finding[] {
  const home = input.home ?? homedir();
  const exists = input.exists ?? existsSync;
  const out: Finding[] = [];
  out.push(input.supported ? { id: "system", level: "fail", text: input.supported } : { id: "system", level: "ok", text: `system supported${input.variant ? ` (variant ${input.variant})` : ""}` });
  if (input.otherEdition) out.push({ id: "edition", level: "warn", text: `both editions are installed; the other one is at ${input.otherEdition}`, fix: "keep one edition per machine: run self uninstall on the one you do not use" });
  if (input.exposedContainers?.length) out.push({ id: "docker-exposed", level: "warn", text: `containers publish ports on every interface: ${input.exposedContainers.join("; ")}`, fix: "publish on 127.0.0.1 (-p 127.0.0.1:PORT:PORT) and reach them through SSH or Tailscale" });
  if (input.windowsHealth) out.push(input.windowsHealth);
  if (input.v1Traces?.length) out.push({ id: "v1", level: "warn", text: `SetupVibe 1 found: ${input.v1Traces.join("; ")}`, fix: "setupvibe migrate --dry-run, then setupvibe migrate" });
  if (input.rebootPending) out.push({ id: "reboot", level: "warn", text: "a restart is pending", fix: "restart, then run auto again; auto --reboot does both" });
  if (input.wslOnWindows) out.push({ id: "wsl-firewall", level: "warn", text: "the Hyper-V firewall blocks inbound connections to WSL; SetupVibe keeps that default", fix: "open only the port you need: New-NetFirewallHyperVRule -Name <name> -DisplayName <name> -Direction Inbound -VMCreatorId '{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}' -Protocol TCP -LocalPorts <port>" });
  for (const e of input.elsewhere ?? []) out.push({ id: `other-${e.id}`, level: "warn", text: `${e.id}: the command in PATH comes from ${e.path}, not from mise`, fix: "remove the other copy or put the mise shims first in PATH" });
  const missing = missingPrerequisites(input.inventory, input.init);
  out.push(missing.length ? { id: "init", level: "fail", text: `prerequisites pending: ${missing.join(", ")}`, fix: "setupvibe init" } : { id: "init", level: "ok", text: "init completed" });
  const failed = input.selection.filter((s) => s.status === "fail").map((s) => s.id);
  out.push(failed.length ? { id: "items", level: "warn", text: `items failing their check: ${failed.join(", ")}`, fix: `setupvibe install ${failed.join(" ")} --force` } : { id: "items", level: "ok", text: "selected items pass their checks" });
  const outdated = input.selection.filter((s) => input.inventory.items.find((i) => i.id === s.id)?.version !== s.version).map((s) => s.id);
  out.push(outdated.length ? { id: "outdated", level: "warn", text: `outdated items: ${outdated.join(", ")}`, fix: "setupvibe update" } : { id: "outdated", level: "ok", text: "selected items match the inventory" });
  const localBin = join(home, ".local", "bin");
  out.push(exists(localBin) ? { id: "local-bin", level: "ok", text: "~/.local/bin exists" } : { id: "local-bin", level: "warn", text: "~/.local/bin is missing", fix: "mkdir -p ~/.local/bin", safe: true });
  const inPath = (input.path ?? process.env.PATH ?? "").split(":").includes(localBin);
  if (input.init?.done) {
    out.push(input.rcHasBlock ? { id: "shell", level: "ok", text: "shell block present" } : { id: "shell", level: "warn", text: "the SetupVibe shell block is missing", fix: "setupvibe shell apply", safe: true });
    if (input.rcHasBlock && !inPath) out.push({ id: "path", level: "warn", text: "~/.local/bin is not in this shell's PATH yet", fix: "open a new terminal, or run: exec $SHELL -l" });
  }
  return [...out, ...legacyFindings(exists, home)];
}

/** True when a shell rc file already has the SetupVibe block. */
export function hasBlock(text: string): boolean {
  return text.includes(BLOCK_START);
}

/** Content of `config export`: the answers file format read by `auto --config` and `config import`. */
export function exportAnswers(input: { edition: string; user?: string; gitName?: string; gitEmail?: string; selection: SelectedItem[]; timezone?: string }) {
  return {
    schemaVersion: 1,
    edition: input.edition,
    ...(input.user ? { user: input.user } : {}),
    ...(input.gitName || input.gitEmail ? { git: { ...(input.gitName ? { name: input.gitName } : {}), ...(input.gitEmail ? { email: input.gitEmail } : {}) } } : {}),
    profile: "none",
    only: input.selection.map((s) => s.id).sort(),
    ...(input.timezone ? { timezone: input.timezone } : {}),
  };
}

/** Release asset of the running binary. */
export function upgradeAsset(bin: string, platform: string, arch: string): string | undefined {
  const os = platform === "linux" ? "linux" : platform === "darwin" ? "darwin" : platform === "win32" ? "windows" : undefined;
  const a = arch === "x64" ? "x64" : arch === "arm64" ? "arm64" : undefined;
  if (!os || !a) return undefined;
  if (bin === "setupvibe-server" && os !== "linux") return undefined;
  return `${bin}-${os}-${a}${os === "windows" ? ".exe" : ""}`;
}

/** Support report in Markdown, without secrets or environment dumps (spec section 17). */
export function reportMarkdown(input: {
  bin: string;
  version: string;
  system: Record<string, unknown>;
  init: InitRecord | undefined;
  selection: SelectedItem[];
  external: { tool: string; version: string }[];
  findings: Finding[];
  lastRun?: { finishedAt?: string; results?: { id: string; status: string; message?: string }[] };
  logTail: string[];
}): string {
  const lines = [
    `# SetupVibe report`,
    "",
    `- Binary: \`${input.bin} ${input.version}\``,
    `- System: ${String(input.system.name ?? "")} (${String(input.system.system ?? "unsupported")}, ${String(input.system.arch ?? "")}, ${String(input.system.variant ?? "")})`,
    `- init: ${input.init?.done ? `done on ${input.init.at} with ${input.init.version}` : "not done"}`,
    "",
    "## Doctor",
    "",
    ...input.findings.map((f) => `- ${f.level === "ok" ? "✓" : f.level === "warn" ? "!" : "✗"} ${f.text}${f.fix ? ` (fix: \`${f.fix}\`)` : ""}`),
    "",
    "## Selected items",
    "",
    ...(input.selection.length ? input.selection.map((s) => `- ${s.id} ${s.version}${s.status ? ` · ${s.status}` : ""}`) : ["- none"]),
    "",
    "## Apps outside the inventory",
    "",
    ...(input.external.length ? input.external.map((e) => `- ${e.tool}@${e.version}`) : ["- none"]),
  ];
  const failures = input.lastRun?.results?.filter((r) => r.status === "fail") ?? [];
  lines.push("", "## Last run", "", input.lastRun?.finishedAt ? `Finished ${input.lastRun.finishedAt}; ${failures.length} failed step(s).` : "No auto run recorded.");
  for (const f of failures) lines.push(`- ✗ ${f.id}: ${f.message ?? ""}`);
  if (input.logTail.length) lines.push("", "## Latest log events", "", "```text", ...input.logTail, "```");
  return `${maskSecrets(lines.join("\n"))}\n`;
}

/** Public keys tried by ssh copy-id, in order. */
export const DEFAULT_KEYS = ["id_ed25519.pub", "id_ecdsa.pub", "id_rsa.pub"];

/** First existing default public key. */
export function defaultPublicKey(home = homedir(), exists: (p: string) => boolean = existsSync): string | undefined {
  for (const k of DEFAULT_KEYS) {
    const p = join(home, ".ssh", k);
    if (exists(p)) return p;
  }
  return undefined;
}

/** Remote script that appends the key read from stdin once, with safe modes. */
export const COPY_ID_REMOTE = 'k=$(cat); umask 077; mkdir -p ~/.ssh && touch ~/.ssh/authorized_keys && { grep -qxF "$k" ~/.ssh/authorized_keys || printf "%s\\n" "$k" >> ~/.ssh/authorized_keys; }';

/** argv of ssh copy-id. With a password in SSHPASS, sshpass answers the prompt. */
export function copyIdArgv(target: string, port: number, withSshpass: boolean): string[] {
  const ssh = ["ssh", "-p", String(port), "-o", "StrictHostKeyChecking=accept-new", target, COPY_ID_REMOTE];
  return withSshpass ? ["sshpass", "-e", ...ssh.slice(0, 5), "-o", "PubkeyAuthentication=no", ...ssh.slice(5)] : ssh;
}

/** Validates `user@host` or `host`. */
export const SSH_TARGET = /^([a-z_][a-z0-9_.-]*@)?[A-Za-z0-9.-]+$|^([a-z_][a-z0-9_.-]*@)?\[[0-9a-fA-F:]+\]$/;

/**
 * Entries of the data directory that self uninstall deletes. Backups of the
 * user's own files, Portainer data and SetupVibe 1 leftovers (bin/,
 * portainer_data/) are never deleted.
 */
export const MANAGED_DATA = ["config.json", "selection.json", "external.json", "last-run.json", "run.lock", "state", "logs", "shell", "tmp"];

/** Steps that remove SetupVibe itself (self uninstall). */
export function selfUninstallSteps(input: { dataDir: string; binaries: string[]; keepData: boolean; user: string; sudoersExists: boolean; wslconfig?: string }): Step[] {
  const steps: Step[] = [];
  if (input.sudoersExists) {
    steps.push({ id: "sudoers", description: `Remove the SetupVibe sudo rule of ${input.user}`, commands: [{ argv: ["rm", "-f", `/etc/sudoers.d/90-setupvibe-${input.user}`], sudo: true }] });
  }
  for (const bin of input.binaries) {
    const system = bin.startsWith("/usr/") || bin.startsWith("/opt/");
    steps.push({ id: `binary:${bin}`, description: `Remove ${bin}`, commands: [{ argv: ["rm", "-f", bin], ...(system ? { sudo: true } : {}) }] });
  }
  if (input.wslconfig) {
    const file = input.wslconfig;
    steps.push({ id: "wslconfig", description: `Remove the SetupVibe block from ${file}`, commands: [], actionDescription: `drop the SetupVibe block in ${file}`, action: async () => void dropBlock(file) });
  }
  const paths = input.keepData ? [join(input.dataDir, "shell")] : MANAGED_DATA.map((p) => join(input.dataDir, p));
  steps.push({
    id: "data",
    description: input.keepData ? `Remove ${join(input.dataDir, "shell")}` : `Remove the SetupVibe state in ${input.dataDir}; backups and Portainer data stay`,
    commands: [{ argv: ["rm", "-rf", ...paths] }],
  });
  return steps;
}

/** Newest log file name in a logs folder. */
export function newestLog(dir: string): string | undefined {
  if (!existsSync(dir)) return undefined;
  return readdirSync(dir).filter((f) => f.endsWith(".log")).sort().pop();
}
