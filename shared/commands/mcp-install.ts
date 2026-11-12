/**
 * `mcp install`: configures the SetupVibe MCP server in the user's agents
 * (spec section 13).
 *
 * - Claude Code: `claude mcp add --scope user`;
 * - Codex: `codex mcp add`;
 * - OpenCode: the `mcp` block of ~/.config/opencode/opencode.json, merged
 *   without touching the rest of the file and backed up first.
 *
 * Agents that are not installed are skipped. Running it again changes
 * nothing.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { manifest } from "../core/app/manifest.ts";
import { ExitCode } from "../core/app/exit-codes.ts";
import type { Command } from "../core/cli/registry.ts";
import type { Step } from "../exec/runner.ts";
import { selfArgv } from "./auto.ts";
import { DRY_RUN_OPTION, executePlan } from "./execute.ts";

export const SERVER_NAME = "setupvibe";

/** Command that starts this binary's MCP server. */
export function serverCommand(self = selfArgv(), bin = manifest.bin): string[] {
  return self.length === 1 ? [self[0]!, "mcp"] : [bin, "mcp"];
}

/** Merges the SetupVibe server into an OpenCode config object. */
export function mergeOpenCodeConfig(config: Record<string, unknown>, command: string[]): Record<string, unknown> {
  const mcp = (config.mcp && typeof config.mcp === "object" ? config.mcp : {}) as Record<string, unknown>;
  return { ...config, mcp: { ...mcp, [SERVER_NAME]: { type: "local", command, enabled: true } } };
}

/**
 * Finds an agent in PATH, ~/.local/bin or the mise shims, where SetupVibe
 * installs them even when the current shell has not loaded the profile.
 */
export function findAgent(name: string, home = homedir(), path = process.env.PATH ?? ""): string | undefined {
  const extra = [join(home, ".local", "bin"), join(home, ".local", "share", "mise", "shims")];
  return Bun.which(name, { PATH: [path, ...extra].filter(Boolean).join(":") }) ?? undefined;
}

/** Steps for the agents found on this machine, run by absolute path. */
export function mcpInstallPlan(found: { claude?: string; codex?: string; opencode?: string }, command: string[], home = homedir()): { steps: Step[]; skipped: string[] } {
  const steps: Step[] = [];
  const skipped: string[] = [];
  if (found.claude) {
    steps.push({
      id: "claude-code",
      description: "Add the SetupVibe MCP server to Claude Code (user scope)",
      skipIf: { argv: [found.claude, "mcp", "get", SERVER_NAME] },
      commands: [{ argv: [found.claude, "mcp", "add", "--scope", "user", SERVER_NAME, "--", ...command] }],
    });
  } else skipped.push("claude-code");
  if (found.codex) {
    steps.push({
      id: "codex",
      description: "Add the SetupVibe MCP server to Codex",
      skipIf: { argv: [found.codex, "mcp", "get", SERVER_NAME] },
      commands: [{ argv: [found.codex, "mcp", "add", SERVER_NAME, "--", ...command] }],
    });
  } else skipped.push("codex");
  if (found.opencode) {
    const file = join(home, ".config", "opencode", "opencode.json");
    steps.push({
      id: "opencode",
      description: `Add the SetupVibe MCP server to ${file}`,
      commands: [],
      actionDescription: `merge mcp.${SERVER_NAME} into ${file} (backup ${file}.setupvibe.bak)`,
      action: async () => {
        let config: Record<string, unknown> = { $schema: "https://opencode.ai/config.json" };
        if (existsSync(file)) {
          config = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
          if (!existsSync(`${file}.setupvibe.bak`)) copyFileSync(file, `${file}.setupvibe.bak`);
        }
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, `${JSON.stringify(mergeOpenCodeConfig(config, command), null, 2)}\n`);
      },
    });
  } else skipped.push("opencode");
  return { steps, skipped };
}

export const mcpInstallCommand: Command = {
  name: "install",
  description: "Configure the SetupVibe MCP server in Claude Code, Codex and OpenCode.",
  options: [DRY_RUN_OPTION],
  exitCodes: [ExitCode.PARTIAL],
  examples: [`${manifest.bin} mcp install`, `${manifest.bin} mcp install --dry-run`],
  run: (ctx) => {
    const found = { claude: findAgent("claude"), codex: findAgent("codex"), opencode: findAgent("opencode") };
    const plan = mcpInstallPlan(found, serverCommand());
    for (const s of plan.skipped) if (!ctx.json) ctx.stderr(`- ${s}: not installed`);
    return executePlan(ctx, "mcp-install", plan.steps, { skipped: plan.skipped });
  },
};
