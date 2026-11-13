/**
 * About tab: binary identity, version, paths and credits.
 * Uses the same data as the `about` command, so the two surfaces never tell
 * different stories.
 */
import { BoxRenderable, TextRenderable, fg, t } from "@opentui/core";
import { aboutData } from "../../cli/commands/about.ts";
import { spacer, list, panel, dim, keyValueTable, heading } from "../components.ts";
import type { Screen } from "../screen.ts";
import { icon } from "../../../tui/icons.ts";
import { tr } from "../../../tui/i18n.ts";

export const aboutScreen: Screen = {
  id: "about",
  title: "About",
  description: "Binary, version, license and credits",
  mount: ({ renderer, theme }) => {
    const d = aboutData();
    const rootBox = new BoxRenderable(renderer, { flexDirection: "column", flexGrow: 1, gap: 1, paddingTop: 1 });

    const top = new BoxRenderable(renderer, { flexDirection: "row", flexShrink: 0, gap: 2 });

    const binary = panel(renderer, theme, { title: `${icon("binary")}  ${tr("about.binary")}`, flexGrow: 3, flexBasis: 0, active: true });
    binary.add(spacer(renderer));
    binary.add(new TextRenderable(renderer, { content: `${d.title}  v${d.version}`, fg: theme.accent }));
    binary.add(dim(renderer, theme, tr("about.description")));
    binary.add(spacer(renderer));
    binary.add(
      keyValueTable(renderer, theme, [
        [tr("about.executable"), d.executable],
        [tr("about.runtime"), d.runtime],
        [tr("about.platform"), d.platform],
        [tr("about.system"), d.system],
        ["PID", String(d.pid)],
        [tr("about.data"), d.dataDir],
      ]),
    );
    top.add(binary);

    const project = panel(renderer, theme, { title: `${icon("project")}  ${tr("about.project")}`, flexGrow: 2, flexBasis: 0 });
    project.add(spacer(renderer));
    project.add(
      keyValueTable(renderer, theme, [
        [tr("about.author"), d.author || "-", theme.textStrong],
        [tr("about.license"), d.license],
        [tr("about.site"), d.site || "-", theme.accentSecondary],
        [tr("about.repository"), d.repository || "-", theme.accentSecondary],
      ]),
    );
    top.add(project);
    rootBox.add(top);

    const bottom = new BoxRenderable(renderer, { flexDirection: "row", flexGrow: 1, gap: 2 });

    const creditsPanel = panel(renderer, theme, { title: `${icon("heart")}  ${tr("about.credits")}`, flexGrow: 3, flexBasis: 0 });
    creditsPanel.add(spacer(renderer));
    const nameWidth = Math.max(...d.credits.map((c) => c.name.length));
    // Name and link on one line, the role below it, so no text is cut.
    for (const c of d.credits) {
      creditsPanel.add(
        new TextRenderable(renderer, {
          content: t`${fg(theme.textStrong)(c.name.padEnd(nameWidth + 2))}${fg(theme.accentSecondary)(c.url.replace(/^https:\/\//, ""))}\n${fg(theme.textDim)(`${" ".repeat(nameWidth + 3)}${c.role}`)}`,
          wrapMode: "none",
          height: 2,
          flexShrink: 0,
        }),
      );
    }
    bottom.add(creditsPanel);

    const standards = panel(renderer, theme, { title: `${icon("standards")}  ${tr("about.standards")}`, flexGrow: 2, flexBasis: 0 });
    standards.add(spacer(renderer));
    standards.add(heading(renderer, theme, tr("about.std.interface")));
    standards.add(list(renderer, theme, [tr("about.std.opencli"), tr("about.std.mcp"), tr("about.std.exit")]));
    standards.add(spacer(renderer));
    standards.add(heading(renderer, theme, tr("about.std.data")));
    standards.add(list(renderer, theme, [tr("about.std.settings"), tr("about.std.credentials"), tr("about.std.key")]));
    bottom.add(standards);
    rootBox.add(bottom);

    return rootBox;
  },
};
