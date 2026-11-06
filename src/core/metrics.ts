/** Coleta métricas locais sem subprocessos e calcula CPU por diferenças entre amostras. */
import { readSwap, type SwapSample } from './swap';
import { readDisk, type DiskSample } from './disk';
import { cpus, freemem, totalmem, uptime } from 'node:os';
import type {ContainerMetrics} from './container-metrics';
export interface CpuCounters { idle: number; total: number; count: number; }
export interface HostSample { timestamp: string; cpuPercent: number | null; memoryTotal: number; memoryUsed: number; uptimeSeconds: number; disk?: DiskSample | null; swap?: SwapSample | null; docker?:ContainerMetrics; }
/** Uma leitura isolada não permite inferir utilização instantânea de CPU. */
export function cpuUsage(previous: CpuCounters | null, current: CpuCounters): number | null {
  if (!previous || previous.count !== current.count || current.total <= previous.total || current.idle < previous.idle) return null;
  const total = current.total - previous.total, idle = current.idle - previous.idle;
  if (idle > total) return null;
  return Math.max(0, Math.min(100, (1 - idle / total) * 100));
}
/** Mantém referência somente em memória; o chamador decide frequência e persistência. */
export class HostSampler {
  private previous: CpuCounters | null = null;
  private previousTime: number | null = null;
  constructor(private maxGapMs = 15000, private clock: () => number = Date.now, private diskPath = '/') {
    if (!Number.isFinite(maxGapMs) || maxGapMs < 1) throw new Error("Invalid maximum interval.");
  }
  sample(): HostSample {
    const now = this.clock();
    if (!Number.isFinite(now)) throw new Error("Invalid clock.");
    if (this.previousTime === null || now <= this.previousTime || now - this.previousTime > this.maxGapMs) this.previous = null;
    this.previousTime = now;
    const cores = cpus();
    const current = { idle: cores.reduce((sum,core)=>sum+core.times.idle,0), total: cores.reduce((sum,core)=>sum+Object.values(core.times).reduce((a,b)=>a+b,0),0), count: cores.length };
    const cpuPercent = current.count ? cpuUsage(this.previous,current) : null;
    this.previous = current.count ? current : null;
    const memoryTotal=totalmem();
    return { timestamp:new Date(now).toISOString(),cpuPercent,memoryTotal,memoryUsed:Math.max(0,memoryTotal-freemem()),uptimeSeconds:uptime(),disk:readDisk(this.diskPath),swap:readSwap() };
  }
}
