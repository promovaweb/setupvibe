/**
 * `auto` command: installs everything without asking (spec section 9).
 *
 * Meant for headless machines, provisioning and automation. It never opens
 * the TUI, never waits for input, works without a terminal and ends with an
 * exit code an automation can read:
 *
 * 1. as root, `--user` creates the working user with a temporary sudo rule,
 *    then SetupVibe runs itself again as that user;
 * 2. as a normal user, sudo must work without a password;
 * 3. requirements, lock, init, items, security module, Git, Tailscale and
 *    Swarm run in order; a failed step does not stop the others;
 * 4. the check verifies every item; the result goes to last-run.json;
 * 5. a pending restart exits with REBOOT_PENDING, or restarts and resumes
 *    with `--reboot`.
 */
import { copyFileSync, existsSync, realpathSync, writeFileSync } from "node:fs";
import { userInfo } from "node:os";
import { manifest } from "../core/app/manifest.ts";
import { edition } from "../core/app/edition.ts";
import { ExitCode } from "../core/app/exit-codes.ts";
import { blocks, color, section } from "../core/cli/format.ts";
import type { Command, Context } from "../core/cli/registry.ts";
import type { Inventory } from "../inventory.ts";
import { describeCmd, isRoot, realRunner, runSteps, type Runner, type Step } from "../exec/runner.ts";
import { detectSystem } from "../system/detect.ts";
import { readState, statePath, writeJsonAtomic, writeState } from "../state/store.ts";
import { openRunLog } from "../state/log.ts";
import { acquireLock } from "../state/lock.ts";
import { checkDisk, checkLocale, checkMemory, checkNetworkAndClock, exitCodeOf, freeDiskGb, totalMemoryGb, type RequirementCheck } from "../init/requirements.ts";
import type { InitRecord } from "../init/plan.ts";
import { userCreatePlan } from "../users/create.ts";
import { readAnswersFile, resolveAnswers, type AnswersFile } from "../auto/answers.ts";
import { selectItems } from "../auto/selection.ts";
import { autoPlan } from "../auto/plan.ts";
import { checkItems } from "../auto/check.ts";
import { hasAuthorizedKey } from "./security.ts";
import { readSshKey } from "./user.ts";
import { planText } from "./execute.ts";

/** Options that only the root phase uses and the user phase must not see. */
const ROOT_ONLY = ["--user", "--ssh-key"];

/**
 * argv to run this same binary again. From source it is `bun <script>`; a
 * compiled binary is its own executable. User arguments always start at
 * `process.argv[2]`.
 */
export function selfArgv(argv = process.argv, execPath = process.execPath): string[] {
  // In a compiled Bun binary argv[0] is just "bun"; execPath is the real file.
  return argv[1] && /\.(ts|js)$/.test(argv[1]) ? [execPath, argv[1]] : [execPath];
}

/** Arguments for the user phase: the original ones without root-only options. */
export function childArgs(args: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    const name = a.split("=")[0]!;
    if (ROOT_ONLY.includes(name)) {
      if (!a.includes("=")) i++;
      continue;
    }
    out.push(a);
  }
  return out;
}

/** True when the system asks for a restart (Debian and Ubuntu). */
export function rebootRequired(): boolean {
  return existsSync("/var/run/reboot-required");
}

/** Steps that resume auto after a restart through a one-shot systemd unit. */
export function rebootSteps(user: string, command: string[]): Step[] {
  const unit = `[Unit]\nDescription=Resume SetupVibe auto after restart\nAfter=network-online.target\nWants=network-online.target\n\n[Service]\nType=oneshot\nUser=${user}\nExecStart=${command.join(" ")}\nExecStartPost=/bin/systemctl disable setupvibe-auto-resume.service\n\n[Install]\nWantedBy=multi-user.target\n`;
  return [
    {
      id: "reboot",
      description: "Schedule the rest of auto after a restart and restart now",
      commands: [
        { argv: ["tee", "/etc/systemd/system/setupvibe-auto-resume.service"], sudo: true, input: unit },
        { argv: ["systemctl", "daemon-reload"], sudo: true },
        { argv: ["systemctl", "enable", "setupvibe-auto-resume.service"], sudo: true },
        { argv: ["systemctl", "reboot"], sudo: true },
      ],
    },
  ];
}

