/** doctor, config export/import, upgrade, report, self uninstall, ssh copy-id, skill and the current user (spec sections 8, 16 and 17). */
import "../../desktop/src/edition.ts";
import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import desktopJson from "../../desktop/inventory.json";
import type { Inventory } from "../inventory";
import { describeCmd } from "../exec/runner";
import {
  COPY_ID_REMOTE,
  copyIdArgv,
  defaultPublicKey,
  exportAnswers,
  legacyFindings,
  MANAGED_DATA,
  reportMarkdown,
  selfUninstallSteps,
  setupvibeFindings,
  SSH_TARGET,
  upgradeAsset,
} from "../ops/maintenance";
import { currentUserName } from "../system/user";
import { ExitCode } from "../core/app/exit-codes";

const desktop = desktopJson as Inventory;

describe("doctor findings", () => {
  test("pending init fails; items, outdated and shell warn with their fix", () => {
    const f = setupvibeFindings({ inventory: desktop, supported: undefined, init: undefined, selection: [{ id: "go", version: "1.0.0", status: "fail" }], home: "/h", path: "/usr/bin", exists: () => false, rcHasBlock: false });
    const byId = Object.fromEntries(f.map((x) => [x.id, x]));
    expect(byId.init!.level).toBe("fail");
    expect(byId.items!.fix).toBe("setupvibe install go --force");
    expect(byId.outdated!.fix).toBe("setupvibe update");
    expect(byId["local-bin"]!.safe).toBe(true);
    expect(byId.shell).toBeUndefined();
  });

  test("after init, a missing shell block is a safe fix", () => {
    const init = { done: true, at: "", version: "2", system: "debian" as const, prerequisites: ["build-deps", "mise"] };
    const f = setupvibeFindings({ inventory: desktop, supported: undefined, init, selection: [], home: "/h", path: "/h/.local/bin", exists: () => true, rcHasBlock: false });
    expect(f.find((x) => x.id === "shell")).toMatchObject({ level: "warn", fix: "setupvibe shell apply", safe: true });
  });

  test("SetupVibe 1 leftovers are reported (spec section 16)", () => {
    const present = new Set(["/h/.local/go", "/h/.npm-global"]);
    expect(legacyFindings((p) => present.has(p), "/h").map((x) => x.id)).toEqual(["legacy-go", "legacy-npm-global"]);
  });
});

describe("config export", () => {
  test("produces an answers file without secrets", () => {
    const a = exportAnswers({ edition: "desktop", user: "deploy", gitName: "Ana", gitEmail: "ana@example.com", selection: [{ id: "node", version: "1" }, { id: "go", version: "1" }] });
    expect(a).toEqual({ schemaVersion: 1, edition: "desktop", user: "deploy", git: { name: "Ana", email: "ana@example.com" }, profile: "none", only: ["go", "node"] });
  });
});

describe("upgrade assets", () => {
  test("match the release names", () => {
    expect(upgradeAsset("setupvibe", "linux", "x64")).toBe("setupvibe-linux-x64");
    expect(upgradeAsset("setupvibe", "darwin", "arm64")).toBe("setupvibe-darwin-arm64");
    expect(upgradeAsset("setupvibe", "win32", "x64")).toBe("setupvibe-windows-x64.exe");
    expect(upgradeAsset("setupvibe-server", "darwin", "arm64")).toBeUndefined();
    expect(upgradeAsset("setupvibe", "linux", "ia32")).toBeUndefined();
  });
});

describe("report", () => {
  test("Markdown with doctor, items and the last run, secrets masked", () => {
    process.env.GH_TOKEN = "ghp_secret_value";
    const md = reportMarkdown({
      bin: "setupvibe",
      version: "2.0.0",
      system: { name: "Debian 13", system: "debian", arch: "x64", variant: "local" },
      init: undefined,
      selection: [{ id: "node", version: "24.22.3", status: "ok" }],
      external: [{ tool: "terraform", version: "1.13.4" }],
      findings: [{ id: "init", level: "fail", text: "prerequisites pending", fix: "setupvibe init" }],
      lastRun: { finishedAt: "t", results: [{ id: "tpm", status: "fail", message: "token ghp_secret_value refused" }] },
      logTail: [],
    });
    delete process.env.GH_TOKEN;
    expect(md).toContain("# SetupVibe report");
    expect(md).toContain("- node 24.22.3 · ok");
    expect(md).toContain("terraform@1.13.4");
    expect(md).toContain("✗ tpm: token *** refused");
    expect(md).not.toContain("ghp_secret_value");
  });
});

