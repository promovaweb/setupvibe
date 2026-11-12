import "../../../desktop/src/edition.ts";
/** Tests key rotation, environment replacement and unchanged files on rejection. */
import { afterEach, beforeEach, expect, test, spyOn } from "bun:test";
import * as fs from "node:fs";
import { mkdtempSync, readFileSync, rmSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { getCredential, rotateMasterKey, setCredential } from "../../core/config/credentials.ts";
import { decrypt } from "../../core/config/crypto.ts";
import { HOME_VARIABLE, MASTER_KEY_VARIABLE, paths } from "../../core/config/paths.ts";
import { ExitCode } from "../../core/app/exit-codes.ts";

let dir: string;
let home: string | undefined;
let envKey: string | undefined;
beforeEach(() => {
  home = process.env[HOME_VARIABLE]; envKey = process.env[MASTER_KEY_VARIABLE];
  dir = mkdtempSync(join(tmpdir(), "rotate-")); process.env[HOME_VARIABLE] = dir; delete process.env[MASTER_KEY_VARIABLE];
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  if (home === undefined) delete process.env[HOME_VARIABLE]; else process.env[HOME_VARIABLE] = home;
  if (envKey === undefined) delete process.env[MASTER_KEY_VARIABLE]; else process.env[MASTER_KEY_VARIABLE] = envKey;
});
test("random rotation preserves credentials and rejects the previous key", () => {
  setCredential("test.token", "secret-value");
  const oldKey = readFileSync(paths.masterKey(), "utf8").trim();
  expect(rotateMasterKey()).toEqual({ rotated: true, source: "file" });
  expect(getCredential("test.token")).toBe("secret-value");
  expect(readFileSync(paths.masterKey(), "utf8").trim()).not.toBe(oldKey);
  expect(statSync(paths.masterKey()).mode & 0o777).toBe(0o600);
  expect(statSync(paths.credentials()).mode & 0o777).toBe(0o600);
  expect(() => decrypt(JSON.parse(readFileSync(paths.credentials(), "utf8")), Buffer.from(oldKey, "hex"))).toThrow();
});
test("from-env opens with the disk key and replaces it with the environment key", () => {
  setCredential("test.token", "secret-value");
  process.env[MASTER_KEY_VARIABLE] = "12".repeat(32);
  rotateMasterKey(true);
  expect(getCredential("test.token")).toBe("secret-value");
  expect(readFileSync(paths.masterKey(), "utf8").trim()).toBe("12".repeat(32));
  delete process.env[MASTER_KEY_VARIABLE];
  expect(getCredential("test.token")).toBe("secret-value");
});
test("invalid or absent new key leaves both files untouched", () => {
  setCredential("test.token", "secret-value");
  const key = readFileSync(paths.masterKey(), "utf8");
  const vault = readFileSync(paths.credentials(), "utf8");
  for (const value of [undefined, "invalid", "a".repeat(63), "a".repeat(65), "g".repeat(64)]) {
    if (value) process.env[MASTER_KEY_VARIABLE] = value; else delete process.env[MASTER_KEY_VARIABLE];
    expect(() => rotateMasterKey(true)).toThrow();
    expect(readFileSync(paths.masterKey(), "utf8")).toBe(key);
    expect(readFileSync(paths.credentials(), "utf8")).toBe(vault);
  }
});
test("missing vault or current key returns CREDENTIALS", () => {
  expect(() => rotateMasterKey()).toThrow(expect.objectContaining({ code: ExitCode.CREDENTIALS }));
  setCredential("test.token", "secret-value"); unlinkSync(paths.masterKey());
  expect(() => rotateMasterKey()).toThrow(expect.objectContaining({ code: ExitCode.CREDENTIALS }));
});
test("a current environment key can rotate to a random disk key", () => {
  process.env[MASTER_KEY_VARIABLE] = "34".repeat(32);
  setCredential("test.token", "secret-value");
  rotateMasterKey();
  expect(getCredential("test.token")).toBe("secret-value");
});

test("failed vault replacement rolls back the key atomically", () => {
  setCredential("test.token", "secret-value");
  const originalKey = readFileSync(paths.masterKey(), "utf8");
  const originalVault = readFileSync(paths.credentials(), "utf8");
  const rename = fs.renameSync;
  const fault = spyOn(fs, "renameSync").mockImplementation((from, to) => {
    if (to === paths.credentials()) throw new Error("Injected replacement failure");
    return rename(from, to);
  });
  try {
    expect(() => rotateMasterKey()).toThrow(expect.objectContaining({ code: ExitCode.CREDENTIALS }));
    expect(readFileSync(paths.masterKey(), "utf8")).toBe(originalKey);
    expect(readFileSync(paths.credentials(), "utf8")).toBe(originalVault);
    expect(getCredential("test.token")).toBe("secret-value");
    expect(fs.readdirSync(dir).some((name) => name.startsWith(".rotate-"))).toBe(false);
  } finally { fault.mockRestore(); }
});

test("a failed rollback retains the original key for recovery", () => {
  setCredential("test.token", "secret-value");
  const originalKey = readFileSync(paths.masterKey(), "utf8");
  const originalVault = readFileSync(paths.credentials(), "utf8");
  const rename = fs.renameSync;
  const fault = spyOn(fs, "renameSync").mockImplementation((from, to) => {
    if (to === paths.credentials() || String(from).endsWith("previous.key")) throw new Error("Injected filesystem failure");
    return rename(from, to);
  });
  try {
    expect(() => rotateMasterKey()).toThrow("Key rollback failed");
    expect(readFileSync(paths.credentials(), "utf8")).toBe(originalVault);
    const backup = fs.readdirSync(dir).find((name) => name.startsWith(".rotate-"));
    expect(backup).toBeDefined();
    const recoveryKey = join(dir, backup!, "previous.key");
    expect(readFileSync(recoveryKey, "utf8")).toBe(originalKey);
    expect(statSync(recoveryKey).mode & 0o777).toBe(0o600);
    rename(recoveryKey, paths.masterKey());
    expect(getCredential("test.token")).toBe("secret-value");
  } finally { fault.mockRestore(); }
});
