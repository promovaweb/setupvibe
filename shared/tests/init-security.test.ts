/** init, install methods, user create and the security module (spec sections 3, 6, 12, 17 and 18). */
import "../../desktop/src/edition.ts";
import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import desktopJson from "../../desktop/inventory.json";
import serverJson from "../../server/inventory.json";
import type { Inventory, Item } from "../inventory";
import { describeCmd, dryRunner, finalArgv, runSteps, type Step } from "../exec/runner";
import { itemSteps, miseAsset, nativeInstallCmd, verifyOutputMatches } from "../install/methods";
import { initPlan, missingPrerequisites } from "../init/plan";
import { checkClock, checkDisk, checkEdition, checkLocale, checkMemory, checkRoot, exitCodeOf } from "../init/requirements";
import { nopasswdStep, sudoersPath, userCreatePlan, validateUserOptions } from "../users/create";
import { SSHD_DROPIN, securityPlan, SWARM_PORTS } from "../security/plan";
import { ExitCode } from "../core/app/exit-codes";
import { autoPlan } from "../auto/plan";
import { resolveAnswers } from "../auto/answers";

const desktop = desktopJson as Inventory;
const server = serverJson as Inventory;
const item = (inv: Inventory, id: string) => inv.items.find((i) => i.id === id) as Item;
const commands = (steps: Step[]) => steps.flatMap((s) => s.commands.map(describeCmd));
const HOME = "/home/test";
const debianDistro = { distro: "debian", codename: "trixie" };

describe("runner", () => {
  test("adds sudo -n with a non-interactive environment when not root", () => {
    expect(finalArgv({ argv: ["apt-get", "update"], sudo: true }, false).slice(0, 3)).toEqual(["sudo", "-n", "env"]);
    expect(finalArgv({ argv: ["apt-get", "update"], sudo: true }, false)).toContain("DEBIAN_FRONTEND=noninteractive");
    expect(finalArgv({ argv: ["apt-get", "update"], sudo: true }, true)).toEqual(["apt-get", "update"]);
    expect(finalArgv({ argv: ["ls"] }, false)).toEqual(["ls"]);
  });

  test("a failed step does not stop the next ones; optional commands do not fail", async () => {
    const runner = dryRunner({ "false-cmd": { code: 1, stderr: "boom" } });
    const results = await runSteps(
      [
        { id: "a", description: "a", commands: [{ argv: ["false-cmd"] }] },
        { id: "b", description: "b", commands: [{ argv: ["false-cmd"], optional: true }, { argv: ["true"] }] },
      ],
      runner,
    );
    expect(results.map((r) => r.status)).toEqual(["fail", "ok"]);
    expect(results[0]!.message).toContain("boom");
  });
});

