/** Descobre containers usando o CLI Docker sem executar alterações no daemon. */
import { execFile } from 'node:child_process';
export interface ContainerSummary { id:string;name:string;image:string;state:string;status:string;ports:string; }
/** Valida cada linha JSON e recusa resultados truncados ou incompletos. */
export function parseContainers(output:string):ContainerSummary[] {
  return output.split('\n').filter(line=>line.trim()).map(line=>{
    const row=JSON.parse(line);
    if(!row||typeof row!=='object'||['ID','Names','Image','State','Status','Ports'].some(key=>typeof row[key]!=='string'))throw new Error("Invalid Docker response.");
    return {id:row.ID,name:row.Names,image:row.Image,state:row.State,status:row.Status,ports:row.Ports};
  });
}
/** Usa timeout e limite de saída; indisponibilidade é distinta de lista vazia. */
export function discoverContainers(executable='docker',timeoutMs=3000):Promise<{available:boolean;containers:ContainerSummary[]}> {
  return new Promise(resolve=>{
    execFile(executable,['ps','--all','--no-trunc','--format','{{json .}}'],{timeout:timeoutMs,maxBuffer:2*1024*1024,encoding:'utf8'},(error,stdout)=>{
      if(error)return resolve({available:false,containers:[]});
      try{resolve({available:true,containers:parseContainers(stdout)});}catch{resolve({available:false,containers:[]});}
    });
  });
}

export interface ContainerIdentity {id:string;name:string;managed:boolean;image:string;running:boolean|null;}
/** Somente labels explícitas identificam recurso gerenciado; nome isolado não comprova posse. */
export function parseContainerIdentity(output:string):ContainerIdentity{
 const rows=JSON.parse(output);if(!Array.isArray(rows)||rows.length!==1)throw new Error("Invalid Docker inspection.");
 const row=rows[0];if(!row||typeof row.Id!=='string'||typeof row.Name!=='string'||typeof row.Config?.Image!=='string')throw new Error("Invalid Docker identity.");
 return{id:row.Id,name:row.Name.replace(/^\//,''),managed:row.Config.Labels?.['dev.setupvibe.managed']==='true',image:row.Config.Image,running:typeof row.State?.Running==='boolean'?row.State.Running:null};
}
/** Produz controle apenas para a identidade registrada, sem executar a operação. */
export function containerControl(identity:ContainerIdentity,registeredId:string,action:'start'|'stop'|'restart'):{command:string;args:string[]}{
 if(!['start','stop','restart'].includes(action))throw new Error("Invalid Docker action.");
 if(!identity.managed||identity.id!==registeredId)throw new Error("External container or mismatched identity; control refused.");
 if(!/^[a-f0-9]{12,64}$/.test(identity.id))throw new Error("Invalid Docker ID.");
 return{command:'docker',args:[action,identity.id]};
}

/** Inspeciona ID explícito sem permitir nomes interpretados como opções. */
export function inspectContainer(id:string,executable='docker'):Promise<ContainerIdentity>{
 if(!/^[a-f0-9]{12,64}$/.test(id))return Promise.reject(new Error("Invalid Docker ID."));
 return new Promise((resolve,reject)=>execFile(executable,['inspect','--type','container',id],{timeout:3000,maxBuffer:2*1024*1024,encoding:'utf8'},(error,stdout)=>{
  if(error)return reject(new Error("Could not inspect container."));
  try{resolve(parseContainerIdentity(stdout));}catch{reject(new Error("Invalid Docker inspection."));}
 }));
}
