/** Instala o Herdr nativo por checksum sem alterar o PATH ou a configuração do usuário. */
import {existsSync,mkdirSync,mkdtempSync,realpathSync,statSync,chmodSync,writeFileSync,readFileSync,rmSync,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join,dirname,isAbsolute} from 'node:path';
import {execFile} from 'node:child_process';
import {herdrArtifact} from './herdr-artifact';
import {downloadArtifact} from './download';
import {verifyArtifact} from './integrity';
import {StateStore} from './state';
import {statePath} from './history';
import {executeSteps} from './executor';
import {acquireCollectorLock} from './collector-lock';
import type {Target} from './platform';
/** Verifica os bytes registrados antes de executar a confirmação de versão. */
async function verifyManagedHerdr(component:{version:string;location:string}){
  try{
    if(realpathSync(component.location)!==component.location)throw Error("Symlinks are not accepted.");
    const metadata=JSON.parse(readFileSync(join(dirname(component.location),'artifact.json'),'utf8'));
    if(metadata.version!==component.version||metadata.binarySize!==statSync(component.location).size||!lstatSync(component.location).isFile()||(lstatSync(component.location).mode&0o022)!==0)throw Error("Artifact metadata mismatch.");
    await verifyArtifact(component.location,metadata.binarySha256);
    await verifyHerdrVersion(component.location,component.version);
  }catch{throw Error("Registered Herdr installation is missing or mismatched; update refused.");}
}
/** Executa somente a consulta de versão, com prazo e saída limitados. */
function verifyHerdrVersion(executable:string,version:string){
  return new Promise<void>((resolve,reject)=>execFile(executable,['--version'],{timeout:10000,maxBuffer:65536,encoding:'utf8',env:{PATH:process.env.PATH??'/usr/bin:/bin',HOME:dirname(executable)}},(error,stdout)=>{if(error||stdout.trim()!=='herdr '+version)reject(Error("Herdr did not confirm the version."));else resolve();}));
}
/** Consulta manifesto e registro sem criar estado. */
export async function herdrPreview(version:string,target:Target,options:{path?:string;signal?:AbortSignal}={}){
  await herdrArtifact(version,target,options.signal);
  const path=options.path??statePath();
  if(existsSync(path)){const store=new StateStore(path);try{const previous=store.managed('herdr');if(previous){await verifyManagedHerdr(previous);return{action:previous.version===version?'current' as const:'update' as const,steps:[],executed:false};}}finally{store.close();}}
  return{action:'install' as const,steps:[],executed:false};
}
/** Registra somente após download, checksum e confirmação da versão pelo próprio binário. */
export async function installHerdr(version:string,target:Target,options:{confirmed:boolean;path?:string;directory?:string;signal?:AbortSignal}){
  if(!options.confirmed)throw Error("Explicit confirmation required.");
  if(options.signal?.aborted)return{status:'cancelled',operationId:null,executable:null};
  const artifact=await herdrArtifact(version,target,options.signal).catch(error=>{if(options.signal?.aborted)return null;throw error;});
  if(!artifact||options.signal?.aborted)return{status:'cancelled',operationId:null,executable:null};
  const path=options.path??statePath(),directory=options.directory??join(dirname(path),'applications');
  if(!isAbsolute(directory))throw Error("Applications directory must be absolute.");
  const release=acquireCollectorLock(path+'.applications-lock',"application installer");
  try{
    const store=new StateStore(path,true);
    try{
      const previous=store.managed('herdr');
      if(previous){await verifyManagedHerdr(previous);if(previous.version===version)return{status:'current',operationId:null,executable:previous.location};}
      mkdirSync(directory,{recursive:true,mode:0o700});
      const owner=statSync(directory);
      if(realpathSync(directory)!==directory||(owner.mode&0o077)!==0||typeof process.getuid==='function'&&owner.uid!==process.getuid())throw Error("Applications directory must be private and have no symlinks.");
      const destination=mkdtempSync(join(directory,'herdr-'+version+'-')),executable=join(destination,'herdr');
      const result=await executeSteps(store,[],{confirmed:true,signal:options.signal,verify:async()=>{
        await downloadArtifact(artifact.url,executable,artifact.sha256,{maxBytes:artifact.size,timeoutMs:180000,signal:options.signal,redirectHosts:['release-assets.githubusercontent.com','objects.githubusercontent.com']});
        if(statSync(executable).size!==artifact.size)throw Error("Herdr artifact size mismatch.");
        chmodSync(executable,0o700);
        await verifyHerdrVersion(executable,version);
        writeFileSync(join(destination,'artifact.json'),JSON.stringify({...artifact,binarySha256:createHash('sha256').update(readFileSync(executable)).digest('hex'),binarySize:statSync(executable).size}),{mode:0o600,flag:'wx'});
      }});
      if(result.status==='succeeded'){
        const component={id:'herdr',version,location:executable,operationId:result.id};
        if(previous)store.updateManaged(component,previous);else store.registerManaged(component);
      }
      return{status:result.status,operationId:result.id,executable:result.status==='succeeded'?executable:null};
    }finally{store.close();}
  }finally{release();}
}
