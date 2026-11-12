/**
 * Resources: passive reads of identity, exit codes and documentation. URIs
 * use the `<bin>://` scheme to avoid collisions with other servers in the
 * same client.
 */
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { manifest } from "../../app/manifest.ts";
import { exitCodeDescriptions } from "../../app/exit-codes.ts";
import { aboutData } from "../../cli/commands/about.ts";
import { root } from "../../cli/commands.ts";
import { SKILL_TOPICS, skillText } from "../../skill/index.ts";
import type { Registrar } from "../server.ts";

export function registerResources({ server, catalog }: Registrar): void {
  const scheme = manifest.bin;

  catalog.resources.push({ uri: `${scheme}://about`, name: "about", description: "Binary identity and runtime as JSON." });
  server.registerResource(
    "about",
    `${scheme}://about`,
    { title: "About the binary", description: "Identity and runtime as JSON.", mimeType: "application/json" },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(aboutData(), null, 2) }] }),
  );

  catalog.resources.push({ uri: `${scheme}://exit-codes`, name: "exit-codes", description: "Exit-code table as JSON." });
  server.registerResource(
    "exit-codes",
    `${scheme}://exit-codes`,
    { title: "Exit codes", description: "Exit-code table as JSON.", mimeType: "application/json" },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify({ codes: exitCodeDescriptions }, null, 2) }],
    }),
  );

  catalog.resources.push({ uri: `${scheme}://skill`, name: "skill", description: "Full documentation in Markdown." });
  server.registerResource(
    "skill",
    `${scheme}://skill`,
    { title: "Full documentation", description: "All the embedded documentation in Markdown.", mimeType: "text/markdown" },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "text/markdown", text: skillText(root) }] }),
  );

  catalog.resources.push({
    uri: `${scheme}://skill/{topic}`,
    name: "skill-topic",
    description: `One documentation section. Topics: ${SKILL_TOPICS.join(", ")}.`,
  });
  server.registerResource(
    "skill-topic",
    new ResourceTemplate(`${scheme}://skill/{topic}`, {
      list: async () => ({
        resources: SKILL_TOPICS.map((t) => ({
          uri: `${scheme}://skill/${t}`,
          name: `skill-${t}`,
          title: `Documentation: ${t}`,
          mimeType: "text/markdown",
        })),
      }),
    }),
    { title: "Documentation section", description: "One section of the embedded documentation.", mimeType: "text/markdown" },
    async (uri, { topic }) => ({
      contents: [{ uri: uri.href, mimeType: "text/markdown", text: skillText(root, String(topic)) }],
    }),
  );
}
