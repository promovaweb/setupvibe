import "../../../desktop/src/edition.ts";
/** Tests list selection, activation, boundaries and scrolling by rendered frames. */
import { expect, test } from "bun:test";
import { createTestRenderer } from "@opentui/core/testing";
import { listPanel } from "../../core/tui/components.ts";
import { themes } from "../../core/tui/theme.ts";

test("selection follows movement, scrolls into view and activates on Enter", async () => {
  const setup = await createTestRenderer({ width: 40, height: 8 });
  let activated = -1;
  try {
    const list = listPanel(setup.renderer, themes.night, {
      title: "Choices", items: Array.from({ length: 20 }, (_, i) => `Item ${i}`), onSelect: (i) => { activated = i; },
    });
    list.box.height = 8;
    setup.renderer.root.add(list.box);
    await setup.renderOnce();
    expect(setup.captureCharFrame()).toContain("> Item 0");
    list.move(12); await setup.renderOnce();
    expect(list.selected()).toBe(12);
    expect(setup.captureCharFrame()).toContain("> Item 12");
    expect(activated).toBe(-1);
    list.box.focus();
    setup.mockInput.pressKey("j"); await setup.renderOnce();
    expect(list.selected()).toBe(13);
    setup.mockInput.pressKey("k"); await setup.renderOnce();
    expect(list.selected()).toBe(12);
    setup.mockInput.pressKey("RETURN"); await setup.renderOnce();
    expect(activated).toBe(12);
    list.move(100); expect(list.selected()).toBe(19);
    list.move(-100); expect(list.selected()).toBe(0);
  } finally { setup.renderer.destroy(); }
});
test("empty lists do not activate or move", async () => {
  const setup = await createTestRenderer({ width: 30, height: 6 });
  try {
    const list = listPanel(setup.renderer, themes.day, { title: "Empty", items: [], onSelect: () => { throw new Error("Unexpected activation"); } });
    setup.renderer.root.add(list.box);
    list.select(0); list.move(1);
    expect(list.selected()).toBe(-1);
    await setup.renderOnce(); expect(setup.captureCharFrame()).toContain("Empty");
  } finally { setup.renderer.destroy(); }
});

test("example screen handles j/k once and leaves global tab and quit keys working", async () => {
  const { createExampleScreen } = await import("../template/screen/example.ts");
  const exampleScreen = createExampleScreen();
  const { screens } = await import("../../core/tui/screens/index.ts");
  const { mountTui } = await import("../../core/tui/index.ts");
  const setup = await createTestRenderer({ width: 100, height: 24 });
  // Temporarily extend the registry for this integration fixture.
  const fixtureScreens = screens as import("../../core/tui/screen.ts").Screen[];
  fixtureScreens.push(exampleScreen);
  const closed = mountTui(setup.renderer, { initialTab: "example" }, themes.night);
  try {
    await setup.renderOnce();
    setup.mockInput.pressKey("j"); await setup.renderOnce();
    expect(setup.captureCharFrame()).toContain("> Second item");
    setup.mockInput.pressKey("k"); await setup.renderOnce();
    expect(setup.captureCharFrame()).toContain("> First item");
    setup.mockInput.pressKey("j"); setup.mockInput.pressKey("RETURN"); await setup.renderOnce();
    expect(setup.captureCharFrame()).toContain("Selected item 2");
    setup.mockInput.pressKey("r"); await setup.renderOnce();
    expect(setup.captureCharFrame()).toContain("> First item");
    setup.mockInput.pressKey("1"); await setup.renderOnce();
    expect(setup.captureCharFrame()).toContain("ITEM");
    setup.mockInput.pressKey("q"); await closed;
    expect(setup.renderer.isDestroyed).toBe(true);
  } finally {
    setup.renderer.destroy(); await closed;
    fixtureScreens.splice(fixtureScreens.indexOf(exampleScreen), 1);
  }
});
