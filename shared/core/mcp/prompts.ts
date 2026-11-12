/**
 * Prompts: conversation templates that help the agent operate the binary.
 * The skeleton ships a single guidance prompt; derived projects add
 * domain-specific ones.
 */
import { z } from "zod";
import { manifest } from "../app/manifest.ts";
import type { Registrar } from "./server.ts";

export function registerPrompts({ server, catalog }: Registrar): void {
  catalog.prompts.push({ name: "operate", description: "Guides the agent to read the documentation and run a task through the CLI." });
  server.registerPrompt(
    "operate",
    {
      title: `Operate ${manifest.title}`,
      description: "Builds an instruction for the agent to read the embedded documentation and complete a task using the CLI with --json.",
      argsSchema: { task: z.string().describe("What the user wants to do with the binary.") },
    },
    ({ task }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text:
              `You will operate the "${manifest.bin}" binary (v${manifest.version}). ` +
              `First call the "skill" tool with topic "cli" to learn the commands, options and exit codes. ` +
              `Then run the needed commands always with the --json option and handle the exit code: 0 is success, ` +
              `2 is usage error, 3 configuration, 4 credentials. Never ask the user for a credential value in chat; ` +
              `tell them to run "${manifest.bin} credentials set <name>" in their own terminal.\n\nTask: ${task}`,
          },
        },
      ],
    }),
  );
}
