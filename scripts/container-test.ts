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
 * 3. on the desktop, exercises install, check, update and remove;
 * 4. runs `check` on the selection.
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
if (!["desktop", "server"].includes(edition) || (asRoot && edition !== "server") || system.startsWith("archlinux")) {
  console.error("Use a Debian-family test image with desktop or server (only server allows --as-root).");
  process.exit(2);
}
const bin = "setupvibe";
const cli = [bin, edition];
const binary = join("dist", bin);

const tag = `setupvibe-test:${system.replace(/[^a-z0-9_.-]/g, "-")}-${edition}-${process.pid}`;
const name = `setupvibe-test-${system.replace(/[:/.]/g, "-")}-${edition}-${process.pid}`;

async function sh(cmd: string[], opts: { quiet?: boolean; allowFail?: boolean } = {}): Promise<{ code: number; out: string }> {
  const proc = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe" });
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  const code = await proc.exited;
  if (!opts.quiet || (code !== 0 && !opts.allowFail)) process.stderr.write(out + err);
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
  await sh(["docker", "build", "-q", "-t", tag, "-f", "tests/containers/Dockerfile.apt", "--build-arg", `BASE=${system}`, "tests/containers"], { quiet: true });

  phase(`start ${name}`);
  await sh(["docker", "run", "-d", "--name", name, "--privileged", "--security-opt", "label=disable", "--tmpfs", "/run", "--tmpfs", "/run/lock", tag], { quiet: true });
  await sh(["docker", "exec", name, "sh", "-c", "for i in $(seq 1 30); do systemctl is-system-running 2>/dev/null | grep -qE 'running|degraded' && exit 0; sleep 1; done; exit 0"], { quiet: true });
  await sh(["docker", "cp", binary, `${name}:/usr/local/bin/${bin}`], { quiet: true });

  if (edition === "server") {
    phase("legacy Server link and root guard");
    await sh(["docker", "exec", name, "ln", "-s", bin, "/usr/local/bin/setupvibe-server"]);
    const legacy = await sh(["docker", "exec", name, "setupvibe-server", "system", "--no-update-check", "--json"], { quiet: true });
    if (JSON.parse(legacy.out).data?.edition !== "server") throw new Error("setupvibe-server did not select Server");
    const guarded = await sh(["docker", "exec", name, bin, "desktop", "check", "--json"], { quiet: true, allowFail: true });
    if (guarded.code !== 12) throw new Error(`Desktop root guard returned ${guarded.code} instead of 12`);
  }

  const autoArgs = ["auto", "--profile", profile, "--skip-network-check", ...extra];
  const user = asRoot ? [] : ["--user", "tester"];
  const first = asRoot ? [...cli, ...autoArgs, "--user", "deploy", "--git-name", "Test", "--git-email", "test@example.com"] : [...cli, ...autoArgs];

  if (edition === "desktop" && !asRoot) {
    // A machine set up by SetupVibe 1: its .zshrc and .tmux.conf with a personal line,
    // the old ssh_copy_id and a Go in ~/.local/go. auto must convert the files first.
    phase("SetupVibe 1 footprint");
    await sh(["docker", "cp", "shared/legacy/v1/zshrc-linux.zsh", `${name}:/home/tester/.zshrc`], { quiet: true });
    await sh(["docker", "cp", "shared/legacy/v1/tmux-desktop.conf", `${name}:/home/tester/.tmux.conf`], { quiet: true });
    await sh(["docker", "exec", name, "sh", "-c", [
      "echo 'alias mine=\"echo from-v1\"' >> /home/tester/.zshrc",
      "mkdir -p /home/tester/.setupvibe/bin /home/tester/.local/go/bin",
      "printf '#!/usr/bin/env bash\\n# Versao: 0.41.8\\n' > /home/tester/.setupvibe/bin/ssh_copy_id",
      "chown -R tester:tester /home/tester",
    ].join(" && ")], { quiet: true });
  }

  phase(`first run: ${first.join(" ")}`);
  const r1 = await sh(["docker", "exec", ...user, name, ...first], { allowFail: true });
  console.error(`exit code ${r1.code}`);
  if (r1.code !== 0) failed = true;

  const runAs = asRoot ? ["--user", "deploy"] : ["--user", "tester"];
  phase("second run (idempotency)");
  // As root, automation repeats the same command: the root phase restores the
  // temporary sudo rule that the first run removed, then runs as the user.
  const second = asRoot ? [...first, "--json"] : [...cli, ...autoArgs, "--json"];
  const r2 = await sh(["docker", "exec", ...(asRoot ? [] : runAs), name, ...second], { quiet: true, allowFail: true });
  const events = r2.out
    .split("\n")
    .filter((l) => l.startsWith("{") && l.includes('"action"'))
    .map((l) => JSON.parse(l) as { item?: string; action: string; status: string; message?: string });
  const bad = events.filter((e) => e.status === "fail");
  for (const e of bad) console.error(`✗ ${e.action} ${e.item}: ${e.message ?? ""}`);
  console.error(`exit code ${r2.code}, ${events.length} events, ${bad.length} failures`);
  if (r2.code !== 0 || bad.length) failed = true;

  if (edition === "desktop" && !asRoot) {
    phase("inventory commands");
    const steps: [string, string[]][] = [
      ["SetupVibe 1 .zshrc converted, personal line kept", ["sh", "-c", "grep -q '>>> setupvibe >>>' ~/.zshrc && ! grep -q 'PATH CONFIGURATION (Must come first' ~/.zshrc && grep -q 'alias mine=' ~/.zshrc.local && ls ~/.setupvibe/backups/.zshrc.first"]],
      ["the personal alias still works in zsh", ["zsh", "-ic", "mine | grep -q from-v1"]],
      ["doctor and system report SetupVibe 1 leftovers", ["sh", "-c", `${cli.join(" ")} doctor --json | grep -q legacy-go && ${cli.join(" ")} system --no-update-check | grep -q 'SetupVibe 1'`]],
      ["migrate --dry-run lists the shortcut", ["sh", "-c", `${cli.join(" ")} migrate --dry-run | grep -q 'ssh_copy_id'`]],
      ["migrate --remove-legacy go", [...cli, "migrate", "--remove-legacy", "go"]],
      ["Go from SetupVibe 1 removed, ssh_copy_id is the shortcut", ["sh", "-c", "[ ! -e ~/.local/go ] && grep -q 'kept by SetupVibe 2' ~/.setupvibe/bin/ssh_copy_id"]],
      ["install go", [...cli, "install", "go"]],
      ["check go", [...cli, "check", "go"]],
      ["update (nothing to do)", [...cli, "update"]],
      ["install --external hyperfine", [...cli, "install", "--external", "hyperfine"]],
      ["remove --external hyperfine", [...cli, "remove", "--external", "hyperfine", "--yes"]],
      ["remove go", [...cli, "remove", "go", "--yes"]],
      ["zsh loads the SetupVibe block", ["zsh", "-ic", "alias gstat >/dev/null && alias cco >/dev/null && command -v starship >/dev/null && command -v node >/dev/null"]],
      ["tmux loads the SetupVibe settings", ["sh", "-c", "tmux new-session -d -s sv && tmux show -gv base-index | grep -qx 1; r=$?; tmux kill-server; exit $r"]],
      ["login shell is zsh", ["sh", "-c", "getent passwd \"$(id -un)\" | cut -d: -f7 | grep -q zsh"]],
      ["mcp install", [...cli, "mcp", "install"]],
      ["mcp install again (no changes)", [...cli, "mcp", "install"]],
      ["claude sees the server", ["sh", "-lc", "PATH=$HOME/.local/bin:$HOME/.local/share/mise/shims:$PATH claude mcp get setupvibe"]],
      ["doctor --fix", [...cli, "doctor", "--fix"]],
      ["report", ["sh", "-c", `${cli.join(" ")} report --output /tmp/report.md && grep -q '# SetupVibe report' /tmp/report.md`]],
      ["config export", [...cli, "config", "export", "/tmp/answers.json"]],
      ["config import (nothing new)", [...cli, "config", "import", "/tmp/answers.json"]],
      ["install openssh-server", [...cli, "install", "openssh-server"]],
      ["ssh copy-id with a password", ["sh", "-c", `echo "$(id -un):sv-pass-1" | sudo chpasswd && sudo sed -i 's/^#\\?PasswordAuthentication.*/PasswordAuthentication yes/' /etc/ssh/sshd_config && { sudo systemctl restart ssh 2>/dev/null || sudo systemctl restart sshd; } && ssh-keygen -q -t ed25519 -N '' -f ~/.ssh/id_ed25519 && printf %s sv-pass-1 | ${cli.join(" ")} ssh copy-id "$(id -un)@127.0.0.1" --password-stdin`]],
      ["ssh login with the key", ["sh", "-c", `ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new "$(id -un)@127.0.0.1" true`]],
      ["ssh copy-id again keeps one key", ["sh", "-c", `printf %s sv-pass-1 | ${cli.join(" ")} ssh copy-id "$(id -un)@127.0.0.1" --password-stdin && [ "$(grep -c ssh-ed25519 ~/.ssh/authorized_keys)" = 1 ]`]],
    ];
    for (const [label, cmd] of steps) {
      const r = await sh(["docker", "exec", ...runAs, name, ...cmd], { quiet: true, allowFail: true });
      console.error(`${r.code === 0 ? "✓" : "✗"} ${label} (exit ${r.code})`);
      if (r.code !== 0) {
        failed = true;
        console.error(r.out.split("\n").slice(-5).join("\n"));
      }
    }
  }

  phase("environment settings");
  const settings: [string, string[]][] = edition === "server"
    ? [["docker daemon.json rotates logs, without live-restore", ["sh", "-c", "grep -q max-size /etc/docker/daemon.json && ! grep -q live-restore /etc/docker/daemon.json"]]]
    : [["mise.lock records the tools", ["sh", "-c", "test -s ~/.config/mise/mise.lock && grep -q node ~/.config/mise/mise.lock"]]];
  for (const [label, cmd] of settings) {
    const r = await sh(["docker", "exec", ...runAs, name, ...cmd], { quiet: true, allowFail: true });
    console.error(`${r.code === 0 ? "✓" : "✗"} ${label} (exit ${r.code})`);
    if (r.code !== 0) failed = true;
  }

  if (edition === "server") {
    phase("security record, remove and apply; swarm token");
    const manager = extra.includes("--manager");
    const steps: [string, string[]][] = [
      ["security record written before the module", ["sh", "-c", "test -s ~/.setupvibe/state/security.json && grep -q ufwActive ~/.setupvibe/state/security.json"]],
      ["security remove --dry-run lists the jail", ["sh", "-c", `${cli.join(" ")} security remove --dry-run | grep -q jail.d/setupvibe.local`]],
      // auto removed the temporary NOPASSWD rule: without a terminal, the command stops before changing anything.
      ["without passwordless sudo it stops with 13", ["sh", "-c", `${cli.join(" ")} security remove; [ $? = 13 ]`]],
      ["root adds a temporary NOPASSWD rule", ["sh", "-c", `sudo -n true 2>/dev/null || exit 0`]],
      ["security remove", [...cli, "security", "remove"]],
      ["jail and record gone", ["sh", "-c", "[ ! -e /etc/fail2ban/jail.d/setupvibe.local ] && [ ! -e ~/.setupvibe/state/security.json ]"]],
      ["security apply again", [...cli, "security", "apply"]],
      ["jail and record back", ["sh", "-c", "[ -e /etc/fail2ban/jail.d/setupvibe.local ] && [ -s ~/.setupvibe/state/security.json ]"]],
      manager
        ? ["swarm token prints a worker token", ["sh", "-c", `${cli.join(" ")} swarm token | grep -q '^SWMTKN-'`]]
        : ["swarm token refuses outside a manager", ["sh", "-c", `${cli.join(" ")} swarm token; [ $? = 3 ]`]],
    ];
    for (const [label, cmd] of steps) {
      // The NOPASSWD rule is root's job, as an operator would do it.
      const asRootStep = label.startsWith("root ");
      const command = asRootStep ? [...cli, "user", "nopasswd", asRoot ? "deploy" : "tester"] : cmd;
      const r = await sh(["docker", "exec", ...(asRootStep ? [] : runAs), name, ...command], { quiet: true, allowFail: true });
      console.error(`${r.code === 0 ? "✓" : "✗"} ${label} (exit ${r.code})`);
      if (r.code !== 0) {
        failed = true;
        console.error(r.out.split("\n").slice(-5).join("\n"));
      }
    }
    await sh(["docker", "exec", name, ...cli, "user", "nopasswd", asRoot ? "deploy" : "tester", "--remove"], { quiet: true, allowFail: true });
  }

  phase("check");
  const r3 =await sh(["docker", "exec", ...runAs, name, ...cli, "check", ...(asRoot ? [] : [])], { allowFail: true });
  if (r3.code !== 0) failed = true;

  if (edition === "desktop" && !asRoot) {
    phase("self uninstall");
    const steps: [string, string[]][] = [
      ["a personal line in .zshrc", ["sh", "-c", "echo 'export MINE=1' >> ~/.zshrc"]],
      ["self uninstall --yes --keep-data", [...cli, "self", "uninstall", "--yes", "--keep-data"]],
      ["block gone, personal line kept", ["sh", "-c", "! grep -q '>>> setupvibe >>>' ~/.zshrc && grep -q 'export MINE=1' ~/.zshrc && [ -f ~/.setupvibe/config.json ] && [ ! -e ~/.setupvibe/shell ]"]],
    ];
    for (const [label, cmd] of steps) {
      const r = await sh(["docker", "exec", ...runAs, name, ...cmd], { quiet: true, allowFail: true });
      console.error(`${r.code === 0 ? "✓" : "✗"} ${label} (exit ${r.code})`);
      if (r.code !== 0) {
        failed = true;
        console.error(r.out.split("\n").slice(-5).join("\n"));
      }
    }
  }
} catch (e) {
  console.error(`✗ ${(e as Error).message}`);
  failed = true;
} finally {
  if (keep) console.error(`\nContainer kept: ${name}`);
  else {
    await sh(["docker", "rm", "-f", name], { quiet: true, allowFail: true });
    await sh(["docker", "image", "rm", tag], { quiet: true, allowFail: true });
  }
}

console.error(failed ? "\n✗ container test failed" : "\n✓ container test passed");
process.exit(failed ? 1 : 0);