const OPTIONS = [
  { name: "--user", argument: { name: "name" }, description: "Working user. Required as root: created with sudo, then auto continues as that user. Env: SETUPVIBE_USER." },
  { name: "--ssh-key", argument: { name: "key-or-file" }, description: "SSH public key for the working user. Env: SETUPVIBE_SSH_KEY." },
  { name: "--git-name", argument: { name: "name" }, description: "Git user.name. Env: SETUPVIBE_GIT_NAME." },
  { name: "--git-email", argument: { name: "email" }, description: "Git user.email. Env: SETUPVIBE_GIT_EMAIL." },
  { name: "--profile", argument: { name: "name" }, description: "Inventory profile; the whole inventory when omitted. Env: SETUPVIBE_PROFILE." },
  { name: "--only", argument: { name: "ids" }, description: "Comma-separated items to add. Env: SETUPVIBE_ONLY." },
  { name: "--exclude", argument: { name: "ids" }, description: "Comma-separated items to leave out. Env: SETUPVIBE_EXCLUDE." },
  { name: "--tailscale-authkey", argument: { name: "key" }, description: "Tailscale auth key; prefer the TAILSCALE_AUTHKEY variable." },
  { name: "--manager", description: "Server: initialize Docker Swarm as manager. Env: SETUPVIBE_SWARM_MANAGER=1." },
  { name: "--join", argument: { name: "token" }, description: "Server: join a swarm; prefer SETUPVIBE_SWARM_TOKEN." },
  { name: "--advertise-addr", argument: { name: "address" }, description: "Server: Swarm advertise address, or the manager address with --join." },
  { name: "--timezone", argument: { name: "zone" }, description: "Time zone, such as America/Sao_Paulo. Env: SETUPVIBE_TIMEZONE." },
  { name: "--reboot", description: "Restart when needed and resume automatically. Env: SETUPVIBE_REBOOT=1." },
  { name: "--keep-nopasswd", description: "Keep the sudo rule without password created by auto. Env: SETUPVIBE_KEEP_NOPASSWD=1." },
  { name: "--config", argument: { name: "file" }, description: "Answers file in the config export format, without secrets." },
  { name: "--plan", argument: { name: "file" }, description: "Write the plan as JSON to a file and exit without changes." },
  { name: "--dry-run", description: "Print the plan without changing anything." },
  { name: "--skip-network-check", description: "Skip the network and clock check.", hidden: true },
] as const;

