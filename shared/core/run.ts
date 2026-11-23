import { basename } from "node:path";
import { runCli, printErrorJson } from "./cli/index.ts";
import { readSettings, getPath } from "./config/settings.ts";
import { AppError } from "./app/errors.ts";
import { edition, isEdition, selectEdition, type EditionId } from "./app/edition.ts";
import { ExitCode } from "./app/exit-codes.ts";
import { commandOf, HELP_VERSION_FLAGS, metadataOnly, startup } from "../startup.ts";
import { EDITION_REQUIRED, platformEdition, savedEdition } from "../commands/edition.ts";

/** Bun uses an internal script path in compiled binaries; argv0 keeps the invoked name. */
export function legacyServerInvocation(argv0 = process.argv0): boolean {
  return basename(argv0) === "setupvibe-server";
}

function fail(argv: string[], error: AppError): number {
  let json = argv.includes("--json");
  try {
    json ||= getPath(readSettings(), "output.format") === "json";
  } catch {
    // Still report the original error if settings are unreadable.
  }
  if (json) printErrorJson("setupvibe", error);
  else process.stderr.write(`✗ ${error.message}\n`);
  return error.code;
}

/** Dispatches before parsing the edition-specific command tree. */
export async function dispatch(argv: string[], sourceEdition?: EditionId): Promise<number> {
  const explicit = isEdition(argv[0]) ? argv[0] : undefined;
  if (explicit) argv.shift();
  const legacy = legacyServerInvocation() ? "server" : undefined;
  const command = commandOf(argv);
  const tty = Boolean(process.stdin.isTTY && process.stdout.isTTY);
  const tui = command === "tui" || (argv.length === 0 && tty);
  let saved: EditionId | undefined;
  try {
    saved = savedEdition();
  } catch (error) {
    if (!explicit && !legacy && !sourceEdition && !metadataOnly(argv)) {
      return fail(argv, new AppError(ExitCode.CONFIG, `Cannot read the saved edition: ${(error as Error).message}`));
    }
  }
  const implicit = saved ? undefined : platformEdition();
  const selected = explicit ?? legacy ?? sourceEdition ?? saved ?? (tui ? undefined : implicit);
  const chooseEdition = !selected && tui && !metadataOnly(argv);
  const common = command === "edition" || (command === "mcp" && !argv.includes("install")) || command === "completion"
    || (argv.length === 0 && !tty) || metadataOnly(argv, HELP_VERSION_FLAGS);
  if (!selected && !chooseEdition && !common) return fail(argv, new AppError(ExitCode.EDITION_REQUIRED, EDITION_REQUIRED));
  if (!selected && command === "tui" && !tty && !metadataOnly(argv)) {
    return fail(argv, new AppError(ExitCode.NO_TTY, "The TUI needs an interactive terminal."));
  }
  selectEdition(selected ?? "desktop");
  if (saved && selected === saved && !explicit && !legacy && !sourceEdition && !tui && !metadataOnly(argv, HELP_VERSION_FLAGS) && command !== "edition" && command !== "mcp") {
    process.stderr.write(`Using saved edition: ${saved}.\n`);
  }
  try {
    await startup(argv, edition().id, { chooseEdition, common: !selected && common });
  } catch (error) {
    if (error instanceof AppError) return fail(argv, error);
    throw error;
  }

  const code = await runCli(argv.length ? argv : tty ? ["tui"] : ["--help"], { chooseEdition, mcpEdition: explicit ?? legacy ?? sourceEdition });
  return !argv.length && !tty ? ExitCode.USAGE : code;
}

export async function run(argv: string[], sourceEdition?: EditionId): Promise<never> {
  process.on("SIGINT", () => process.exit(ExitCode.INTERRUPTED));
  process.exit(await dispatch(argv, sourceEdition));
}
