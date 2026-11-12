/** SetupVibe TUI: inventory model, checklist, doctor and the rendered screens (spec section 10). */
import "../../desktop/src/edition.ts";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTestRenderer, type TestRendererSetup } from "@opentui/core/testing";
import desktopJson from "../../desktop/inventory.json";
import type { Inventory } from "../inventory";
import { doctorFindings, inventoryModel, markable, rowLabel, userChecklist } from "../tui/model";
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
    const row = inventoryModel(desktop, "debian", false, []).find((c) => c.id === "languages")!.rows.find((r) => r.item.id === "node")!;
    expect(rowLabel(row, true)).toStartWith("[x] ○ node");
    expect(rowLabel(row, false)).toContain("24.22.3");
    expect(row.method).toBe("mise node");
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
  });

  test("inventory: categories, items, marking and category switch", async () => {
    let frame = setup.captureCharFrame();
    expect(frame).toContain("Categories");
    expect(frame).toContain("sshpass");
    setup.mockInput.pressKey("l");
    await setup.renderOnce();
    frame = setup.captureCharFrame();
    expect(frame).toContain("node");
    setup.mockInput.pressKey(" ");
    await setup.renderOnce();
    expect(setup.captureCharFrame()).toContain("[x]");
    expect(setup.captureCharFrame()).toContain("Version 24.22.3");
  });

  test("user, doctor and logs tabs render", async () => {
    setup.mockInput.pressKey("2");
    await setup.renderOnce();
    expect(setup.captureCharFrame()).toContain("Checklist");
    setup.mockInput.pressKey("3");
    await setup.renderOnce();
    expect(setup.captureCharFrame()).toContain("Prerequisites pending");
    setup.mockInput.pressKey("4");
    await setup.renderOnce();
    const frame = setup.captureCharFrame();
    expect(frame).toContain("2026-11-12T10-00-00-000Z-auto.log");
    expect(frame).toContain("install node");
  });
});
