/**
 * Shared start routine of both SetupVibe binaries.
 *
 * Dispatch rule:
 *
 * 1. no arguments and an interactive terminal → open the TUI;
 * 2. no arguments and no TTY → print help and exit with code 2, so pipes
 *    and agents do not hang waiting for an interface;
 * 3. with arguments → CLI (including `mcp`, which becomes a stdio server).
 *
 * The entry point registers its edition before importing this module. The
 * process always ends through `process.exit` with a code from
 * `app/exit-codes.ts`.
 */
import { runCli } from "./cli/index.ts";
import { ExitCode } from "./app/exit-codes.ts";

/** Runs the binary with the given arguments and exits the process. */
export async function run(argv: string[]): Promise<never> {
  process.on("SIGINT", () => {
    process.exit(ExitCode.INTERRUPTED);
  });

  const noArguments = argv.length === 0;
  const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);

  const code = noArguments && interactive ? await runCli(["tui"]) : await runCli(noArguments ? ["--help"] : argv);

  process.exit(noArguments && !interactive ? ExitCode.USAGE : code);
}
