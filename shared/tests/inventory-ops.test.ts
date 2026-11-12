/** list, install, remove and update operations (spec sections 5, 6 and 8). */
import "../../desktop/src/edition.ts";
import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import desktopJson from "../../desktop/inventory.json";
import type { Inventory, Item } from "../inventory";
import { describeCmd } from "../exec/runner";
import { selectItems } from "../auto/selection";
import { itemStatus } from "../commands/inventory";
import {
  dependentsOf,
  dropFromSelection,
  externalInstallStep,
  mergeSelection,
  MISE_TOOL,
  outdatedItems,
  removePlan,
  splitToolSpec,
} from "../ops/inventory-ops";
import { ExitCode } from "../core/app/exit-codes";

const desktop = desktopJson as Inventory;
const item = (id: string) => desktop.items.find((i) => i.id === id) as Item;
const HOME = "/home/test";

describe("selection.json helpers", () => {
  test("merge replaces items with the same id and keeps the list sorted", () => {
    const merged = mergeSelection([{ id: "node", version: "1" }, { id: "bat", version: "1" }], [{ id: "node", version: "2" }, { id: "go", version: "3" }]);
    expect(merged).toEqual([{ id: "bat", version: "1" }, { id: "go", version: "3" }, { id: "node", version: "2" }]);
    expect(dropFromSelection(merged, ["go"]).map((s) => s.id)).toEqual(["bat", "node"]);
  });

  test("outdated items are those whose inventory version changed", () => {
    const out = outdatedItems([{ id: "node", version: "24.0.0" }, { id: "go", version: item("go").version }], desktop);
    expect(out.map((o) => [o.item.id, o.from, o.to])).toEqual([["node", "24.0.0", item("node").version]]);
  });

  test("dependents block removal", () => {
    expect(dependentsOf("php", ["php", "composer", "laravel-installer"], desktop)).toEqual(["composer"]);
    expect(dependentsOf("go", ["go", "node"], desktop)).toEqual([]);
  });
});

describe("explicit selection", () => {
  test("install <items> pulls requirements in order", () => {
    const s = selectItems({ inventory: desktop, system: "ubuntu", headless: false, ids: ["laravel-installer"] });
    expect(s.items.map((i) => i.id)).toEqual(["php", "composer", "laravel-installer"]);
  });
});

describe("remove plan", () => {
  test("mise, Git, Composer and gem items are removed in the user's space", () => {
    const plan = removePlan([item("go"), item("tpm"), item("laravel-installer"), item("rails")], "ubuntu", { home: HOME });
    const cmds = plan.steps.map((s) => describeCmd(s.commands[0]!));
    expect(cmds[0]).toBe(`${HOME}/.local/bin/mise unuse --global --yes go`);
    expect(cmds[1]).toContain(`rm -rf ${HOME}/.tmux/plugins/tpm`);
    expect(plan.steps[1]!.commands[0]!.argv.length).toBe(3 + Object.keys(item("tpm").plugins!).length);
    expect(cmds[2]).toBe("composer global remove --no-interaction laravel/installer");
    expect(cmds[3]).toContain("gem uninstall rails");
    expect(plan.refused).toEqual([]);
  });

  test("scoped npm tools lose only the version", () => {
    const plan = removePlan([item("codex")], "debian", { home: HOME });
    expect(describeCmd(plan.steps[0]!.commands[0]!)).toEndWith("unuse --global --yes npm:@openai/codex");
  });

  test("system packages need --include-native", () => {
    expect(removePlan([item("docker")], "debian").refused[0]!.reason).toContain("--include-native");
    const native = removePlan([item("docker")], "debian", { includeNative: true });
    expect(describeCmd(native.steps[0]!.commands[0]!)).toStartWith("sudo apt-get remove -y docker-ce");
    expect(describeCmd(removePlan([item("tmux")], "arch", { includeNative: true }).steps[0]!.commands[0]!)).toBe("sudo pacman -Rns --noconfirm tmux");
  });

  test("init items, preinstalled items and vendor installers are refused", () => {
    const plan = removePlan([item("mise"), item("herdr"), item("claude-code")], "omarchy");
    expect(plan.steps).toEqual([]);
    expect(plan.refused.map((r) => r.id)).toEqual(["mise", "herdr", "claude-code"]);
  });
});

describe("apps outside the inventory", () => {
  test("tool specs", () => {
    expect(splitToolSpec("terraform@1.13.4")).toEqual({ tool: "terraform", version: "1.13.4" });
    expect(splitToolSpec("terraform")).toEqual({ tool: "terraform" });
    expect(splitToolSpec("npm:@scope/pkg@1.0.0")).toEqual({ tool: "npm:@scope/pkg", version: "1.0.0" });
    expect(splitToolSpec("npm:@scope/pkg")).toEqual({ tool: "npm:@scope/pkg" });
    expect(MISE_TOOL.test("aqua:hashicorp/terraform@1.13.4")).toBe(true);
    expect(MISE_TOOL.test("rm -rf /")).toBe(false);
  });

  test("external installs pin the version", () => {
    expect(describeCmd(externalInstallStep("terraform", "1.13.4", HOME).commands[0]!)).toBe(`${HOME}/.local/bin/mise use --global --yes terraform@1.13.4`);
  });
});

describe("status", () => {
  test("per system, selection and headless", () => {
    expect(itemStatus(item("herdr"), "omarchy", false, [])).toBe("system");
    expect(itemStatus(item("php"), "windows", false, [])).toBe("unavailable");
    expect(itemStatus(item("mise"), "debian", false, [])).toBe("init");
    expect(itemStatus(item("nerd-fonts"), "debian", true, [])).toBe("gui");
    expect(itemStatus(item("go"), "debian", false, [{ id: "go", version: item("go").version }])).toBe("installed");
    expect(itemStatus(item("go"), "debian", false, [{ id: "go", version: "1.0.0" }])).toBe("outdated");
    expect(itemStatus(item("go"), "debian", false, [{ id: "go", version: item("go").version, status: "fail" }])).toBe("failed");
  });
});

describe("commands", () => {
  const root = join(import.meta.dir, "../..");
  const run = (args: string[]) => {
    const p = Bun.spawnSync(["bun", "run", "desktop/src/main.ts", ...args], { cwd: root, env: { ...process.env, NO_COLOR: "1", SETUPVIBE_HOME: join(root, "node_modules", ".tmp-setupvibe-ops") }, stdin: "ignore" });
    return { code: p.exitCode, stdout: p.stdout.toString() };
  };

  test("list --json returns every item with a status", () => {
    const r = run(["list", "--json"]);
    expect(r.code).toBe(0);
    const items = JSON.parse(r.stdout).data.items as { id: string; status: string }[];
    expect(items.length).toBe(desktop.items.length);
    expect(items.every((i) => i.status)).toBe(true);
  });

  test("install refuses to run before init", () => {
    expect(run(["install", "go", "--dry-run"]).code).toBe(ExitCode.CONFIG);
  });

  test("remove asks for --yes when there is no terminal", () => {
    expect(run(["remove", "go"]).code).toBe(ExitCode.USAGE);
  });

  test("remove refuses unknown items", () => {
    expect(run(["remove", "nope", "--yes"]).code).toBe(ExitCode.USAGE);
  });
});
