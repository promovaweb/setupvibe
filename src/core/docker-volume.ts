/** Inspeciona volumes sem criar, remover ou adotar armazenamento externo. */
import{execFile}from'node:child_process';
export interface VolumeIdentity {name:string;managed:boolean;driver:string;operationId:string|null;}
export function parseVolumeIdentity(output:string):VolumeIdentity{
 const rows=JSON.parse(output);if(!Array.isArray(rows)||rows.length!==1)throw new Error("Invalid volume inspection.");
 const row=rows[0];if(!row||typeof row.Name!=='string'||typeof row.Driver!=='string')throw new Error("Invalid volume identity.");
 return{name:row.Name,driver:row.Driver,managed:row.Labels?.['dev.setupvibe.managed']==='true',operationId:typeof row.Labels?.['dev.setupvibe.operation']==='string'?row.Labels['dev.setupvibe.operation']:null};
}
/** Falha de inspeção não é interpretada como ausência do volume. */
export function inspectVolume(name:string,executable='docker'):Promise<VolumeIdentity>{
 if(!/^setupvibe-[a-z0-9-]+$/.test(name))return Promise.reject(new Error("Invalid volume name."));
 return new Promise((resolve,reject)=>execFile(executable,['volume','inspect',name],{timeout:3000,maxBuffer:262144,encoding:'utf8'},(error,stdout)=>{
  if(error)return reject(new Error("Could not inspect volume."));try{resolve(parseVolumeIdentity(stdout));}catch{reject(new Error("Invalid volume inspection."));}
 }));
}
export function assertManagedVolume(volume:VolumeIdentity,expected:string):void{
 if(!volume.managed||volume.name!==expected||volume.driver!=='local')throw new Error("External volume or mismatched identity; use refused.");
}

/** Gera criação identificada; o resultado precisa ser inspecionado antes de uso. */
export function volumeCreateStep(name:string,operationId:string){
 if(!/^setupvibe-[a-z0-9-]+$/.test(name)||!/^[-a-zA-Z0-9]{1,100}$/.test(operationId))throw new Error("Invalid volume identification.");
 return{id:'volume-create',command:'docker',args:['volume','create','--label','dev.setupvibe.managed=true','--label','dev.setupvibe.operation='+operationId,name]};
}
/** Impede adoção quando docker volume create encontra um volume já existente. */
export function assertCreatedVolume(volume:VolumeIdentity,name:string,operationId:string):void{
 assertManagedVolume(volume,name);
 if(volume.operationId!==operationId)throw new Error("Volume was not created by the current operation.");
}
