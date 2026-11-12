/**
 * TUI screen registry, in tab order.
 * To add a tab: create `screens/<id>.ts` and append it here.
 */
import { aboutScreen } from "./about.ts";
import { overviewScreen } from "./overview.ts";
import type { Screen } from "../screen.ts";

export const screens: readonly Screen[] = [overviewScreen, aboutScreen];
