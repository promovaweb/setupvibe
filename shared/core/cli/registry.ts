/**
 * Declarative command registry types.
 *
 * Each command is a `Command` object describing name, arguments, options,
 * subcommands, examples and exit codes, plus the `run` function. The parser,
 * `--help`, the `--json` output, the OpenCLI description (`--opencli`) and
 * the embedded documentation (`--skill`) all read this same registry, so an
 * option documented here shows up everywhere without duplication.
 *
 * To add a command: create `src/cli/commands/<name>.ts` exporting a
 * `Command` and register it in `commands.ts`. The stub in `template/command/`
 * shows the expected shape.
 */
import type { ExitCode } from "../app/exit-codes.ts";

/** Positional argument. */
export interface ArgumentDefinition {
  /** Name shown between `<>` or `[]` in the usage line. */
  name: string;
  description: string;
  /** When `true`, absence raises USAGE. */
  required?: boolean;
  /** Accepts several values; only allowed as the last argument. */
  variadic?: boolean;
  /** Closed list of accepted values. */
  values?: readonly string[];
}

/** Named option (`--flag` or `--key value`). */
export interface OptionDefinition {
  /** Long name with the two hyphens, e.g. `--json`. */
  name: string;
  /** Short or alternative aliases, e.g. `-j`. */
  aliases?: readonly string[];
  description: string;
  /** Present when the option takes a value. Absent for boolean flags. */
  argument?: {
    name: string;
    values?: readonly string[];
    /** For options with an optional value (`--skill [topic]`). */
    optional?: boolean;
  };
  /** Available in every subcommand (OpenCLI `recursive`). */
  recursive?: boolean;
  /** Value assumed when the option is not given. */
  default?: string | boolean;
  /** Hidden from `--help`, still accepted by the parser. */
  hidden?: boolean;
}

/** Parsed option values, keyed by long name without hyphens. */
export type Options = Record<string, string | boolean | undefined>;

/** Context handed to `run`. */
export interface Context {
  /** Positional arguments in the given order. */
  args: string[];
  /** Resolved options (long name without `--`). */
  options: Options;
  /** `true` when output must be JSON. */
  json: boolean;
  /** Command chain up to here, e.g. `["config", "set"]`. */
  path: string[];
  /** Writes to stdout honoring the text/JSON convention. */
  stdout: (text: string) => void;
  /** Writes to stderr (warnings, progress). */
  stderr: (text: string) => void;
  /** Whether stdin is an interactive terminal. */
  interactive: boolean;
}

/** Standard return of a command. */
export interface Result {
  /** Structure returned under `data` in `--json`. */
  data: unknown;
  /** Human-readable text. May be a function to render lazily. */
  text: string | (() => string);
  /** Exit code. Absent means SUCCESS. */
  code?: ExitCode;
}

/** Full definition of a command or subcommand. */
export interface Command {
  name: string;
  aliases?: readonly string[];
  /** One line, used in lists. */
  description: string;
  /** Extra paragraphs shown in the command's own `--help`. */
  longDescription?: string;
  arguments?: readonly ArgumentDefinition[];
  options?: readonly OptionDefinition[];
  subcommands?: readonly Command[];
  /** Full example lines, starting with the binary name. */
  examples?: readonly string[];
  /** Exit codes this command can return besides 0, 1 and 2. */
  exitCodes?: readonly ExitCode[];
  /** Requires an interactive terminal (OpenCLI `interactive`). */
  interactive?: boolean;
  /** Hidden from `--help` and the public OpenCLI description. */
  hidden?: boolean;
  /** Absent on commands that only group subcommands. */
  run?: (ctx: Context) => Promise<Result> | Result;
}

/** Global options, accepted before or after the subcommand. */
export const GLOBAL_OPTIONS: readonly OptionDefinition[] = Object.freeze([
  {
    name: "--help",
    aliases: ["-h"],
    description: "Show help for the current command and exit with code 0.",
    recursive: true,
  },
  {
    name: "--version",
    aliases: ["-V"],
    description: "Print the version and exit with code 0.",
    recursive: true,
  },
  {
    name: "--json",
    description:
      "Return JSON output with the envelope { ok, command, data } or { ok, command, error }. Errors are JSON too.",
    recursive: true,
  },
  {
    name: "--skill",
    argument: { name: "topic", optional: true, values: ["cli", "tui", "mcp", "config", "exit-codes", "reference"] },
    description:
      "Print the full documentation embedded in the binary, written for AI agents. With a topic, print only that section.",
    recursive: true,
  },
  {
    name: "--opencli",
    description: "Print the OpenCLI description (JSON) of the whole command tree.",
    recursive: true,
  },
  {
    name: "--no-color",
    description: "Disable ANSI colors in text output. Same as NO_COLOR=1.",
    recursive: true,
  },
]);

/** Finds a subcommand by name or alias. */
export function findSubcommand(parent: Command, name: string): Command | undefined {
  return parent.subcommands?.find((c) => c.name === name || c.aliases?.includes(name));
}

/** Long name without hyphens, used as the key in `Options`. */
export function optionKey(name: string): string {
  return name.replace(/^--?/, "");
}
