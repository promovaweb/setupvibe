/**
 * Encrypts and decrypts the contents of credentials.json.
 *
 * Algorithm: AES-256-GCM with a random 12-byte IV and a 16-byte tag. The
 * 32-byte master key comes, in this order:
 *
 * 1. from the `<BIN>_MASTER_KEY` variable (64 hex characters);
 * 2. from `~/.<bin>/master.key`, created on first write with mode 0600.
 *
 * Honest limit: the cipher protects the file against casual reading, copies
 * in backups and disk scanners. Anyone with access to the same OS account
 * can read `master.key` and decrypt the file. For a higher bar, inject the
 * key through the environment variable from a secrets manager.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, chmodSync } from "node:fs";
import { paths, exists, ensureBaseDir, MASTER_KEY_VARIABLE } from "./paths.ts";
import { AppError, classifyFsError, error } from "../app/errors.ts";
import { ExitCode } from "../app/exit-codes.ts";

/** On-disk format. Binary fields are base64. */
export interface EncryptedEnvelope {
  version: 1;
  algorithm: "aes-256-gcm";
  iv: string;
  tag: string;
  data: string;
}

const ALGORITHM = "aes-256-gcm";
const KEY_SIZE = 32;
const IV_SIZE = 12;

/** Where the master key in use comes from, for `credentials status`. */
export type MasterKeySource = "env" | "file" | "none";

/** Reports where the master key would come from without creating anything. */
export function masterKeySource(): MasterKeySource {
  if (process.env[MASTER_KEY_VARIABLE]) return "env";
  if (exists(paths.masterKey())) return "file";
  return "none";
}

/** Reads and validates the optional environment key without file fallback. */
export function keyFromEnv(): Buffer | null {
  const value = process.env[MASTER_KEY_VARIABLE];
  if (!value) return null;
  const clean = value.trim();
  if (!/^[0-9a-fA-F]{64}$/.test(clean)) {
    throw error.credentials(
      `${MASTER_KEY_VARIABLE} must have 64 hexadecimal characters (32 bytes). Generate one with: openssl rand -hex 32`,
    );
  }
  return Buffer.from(clean, "hex");
}

/**
 * Reads the master key. With `createIfMissing`, generates `master.key` when
 * neither the variable nor the file exists. Otherwise throws CREDENTIALS.
 * ignoreEnvironment reads the disk key when the environment holds a replacement.
 */
export function getMasterKey(createIfMissing: boolean, ignoreEnvironment = false): Buffer {
  const fromEnv = ignoreEnvironment ? null : keyFromEnv();
  if (fromEnv) return fromEnv;

  const path = paths.masterKey();
  if (exists(path)) {
    try {
      const content = readFileSync(path, "utf8").trim();
      if (!/^[0-9a-fA-F]{64}$/.test(content)) {
        throw error.credentials(`${path} is corrupted: expected 64 hexadecimal characters.`);
      }
      return Buffer.from(content, "hex");
    } catch (e) {
      throw classifyFsError(e, ExitCode.CREDENTIALS, `Failed to read ${path}`);
    }
  }

  if (!createIfMissing) {
    throw error.credentials(
      `No master key found. Set ${MASTER_KEY_VARIABLE} or save a credential to generate ${path}.`,
    );
  }

  ensureBaseDir();
  const fresh = randomBytes(KEY_SIZE);
  try {
    writeFileSync(path, `${fresh.toString("hex")}\n`, { mode: 0o600 });
    chmodSync(path, 0o600);
  } catch (e) {
    throw classifyFsError(e, ExitCode.CREDENTIALS, `Failed to write ${path}`);
  }
  return fresh;
}

/** Encrypts text and returns the envelope ready to serialize. */
export function encrypt(text: string, key: Buffer): EncryptedEnvelope {
  const iv = randomBytes(IV_SIZE);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const data = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    version: 1,
    algorithm: ALGORITHM,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: data.toString("base64"),
  };
}

/** Decrypts an envelope. A wrong key or tag throws CREDENTIALS. */
export function decrypt(envelope: EncryptedEnvelope, key: Buffer): string {
  if (envelope.version !== 1 || envelope.algorithm !== ALGORITHM) {
    throw error.credentials(`Unrecognized credentials.json format (version ${String(envelope.version)}).`);
  }
  try {
    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(envelope.iv, "base64"));
    decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
    const text = Buffer.concat([decipher.update(Buffer.from(envelope.data, "base64")), decipher.final()]);
    return text.toString("utf8");
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw error.credentials("Could not decrypt credentials.json. The master key changed or the file was altered.");
  }
}

/** Checks that an object read from disk has the `EncryptedEnvelope` shape. */
export function isEnvelope(value: unknown): value is EncryptedEnvelope {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    v.version === 1 &&
    v.algorithm === ALGORITHM &&
    typeof v.iv === "string" &&
    typeof v.tag === "string" &&
    typeof v.data === "string"
  );
}
