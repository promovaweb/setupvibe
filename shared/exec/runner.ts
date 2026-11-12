/**
 * Command execution.
 *
 * Everything that changes the machine is described as a list of `Step`s and
 * executed by a `Runner`. The real runner spawns processes, adding `sudo -n`
 * to privileged commands when SetupVibe is not root. The dry-run runner only
 * records what would run, which backs `--dry-run` and the tests.
 *
 * Steps never build shell strings: each command is an argv array, so values
 * such as user names and keys are never interpreted by a shell.
 */

/** One command, as an argv array. */
export interface Cmd {
  argv: string[];
  /** Needs root: prefixed with `sudo -n` when SetupVibe is not root. */
  sudo?: boolean;
  /** Extra environment variables. */
  env?: Record<string, string>;
  /** Data written to stdin. */
  input?: string;
  /** A failure of this command does not fail the step. */
  optional?: boolean;
  /** Extra attempts after a failure, with a growing wait; for network commands. */
  retries?: number;
  /** Environment variables removed for this command, such as PSModulePath. */
  unsetEnv?: string[];
}

/** Environment of a command: the process environment, the defaults, the command's own, minus `unsetEnv`. */
export function commandEnv(cmd: Cmd, base: Record<string, string | undefined> = process.env): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = { ...base, ...NON_INTERACTIVE_ENV, ...cmd.env };
  for (const key of cmd.unsetEnv ?? []) {
    for (const k of Object.keys(env)) if (k.toLowerCase() === key.toLowerCase()) delete env[k];
  }
  return env;
}

/** A unit of work with a description and its commands. */
export interface Step {
  id: string;
  description: string;
  commands: Cmd[];
  /** When this command succeeds, the step is already done and is skipped. */
  skipIf?: Cmd;
  /**
   * Work done in code after the commands, such as a verified download.
   * Not called in dry runs; `actionDescription` is shown instead.
   */
  action?: (runner: Runner) => Promise<void>;
  actionDescription?: string;
}

export interface CmdResult {
  code: number;
  stdout: string;
  stderr: string;
}

export interface StepResult {
  id: string;
  status: "ok" | "skip" | "fail";
  durationMs: number;
  message?: string;
}

export interface Runner {
  readonly dryRun: boolean;
  exec(cmd: Cmd): Promise<CmdResult>;
}

/** Environment that keeps package managers and installers from asking questions. */
export const NON_INTERACTIVE_ENV: Record<string, string> = {
  DEBIAN_FRONTEND: "noninteractive",
  NEEDRESTART_MODE: "a",
  NONINTERACTIVE: "1",
  CI: "1",
};

/** True when the process runs as root on Unix. */
export function isRoot(): boolean {
  return typeof process.getuid === "function" && process.getuid() === 0;
}

/** argv actually executed, with `sudo -n` when needed. */
export function finalArgv(cmd: Cmd, root: boolean): string[] {
  if (!cmd.sudo || root || process.platform === "win32") return cmd.argv;
  const envArgs = Object.entries({ ...NON_INTERACTIVE_ENV, ...cmd.env }).map(([k, v]) => `${k}=${v}`);
  return ["sudo", "-n", "env", ...envArgs, ...cmd.argv];
}

/** Human-readable form of a command, for plans and logs. */
export function describeCmd(cmd: Cmd): string {
  const quote = (a: string) => (/^[\w@%+=:,./-]+$/.test(a) ? a : `'${a.replaceAll("'", "'\\''")}'`);
  return `${cmd.sudo ? "sudo " : ""}${cmd.argv.map(quote).join(" ")}`;
}

/** Runner that spawns processes. */
export function realRunner(): Runner {
  const root = isRoot();
  return {
    dryRun: false,
    async exec(cmd) {
      const proc = Bun.spawn(finalArgv(cmd, root), {
        env: commandEnv(cmd),
        stdin: cmd.input === undefined ? "ignore" : new Response(cmd.input),
        stdout: "pipe",
        stderr: "pipe",
      });
      const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
      return { code: await proc.exited, stdout, stderr };
    },
  };
}

/**
 * Runner that records commands without running them.
 *
 * @param answers optional canned results, matched by the described command
 */
export function dryRunner(answers: Record<string, Partial<CmdResult>> = {}): Runner & { calls: Cmd[] } {
  const calls: Cmd[] = [];
  return {
    dryRun: true,
    calls,
    async exec(cmd) {
      calls.push(cmd);
      const answer = answers[describeCmd(cmd)];
      return { code: answer?.code ?? 0, stdout: answer?.stdout ?? "", stderr: answer?.stderr ?? "" };
    },
  };
}

/** Wait before retry number `attempt` (1-based), in milliseconds: 2 s, 4 s, 8 s. */
export function retryDelayMs(attempt: number): number {
  return 1000 * 2 ** attempt;
}

/** Runs a command, retrying network commands with a growing wait. */
export async function execWithRetries(cmd: Cmd, runner: Runner, sleep: (ms: number) => Promise<void> = (ms) => Bun.sleep(ms)): Promise<CmdResult> {
  let result = await runner.exec(cmd);
  for (let attempt = 1; result.code !== 0 && attempt <= (cmd.retries ?? 0) && !runner.dryRun; attempt++) {
    await sleep(retryDelayMs(attempt));
    result = await runner.exec(cmd);
  }
  return result;
}

/**
 * Runs steps in order. A failed step does not stop the next ones; the caller
 * decides the exit code from the results.
 */
export async function runSteps(steps: Step[], runner: Runner, onStep?: (r: StepResult) => void): Promise<StepResult[]> {
  const results: StepResult[] = [];
  for (const step of steps) {
    const started = Date.now();
    let result: StepResult;
    if (step.skipIf && !runner.dryRun && (await runner.exec(step.skipIf)).code === 0) {
      result = { id: step.id, status: "skip", durationMs: Date.now() - started, message: "already done" };
    } else {
      let failure: string | undefined;
      for (const cmd of step.commands) {
        const r = await execWithRetries(cmd, runner);
        if (r.code !== 0 && !cmd.optional) {
          failure = `${describeCmd(cmd)} exited with ${r.code}: ${(r.stderr || r.stdout).trim().split("\n").slice(-3).join(" ")}`;
          break;
        }
      }
      if (!failure && step.action && !runner.dryRun) {
        try {
          await step.action(runner);
        } catch (e) {
          failure = e instanceof Error ? e.message : String(e);
        }
      }
      result = { id: step.id, status: failure ? "fail" : "ok", durationMs: Date.now() - started, ...(failure ? { message: failure } : {}) };
    }
    results.push(result);
    onStep?.(result);
  }
  return results;
}
