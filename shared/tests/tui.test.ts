/** SetupVibe TUI: inventory model, checklist, doctor and the rendered screens (spec section 10). */
import "../../desktop/src/edition.ts";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTestRenderer, type TestRendererSetup } from "@opentui/core/testing";
import desktopJson from "../../desktop/inventory.json";
import type { Inventory } from "../inventory";
import { doctorFindings, inventoryModel, markable, planFromEnvelope, rowLabel, userChecklist } from "../tui/model";
import { HOME_VARIABLE } from "../core/config/paths";
import { mountTui } from "../core/tui/index";

const desktop = desktopJson as Inventory;

describe("inventory model", () => {
  test("one category per inventory category, with statuses", () => {
    const model = inventoryModel(desktop, "omarchy", false, [{ id: "go", version: desktop.items.find((i) => i.id === "go")!.version }]);
    expect(model.map((c) => c.id)).toEqual(desktop.categories.map((c) => c.id));
    const ai = model.find((c) => c.id === "ai")!;
    expect(ai.title).toBe("Agentes de IA");
    expect(ai.rows.find((r) => r.item.id === "herdr")!.status).toBe("system");
    expect(model.find((c) => c.id === "languages")!.rows.find((r) => r.item.id === "go")!.status).toBe("installed");
  });

  test("rows show the mark, the status and the pinned version", () => {
    const row = inventoryModel(desktop, "debian", false, [], "pt-BR", () => undefined).find((c) => c.id === "languages")!.rows.find((r) => r.item.id === "node")!;
    expect(rowLabel(row, true)).toStartWith("[x] ○ node");
    expect(rowLabel(row, false)).toContain("24.22.3");
    expect(row.method).toBe("mise node");
  });

  test("an item found outside the mise folders shows other and its path", () => {
    const rows = inventoryModel(desktop, "debian", false, [], "pt-BR", (i) => (i.id === "node" ? "/usr/bin/node" : undefined)).find((c) => c.id === "languages")!.rows;
    const node = rows.find((r) => r.item.id === "node")!;
    expect(node.status).toBe("other");
    expect(node.elsewhere).toBe("/usr/bin/node");
    expect(rowLabel(node, false)).toContain("◐");
  });

  test("the installed version comes from the selection", () => {
    const rows = inventoryModel(desktop, "debian", false, [{ id: "node", version: "24.0.0" }], "pt-BR", () => undefined).find((c) => c.id === "languages")!.rows;
    expect(rows.find((r) => r.item.id === "node")!.installed).toBe("24.0.0");
  });

  test("the plan preview reads the dry-run envelope", () => {
    expect(planFromEnvelope(JSON.stringify({ data: { steps: [{ id: "a", description: "Install Node.js" }, { id: "b" }] } }))).toEqual(["• Install Node.js", "• b"]);
    expect(planFromEnvelope("not json")).toEqual([]);
  });

  test("the user checklist warns about the agent aliases", () => {
    const on = userChecklist({ groups: ["sudo"], sudoNoPassword: true, initDone: true });
    expect(on.at(-1)!.ok).toBe(false);
    expect(userChecklist({ groups: ["sudo"], sudoNoPassword: true, initDone: true, agentAliases: false }).at(-1)!.ok).toBe(true);
  });

  test("system, init and unavailable items cannot be marked", () => {
    const rows = inventoryModel(desktop, "windows", false, []).flatMap((c) => c.rows);
    expect(markable(rows.find((r) => r.item.id === "php")!)).toBe(false);
    expect(markable(rows.find((r) => r.item.id === "mise")!)).toBe(false);
    expect(markable(rows.find((r) => r.item.id === "node")!)).toBe(true);
  });
});

