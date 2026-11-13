/**
 * Icons of the TUI and the bottom key bar: Nerd Font glyphs or plain
 * symbols, and the keys that fit the width (help and quit always stay).
 */
import "../../desktop/src/edition.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { fitKeys } from "../core/tui/index.ts";
import { icon, iconsEnabled, resetIcons } from "../tui/icons.ts";

describe("icons", () => {
  afterEach(() => {
    delete process.env.SETUPVIBE_ICONS;
    resetIcons();
  });

  test("Nerd Font glyphs by default, plain symbols with SETUPVIBE_ICONS=0", () => {
    resetIcons();
    expect(iconsEnabled()).toBe(true);
    const nerd = icon("inventory");
    expect(nerd.length).toBeGreaterThan(0);
    process.env.SETUPVIBE_ICONS = "0";
    resetIcons();
    expect(iconsEnabled()).toBe(false);
    expect(icon("inventory")).not.toBe(nerd);
    expect(icon("inventory").length).toBeGreaterThan(0);
  });

  test("an unknown name gives an empty string", () => {
    expect(icon("no-such-icon")).toBe("");
  });
});

describe("fitKeys", () => {
  const screen = Array.from({ length: 8 }, (_, i) => ({ key: `k${i}`, action: `action ${i}` }));
  const global = [
    { key: "esc", action: "home" },
    { key: "1-7", action: "go" },
    { key: "L", action: "language" },
    { key: "?", action: "help" },
    { key: "q", action: "quit" },
  ];

  test("everything fits on a wide terminal", () => {
    const r = fitKeys(screen, global, 300);
    expect(r.screen).toHaveLength(8);
    expect(r.global.map((p) => p.key)).toEqual(["esc", "1-7", "L", "?", "q"]);
  });

  test("on a narrow terminal help and quit stay at the end", () => {
    const r = fitKeys(screen, global, 80);
    expect(r.screen.length).toBeLessThan(8);
    expect(r.global.slice(-2).map((p) => p.key)).toEqual(["?", "q"]);
  });
});

describe("icon maps", () => {
  test("every plain symbol has a Nerd Font glyph too", async () => {
    const source = await Bun.file(new URL("../tui/icons.ts", import.meta.url)).text();
    const block = (name: string) => [...source.slice(source.indexOf(`const ${name}`)).split("};")[0]!.matchAll(/^\s+(\w+):/gm)].map((m) => m[1]);
    expect(block("NERD").sort()).toEqual(block("PLAIN").sort());
  });
});
