/**
 * `docs` command: explicit form of `--skill`. SetupVibe keeps the `skill`
 * name for the Vercel skills CLI wrapper (spec section 8).
 * Exists so that `<bin> docs mcp` and `<bin> --skill mcp` are equivalent and
 * so the documentation appears in the OpenCLI tree as a command.
 */
import { manifest } from "../../app/manifest.ts";
import { SKILL_TOPICS, skillText } from "../../skill/index.ts";
import type { Command } from "../registry.ts";

/** Factory: receives the root to generate the command reference. */
export function createSkillCommand(getRoot: () => Command): Command {
  return {
    name: "docs",
    description: "Print the embedded documentation, whole or by topic. Same effect as --skill.",
    arguments: [{ name: "topic", description: "Desired section. Without it, prints everything.", values: SKILL_TOPICS }],
    options: [{ name: "--lang", argument: { name: "language", values: ["pt-BR", "en"] }, description: "Documentation language; follows SETUPVIBE_LANG, then LANG." }],
    examples: [`${manifest.bin} docs`, `${manifest.bin} docs mcp`, `${manifest.bin} --skill cli`],
    run: (ctx) => {
      const topic = ctx.args[0];
      const lang = ctx.options.lang === "en" || ctx.options.lang === "pt-BR" ? ctx.options.lang : undefined;
      const text = skillText(getRoot(), topic, lang);
      return { data: { topic: topic ?? "all", markdown: text }, text };
    },
  };
}
