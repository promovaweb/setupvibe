/** The server entry point runs as `setupvibe-server`, with its own docs and inventory. */
import { expect, test } from "bun:test";
import { join } from "node:path";
import pkg from "../../package.json";

const root = join(import.meta.dir, "../..");

function run(args: string[]) {
  const proc = Bun.spawnSync(["bun", "run", "server/src/main.ts", ...args], { cwd: root, env: { ...process.env, NO_COLOR: "1" }, stdin: "ignore" });
  return { code: proc.exitCode, stdout: proc.stdout.toString() };
}

test("--version prints the server binary name and the package version", () => {
  const { code, stdout } = run(["--version"]);
  expect(code).toBe(0);
  expect(stdout.trim()).toBe(`setupvibe-server ${pkg.version}`);
});

test("--skill embeds the server documentation", () => {
  const { code, stdout } = run(["--skill"]);
  expect(code).toBe(0);
  expect(stdout).toContain("Embedded documentation of setupvibe-server v");
  expect(stdout).toContain("~/.setupvibe/");
});

test("about --json reports the server edition and the shared data directory", () => {
  const { code, stdout } = run(["about", "--json"]);
  expect(code).toBe(0);
  const data = JSON.parse(stdout).data;
  expect(JSON.stringify(data)).toContain("setupvibe-server");
  expect(JSON.stringify(data)).toContain(".setupvibe");
});
