/** Formata métricas Docker com ausência e idade explícitas, sem consultar o daemon. */
import type {ContainerMetrics} from '../core/container-metrics';
export function containerMetricsText(value?:ContainerMetrics,now=Date.now()):string{
  if(!value)return "Docker containers\nNo collector samples.";
  if(value.status==='loading')return "Docker containers\nWaiting for the first query.";
  if(value.status==='unavailable')return "Docker containers\nDocker unavailable or invalid response.";
  const age=value.sampledAt?now-Date.parse(value.sampledAt):Infinity;
  const source=age<0||age>15000?"Stale sample":"Recent sample";
  const mib=(number:number|null)=>number===null?"unavailable":(number/1024**2).toFixed(1)+' MiB';
  return `Docker containers · ${source}\nSample: ${value.sampledAt}\nCPU: 100% represents one CPU core.\n\n`+
    (value.containers.length?value.containers.map(item=>`${item.name}\nCPU: ${item.cpuPercent===null?"unavailable":item.cpuPercent.toFixed(1)+'%'} · PIDs: ${item.pids??"unavailable"}\nMemory: ${mib(item.memoryUsed)} / ${mib(item.memoryLimit)}`).join('\n\n'):"No running containers.");
}
