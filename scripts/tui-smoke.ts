/**
 * Runs the compiled TUI under script(1) to exercise edition selection and
 * rendering with a real pseudoterminal.
 */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const binIndex = process.argv.indexOf("--bin");
const bin = binIndex > 0 ? process.argv[binIndex + 1]! : "dist/setupvibe";
const home = mkdtempSync(join(tmpdir(), "sv-smoke-"));
const linux = process.platform === "linux";
const suggested = linux ? "server" : "desktop";
const modules = ["1", "\x1b", "2", "\x1b", "3", "\x1b", "4", "\x1b", "5", "\x1b", "6", "\x1b", "7", "\x1b", "?", "?"];
const state = () => JSON.parse(readFileSync(join(home, "edition.json"), "utf8")).edition;

async function screen(keys: string[]): Promise<string> {
  const quoted = "'" + bin.replaceAll("'", "'\\''") + "'";
  const argv = linux ? ["script", "-qec", quoted, "/dev/null"] : ["script", "-q", "/dev/null", bin];
  const proc = Bun.spawn(argv, {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      SETUPVIBE_HOME: home, TERM: "xterm-256color", COLUMNS: "130", LINES: "40", SETUPVIBE_LANG: "en",
      DISPLAY: "", WAYLAND_DISPLAY: "", XDG_SESSION_TYPE: "", SSH_CONNECTION: "", SSH_TTY: "",
    },
  });
  const output = Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  const timeout = setTimeout(() => proc.kill(), 25_000);
  try {
    await Bun.sleep(1600);
    for (const key of keys) {
      if (proc.exitCode !== null) break;
      proc.stdin.write(key);
      await proc.stdin.flush();
      await Bun.sleep(320);
    }
    const [code, [out, err]] = await Promise.all([proc.exited, output]);
    if (code !== 0 || err.trim()) throw new Error(`exit ${code}; stderr: ${err.slice(0, 400)}`);
    const bad = ["[object Object]", "TypeError", "ReferenceError", "panic"].find((word) => out.includes(word));
    if (bad) throw new Error(`unexpected terminal output: ${bad}`);
    return out;
  } finally {
    clearTimeout(timeout);
    if (proc.exitCode === null) proc.kill();
  }
}

try {
  const first = await screen(["\r", ...modules, "q"]);
  if (!first.includes("Choose edition") || !first.includes(suggested) || state() !== suggested) {
    throw new Error(`first launch did not suggest and save ${suggested}`);
  }
  const second = await screen(linux ? ["E", "\x1b[A", "\r", "q"] : ["q"]);
  if (!second.includes(`[${suggested}]`) || state() !== "desktop") throw new Error("saved edition or edition switch failed");
  const third = await screen(["q"]);
  if (!third.includes("[desktop]") || third.includes("Choose edition")) throw new Error("the TUI did not reopen in the saved Desktop edition");
  console.log("✓ TUI smoke test: first launch, saved edition, modules, edition switch and reopen");
} catch (error) {
  console.error(`✗ TUI smoke test failed: ${(error as Error).message}`);
  process.exitCode = 1;
} finally {
  rmSync(home, { recursive: true, force: true });
}