describe("self uninstall", () => {
  test("removes only SetupVibe state, never backups or Portainer data", () => {
    const steps = selfUninstallSteps({ dataDir: "/h/.setupvibe", binaries: ["/h/.local/bin/setupvibe", "/usr/local/bin/setupvibe"], keepData: false, user: "u", sudoersExists: true });
    const cmds = steps.map((s) => describeCmd(s.commands[0]!));
    expect(cmds[0]).toBe("sudo rm -f /etc/sudoers.d/90-setupvibe-u");
    expect(cmds[1]).toBe("rm -f /h/.local/bin/setupvibe");
    expect(cmds[2]).toBe("sudo rm -f /usr/local/bin/setupvibe");
    const data = steps.at(-1)!.commands[0]!.argv;
    expect(data.slice(2)).toEqual(MANAGED_DATA.map((p) => `/h/.setupvibe/${p}`));
    expect(data).not.toContain("/h/.setupvibe");
    for (const kept of ["backups", "portainer", "bin", "portainer_data"]) expect(MANAGED_DATA).not.toContain(kept);
  });

  test("--keep-data removes only the shell files", () => {
    const steps = selfUninstallSteps({ dataDir: "/h/.setupvibe", binaries: [], keepData: true, user: "u", sudoersExists: false });
    expect(steps.map((s) => describeCmd(s.commands[0]!))).toEqual(["rm -rf /h/.setupvibe/shell"]);
  });
});

describe("ssh copy-id", () => {
  test("targets, key choice and the remote script that never sees the key in argv", () => {
    for (const ok of ["deploy@203.0.113.10", "host.example.com", "root@[2001:db8::1]"]) expect(SSH_TARGET.test(ok), ok).toBe(true);
    for (const bad of ["bad@@x", "a b", "$(rm)"]) expect(SSH_TARGET.test(bad), bad).toBe(false);
    expect(defaultPublicKey("/h", (p) => p === "/h/.ssh/id_rsa.pub")).toBe("/h/.ssh/id_rsa.pub");
    const argv = copyIdArgv("deploy@host", 2222, false);
    expect(argv.slice(0, 3)).toEqual(["ssh", "-p", "2222"]);
    expect(argv.at(-1)).toBe(COPY_ID_REMOTE);
    expect(COPY_ID_REMOTE).toContain('grep -qxF "$k"');
    expect(copyIdArgv("deploy@host", 22, true).slice(0, 2)).toEqual(["sshpass", "-e"]);
  });
});

describe("current user", () => {
  test("id -un wins over a stale USER", () => {
    const real = Bun.spawnSync(["id", "-un"]).stdout.toString().trim();
    expect(currentUserName({ USER: "root-from-runuser" })).toBe(real);
  });
});

describe("commands", () => {
  const root = join(import.meta.dir, "../..");
  const home = mkdtempSync(join(tmpdir(), "sv-maint-"));
  const run = (args: string[], stdin?: string) => {
    const p = Bun.spawnSync(["bun", "run", "desktop/src/main.ts", ...args], { cwd: root, env: { ...process.env, NO_COLOR: "1", SETUPVIBE_HOME: home }, stdin: stdin === undefined ? "ignore" : new Response(stdin) });
    return { code: p.exitCode, stdout: p.stdout.toString() };
  };

  test("docs replaces the old skill command for the embedded documentation", () => {
    const r = run(["docs", "exit-codes"]);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("UNSUPPORTED_SYSTEM");
  });

  test("doctor --json reports runtime and SetupVibe findings", () => {
    const r = run(["doctor", "--json"]);
    expect(r.code).toBe(ExitCode.CONFIG);
    const data = JSON.parse(r.stdout).data;
    expect(data.runtime.length).toBeGreaterThan(0);
    expect(data.findings.map((f: { id: string }) => f.id)).toContain("init");
  });

  test("config export writes an answers file that config import accepts", () => {
    const file = join(home, "answers.json");
    expect(run(["config", "export", file]).code).toBe(0);
    expect(JSON.parse(readFileSync(file, "utf8")).schemaVersion).toBe(1);
    expect(run(["config", "import", file, "--dry-run"]).code).toBe(ExitCode.CONFIG);
  });

  test("report prints Markdown", () => {
    const r = run(["report"]);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("# SetupVibe report");
  });

  test("self uninstall needs --yes without a terminal and previews with --dry-run", () => {
    expect(run(["self", "uninstall"]).code).toBe(ExitCode.USAGE);
    const r = run(["self", "uninstall", "--dry-run", "--json"]);
    expect(r.code).toBe(0);
    expect(JSON.stringify(JSON.parse(r.stdout).data.steps)).toContain(join(home, "config.json"));
  });

  test("ssh copy-id rejects invalid targets", () => {
    expect(run(["ssh", "copy-id", "bad@@x"]).code).toBe(ExitCode.USAGE);
  });

  test("skill passes its arguments to the skills CLI", () => {
    const r = run(["skill", "--json", "--", "--version"]);
    expect(r.code).toBe(0);
    expect(JSON.parse(r.stdout).data.command.at(-1)).toBe("--version");
  });

  test("cleanup", () => rmSync(home, { recursive: true, force: true }));
});
