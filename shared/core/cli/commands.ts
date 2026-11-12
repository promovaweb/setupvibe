/**
 * Root of the command registry.
 *
 * Imports each command from `commands/` and builds the tree. To add a new
 * command, import it and append it to `subcommands`. The order defines the
 * display order in `--help` and in the OpenCLI description.
 */
import { manifest } from "../app/manifest.ts";
import { aboutCommand } from "./commands/about.ts";
import { configCommand } from "./commands/config.ts";
import { credentialsCommand } from "./commands/credentials.ts";
import { mcpCommand } from "./commands/mcp.ts";
import { createSkillCommand } from "./commands/skill.ts";
import { tuiCommand } from "./commands/tui.ts";
import { doctorCommand, skillCommand, upgradeCommand, reportCommand, selfCommand, sshCommand } from "../../commands/maintenance.ts";
import { createCompletionCommand } from "./commands/completion.ts";
import { systemCommand } from "../../commands/system.ts";
import { initCommand } from "../../commands/init.ts";
import { userCommand } from "../../commands/user.ts";
import { securityCommand } from "../../commands/security.ts";
import { autoCommand } from "../../commands/auto.ts";
import { checkCommand } from "../../commands/check.ts";
import { inventoryCommands } from "../../commands/inventory.ts";
import { shellCommand } from "../../commands/shell.ts";
import { swarmCommand } from "../../commands/swarm.ts";
import type { Command } from "./registry.ts";

export const root: Command = {
  name: manifest.bin,
  description: manifest.description,
  subcommands: [tuiCommand, systemCommand, initCommand, autoCommand, ...inventoryCommands, checkCommand, shellCommand, upgradeCommand, skillCommand, reportCommand, selfCommand, sshCommand, userCommand, securityCommand, ...(manifest.edition === "server" ? [swarmCommand] : []), aboutCommand, configCommand, credentialsCommand, mcpCommand, createSkillCommand(() => root), doctorCommand, createCompletionCommand(() => root)],
  examples: [
    `${manifest.bin}`,
    `${manifest.bin} system`,
    `${manifest.bin} init --dry-run`,
    `${manifest.bin} about --json`,
    `${manifest.bin} config set output.format json`,
    `${manifest.bin} credentials set openai.api_key`,
    `${manifest.bin} mcp`,
    `${manifest.bin} --skill`,
  ],
};
