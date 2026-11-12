/** Mouse and the language switch of the TUI (tasks 14 and the PT · EN request). */
import "../../desktop/src/edition.ts";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTestRenderer, type TestRendererSetup } from "@opentui/core/testing";
import { HOME_VARIABLE } from "../core/config/paths";
import { mountTui } from "../core/tui/index";
describe("mouse and language", () => {
  let dir: string;
  let setup: TestRendererSetup;
  let closed: Promise<void>;
  const find = (text: string, last = false) => {
    const lines = setup.captureCharFrame().split("\n");
    const y = last ? lines.findLastIndex((l) => l.includes(text)) : lines.findIndex((l) => l.includes(text));
    if (y < 0) throw new Error(`not on screen: ${text}`);
    return { x: lines[y]!.indexOf(text), y };
  };
  const click = async (text: string, dx = 0, last = false) => {
    const p = find(text, last);
    await setup.mockMouse.click(p.x + dx, p.y);
    await setup.renderOnce();
  };

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), "sv-mouse-"));
    process.env[HOME_VARIABLE] = dir;
    delete process.env.SETUPVIBE_LANG;
    setup = await createTestRenderer({ width: 140, height: 40 });
    closed = mountTui(setup.renderer, {});
    await setup.renderOnce();
  });
  afterAll(async () => {
    setup.renderer.destroy();
    await closed.catch(() => undefined);
    rmSync(dir, { recursive: true, force: true });
    delete process.env[HOME_VARIABLE];
  });

  test("Portuguese is the default and the header switch changes the language", async () => {
    expect(setup.captureCharFrame()).toContain("1 Início");
    expect(setup.captureCharFrame()).toContain("[PT]");
    await click("EN", 0);
    expect(setup.captureCharFrame()).toContain("1 Home");
    expect(setup.captureCharFrame()).toContain("[EN]");
    expect(readFileSync(join(dir, "settings.json"), "utf8")).toContain('"language": "en"');
  });

  test("L switches back and keeps the tab", async () => {
    setup.mockInput.pressKey("3");
    await setup.renderOnce();
    setup.mockInput.pressKey("L");
    await setup.renderOnce();
    expect(setup.captureCharFrame()).toContain("[PT]");
    expect(setup.captureCharFrame()).toContain("Checklist");
  });

  test("a click on a tab opens it", async () => {
    await click("2 Inventário");
    expect(setup.captureCharFrame()).toContain("Categorias");
  });

  test("clicks select a category and mark an item on the marker column", async () => {
    await click("Linguagens");
    expect(setup.captureCharFrame()).toContain("Node.js");
    const node = find("Node.js");
    await setup.mockMouse.click(node.x - 4, node.y);
    await setup.renderOnce();
    expect(setup.captureCharFrame()).toContain("1 marcados");
    await setup.mockMouse.click(node.x + 2, node.y);
    await setup.renderOnce();
    expect(setup.captureCharFrame()).toContain("1 marcados");
    expect(setup.captureCharFrame()).toContain("i  Instalar");
  });

  test("a key in the status bar acts like the key; a click outside closes the help", async () => {
    await click(" ? ", 1, true);
    expect(setup.captureCharFrame()).toContain("Teclas");
    await click("Categorias");
    expect(setup.captureCharFrame()).not.toContain("troca o idioma");
  });
});
