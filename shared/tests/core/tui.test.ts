import "../../../desktop/src/edition.ts";
/** Mounts the TUI on the OpenTUI test renderer and checks tabs by frame. */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTestRenderer, type TestRendererSetup } from "@opentui/core/testing";
import { HOME_VARIABLE } from "../../core/config/paths.ts";
import { manifest } from "../../core/app/manifest.ts";
import { mountTui } from "../../core/tui/index.ts";

let dir: string;
let setup: TestRendererSetup;
let closed: Promise<void>;

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "termfy-tui-"));
  process.env[HOME_VARIABLE] = dir;
  process.env.SETUPVIBE_LANG = "en";
  setup = await createTestRenderer({ width: 120, height: 32 });
  closed = mountTui(setup.renderer, {});
  await setup.renderOnce();
});

afterAll(async () => {
  await closed.catch(() => undefined);
  rmSync(dir, { recursive: true, force: true });
  delete process.env[HOME_VARIABLE];
  delete process.env.SETUPVIBE_LANG;
});

describe("tui", () => {
  test("opens on the Home tab with header, numbered tabs and key bar", async () => {
    let frame = setup.captureCharFrame();
    expect(frame).toContain(manifest.title);
    expect(frame).toContain(`v${manifest.version}`);
    for (const tab of ["1 Home", "2 Inventory", "3 User", "4 Doctor", "5 Logs", "6 About"]) expect(frame).toContain(tab);
    expect(frame).toContain("Next step");
    expect(frame).toContain("quit");
    setup.mockInput.pressKey("2");
    await setup.renderOnce();
    frame = setup.captureCharFrame();
    expect(frame).toContain("Categories");
  });

  test("key 6 goes to About and ? opens the help", async () => {
    setup.mockInput.pressKey("6");
    await setup.renderOnce();
    let frame = setup.captureCharFrame();
    expect(frame).toContain("Credits");
    expect(frame).toContain("OpenTUI");
    setup.mockInput.pressKey("?");
    await setup.renderOnce();
    frame = setup.captureCharFrame();
    expect(frame).toContain("Keys");
    setup.mockInput.pressKey("?");
    await setup.renderOnce();
  });

  test("q destroys the renderer", async () => {
    setup.mockInput.pressKey("q");
    await closed;
    expect(setup.renderer.isDestroyed).toBe(true);
  });
});
