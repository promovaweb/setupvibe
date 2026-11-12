/** setupvibe auto: answers, selection, plan, lock and command (spec section 9). */
import "../../desktop/src/edition.ts";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import desktopJson from "../../desktop/inventory.json";
import serverJson from "../../server/inventory.json";
import type { Inventory } from "../inventory";
import { describeCmd } from "../exec/runner";
import { readAnswersFile, resolveAnswers } from "../auto/answers";
import { orderByRequirements, selectItems } from "../auto/selection";
import { autoPlan, securityApplies, swapSizeGb, swarmSteps, type AutoContext } from "../auto/plan";
import { childArgs, selfArgv } from "../commands/auto";
import { acquireLock, processAlive } from "../state/lock";
import { HOME_VARIABLE } from "../core/config/paths";
import { ExitCode } from "../core/app/exit-codes";

const desktop = desktopJson as Inventory;
const server = serverJson as Inventory;
const ids = (items: { id: string }[]) => items.map((i) => i.id);

describe("answers", () => {
  test("options win over variables, variables over the file", () => {
    const a = resolveAnswers({ user: "opt" }, { SETUPVIBE_USER: "env", SETUPVIBE_PROFILE: "remoto" }, { user: "file", profile: "essencial", git: { name: "File Name" } });
    expect(a.user).toBe("opt");
    expect(a.profile).toBe("remoto");
    expect(a.gitName).toBe("File Name");
  });

  test("lists, flags and secrets", () => {
    const a = resolveAnswers({ exclude: "docker, go", reboot: true }, { SETUPVIBE_KEEP_NOPASSWD: "1", TAILSCALE_AUTHKEY: "tskey-x", GH_TOKEN: "ghp" });
    expect(a.exclude).toEqual(["docker", "go"]);
    expect(a.reboot).toBe(true);
    expect(a.keepNopasswd).toBe(true);
    expect(a.tailscaleAuthKey).toBe("tskey-x");
    expect(a.manager).toBe(false);
  });

  test("the answers file refuses secrets", () => {
    const dir = mkdtempSync(join(tmpdir(), "sv-answers-"));
    const ok = join(dir, "ok.json");
    const bad = join(dir, "bad.json");
    writeFileSync(ok, JSON.stringify({ user: "deploy", exclude: ["docker"] }));
    writeFileSync(bad, JSON.stringify({ user: "deploy", tailscaleAuthKey: "tskey" }));
    expect(readAnswersFile(ok).exclude).toEqual(["docker"]);
    expect(() => readAnswersFile(bad)).toThrow("must not contain secrets");
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("selection", () => {
  test("without a profile, everything installable on the system", () => {
    const s = selectItems({ inventory: desktop, system: "debian", headless: false });
    expect(ids(s.items)).toContain("docker");
    expect(ids(s.items)).toContain("nerd-fonts");
    expect(ids(s.items)).not.toContain("mise");
    expect(s.skipped.find((x) => x.id === "windows-essentials")?.reason).toBe("Windows only.");
  });

  test("headless machines drop GUI items", () => {
    const s = selectItems({ inventory: desktop, system: "debian", headless: true });
    expect(ids(s.items)).not.toContain("nerd-fonts");
    expect(s.skipped.find((x) => x.id === "nerd-fonts")?.reason).toContain("headless");
  });

  test("Omarchy skips what it already ships", () => {
    const s = selectItems({ inventory: desktop, system: "omarchy", headless: false });
    for (const id of ["herdr", "starship", "bat", "docker"]) expect(ids(s.items)).not.toContain(id);
    expect(s.skipped.find((x) => x.id === "herdr")?.reason).toBe("already part of omarchy");
  });

  test("profiles, --only, --exclude and requirements", () => {
    const s = selectItems({ inventory: desktop, system: "ubuntu", headless: false, profile: "essencial", only: ["laravel-installer"], exclude: ["nerd-fonts"] });
    expect(ids(s.items)).toContain("laravel-installer");
    expect(ids(s.items)).toContain("composer");
    expect(ids(s.items)).not.toContain("nerd-fonts");
    expect(ids(s.items)).not.toContain("docker");
    expect(() => selectItems({ inventory: desktop, system: "ubuntu", headless: false, only: ["nope"] })).toThrow("Unknown inventory item");
  });

  test("requirements come first", () => {
    const s = selectItems({ inventory: desktop, system: "ubuntu", headless: false, profile: "essencial", only: ["rails"] });
    const order = ids(s.items);
    expect(order.indexOf("ruby")).toBeLessThan(order.indexOf("bundler"));
    expect(order.indexOf("bundler")).toBeLessThan(order.indexOf("rails"));
    expect(order.indexOf("php")).toBeLessThan(order.indexOf("composer"));
  });

  test("cycles are reported", () => {
    const a = { id: "a", requires: ["b"] } as never;
    const b = { id: "b", requires: ["a"] } as never;
    expect(() => orderByRequirements([a, b], new Map([["a", a], ["b", b]]))).toThrow("cycle");
  });
});

function ctx(overrides: Partial<AutoContext> = {}): AutoContext {
  const inventory = overrides.inventory ?? desktop;
  const system = overrides.system ?? "debian";
  return {
    inventory,
    edition: "desktop",
    system,
    arch: "x64",
    distro: { distro: "debian", codename: "trixie" },
    variant: "local",
    user: "deploy",
    userHasKey: true,
    initDone: false,
    memoryGb: 8,
    answers: resolveAnswers({}, {}),
    selection: selectItems({ inventory, system, headless: false, profile: "essencial" }),
    createdNopasswd: false,
    home: "/home/deploy",
    ...overrides,
  };
}

describe("plan", () => {
  test("starts with init when it was not done, and refreshes the index otherwise", () => {
    expect(autoPlan(ctx()).steps.map((s) => s.id).slice(0, 3)).toEqual(["package-index", "build-deps", "mise"]);
    expect(autoPlan(ctx({ initDone: true })).steps.map((s) => s.id).slice(0, 2)).toEqual(["package-index", "sshpass"]);
  });

  test("security module: always on the server, on exposed desktops, or when selected", () => {
    const sel = selectItems({ inventory: desktop, system: "debian", headless: true, profile: "essencial" });
    expect(securityApplies("server", "local", sel)).toBe(true);
    expect(securityApplies("desktop", "remote-exposed", sel)).toBe(true);
    expect(securityApplies("desktop", "remote-headless", sel)).toBe(false);
    const remoto = selectItems({ inventory: desktop, system: "debian", headless: true, profile: "remoto" });
    expect(securityApplies("desktop", "remote-headless", remoto)).toBe(true);
    expect(autoPlan(ctx({ variant: "remote-exposed" })).steps.some((s) => s.id === "ufw")).toBe(true);
    expect(autoPlan(ctx()).steps.some((s) => s.id === "ufw")).toBe(false);
  });

  test("remoto adds lingering and a swap file on small machines", () => {
    const selection = selectItems({ inventory: desktop, system: "debian", headless: true, profile: "remoto" });
    const small = autoPlan(ctx({ selection, memoryGb: 1, variant: "remote-headless" }));
    expect(small.steps.find((s) => s.id === "linger")?.commands.map(describeCmd)).toEqual(["sudo loginctl enable-linger deploy"]);
    expect(small.steps.find((s) => s.id === "swap")?.description).toBe("Create a 2 GB swap file");
    expect(autoPlan(ctx({ selection, memoryGb: 16 })).steps.some((s) => s.id === "swap")).toBe(false);
    expect(swapSizeGb(3)).toBe(4);
  });

  test("Git identity, Tailscale login and the temporary sudo rule", () => {
    const selection = selectItems({ inventory: desktop, system: "debian", headless: false, profile: "essencial", only: ["tailscale"] });
    const plan = autoPlan(ctx({ selection, answers: resolveAnswers({ "git-name": "Ana", "git-email": "ana@example.com" }, { TAILSCALE_AUTHKEY: "tskey-1" }), createdNopasswd: true }));
    const stepIds = plan.steps.map((s) => s.id);
    expect(stepIds).toContain("git-identity");
    const up = plan.steps.find((s) => s.id === "tailscale-up")!;
    expect(describeCmd(up.commands[0]!)).not.toContain("tskey-1");
    expect(stepIds.at(-1)).toBe("sudo-nopasswd-remove");
    const kept = autoPlan(ctx({ createdNopasswd: true, answers: resolveAnswers({ "keep-nopasswd": true }, {}) }));
    expect(kept.steps.some((s) => s.id === "sudo-nopasswd-remove")).toBe(false);
  });

  test("Portainer listens on 127.0.0.1 on remote machines", () => {
    const selection = selectItems({ inventory: desktop, system: "debian", headless: true, profile: "essencial", only: ["portainer"] });
    const remote = autoPlan(ctx({ selection, variant: "remote-exposed" })).steps.find((s) => s.id === "portainer")!;
    expect(remote.commands[1]!.input).toContain('"127.0.0.1:9443:9443"');
    const local = autoPlan(ctx({ selection })).steps.find((s) => s.id === "portainer")!;
    expect(local.commands[1]!.input).toContain('"9443:9443"');
    expect(local.commands[1]!.input).toContain("portainer/portainer-ce:2.45.3");
  });

  test("server: Swarm init or join, with the token kept out of the argv", () => {
    const init = swarmSteps(resolveAnswers({ manager: true, "advertise-addr": "10.0.0.5" }, {}));
    expect(init.map((s) => s.id)).toEqual(["swarm-init", "swarm-network"]);
    expect(describeCmd(init[0]!.commands[0]!)).toBe("sudo docker swarm init --advertise-addr 10.0.0.5");
    const join = swarmSteps(resolveAnswers({ "advertise-addr": "10.0.0.5:2377" }, { SETUPVIBE_SWARM_TOKEN: "SWMTKN-secret" }));
    expect(describeCmd(join[0]!.commands[0]!)).not.toContain("SWMTKN-secret");
    expect(() => swarmSteps(resolveAnswers({}, { SETUPVIBE_SWARM_TOKEN: "x" }))).toThrow("--advertise-addr");
    expect(swarmSteps(resolveAnswers({}, {}))).toEqual([]);
  });

  test("the server plan applies security and opens the Swarm ports for a manager", () => {
    const selection = selectItems({ inventory: server, system: "ubuntu", headless: true });
    const plan = autoPlan(ctx({ inventory: server, edition: "server", system: "ubuntu", selection, answers: resolveAnswers({ manager: true }, {}) }));
    const all = plan.steps.flatMap((s) => s.commands.map(describeCmd)).join("\n");
    expect(all).toContain("ufw allow 2377/tcp");
    expect(plan.steps.map((s) => s.id)).toContain("swarm-init");
  });
});

describe("re-run helpers", () => {
  test("child arguments drop the root-only options", () => {
    expect(childArgs(["auto", "--user", "deploy", "--ssh-key=ssh-ed25519 AAAA", "--profile", "remoto", "--json"])).toEqual(["auto", "--profile", "remoto", "--json"]);
  });

  test("self argv from source and compiled", () => {
    expect(selfArgv(["/usr/bin/bun", "/repo/desktop/src/main.ts", "auto"])).toEqual(["/usr/bin/bun", "/repo/desktop/src/main.ts"]);
    expect(selfArgv(["/usr/local/bin/setupvibe", "/$bunfs/root/setupvibe", "auto"])).toEqual(["/usr/local/bin/setupvibe"]);
  });
});

describe("lock", () => {
  let dir: string;
  const previous = process.env[HOME_VARIABLE];
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "sv-lock-"));
    process.env[HOME_VARIABLE] = dir;
  });
  afterAll(() => {
    if (previous === undefined) delete process.env[HOME_VARIABLE];
    else process.env[HOME_VARIABLE] = previous;
    rmSync(dir, { recursive: true, force: true });
  });

  test("a live owner blocks a second run; a dead one is taken over", () => {
    const release = acquireLock();
    expect(release).toBeDefined();
    expect(acquireLock(process.pid + 1_000_000)).toBeUndefined();
    release!();
    writeFileSync(join(dir, "run.lock"), "999999999");
    expect(processAlive(999999999)).toBe(false);
    const again = acquireLock();
    expect(readFileSync(join(dir, "run.lock"), "utf8")).toBe(String(process.pid));
    again!();
  });
});

