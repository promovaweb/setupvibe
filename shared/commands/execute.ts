/**
 * Shared execution of step plans for commands.
 *
 * With `--dry-run`, prints every step and command without running anything.
 * Otherwise runs the steps with the real runner, writes the run log and maps
 * the results to an exit code: PARTIAL when some steps failed.
 */
import { ExitCode } from "../core/app/exit-codes.ts";
import { blocks, color, section } from "../core/cli/format.ts";
import type { Context, Result } from "../core/cli/registry.ts";
import { describeCmd, dryRunner, isRoot, planNeedsSudo, realRunner, runSteps, type Runner, type Step, type StepResult } from "../exec/runner.ts";
import { openRunLog } from "../state/log.ts";

/** Plain-text listing of a plan. */
export function planText(steps: Step[]): string {
  return steps
    .map((s, i) => {
      const lines = [`${i + 1}. ${s.description}`];
      for (const c of s.commands) lines.push(`   $ ${describeCmd(c)}${c.optional ? "  (optional)" : ""}`);
      if (s.actionDescription) lines.push(`   → ${s.actionDescription}`);
      if (s.skipIf) lines.push(`   skipped when: ${describeCmd(s.skipIf)}`);
      return lines.join("\n");
    })
    .join("\n");
}

const mark = (r: StepResult) => (r.status === "ok" ? color.ok("✓") : r.status === "skip" ? color.dim("-") : color.error("✗"));

/**
 * Runs or previews a plan.
 *
 * @param command name used for the run log, such as `init`
 * @param extra data merged into the JSON result
 */
export async function executePlan(ctx: Context, command: string, steps: Step[], extra: Record<string, unknown> = {}, runner?: Runner): Promise<Result & { results?: StepResult[] }> {
  const dryRun = Boolean(ctx.options["dry-run"]);
  if (dryRun) {
    return {
      data: { dryRun: true, ...extra, steps: steps.map((s) => ({ id: s.id, description: s.description, commands: s.commands.map(describeCmd), action: s.actionDescription })) },
      text: () => blocks(section(`${command} (dry run)`), planText(steps) || "Nothing to do."),
    };
  }
  if (!runner && planNeedsSudo(steps)) {
    const blocked = ensureSudo(ctx.interactive);
    if (blocked) return { code: ExitCode.SUDO_PASSWORD, data: { ...extra, sudo: false }, text: `✗ ${blocked}` };
  }
  const log = openRunLog(command);
  const results = await runSteps(steps, runner ?? realRunner(), (r) => {
    log.event({ item: r.id, action: command, status: r.status, durationMs: r.durationMs, ...(r.message ? { message: r.message } : {}) });
    if (!ctx.json) ctx.stderr(`${mark(r)} ${steps.find((s) => s.id === r.id)?.description ?? r.id}${r.message && r.status === "fail" ? `\n  ${color.dim(r.message)}` : ""}`);
  });
  const failed = results.filter((r) => r.status === "fail");
  return {
    results,
    code: failed.length ? ExitCode.PARTIAL : ExitCode.SUCCESS,
    data: { dryRun: false, ...extra, log: log.path, results },
    text: () =>
      failed.length
        ? `${color.error(`${failed.length} of ${results.length} steps failed.`)} Log: ${log.path}`
        : `${color.ok("Done.")} Log: ${log.path}`,
  };
}

/**
 * Makes sure sudo works before a plan that needs it. Every step runs
 * `sudo -n`, which never prompts; without this check a person whose sudo asks
 * for a password saw each step fail. In a terminal, `sudo -v` asks once and
 * caches the credentials for the run. Without a terminal, the command stops
 * with SUDO_PASSWORD (13) before changing anything.
 *
 * @returns a message when sudo is not available, or undefined
 */
export function ensureSudo(interactive: boolean, probe: (argv: string[], inherit: boolean) => number = runSudo): string | undefined {
  if (process.platform === "win32" || isRoot()) return undefined;
  if (probe(["sudo", "-n", "true"], false) === 0) return undefined;
  if (interactive && probe(["sudo", "-v", "-p", "[setupvibe] sudo password for %u: "], true) === 0) return undefined;
  return interactive ? "sudo did not accept the password." : "sudo asks for a password and there is no terminal to type it. Run in a terminal, or add a NOPASSWD rule (user nopasswd).";
}

function runSudo(argv: string[], inherit: boolean): number {
  return Bun.spawnSync(argv, { stdin: inherit ? "inherit" : "ignore", stdout: inherit ? "inherit" : "ignore", stderr: inherit ? "inherit" : "ignore" }).exitCode ?? 1;
}

/** `--dry-run` option shared by commands that change the machine. */
export const DRY_RUN_OPTION = { name: "--dry-run", description: "Show what would run without changing anything." } as const;

/** A dry runner, re-exported for tests. */
export { dryRunner };
