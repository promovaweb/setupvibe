/**
 * The user SetupVibe runs as.
 *
 * Bun's `os.userInfo().username` can come back as "unknown" (seen with
 * `docker exec --user`), and USER can be stale: the auto root phase runs the
 * user phase through `runuser`, which keeps USER=root. On Unix the name comes
 * from `id -un`, which follows the real UID; variables are only a fallback.
 * Found by the container tests, where `chsh` targeted a user named "unknown".
 */
import { homedir, userInfo } from "node:os";

/** Name of the running user: `id -un` on Unix, then USER/LOGNAME, then os.userInfo. */
export function currentUserName(env: Record<string, string | undefined> = process.env): string {
  if (process.platform !== "win32") {
    const id = Bun.spawnSync(["id", "-un"], { stdout: "pipe", stderr: "ignore" });
    const name = id.stdout.toString().trim();
    if (id.exitCode === 0 && name) return name;
  }
  const fromEnv = env.USER || env.LOGNAME || env.USERNAME;
  if (fromEnv && fromEnv !== "unknown") return fromEnv;
  return userInfo().username;
}

/** Same shape as os.userInfo(), with a reliable name. */
export function currentUser(): { username: string; homedir: string } {
  return { username: currentUserName(), homedir: homedir() };
}