describe("command", () => {
  const root = join(import.meta.dir, "../..");
  const run = (entry: string, args: string[]) => {
    const p = Bun.spawnSync(["bun", "run", entry, ...args], { cwd: root, env: { ...process.env, NO_COLOR: "1", SETUPVIBE_HOME: join(root, "node_modules", ".tmp-setupvibe-home") }, stdin: "ignore" });
    return { code: p.exitCode, stdout: p.stdout.toString() };
  };

  test("auto --dry-run lists the whole plan", () => {
    const r = run("desktop/src/main.ts", ["auto", "--dry-run", "--json"]);
    expect(r.code).toBe(0);
    const data = JSON.parse(r.stdout).data;
    expect(data.dryRun).toBe(true);
    expect(data.items).toContain("node");
  });

  test("auto --plan writes the plan to a file", () => {
    const file = join(root, "node_modules", ".tmp-setupvibe-plan.json");
    expect(run("server/src/main.ts", ["auto", "--plan", file, "--manager"]).code).toBe(0);
    expect(JSON.parse(readFileSync(file, "utf8")).steps.map((s: { id: string }) => s.id)).toContain("swarm-init");
  });

  test("unknown items are a usage error", () => {
    expect(run("desktop/src/main.ts", ["auto", "--dry-run", "--only", "nope"]).code).toBe(ExitCode.USAGE);
  });
});
