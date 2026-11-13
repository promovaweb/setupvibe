/**
 * Smoke test of the compiled TUI in a real pseudo-terminal (Linux and macOS).
 *
 * The OpenTUI test renderer used by `bun test` skips the native terminal
 * code; this script runs the built binary under `script(1)`, so the real
 * renderer draws. It opens every module, comes back to the Home, quits with
 * q and requires exit code 0, nothing on stderr and the header on screen.
 *
 *   bun run scripts/tui-smoke.ts [--bin dist/setupvibe]
 *
 * Exit codes: 0 passed, 1 failed.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const binIndex = process.argv.indexOf("--bin");
const bin = binIndex > 0 ? process.argv[binIndex + 1]! : "dist/setupvibe";
const home = mkdtempSync(join(tmpdir(), "sv-smoke-"));
// util-linux script takes the command with -c; BSD script (macOS) takes it after the file.
const argv = process.platform === "darwin" ? ["script", "-q", "/dev/null", bin] : ["script", "-qec", bin, "/dev/null"];
const proc = Bun.spawn(argv, {
  stdin: "pipe",
  stdout: "pipe",
  stderr: "pipe",
  env: { ...process.env, SETUPVIBE_HOME: home, TERM: "xterm-256color", COLUMNS: "130", LINES: "40", SETUPVIBE_LANG: "en" },
});
const keys = ["1", "\x1b", "2", "\x1b", "3", "\x1b", "4", "\x1b", "5", "\x1b", "6", "\x1b", "7", "\x1b", "?", "?", "q"];
await Bun.sleep(2500);
for (const k of keys) {
  proc.stdin.write(k);
  await proc.stdin.flush();
  await Bun.sleep(400);
}
const timeout = setTimeout(() => proc.kill(), 15_000);
const [code, out, err] = await Promise.all([proc.exited, new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
clearTimeout(timeout);
rmSync(home, { recursive: true, force: true });
const problems: string[] = [];
if (code !== 0) problems.push(`exit code ${code}`);
if (err.trim()) problems.push(`stderr: ${err.trim().slice(0, 400)}`);
if (!out.includes("SetupVibe")) problems.push("the header never showed up");
for (const bad of ["[object Object]", "TypeError", "ReferenceError", "panic"]) if (out.includes(bad)) problems.push(`output has ${bad}`);
if (problems.length) {
  console.error(`✗ TUI smoke test failed:\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log(`✓ TUI smoke test: ${keys.length} keys, every module opened, exit 0`);
