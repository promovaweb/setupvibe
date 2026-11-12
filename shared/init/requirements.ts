/**
 * Requirements checked before `init` and `auto` change anything.
 *
 * Disk space, memory, network, clock and locale (spec section 17), plus the
 * root rule (section 3) and edition exclusivity (section 1). Each check
 * returns a status and, when it fails, the exit code and the fix.
 */
import { statfsSync } from "node:fs";
import { homedir, totalmem } from "node:os";
import { ExitCode } from "../core/app/exit-codes.ts";

export type CheckStatus = "ok" | "warn" | "fail";

export interface RequirementCheck {
  name: string;
  status: CheckStatus;
  detail: string;
  /** Exit code when the check fails. */
  code?: ExitCode;
  /** Command or action that fixes it. */
  fix?: string;
}

/** Free disk space required in the home folder, in GB (spec section 17). */
export const MIN_DISK_GB = { desktop: 10, server: 5 } as const;

/** Memory below which the remoto profile adds swap, in GB. */
export const LOW_MEMORY_GB = 2;

export function checkDisk(freeGb: number, edition: "desktop" | "server"): RequirementCheck {
  const min = MIN_DISK_GB[edition];
  return freeGb >= min
    ? { name: "disk", status: "ok", detail: `${freeGb.toFixed(1)} GB free (minimum ${min} GB)` }
    : { name: "disk", status: "fail", detail: `${freeGb.toFixed(1)} GB free, ${min} GB needed`, code: ExitCode.DISK_SPACE, fix: "Free disk space in the home folder and run again." };
}

export function checkMemory(totalGb: number): RequirementCheck {
  return totalGb >= LOW_MEMORY_GB
    ? { name: "memory", status: "ok", detail: `${totalGb.toFixed(1)} GB` }
    : { name: "memory", status: "warn", detail: `${totalGb.toFixed(1)} GB; builds may run out of memory`, fix: "Install the swap item: setupvibe install swap" };
}

export function checkLocale(env: Record<string, string | undefined>): RequirementCheck {
  const value = env.LC_ALL || env.LC_CTYPE || env.LANG || "";
  return /utf-?8/i.test(value)
    ? { name: "locale", status: "ok", detail: value }
    : { name: "locale", status: "warn", detail: value || "not set", fix: "Use a UTF-8 locale, for example: export LANG=C.UTF-8" };
}

/** Clock check from the `Date` header of an HTTPS response. */
export function checkClock(serverDate: Date | undefined, now: Date): RequirementCheck {
  if (!serverDate || Number.isNaN(serverDate.getTime())) return { name: "clock", status: "warn", detail: "could not compare with a server" };
  const skew = Math.abs(now.getTime() - serverDate.getTime()) / 1000;
  return skew <= 300
    ? { name: "clock", status: "ok", detail: `${Math.round(skew)} s from the server` }
    : { name: "clock", status: "fail", detail: `${Math.round(skew)} s off; TLS and checksums can fail`, code: ExitCode.GENERIC_ERROR, fix: "Enable time sync: sudo timedatectl set-ntp true" };
}

export function checkRoot(root: boolean, allowRoot: boolean): RequirementCheck {
  if (!root) return { name: "user", status: "ok", detail: "not root" };
  return allowRoot
    ? { name: "user", status: "ok", detail: "root, only to create the working user" }
    : { name: "user", status: "fail", detail: "running as root", code: ExitCode.ROOT, fix: "Create a user first: setupvibe user create <name>, then log in as that user." };
}

export function checkEdition(installed: string | undefined, running: "desktop" | "server"): RequirementCheck {
  if (!installed || installed === running) return { name: "edition", status: "ok", detail: running };
  return {
    name: "edition",
    status: "fail",
    detail: `the ${installed} edition is already set up on this machine`,
    code: ExitCode.USAGE,
    fix: "Desktop and server are exclusive; keep the installed edition or run self uninstall first.",
  };
}

/** Free space of the home folder in GB. */
export function freeDiskGb(path = homedir()): number {
  const s = statfsSync(path);
  return (s.bavail * s.bsize) / 1e9;
}

/** Total memory in GB. */
export function totalMemoryGb(): number {
  return totalmem() / 1e9;
}

/** Network and clock check against GitHub, where every download comes from. */
export async function checkNetworkAndClock(now = new Date(), fetcher: typeof fetch = fetch): Promise<RequirementCheck[]> {
  try {
    const r = await fetcher("https://github.com/", { method: "HEAD", signal: AbortSignal.timeout(5000) });
    const date = r.headers.get("date");
    return [{ name: "network", status: "ok", detail: "github.com reachable" }, checkClock(date ? new Date(date) : undefined, now)];
  } catch {
    return [
      { name: "network", status: "fail", detail: "github.com unreachable", code: ExitCode.NETWORK_OR_API, fix: "Check the connection, proxy (HTTPS_PROXY) and DNS." },
      { name: "clock", status: "warn", detail: "not checked without network" },
    ];
  }
}

/** First failing check's exit code, or SUCCESS. */
export function exitCodeOf(checks: RequirementCheck[]): ExitCode {
  return checks.find((c) => c.status === "fail")?.code ?? ExitCode.SUCCESS;
}
