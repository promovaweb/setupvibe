/**
 * `--help` rendering.
 *
 * Builds help for the root and for any subcommand from the registry. The
 * output includes usage, description, arguments, command options, global
 * options, subcommands, examples and the exit-code table. Because everything
 * comes from the registry, help never drifts from the parser.
 */
import { manifest } from "../app/manifest.ts";
import { exitCodeDescriptions, ExitCode } from "../app/exit-codes.ts";
import { blocks, color, section, table } from "./format.ts";
import { GLOBAL_OPTIONS, type Command, type ArgumentDefinition, type OptionDefinition } from "./registry.ts";

function argumentUsage(a: ArgumentDefinition): string {
  const name = a.variadic ? `${a.name}...` : a.name;
  return a.required ? `<${name}>` : `[${name}]`;
}

function optionLabel(o: OptionDefinition): string {
  const names = [...(o.aliases ?? []), o.name].join(", ");
  if (!o.argument) return names;
  const arg = o.argument.optional ? `[${o.argument.name}]` : `<${o.argument.name}>`;
  return `${names} ${arg}`;
}

function optionDescription(o: OptionDefinition): string {
  const parts = [o.description];
  if (o.argument?.values) parts.push(color.dim(`Values: ${o.argument.values.join(", ")}.`));
  if (o.default !== undefined) parts.push(color.dim(`Default: ${String(o.default)}.`));
  return parts.join(" ");
}

/** Usage line of a command, e.g. `termfy config set <key> <value>`. */
export function usageLine(path: string[], command: Command): string {
  const parts = [manifest.bin, ...path];
  if (command.subcommands?.length) parts.push("<subcommand>");
  for (const a of command.arguments ?? []) parts.push(argumentUsage(a));
  if ((command.options?.length ?? 0) > 0 || GLOBAL_OPTIONS.length > 0) parts.push("[options]");
  return parts.join(" ");
}

/** Exit-code table, used in the root help. */
export function exitCodeTable(filter?: readonly ExitCode[]): string {
  const base: ExitCode[] = [ExitCode.SUCCESS, ExitCode.GENERIC_ERROR, ExitCode.USAGE];
  const list = filter ? exitCodeDescriptions.filter((d) => base.includes(d.code) || filter.includes(d.code)) : exitCodeDescriptions;
  return table(list.map((d) => [`${String(d.code).padStart(3)}  ${d.name}`, d.description]));
}

/** Full help for the command at the given path. */
export function renderHelp(root: Command, path: string[], command: Command): string {
  const isRoot = path.length === 0;
  const title = isRoot
    ? `${color.strong(manifest.title)} ${color.dim(`v${manifest.version}`)}\n${manifest.description}`
    : `${color.strong([manifest.bin, ...path].join(" "))}\n${command.description}`;

  const usage = blocks(
    section("Usage"),
    `  ${usageLine(path, command)}` +
      (isRoot
        ? `\n  ${manifest.bin}                      ${color.dim("opens the TUI (no arguments, interactive terminal)")}` +
          `\n  ${manifest.bin} mcp                  ${color.dim("starts the MCP server over stdio")}`
        : ""),
  );

  const longDescription = command.longDescription ? blocks(section("Description"), indent(command.longDescription)) : undefined;

  const args = command.arguments?.length
    ? blocks(
        section("Arguments"),
        table(
          command.arguments.map((a) => [
            argumentUsage(a),
            a.description + (a.values ? ` ${color.dim(`Values: ${a.values.join(", ")}.`)}` : ""),
          ]),
        ),
      )
    : undefined;

  const subcommands = command.subcommands?.filter((c) => !c.hidden).length
    ? blocks(
        section(isRoot ? "Commands" : "Subcommands"),
        table(
          (command.subcommands ?? [])
            .filter((c) => !c.hidden)
            .map((c) => [c.aliases?.length ? `${c.name} (${c.aliases.join(", ")})` : c.name, c.description]),
        ),
      )
    : undefined;

  const localOptions = command.options?.filter((o) => !o.hidden).length
    ? blocks(section("Options"), table((command.options ?? []).filter((o) => !o.hidden).map((o) => [optionLabel(o), optionDescription(o)])))
    : undefined;

  const globalOptions = blocks(
    section("Global options"),
    table(GLOBAL_OPTIONS.filter((o) => !o.hidden).map((o) => [optionLabel(o), optionDescription(o)])),
  );

  const examples = command.examples?.length
    ? blocks(section("Examples"), command.examples.map((e) => `  ${color.code(e)}`).join("\n"))
    : undefined;

  const codes = blocks(section("Exit codes"), isRoot ? exitCodeTable() : exitCodeTable(command.exitCodes ?? []));

  const footer = isRoot
    ? color.dim(
        `User data lives in ~/.${manifest.bin}/ (settings.json and credentials.json). ` +
          `Use "${manifest.bin} --skill" for the full embedded documentation.`,
      )
    : color.dim(`See "${manifest.bin} --help" for the other commands.`);

  return blocks(title, usage, longDescription, args, subcommands, localOptions, globalOptions, examples, codes, footer);
}

function indent(text: string): string {
  return text
    .split("\n")
    .map((l) => (l.length ? `  ${l}` : l))
    .join("\n");
}
