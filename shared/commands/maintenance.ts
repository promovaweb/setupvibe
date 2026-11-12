/**
 * Maintenance commands (spec sections 8, 11, 16 and 17):
 *
 * - `skill -- <args>`: runs the Vercel skills CLI pinned in the inventory;
 * - `doctor [--fix]`: Termfy checks plus SetupVibe findings, SetupVibe 1
 *   leftovers, and the safe fixes;
 * - `config export [file]` and `config import <file>`;
 * - `upgrade [--check] [--channel]`: replaces the binary with the release,
 *   verified against SHA256SUMS;
 * - `report [--output]`: Markdown for a GitHub issue, without secrets;
 * - `self uninstall --yes [--keep-data] [--items]`: removes SetupVibe;
 * - `ssh copy-id <user@host>`: installs a public key on a remote server.
 */
import { chmodSync, existsSync, mkdtempSync, readFileSync, renameSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { currentUser } from "../system/user.ts";
import { dirname, join } from "node:path";
import { manifest } from "../core/app/manifest.ts";
import { edition } from "../core/app/edition.ts";
import { ExitCode } from "../core/app/exit-codes.ts";
import { blocks, color, section } from "../core/cli/format.ts";
import { confirm } from "../core/cli/input.ts";
import type { Command, Context, Result } from "../core/cli/registry.ts";
import { collectDoctorChecks } from "../core/cli/commands/doctor.ts";
import type { Inventory } from "../inventory.ts";
import { realRunner, runSteps, type Step } from "../exec/runner.ts";
import { detectSystem } from "../system/detect.ts";
import { ensureStateDirs, readState, statePath, writeJsonAtomic } from "../state/store.ts";
import type { InitRecord } from "../init/plan.ts";
import { readAnswersFile } from "../auto/answers.ts";
import { checkForUpdate, compareSemver, type Channel } from "../state/update.ts";
import { cosignVerifyArgv, RELEASES_BASE } from "../repo.ts";
import { fetchWithRetries } from "../install/methods.ts";
import { findInChecksumList, verify } from "../state/checksum.ts";
import { shellRemoveSteps, shellSteps } from "../shell/config.ts";
import { logTail } from "../tui/model.ts";
import { findAgent } from "./mcp-install.ts";
import { rebootRequired, selfArgv } from "./auto.ts";
import { detectV1Here } from "../legacy/v1.ts";
import { windowsHealth, windowsHealthFinding, windowsRepairSteps } from "../ops/windows-health.ts";
import { DRY_RUN_OPTION, executePlan } from "./execute.ts";
import { installItemsFor } from "./inventory.ts";
import { removePlan, type ExternalApp, type SelectedItem } from "../ops/inventory-ops.ts";
import {
  copyIdArgv,
  defaultPublicKey,
  exportAnswers,
  hasBlock,
  newestLog,
  reportMarkdown,
  selfUninstallSteps,
  setupvibeFindings,
  SSH_TARGET,
  upgradeAsset,
  type Finding,
} from "../ops/maintenance.ts";
import { otherManagerPath } from "../ops/other-manager.ts";

function context() {
  const inventory = edition().inventory as Inventory;
  const detected = detectSystem(inventory.systems);
  const config = readState<Record<string, unknown>>("config.json", {});
  const selection = readState<{ items?: SelectedItem[] }>("selection.json", {}).items ?? [];
  const external = readState<{ apps?: ExternalApp[] }>("external.json", {}).apps ?? [];
  return { inventory, detected, config, selection, external, init: config.init as InitRecord | undefined };
}

function rcFile(system: string | undefined): string {
  return join(homedir(), system === "omarchy" ? ".bashrc" : ".zshrc");
}

/** SetupVibe findings for the running machine. */
export function machineFindings(): Finding[] {
  const c = context();
  const rc = rcFile(c.detected.system);
  return setupvibeFindings({
    inventory: c.inventory,
    supported: c.detected.unsupportedReason,
    init: c.init,
    selection: c.selection,
    rcHasBlock: existsSync(rc) && hasBlock(readFileSync(rc, "utf8")),
    variant: c.detected.variant,
    otherEdition: Bun.which(manifest.edition === "desktop" ? "setupvibe-server" : "setupvibe") ?? undefined,
    // Only matters where the machine is reachable from outside; Docker publishes past UFW.
    exposedContainers: c.detected.variant === "local" ? [] : exposedContainers(),
    rebootPending: rebootRequired(),
    v1Traces: detectV1Here(homedir()).traces,
    ...(process.platform === "win32" ? { windowsHealth: windowsHealthFinding(windowsHealth()) } : {}),
    wslOnWindows: c.detected.system === "windows" && c.selection.some((s) => s.id === "wsl"),
    elsewhere: c.selection
      .map((s) => c.inventory.items.find((i) => i.id === s.id))
      .filter((i): i is NonNullable<typeof i> => Boolean(i))
      .flatMap((i) => {
        const path = otherManagerPath(i);
        return path ? [{ id: i.id, path }] : [];
      }),
  });
}

/**
 * Containers that publish a port on 0.0.0.0 or [::], read from docker ps.
 * Empty when Docker is missing or the user cannot reach the daemon.
 */
export function exposedContainers(): string[] {
  if (!Bun.which("docker")) return [];
  const r = Bun.spawnSync(["docker", "ps", "--format", "{{.Names}} {{.Ports}}"], { stdout: "pipe", stderr: "ignore", timeout: 5000 });
  if (r.exitCode !== 0) return [];
  return parseExposed(r.stdout.toString());
}

/** Lines of `docker ps --format "{{.Names}} {{.Ports}}"` with a port bound to every interface. */
export function parseExposed(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /(^|[\s,])(0\.0\.0\.0|\[::\]|:::):\d+->/.test(l));
}