async function run(ctx: Context) {
  const inventory = edition().inventory as Inventory;
  const detected = detectSystem(inventory.systems);
  if (!detected.system || detected.unsupportedReason) {
    return { code: ExitCode.UNSUPPORTED_SYSTEM, data: { system: detected }, text: `✗ ${detected.unsupportedReason}` };
  }
  const system = detected.system;
  let file: AnswersFile = {};
  try {
    if (typeof ctx.options.config === "string") file = readAnswersFile(ctx.options.config);
  } catch (e) {
    return { code: ExitCode.USAGE, data: { error: String(e) }, text: `✗ ${(e as Error).message}` };
  }
  const answers = resolveAnswers(ctx.options, process.env, file);
  const dryRun = Boolean(ctx.options["dry-run"] || ctx.options.plan);
  const runner: Runner = realRunner();

  // Root phase: create the working user, then run again as that user.
  if (isRoot()) {
    if (!answers.user) {
      return { code: ExitCode.ROOT, data: {}, text: `✗ Running as root. Pass --user <name>: auto creates the user and continues as it.` };
    }
    let steps: Step[];
    try {
      steps = userCreatePlan({ name: answers.user, system, sshKey: readSshKey(answers.sshKey), nopasswd: true });
    } catch (e) {
      return { code: ExitCode.USAGE, data: { error: String(e) }, text: `✗ ${(e as Error).message}` };
    }
    if (dryRun) {
      return { data: { dryRun: true, phase: "root", steps: steps.map((s) => ({ id: s.id, commands: s.commands.map(describeCmd) })) }, text: () => blocks(section("auto as root (dry run)"), planText(steps), `Then auto runs again as ${answers.user}.`) };
    }
    const results = await runSteps(steps, runner);
    if (results.some((r) => r.status === "fail")) {
      return { code: ExitCode.PARTIAL, data: { phase: "root", results }, text: `✗ Could not create ${answers.user}: ${results.find((r) => r.status === "fail")?.message}` };
    }
    let self = selfArgv();
    if (self.length === 1) {
      // The user phase needs a binary it can read; root may run it from /root.
      const target = `/usr/local/bin/${manifest.bin}`;
      if (!existsSync(target) || realpathSync(self[0]!) !== realpathSync(target)) copyFileSync(self[0]!, target);
      self = [target];
    }
    const child = Bun.spawn(["runuser", "-u", answers.user, "--", "env", "SETUPVIBE_AUTO_CREATED_NOPASSWD=1", ...self, ...childArgs(process.argv.slice(2))], {
      stdin: "ignore",
      stdout: "inherit",
      stderr: "inherit",
      env: process.env,
    });
    const code = await child.exited;
    return { code: code as ExitCode, data: { phase: "root", user: answers.user, childExitCode: code }, text: "" };
  }

  // User phase.
  const user = userInfo();
  if (!dryRun && process.platform !== "win32") {
    const sudo = await runner.exec({ argv: ["sudo", "-n", "true"] });
    if (sudo.code !== 0) {
      return { code: ExitCode.SUDO_PASSWORD, data: {}, text: "✗ sudo asks for a password. auto needs passwordless sudo: run as root with --user, or add a NOPASSWD rule." };
    }
  }
  const checks: RequirementCheck[] = [checkDisk(freeDiskGb(), manifest.edition), checkMemory(totalMemoryGb()), checkLocale(process.env), ...(ctx.options["skip-network-check"] || dryRun ? [] : await checkNetworkAndClock())];
  const blocked = exitCodeOf(checks);
  if (blocked !== ExitCode.SUCCESS) return { code: blocked, data: { checks }, text: checks.filter((c) => c.status === "fail").map((c) => `✗ ${c.name}: ${c.detail}. ${c.fix ?? ""}`).join("\n") };

  let selection;
  try {
    selection = selectItems({ inventory, system, headless: detected.headless, profile: answers.profile, only: answers.only, exclude: answers.exclude });
  } catch (e) {
    return { code: ExitCode.USAGE, data: { error: String(e) }, text: `✗ ${(e as Error).message}` };
  }
  const config = readState<Record<string, unknown>>("config.json", {});
  const init = config.init as InitRecord | undefined;
  let plan;
  try {
    plan = autoPlan({
      inventory,
      edition: manifest.edition,
      system,
      arch: String(detected.arch),
      distro: detected.distro,
      variant: detected.variant,
      user: user.username,
      userHasKey: hasAuthorizedKey(user.homedir),
      initDone: Boolean(init?.done),
      memoryGb: totalMemoryGb(),
      answers,
      selection,
      createdNopasswd: process.env.SETUPVIBE_AUTO_CREATED_NOPASSWD === "1",
    });
  } catch (e) {
    return { code: ExitCode.USAGE, data: { error: String(e) }, text: `✗ ${(e as Error).message}` };
  }
  const summary = { system: detected, items: selection.items.map((i) => i.id), skipped: plan.skipped, security: plan.security };
  if (dryRun) {
    const data = { dryRun: true, ...summary, steps: plan.steps.map((s) => ({ id: s.id, description: s.description, commands: s.commands.map(describeCmd), action: s.actionDescription })) };
    if (typeof ctx.options.plan === "string") writeFileSync(ctx.options.plan, `${JSON.stringify(data, null, 2)}\n`);
    return { data, text: () => blocks(section("auto (dry run)"), planText(plan.steps), section("Skipped"), plan.skipped.map((s) => `- ${s.id}: ${s.reason}`).join("\n")) };
  }

  const release = acquireLock();
  if (!release) return { code: ExitCode.LOCKED, data: {}, text: "✗ Another SetupVibe run is in progress." };
  try {
    const log = openRunLog("auto", { json: ctx.json });
    const results = await runSteps(plan.steps, runner, (r) => {
      log.event({ item: r.id, action: "install", status: r.status, durationMs: r.durationMs, ...(r.message ? { message: r.message } : {}) });
      if (!ctx.json) ctx.stderr(`${r.status === "ok" ? "✓" : r.status === "skip" ? "-" : "✗"} ${r.id}${r.status === "fail" ? `: ${r.message}` : ""}`);
    });
    const checked = await checkItems(selection.items.filter((i) => !i.securityModule), runner);
    for (const c of checked) log.event({ item: c.id, action: "check", status: c.status === "ok" ? "ok" : "fail", message: c.output });
    if (results.find((r) => r.id === "mise" || r.id === "build-deps")?.status !== "fail" && !init?.done) {
      writeState("config.json", { ...config, edition: manifest.edition, system, user: user.username, init: { done: true, at: new Date().toISOString(), version: manifest.version, system, prerequisites: inventory.items.filter((i) => i.initOnly).map((i) => i.id) } satisfies InitRecord });
    }
    const failed = results.filter((r) => r.status === "fail").length + checked.filter((c) => c.status === "fail").length;
    const lastRun = { version: manifest.version, finishedAt: new Date().toISOString(), log: log.path, ...summary, results, checks: checked };
    writeJsonAtomic(statePath("last-run.json"), lastRun);
    writeState("selection.json", { profile: answers.profile ?? null, items: selection.items.map((i) => ({ id: i.id, version: i.version, status: checked.find((c) => c.id === i.id)?.status ?? "ok" })) });

    if (rebootRequired()) {
      if (answers.reboot) {
        await runSteps(rebootSteps(user.username, [...selfArgv(), ...childArgs(process.argv.slice(2))]), runner);
      }
      return { code: ExitCode.REBOOT_PENDING, data: lastRun, text: `${color.warn("!")} Restart needed${answers.reboot ? "; restarting and resuming automatically." : ". Run auto again after the restart, or pass --reboot."}` };
    }
    return {
      code: failed ? ExitCode.PARTIAL : ExitCode.SUCCESS,
      data: lastRun,
      text: () => (failed ? `${color.error(`${failed} item(s) failed.`)} See ${log.path}` : `${color.ok("Everything installed and checked.")} Log: ${log.path}`),
    };
  } finally {
    release();
  }
}

export const autoCommand: Command = {
  name: "auto",
  description: "Install everything without asking, for headless machines and automation.",
  longDescription:
    "Answers come from options, environment variables or --config. As root, --user creates the working user and auto continues as it. Without a profile, the whole inventory compatible with this system is installed; GUI items are skipped on headless machines.",
  options: OPTIONS,
  exitCodes: [ExitCode.PARTIAL, ExitCode.UNSUPPORTED_SYSTEM, ExitCode.ROOT, ExitCode.SUDO_PASSWORD, ExitCode.DISK_SPACE, ExitCode.NETWORK_OR_API, ExitCode.REBOOT_PENDING, ExitCode.LOCKED],
  examples: [
    `${manifest.bin} auto --dry-run`,
    `${manifest.bin} auto --user deploy --ssh-key "ssh-ed25519 AAAA..."`,
    `${manifest.bin} auto --profile essencial --exclude docker --json`,
  ],
  run,
};