describe("install methods", () => {
  test("native packages per system", () => {
    expect(describeCmd(nativeInstallCmd("ubuntu", ["zsh"])[0]!)).toContain("sudo apt-get install -y");
    expect(describeCmd(nativeInstallCmd("arch", ["zsh"])[0]!)).toBe("sudo pacman -S --noconfirm --needed zsh");
    expect(describeCmd(nativeInstallCmd("omarchy", ["zsh"])[0]!)).toBe("omarchy pkg add zsh");
    expect(describeCmd(nativeInstallCmd("macos", ["tmux"])[0]!)).toBe("brew install tmux");
  });

  test("mise items pin the inventory version", () => {
    const ctx = { arch: "x64", inventory: desktop, home: HOME };
    expect(commands(itemSteps(item(desktop, "node"), "ubuntu", ctx))).toEqual([`${HOME}/.local/bin/mise use --global --yes node@24.22.3`]);
    expect(commands(itemSteps(item(desktop, "codex"), "macos", ctx))[0]).toEndWith("npm:@openai/codex@0.167.1");
    expect(commands(itemSteps(item(desktop, "spec-kit"), "debian", ctx))[0]).toEndWith("pipx:git+https://github.com/github/spec-kit.git@v1.4.0");
    expect(commands(itemSteps(item(desktop, "bandwhich"), "debian", ctx))[0]).toEndWith("github:imsnif/bandwhich@0.23.1");
  });

  test("preinstalled and unsupported items have no steps", () => {
    const ctx = { arch: "x64", inventory: desktop, home: HOME };
    expect(itemSteps(item(desktop, "herdr"), "omarchy", ctx)).toEqual([]);
    expect(itemSteps(item(desktop, "php"), "windows", ctx)).toEqual([]);
  });

  test("native items with a repository add it first, pinned to the key", () => {
    const steps = itemSteps(item(desktop, "docker"), "debian", { arch: "x64", inventory: desktop, distro: debianDistro, home: HOME });
    expect(steps[0]!.id).toBe("repository:docker");
    expect(steps[0]!.description).toContain("9DC858229FC7DD38854AE2D88D81803C0EBFCD88");
    expect(steps[0]!.commands.map(describeCmd)[0]).toContain("https://download.docker.com/linux/debian/gpg");
    expect(commands([steps[1]!]).join("\n")).toContain("apt-get remove -y docker.io");
  });

  test("Mint uses the ondrej PPA with its Ubuntu base codename", () => {
    const steps = itemSteps(item(desktop, "php"), "mint", { arch: "x64", inventory: desktop, distro: { distro: "ubuntu", codename: "noble", ubuntuCodename: "noble" }, home: HOME });
    expect(steps[0]!.id).toBe("repository:ondrej");
  });

  test("Git items check out the pinned commit, including tmux plugins", () => {
    const steps = itemSteps(item(desktop, "tpm"), "ubuntu", { arch: "x64", inventory: desktop, home: HOME });
    expect(steps.length).toBe(1 + Object.keys(item(desktop, "tpm").plugins!).length);
    expect(commands(steps).join("\n")).toContain(`checkout --quiet --detach ${item(desktop, "tpm").version}`);
    expect(commands(steps).join("\n")).toContain(`${HOME}/.tmux/plugins/tmux-resurrect`);
  });

  test("archives and installers are verified downloads, previewed in dry runs", () => {
    const fonts = itemSteps(item(desktop, "nerd-fonts"), "ubuntu", { arch: "x64", inventory: desktop, home: HOME });
    expect(fonts).toHaveLength(2);
    expect(fonts[0]!.actionDescription).toContain("FiraCode.zip");
    const claude = itemSteps(item(desktop, "claude-code"), "debian", { arch: "x64", inventory: desktop, home: HOME });
    expect(claude[0]!.actionDescription).toContain("https://claude.ai/install.sh");
  });

  test("WinGet items skip what is already installed", () => {
    const steps = itemSteps(item(desktop, "windows-essentials"), "windows", { arch: "x64", inventory: desktop, home: HOME });
    expect(steps.map((s) => s.skipIf && describeCmd(s.skipIf))).toEqual([
      "winget list --exact --id 7zip.7zip",
      "winget list --exact --id Microsoft.PowerShell",
      "winget list --exact --id Microsoft.WindowsTerminal",
    ]);
  });

  test("verify expectations: substring, regex and minimum", () => {
    expect(verifyOutputMatches(item(desktop, "node"), "v24.22.3\n")).toBe(true);
    expect(verifyOutputMatches(item(desktop, "node"), "v24.22.2\n")).toBe(false);
    expect(verifyOutputMatches(item(desktop, "php"), "PHP 8.5.3 (cli)")).toBe(true);
    expect(verifyOutputMatches(item(desktop, "claude-code"), "2.1.400 (Claude Code)")).toBe(true);
    expect(verifyOutputMatches(item(desktop, "claude-code"), "2.0.9 (Claude Code)")).toBe(false);
  });

  test("mise asset names match the release", () => {
    expect(miseAsset("2026.11.6", "debian", "x64")).toBe("mise-v2026.11.6-linux-x64");
    expect(miseAsset("2026.11.6", "macos", "arm64")).toBe("mise-v2026.11.6-macos-arm64");
  });
});

