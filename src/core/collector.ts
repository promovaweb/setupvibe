/** Executa amostragem periódica sequencial, independente da interface de terminal. */
import { dirname } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { acquireCollectorLock } from './collector-lock';
import { HostSampler } from './metrics';
import { MetricsStore } from './metrics-store';
import {discoverContainerMetrics,type ContainerMetrics} from './container-metrics';
/** O chamador controla o sinal e o caminho; cancelamento fecha o banco no finally. */
export async function collectHost(path: string, options: {signal:AbortSignal;intervalMs?:number;containerMetrics?:typeof discoverContainerMetrics}): Promise<number> {
  const interval=options.intervalMs??5000;
  if(!Number.isInteger(interval)||interval<100||interval>3600000)throw new Error('Interval must be between 100 and 3600000 ms.');
  if(options.signal.aborted)return 0;
  const release=acquireCollectorLock(path + ".collector-lock");
  let store: MetricsStore | undefined;
  const sampler=new HostSampler(interval * 3, Date.now, dirname(path));let count=0;
  const dockerController=new AbortController(),cancelDocker=()=>dockerController.abort();options.signal.addEventListener('abort',cancelDocker,{once:true});
  let docker:ContainerMetrics={status:'loading',sampledAt:null,containers:[]},pending:Promise<void>|null=null,nextDocker=0;
  try {
    store=new MetricsStore(path,true);
    while(!options.signal.aborted){
      // A consulta Docker não atrasa a cadência do host; no máximo uma fica ativa.
      if(!pending&&Date.now()>=nextDocker){
        pending=(options.containerMetrics??discoverContainerMetrics)('docker',dockerController.signal).then(value=>{if(!dockerController.signal.aborted)docker=value;}).catch(()=>{docker={status:'unavailable',sampledAt:new Date().toISOString(),containers:[]};}).finally(()=>{pending=null;nextDocker=Date.now()+Math.max(interval,5000);});
      }
      store.append({...sampler.sample(),docker});count++;
      try{await delay(interval,undefined,{signal:options.signal});}
      catch(error){if(!options.signal.aborted)throw error;}
    }
    return count;
  } finally {dockerController.abort();await pending;options.signal.removeEventListener('abort',cancelDocker);store?.close();release();}
}
