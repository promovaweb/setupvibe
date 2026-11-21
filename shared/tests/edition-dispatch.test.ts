import "../../main.ts";
import { afterEach, beforeEach, expect, spyOn, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { editionRefusal, suggestedEdition } from "../commands/edition.ts";
import { dispatch, legacyServerInvocation } from "../core/run.ts";
import { rootRefusal } from "../startup.ts";
import { selectItems } from "../auto/selection.ts";
import { autoPlan } from "../auto/plan.ts";
import { resolveAnswers } from "../auto/answers.ts";
import { edition, selectEdition } from "../core/app/edition.ts";
import type { Inventory } from "../inventory.ts";
import type { DetectedSystem } from "../system/detect.ts";

const fixture: DetectedSystem = { system: "debian", id: "debian", name: "Debian", version: "13", headless: true, variant: "remote-headless", arch: "x64", wsl: false, publicIp: false };

test("suggestions and platform and root guards", () => {
  expect(suggestedEdition(fixture, "linux")).toBe("server");
  expect(suggestedEdition({ ...fixture, headless: false }, "linux")).toBe("desktop");
  expect(suggestedEdition({ ...fixture, system: "omarchy" }, "linux")).toBe("omarchy");
  expect(editionRefusal("server", fixture, "darwin")).toContain("Linux only");
  expect(editionRefusal("omarchy", fixture, "linux")).toContain("/usr/share/omarchy");
  expect(rootRefusal(["install", "php"], true, "linux", "desktop")).toContain("root");
  expect(rootRefusal(["check"], true, "linux", "omarchy")).toContain("root");
  expect(rootRefusal(["auto"], true, "linux", "server")).toBeUndefined();
  expect(legacyServerInvocation("/usr/local/bin/setupvibe-server")).toBe(true);
  expect(legacyServerInvocation("/usr/local/bin/setupvibe")).toBe(false);
});

let state: string;
beforeEach(() => { state = mkdtempSync(join(tmpdir(), "sv-edition-")); });
afterEach(() => {
  selectEdition("desktop");
  rmSync(state, { force: true, recursive: true });
});

async function cli(...args: string[]) {
  const previousState = process.env.SETUPVIBE_HOME;
  const previousDisplay = process.env.DISPLAY;
  process.env.SETUPVIBE_HOME = state;
  process.env.DISPLAY = ":99";
  const stdout = spyOn(process.stdout, "write").mockImplementation(() => true);
  const stderr = spyOn(process.stderr, "write").mockImplementation(() => true);
  try {
    const code = await dispatch([...args, "--json"]);
    return { code, stdout: JSON.parse(stdout.mock.calls.map(([text]) => text).join("")), stderr: stderr.mock.calls.map(([text]) => text).join("") };
  } finally {
    stdout.mockRestore();
    stderr.mockRestore();
    if (previousState === undefined) delete process.env.SETUPVIBE_HOME;
    else process.env.SETUPVIBE_HOME = previousState;
    if (previousDisplay === undefined) delete process.env.DISPLAY;
    else process.env.DISPLAY = previousDisplay;
  }
}

test("uses the saved edition without changing it during explicit runs", async () => {
  // The old field describes what ran init, and must not become the saved default.
  mkdirSync(state, { recursive: true });
  writeFileSync(join(state, "config.json"), '{"schemaVersion":1,"edition":"desktop"}\n');
  expect(await cli("system", "--no-update-check")).toMatchObject({ code: 15, stdout: { ok: false, error: { name: "EDITION_REQUIRED" } } });
  expect(await cli("skill", "--", "--help")).toMatchObject({ code: 15 });
  expect((await cli("edition")).stdout.data.edition).toBeNull();
  expect(await cli("edition", "set", "desktop")).toMatchObject({ code: 0, stdout: { data: { previous: null, edition: "desktop" } } });
  if (process.platform === "linux") expect((await cli("server", "system", "--no-update-check")).stdout.data.edition).toBe("server");
  expect(await cli("system", "--no-update-check")).toMatchObject({
    code: 0, stdout: { data: { edition: "desktop" } }, stderr: "Using saved edition: desktop.\n",
  });
  expect((await cli("edition")).stdout.data.edition).toBe("desktop");
});

test("Omarchy refuses a non-Omarchy system and a graphical Server run seeks confirmation before changes", async () => {
  expect(await cli("omarchy", "check")).toMatchObject({ code: 11, stdout: { error: { message: expect.stringContaining("/usr/share/omarchy") } } });
  if (process.platform === "linux") {
    for (const args of [["security", "apply"], ["auto"]]) {
      expect(await cli("server", ...args)).toMatchObject({ code: 2, stdout: { data: { securityConfirmation: true } } });
      expect((await cli("server", ...args, "--dry-run")).code).toBe(0);
    }
  }
  expect(existsSync(join(state, "logs"))).toBe(false);
});

test("Omarchy plans only additive packages, isolated PHP and Bash integration", () => {
  const inventory = edition("omarchy").inventory as Inventory;
  const selection = selectItems({ inventory, system: "omarchy", headless: false });
  const plan = autoPlan({
    edition: "omarchy", inventory, selection, system: "omarchy", arch: "x64", variant: "remote-exposed",
    user: "test", userHasKey: false, createdNopasswd: false, initDone: false, memoryGb: 16, answers: resolveAnswers({}, {}), home: state,
  });
  expect(plan.security).toBe(false);
  const ids = plan.steps.map((step) => step.id);
  for (const id of ["mise", "mise-lock", "docker-daemon", "login-shell", "tmux-block", "starship-preset", "node", "ruby"]) {
    expect(ids).not.toContain(id);
  }
  expect(plan.steps.find((step) => step.id === "php")?.commands[0]).toMatchObject({
    argv: ["mise", "install", "--yes", "php@8.6.0"],
    env: { MISE_DATA_DIR: join(state, ".setupvibe", "omarchy", "mise") },
  });
  expect(plan.steps.find((step) => step.id === "php-build-deps")?.commands[0]?.argv.slice(0, 3)).toEqual(["omarchy", "pkg", "add"]);
});
