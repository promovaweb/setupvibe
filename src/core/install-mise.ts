/** Instala binário nativo Mise por checksum sem alterar o PATH do usuário. */
import {existsSync,mkdirSync,mkdtempSync,realpathSync,statSync,chmodSync,writeFileSync,readFileSync} from 'node:fs';
import {join,dirname,isAbsolute} from 'node:path';
import {execFile} from 'node:child_process';
import {miseArtifact} from './mise-artifact';
import {downloadArtifact} from './download';
import {verifyArtifact} from './integrity';
import {StateStore} from './state';
import {statePath} from './history';
import {executeSteps} from './executor';
import {acquireCollectorLock} from './collector-lock';
import type {Target} from './platform';
/** Verifica os bytes registrados antes de executar a confirmação de versão. */
async function verifyManagedMise(component:{version:string;location:string}){
  try{
    if(realpathSync(component.location)!==component.location)throw Error("Symlinks are not accepted.");
    const metadata=JSON.parse(readFileSync(join(dirname(component.location),'artifact.json'),'utf8'));
    if(metadata.version!==component.version||metadata.size!==statSync(component.location).size)throw Error("Artifact metadata mismatch.");
    await verifyArtifact(component.location,metadata.sha256);
    await verifyMiseVersion(component.location,component.version);
  }catch{throw Error("Registered mise installation is missing or mismatched; update refused.");}
}
/** Executa somente a consulta de versão, com prazo e saída limitados. */
function verifyMiseVersion(executable:string,version:string){
  return new Promise<void>((resolve,reject)=>execFile(executable,['--version'],{timeout:10000,maxBuffer:65536,encoding:'utf8'},(error,stdout)=>{if(error||!stdout.trim().startsWith(version+' '))reject(Error("mise did not confirm the version."));else resolve();}));
}
/** Consulta manifesto e registro sem criar estado. */
export async function misePreview(version:string,target:Target,options:{path?:string;signal?:AbortSignal}={}){
  await miseArtifact(version,target,options.signal);
  const path=options.path??statePath();
  if(existsSync(path)){const store=new StateStore(path);try{const previous=store.managed('mise');if(previous){await verifyManagedMise(previous);return{action:previous.version===version?'current' as const:'update' as const,steps:[],executed:false};}}finally{store.close();}}
  return{action:'install' as const,steps:[],executed:false};
}
/** Registra somente após download, checksum e confirmação da versão pelo próprio binário. */
export async function installMise(version:string,target:Target,options:{confirmed:boolean;path?:string;directory?:string;signal?:AbortSignal}){
  if(!options.confirmed)throw Error("Explicit confirmation required.");
  if(options.signal?.aborted)return{status:'cancelled',operationId:null,executable:null};
  const artifact=await miseArtifact(version,target,options.signal).catch(error=>{if(options.signal?.aborted)return null;throw error;});
  if(!artifact||options.signal?.aborted)return{status:'cancelled',operationId:null,executable:null};
  const path=options.path??statePath(),directory=options.directory??join(dirname(path),'applications');
  if(!isAbsolute(directory))throw Error("Applications directory must be absolute.");
  const release=acquireCollectorLock(path+'.applications-lock',"application installer");
  try{
    const store=new StateStore(path,true);
    try{
      const previous=store.managed('mise');
      if(previous){await verifyManagedMise(previous);if(previous.version===version)return{status:'current',operationId:null,executable:previous.location};}
      mkdirSync(directory,{recursive:true,mode:0o700});
      const owner=statSync(directory);
      if(realpathSync(directory)!==directory||(owner.mode&0o077)!==0||typeof process.getuid==='function'&&owner.uid!==process.getuid())throw Error("Applications directory must be private and have no symlinks.");
      const destination=mkdtempSync(join(directory,'mise-'+version+'-')),executable=join(destination,'mise');
      const result=await executeSteps(store,[],{confirmed:true,signal:options.signal,verify:async()=>{
        await downloadArtifact(artifact.url,executable,artifact.sha256,{maxBytes:artifact.size,timeoutMs:120000,signal:options.signal,redirectHosts:['release-assets.githubusercontent.com','objects.githubusercontent.com']});
        if(statSync(executable).size!==artifact.size)throw Error("mise artifact size mismatch.");
        chmodSync(executable,0o700);
        await verifyMiseVersion(executable,version);
        writeFileSync(join(destination,'artifact.json'),JSON.stringify(artifact),{mode:0o600,flag:'wx'});
      }});
      if(result.status==='succeeded'){
        const component={id:'mise',version,location:executable,operationId:result.id};
        if(previous)store.updateManaged(component,previous);else store.registerManaged(component);
      }
      return{status:result.status,operationId:result.id,executable:result.status==='succeeded'?executable:null};
    }finally{store.close();}
  }finally{release();}
}