describe("init", () => {
  test("Debian: package index, build dependencies, mise", () => {
    const steps = initPlan({ inventory: desktop, system: "debian", arch: "x64", home: HOME });
    expect(steps.map((s) => s.id)).toEqual(["package-index", "build-deps", "mise"]);
  });

  test("Omarchy keeps its mise and installs build dependencies with omarchy pkg", () => {
    const steps = initPlan({ inventory: desktop, system: "omarchy", arch: "x64", home: HOME });
    expect(steps.map((s) => s.id)).toEqual(["build-deps"]);
    expect(commands(steps)[0]).toStartWith("omarchy pkg add base-devel");
  });

  test("macOS installs the Command Line Tools without the dialog", () => {
    const steps = initPlan({ inventory: desktop, system: "macos", arch: "arm64", home: HOME });
    expect(steps[0]!.description).toContain("without the GUI dialog");
    expect(commands(steps).join("\n")).toContain("softwareupdate");
  });

  test("Windows installs Git and mise with WinGet", () => {
    const steps = initPlan({ inventory: desktop, system: "windows", arch: "x64", home: HOME });
    expect(commands(steps).every((c) => c.startsWith("winget install"))).toBe(true);
  });

  test("the server init is the same set of prerequisites", () => {
    expect(initPlan({ inventory: server, system: "ubuntu", arch: "arm64", home: HOME }).map((s) => s.id)).toEqual(["package-index", "build-deps", "mise"]);
  });

  test("new prerequisites are reported after an old init", () => {
    expect(missingPrerequisites(desktop, undefined)).toEqual(["build-deps", "mise"]);
    expect(missingPrerequisites(desktop, { done: true, at: "", version: "2.0.0-dev.1", system: "debian", prerequisites: ["build-deps"] })).toEqual(["mise"]);
  });
});

describe("requirements", () => {
  test("disk, memory, locale, clock, root and edition", () => {
    expect(checkDisk(12, "desktop").status).toBe("ok");
    expect(checkDisk(8, "desktop")).toMatchObject({ status: "fail", code: ExitCode.DISK_SPACE });
    expect(checkDisk(6, "server").status).toBe("ok");
    expect(checkMemory(1).status).toBe("warn");
    expect(checkLocale({ LANG: "C.UTF-8" }).status).toBe("ok");
    expect(checkLocale({ LANG: "C" }).status).toBe("warn");
    const now = new Date("2026-11-12T10:00:00Z");
    expect(checkClock(new Date("2026-11-12T10:01:00Z"), now).status).toBe("ok");
    expect(checkClock(new Date("2026-11-12T11:00:00Z"), now).status).toBe("fail");
    expect(checkRoot(true, false)).toMatchObject({ status: "fail", code: ExitCode.ROOT });
    expect(checkRoot(true, true).status).toBe("ok");
    expect(checkEdition("server", "desktop").status).toBe("fail");
    expect(exitCodeOf([checkRoot(false, false), checkDisk(1, "server")])).toBe(ExitCode.DISK_SPACE);
  });
});

describe("user create", () => {
  test("validates names, keys and systems", () => {
    expect(() => validateUserOptions({ name: "Deploy", system: "debian" })).toThrow("Invalid user name");
    expect(() => validateUserOptions({ name: "root", system: "debian" })).toThrow("cannot be root");
    expect(() => validateUserOptions({ name: "deploy", system: "debian", sshKey: "not a key" })).toThrow("SSH key");
    expect(() => validateUserOptions({ name: "deploy", system: "macos" })).toThrow("not available on macos");
  });

  test("creates the user, adds the group and installs the key without a shell string", () => {
    const key = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBy4x test@laptop";
    const steps = userCreatePlan({ name: "deploy", system: "ubuntu", sshKey: key });
    expect(steps.map((s) => s.id)).toEqual(["user", "group", "ssh-key"]);
    expect(describeCmd(steps[0]!.commands[0]!)).toBe("sudo useradd --create-home --shell /bin/bash --groups sudo deploy");
    const append = steps[2]!.commands[1]!;
    expect(append.argv.at(-1)).toBe(key);
    expect(append.argv[2]).not.toContain(key);
  });

  test("Arch uses the wheel group", () => {
    expect(describeCmd(userCreatePlan({ name: "dev", system: "arch" })[0]!.commands[0]!)).toContain("--groups wheel");
  });

  test("the sudo rule is validated with visudo before it is installed", () => {
    const step = nopasswdStep("deploy");
    expect(step.commands.map((c) => c.argv[0])).toEqual(["tee", "chmod", "visudo", "mv"]);
    expect(step.commands.at(-1)!.argv.at(-1)).toBe(sudoersPath("deploy"));
    expect(step.commands[0]!.input).toContain("deploy ALL=(ALL) NOPASSWD:ALL");
  });
});

