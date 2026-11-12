/** Network settings, cache, Docker daemon, encrypted overlay, PM2 autostart, mise lock, inventory bump and SBOM (spec sections 6, 7, 11 and 17). */
import "../../desktop/src/edition.ts";
import { describe, expect, test } from "bun:test";
import desktopJson from "../../desktop/inventory.json";
import serverJson from "../../server/inventory.json";
import type { Inventory, Item } from "../inventory";
import { commandEnv, describeCmd, finalArgv } from "../exec/runner";
import { downloadCacheDir, networkEnv } from "../exec/network";
import { autoPlan, daemonSettings, swarmSteps, type AutoContext } from "../auto/plan";
import { resolveAnswers } from "../auto/answers";
import { selectItems } from "../auto/selection";
import { applyVersion, bumpTool } from "../../scripts/inventory-bump";
import { sbom } from "../../scripts/sbom";
import { fillRepoUrl } from "../../scripts/inventory-health";

const desktop = desktopJson as Inventory;
const server = serverJson as Inventory;
const item = (inv: Inventory, id: string) => inv.items.find((i) => i.id === id) as Item;

describe("network settings", () => {
  test("proxy variables get both cases; CA and cache reach every tool", () => {
    const env = networkEnv({ HTTPS_PROXY: "http://proxy:3128", no_proxy: "localhost", SETUPVIBE_CA_FILE: "/etc/ca.pem", SETUPVIBE_CACHE_DIR: "/cache" });
    expect(env.https_proxy).toBe("http://proxy:3128");
    expect(env.NO_PROXY).toBe("localhost");
    expect(env.NODE_EXTRA_CA_CERTS).toBe("/etc/ca.pem");
    expect(env.GIT_SSL_CAINFO).toBe("/etc/ca.pem");
    expect(env.MISE_CACHE_DIR).toBe("/cache/mise");
    expect(env.npm_config_cache).toBe("/cache/npm");
    expect(downloadCacheDir({ SETUPVIBE_CACHE_DIR: "/cache" })).toBe("/cache/downloads");
    expect(networkEnv({})).toEqual({});
  });

  test("commands, including sudo ones, carry the proxy", () => {
    const previous = process.env.HTTPS_PROXY;
    process.env.HTTPS_PROXY = "http://proxy:3128";
    try {
      expect(commandEnv({ argv: ["apt-get", "update"] }).https_proxy).toBe("http://proxy:3128");
      expect(finalArgv({ argv: ["apt-get", "update"], sudo: true }, false)).toContain("https_proxy=http://proxy:3128");
    } finally {
      if (previous === undefined) delete process.env.HTTPS_PROXY;
      else process.env.HTTPS_PROXY = previous;
    }
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
    initDone: true,
    memoryGb: 8,
    answers: resolveAnswers({}, {}),
    selection: selectItems({ inventory, system, headless: false, profile: "essencial" }),
    createdNopasswd: false,
    home: "/home/deploy",
    shell: false,
    ...overrides,
  };
}

describe("docker daemon", () => {
  test("log rotation everywhere, live-restore only on the desktop, existing keys kept", () => {
    expect(daemonSettings("desktop")).toEqual({ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" }, "live-restore": true });
    expect(daemonSettings("server")["live-restore"]).toBeUndefined();
    const merged = daemonSettings("server", { "data-root": "/srv/docker", "log-opts": { "max-size": "50m" } });
    expect(merged["data-root"]).toBe("/srv/docker");
    expect(merged["log-opts"]).toEqual({ "max-size": "50m", "max-file": "3" });
  });

  test("a native Docker install adds the daemon step", () => {
    const selection = selectItems({ inventory: server, system: "ubuntu", headless: true });
    const plan = autoPlan(ctx({ inventory: server, edition: "server", system: "ubuntu", selection }));
    expect(plan.steps.find((s) => s.id === "docker-daemon")!.description).toContain("log rotation");
  });
});

describe("swarm and pm2 options", () => {
  test("--encrypted-network encrypts the overlay network", () => {
    const steps = swarmSteps(resolveAnswers({ manager: true, "encrypted-network": true }, {}));
    expect(describeCmd(steps[1]!.commands[0]!)).toContain("--opt encrypted");
    expect(describeCmd(swarmSteps(resolveAnswers({ manager: true }, {}))[1]!.commands[0]!)).not.toContain("encrypted");
  });

  test("--pm2-autostart adds the systemd startup step", () => {
    const selection = selectItems({ inventory: desktop, system: "debian", headless: false, ids: ["pm2"] });
    const on = autoPlan(ctx({ selection, answers: resolveAnswers({ "pm2-autostart": true }, {}) }));
    expect(on.steps.find((s) => s.id === "pm2-autostart")!.commands[1]!.argv.join(" ")).toContain("startup systemd");
    expect(autoPlan(ctx({ selection })).steps.some((s) => s.id === "pm2-autostart")).toBe(false);
  });

  test("mise tools are locked once after their installs", () => {
    const plan = autoPlan(ctx());
    const ids = plan.steps.map((s) => s.id);
    expect(ids).toContain("mise-lock");
    expect(ids.indexOf("node")).toBeLessThan(ids.indexOf("mise-lock"));
    expect(describeCmd(plan.steps.find((s) => s.id === "mise-lock")!.commands[0]!)).toEndWith("lock --global");
  });
});

describe("inventory bump", () => {
  test("queries exact mise items, keeping series lines", () => {
    expect(bumpTool(item(desktop, "node"))).toBe("node@24");
    expect(bumpTool(item(desktop, "go"))).toBe("go");
    expect(bumpTool(item(desktop, "codex"))).toBe("npm:@openai/codex");
    expect(bumpTool(item(desktop, "php"))).toBeUndefined();
    expect(bumpTool(item(desktop, "spec-kit"))).toBeUndefined();
  });

  test("a new version updates the check expectation", () => {
    const next = applyVersion(item(desktop, "go"), "1.28.0");
    expect(next.version).toBe("1.28.0");
    expect(next.verify.expect).toBe("go1.28.0");
  });
});

describe("sbom and health helpers", () => {
  test("CycloneDX components for both editions", () => {
    const doc = sbom("2.0.0", [desktop, server], new Date("2026-11-12T00:00:00Z"));
    expect(doc.bomFormat).toBe("CycloneDX");
    expect(doc.components).toHaveLength(desktop.items.length + server.items.length);
    expect(doc.components.find((c) => c["bom-ref"] === "desktop:node")!.version).toBe(item(desktop, "node").version);
  });

  test("repository URLs are filled per distribution", () => {
    expect(fillRepoUrl("https://download.docker.com/linux/{distro}/gpg", "debian", "trixie")).toBe("https://download.docker.com/linux/debian/gpg");
  });
});
