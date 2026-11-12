/**
 * Checks that run before any command (spec sections 1, 3, 4 and 11).
 *
 * - Root: SetupVibe does not run as root. The exceptions are the commands
 *   that need it or only read: `user create`, `auto --user`, `security`,
 *   `system`, `about`, `docs`, `doctor`, `report`, `upgrade`, `self` and the
 *   help and version flags.
 * - Unsupported system: the TUI shows a message and exits.
 * - State files: an unreadable config.json, selection.json or external.json
 *   is reported at start instead of failing later.
 * - Updates: a newer release of the channel is announced on stderr, from the
 *   six-hour cache or a short network check; never in JSON, MCP or pipes.
 */
import { manifest } from "./core/app/manifest.ts";
import { edition } from "./core/app/edition.ts";
import { ExitCode } from "./core/app/exit-codes.ts";
import type { Inventory } from "./inventory.ts";
import { isRoot } from "./exec/runner.ts";
import { detectSystem } from "./system/detect.ts";
import { readState, STATE_FILES } from "./state/store.ts";
import { checkForUpdate, type Channel } from "./state/update.ts";
import { stateProblems } from "./state/schemas.ts";

/** Commands allowed as root. */
export const ROOT_ALLOWED = ["user", "auto", "security", "system", "about", "docs", "doctor", "report", "upgrade", "self", "completion", "help"];

/** First word of argv that is not an option. */
export function commandOf(argv: string[]): string | undefined {
  return argv.find((a) => !a.startsWith("-"));
}

/** Why the command must not run as root, or undefined when it may. */
export function rootRefusal(argv: string[], root: boolean, platform = process.platform): string | undefined {
  if (!root || platform === "win32") return undefined;
  if (argv.some((a) => a === "--help" || a === "-h" || a === "--version" || a === "-V" || a === "--skill")) return undefined;
  const command = commandOf(argv);
  if (command && ROOT_ALLOWED.includes(command)) return undefined;
  return `${manifest.bin} does not run as root. Create the working user first: ${manifest.bin} user create <name>, or use ${manifest.bin} auto --user <name>.`;
}

/** True when the update notice may be printed for this run. */
export function wantsUpdateNotice(argv: string[], stderrTty: boolean): boolean {
  if (!stderrTty) return false;
  if (argv.some((a) => ["--json", "--version", "-V", "--skill", "--help", "-h"].includes(a))) return false;
  const command = commandOf(argv);
  return !["mcp", "upgrade", "docs", "completion", "system"].includes(command ?? "");
}

/**
 * Runs the start-up checks.
 *
 * @returns an exit code to stop with, or undefined to continue
 */
export async function startup(argv: string[]): Promise<number | undefined> {
  const refusal = rootRefusal(argv, isRoot());
  if (refusal) {
    process.stderr.write(`✗ ${refusal}\n`);
    return ExitCode.ROOT;
  }

  const tui = argv.length === 0 || commandOf(argv) === "tui";
  if (tui && !argv.includes("--help")) {
    const detected = detectSystem((edition().inventory as Inventory).systems);
    if (detected.unsupportedReason) {
      process.stderr.write(`✗ ${detected.unsupportedReason}\n`);
      return ExitCode.UNSUPPORTED_SYSTEM;
    }
  }

  for (const file of STATE_FILES) {
    try {
      const data = readState(file, {});
      if (Object.keys(data).length) for (const p of stateProblems(file, data)) process.stderr.write(`! ~/.setupvibe/${file}: ${p}\n`);
    } catch (e) {
      process.stderr.write(`! ~/.setupvibe/${file}: ${(e as Error).message}\n`);
    }
  }

  if (wantsUpdateNotice(argv, Boolean(process.stderr.isTTY))) {
    try {
      const channel = ((readState<Record<string, unknown>>("config.json", {}).channel as Channel | undefined) ?? "stable") as Channel;
      const status = await checkForUpdate(manifest.version, channel, { timeoutMs: 1500 });
      if (status.updateRequired) process.stderr.write(`! ${manifest.bin} ${status.latest} is required (minimum ${status.minimum}). Run: ${manifest.bin} upgrade\n`);
      else if (status.updateAvailable) process.stderr.write(`↑ ${manifest.bin} ${status.latest} is available. Run: ${manifest.bin} upgrade\n`);
    } catch {
      // The update check never blocks a command.
    }
  }
  return undefined;
}
