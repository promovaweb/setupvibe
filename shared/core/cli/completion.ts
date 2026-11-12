/** Generates standalone shell completion scripts from the command registry. */
import { GLOBAL_OPTIONS, type Command, type OptionDefinition } from "./registry.ts";

export const COMPLETION_SHELLS = ["bash", "zsh", "fish"] as const;
export type CompletionShell = (typeof COMPLETION_SHELLS)[number];

interface State {
  id: string;
  command: Command;
  options: readonly OptionDefinition[];
  children: Array<{ name: string; id: string }>;
}

const quote = (text: string) => `'${text.replaceAll("'", "'\\''")}'`;

/** Builds a script without inspecting the process or starting a subprocess. */
export function generateCompletion(root: Command, shell: CompletionShell): string {
  const states: State[] = [];
  const visit = (command: Command, inherited: readonly OptionDefinition[]): string => {
    const id = String(states.length);
    const options = [...inherited, ...(command.options ?? [])].filter((o) => !o.hidden);
    const state: State = { id, command, options, children: [] };
    states.push(state);
    for (const child of command.subcommands ?? []) {
      if (child.hidden) continue;
      const childId = visit(child, options.filter((o) => o.recursive));
      for (const name of [child.name, ...(child.aliases ?? [])]) state.children.push({ name, id: childId });
    }
    return id;
  };
  visit(root, GLOBAL_OPTIONS);
  const name = `_complete_${root.name.replace(/[^a-zA-Z0-9_]/g, "_")}`;
  const options = states.flatMap((s) => s.options.flatMap((o) => [o.name, ...(o.aliases ?? [])].map((n) => ({ state: s.id, name: n, option: o }))));
  const transitions = states.flatMap((s) => s.children.map((c) => ({ key: `${s.id}:${c.name}`, id: c.id })));
  const suggestions = states.map((s) => ({ id: s.id, words: [...s.children.map((c) => c.name), ...s.options.flatMap((o) => [o.name, ...(o.aliases ?? [])])] }));
  const arguments_ = states.flatMap((s) => (s.command.arguments ?? []).map((a, i) => ({ key: `${s.id}:${i}`, values: a.values ?? [], variadic: a.variadic })));
  if (shell === "fish") {
    return [
      `# Completion for ${root.name}`, `function ${name}`,
      "  set -l tokens (commandline -opc)", "  set -l current (commandline -ct)",
      "  set -l state 0", "  set -l position 0", "  set -l pending ''", "  set -l ended 0",
      "  for token in $tokens[2..-1]",
      "    if test -n \"$pending\"", "      set pending ''", "      continue", "    end",
      "    if test $ended = 0", "      if test \"$token\" = --", "        set ended 1", "        continue", "      end",
      "      switch \"$state:$token\"",
      ...options.filter((o) => o.option.argument).map((o) => `        case ${quote(`${o.state}:${o.name}`)}\n          set pending ${quote(`${o.state}:${o.name}`)}\n          continue`),
      "      end", "      if string match -q -- '-*' $token", "        continue", "      end",
      "      switch \"$state:$token\"",
      ...transitions.map((t) => `        case ${quote(t.key)}\n          set state ${t.id}\n          set position 0\n          continue`),
      "      end", "    end", "    set position (math $position + 1)", "  end",
      "  set -l prefix ''",
      "  if test $ended = 0; and string match -q -- '--*=*' $current",
      "    set -l parts (string split -m 1 = -- $current)", "    set pending \"$state:$parts[1]\"", "    set prefix \"$parts[1]=\"", "  end",
      "  if test -n \"$pending\"", "    switch $pending",
      ...options.filter((o) => o.option.argument).map((o) => `      case ${quote(`${o.state}:${o.name}`)}\n${(o.option.argument?.values ?? []).map((v) => `        printf '%s%s\\n' \"$prefix\" ${quote(v)}`).join("\n")}`),
      "    end", "    return", "  end",
      "  if test $ended = 0", "    switch $state",
      ...suggestions.map((s) => `      case ${s.id}\n        printf '%s\\n' ${s.words.map(quote).join(" ")}`),
      "    end", "  end", "  switch \"$state:$position\"",
      ...arguments_.filter((a) => a.values.length).map((a) => `    case ${quote(a.key)}\n      printf '%s\\n' ${a.values.map(quote).join(" ")}`),
      "  end", "end", `complete -c ${quote(root.name)} -f -a '(${name})'`, "",
    ].join("\n");
  }
  return [
    `# Completion for ${root.name}`,
    ...(shell === "zsh" ? ["if (( ! $+functions[compdef] )); then", "  autoload -Uz compinit", "  compinit -D", "fi"] : []),
    `${name}() {`, ...(shell === "zsh" ? ["  setopt localoptions ksharrays", '  local -a COMP_WORDS=("${words[@]}") COMPREPLY', "  local COMP_CWORD=$((CURRENT - 1))"] : []), "  local state=0 position=0 pending='' ended=0 token current prefix='' candidates='' i",
    '  current="${COMP_WORDS[COMP_CWORD]}"', "  COMPREPLY=()",
    "  for ((i=1; i<COMP_CWORD; i++)); do", '    token="${COMP_WORDS[i]}"',
    '    if [[ -n "$pending" ]]; then pending=\'\'; continue; fi',
    '    if [[ "$ended" = 0 ]]; then', '      if [[ "$token" = -- ]]; then ended=1; continue; fi',
    '      case "$state:$token" in',
    ...options.filter((o) => o.option.argument).map((o) => `        ${quote(`${o.state}:${o.name}`)}) pending=${quote(`${o.state}:${o.name}`)}; continue ;;`),
    "      esac", '      [[ "$token" = -* ]] && continue', '      case "$state:$token" in',
    ...transitions.map((t) => `        ${quote(t.key)}) state=${t.id}; position=0; continue ;;`),
    "      esac", "    fi", "    ((position+=1))", "  done",
    '  if [[ "$ended" = 0 && "$current" = --*=* ]]; then',
    '    prefix="${current%%=*}="; pending="$state:${current%%=*}"; current="${current#*=}"', "  fi",
    '  if [[ -n "$pending" ]]; then', '    case "$pending" in',
    ...options.filter((o) => o.option.argument).map((o) => `      ${quote(`${o.state}:${o.name}`)}) candidates=${quote((o.option.argument?.values ?? []).join(" "))} ;;`),
    "    esac", "  else", '    if [[ "$ended" = 0 ]]; then', '      case "$state" in',
    ...suggestions.map((s) => `        ${s.id}) candidates=${quote(s.words.join(" "))} ;;`),
    "      esac", "    fi", '    case "$state:$position" in',
    ...arguments_.filter((a) => a.values.length).map((a) => `      ${quote(a.key)}) candidates="$candidates "${quote(a.values.join(" "))} ;;`),
    "    esac", "  fi",
    ...(shell === "zsh" ? [
      '  for token in ${(s: :)candidates}; do [[ "$token" = "$current"* ]] && COMPREPLY+=("$prefix$token"); done',
      '  compadd -Q -a COMPREPLY',
    ] : [
      '  while IFS= read -r token; do [[ "$token" = "$current"* ]] && COMPREPLY+=("$prefix$token"); done < <(compgen -W "$candidates" -- "$current")',
    ]),
    "}", shell === "zsh" ? `compdef ${name} ${quote(root.name)}` : `complete -F ${name} ${quote(root.name)}`, "",
  ].join("\n");
}
