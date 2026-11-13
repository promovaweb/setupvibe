import "../../desktop/src/edition.ts";
/**
 * Layout, language and color rules for every TUI screen, at several sizes.
 *
 * Each screen is opened at 80×24, 100×30, 130×40 and 200×60, in Portuguese
 * with the dark palette and in English with the light one. Every frame must
 * keep the header on the first line and the key bar on the last, show no
 * "[object Object]", "undefined", unresolved {placeholder} or raw text key,
 * keep the Inventory counts line intact, and keep text readable over its
 * background (contrast of at least 2:1, enough to catch text drawn in the
 * color of its own background). Timers must stop when the TUI closes.
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTestRenderer } from "@opentui/core/testing";
import { HOME_VARIABLE } from "../core/config/paths.ts";
import { mountTui } from "../core/tui/index.ts";
import { TEXT_KEYS } from "../tui/i18n.ts";
import { resetIcons } from "../tui/icons.ts";

const SIZES: Array<[number, number]> = [
  [80, 24],
  [100, 30],
  [130, 40],
  [200, 60],
];
const SCREENS = ["home", "1", "2", "3", "4", "5", "6", "7"];

/** Relative luminance and contrast ratio (WCAG 2.x). */
function luminance(rgb: number[]): number {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
function contrast(a: number[], b: number[]): number {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x! + 0.05) / (y! + 0.05);
}
const rgb = (c: { toInts?: () => number[]; r: number; g: number; b: number }) => (c.toInts?.() ?? [c.r * 255, c.g * 255, c.b * 255]).slice(0, 3);

const keyPattern = new RegExp(`(?<![\\w.])(${TEXT_KEYS.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?![\\w.])`);

interface Problem {
  where: string;
  what: string;
}

