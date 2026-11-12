/**
 * System detection.
 *
 * Works out which supported system SetupVibe is running on, its version and
 * architecture, whether it is WSL, whether the machine is headless and
 * whether it has a public IP address. The pure functions take their inputs as
 * arguments so they can be tested with fixtures; `detectSystem()` gathers the
 * real inputs from the running machine.
 *
 * Spec sections 2 (supported systems) and 18 (desktop on a server).
 */
import { existsSync, readFileSync } from "node:fs";
import { arch as osArch, networkInterfaces, platform as osPlatform, release as osRelease } from "node:os";
import type { System } from "../inventory.ts";

export type Arch = "x64" | "arm64";

/** Machine variant used to decide GUI items and the security module. */
export type Variant = "local" | "remote-headless" | "remote-exposed";

export interface DetectedSystem {
  /** Supported system id, or undefined when the system is not supported. */
  system?: System;
  /** Raw identifier (os-release ID, "darwin" or "windows"). */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Version string (VERSION_ID, macOS product version or Windows build). */
  version: string;
  /** Normalized architecture, or the raw value when unsupported. */
  arch: Arch | string;
  wsl: boolean;
  headless: boolean;
  publicIp: boolean;
  variant: Variant;
  /** Why the system is not supported, when it is not. */
  unsupportedReason?: string;
  /** Distribution, codename and Ubuntu base codename for APT repositories. */
  distro?: { distro: string; codename: string; ubuntuCodename?: string };
}

/** Minimum versions per system (spec section 2). */
export const MINIMUM_VERSIONS: Partial<Record<System, string>> = {
  ubuntu: "24.04",
  debian: "12",
  mint: "22",
  zorin: "18",
  macos: "12",
  windows: "22621",
};

/** Architectures supported per system. */
export const SUPPORTED_ARCHES: Record<System, Arch[]> = {
  ubuntu: ["x64", "arm64"],
  debian: ["x64", "arm64"],
  mint: ["x64"],
  zorin: ["x64"],
  arch: ["x64"],
  omarchy: ["x64"],
  macos: ["x64", "arm64"],
  windows: ["x64"],
  wsl: ["x64", "arm64"],
};

/** Parses the KEY=value lines of /etc/os-release. */
export function parseOsRelease(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    out[match[1]!] = match[2]!.replace(/^["']|["']$/g, "");
  }
  return out;
}

/** Normalizes Node/uname architecture names. */
export function normalizeArch(raw: string): Arch | string {
  if (["x64", "x86_64", "amd64"].includes(raw)) return "x64";
  if (["arm64", "aarch64"].includes(raw)) return "arm64";
  return raw;
}

/**
 * Compares dotted numeric versions.
 *
 * @returns negative when a < b, zero when equal, positive when a > b.
 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(/[.-]/).map((x) => Number.parseInt(x, 10) || 0);
  const pb = b.split(/[.-]/).map((x) => Number.parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Maps os-release fields to a supported Linux system.
 *
 * Omarchy is recognized by its own marker (`omarchy` flag), because its
 * os-release says Arch.
 */
export function linuxSystemFromOsRelease(fields: Record<string, string>, flags: { wsl: boolean; omarchy: boolean }): System | undefined {
  const id = (fields.ID ?? "").toLowerCase();
  if (flags.wsl && (id === "ubuntu" || id === "debian")) return "wsl";
  if (flags.omarchy && id === "arch") return "omarchy";
  if (id === "linuxmint") return "mint";
  if (["ubuntu", "debian", "zorin", "arch"].includes(id)) return id as System;
  return undefined;
}

/** True when a running Linux kernel belongs to WSL. */
export function isWsl(env: Record<string, string | undefined>, procVersion: string): boolean {
  return Boolean(env.WSL_DISTRO_NAME || env.WSL_INTEROP) || /microsoft/i.test(procVersion);
}

/**
 * True when the machine has no graphical session: no display variables, an
 * SSH session, or no terminal at all.
 */
export function isHeadless(env: Record<string, string | undefined>, platform: string, tty: boolean): boolean {
  if (platform === "darwin" || platform === "win32") {
    return Boolean(env.SSH_CONNECTION || env.SSH_TTY) || !tty;
  }
  if (env.DISPLAY || env.WAYLAND_DISPLAY) return false;
  if (env.XDG_SESSION_TYPE === "x11" || env.XDG_SESSION_TYPE === "wayland") return false;
  return true;
}

/** True when an IPv4 or IPv6 address is publicly routable. */
export function isPublicAddress(address: string): boolean {
  if (address.includes(":")) {
    const a = address.toLowerCase();
    if (a === "::1" || a.startsWith("fe80") || a.startsWith("fc") || a.startsWith("fd")) return false;
    return /^[23]/.test(a);
  }
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return false;
  const [a, b] = parts as [number, number, number, number];
  if (a === 10 || a === 127 || a === 0) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 169 && b === 254) return false;
  if (a === 100 && b >= 64 && b <= 127) return false; // CGNAT and Tailscale
  if (a >= 224) return false;
  return true;
}