const mark = (l: string) => (l === "ok" ? color.ok("✓") : l === "warn" ? color.warn("!") : color.error("✗"));

export const doctorCommand: Command = {
  name: "doctor",
  description: "Check the runtime, SetupVibe state, pending prerequisites, items and SetupVibe 1 leftovers; --fix applies the safe fixes.",
  options: [
    { name: "--fix", description: "Apply the safe fixes (folders, shell block) and list the ones that need a decision." },
    { name: "--repair-windows", description: "Windows: repair the component store and system files (DISM /RestoreHealth, then sfc /scannow); needs an elevated PowerShell and takes minutes." },
    DRY_RUN_OPTION,
  ],
  exitCodes: [ExitCode.CONFIG, ExitCode.PARTIAL],
  examples: [`${manifest.bin} doctor`, `${manifest.bin} doctor --fix`, `${manifest.bin} doctor --json`],
  run: async (ctx) => {
    if (ctx.options["repair-windows"]) {
      if (process.platform !== "win32" && !ctx.options["dry-run"]) return { code: ExitCode.UNSUPPORTED_SYSTEM, data: {}, text: "✗ --repair-windows runs on Windows only." };
      return executePlan(ctx, "windows-repair", windowsRepairSteps());
    }
    let runtime = collectDoctorChecks();
    let findings = machineFindings();
    const applied: string[] = [];
    if (ctx.options.fix) {
      const c = context();
      const steps: Step[] = [];
      if (findings.some((f) => f.id === "local-bin" && f.level !== "ok")) steps.push({ id: "local-bin", description: "Create ~/.local/bin", commands: [{ argv: ["mkdir", "-p", join(homedir(), ".local", "bin")] }] });
      ensureStateDirs();
      chmodSync(statePath(), 0o700);
      applied.push("~/.setupvibe mode 700");
      if (findings.some((f) => f.id === "shell" && f.level !== "ok") && c.detected.system) {
        steps.push(...shellSteps({ system: c.detected.system, edition: manifest.edition, bin: manifest.bin, user: currentUser().username, zsh: Boolean(Bun.which("zsh")), tmux: Boolean(Bun.which("tmux")), starship: Boolean(findAgent("starship")) }));
      }
      const results = await runSteps(steps, realRunner());
      applied.push(...results.filter((r) => r.status !== "fail").map((r) => r.id));
      // Check again after the fixes, so the result describes the machine as it is now.
      runtime = collectDoctorChecks();
      findings = machineFindings();
    }
    const failing = findings.some((f) => f.level === "fail") || !runtime.ok;
    const data = { ok: !failing, runtime: runtime.checks, findings, ...(ctx.options.fix ? { applied } : {}) };
    return {
      data,
      code: failing ? ExitCode.CONFIG : ExitCode.SUCCESS,
      text: () =>
        blocks(
          section("Runtime"),
          runtime.checks.map((c) => `${mark(c.status)} ${c.name}: ${c.detail}`).join("\n"),
          section("SetupVibe"),
          findings.map((f) => `${mark(f.level)} ${f.text}${f.fix && f.level !== "ok" ? `\n  ${color.dim(`→ ${f.fix}`)}` : ""}`).join("\n"),
          ctx.options.fix ? `${section("Applied")}\n${applied.length ? applied.map((a) => `✓ ${a}`).join("\n") : "Nothing to fix automatically."}` : "",
        ),
    };
  },
};

