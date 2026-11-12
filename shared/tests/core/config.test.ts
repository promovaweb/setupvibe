import "../../../desktop/src/edition.ts";
/** settings.json and credentials.json in a temporary directory. */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MASTER_KEY_VARIABLE, HOME_VARIABLE, paths } from "../../core/config/paths.ts";
import { convertValue, writeSettings, readSettings, getPath, setPath, removePath, flatten } from "../../core/config/settings.ts";
import { setCredential, listCredentials, mask, getCredential, removeCredential, vaultStatus, validateName } from "../../core/config/credentials.ts";
import { encrypt, decrypt } from "../../core/config/crypto.ts";
import { AppError } from "../../core/app/errors.ts";
import { ExitCode } from "../../core/app/exit-codes.ts";

let dir: string;

// The previous values are restored after each test, so the suite leaves the
// environment as it found it.
const previousHome = process.env[HOME_VARIABLE];
const previousKey = process.env[MASTER_KEY_VARIABLE];

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "termfy-test-"));
  process.env[HOME_VARIABLE] = dir;
  delete process.env[MASTER_KEY_VARIABLE];
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  if (previousHome === undefined) delete process.env[HOME_VARIABLE]; else process.env[HOME_VARIABLE] = previousHome;
  if (previousKey === undefined) delete process.env[MASTER_KEY_VARIABLE]; else process.env[MASTER_KEY_VARIABLE] = previousKey;
});

describe("settings", () => {
  test("reads defaults without a file and writes with dot notation", () => {
    const s = readSettings();
    expect(getPath(s, "output.format")).toBe("text");
    setPath(s, "output.format", "json");
    writeSettings(s);
    expect(getPath(readSettings(), "output.format")).toBe("json");
    expect(paths.settings()).toBe(join(dir, "settings.json"));
  });

  test("converts types and rejects invalid enum values", () => {
    expect(convertValue("output.colors", "no")).toBe(false);
    expect(convertValue("output.colors", "1")).toBe(true);
    expect(() => convertValue("tui.theme", "purple")).toThrow(/accepts only/);
    expect(convertValue("free.key", "x")).toBe("x");
  });

  test("removes and flattens", () => {
    const s = { a: { b: 1, c: 2 }, d: true };
    expect(removePath(s, "a.b")).toBe(true);
    expect(removePath(s, "a.b")).toBe(false);
    expect(flatten(s)).toEqual([["a.c", 2], ["d", true]]);
  });
});

describe("crypto", () => {
  test("encrypts and decrypts with the same key; a wrong key fails with CREDENTIALS", () => {
    const key = Buffer.alloc(32, 7);
    const env = encrypt("secret", key);
    expect(env.algorithm).toBe("aes-256-gcm");
    expect(decrypt(env, key)).toBe("secret");
    try {
      decrypt(env, Buffer.alloc(32, 8));
      throw new Error("should fail");
    } catch (e) {
      expect((e as AppError).code).toBe(ExitCode.CREDENTIALS);
    }
  });
});

describe("credentials", () => {
  test("saves encrypted, lists, reads, masks and removes", () => {
    setCredential("openai.api_key", "sk-1234567890abcdef");
    const raw = readFileSync(paths.credentials(), "utf8");
    expect(raw).not.toContain("sk-1234567890abcdef");
    expect(JSON.parse(raw).algorithm).toBe("aes-256-gcm");
    expect(listCredentials()).toEqual(["openai.api_key"]);
    expect(getCredential("openai.api_key")).toBe("sk-1234567890abcdef");
    expect(mask("sk-1234567890abcdef")).toMatch(/^sk-1\*+ef$/);
    expect(vaultStatus().masterKeySource).toBe("file");
    expect(statSync(paths.masterKey()).mode & 0o777).toBe(0o600);
    expect(removeCredential("openai.api_key")).toBe(true);
    expect(listCredentials()).toEqual([]);
  });

  test("a missing credential exits with code 4", () => {
    setCredential("a.b", "x");
    try {
      getCredential("does.not.exist");
      throw new Error("should fail");
    } catch (e) {
      expect((e as AppError).code).toBe(ExitCode.CREDENTIALS);
    }
  });

  test("uses the environment key when set", () => {
    process.env[MASTER_KEY_VARIABLE] = "ab".repeat(32);
    setCredential("x.y", "value");
    expect(vaultStatus().masterKeySource).toBe("env");
    expect(getCredential("x.y")).toBe("value");
  });

  test("validates names", () => {
    expect(validateName("GitHub.Token")).toBe("github.token");
    expect(() => validateName("with space")).toThrow(/Invalid/);
  });
});
