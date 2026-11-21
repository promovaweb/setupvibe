import { existsSync } from "node:fs";
import { manifest } from "./core/app/manifest.ts";
import { edition, type EditionId } from "./core/app/edition.ts";
import { AppError } from "./core/app/errors.ts";
import { editionRefusal } from "./commands/edition.ts";
import { ExitCode } from "./core/app/exit-codes.ts";
import type { Inventory } from "./inventory.ts";
import { isRoot } from "./exec/runner.ts";
import { detectSystem } from "./system/detect.ts";
import { readState, statePath, STATE_FILES } from "./state/store.ts";
import { checkForUpdate, type Channel } from "./state/update.ts";
import { stateProblems } from "./state/schemas.ts";

/** First word of argv that is not an option. */
export function commandOf(argv: string[]): string | undefined {
  return argv.find((arg) => !arg.startsWith("-"));
}

export const HELP_VERSION_FLAGS = ["--help", "-h", "--version", "-V"];
const METADATA_FLAGS = [...HELP_VERSION_FLAGS, "--skill", "--opencli"];

export function metadataOnly(argv: string[], flags = METADATA_FLAGS): boolean {
  const end = argv.indexOf("--");
  return argv.slice(0, end < 0 ? argv.length : end).some((arg) => flags.includes(arg));
}

export function rootRefusal(argv: string[], root: boolean, platform = process.platform, id = manifest.edition): string | undefined {
  if (!root || platform === "win32" || id === "server" || metadataOnly(argv)) return undefined;
  return `The ${id} edition does not run as root. Run SetupVibe as a regular user.`;
}
/** True when the update notice may be printed for this run. */
export function wantsUpdateNotice(argv: string[], stderrTty: boolean): boolean {
  if (!stderrTty) return false;
  if (argv.some((a) => ["--json", "--version", "-V", "--skill", "--help", "-h"].includes(a))) return false;
  const command = commandOf(argv);
  return !["mcp", "upgrade", "docs", "completion", "system"].includes(command ?? "");
}

/** Runs the platform, privilege and state checks before dispatch. */
export async function startup(argv: string[], id: EditionId, options: { chooseEdition?: boolean; common?: boolean } = {}): Promise<void> {
  const command = commandOf(argv);
  const runningTui = argv.length === 0 || command === "tui";
  const common = ["edition", "completion", "docs"].includes(command ?? "") || (command === "mcp" && !argv.includes("install"));
  if (!options.chooseEdition && !options.common && !metadataOnly(argv) && !common) {
    const system = detectSystem((edition(id).inventory as Inventory).systems);
    if (id === "desktop" && system.system === "omarchy") {
      process.stderr.write("! Omarchy detected. Use setupvibe omarchy or setupvibe edition set omarchy.\n");
    }
    const unsupported = editionRefusal(id, system);
    if (unsupported) throw new AppError(ExitCode.UNSUPPORTED_SYSTEM, unsupported);
    const refusal = rootRefusal(argv, isRoot(), process.platform, id);
    // No arguments in a pipe print help; no-argument TUI obeys the root guard.
    if (refusal && (!runningTui || argv.length || process.stdin.isTTY)) throw new AppError(ExitCode.ROOT, refusal);
  }

  for (const file of STATE_FILES) {
    if (!existsSync(statePath(file))) continue;
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
      if (status.updateRequired) process.stderr.write(`! ${manifest.bin} ${status.latest} is required (minimum ${status.minimum}). Run: ${manifest.bin} ${id} upgrade\n`);
      else if (status.updateAvailable) process.stderr.write(`↑ ${manifest.bin} ${status.latest} is available. Run: ${manifest.bin} ${id} upgrade\n`);
    } catch {
      // The update check never blocks a command.
    }
  }
}
