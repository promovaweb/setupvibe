/**
 * TUI screen registry, in tab order: Home, Inventory, User, Doctor, Logs and
 * About. The number keys follow this order. The SetupVibe screens live in
 * `shared/tui/screens.ts`; About comes from the core, with its title in the
 * TUI language.
 */
import { aboutScreen } from "./about.ts";
import { doctorScreen, homeScreen, inventoryScreen, logsScreen, userScreen } from "../../../tui/screens.ts";
import { tr } from "../../../tui/i18n.ts";
import type { Screen } from "../screen.ts";

/** About with its title read at mount time, in the TUI language. */
const about: Screen = Object.defineProperty({ ...aboutScreen }, "title", { get: () => tr("tab.about"), enumerable: true });

export const screens: readonly Screen[] = [homeScreen, inventoryScreen, userScreen, doctorScreen, logsScreen, about];
