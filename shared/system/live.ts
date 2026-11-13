/**
 * Live machine readings for the Machine module and the Home card.
 *
 * A `LiveSampler` keeps the previous counters and turns them into rates on
 * each `tick()`: total and per-core CPU (from `os.cpus()`), network bytes per
 * second per interface (`/proc/net/dev`), disk reads and writes per second
 * (`/proc/diskstats`, physical disks only), plus memory, load, temperatures
 * (`/sys/class/thermal`) and the processes using the most CPU (`ps`). It also
 * keeps the last 60 values of CPU and memory for the history graphs. Linux
 * gives every reading; on macOS and Windows the ones without a source are
 * left empty. Parsers are pure, for tests.
 */
import os from "node:os";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cpuSample, cpuUsage, parseMeminfo, type CpuSample } from "./info.ts";

export interface NetRate {
  name: string;
  rxPerSec: number;
  txPerSec: number;
  rxTotal: number;
  txTotal: number;
}

export interface DiskRate {
  name: string;
  readPerSec: number;
  writePerSec: number;
}

export interface Proc {
  pid: number;
  name: string;
  cpu: number;
  mem: number;
  rssKb: number;
}

export interface LiveReading {
  cpu: number;
  perCore: number[];
  memUsed: number;
  memTotal: number;
  swapUsed: number;
  swapTotal: number;
  load: [number, number, number];
  net: NetRate[];
  disks: DiskRate[];
  temps: Array<{ name: string; celsius: number }>;
  processes: Proc[];
  processCount: number;
  uptimeSec: number;
  cpuHistory: number[];
  memHistory: number[];
}

/** /proc/net/dev → bytes received and sent per interface (loopback and container interfaces left out). */
export function parseNetDev(text: string): Record<string, { rx: number; tx: number }> {
  const out: Record<string, { rx: number; tx: number }> = {};
  for (const line of text.split("\n").slice(2)) {
    const m = line.match(/^\s*([^:]+):\s*(.*)$/);
    if (!m) continue;
    const name = m[1]!.trim();
    if (name === "lo" || /^(veth|br-|docker|virbr|vnet)/.test(name)) continue;
    const f = m[2]!.trim().split(/\s+/).map(Number);
    out[name] = { rx: f[0] ?? 0, tx: f[8] ?? 0 };
  }
  return out;
}

/** /proc/diskstats → sectors read and written per physical disk. */
export function parseDiskstats(text: string): Record<string, { read: number; write: number }> {
  const out: Record<string, { read: number; write: number }> = {};
  for (const line of text.split("\n")) {
    const f = line.trim().split(/\s+/);
    const name = f[2] ?? "";
    if (!/^(sd[a-z]+|vd[a-z]+|xvd[a-z]+|nvme\d+n\d+|mmcblk\d+)$/.test(name)) continue;
    out[name] = { read: Number(f[5] ?? 0), write: Number(f[9] ?? 0) };
  }
  return out;
}

/** `ps -eo pid,comm,pcpu,pmem,rss` lines → processes. */
export function parsePs(text: string): Proc[] {
  return text
    .split("\n")
    .map((l) => l.trim().split(/\s+/))
    .filter((f) => f.length >= 5 && /^\d+$/.test(f[0]!))
    .map((f) => ({ pid: Number(f[0]), name: f.slice(1, f.length - 3).join(" "), cpu: Number(f[f.length - 3]), mem: Number(f[f.length - 2]), rssKb: Number(f[f.length - 1]) }));
}

/** Eight-level bar chart of values from 0 to `max`. */
export function sparkline(values: number[], width: number, max = 100): string {
  const levels = "▁▂▃▄▅▆▇█";
  const tail = values.slice(-width);
  const pad = " ".repeat(Math.max(0, width - tail.length));
  return pad + tail.map((v) => levels[Math.min(levels.length - 1, Math.max(0, Math.round((v / max) * (levels.length - 1))))]).join("");
}