/**
 * Distribution info for APT repositories. Mint and Zorin use the Ubuntu
 * repositories of their base release.
 */
export function distroInfoFromOsRelease(fields: Record<string, string>): { distro: string; codename: string; ubuntuCodename?: string } {
  const id = (fields.ID ?? "").toLowerCase();
  const ubuntuCodename = fields.UBUNTU_CODENAME;
  const ubuntuBased = id === "linuxmint" || id === "zorin";
  return {
    distro: ubuntuBased ? "ubuntu" : id,
    codename: ubuntuBased && ubuntuCodename ? ubuntuCodename : (fields.VERSION_CODENAME ?? ""),
    ...(ubuntuCodename ? { ubuntuCodename } : {}),
  };
}

/** Variant from headless and public IP flags. */
export function variantOf(headless: boolean, publicIp: boolean): Variant {
  if (!headless) return "local";
  return publicIp ? "remote-exposed" : "remote-headless";
}

/** Reason a detected system is not supported, or undefined when it is. */
export function unsupportedReason(system: System | undefined, version: string, arch: string, allowed: readonly System[]): string | undefined {
  if (!system) return "This operating system is not supported.";
  if (!allowed.includes(system)) return `${system} is not supported by this edition.`;
  if (!SUPPORTED_ARCHES[system].includes(arch as Arch)) return `${arch} is not supported on ${system}.`;
  const min = MINIMUM_VERSIONS[system];
  if (min && compareVersions(version, min) < 0) return `${system} ${version} is older than the minimum ${min}.`;
  return undefined;
}

function readText(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

function hasPublicIp(): boolean {
  for (const list of Object.values(networkInterfaces())) {
    for (const info of list ?? []) {
      if (!info.internal && isPublicAddress(info.address)) return true;
    }
  }
  return false;
}

function macosVersion(): string {
  const proc = Bun.spawnSync(["sw_vers", "-productVersion"], { stdout: "pipe", stderr: "ignore" });
  return proc.stdout.toString().trim();
}

/**
 * Detects the running system.
 *
 * @param allowed systems supported by the running edition
 */
export function detectSystem(allowed: readonly System[]): DetectedSystem {
  const env = process.env;
  const platform = osPlatform();
  const arch = normalizeArch(osArch());
  const tty = Boolean(process.stdin.isTTY && process.stdout.isTTY);
  const headless = isHeadless(env, platform, tty);
  const publicIp = hasPublicIp();

  let system: System | undefined;
  let id = platform as string;
  let name = platform as string;
  let version = "";
  let wsl = false;
  let distro: DetectedSystem["distro"];

  if (platform === "linux") {
    const fields = parseOsRelease(readText("/etc/os-release"));
    wsl = isWsl(env, readText("/proc/version"));
    const omarchy = existsSync("/usr/share/omarchy");
    system = linuxSystemFromOsRelease(fields, { wsl, omarchy });
    id = fields.ID ?? "linux";
    name = fields.PRETTY_NAME ?? "Linux";
    version = fields.VERSION_ID ?? "";
    distro = distroInfoFromOsRelease(fields);
  } else if (platform === "darwin") {
    system = "macos";
    id = "darwin";
    version = macosVersion();
    name = `macOS ${version}`;
  } else if (platform === "win32") {
    system = "windows";
    id = "windows";
    version = osRelease().split(".")[2] ?? "";
    name = `Windows build ${version}`;
  }

  return {
    system,
    id,
    name,
    version,
    arch,
    wsl,
    headless,
    publicIp,
    variant: variantOf(headless, publicIp),
    unsupportedReason: unsupportedReason(system, version, arch, allowed),
    ...(distro ? { distro } : {}),
  };
}
