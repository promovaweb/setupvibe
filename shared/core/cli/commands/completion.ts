/** Shell completion command backed by the declarative registry. */
import { EDITIONS, withEdition } from "../../app/edition.ts";
import { manifest } from "../../app/manifest.ts";
import { COMPLETION_SHELLS, generateCompletion, type CompletionShell } from "../completion.ts";
import type { Command } from "../registry.ts";

/** Defers reading the root until execution to avoid registry initialization cycles. */
export function createCompletionCommand(getRoot: () => Command): Command {
  return {
    name: "completion",
    description: "Print a registry-generated completion script for bash, zsh or fish.",
    longDescription: `Install for the current session:\nBash: eval "$('${manifest.bin}' completion bash)"\nZsh: eval "$('${manifest.bin}' completion zsh)"\nFish: ${manifest.bin} completion fish | source\nAdd the matching line to your shell startup file for future sessions.`,
    arguments: [{ name: "shell", required: true, values: COMPLETION_SHELLS, description: "Shell to generate completion for: bash, zsh, fish or powershell." }],
    run: ({ args }) => {
      const shell = args[0] as CompletionShell;
      const root = getRoot();
      const editions = EDITIONS.map((id) => withEdition(id, () => ({
        name: id,
        description: manifest.description,
        subcommands: root.subcommands,
      })));
      const script = generateCompletion({ ...root, subcommands: [...(root.subcommands ?? []), ...editions] }, shell);
      return { data: { shell, script }, text: script };
    },
  };
}
