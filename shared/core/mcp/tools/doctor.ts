/** Exposes read-only environment diagnostics through MCP. */
import { collectDoctorChecks } from "../../cli/commands/doctor.ts";
import type { Registrar } from "../server.ts";

/** Registers diagnostics using the same collector as the CLI. */
export function registerDoctorTools({ server, catalog }: Registrar): void {
  const description = "Diagnose runtime, terminal and configuration health. Returns checks and ok without credential values or file changes.";
  catalog.tools.push({ name: "doctor", description });
  server.registerTool("doctor", {
    title: "Environment diagnostics", description, inputSchema: {},
    annotations: { readOnlyHint: true },
  }, async () => {
    const data = collectDoctorChecks();
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: data, isError: !data.ok };
  });
}