describe("security module", () => {
  const base = { user: "deploy", userHasKey: true } as const;

  test("server opens the Swarm ports; desktop does not", () => {
    const serverPlan = commands(securityPlan({ ...base, system: "ubuntu", edition: "server", swarm: true }).steps).join("\n");
    for (const p of SWARM_PORTS) expect(serverPlan).toContain(`ufw allow ${p}`);
    const desktopPlan = commands(securityPlan({ ...base, system: "ubuntu", edition: "desktop", swarm: true }).steps).join("\n");
    expect(desktopPlan).not.toContain("2377/tcp");
  });

  test("SSH hardening only with an authorized key, validated with sshd -t", () => {
    const withKey = securityPlan({ ...base, system: "debian", edition: "server" });
    const ssh = withKey.steps.find((s) => s.id === "ssh-hardening")!;
    expect(ssh.commands[0]!.argv).toEqual(["tee", SSHD_DROPIN]);
    expect(ssh.commands[0]!.input).toContain("PasswordAuthentication no");
    expect(ssh.commands[1]!.argv).toEqual(["sshd", "-t"]);
    const noKey = securityPlan({ ...base, userHasKey: false, system: "debian", edition: "server" });
    expect(noKey.steps.some((s) => s.id === "ssh-hardening")).toBe(false);
    expect(noKey.skipped[0]!.part).toBe("ssh-hardening");
  });

  test("never turns password authentication on", () => {
    for (const userHasKey of [true, false]) {
      const plan = securityPlan({ ...base, userHasKey, system: "ubuntu", edition: "desktop" });
      for (const s of plan.steps) for (const c of s.commands) expect(c.input ?? "").not.toContain("PasswordAuthentication yes");
    }
  });

  test("Arch has no unattended upgrades; macOS and Windows are skipped", () => {
    const arch = securityPlan({ ...base, system: "arch", edition: "desktop" });
    expect(arch.steps.some((s) => s.id === "unattended-upgrades")).toBe(false);
    expect(securityPlan({ ...base, system: "macos", edition: "desktop" }).steps).toEqual([]);
  });

  test("time zone is set when given", () => {
    const plan = securityPlan({ ...base, system: "ubuntu", edition: "server", timezone: "America/Sao_Paulo" });
    expect(commands(plan.steps)).toContain("sudo timedatectl set-timezone America/Sao_Paulo");
  });
});

describe("commands", () => {
  const root = join(import.meta.dir, "../..");
  const run = (args: string[]) => {
    const p = Bun.spawnSync(["bun", "run", "desktop/src/main.ts", ...args], { cwd: root, env: { ...process.env, NO_COLOR: "1", SETUPVIBE_HOME: join(root, "node_modules", ".tmp-setupvibe-home") }, stdin: "ignore" });
    return { code: p.exitCode, stdout: p.stdout.toString(), stderr: p.stderr.toString() };
  };

  test("init --dry-run lists the plan and changes nothing", () => {
    const r = run(["init", "--dry-run", "--skip-network-check", "--json"]);
    expect(r.code).toBe(0);
    const data = JSON.parse(r.stdout).data;
    expect(data.dryRun).toBe(true);
    expect(data.steps.map((s: { id: string }) => s.id)).toContain("build-deps");
  });

  test("user create rejects an invalid name with USAGE", () => {
    expect(run(["user", "create", "Bad Name", "--dry-run"]).code).toBe(ExitCode.USAGE);
  });

  test("security apply --dry-run previews the module", () => {
    const r = run(["security", "apply", "--dry-run", "--json"]);
    expect(r.code).toBe(0);
    expect(JSON.parse(r.stdout).data.steps.map((s: { id: string }) => s.id)).toContain("ufw");
  });
});