export const skillCommand: Command = {
  name: "skill",
  description: "Run the Vercel skills CLI pinned in the inventory. Pass its arguments after --.",
  longDescription: "Uses the skills CLI installed by SetupVibe (the skills item); without it, runs the pinned version through npx. The embedded documentation moved to the docs command and the --skill flag.",
  arguments: [{ name: "args", description: "Arguments for skills, after --, such as: -- add owner/repo -g", variadic: true }],
  examples: [`${manifest.bin} skill -- list`, `${manifest.bin} skill -- add promovaweb/herdrfy -g -a claude-code`],
  run: async (ctx) => {
    const item = (edition().inventory as Inventory).items.find((i) => i.id === "skills");
    const installed = findAgent("skills");
    const argv = installed ? [installed, ...ctx.args] : ["npx", "-y", `skills@${item?.version ?? "latest"}`, ...ctx.args];
    const proc = Bun.spawn(argv, { stdin: "inherit", stdout: ctx.json ? "pipe" : "inherit", stderr: "inherit" });
    const out = ctx.json ? await new Response(proc.stdout as ReadableStream).text() : "";
    const code = await proc.exited;
    return { code: code === 0 ? ExitCode.SUCCESS : ExitCode.GENERIC_ERROR, data: { command: argv, exitCode: code, ...(ctx.json ? { output: out } : {}) }, text: "" };
  },
};

const exportCommand: Command = {
  name: "export",
  description: "Write the selection and identity as an answers file for config import and auto --config.",
  arguments: [{ name: "file", description: "Output file; stdout when omitted." }],
  examples: [`${manifest.bin} config export setupvibe.json`],
  run: (ctx) => {
    const c = context();
    const git = (key: string) => Bun.spawnSync(["git", "config", "--global", key], { stdout: "pipe", stderr: "ignore" }).stdout.toString().trim() || undefined;
    const data = exportAnswers({ edition: manifest.edition, user: typeof c.config.user === "string" ? c.config.user : undefined, gitName: git("user.name"), gitEmail: git("user.email"), selection: c.selection });
    if (ctx.args[0]) writeFileSync(ctx.args[0], `${JSON.stringify(data, null, 2)}\n`);
    return { data, text: ctx.args[0] ? `✓ Wrote ${ctx.args[0]} (${data.only.length} items).` : JSON.stringify(data, null, 2) };
  },
};

