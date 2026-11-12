/**
 * SetupVibe state files in `~/.setupvibe/`.
 *
 * | File | Content |
 * | --- | --- |
 * | `config.json` | user, detected system, init state, Git identity, preferences |
 * | `selection.json` | selected inventory items and installed versions |
 * | `external.json` | apps installed through mise outside the inventory |
 * | `state/` | what existed before SetupVibe, restored on removal |
 * | `logs/` | one log per run |
 * | `backups/` | copies of user files before the first change |
 *
 * Every JSON file carries `schemaVersion`. When a newer binary reads an older
 * file, `readState` runs the registered migrations in order and keeps the
 * previous file in `backups/`. Writes go through a temporary file and a
 * rename, so a crash never leaves a half-written file.
 *
 * Spec section 4.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync, chmodSync } from "node:fs";
import { dirname, join } from "node:path";
import { baseDir } from "../core/config/paths.ts";

export const STATE_FILES = ["config.json", "selection.json", "external.json"] as const;
export type StateFile = (typeof STATE_FILES)[number];

/** Current schema version of each state file. */
export const SCHEMA_VERSIONS: Record<StateFile, number> = {
  "config.json": 1,
  "selection.json": 1,
  "external.json": 1,
};

/** Migration from version N to N+1, keyed by `<file>@<N>`. */
export type Migration = (data: Record<string, unknown>) => Record<string, unknown>;
const migrations: Record<string, Migration> = {};

/** Registers a migration that upgrades `file` from `fromVersion`. */
export function registerMigration(file: StateFile, fromVersion: number, migrate: Migration): void {
  migrations[`${file}@${fromVersion}`] = migrate;
}

/** Path of a file or folder under the data directory. */
export function statePath(...parts: string[]): string {
  return join(baseDir(), ...parts);
}

/** Creates the data directory and its subfolders with mode 0700. */
export function ensureStateDirs(): void {
  for (const dir of ["", "state", "logs", "backups"]) mkdirSync(statePath(dir), { recursive: true, mode: 0o700 });
  // mkdir keeps the mode of a folder that already exists, such as the 755 one SetupVibe 1 created.
  try {
    chmodSync(statePath(), 0o700);
  } catch {
    // Not the owner: doctor reports the mode.
  }
}

/** Writes JSON atomically (temporary file + rename). */
export function writeJsonAtomic(path: string, data: unknown): void {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const tmp = `${path}.tmp-${process.pid}`;
  writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
  renameSync(tmp, path);
}

/** Copies a file into `backups/` with a timestamp. Returns the backup path. */
export function backupFile(path: string, label: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const target = statePath("backups", `${label}.${stamp}`);
  mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
  copyFileSync(path, target);
  return target;
}

/**
 * Reads a state file, migrating it to the current schema when needed.
 *
 * @returns the data, or `fallback` when the file does not exist.
 * @throws when the file is newer than this binary or a migration is missing.
 */
export function readState<T extends Record<string, unknown>>(file: StateFile, fallback: T): T {
  const path = statePath(file);
  if (!existsSync(path)) return { ...fallback, schemaVersion: SCHEMA_VERSIONS[file] };
  let data = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  let version = typeof data.schemaVersion === "number" ? data.schemaVersion : 0;
  const target = SCHEMA_VERSIONS[file];
  if (version > target) {
    throw new Error(`${file} uses schema ${version}, newer than this SetupVibe (${target}). Run: setupvibe upgrade`);
  }
  if (version < target) {
    backupFile(path, `${file}.schema-${version}`);
    while (version < target) {
      const migrate = migrations[`${file}@${version}`];
      if (!migrate) throw new Error(`No migration for ${file} from schema ${version}.`);
      data = migrate(data);
      version += 1;
      data.schemaVersion = version;
    }
    writeJsonAtomic(path, data);
  }
  return data as T;
}

/** Writes a state file with the current schema version. */
export function writeState(file: StateFile, data: Record<string, unknown>): void {
  writeJsonAtomic(statePath(file), { ...data, schemaVersion: SCHEMA_VERSIONS[file] });
}
