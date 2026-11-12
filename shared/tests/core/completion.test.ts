import "../../../desktop/src/edition.ts";
/** Exercises pure shell generation and contextual Bash completion behavior. */
import { expect, test } from "bun:test";
import { generateCompletion, COMPLETION_SHELLS } from "../../core/cli/completion.ts";
import type { Command } from "../../core/cli/registry.ts";

const root: Command = { name: "demo", description: "Demo", subcommands: [
  { name: "config", description: "Config", subcommands: [{ name: "get", description: "Get", arguments: [{ name: "key", description: "Key", values: ["theme", "format"] }], options: [{ name: "--mode", description: "Mode", argument: { name: "mode", values: ["fast", "slow"] } }] }] },
  { name: "hidden", description: "Hidden", hidden: true },
] };

test("all scripts include nested commands, globals and enum values without hidden commands", () => {
  for (const shell of COMPLETION_SHELLS) {
    const script = generateCompletion(root, shell);
    expect(script).toContain("config"); expect(script).toContain("get");
    expect(script).toContain("--json"); expect(script).toContain("--mode");
    expect(script).toContain("fast"); expect(script).toContain("theme");
    expect(script).not.toContain("hidden");
    expect(script).toBe(generateCompletion(root, shell));
  }
});

function complete(words: string[]): string[] {
  const escaped = words.map((w) => `'${w.replaceAll("'", "'\\''")}'`).join(" ");
  const result = Bun.spawnSync(["bash", "-c", `${generateCompletion(root, "bash")}\nCOMP_WORDS=(${escaped}); COMP_CWORD=${words.length - 1}; _complete_demo; printf '%s\\n' "\${COMPREPLY[@]}"`]);
  expect(result.exitCode).toBe(0);
  return result.stdout.toString().trim().split("\n").filter(Boolean);
}
test("completion follows command depth and option or argument enums", () => {
  expect(complete(["demo", "config", ""])).toContain("get");
  expect(complete(["demo", "config", ""])).not.toContain("--mode");
  expect(complete(["demo", "config", "get", "--mode", "f"])).toEqual(["fast"]);
  expect(complete(["demo", "--json", "config", "get", "t"])).toEqual(["theme"]);
  expect(complete(["demo", "config", "get", "--mode=sl"])).toEqual(["--mode=slow"]);
  expect(complete(["demo", "config", "get", "--", "t"])).toEqual(["theme"]);
});

for (const shell of COMPLETION_SHELLS) {
  test.skipIf(!Bun.which(shell))(`${shell} accepts the generated script syntax`, () => {
    const result = Bun.spawnSync([shell, "-n"], { stdin: Buffer.from(generateCompletion(root, shell)) });
    expect(result.stderr.toString()).toBe("");
    expect(result.exitCode).toBe(0);
  });
}

test.skipIf(!Bun.which("zsh"))("native Zsh installs and produces option enums without bashcompinit", () => {
  const script = generateCompletion(root, "zsh");
  expect(script).not.toContain("bashcompinit");
  const result = Bun.spawnSync(["zsh", "-c", `${script}
    [[ $_comps[demo] = _complete_demo ]] || exit 1
    compadd() { print -rl -- "\${COMPREPLY[@]}"; }
    words=(demo config get --mode f); CURRENT=5
    _complete_demo
  `]);
  expect(result.stderr.toString()).toBe("");
  expect(result.exitCode).toBe(0);
  expect(result.stdout.toString().trim()).toBe("fast");
});
