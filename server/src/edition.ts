/**
 * Identity of the server edition (`setupvibe-server`).
 *
 * Imported first by `server/src/main.ts`, before any core module, so the
 * core reads this binary's name, documentation and inventory.
 */
import { registerEdition } from "../../shared/core/app/edition.ts";
import overview from "../docs/README.md" with { type: "text" };
import cli from "../docs/cli.md" with { type: "text" };
import tui from "../docs/tui.md" with { type: "text" };
import mcp from "../docs/mcp.md" with { type: "text" };
import config from "../docs/configuration.md" with { type: "text" };
import exitCodes from "../docs/exit-codes.md" with { type: "text" };
import inventory from "../inventory.json" with { type: "json" };

registerEdition({
  id: "server",
  bin: "setupvibe-server",
  title: "SetupVibe Server",
  description: "Sets up and maintains a pinned Docker Swarm server on Ubuntu and Debian.",
  docs: { overview, cli, tui, mcp, config, exitCodes },
  inventory,
});
