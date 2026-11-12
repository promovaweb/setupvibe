/**
 * About tab: binary identity, version, paths and credits.
 * Uses the same data as the `about` command, so the two surfaces never tell
 * different stories.
 */
import { BoxRenderable, TextRenderable, fg, t } from "@opentui/core";
import { aboutData } from "../../cli/commands/about.ts";
import { spacer, list, panel, dim, keyValueTable, heading } from "../components.ts";
import type { Screen } from "../screen.ts";
import { tr } from "../../../tui/i18n.ts";

export const aboutScreen: Screen = {
  id: "about",
  title: "About",
  description: "Binary, version, license and credits",
  mount: ({ renderer, theme }) => {
    const d = aboutData();
    const rootBox = new BoxRenderable(renderer, { flexDirection: "column", flexGrow: 1, gap: 1, paddingTop: 1 });

    const top = new BoxRenderable(renderer, { flexDirection: "row", flexShrink: 0, gap: 2 });

    const binary = panel(renderer, theme, { title: tr("about.binary"), flexGrow: 3, flexBasis: 0, active: true });
    binary.add(spacer(renderer));
    binary.add(new TextRenderable(renderer, { content: `${d.title}  v${d.version}`, fg: theme.accent }));
    binary.add(dim(renderer, theme, d.description));
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

    const project = panel(renderer, theme, { title: tr("about.project"), flexGrow: 2, flexBasis: 0 });
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

    const creditsPanel = panel(renderer, theme, { title: tr("about.credits"), flexGrow: 3, flexBasis: 0 });
    creditsPanel.add(spacer(renderer));
    const nameWidth = Math.max(...d.credits.map((c) => c.name.length));
    // One line per credit, so the list fits short terminals: name, link, role (cut first when narrow).
    for (const c of d.credits) {
      creditsPanel.add(
        new TextRenderable(renderer, {
          content: t`${fg(theme.textStrong)(c.name.padEnd(nameWidth + 2))}${fg(theme.accentSecondary)(c.url.replace(/^https:\/\//, "").padEnd(32))}  ${fg(theme.textDim)(c.role)}`,
          wrapMode: "none",
          height: 1,
          flexShrink: 0,
        }),
      );
    }
    bottom.add(creditsPanel);

    const standards = panel(renderer, theme, { title: tr("about.standards"), flexGrow: 2, flexBasis: 0 });
    standards.add(spacer(renderer));
    standards.add(heading(renderer, theme, "Interface"));
    standards.add(list(renderer, theme, ["OpenCLI 0.1 for the CLI description", "MCP 2025-11-25 over stdio", "Fixed exit codes (0 success)"]));
    standards.add(spacer(renderer));
    standards.add(heading(renderer, theme, "Data"));
    standards.add(list(renderer, theme, ["settings.json in plain text", "credentials.json with AES-256-GCM", "master.key with mode 0600"]));
    bottom.add(standards);
    rootBox.add(bottom);

    return rootBox;
  },
};