describe("user checklist", () => {
  test("groups, sudo, folders and init", () => {
    const home = mkdtempSync(join(tmpdir(), "sv-user-"));
    mkdirSync(join(home, ".setupvibe"), { mode: 0o700 });
    mkdirSync(join(home, ".local", "bin"), { recursive: true });
    const entries = userChecklist({ groups: ["deploy", "sudo"], sudoNoPassword: false, home, path: `${home}/.local/bin:/usr/bin`, initDone: true });
    const byLabel = Object.fromEntries(entries.map((e) => [e.label, e.ok]));
    expect(byLabel["sudo or wheel group"]).toBe(true);
    expect(byLabel["sudo without password"]).toBe(false);
    expect(byLabel["~/.setupvibe is 700"]).toBe(true);
    expect(byLabel["~/.local/bin in PATH"]).toBe(true);
    expect(byLabel["init completed"]).toBe(true);
    rmSync(home, { recursive: true, force: true });
  });
});

describe("doctor", () => {
  test("reports pending init, failing and outdated items with the fix", () => {
    const findings = doctorFindings(desktop, undefined, [{ id: "go", version: "1.0.0" }, { id: "node", version: "24.22.3", status: "fail" }]);
    expect(findings.map((f) => f.level)).toEqual(["fail", "warn", "warn"]);
    expect(findings[0]!.fix).toBe("setupvibe init");
    expect(findings[1]!.fix).toBe("setupvibe install node --force");
    expect(findings[2]!.fix).toBe("setupvibe update");
  });
});

describe("screens", () => {
  let dir: string;
  let setup: TestRendererSetup;
  let closed: Promise<void>;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), "sv-tui-"));
    process.env[HOME_VARIABLE] = dir;
    process.env.SETUPVIBE_LANG = "en";
    mkdirSync(join(dir, "logs"), { recursive: true });
    writeFileSync(join(dir, "logs", "2026-11-12T10-00-00-000Z-auto.log"), `${JSON.stringify({ time: "2026-11-12T10:00:01.000Z", item: "node", action: "install", status: "ok" })}\n`);
    setup = await createTestRenderer({ width: 140, height: 36 });
    closed = mountTui(setup.renderer, {});
    await setup.renderOnce();
  });
  afterAll(async () => {
    setup.renderer.destroy();
    await closed.catch(() => undefined);
    rmSync(dir, { recursive: true, force: true });
    delete process.env[HOME_VARIABLE];
    delete process.env.SETUPVIBE_LANG;
  });

  test("home: a bento grid with one card per module and the next step", () => {
    const frame = setup.captureCharFrame();
    for (const text of ["1 Inventory", "2 User", "3 Doctor", "4 Logs", "5 Tailscale", "6 Machine", "7 About", "→"]) expect(frame).toContain(text);
    expect(frame).not.toContain("▬▬▬");
  });

  test("inventory: opened with 1, categories, columns, marking and details; Esc goes back", async () => {
    setup.mockInput.pressKey("1");
    await setup.renderOnce();
    let frame = setup.captureCharFrame();
    expect(frame).toContain("› Inventory");
    expect(frame).toContain("Categories");
    expect(frame).toContain("c · Categories");
    setup.mockInput.pressKey("l");
    await setup.renderOnce();
    expect(setup.captureCharFrame()).toContain("Node.js");
    setup.mockInput.pressKey(" ");
    await setup.renderOnce();
    frame = setup.captureCharFrame();
    expect(frame).toContain("●");
    expect(frame).toContain("1 marked");
    expect(frame).toContain("24.22.3 (exact)");
    setup.mockInput.pressEscape();
    await Bun.sleep(60);
    await setup.renderOnce();
    expect(setup.captureCharFrame()).toContain("6 Machine");
  });

  test("user, doctor, logs and machine render", async () => {
    setup.mockInput.pressKey("2");
    await setup.renderOnce();
    expect(setup.captureCharFrame()).toContain("Permissions");
    setup.mockInput.pressKey("3");
    await setup.renderOnce();
    expect(setup.captureCharFrame()).toContain("Problems");
    setup.mockInput.pressKey("4");
    await setup.renderOnce();
    expect(setup.captureCharFrame()).toContain("12/11 10:00  auto");
    setup.mockInput.pressKey("6");
    await setup.renderOnce();
    const frame = setup.captureCharFrame();
    expect(frame).toContain("Processes");
    expect(frame).toContain("Disks");
    setup.mockInput.pressEscape();
    await Bun.sleep(60);
    await setup.renderOnce();
  });
});