const importCommand: Command = {
  name: "import",
  description: "Install the items and Git identity of an answers file exported from another machine.",
  arguments: [{ name: "file", description: "Answers file from config export.", required: true }],
  options: [DRY_RUN_OPTION],
  exitCodes: [ExitCode.PARTIAL, ExitCode.CONFIG],
  examples: [`${manifest.bin} config import setupvibe.json --dry-run`],
  run: async (ctx) => {
    let file;
    try {
      file = readAnswersFile(ctx.args[0]!);
    } catch (e) {
      return { code: ExitCode.USAGE, data: { error: String(e) }, text: `✗ ${(e as Error).message}` };
    }
    const result = await installItemsFor(ctx, file.only ?? []);
    if (!ctx.options["dry-run"] && (file.git?.name || file.git?.email)) {
      const steps: Step[] = [{ id: "git-identity", description: "Set the Git name and e-mail", commands: [...(file.git?.name ? [{ argv: ["git", "config", "--global", "user.name", file.git.name] }] : []), ...(file.git?.email ? [{ argv: ["git", "config", "--global", "user.email", file.git.email] }] : [])] }];
      await runSteps(steps, realRunner());
    }
    return result;
  },
};

/** Adds export and import to the core config command. */
export const configSubcommands = [exportCommand, importCommand];

/**
 * Checks the keyless Sigstore signature of SHA256SUMS when cosign is in PATH,
 * like install.sh. Without cosign or without a bundle in the release, the
 * SHA-256 check alone applies.
 */
