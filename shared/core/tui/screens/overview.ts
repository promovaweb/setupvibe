/**
 * Overview tab: the environment at a glance.
 *
 * Shows runtime, data directory, settings.json and vault state, and the
 * first suggested actions. It is the default initial tab and the natural
 * place for derived projects to show their own indicators.
 */
import { BoxRenderable } from "@opentui/core";
import { manifest } from "../../app/manifest.ts";
import { paths, exists } from "../../config/paths.ts";
import { vaultStatus } from "../../config/credentials.ts";
import { flatten, readSettings } from "../../config/settings.ts";
import { spacer, list, panel, dim, keyValueTable, heading } from "../components.ts";
import { glyphs } from "../theme.ts";
import type { Screen } from "../screen.ts";

export const overviewScreen: Screen = {
  id: "overview",
  title: "Overview",
  description: "Environment, configuration and vault at a glance",
  mount: ({ renderer, theme }) => {
    const rootBox = new BoxRenderable(renderer, { flexDirection: "column", flexGrow: 1 });

    const topRow = new BoxRenderable(renderer, { flexDirection: "row", flexShrink: 0 });

    const environment = panel(renderer, theme, { title: "Environment", flexGrow: 1, active: true });
    environment.add(
      keyValueTable(renderer, theme, [
        ["Binary", `${manifest.bin} v${manifest.version}`, theme.textStrong],
        ["Runtime", `Bun ${Bun.version}`],
        ["Platform", `${process.platform}-${process.arch}`],
        ["Terminal", `${renderer.width}×${renderer.height}  ${process.env.TERM ?? ""}`],
        ["Data", paths.base()],
      ]),
    );
    topRow.add(environment);

    const vault = vaultStatus();
    const hasSettings = exists(paths.settings());
    const state = panel(renderer, theme, { title: "State", width: 46 });
    state.add(
      keyValueTable(renderer, theme, [
        ["settings.json", hasSettings ? `${glyphs.ok} saved` : `${glyphs.bullet} defaults`, hasSettings ? theme.ok : theme.textDim],
        ["credentials.json", vault.exists ? `${glyphs.ok} ${vault.count} credential(s)` : `${glyphs.bullet} empty`, vault.exists ? theme.ok : theme.textDim],
        ["master key", vault.masterKeySource === "none" ? "not created" : vault.masterKeySource, vault.masterKeySource === "env" ? theme.accentSecondary : theme.text],
        ["MCP", `${manifest.bin} mcp`, theme.text],
      ]),
    );
    topRow.add(state);
    rootBox.add(topRow);

    const bottomRow = new BoxRenderable(renderer, { flexDirection: "row", flexGrow: 1 });

    const config = panel(renderer, theme, { title: "Settings in effect", flexGrow: 1 });
    let pairs: Array<[string, string]>;
    try {
      pairs = flatten(readSettings()).map(([k, v]) => [k, JSON.stringify(v)]);
    } catch (e) {
      pairs = [["error", e instanceof Error ? e.message : String(e)]];
    }
    config.add(keyValueTable(renderer, theme, pairs.map(([k, v]) => [k, v, theme.text])));
    bottomRow.add(config);

    const actions = panel(renderer, theme, { title: "Next steps", width: 46 });
    actions.add(heading(renderer, theme, "In the terminal"));
    actions.add(
      list(renderer, theme, [
        `${manifest.bin} --help`,
        `${manifest.bin} credentials set <name>`,
        `${manifest.bin} config set tui.theme day`,
        `${manifest.bin} --skill`,
      ], glyphs.arrow),
    );
    actions.add(spacer(renderer));
    actions.add(heading(renderer, theme, "For agents"));
    actions.add(dim(renderer, theme, `MCP client: { "command": "${manifest.bin}", "args": ["mcp"] }`));
    bottomRow.add(actions);
    rootBox.add(bottomRow);

    return rootBox;
  },
};
