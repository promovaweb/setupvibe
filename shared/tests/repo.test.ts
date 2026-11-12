/** SetupVibe 2 downloads its own files from the v2 branch, never from main. */
import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { INSTALL_PS1_URL, INSTALL_SH_URL, RAW_BASE, VERSION_MANIFEST_URL, rawUrl } from "../repo";

const root = join(import.meta.dir, "../..");

/** Source files of the v2 code (shared, desktop, server, scripts). */
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name === "node_modules" || name === "tests") return [];
    return statSync(path).isDirectory() ? sources(path) : /\.(ts|json|sh|ps1)$/.test(name) ? [path] : [];
  });
}

describe("repository URLs", () => {
  test("the one-line installers read the v2 branch", () => {
    for (const f of ["install.sh", "install.ps1"]) {
      const text = readFileSync(join(root, f), "utf8");
      expect(text, f).toContain(RAW_BASE);
      expect(text, f).toContain("/releases/download");
    }
  });

  test("point at the v2 branch", () => {
    expect(RAW_BASE).toBe("https://raw.githubusercontent.com/promovaweb/setupvibe/v2");
    for (const url of [VERSION_MANIFEST_URL, INSTALL_SH_URL, INSTALL_PS1_URL]) expect(url.startsWith(`${RAW_BASE}/`)).toBe(true);
    expect(rawUrl("/conf/a.zsh")).toBe(`${RAW_BASE}/conf/a.zsh`);
  });

  test("no v2 source file points at main or a v1 tag of the repository", () => {
    const files = [...["shared", "desktop", "server", "scripts"].flatMap((d) => sources(join(root, d))), ...["install.sh", "install.ps1", "version.json"].map((f) => join(root, f))];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      expect(text, file).not.toMatch(/promovaweb\/setupvibe\/(main|v0\.\d+\.\d+)\//);
    }
  });
});
