/**
 * Schemas of the state files in ~/.setupvibe (spec section 4).
 *
 * The zod definitions are the source: `bun scripts/state-schemas.ts --write`
 * publishes them as JSON Schema in shared/schemas/, for editors, Ansible
 * templates and other tools that write these files. Unknown keys are kept,
 * so an older binary does not reject a file written by a newer one.
 */
import { z } from "zod";
import { rawUrl } from "../repo.ts";

const system = z.enum(["ubuntu", "debian", "mint", "zorin", "arch", "omarchy", "macos", "windows", "wsl"]);

export const configSchema = z
  .object({
    schemaVersion: z.number().int().min(1).optional(),
    edition: z.enum(["desktop", "server"]).optional().describe("Edition that ran init on this machine."),
    system: system.optional(),
    user: z.string().optional().describe("Working user."),
    channel: z.enum(["stable", "beta"]).optional().describe("Release channel read by upgrade and the update notice."),
    init: z
      .object({ done: z.boolean(), at: z.string(), version: z.string(), system, prerequisites: z.array(z.string()) })
      .optional(),
    git: z.object({ name: z.string().optional(), email: z.string().optional() }).optional(),
    shell: z.object({ agentAliases: z.boolean().optional().describe("Legacy place of the agent aliases switch; settings.json shell.agentAliases is read first.") }).loose().optional(),
    network: z
      .object({ caFile: z.string().optional().describe("Extra CA bundle."), cacheDir: z.string().optional().describe("Shared download cache.") })
      .optional(),
  })
  .loose()
  .describe("~/.setupvibe/config.json");

export const selectionSchema = z
  .object({
    schemaVersion: z.number().int().min(1).optional(),
    profile: z.string().nullable().optional(),
    items: z.array(z.object({ id: z.string(), version: z.string(), status: z.enum(["ok", "fail"]).optional(), adopted: z.boolean().optional().describe("Found on the machine by init; remove needs --force.") })).optional(),
  })
  .loose()
  .describe("~/.setupvibe/selection.json: inventory items installed by SetupVibe");

export const externalSchema = z
  .object({
    schemaVersion: z.number().int().min(1).optional(),
    apps: z.array(z.object({ tool: z.string(), version: z.string(), installedAt: z.string() })).optional(),
  })
  .loose()
  .describe("~/.setupvibe/external.json: mise tools installed with install --external");

export const STATE_SCHEMAS = { "config.json": configSchema, "selection.json": selectionSchema, "external.json": externalSchema } as const;

/** JSON Schema of one state file. */
export function jsonSchemaFor(file: keyof typeof STATE_SCHEMAS): Record<string, unknown> {
  return { $id: rawUrl(`shared/schemas/${file.replace(".json", "")}.schema.json`), ...z.toJSONSchema(STATE_SCHEMAS[file]) };
}

/** Problems of a parsed state file, as "path: message" lines; empty when valid. */
export function stateProblems(file: keyof typeof STATE_SCHEMAS, data: unknown): string[] {
  const r = STATE_SCHEMAS[file].safeParse(data);
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
}
