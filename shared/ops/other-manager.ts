/**
 * Tools installed by another manager (spec sections 6 and 10).
 *
 * SetupVibe installs through mise into its own folders, so it never
 * overwrites a tool that came from APT, Homebrew, npm or a vendor installer.
 * It still tells the person: `list` and the TUI show the status `other`, and
 * `install` prints where the existing command comes from.
 */
import { homedir } from "../system/home.ts";
import { join } from "node:path";
import type { Item } from "../inventory.ts";

/** Command checked by an item, from the first word of `verify.command`. */
export function verifyCommandName(item: Item): string | undefined {
  const first = item.verify.command.trim().split(/\s+/)[0];
  if (!first || ["test", "sh", "command", "[", "fc-list", "systemctl", "docker", "loginctl", "swapon", "timedatectl", "wsl", "ufw", "fail2ban-client"].includes(first)) return undefined;
  return first;
}

/**
 * Path of the command when it lives outside SetupVibe's folders (the mise
 * installs and shims and ~/.local/bin), or undefined.
 */
export function otherManagerPath(item: Item, which: (cmd: string) => string | null = (c) => Bun.which(c), home = homedir()): string | undefined {
  const cmd = verifyCommandName(item);
  if (!cmd) return undefined;
  const path = which(cmd);
  if (!path) return undefined;
  const ours = [join(home, ".local", "share", "mise"), join(home, ".local", "bin"), join(process.env.LOCALAPPDATA ?? join(home, "AppData", "Local"), "mise")];
  return ours.some((dir) => path.startsWith(dir)) ? undefined : path;
}
