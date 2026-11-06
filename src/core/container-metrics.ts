/** Consulta estatísticas Docker sem modificar containers ou inferir propriedade. */
import {execFile} from 'node:child_process';
export interface ContainerMetric {id:string;name:string;cpuPercent:number|null;memoryUsed:number|null;memoryLimit:number|null;pids:number|null;}
export interface ContainerMetrics {status:'loading'|'available'|'unavailable';sampledAt:string|null;containers:ContainerMetric[];}
/** Valida também fornecedores injetados antes de persistir suas amostras. */
export function validateContainerMetrics(value:ContainerMetrics,now=Date.now()):void{
  if(!value||!['loading','available','unavailable'].includes(value.status)||!Array.isArray(value.containers)||value.containers.length>10000)throw Error("Invalid Docker sample.");
  if(value.status==='loading'?value.sampledAt!==null:value.sampledAt===null||!Number.isFinite(Date.parse(value.sampledAt))||Date.parse(value.sampledAt)>now)throw Error("Invalid Docker timestamp.");
  if(value.status!=='available'&&value.containers.length)throw Error("Containers require an available Docker sample.");
  const seen=new Set<string>();
  for(const item of value.containers){
    if(!item||typeof item.id!=='string'||! /^[a-f0-9]{12,64}$/.test(item.id)||typeof item.name!=='string'||! /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(item.name)||seen.has(item.id))throw Error("Invalid container metrics.");seen.add(item.id);
    if(item.cpuPercent!==null&&(!Number.isFinite(item.cpuPercent)||item.cpuPercent<0)||[item.memoryUsed,item.memoryLimit,item.pids].some(number=>number!==null&&(!Number.isSafeInteger(number)||number<0))||item.memoryUsed!==null&&item.memoryLimit!==null&&item.memoryUsed>item.memoryLimit)throw Error("Invalid Docker counters.");
  }
}
/** Valores do CLI são arredondados; não representam contadores brutos da API. */
function bytes(value:string):number|null{
  if(value==='--')return null;
  const match=/^(\d+(?:\.\d+)?)\s*(B|kB|KB|MB|GB|TB|KiB|MiB|GiB|TiB)$/.exec(value);
  if(!match)throw Error("Invalid Docker memory unit.");
  const units:Record<string,number>={B:1,kB:1000,KB:1000,MB:1e6,GB:1e9,TB:1e12,KiB:1024,MiB:1024**2,GiB:1024**3,TiB:1024**4};
  const result=Math.round(Number(match[1])*units[match[2]!]!);
  if(!Number.isSafeInteger(result)||result<0)throw Error("Invalid Docker memory values.");return result;
}
/** CPU segue a convenção Docker: 100% corresponde a um núcleo e pode exceder 100%. */
export function parseContainerMetrics(output:string):ContainerMetric[]{
  const rows=output.split('\n').filter(line=>line.trim());if(rows.length>10000)throw Error('Too many containers.');
  const seen=new Set<string>();
  return rows.map(line=>{
    const row=JSON.parse(line);
    if(!row||!['ID','Name','CPUPerc','MemUsage','PIDs'].every(key=>typeof row[key]==='string')||! /^[a-f0-9]{12,64}$/.test(row.ID)||! /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(row.Name)||seen.has(row.ID))throw Error("Invalid Docker statistics.");seen.add(row.ID);
    const cpuPercent=row.CPUPerc==='--'?null:/^\d+(?:\.\d+)?%$/.test(row.CPUPerc)?Number(row.CPUPerc.slice(0,-1)):NaN;
    const memory=row.MemUsage.split(' / ');if(memory.length!==2)throw Error("Invalid Docker memory values.");
    const memoryUsed=bytes(memory[0]),memoryLimit=bytes(memory[1]);
    const pids=row.PIDs==='--'?null:/^\d+$/.test(row.PIDs)?Number(row.PIDs):NaN;
    if(cpuPercent!==null&&(!Number.isFinite(cpuPercent)||cpuPercent<0)||pids!==null&&(!Number.isSafeInteger(pids)||pids<0)||memoryUsed!==null&&memoryLimit!==null&&memoryUsed>memoryLimit)throw Error("Invalid Docker counters.");
    return{id:row.ID,name:row.Name,cpuPercent,memoryUsed,memoryLimit,pids};
  });
}
/** Respostas ausentes, inválidas, canceladas ou fora do prazo não viram lista vazia disponível. */
export function discoverContainerMetrics(executable='docker',signal?:AbortSignal):Promise<ContainerMetrics>{
  return new Promise(resolve=>execFile(executable,['stats','--no-stream','--no-trunc','--format','{{json .}}'],{encoding:'utf8',timeout:4000,maxBuffer:2*1024*1024,signal},(error,stdout)=>{
    const sampledAt=new Date().toISOString();
    if(error)return resolve({status:'unavailable',sampledAt,containers:[]});
    try{resolve({status:'available',sampledAt,containers:parseContainerMetrics(stdout)});}catch{resolve({status:'unavailable',sampledAt,containers:[]});}
  }));
}