export async function verifySignature(base: string, sumsText: string, cosign: string | null = Bun.which("cosign")): Promise<"verified" | "invalid" | "skipped"> {
  if (!cosign) return "skipped";
  let bundle: string;
  try {
    bundle = await (await fetchWithRetries(`${base}/SHA256SUMS.sigstore.json`, 30_000)).text();
  } catch {
    return "skipped";
  }
  const dir = mkdtempSync(join(tmpdir(), "setupvibe-sig-"));
  try {
    writeFileSync(join(dir, "SHA256SUMS"), sumsText);
    writeFileSync(join(dir, "SHA256SUMS.sigstore.json"), bundle);
    const r = Bun.spawnSync(cosignVerifyArgv(join(dir, "SHA256SUMS"), join(dir, "SHA256SUMS.sigstore.json"), cosign), { stdout: "ignore", stderr: "ignore" });
    return r.exitCode === 0 ? "verified" : "invalid";
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export const upgradeCommand: Command = {
  name: "upgrade",
  description: "Replace this binary with the newest release of its channel, verified against SHA256SUMS and, when cosign is installed, its Sigstore signature.",
  options: [
    { name: "--check", description: "Only report whether an upgrade exists." },
    { name: "--channel", argument: { name: "channel", values: ["stable", "beta"] }, description: "Release channel; stable by default." },
  ],
  exitCodes: [ExitCode.NETWORK_OR_API, ExitCode.PERMISSION],
  examples: [`${manifest.bin} upgrade --check`, `${manifest.bin} upgrade`],
  run: async (ctx) => {
    const configured = readState<Record<string, unknown>>("config.json", {}).channel as string | undefined;
    const channel = ((ctx.options.channel as string) ?? configured ?? "stable") as Channel;
    const status = await checkForUpdate(manifest.version, channel, { force: true });
    if (status.source === "offline" || !status.latest) return { code: ExitCode.NETWORK_OR_API, data: status, text: "✗ Could not read version.json." };
    if (compareSemver(status.latest, manifest.version) <= 0) return { data: status, text: `${color.ok("✓")} ${manifest.bin} ${manifest.version} is the latest ${channel} release.` };
    if (ctx.options.check) return { data: status, text: `↑ ${manifest.version} → ${status.latest}. Run: ${manifest.bin} upgrade` };
    const self = selfArgv();
    if (self.length !== 1) return { code: ExitCode.USAGE, data: status, text: "✗ Running from source; upgrade replaces compiled binaries only." };
    const asset = upgradeAsset(manifest.bin, process.platform, process.arch);
    if (!asset) return { code: ExitCode.UNSUPPORTED_SYSTEM, data: status, text: "✗ No release binary for this platform." };
    const base = `${RELEASES_BASE}/v${status.latest}`;
    const [bin, sums] = await Promise.all([fetchWithRetries(`${base}/${asset}`, 300_000), fetchWithRetries(`${base}/SHA256SUMS`, 30_000)]);
    const data = new Uint8Array(await bin.arrayBuffer());
    const sumsText = await sums.text();
    const signature = await verifySignature(base, sumsText);
    if (signature === "invalid") return { code: ExitCode.NETWORK_OR_API, data: { ...status, signature }, text: "✗ The Sigstore signature of SHA256SUMS does not match the SetupVibe release workflow." };
    const expected = findInChecksumList(sumsText, asset);
    if (!expected) return { code: ExitCode.NETWORK_OR_API, data: status, text: `✗ ${asset} is not listed in SHA256SUMS.` };
    verify(data, expected, "sha256", asset);
    const target = self[0]!;
    const tmp = join(dirname(target), `.${manifest.bin}.upgrade-${process.pid}`);
    try {
      writeFileSync(tmp, data, { mode: 0o755 });
      renameSync(tmp, target);
    } catch (e) {
      if (existsSync(tmp)) unlinkSync(tmp);
      return { code: ExitCode.PERMISSION, data: { error: String(e) }, text: `✗ Could not replace ${target}: ${(e as Error).message}. Run with permission to write there.` };
    }
    const note = signature === "verified" ? "signature verified with cosign" : "SHA-256 verified; install cosign to also check the signature";
    return { data: { ...status, upgraded: true, path: target, signature }, text: `${color.ok("✓")} ${manifest.bin} ${manifest.version} → ${status.latest} (${target}); ${note}.` };
  },
};

export const reportCommand: Command = {
  name: "report",
  description: "Print a Markdown report of this machine for a GitHub issue, without secrets.",
  options: [{ name: "--output", argument: { name: "file" }, description: "Write the report to a file." }],
  examples: [`${manifest.bin} report`, `${manifest.bin} report --output report.md`],
  run: (ctx) => {
    const c = context();
    const log = newestLog(statePath("logs"));
    const lastRun = existsSync(statePath("last-run.json")) ? JSON.parse(readFileSync(statePath("last-run.json"), "utf8")) : undefined;
    const markdown = reportMarkdown({
      bin: manifest.bin,
      version: manifest.version,
      system: c.detected as unknown as Record<string, unknown>,
      init: c.init,
      selection: c.selection,
      external: c.external,
      findings: machineFindings(),
      lastRun,
      logTail: log ? logTail(log, 20) : [],
    });
    if (typeof ctx.options.output === "string") writeFileSync(ctx.options.output, markdown);
    return { data: { markdown }, text: typeof ctx.options.output === "string" ? `✓ Wrote ${ctx.options.output}.` : markdown };
  },
};

const uninstallCommand: Command = {
  name: "uninstall",
  description: "Remove SetupVibe: shell blocks, its sudo rule, the binary and its state; backups and Portainer data stay. --items also removes the user-space items.",
  options: [
    { name: "--items", description: "Also remove the selected items installed in the user's space." },
    { name: "--keep-data", description: "Keep ~/.setupvibe (state, logs and backups)." },
    { name: "--yes", aliases: ["-y"], description: "Do not ask for confirmation." },
    DRY_RUN_OPTION,
  ],
  exitCodes: [ExitCode.PARTIAL, ExitCode.INTERRUPTED],
  examples: [`${manifest.bin} self uninstall --dry-run`, `${manifest.bin} self uninstall --yes --keep-data`],
  run: async (ctx) => {
    const c = context();
    const user = currentUser().username;
    const binaries = [join(homedir(), ".local", "bin", manifest.bin), `/usr/local/bin/${manifest.bin}`].filter((p) => existsSync(p));
    const steps: Step[] = [];
    if (ctx.options.items && c.detected.system) steps.push(...removePlan(c.inventory.items.filter((i) => c.selection.some((s) => s.id === i.id)), c.detected.system).steps);
    steps.push(...shellRemoveSteps());
    steps.push(...selfUninstallSteps({ dataDir: statePath(), binaries, keepData: Boolean(ctx.options["keep-data"]), user, sudoersExists: existsSync(`/etc/sudoers.d/90-setupvibe-${user}`), ...(process.platform === "win32" ? { wslconfig: join(homedir(), ".wslconfig") } : {}) }));
    if (!ctx.options["dry-run"] && !ctx.options.yes) {
      if (!ctx.interactive) return { code: ExitCode.USAGE, data: {}, text: "✗ self uninstall needs confirmation. Pass --yes in non-interactive runs." };
      if (!(await confirm("Remove SetupVibe from this machine?"))) return { code: ExitCode.INTERRUPTED, data: {}, text: "Cancelled." };
    }
    if (!ctx.options["dry-run"] && !ctx.options["keep-data"]) {
      // The run log lives in ~/.setupvibe, which this command deletes: run without it.
      const results = await runSteps(steps, realRunner());
      const failed = results.filter((r) => r.status === "fail");
      return { code: failed.length ? ExitCode.PARTIAL : ExitCode.SUCCESS, data: { results }, text: failed.length ? `✗ ${failed.length} step(s) failed.` : `${color.ok("✓")} SetupVibe was removed. Your own files, the .local files and the items stay.` };
    }
    return executePlan(ctx, "self-uninstall", steps);
  },
};

export const selfCommand: Command = { name: "self", description: "Manage the SetupVibe installation itself.", subcommands: [uninstallCommand] };

const copyIdCommand: Command = {
  name: "copy-id",
  description: "Install your SSH public key on a remote server, once, with safe file modes.",
  arguments: [{ name: "target", description: "user@host or host.", required: true }],
  options: [
    { name: "--port", argument: { name: "port" }, description: "SSH port; 22 by default." },
    { name: "--key", argument: { name: "file" }, description: "Public key file; the first of ~/.ssh/id_ed25519.pub, id_ecdsa.pub, id_rsa.pub by default." },
    { name: "--password-stdin", description: "Read the remote password from stdin and answer with sshpass." },
  ],
  exitCodes: [ExitCode.NOT_FOUND],
  examples: [`${manifest.bin} ssh copy-id deploy@203.0.113.10`, `printf %s "$PASS" | ${manifest.bin} ssh copy-id root@host --password-stdin`],
  run: async (ctx: Context): Promise<Result> => {
    const target = ctx.args[0]!;
    if (!SSH_TARGET.test(target)) return { code: ExitCode.USAGE, data: {}, text: `✗ Invalid target: ${target}. Use user@host.` };
    const keyFile = (ctx.options.key as string | undefined) ?? defaultPublicKey();
    if (!keyFile || !existsSync(keyFile)) return { code: ExitCode.NOT_FOUND, data: {}, text: "✗ No public key found. Create one with: ssh-keygen -t ed25519" };
    const key = readFileSync(keyFile, "utf8").trim().split("\n")[0]!;
    const port = Number.parseInt((ctx.options.port as string) ?? "22", 10);
    let password = process.env.SSHPASS;
    if (ctx.options["password-stdin"]) password = (await new Response(Bun.stdin.stream()).text()).trim();
    if (password && !Bun.which("sshpass")) return { code: ExitCode.NOT_FOUND, data: {}, text: "✗ sshpass is needed for --password-stdin. Install it: setupvibe install sshpass" };
    const argv = copyIdArgv(target, port, Boolean(password));
    const proc = Bun.spawn(argv, { stdin: new Response(`${key}\n`), stdout: "inherit", stderr: "inherit", env: { ...process.env, ...(password ? { SSHPASS: password } : {}) } });
    const code = await proc.exited;
    return { code: code === 0 ? ExitCode.SUCCESS : ExitCode.GENERIC_ERROR, data: { target, key: keyFile, exitCode: code }, text: code === 0 ? `${color.ok("✓")} ${keyFile} is authorized on ${target}.` : `✗ ssh exited with ${code}.` };
  },
};

export const sshCommand: Command = { name: "ssh", description: "SSH helpers.", subcommands: [copyIdCommand] };

/** Re-exported for tests. */
export { writeJsonAtomic };
