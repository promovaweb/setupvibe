/**
 * Machine data for the Machine module of the TUI.
 *
 * Read locally, without network calls: Node's `os` (host, kernel, CPU, load,
 * memory, uptime, interfaces), `df -kP` (disks), `/proc/meminfo` (swap and
 * available memory on Linux), `systemd-detect-virt` (virtualization) and the
 * environment (user, shell, time zone, locale). CPU usage is the difference
 * between two samples of `os.cpus()`. Parsers are pure, for tests.
 */
import os from "node:os";
import { existsSync, readFileSync } from "node:fs";

export interface Disk {
  mount: string;
  filesystem: string;
  sizeKb: number;
  usedKb: number;
  availKb: number;
  percent: number;
}

export interface NetInterface {
  name: string;
  addresses: string[];
}

export interface MachineInfo {
  hostname: string;
  kernel: string;
  arch: string;
  platform: string;
  cpuModel: string;
  cores: number;
  load: [number, number, number];
  memTotal: number;
  /** Memory the system can still give to programs (MemAvailable on Linux). */
  memAvailable: number;
  swapTotal: number;
  swapFree: number;
  uptimeSec: number;
  disks: Disk[];
  interfaces: NetInterface[];
  /** Container and bridge interfaces (veth*, br-*, docker*) left out of the list. */
  hiddenInterfaces: number;
  virtualization: string;
  user: string;
  shell: string;
  timezone: string;
  locale: string;
}

/** Reads `df -kP` output; pseudo file systems are left out. */
export function parseDf(text: string): Disk[] {
  const seen = new Set<string>();
  return text
    .split("\n")
    .slice(1)
    .map((l) => l.trim().split(/\s+/))
    .filter((c) => c.length >= 6 && /^\d+$/.test(c[1]!))
    .map((c) => ({ filesystem: c[0]!, sizeKb: Number(c[1]), usedKb: Number(c[2]), availKb: Number(c[3]), percent: Number(c[4]!.replace("%", "")), mount: c.slice(5).join(" ") }))
    .filter((d) => !/^(tmpfs|devtmpfs|overlay|shm|udev|none|efivarfs)$/.test(d.filesystem) && d.sizeKb > 0)
    .filter((d) => (seen.has(d.mount) ? false : (seen.add(d.mount), true)));
}

/** Reads /proc/meminfo values in bytes. */
export function parseMeminfo(text: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^(\w+):\s+(\d+)\s*kB/);
    if (m) out[m[1]!] = Number(m[2]) * 1024;
  }
  return out;
}

/** Interfaces with addresses, without loopback; container bridges are counted apart. */
export function groupInterfaces(ifaces: NodeJS.Dict<os.NetworkInterfaceInfo[]>): { interfaces: NetInterface[]; hidden: number } {
  const interfaces: NetInterface[] = [];
  let hidden = 0;
  for (const [name, list] of Object.entries(ifaces)) {
    if (!list || list.every((a) => a.internal)) continue;
    if (/^(veth|br-|docker|virbr|vnet)/.test(name)) {
      hidden++;
      continue;
    }
    interfaces.push({ name, addresses: list.filter((a) => !a.internal).map((a) => (a.family === "IPv4" ? a.address : a.address.split("%")[0]!)) });
  }
  return { interfaces, hidden };
}

export type CpuSample = Array<{ idle: number; total: number }>;

/** One sample of every core's time counters. */
export function cpuSample(cpus = os.cpus()): CpuSample {
  return cpus.map((c) => {
    const total = Object.values(c.times).reduce((a, b) => a + b, 0);
    return { idle: c.times.idle, total };
  });
}

/** CPU usage between two samples, 0 to 100. */
export function cpuUsage(before: CpuSample, after: CpuSample): number {
  let idle = 0;
  let total = 0;
  after.forEach((a, i) => {
    const b = before[i];
    if (!b) return;
    idle += a.idle - b.idle;
    total += a.total - b.total;
  });
  return total > 0 ? Math.round(((total - idle) / total) * 100) : 0;
}

/** 345838 → "4 d 0 h"; 3700 → "1 h 1 min". */
export function formatDuration(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d) return `${d} d ${h} h`;
  if (h) return `${h} h ${m} min`;
  return `${m} min`;
}

function run(argv: string[]): string {
  try {
    const r = Bun.spawnSync(argv, { stdout: "pipe", stderr: "ignore", env: process.env, timeout: 3000 });
    return r.exitCode === 0 ? r.stdout.toString() : "";
  } catch {
    return "";
  }
}

/** Reads everything once. */
export function machineInfo(): MachineInfo {
  const cpus = os.cpus();
  const mem = existsSync("/proc/meminfo") ? parseMeminfo(readFileSync("/proc/meminfo", "utf8")) : {};
  const { interfaces, hidden } = groupInterfaces(os.networkInterfaces());
  const home = process.env.HOME ?? os.homedir();
  const dfText = process.platform === "win32" ? "" : run(["df", "-kP", "/", home]);
  const load = os.loadavg() as [number, number, number];
  return {
    hostname: os.hostname(),
    kernel: os.release(),
    arch: os.arch(),
    platform: os.platform(),
    cpuModel: (cpus[0]?.model ?? "").replace(/\s+/g, " ").trim(),
    cores: cpus.length,
    load: [load[0], load[1], load[2]],
    memTotal: os.totalmem(),
    memAvailable: mem.MemAvailable ?? os.freemem(),
    swapTotal: mem.SwapTotal ?? 0,
    swapFree: mem.SwapFree ?? 0,
    uptimeSec: os.uptime(),
    disks: parseDf(dfText),
    interfaces,
    hiddenInterfaces: hidden,
    virtualization: process.platform === "linux" ? run(["systemd-detect-virt"]).trim() || "none" : "",
    user: process.env.USER ?? process.env.USERNAME ?? "",
    shell: (process.env.SHELL ?? process.env.ComSpec ?? "").split(/[\\/]/).pop() ?? "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale: process.env.LC_ALL || process.env.LANG || "",
  };
}
