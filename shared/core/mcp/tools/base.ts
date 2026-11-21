/**
 * Base tools: binary identity, exit codes and documentation.
 * Every derived project keeps these, because they let an agent discover what
 * the binary does without leaving the protocol.
 */
import { z } from "zod";
import { aboutData } from "../../cli/commands/about.ts";
import { root } from "../../cli/commands.ts";
import { exitCodeDescriptions } from "../../app/exit-codes.ts";
import { SKILL_TOPICS, skillText } from "../../skill/index.ts";
import { withEdition } from "../../app/edition.ts";
import { editionInput, mcpEdition } from "../../../mcp/tools.ts";
import type { Registrar } from "../server.ts";

export function registerBaseTools({ server, catalog, defaultEdition }: Registrar): void {
  catalog.tools.push({ name: "about", description: "Version, executable, runtime, platform and credits of the binary." });
  server.registerTool(
    "about",
    {
      title: "About the binary",
      description: "Returns version, executable path, runtime, platform, data directory and credits.",
      inputSchema: { edition: editionInput },
    },
    async ({ edition }) => {
      const d = withEdition(mcpEdition(edition, defaultEdition), aboutData);
      return { content: [{ type: "text", text: JSON.stringify(d, null, 2) }], structuredContent: d };
    },
  );

  catalog.tools.push({ name: "exit_codes", description: "Process exit-code table." });
  server.registerTool(
    "exit_codes",
    {
      title: "Exit codes",
      description: "Lists the CLI exit codes with symbolic name and description. 0 is success.",
      inputSchema: { edition: editionInput },
    },
    async () => {
      const d = { codes: exitCodeDescriptions.map((x) => ({ ...x })) };
      return { content: [{ type: "text", text: JSON.stringify(d, null, 2) }], structuredContent: d };
    },
  );

  catalog.tools.push({ name: "skill", description: "Embedded documentation, whole or by topic." });
  server.registerTool(
    "skill",
    {
      title: "Embedded documentation",
      description:
        "Returns the binary documentation in Markdown. Without a topic, returns everything. " +
        `Topics: ${SKILL_TOPICS.join(", ")}. Read "cli" before suggesting commands to the user.`,
      inputSchema: { edition: editionInput, topic: z.enum(SKILL_TOPICS).optional().describe("Desired section. Omit for everything.") },
    },
    async ({ edition, topic }) => ({ content: [{ type: "text", text: withEdition(mcpEdition(edition, defaultEdition), () => skillText(root, topic)) }] }),
  );
}
