/**
 * OpenCLI description generator.
 *
 * Converts the command registry into the JSON document defined by the
 * OpenCLI Specification 0.1 (https://opencli.org). Agents and documentation
 * generators read it to learn how to invoke the binary without opening the
 * code. `bun run opencli` writes the result to `docs/opencli.json`, and
 * `bun run opencli:check` fails when the file is out of date.
 */
import { manifest } from "../app/manifest.ts";
import { exitCodeDescriptions, ExitCode } from "../app/exit-codes.ts";
import { GLOBAL_OPTIONS, type Command, type ArgumentDefinition, type OptionDefinition } from "./registry.ts";

interface OpenCliArgument {
  name: string;
  description?: string;
  required?: boolean;
  arity?: { minimum: number; maximum?: number };
  acceptedValues?: string[];
}

interface OpenCliOption {
  name: string;
  aliases?: string[];
  description: string;
  required?: boolean;
  recursive?: boolean;
  arguments?: OpenCliArgument[];
  metadata?: Array<{ name: string; value: unknown }>;
}

interface OpenCliCommand {
  name: string;
  aliases?: string[];
  description?: string;
  arguments?: OpenCliArgument[];
  options?: OpenCliOption[];
  commands?: OpenCliCommand[];
  exitCodes?: Array<{ code: number; description: string }>;
  examples?: string[];
  interactive?: boolean;
  hidden?: boolean;
}

export interface OpenCliDocument {
  $schema: string;
  opencli: "0.1";
  info: {
    title: string;
    version: string;
    summary: string;
    description: string;
    contact?: { name: string; url: string };
    license?: { name: string };
  };
  conventions: { groupOptions: boolean; optionSeparator: string };
  command: OpenCliCommand;
}

function argument(a: ArgumentDefinition): OpenCliArgument {
  const out: OpenCliArgument = { name: a.name, description: a.description, required: a.required === true };
  if (a.variadic) out.arity = { minimum: a.required ? 1 : 0 };
  if (a.values) out.acceptedValues = [...a.values];
  return out;
}

function option(o: OptionDefinition): OpenCliOption {
  const out: OpenCliOption = { name: o.name, description: o.description };
  if (o.aliases?.length) out.aliases = [...o.aliases];
  if (o.recursive) out.recursive = true;
  if (o.argument) {
    out.arguments = [
      {
        name: o.argument.name,
        required: !o.argument.optional,
        arity: { minimum: o.argument.optional ? 0 : 1, maximum: 1 },
        ...(o.argument.values ? { acceptedValues: [...o.argument.values] } : {}),
      },
    ];
  }
  if (o.default !== undefined) out.metadata = [{ name: "x-default", value: o.default }];
  return out;
}

function command(c: Command, isRoot: boolean): OpenCliCommand {
  const out: OpenCliCommand = { name: isRoot ? manifest.bin : c.name, description: c.description };
  if (c.aliases?.length) out.aliases = [...c.aliases];
  if (c.arguments?.length) out.arguments = c.arguments.map(argument);
  const options = [...(isRoot ? GLOBAL_OPTIONS : []), ...(c.options ?? [])].filter((o) => !o.hidden);
  if (options.length) out.options = options.map(option);
  const children = (c.subcommands ?? []).filter((s) => !s.hidden);
  if (children.length) out.commands = children.map((s) => command(s, false));
  if (c.examples?.length) out.examples = [...c.examples];
  if (c.interactive) out.interactive = true;
  if (c.hidden) out.hidden = true;
  const base: readonly ExitCode[] = [ExitCode.SUCCESS, ExitCode.GENERIC_ERROR, ExitCode.USAGE];
  const codes = isRoot ? exitCodeDescriptions : exitCodeDescriptions.filter((d) => base.includes(d.code) || c.exitCodes?.includes(d.code));
  out.exitCodes = codes.map((d) => ({ code: d.code, description: `${d.name}: ${d.description}` }));
  return out;
}

/** Builds the full OpenCLI document from the registry root. */
export function generateOpenCli(root: Command): OpenCliDocument {
  return {
    $schema: "https://opencli.org/draft.json",
    opencli: "0.1",
    info: {
      title: manifest.title,
      version: manifest.version,
      summary: manifest.description,
      description:
        `${manifest.description} Without arguments it opens the TUI; "${manifest.bin} mcp" starts the MCP server over stdio; ` +
        `any other command runs as a CLI with text or --json output.`,
      ...(manifest.author ? { contact: { name: manifest.author, url: manifest.site || manifest.repository } } : {}),
      license: { name: manifest.license },
    },
    conventions: { groupOptions: false, optionSeparator: " " },
    command: command(root, true),
  };
}
