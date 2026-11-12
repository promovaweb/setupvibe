/**
 * Configuration tools: reading settings.json and the vault status.
 * None of them writes or reveals secrets. Configuration writes stay in the
 * CLI, where a human confirms them.
 */
import { z } from "zod";
import { vaultStatus } from "../../config/credentials.ts";
import { SETTINGS_SCHEMA, flatten, readSettings, getPath } from "../../config/settings.ts";
import { paths } from "../../config/paths.ts";
import type { Registrar } from "../server.ts";

export function registerConfigTools({ server, catalog }: Registrar): void {
  catalog.tools.push({ name: "config_list", description: "Every settings.json key with its effective value." });
  server.registerTool(
    "config_list",
    {
      title: "List configuration",
      description: "Lists the settings.json keys (merged with defaults) and the known schema.",
      inputSchema: {},
    },
    async () => {
      const d = {
        file: paths.settings(),
        values: Object.fromEntries(flatten(readSettings())),
        schema: SETTINGS_SCHEMA.map((x) => ({ ...x })),
      };
      return { content: [{ type: "text", text: JSON.stringify(d, null, 2) }], structuredContent: d };
    },
  );

  catalog.tools.push({ name: "config_get", description: "Value of a settings.json key." });
  server.registerTool(
    "config_get",
    {
      title: "Read a configuration key",
      description: "Returns the value of a key in dot notation, e.g. output.format.",
      inputSchema: { key: z.string().min(1).describe("Key in dot notation.") },
    },
    async ({ key }) => {
      const value = getPath(readSettings(), key);
      const d = { key, value: value ?? null, exists: value !== undefined };
      return {
        content: [{ type: "text", text: JSON.stringify(d, null, 2) }],
        structuredContent: d,
        isError: value === undefined,
      };
    },
  );

  catalog.tools.push({ name: "credentials_status", description: "Saved names and master key source, without values." });
  server.registerTool(
    "credentials_status",
    {
      title: "Credentials vault status",
      description: "Reports file, master key source, count and names of credentials. Never returns values.",
      inputSchema: {},
    },
    async () => {
      const d = vaultStatus();
      return { content: [{ type: "text", text: JSON.stringify(d, null, 2) }], structuredContent: d };
    },
  );
}
