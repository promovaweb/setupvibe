/**
 * argv parser.
 *
 * Walks the command tree consuming subcommands, then separates options from
 * positional arguments. Accepts `--key value`, `--key=value`, short aliases
 * and `--` to end option parsing. Unknown options, values outside the
 * accepted list and missing required arguments raise `AppError` with USAGE,
 * so the process exits with code 2.
 */
import { error } from "../app/errors.ts";
import { GLOBAL_OPTIONS, optionKey, findSubcommand, type Command, type OptionDefinition, type Options } from "./registry.ts";

/** Parse result: target command, path, arguments and options. */
export interface Parsed {
  command: Command;
  path: string[];
  args: string[];
  options: Options;
}

function visibleOptions(chain: Command[]): OptionDefinition[] {
  const list: OptionDefinition[] = [...GLOBAL_OPTIONS];
  chain.forEach((cmd, index) => {
    for (const op of cmd.options ?? []) {
      const isLast = index === chain.length - 1;
      if (isLast || op.recursive) list.push(op);
    }
  });
  return list;
}

function findOption(list: OptionDefinition[], token: string): OptionDefinition | undefined {
  return list.find((op) => op.name === token || op.aliases?.includes(token));
}

/** Parses `argv` (without the executable) against the registry root. */
export function parse(root: Command, argv: readonly string[]): Parsed {
  const chain: Command[] = [root];
  const path: string[] = [];
  const args: string[] = [];
  const options: Options = {};
  let readingOptions = true;
  let i = 0;

  while (i < argv.length) {
    const token = argv[i] as string;

    if (readingOptions && token === "--") {
      readingOptions = false;
      i += 1;
      continue;
    }

    if (readingOptions && token.startsWith("-") && token !== "-") {
      const [rawName, inlineValue] = splitInline(token);
      const def = findOption(visibleOptions(chain), rawName);
      if (!def) {
        throw error.usage(`Unknown option: ${rawName}. Use --help to see the options.`, {
          option: rawName,
          command: path.join(" ") || root.name,
        });
      }
      const key = optionKey(def.name);
      if (def.argument) {
        let value = inlineValue;
        if (value === undefined) {
          const next = argv[i + 1];
          const nextIsValue = next !== undefined && !next.startsWith("-");
          if (nextIsValue) {
            value = next;
            i += 1;
          } else if (!def.argument.optional) {
            throw error.usage(`Option ${def.name} requires a value <${def.argument.name}>.`, { option: def.name });
          }
        }
        if (value !== undefined && def.argument.values && !def.argument.values.includes(value)) {
          throw error.usage(`Invalid value for ${def.name}: "${value}". Accepted: ${def.argument.values.join(", ")}.`, {
            option: def.name,
            value,
            accepted: def.argument.values,
          });
        }
        options[key] = value === undefined ? true : value;
      } else {
        if (inlineValue !== undefined) {
          throw error.usage(`Option ${def.name} does not take a value.`, { option: def.name });
        }
        options[key] = true;
      }
      i += 1;
      continue;
    }

    const current = chain[chain.length - 1] as Command;
    const sub = args.length === 0 ? findSubcommand(current, token) : undefined;
    if (sub) {
      chain.push(sub);
      path.push(sub.name);
      i += 1;
      continue;
    }

    args.push(token);
    i += 1;
  }

  const command = chain[chain.length - 1] as Command;
  const asksMeta = options.help === true || options.version === true || options.skill !== undefined || options.opencli === true;
  if (!asksMeta) validateArguments(command, args, path.join(" ") || root.name);

  return { command, path, args, options };
}

function splitInline(token: string): [string, string | undefined] {
  if (token.startsWith("--")) {
    const eq = token.indexOf("=");
    if (eq > 2) return [token.slice(0, eq), token.slice(eq + 1)];
  }
  return [token, undefined];
}

function validateArguments(command: Command, args: string[], fullName: string): void {
  const defs = command.arguments ?? [];
  const required = defs.filter((d) => d.required).length;
  if (args.length < required) {
    const missing = defs.filter((d) => d.required).slice(args.length).map((d) => `<${d.name}>`);
    throw error.usage(`Missing arguments for "${fullName}": ${missing.join(" ")}.`, { command: fullName, missing });
  }
  const last = defs[defs.length - 1];
  const acceptsVariadic = last?.variadic === true;
  if (!acceptsVariadic && args.length > defs.length) {
    if (command.subcommands?.length && defs.length === 0) {
      throw error.usage(`Unknown subcommand for "${fullName}": "${args[0]}". Use --help.`, {
        command: fullName,
        received: args[0],
      });
    }
    throw error.usage(`Too many arguments for "${fullName}": ${args.slice(defs.length).join(" ")}.`, {
      command: fullName,
      extra: args.slice(defs.length),
    });
  }
  defs.forEach((def, index) => {
    const value = args[index];
    if (value !== undefined && def.values && !def.values.includes(value)) {
      throw error.usage(`Invalid value for <${def.name}>: "${value}". Accepted: ${def.values.join(", ")}.`, {
        argument: def.name,
        value,
        accepted: def.values,
      });
    }
  });
}
