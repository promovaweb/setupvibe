/**
 * Integration test of `setupvibe auto` in a systemd container.
 *
 * Builds the test image for a system, starts it with systemd as PID 1 (the
 * recipe in DEBIAN.md), copies the compiled binary in, then:
 *
 * 1. runs `auto` as a normal user with passwordless sudo, or as root with
 *    `--user` when `--as-root` is given;
 * 2. runs the same `auto` again to prove idempotency (every step ok or
 *    skipped); as root, the second run repeats the root command;
 * 3. runs `check` on the selection.
 *
 * Exit code 0 means every phase passed. The container is removed at the end
 * unless `--keep` is given.
 *
 * Usage:
 *   bun run scripts/container-test.ts --system debian:13 [--edition desktop|server]
 *     [--profile essencial] [--as-root] [--keep] [-- <extra auto args>]
 */
import { existsSync } from "node:fs";
import { join } from "node:path";

const argv = process.argv.slice(2);
const dashdash = argv.indexOf("--");
const own = dashdash === -1 ? argv : argv.slice(0, dashdash);
const extra = dashdash === -1 ? [] : argv.slice(dashdash + 1);
const value = (name: string, fallback: string) => {
  const i = own.indexOf(name);
  return i === -1 ? fallback : own[i + 1]!;
};

const system = value("--system", "debian:13");
const edition = value("--edition", "desktop");
const profile = value("--profile", "essencial");
const asRoot = own.includes("--as-root");
const keep = own.includes("--keep");
const bin = edition === "server" ? "setupvibe-server" : "setupvibe";
const binary = join("dist", bin);
const arch = system.startsWith("archlinux");
const tag = `setupvibe-test:${system.replace(/[:/]/g, "-")}`;
const name = `setupvibe-test-${system.replace(/[:/.]/g, "-")}-${edition}-${process.pid}`;

async function sh(cmd: string[], opts: { quiet?: boolean; allowFail?: boolean } = {}): Promise<{ code: number; out: string }> {
  const proc = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe" });
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  const code = await proc.exited;
  if (!opts.quiet) process.stderr.write(out + err);
  if (code !== 0 && !opts.allowFail) throw new Error(`${cmd.join(" ")} exited with ${code}`);
  return { code, out };
}

function phase(title: string) {
  console.error(`\n=== ${title} ===`);
}

if (!existsSync(binary)) {
  console.error(`✗ ${binary} is missing. Run: bun run build`);
  process.exit(1);
}

let failed = false;
try {
  phase(`build image ${tag}`);
  await sh(["docker", "build", "-q", "-t", tag, ...(arch ? ["-f", "tests/containers/Dockerfile.arch"] : ["-f", "tests/containers/Dockerfile.apt", "--build-arg", `BASE=${system}`]), "tests/containers"], { quiet: true });

  phase(`start ${name}`);
  await sh(["docker", "run", "-d", "--name", name, "--privileged", "--security-opt", "label=disable", "--tmpfs", "/run", "--tmpfs", "/run/lock", tag], { quiet: true });
  await sh(["docker", "exec", name, "sh", "-c", "for i in $(seq 1 30); do systemctl is-system-running 2>/dev/null | grep -qE 'running|degraded' && exit 0; sleep 1; done; exit 0"], { quiet: true });
  await sh(["docker", "cp", binary, `${name}:/usr/local/bin/${bin}`], { quiet: true });

  const autoArgs = ["auto", "--profile", profile, "--skip-network-check", ...extra];
  const user = asRoot ? [] : ["--user", "tester"];
  const first = asRoot ? [bin, ...autoArgs, "--user", "deploy", "--git-name", "Test", "--git-email", "test@example.com"] : [bin, ...autoArgs];

  phase(`first run: ${first.join(" ")}`);
  const r1 = await sh(["docker", "exec", ...user, name, ...first], { allowFail: true });
  console.error(`exit code ${r1.code}`);
  if (r1.code !== 0) failed = true;

  const runAs = asRoot ? ["--user", "deploy"] : ["--user", "tester"];
  phase("second run (idempotency)");
  // As root, automation repeats the same command: the root phase restores the
  // temporary sudo rule that the first run removed, then runs as the user.
  const second = asRoot ? [...first, "--json"] : [bin, ...autoArgs, "--json"];
  const r2 = await sh(["docker", "exec", ...(asRoot ? [] : runAs), name, ...second], { quiet: true, allowFail: true });
  const events = r2.out
    .split("\n")
    .filter((l) => l.startsWith("{") && l.includes('"action"'))
    .map((l) => JSON.parse(l) as { item?: string; action: string; status: string; message?: string });
  const bad = events.filter((e) => e.status === "fail");
  for (const e of bad) console.error(`✗ ${e.action} ${e.item}: ${e.message ?? ""}`);
  console.error(`exit code ${r2.code}, ${events.length} events, ${bad.length} failures`);
  if (r2.code !== 0 || bad.length) failed = true;

  phase("check");
  const r3 = await sh(["docker", "exec", ...runAs, name, bin, "check", ...(asRoot ? [] : [])], { allowFail: true });
  if (r3.code !== 0) failed = true;
} catch (e) {
  console.error(`✗ ${(e as Error).message}`);
  failed = true;
} finally {
  if (keep) console.error(`\nContainer kept: ${name}`);
  else await sh(["docker", "rm", "-f", name], { quiet: true, allowFail: true });
}

console.error(failed ? "\n✗ container test failed" : "\n✓ container test passed");
process.exit(failed ? 1 : 0);
