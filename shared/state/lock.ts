/**
 * Run lock (`~/.setupvibe/run.lock`).
 *
 * Only one SetupVibe run changes the machine at a time. The lock stores the
 * PID of its owner; a lock left by a process that no longer exists is taken
 * over. A live owner makes the second run exit with LOCKED (30).
 */
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { statePath, ensureStateDirs } from "./store.ts";

/** True when a process with this PID is alive. */
export function processAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
}

/**
 * Takes the lock.
 *
 * @returns a release function, or undefined when another live run holds it
 */
export function acquireLock(pid = process.pid): (() => void) | undefined {
  ensureStateDirs();
  const path = statePath("run.lock");
  if (existsSync(path)) {
    const owner = Number.parseInt(readFileSync(path, "utf8"), 10);
    if (owner && owner !== pid && processAlive(owner)) return undefined;
  }
  writeFileSync(path, String(pid), { mode: 0o600 });
  return () => {
    try {
      if (readFileSync(path, "utf8").trim() === String(pid)) rmSync(path);
    } catch {
      // Already gone.
    }
  };
}
