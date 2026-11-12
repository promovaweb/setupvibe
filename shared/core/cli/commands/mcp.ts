/**
 * `mcp` command: starts the Model Context Protocol server over stdio.
 *
 * The process then speaks JSON-RPC on stdin/stdout, so nothing else may be
 * written to stdout. Diagnostics go to stderr. The command only returns when
 * the client closes the transport.
 */
import { manifest } from "../../app/manifest.ts";
import { ExitCode } from "../../app/exit-codes.ts";
import type { Command } from "../registry.ts";

export const mcpCommand: Command = {
  name: "mcp",
  description: "Start the MCP server (stdio) with tools, resources and prompts for agents.",
  longDescription:
    `Configure in the MCP client: { "command": "${manifest.bin}", "args": ["mcp"] }.\n` +
    `Run "${manifest.bin} mcp --list" to see the registered tools, resources and prompts.\n` +
    `No tool returns the value of a credential.`,
  options: [{ name: "--list", description: "Instead of starting the server, list registered tools, resources and prompts and exit." }],
  exitCodes: [ExitCode.MCP],
  examples: [`${manifest.bin} mcp`, `${manifest.bin} mcp --list --json`],
  run: async (ctx) => {
    const { describeServer, startStdioServer } = await import("../../mcp/server.ts");
    if (ctx.options.list === true) {
      const d = describeServer();
      return {
        data: d,
        text: () =>
          [
            `MCP server ${d.name} v${d.version}`,
            "",
            "Tools:",
            ...d.tools.map((t) => `  ${t.name}  ${t.description}`),
            "",
            "Resources:",
            ...d.resources.map((r) => `  ${r.uri}  ${r.description}`),
            "",
            "Prompts:",
            ...d.prompts.map((p) => `  ${p.name}  ${p.description}`),
          ].join("\n"),
      };
    }
    await startStdioServer();
    return { data: { closed: true }, text: "" };
  },
};
