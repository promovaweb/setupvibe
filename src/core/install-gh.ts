/** Instala GitHub CLI nativo por checksum sem alterar o PATH do usuário. */
import {existsSync,mkdirSync,mkdtempSync,realpathSync,statSync,chmodSync,writeFileSync,readFileSync,rmSync,lstatSync,accessSync,constants} from 'node:fs';
import {createHash} from 'node:crypto';
import {join,dirname,isAbsolute} from 'node:path';
import {execFile} from 'node:child_process';
import {ghArtifact} from './gh-artifact';
import {downloadArtifact} from './download';
import {verifyArtifact} from './integrity';
import {StateStore} from './state';
import {statePath} from './history';
import {executeSteps} from './executor';
import {acquireCollectorLock} from './collector-lock';
import type {Target} from './platform';
/** Verifica os bytes registrados antes de executar a confirmação de versão. */
async function verifyManagedGh(component:{version:string;location:string}){
  try{
    if(realpathSync(component.location)!==component.location)throw Error("Symlinks are not accepted.");
    const metadata=JSON.parse(readFileSync(join(dirname(component.location),'artifact.json'),'utf8'));
    if(metadata.version!==component.version||metadata.binarySize!==statSync(component.location).size||!lstatSync(component.location).isFile()||(lstatSync(component.location).mode&0o022)!==0)throw Error("Artifact metadata mismatch.");
    await verifyArtifact(component.location,metadata.binarySha256);
    await verifyGhVersion(component.location,component.version);
  }catch{throw Error("Registered GitHub CLI installation is missing or mismatched; update refused.");}
}
/** Executa somente a consulta de versão, com prazo e saída limitados. */
function verifyGhVersion(executable:string,version:string){
  return new Promise<void>((resolve,reject)=>execFile(executable,['--version'],{timeout:10000,maxBuffer:65536,encoding:'utf8'},(error,stdout)=>{if(error||!stdout.trim().startsWith('gh version '+version+' '))reject(Error("GitHub CLI did not confirm the version."));else resolve();}));
}
/** Consulta manifesto e registro sem criar estado. */
export async function ghPreview(version:string,target:Target,options:{path?:string;signal?:AbortSignal}={}){
  accessSync('/usr/bin/tar',constants.X_OK);
  await ghArtifact(version,target,options.signal);
  const path=options.path??statePath();
  if(existsSync(path)){const store=new StateStore(path);try{const previous=store.managed('gh');if(previous){await verifyManagedGh(previous);return{action:previous.version===version?'current' as const:'update' as const,steps:[],executed:false};}}finally{store.close();}}
  return{action:'install' as const,steps:[],executed:false};
}
/** Registra somente após download, checksum e confirmação da versão pelo próprio binário. */
export async function installGh(version:string,target:Target,options:{confirmed:boolean;path?:string;directory?:string;signal?:AbortSignal}){
  if(!options.confirmed)throw Error("Explicit confirmation required.");
  if(options.signal?.aborted)return{status:'cancelled',operationId:null,executable:null};
  const artifact=await ghArtifact(version,target,options.signal).catch(error=>{if(options.signal?.aborted)return null;throw error;});
  if(!artifact||options.signal?.aborted)return{status:'cancelled',operationId:null,executable:null};
  const path=options.path??statePath(),directory=options.directory??join(dirname(path),'applications');
  if(!isAbsolute(directory))throw Error("Applications directory must be absolute.");
  const release=acquireCollectorLock(path+'.applications-lock',"application installer");
  try{
    const store=new StateStore(path,true);
    try{
      const previous=store.managed('gh');
      if(previous){await verifyManagedGh(previous);if(previous.version===version)return{status:'current',operationId:null,executable:previous.location};}
      mkdirSync(directory,{recursive:true,mode:0o700});
      const owner=statSync(directory);
      if(realpathSync(directory)!==directory||(owner.mode&0o077)!==0||typeof process.getuid==='function'&&owner.uid!==process.getuid())throw Error("Applications directory must be private and have no symlinks.");
      const destination=mkdtempSync(join(directory,'gh-'+version+'-')),executable=join(destination,'gh'),archive=join(destination,'archive');
      const result=await executeSteps(store,[],{confirmed:true,signal:options.signal,verify:async()=>{
        await downloadArtifact(artifact.url,archive,artifact.sha256,{maxBytes:artifact.size,timeoutMs:120000,signal:options.signal,redirectHosts:['release-assets.githubusercontent.com','objects.githubusercontent.com']});
        if(statSync(archive).size!==artifact.size)throw Error("GitHub CLI artifact size mismatch.");
        // tar entrega somente o arquivo exato em stdout; nenhum caminho do pacote é extraído no disco.
        const bytes=await new Promise<Buffer>((resolve,reject)=>execFile('/usr/bin/tar',['-xOf',archive,artifact.entry],{timeout:30000,maxBuffer:128*1024*1024,encoding:'buffer',signal:options.signal},(error,stdout)=>{if(error||!stdout.length)reject(Error('Could not read the GitHub CLI executable from its archive.'));else resolve(stdout);}));
        if(options.signal?.aborted)throw Error('Installation cancelled.');
        writeFileSync(executable,bytes,{mode:0o700,flag:'wx'});
        chmodSync(executable,0o700);
        await verifyGhVersion(executable,version);
        writeFileSync(join(destination,'artifact.json'),JSON.stringify({...artifact,binarySha256:createHash('sha256').update(readFileSync(executable)).digest('hex'),binarySize:statSync(executable).size}),{mode:0o600,flag:'wx'});
        rmSync(archive);
      }});
      if(result.status==='succeeded'){
        const component={id:'gh',version,location:executable,operationId:result.id};
        if(previous)store.updateManaged(component,previous);else store.registerManaged(component);
      }
      return{status:result.status,operationId:result.id,executable:result.status==='succeeded'?executable:null};
    }finally{store.close();}
  }finally{release();}
}