describe("network retries", () => {
  test("retries a failing command with a growing wait, then succeeds", async () => {
    const { execWithRetries, retryDelayMs } = await import("../exec/runner");
    let calls = 0;
    const runner = { dryRun: false, exec: async () => ({ code: ++calls < 3 ? 128 : 0, stdout: "", stderr: "Could not resolve host" }) };
    const waits: number[] = [];
    const r = await execWithRetries({ argv: ["git", "clone"], retries: 3 }, runner, async (ms) => void waits.push(ms));
    expect(r.code).toBe(0);
    expect(calls).toBe(3);
    expect(waits).toEqual([retryDelayMs(1), retryDelayMs(2)]);
    expect(waits).toEqual([2000, 4000]);
  });

  test("commands without retries run once; dry runs never retry", async () => {
    const { execWithRetries } = await import("../exec/runner");
    let calls = 0;
    const failing = { dryRun: false, exec: async () => ({ code: ++calls && 1, stdout: "", stderr: "" }) };
    await execWithRetries({ argv: ["x"] }, failing, async () => {});
    expect(calls).toBe(1);
    calls = 0;
    await execWithRetries({ argv: ["x"], retries: 3 }, { ...failing, dryRun: true }, async () => {});
    expect(calls).toBe(1);
  });

  test("network install commands carry retries", () => {
    const ctx = { arch: "x64", inventory: desktop, home: HOME };
    expect(itemSteps(item(desktop, "node"), "ubuntu", ctx)[0]!.commands[0]!.retries).toBe(3);
    expect(itemSteps(item(desktop, "tpm"), "macos", ctx)[1]!.commands[0]!.retries).toBe(3);
    expect(nativeInstallCmd("debian", ["zsh"])[0]!.retries).toBe(3);
  });
});

describe("windows paths", () => {
  test("mise comes from the release .exe and lives in ~/.local/bin/mise.exe", async () => {
    const { miseCmd, miseSteps, miseAsset } = await import("../install/methods");
    expect(miseAsset("2026.11.6", "windows", "x64")).toBe("mise-v2026.11.6-windows-x64.exe");
    expect(miseCmd("C:\\Users\\u", "windows")).toEndWith("mise.exe");
    const steps = miseSteps(item(desktop, "mise"), "windows", "x64", "/home/u");
    expect(steps[0]!.skipIf).toBeUndefined();
    expect(steps[0]!.actionDescription).toContain("mise-v2026.11.6-windows-x64.exe");
  });

  test("checks run through cmd with a ; separated PATH on Windows", async () => {
    const { verifyCmd } = await import("../install/methods");
    const cmd = verifyCmd(item(desktop, "node"), "C:/Users/u", true);
    expect(cmd.argv.slice(0, 4)).toEqual(["cmd", "/d", "/s", "/c"]);
    expect(cmd.env!.PATH!.split(";").length).toBeGreaterThan(2);
    expect(verifyCmd(item(desktop, "node"), "/home/u", false).argv[0]).toBe("sh");
  });

  test("the wsl item installs the WSL base", () => {
    const sel = { items: [item(desktop, "wsl")], skipped: [] };
    const plan = autoPlan({ inventory: desktop, edition: "desktop", system: "windows", arch: "x64", variant: "local", user: "u", userHasKey: false, initDone: true, memoryGb: 8, answers: resolveAnswers({}, {}), selection: sel, createdNopasswd: false, home: "C:/Users/u" });
    expect(plan.steps.find((s) => s.id === "wsl")!.commands.map((c) => describeCmd(c))[0]).toBe("wsl.exe --install --no-distribution --web-download");
  });
});

describe("windows fixes from the first real run", () => {
  test("unsetEnv removes a variable regardless of case", async () => {
    const { commandEnv } = await import("../exec/runner");
    const env = commandEnv({ argv: ["x"], unsetEnv: ["PSModulePath"] }, { PSMODULEPATH: "C:/pwsh", Path: "C:/bin" });
    expect(env.PSMODULEPATH).toBeUndefined();
    expect(env.Path).toBe("C:/bin");
  });

  test("Windows installers run a downloaded .ps1 with -File", () => {
    const steps = itemSteps(item(desktop, "claude-code"), "windows", { arch: "x64", inventory: desktop, home: "C:/Users/u" });
    expect(steps[0]!.commands).toEqual([]);
    expect(steps[0]!.actionDescription).toContain("-File");
    expect(steps[0]!.actionDescription).toContain("https://claude.ai/install.ps1");
  });

  test("single-package WinGet items skip when their check passes", () => {
    const steps = itemSteps(item(desktop, "build-deps"), "windows", { arch: "x64", inventory: desktop, home: "C:/Users/u" });
    expect(steps[0]!.skipIf!.argv.slice(0, 4)).toEqual(["cmd", "/d", "/s", "/c"]);
    expect(steps[0]!.skipIf!.argv.at(-1)).toBe("git --version");
  });
});

