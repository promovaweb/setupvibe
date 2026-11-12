/**
 * `tui` command: opens the terminal interface explicitly.
 * Without arguments the binary already opens the TUI; this command exists
 * for scripts and to allow `--tab` regardless of the configuration.
 */
import { manifest } from "../../app/manifest.ts";
import { ExitCode } from "../../app/exit-codes.ts";
import { error } from "../../app/errors.ts";
import type { Command } from "../registry.ts";

export const tuiCommand: Command = {
  name: "tui",
  description: "Open the terminal interface (Overview and About). Requires a TTY.",
  options: [
    {
      name: "--tab",
      argument: { name: "tab", values: ["overview", "about"] },
      description: "Initial tab. Overrides tui.initialTab from settings.json.",
    },
  ],
  exitCodes: [ExitCode.NO_TTY],
  interactive: true,
  examples: [`${manifest.bin}`, `${manifest.bin} tui --tab about`],
  run: async (ctx) => {
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      throw error.noTty(`The TUI needs an interactive terminal. Use "${manifest.bin} --help" for the commands.`);
    }
    const { startTui } = await import("../../tui/index.ts");
    const tab = typeof ctx.options.tab === "string" ? ctx.options.tab : undefined;
    await startTui({ initialTab: tab });
    return { data: { closed: true }, text: "" };
  },
};