async function sweep(language: "pt-BR" | "en", theme: "night" | "day"): Promise<Problem[]> {
  const dir = mkdtempSync(join(tmpdir(), "sv-matrix-"));
  process.env[HOME_VARIABLE] = dir;
  process.env.SETUPVIBE_LANG = language;
  writeFileSync(join(dir, "settings.json"), JSON.stringify({ tui: { theme, mouse: true } }));
  resetIcons();
  const problems: Problem[] = [];
  try {
    for (const [w, h] of SIZES) {
      const setup = await createTestRenderer({ width: w, height: h });
      const closed = mountTui(setup.renderer, {});
      await setup.renderOnce();
      for (const screen of SCREENS) {
        if (screen !== "home") setup.mockInput.pressKey(screen);
        await setup.renderOnce();
        await setup.renderOnce();
        const where = `${language}/${theme} ${w}x${h} ${screen}`;
        const frame = setup.captureCharFrame();
        const lines = frame.split("\n").filter((_, i, all) => i < all.length - 1 || all[i] !== "");
        if (!lines[0]?.includes("SetupVibe")) problems.push({ where, what: `header missing: ${lines[0]}` });
        const quit = language === "en" ? "quit" : "sair";
        if (!lines.at(-1)?.includes(quit)) problems.push({ where, what: `key bar missing: ${lines.at(-1)}` });
        for (const bad of ["[object Object]", "undefined", "NaN"]) if (frame.includes(bad)) problems.push({ where, what: `shows ${bad}` });
        const placeholder = frame.match(/\{[a-z]+\}/);
        if (placeholder) problems.push({ where, what: `unresolved ${placeholder[0]}` });
        const key = frame.match(keyPattern);
        if (key) problems.push({ where, what: `raw text key ${key[1]}` });
        if (screen === "1" && !/● \d+ \S+ +↑ \d+ \S+/.test(frame)) problems.push({ where, what: "Inventory counts line broken" });
        // Readability: every visible character against its own background.
        for (const [y, line] of setup.captureSpans().lines.entries()) {
          for (const span of line.spans) {
            // Borders, rules and bars are drawing, not text: only letters, digits and symbols count.
            const text = span.text.replace(/[\u2500-\u259f\u2800-\u28ff·•]/g, "").trim();
            if (!text) continue;
            const ratio = contrast(rgb(span.fg as never), rgb(span.bg as never));
            if (ratio < 2) problems.push({ where, what: `low contrast ${ratio.toFixed(2)}: "${text.slice(0, 30)}"` });
          }
        }
      }
      setup.renderer.destroy();
      await closed;
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  // One entry per distinct problem and screen.
  return [...new Map(problems.map((p) => [`${p.where.replace(/ \d+x\d+/, "")}|${p.what}`, p])).values()];
}

describe("TUI matrix", () => {
  afterAll(() => {
    delete process.env[HOME_VARIABLE];
    delete process.env.SETUPVIBE_LANG;
    resetIcons();
  });

  test("Portuguese, dark palette: every screen at every size", async () => {
    expect(await sweep("pt-BR", "night")).toEqual([]);
  }, 60_000);

  test("English, light palette: every screen at every size", async () => {
    expect(await sweep("en", "day")).toEqual([]);
  }, 60_000);
});

describe("TUI timers", () => {
  let active: Set<unknown>;
  let realSet: typeof setInterval;
  let realClear: typeof clearInterval;
  let dir: string;
  beforeAll(() => {
    active = new Set();
    realSet = globalThis.setInterval;
    realClear = globalThis.clearInterval;
    globalThis.setInterval = ((fn: () => void, ms?: number) => {
      const id = realSet(fn, ms);
      active.add(id);
      return id;
    }) as typeof setInterval;
    globalThis.clearInterval = ((id?: unknown) => {
      active.delete(id);
      realClear(id as never);
    }) as typeof clearInterval;
    dir = mkdtempSync(join(tmpdir(), "sv-timers-"));
    process.env[HOME_VARIABLE] = dir;
  });
  afterAll(() => {
    globalThis.setInterval = realSet;
    globalThis.clearInterval = realClear;
    rmSync(dir, { recursive: true, force: true });
    delete process.env[HOME_VARIABLE];
  });

  test("every interval started by the screens stops when the TUI closes", async () => {
    const setup = await createTestRenderer({ width: 130, height: 40 });
    const closed = mountTui(setup.renderer, {});
    for (const screen of ["6", "escape", "5", "escape", "1", "6"]) {
      if (screen === "escape") setup.mockInput.pressEscape();
      else setup.mockInput.pressKey(screen);
      await setup.renderOnce();
    }
    expect(active.size).toBeGreaterThan(0);
    setup.renderer.destroy();
    await closed;
    expect(active.size).toBe(0);
  });
});

describe("Nerd Font glyphs", () => {
  test("every icon exists in the Nerd Font the installer ships (skipped without the font)", async () => {
    const file = Bun.spawnSync(["fc-match", "-f", "%{file}", "JetBrainsMono Nerd Font"], { stdout: "pipe", stderr: "ignore" }).stdout?.toString() ?? "";
    if (!file.includes("Nerd")) return;
    const charset = Bun.spawnSync(["fc-query", "-f", "%{charset}", file], { stdout: "pipe" }).stdout.toString().trim().split(" ");
    const has = (cp: number) => charset.some((r) => {
      const [a, b] = r.split("-").map((x) => parseInt(x, 16));
      return cp >= a! && cp <= (b ?? a)!;
    });
    const source = await Bun.file(new URL("../tui/icons.ts", import.meta.url)).text();
    const nerd = source.slice(source.indexOf("const NERD"), source.indexOf("const PLAIN"));
    const missing = [...nerd.matchAll(/^\s+(\w+): "([^"]+)"/gm)].filter(([, , glyph]) => !has(glyph!.codePointAt(0)!)).map(([, name, glyph]) => `${name} U+${glyph!.codePointAt(0)!.toString(16)}`);
    expect(missing).toEqual([]);
  });
});
