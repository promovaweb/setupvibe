import "../../desktop/src/edition.ts";
/**
 * Inventory filter and mark-all, the theme switch and the help with the keys
 * of the open module.
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTestRenderer, type TestRendererSetup } from "@opentui/core/testing";
import { HOME_VARIABLE } from "../core/config/paths.ts";
import { mountTui } from "../core/tui/index.ts";
import { passesFilter } from "../tui/screens.ts";
import type { InventoryRow } from "../tui/model.ts";

const row = (status: string, gui = false) => ({ status, item: { id: status, gui } }) as unknown as InventoryRow;

describe("passesFilter", () => {
  test("actionable keeps what can still be installed; problems keeps failed and outdated", () => {
    expect(passesFilter(row("available"), "actionable")).toBe(true);
    expect(passesFilter(row("installed"), "actionable")).toBe(false);
    expect(passesFilter(row("unavailable"), "actionable")).toBe(false);
    expect(passesFilter(row("outdated"), "installed")).toBe(true);
    expect(passesFilter(row("available"), "installed")).toBe(false);
    expect(passesFilter(row("failed"), "problems")).toBe(true);
    expect(passesFilter(row("installed"), "problems")).toBe(false);
    expect(passesFilter(row("system"), "all")).toBe(true);
  });
});

describe("TUI features", () => {
  let dir: string;
  let setup: TestRendererSetup;
  let closed: Promise<void>;
  const frame = () => setup.captureCharFrame();
  const press = async (key: string) => {
    setup.mockInput.pressKey(key);
    await setup.renderOnce();
  };

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), "sv-features-"));
    process.env[HOME_VARIABLE] = dir;
    process.env.SETUPVIBE_LANG = "en";
    setup = await createTestRenderer({ width: 140, height: 40 });
    closed = mountTui(setup.renderer, {});
    await setup.renderOnce();
    await press("1");
    await press("l");
  });

  afterAll(async () => {
    setup.renderer.destroy();
    await closed.catch(() => undefined);
    rmSync(dir, { recursive: true, force: true });
    delete process.env[HOME_VARIABLE];
    delete process.env.SETUPVIBE_LANG;
  });

  test("s cycles the status filter and the title shows it", async () => {
    await press("s");
    expect(frame()).toMatch(/to install/);
    await press("s");
    await press("s");
    expect(frame()).toMatch(/with problems|no item in this filter/);
    await press("s");
    expect(frame()).not.toMatch(/to install ·|with problems ·/);
  });

  test("a marks every tool that can still be installed, and a again clears them", async () => {
    await press("a");
    expect(frame()).toMatch(/\d+ marked/);
    await press("a");
    expect(frame()).not.toMatch(/\d+ marked/);
  });

  test("the help lists the keys of the open module first", async () => {
    await press("?");
    const f = frame();
    expect(f).toContain("Keys of this module");
    expect(f).toContain("mark all");
    expect(f).toContain("switch the theme");
    await press("?");
  });

  test("T switches to the light palette and saves it in settings.json", async () => {
    setup.mockInput.pressKey("t", { shift: true } as never);
    await setup.renderOnce();
    const settings = JSON.parse(readFileSync(join(dir, "settings.json"), "utf8"));
    expect(settings.tui.theme).toBe("day");
    setup.mockInput.pressKey("t", { shift: true } as never);
    await setup.renderOnce();
    expect(JSON.parse(readFileSync(join(dir, "settings.json"), "utf8")).tui.theme).toBe("night");
  });
});
