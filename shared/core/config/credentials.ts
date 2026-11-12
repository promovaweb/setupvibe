/**
 * Credentials vault in credentials.json.
 *
 * The file holds an `EncryptedEnvelope` whose decrypted content is a
 * `{ name: value }` object. Names match `[a-z0-9_.-]`, lower case, and
 * identify the API or service (`openai.api_key`, `github.token`).
 *
 * None of these functions writes a value to logs or error messages. The
 * `credentials get` command masks by default and only reveals with
 * `--reveal`. The MCP server exposes names and metadata only.
 */
import { readFileSync, writeFileSync, unlinkSync, mkdtempSync, renameSync, rmSync, chmodSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import { paths, exists, ensureBaseDir, MASTER_KEY_VARIABLE } from "./paths.ts";
import { encrypt, decrypt, isEnvelope, getMasterKey, masterKeySource, keyFromEnv, type MasterKeySource } from "./crypto.ts";
import { classifyFsError, error } from "../app/errors.ts";
import { ExitCode } from "../app/exit-codes.ts";
import { manifest } from "../app/manifest.ts";

export type Vault = Record<string, string>;

const NAME_PATTERN = /^[a-z0-9][a-z0-9_.-]{0,63}$/;

/** Validates a credential name and returns it normalized. */
export function validateName(name: string): string {
  const clean = name.trim().toLowerCase();
  if (!NAME_PATTERN.test(clean)) {
    throw error.usage(
      `Invalid credential name: "${name}". Use lower-case letters, digits, dot, hyphen or underscore (up to 64 characters).`,
      { name },
    );
  }
  return clean;
}

/** Reads and decrypts the vault. A missing file yields an empty vault. */
export function readVault(keyOverride?: Buffer): Vault {
  const path = paths.credentials();
  if (!exists(path)) return {};
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (e) {
    throw classifyFsError(e, ExitCode.CREDENTIALS, `Failed to read ${path}`);
  }
  let envelope: unknown;
  try {
    envelope = JSON.parse(raw);
  } catch {
    throw error.credentials(`${path} does not contain valid JSON.`, { path });
  }
  if (!isEnvelope(envelope)) {
    throw error.credentials(`${path} is not in the expected encrypted format.`, { path });
  }
  const key = keyOverride ?? getMasterKey(false);
  const text = decrypt(envelope, key);
  let vault: unknown;
  try {
    vault = JSON.parse(text);
  } catch {
    throw error.credentials("The decrypted content of credentials.json is not valid JSON.");
  }
  if (!vault || typeof vault !== "object" || Array.isArray(vault)) {
    throw error.credentials("The decrypted content of credentials.json must be an object.");
  }
  return vault as Vault;
}

/** Encrypts and writes the whole vault, creating the master key if needed. */
export function writeVault(vault: Vault): string {
  ensureBaseDir();
  const key = getMasterKey(true);
  const envelope = encrypt(JSON.stringify(vault), key);
  const path = paths.credentials();
  try {
    writeFileSync(path, `${JSON.stringify(envelope, null, 2)}\n`, { mode: 0o600 });
  } catch (e) {
    throw classifyFsError(e, ExitCode.CREDENTIALS, `Failed to write ${path}`);
  }
  return path;
}

/** Sets or replaces a credential. */
export function setCredential(name: string, value: string): void {
  const key = validateName(name);
  if (value.length === 0) throw error.usage("The credential value cannot be empty.", { name: key });
  const vault = exists(paths.credentials()) ? readVault() : {};
  vault[key] = value;
  writeVault(vault);
}

/**
 * Reads a credential. Absence throws CREDENTIALS so that the caller (a
 * command that calls an API) exits with the right code.
 */
export function getCredential(name: string): string {
  const key = validateName(name);
  const vault = readVault();
  const value = vault[key];
  if (value === undefined) {
    throw error.credentials(`Credential "${key}" not found. Save it with: ${manifest.bin} credentials set ${key}`, { name: key });
  }
  return value;
}

/** Removes a credential. Returns `false` when it did not exist. */
export function removeCredential(name: string): boolean {
  const key = validateName(name);
  const vault = readVault();
  if (!(key in vault)) return false;
  delete vault[key];
  writeVault(vault);
  return true;
}

/** Lists saved names in alphabetical order. */
export function listCredentials(): string[] {
  return Object.keys(readVault()).sort();
}

/** Deletes credentials.json entirely. Keeps master.key. */
export function clearVault(): boolean {
  const path = paths.credentials();
  if (!exists(path)) return false;
  try {
    unlinkSync(path);
  } catch (e) {
    throw classifyFsError(e, ExitCode.CREDENTIALS, `Failed to remove ${path}`);
  }
  return true;
}

/** Masks a secret for display: keeps the first 4 and last 2 characters. */
export function mask(value: string): string {
  if (value.length <= 8) return "*".repeat(value.length);
  return `${value.slice(0, 4)}${"*".repeat(Math.min(value.length - 6, 12))}${value.slice(-2)}`;
}

/** Vault summary without values, for `credentials status` and MCP. */
export function vaultStatus(): {
  file: string;
  exists: boolean;
  masterKeySource: MasterKeySource;
  count: number;
  names: string[];
} {
  const file = paths.credentials();
  const present = exists(file);
  const source = masterKeySource();
  let names: string[] = [];
  if (present && source !== "none") {
    try {
      names = listCredentials();
    } catch {
      names = [];
    }
  }
  return { file, exists: present, masterKeySource: source, count: names.length, names };
}

/**
 * Re-encrypts the vault and replaces the disk key with mode 0600.
 * With fromEnv, the disk key opens the vault and the environment supplies
 * the replacement. Both files are staged before replacement; an ordinary
 * write failure restores the previous key. Concurrent vault writes are unsupported.
 */
export function rotateMasterKey(fromEnv = false): { rotated: true; source: "env" | "file" } {
  if (!exists(paths.credentials())) throw error.credentials("No credentials vault found.");
  const current = getMasterKey(false, fromEnv);
  const vault = readVault(current);
  const fresh = fromEnv ? keyFromEnv() : randomBytes(32);
  if (!fresh) throw error.credentials(`${MASTER_KEY_VARIABLE} must supply the new master key.`);
  const envelope = encrypt(JSON.stringify(vault), fresh);
  const keyPath = paths.masterKey();
  const previous = exists(keyPath) ? readFileSync(keyPath) : undefined;
  let staging: string | undefined;
  let replaced = false;
  let retainBackup = false;
  try {
    staging = mkdtempSync(join(paths.base(), ".rotate-"));
    chmodSync(staging, 0o700);
    if (previous) writeFileSync(join(staging, "previous.key"), previous, { mode: 0o600 });
    const stagedKey = join(staging, "master.key");
    const stagedVault = join(staging, "credentials.json");
    writeFileSync(stagedKey, `${fresh.toString("hex")}\n`, { mode: 0o600 });
    writeFileSync(stagedVault, `${JSON.stringify(envelope, null, 2)}\n`, { mode: 0o600 });
    renameSync(stagedKey, keyPath);
    replaced = true;
    renameSync(stagedVault, paths.credentials());
  } catch {
    if (replaced) {
      try {
        if (previous) renameSync(join(staging!, "previous.key"), keyPath);
        else unlinkSync(keyPath);
      } catch {
        retainBackup = true;
        throw error.credentials(`Key rollback failed. Recovery files remain in ${staging}. ${previous ? "Restore previous.key as master.key" : "Remove the replacement master.key and keep the original environment key"} before using the vault.`);
      }
    }
    throw error.credentials("Could not rotate the master key; the vault was not changed.");
  } finally {
    if (staging && !retainBackup) rmSync(staging, { recursive: true, force: true });
  }
  if (!fromEnv) delete process.env[MASTER_KEY_VARIABLE];
  return { rotated: true, source: fromEnv ? "env" : "file" };
}
