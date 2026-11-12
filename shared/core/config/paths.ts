/**
 * Paths of the user's hidden data directory.
 *
 * Everything the binary persists lives in `~/.<bin>/`:
 *
 * - `settings.json`     preferences in plain text;
 * - `credentials.json`  secrets encrypted with AES-256-GCM;
 * - `master.key`        master key created on first write (mode 0600).
 *
 * The `<BIN>_HOME` variable overrides the root, useful in tests and CI.
 */
import { homedir } from "../../system/home.ts";
import { join } from "node:path";
import { mkdirSync, statSync } from "node:fs";
import { manifest } from "../app/manifest.ts";
import { classifyFsError } from "../app/errors.ts";
import { ExitCode } from "../app/exit-codes.ts";

/** Environment variable that redirects the data directory. */
export const HOME_VARIABLE = `${manifest.envPrefix}_HOME`;

/** Environment variable that provides the master key in hex. */
export const MASTER_KEY_VARIABLE = `${manifest.envPrefix}_MASTER_KEY`;

/** Root of the hidden directory, honoring `<BIN>_HOME` when set. */
export function baseDir(): string {
  const override = process.env[HOME_VARIABLE];
  if (override && override.trim() !== "") return override;
  return join(homedir(), `.${manifest.dataName}`);
}

export const paths = {
  base: baseDir,
  settings: () => join(baseDir(), "settings.json"),
  credentials: () => join(baseDir(), "credentials.json"),
  masterKey: () => join(baseDir(), "master.key"),
};

/** Ensures the base directory exists with mode 0700. Returns its path. */
export function ensureBaseDir(): string {
  const base = baseDir();
  try {
    mkdirSync(base, { recursive: true, mode: 0o700 });
    return base;
  } catch (e) {
    throw classifyFsError(e, ExitCode.CONFIG, `Could not create ${base}`);
  }
}

/** Tells whether a path exists without throwing. */
export function exists(path: string): boolean {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}
