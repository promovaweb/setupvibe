/**
 * CLI execution.
 *
 * `runCli(argv)` parses the arguments, handles the global options
 * (`--help`, `--version`, `--skill`, `--opencli`), runs the command and
 * returns the exit code. Printing follows the convention: text for people,
 * `--json` for machines, with a stable envelope on success and on error.
 */
import { AppError } from "../app/errors.ts";
import { manifest } from "../app/manifest.ts";
import { ExitCode, exitCodeName } from "../app/exit-codes.ts";
import { readSettings, getPath } from "../config/settings.ts";
import { skillText } from "../skill/index.ts";
import { renderHelp } from "./help.ts";
import { root } from "./commands.ts";
import { color, forceColors } from "./format.ts";
import { generateOpenCli } from "./opencli.ts";
import { parse } from "./parser.ts";
import type { Context, Result } from "./registry.ts";

const write = (text: string) => {
  if (text.length) process.stdout.write(text.endsWith("\n") ? text : `${text}\n`);
};
const writeError = (text: string) => {
  if (text.length) process.stderr.write(text.endsWith("\n") ? text : `${text}\n`);
};

function prefersJson(): boolean {
  try {
    return getPath(readSettings(), "output.format") === "json";
  } catch {
    return false;
  }
}

/** Prints the JSON success envelope. */
export function printJson(command: string, data: unknown): void {
  write(JSON.stringify({ ok: true, command, data }, null, 2));
}

/** Prints the JSON error envelope. */
export function printErrorJson(command: string, e: AppError): void {
  write(JSON.stringify({ ok: false, command, error: e.toJSON() }, null, 2));
}

/** Runs the CLI and returns the exit code without exiting the process. */
export async function runCli(argv: readonly string[]): Promise<number> {
  let json = argv.includes("--json") || prefersJson();
  let commandName = manifest.bin;

  try {
    const parsed = parse(root, argv);
    const { command, path, args, options } = parsed;
    commandName = [manifest.bin, ...path].join(" ");
    json = options.json === true || (options.json === undefined && prefersJson());
    if (options["no-color"] === true) forceColors(false);

    if (options.version === true) {
      if (json) printJson(commandName, { bin: manifest.bin, version: manifest.version });
      else write(`${manifest.bin} ${manifest.version}`);
      return ExitCode.SUCCESS;
    }

    if (options.opencli === true) {
      write(JSON.stringify(generateOpenCli(root), null, 2));
      return ExitCode.SUCCESS;
    }

    if (options.skill !== undefined) {
      const topic = typeof options.skill === "string" ? options.skill : undefined;
      const text = skillText(root, topic);
      if (json) printJson(commandName, { topic: topic ?? "all", markdown: text });
      else write(text);
      return ExitCode.SUCCESS;
    }

    if (options.help === true || !command.run) {
      const help = renderHelp(root, path, command);
      if (json) printJson(commandName, { help: help.replace(/\u001b\[[0-9;]*m/g, "") });
      else write(help);
      return options.help === true ? ExitCode.SUCCESS : ExitCode.USAGE;
    }

    const ctx: Context = {
      args,
      options,
      json,
      path,
      stdout: write,
      stderr: writeError,
      interactive: Boolean(process.stdin.isTTY && process.stdout.isTTY),
    };

    const result: Result = await command.run(ctx);
    if (json) printJson(commandName, result.data);
    else write(typeof result.text === "function" ? result.text() : result.text);
    return result.code ?? ExitCode.SUCCESS;
  } catch (e) {
    const appError = e instanceof AppError ? e : new AppError(ExitCode.GENERIC_ERROR, e instanceof Error ? e.message : String(e));
    if (json) {
      printErrorJson(commandName, appError);
    } else {
      writeError(`${color.error("error")} ${appError.message} ${color.dim(`[${appError.code} ${exitCodeName(appError.code)}]`)}`);
      if (appError.code === ExitCode.USAGE) writeError(color.dim(`Use "${commandName} --help".`));
    }
    return appError.code;
  }
}