describe("security remove", () => {
  const { securityRemovePlan, probeSecurity, FAIL2BAN_JAIL, AUTO_UPGRADES } = require("../security/record") as typeof import("../security/record");
  const { SSHD_DROPIN, securityPlan } = require("../security/plan") as typeof import("../security/plan");
  const { describeCmd, dryRunner } = require("../exec/runner") as typeof import("../exec/runner");

  test("the module records the previous state first", () => {
    const plan = securityPlan({ system: "debian", edition: "server", user: "dev", userHasKey: true });
    expect(plan.steps[0]!.id).toBe("security-record");
  });

  test("on a clean machine everything SetupVibe made is undone", () => {
    const steps = securityRemovePlan({ schemaVersion: 1, at: "", ufwActive: false, fail2banActive: false, existed: [] }, "/h/.setupvibe/state/security.json");
    const cmds = steps.flatMap((s) => s.commands.map(describeCmd));
    expect(cmds).toContain(`sudo rm -f ${SSHD_DROPIN}`);
    expect(cmds).toContain("sudo sshd -t");
    expect(cmds).toContain(`sudo rm -f ${FAIL2BAN_JAIL}`);
    expect(cmds).toContain("sudo systemctl disable --now fail2ban");
    expect(cmds).toContain(`sudo rm -f ${AUTO_UPGRADES}`);
    expect(cmds).toContain("sudo ufw --force disable");
    expect(cmds.at(-1)).toBe("rm -f /h/.setupvibe/state/security.json");
  });

  test("what existed before stays", () => {
    const steps = securityRemovePlan({ schemaVersion: 1, at: "", ufwActive: true, fail2banActive: true, existed: [SSHD_DROPIN, FAIL2BAN_JAIL, AUTO_UPGRADES] });
    const cmds = steps.flatMap((s) => s.commands.map(describeCmd));
    expect(cmds.some((c) => c.includes("rm -f /etc"))).toBe(false);
    expect(cmds.some((c) => c.includes("ufw"))).toBe(false);
    expect(cmds.some((c) => c.includes("disable --now fail2ban"))).toBe(false);
  });

  test("the probe reads UFW, fail2ban and the files", async () => {
    const runner = dryRunner({ "sudo ufw status": { stdout: "Status: active\n" }, "systemctl is-active fail2ban": { code: 3, stdout: "inactive\n" } });
    const r = await probeSecurity(runner, (p) => p === AUTO_UPGRADES);
    expect(r).toMatchObject({ ufwActive: true, fail2banActive: false, existed: [AUTO_UPGRADES] });
  });
});

describe("sudo check before a plan", () => {
  const { ensureSudo } = require("../commands/execute") as typeof import("../commands/execute");
  const { planNeedsSudo } = require("../exec/runner") as typeof import("../exec/runner");
  const root = typeof process.getuid === "function" && process.getuid() === 0;

  test("plans with sudo commands or sudo actions need the check", () => {
    expect(planNeedsSudo([{ id: "a", description: "", commands: [{ argv: ["true"] }] }])).toBe(false);
    expect(planNeedsSudo([{ id: "a", description: "", commands: [{ argv: ["apt-get"], sudo: true }] }])).toBe(true);
    expect(planNeedsSudo([{ id: "a", description: "", commands: [], actionSudo: true }])).toBe(true);
  });

  test.skipIf(root)("passwordless sudo passes; a terminal asks once; no terminal stops", () => {
    const calls: string[] = [];
    expect(ensureSudo(false, (a) => (calls.push(a[1]!), 0))).toBeUndefined();
    expect(ensureSudo(true, (a) => (calls.push(a[1]!), a[1] === "-v" ? 0 : 1))).toBeUndefined();
    expect(calls.at(-1)).toBe("-v");
    expect(ensureSudo(false, () => 1)).toContain("no terminal");
    expect(ensureSudo(true, () => 1)).toContain("did not accept");
  });
});
