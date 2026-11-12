/**
 * `skill` command: explicit form of `--skill`.
 * Exists so that `<bin> skill mcp` and `<bin> --skill mcp` are equivalent and
 * so the documentation appears in the OpenCLI tree as a command.
 */
import { manifest } from "../../app/manifest.ts";
import { SKILL_TOPICS, skillText } from "../../skill/index.ts";
import type { Command } from "../registry.ts";

/** Factory: receives the root to generate the command reference. */
export function createSkillCommand(getRoot: () => Command): Command {
  return {
    name: "skill",
    description: "Print the embedded documentation, whole or by topic. Same effect as --skill.",
    arguments: [{ name: "topic", description: "Desired section. Without it, prints everything.", values: SKILL_TOPICS }],
    examples: [`${manifest.bin} skill`, `${manifest.bin} skill mcp`, `${manifest.bin} --skill cli`],
    run: (ctx) => {
      const topic = ctx.args[0];
      const text = skillText(getRoot(), topic);
      return { data: { topic: topic ?? "all", markdown: text }, text };
    },
  };
}