/** Bytes per second, short: "0 B/s", "12 KB/s", "3.4 MB/s". */
export function rate(bytesPerSec: number): string {
  if (bytesPerSec < 1024) return `${Math.round(bytesPerSec)} B/s`;
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(bytesPerSec < 10240 ? 1 : 0)} KB/s`;
  return `${(bytesPerSec / 1024 / 1024).toFixed(1)} MB/s`;
}

function read(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

function temperatures(): Array<{ name: string; celsius: number }> {
  const base = "/sys/class/thermal";
  if (!existsSync(base)) return [];
  try {
    return readdirSync(base)
      .filter((d) => d.startsWith("thermal_zone"))
      .flatMap((d) => {
        const milli = Number(read(join(base, d, "temp")).trim());
        if (!Number.isFinite(milli) || milli <= 0) return [];
        return [{ name: read(join(base, d, "type")).trim() || d, celsius: Math.round(milli / 1000) }];
      });
  } catch {
    return [];
  }
}

function topProcesses(limit: number): { list: Proc[]; count: number } {
  const argv = process.platform === "darwin" ? ["ps", "-Ao", "pid,comm,%cpu,%mem,rss", "-r"] : ["ps", "-eo", "pid,comm,pcpu,pmem,rss", "--sort=-pcpu", "--no-headers"];
  try {
    const r = Bun.spawnSync(argv, { stdout: "pipe", stderr: "ignore", env: process.env, timeout: 2000 });
    const all = parsePs(r.stdout.toString());
    return { list: all.slice(0, limit), count: all.length };
  } catch {
    return { list: [], count: 0 };
  }
}

/** Keeps the previous counters and returns rates on each tick. */
export class LiveSampler {
  private cpu: CpuSample = cpuSample();
  private perCoreBefore: CpuSample = cpuSample();
  private net = parseNetDev(read("/proc/net/dev"));
  private disk = parseDiskstats(read("/proc/diskstats"));
  private at = Date.now();
  private procs: { list: Proc[]; count: number } = { list: [], count: 0 };
  private ticks = 0;
  readonly cpuHistory: number[] = [];
  readonly memHistory: number[] = [];

  /** Reads everything; processes every second tick, since ps costs more. */
  tick(processLimit = 8): LiveReading {
    const now = Date.now();
    const seconds = Math.max(0.2, (now - this.at) / 1000);
    this.at = now;
    const cpuNow = cpuSample();
    const total = cpuUsage(this.cpu, cpuNow);
    const perCore = cpuNow.map((c, i) => cpuUsage([this.perCoreBefore[i] ?? c], [c]));
    this.cpu = cpuNow;
    this.perCoreBefore = cpuNow;

    const netNow = parseNetDev(read("/proc/net/dev"));
    const net = Object.entries(netNow).map(([name, n]) => {
      const before = this.net[name] ?? n;
      return { name, rxPerSec: Math.max(0, (n.rx - before.rx) / seconds), txPerSec: Math.max(0, (n.tx - before.tx) / seconds), rxTotal: n.rx, txTotal: n.tx };
    });
    this.net = netNow;

    const diskNow = parseDiskstats(read("/proc/diskstats"));
    const disks = Object.entries(diskNow).map(([name, d]) => {
      const before = this.disk[name] ?? d;
      // Sectors are 512 bytes in /proc/diskstats.
      return { name, readPerSec: Math.max(0, ((d.read - before.read) * 512) / seconds), writePerSec: Math.max(0, ((d.write - before.write) * 512) / seconds) };
    });
    this.disk = diskNow;

    const mem = existsSync("/proc/meminfo") ? parseMeminfo(read("/proc/meminfo")) : {};
    const memTotal = os.totalmem();
    const memUsed = memTotal - (mem.MemAvailable ?? os.freemem());
    if (this.ticks % 2 === 0) this.procs = topProcesses(processLimit);
    this.ticks++;

    this.cpuHistory.push(total);
    this.memHistory.push(memTotal ? Math.round((memUsed / memTotal) * 100) : 0);
    if (this.cpuHistory.length > 120) this.cpuHistory.shift();
    if (this.memHistory.length > 120) this.memHistory.shift();
    const load = os.loadavg();
    return {
      cpu: total,
      perCore,
      memUsed,
      memTotal,
      swapUsed: (mem.SwapTotal ?? 0) - (mem.SwapFree ?? 0),
      swapTotal: mem.SwapTotal ?? 0,
      load: [load[0] ?? 0, load[1] ?? 0, load[2] ?? 0],
      net,
      disks,
      temps: temperatures(),
      processes: this.procs.list,
      processCount: this.procs.count,
      uptimeSec: os.uptime(),
      cpuHistory: [...this.cpuHistory],
      memHistory: [...this.memHistory],
    };
  }
}
