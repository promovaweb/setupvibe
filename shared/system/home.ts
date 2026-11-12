/**
 * Home folder of the running user.
 *
 * Bun caches `os.homedir()` for the life of the process and ignores later
 * changes to HOME, and some automation runs SetupVibe with HOME pointing at
 * another folder (`sudo -H`, CI, tests). This reads HOME (USERPROFILE on
 * Windows) first and falls back to `os.homedir()`.
 */
import { homedir as osHomedir } from "node:os";

export function homedir(): string {
  const fromEnv = process.platform === "win32" ? process.env.USERPROFILE : process.env.HOME;
  return fromEnv && fromEnv.length > 0 ? fromEnv : osHomedir();
}
