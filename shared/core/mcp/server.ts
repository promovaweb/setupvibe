/**
 * Embedded MCP server.
 *
 * Builds an `McpServer` with the tools, resources and prompts from `tools/`,
 * `resources/` and `prompts.ts`, and connects it to the stdio transport. The
 * same assembly feeds `mcp --list`, which describes what is registered
 * without opening the transport. To add a tool, create `tools/<name>.ts`
 * following the stub in `template/tool/` and register it in `registerAll`.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { manifest } from "../app/manifest.ts";
import { error } from "../app/errors.ts";
import { registerBaseTools } from "./tools/base.ts";
import { registerConfigTools } from "./tools/config.ts";
import { registerResources } from "./resources/base.ts";
import { registerPrompts } from "./prompts.ts";
import { registerSetupVibeTools } from "../../mcp/tools.ts";

/** Metadata collected during registration, for `mcp --list`. */
export interface Catalog {
  name: string;
  version: string;
  tools: Array<{ name: string; description: string }>;
  resources: Array<{ uri: string; name: string; description: string }>;
  prompts: Array<{ name: string; description: string }>;
}

/** Registrar that accumulates metadata while registering on the server. */
export interface Registrar {
  server: McpServer;
  catalog: Catalog;
}

function createServer(): Registrar {
  const server = new McpServer(
    { name: manifest.bin, version: manifest.version },
    {
      instructions:
        `${manifest.title}: ${manifest.description} ` +
        `Use the "skill" tool or the ${manifest.bin}://skill/cli resource to read the full documentation before calling other tools. ` +
        `No tool returns credential values.`,
    },
  );
  const catalog: Catalog = { name: manifest.bin, version: manifest.version, tools: [], resources: [], prompts: [] };
  const registrar: Registrar = { server, catalog };
  registerAll(registrar);
  return registrar;
}

function registerAll(r: Registrar): void {
  registerBaseTools(r);
  registerConfigTools(r);
  registerSetupVibeTools(r);
  registerResources(r);
  registerPrompts(r);
}

/** Describes the server without opening a transport. */
export function describeServer(): Catalog {
  return createServer().catalog;
}

/** Starts the server on stdio and waits for the transport to close. */
export async function startStdioServer(): Promise<void> {
  const { server } = createServer();
  const transport = new StdioServerTransport();
  try {
    await server.connect(transport);
  } catch (e) {
    throw error.mcp(`Failed to start the MCP server: ${e instanceof Error ? e.message : String(e)}`);
  }
  process.stderr.write(`${manifest.bin} mcp: stdio server running (pid ${process.pid})\n`);
  await new Promise<void>((resolve) => {
    transport.onclose = () => resolve();
    process.stdin.on("end", () => resolve());
  });
}
