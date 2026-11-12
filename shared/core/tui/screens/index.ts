/**
 * TUI screen registry.
 *
 * `home` is the bento grid shown at start; `screens` are the modules in the
 * order of their number keys. The SetupVibe screens live in shared/tui/;
 * About comes from the core, with its title in the TUI language.
 */
import { aboutScreen } from "./about.ts";
import { doctorScreen, inventoryScreen, logsScreen, userScreen } from "../../../tui/screens.ts";
import { tailscaleScreen } from "../../../tui/tailscale.ts";
import { machineScreen } from "../../../tui/machine.ts";
import { createHomeScreen } from "../../../tui/home.ts";
import { tr } from "../../../tui/i18n.ts";
import type { Screen } from "../screen.ts";

/** About with its title read at mount time, in the TUI language. */
const about: Screen = Object.defineProperty({ ...aboutScreen }, "title", { get: () => tr("tab.about"), enumerable: true });

export const screens: readonly Screen[] = [inventoryScreen, userScreen, doctorScreen, logsScreen, tailscaleScreen, machineScreen, about];

export const home: Screen = createHomeScreen(() => screens);
