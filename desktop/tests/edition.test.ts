/** The desktop entry point runs as `setupvibe`, with its own docs and inventory. */
import { expect, test } from "bun:test";
import { join } from "node:path";
import pkg from "../../package.json";

const root = join(import.meta.dir, "../..");

function run(args: string[]) {
  const proc = Bun.spawnSync(["bun", "run", "desktop/src/main.ts", ...args], { cwd: root, env: { ...process.env, NO_COLOR: "1" }, stdin: "ignore" });
  return { code: proc.exitCode, stdout: proc.stdout.toString() };
}

test("--version prints the desktop binary name and the package version", () => {
  const { code, stdout } = run(["--version"]);
  expect(code).toBe(0);
  expect(stdout.trim()).toBe(`setupvibe ${pkg.version}`);
});

test("--skill embeds the desktop documentation", () => {
  const { code, stdout } = run(["--skill"]);
  expect(code).toBe(0);
  expect(stdout).toContain("Embedded documentation of setupvibe v");
  expect(stdout).toContain("~/.setupvibe/");
});

test("about --json reports the desktop edition and the shared data directory", () => {
  const { code, stdout } = run(["about", "--json"]);
  expect(code).toBe(0);
  const data = JSON.parse(stdout).data;
  expect(JSON.stringify(data)).toContain("setupvibe");
  expect(JSON.stringify(data)).toContain(".setupvibe");
});
