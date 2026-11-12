/**
 * `about` command: binary data, version, runtime and credits.
 * Command-line counterpart of the TUI About tab.
 */
import { credits, manifest } from "../../app/manifest.ts";
import { paths } from "../../config/paths.ts";
import { blocks, color, section, table } from "../format.ts";
import type { Command } from "../registry.ts";
import { edition } from "../../app/edition.ts";
import type { Inventory } from "../../../inventory.ts";
import { detectSystem } from "../../../system/detect.ts";

/** Detected system and variant, such as "Debian 13 · x64 · desktop-remote". */
export function systemSummary(): string {
  try {
    const d = detectSystem((edition().inventory as Inventory).systems);
    return d.unsupportedReason ? `unsupported: ${d.unsupportedReason}` : `${d.name} · ${d.arch} · ${d.variant}`;
  } catch {
    return "unknown";
  }
}

/** Collects the data shown by `about`, by the TUI and by the MCP tool `about`. */
export function aboutData() {
  return {
    bin: manifest.bin,
    title: manifest.title,
    version: manifest.version,
    description: manifest.description,
    author: manifest.author,
    site: manifest.site,
    repository: manifest.repository,
    license: manifest.license,
    executable: process.execPath,
    runtime: `Bun ${Bun.version}`,
    platform: `${process.platform}-${process.arch}`,
    system: systemSummary(),
    pid: process.pid,
    dataDir: paths.base(),
    credits: credits.map((c) => ({ ...c })),
  };
}

export const aboutCommand: Command = {
  name: "about",
  description: "Show version, executable, runtime, platform and credits.",
  examples: [`${manifest.bin} about`, `${manifest.bin} about --json`],
  run: () => {
    const d = aboutData();
    return {
      data: d,
      text: () =>
        blocks(
          `${color.strong(d.title)} ${color.dim(`v${d.version}`)}\n${d.description}`,
          blocks(
            section("Binary"),
            table([
              ["Executable", d.executable],
              ["Runtime", d.runtime],
              ["Platform", d.platform],
              ["System", d.system],
              ["PID", String(d.pid)],
              ["Data", d.dataDir],
              ["License", d.license],
            ]),
          ),
          blocks(
            section("Project"),
            table([
              ["Author", d.author || "-"],
              ["Site", d.site || "-"],
              ["Repository", d.repository || "-"],
            ]),
          ),
          blocks(section("Credits"), table(d.credits.map((c) => [c.name, `${c.role} ${color.dim(c.url)}`]))),
        ),
    };
  },
};
