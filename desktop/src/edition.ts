/**
 * Identity of the desktop edition (`setupvibe`).
 *
 * Imported first by `desktop/src/main.ts`, before any core module, so the
 * core reads this binary's name, documentation and inventory.
 */
import { registerEdition } from "../../shared/core/app/edition.ts";
import overview from "../docs/README.md" with { type: "text" };
import cli from "../docs/cli.md" with { type: "text" };
import tui from "../docs/tui.md" with { type: "text" };
import mcp from "../docs/mcp.md" with { type: "text" };
import config from "../docs/configuration.md" with { type: "text" };
import exitCodes from "../docs/exit-codes.md" with { type: "text" };
import overviewEn from "../docs/en/README.md" with { type: "text" };
import cliEn from "../docs/en/cli.md" with { type: "text" };
import tuiEn from "../docs/en/tui.md" with { type: "text" };
import mcpEn from "../docs/en/mcp.md" with { type: "text" };
import configEn from "../docs/en/configuration.md" with { type: "text" };
import exitCodesEn from "../docs/en/exit-codes.md" with { type: "text" };
import inventory from "../inventory.json" with { type: "json" };

registerEdition({
  id: "desktop",
  bin: "setupvibe",
  title: "SetupVibe",
  description: "Sets up and maintains a pinned development environment on macOS, Linux and Windows.",
  docs: {
    "pt-BR": { overview, cli, tui, mcp, config, exitCodes },
    en: { overview: overviewEn, cli: cliEn, tui: tuiEn, mcp: mcpEn, config: configEn, exitCodes: exitCodesEn },
  },
  inventory,
});
