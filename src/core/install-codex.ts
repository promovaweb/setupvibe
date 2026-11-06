/** Instala o pacote oficial Codex em diretório privado sem alterar pacotes globais. */
import {execFile} from 'node:child_process';
import {existsSync,mkdirSync,mkdtempSync,writeFileSync,readFileSync,realpathSync,statSync,lstatSync} from 'node:fs';
import {join,dirname,isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {installationPreflight} from './preflight';
import {StateStore} from './state';
import {statePath} from './history';
import {executeSteps} from './executor';
import {acquireCollectorLock} from './collector-lock';
import type {Target} from './platform';
import {installRuntime} from './runtime-install';
import {dependencyVersions} from './dependency-versions';
/** Confere o launcher registrado antes de reutilizar ou substituir seu vínculo. */
async function verifyManagedCodex(component:{version:string;location:string}){
  try{
    const file=lstatSync(component.location);
    if(!file.isFile()||realpathSync(component.location)!==component.location||(file.mode&0o022)!==0)throw Error("Invalid launcher.");
    const installed=JSON.parse(readFileSync(join(dirname(component.location),'node_modules','@openai','codex','package.json'),'utf8'));
    if(installed.name!=='@openai/codex'||installed.version!==component.version)throw Error("Package mismatch.");
    await new Promise<void>((resolve,reject)=>execFile(component.location,['--version'],{timeout:10000,maxBuffer:65536,encoding:'utf8'},(error,stdout)=>{if(error||stdout.trim()!=='codex-cli '+component.version)reject(Error("Version mismatch."));else resolve();}));
  }catch{throw Error("Registered Codex installation is missing or mismatched; update refused.");}
}
/** Verifica a entrada e a propriedade sem criar diretórios ou banco de estado. */
export async function codexPreview(version:string,target:Target,options:{path?:string;bun?:string;installDependencies?:boolean;allowMissingBun?:boolean}={}){
  if(!/^\d+\.\d+\.\d+$/.test(version))throw Error("A fixed Codex version is required.");
  if(target.edition!=='desktop')throw Error("Codex is available in Desktop only.");
  await installationPreflight(target);
  const path=options.path??statePath();
  let bun=options.bun??Bun.which('bun');
  if(!bun&&existsSync(path)){const store=new StateStore(path);try{const owned=store.managed('bun');if(owned)bun=join(owned.location,'bin','bun');}finally{store.close();}}
  if(!bun&&(options.installDependencies||options.allowMissingBun))return{action:'awaiting-dependencies' as const,steps:[],executed:false,dependencies:[{id:'mise',version:dependencyVersions.mise},{id:'bun',version:dependencyVersions.bun}]};
  if(!bun||!isAbsolute(bun)||/\s|\x00/.test(bun))throw Error("An absolute Bun executable path without spaces is required.");
  if(existsSync(path)){const store=new StateStore(path);try{const previous=store.managed('codex');if(previous){await verifyManagedCodex(previous);return{action:previous.version===version?'current' as const:'update' as const,steps:[],executed:false};}}finally{store.close();}}
  return{action:'install' as const,steps:[],executed:false};
}
/** Não ativa PATH nem substitui o Codex já instalado por outro fornecedor. */
export async function installCodex(version:string,target:Target,options:{confirmed:boolean;installDependencies?:boolean;path?:string;directory?:string;bun?:string;signal?:AbortSignal}){
  if(!options.confirmed)throw Error("Explicit confirmation required.");
  if(!/^\d+\.\d+\.\d+$/.test(version))throw Error("A fixed Codex version is required.");
  if(target.edition!=='desktop')throw Error("Codex is available in Desktop only.");
  await installationPreflight(target);
  if(options.signal?.aborted)return{status:'cancelled',operationId:null,executable:null};
  const path=options.path??statePath(),directory=options.directory??join(dirname(path),'applications');
  let bun=options.bun??Bun.which('bun');
  if(!bun&&existsSync(path)){const state=new StateStore(path);try{const owned=state.managed('bun');if(owned)bun=join(owned.location,'bin','bun');}finally{state.close();}}
  if(!bun&&options.installDependencies){
    const dependency=await installRuntime('bun',dependencyVersions.bun,target,{confirmed:true,path,installDependencies:true,signal:options.signal});
    if(!['succeeded','current'].includes(dependency.status))return{status:dependency.status,operationId:dependency.operationId,executable:null};
    const state=new StateStore(path);try{const owned=state.managed('bun');if(owned)bun=join(owned.location,'bin','bun');}finally{state.close();}
  }
  if(!bun||!isAbsolute(directory)||!isAbsolute(bun)||/\s|\x00/.test(bun))throw Error("An absolute directory and Bun executable path without spaces are required.");
  const release=acquireCollectorLock(path+'.applications-lock',"application installer");
  try{
    const store=new StateStore(path,true);
    try{
      const previous=store.managed('codex');
      if(previous){await verifyManagedCodex(previous);if(previous.version===version)return{status:'current',operationId:null,executable:previous.location};}
      mkdirSync(directory,{recursive:true,mode:0o700});
      if(realpathSync(directory)!==directory)throw Error("Applications directory cannot contain symlinks.");
      const permissions=statSync(directory);
      if((permissions.mode&0o077)!==0||typeof process.getuid==='function'&&permissions.uid!==process.getuid())throw Error("Applications directory must be private and belong to the current user.");
      const destination=mkdtempSync(join(directory,'codex-'+version+'-'));
      writeFileSync(join(destination,'package.json'),JSON.stringify({private:true,type:'module'}),{mode:0o600,flag:'wx'});
      const entry=join(destination,'node_modules','@openai','codex','bin','codex.js');
      const result=await executeSteps(store,[{id:'install-codex',command:bun,args:['add','--cwd',destination,'--ignore-scripts','--exact','--registry','https://registry.npmjs.org','@openai/codex@'+version]}],{confirmed:true,signal:options.signal,verify:async()=>{
        const installed=JSON.parse(readFileSync(join(destination,'node_modules','@openai','codex','package.json'),'utf8'));
        if(installed.name!=='@openai/codex'||installed.version!==version)throw Error("Installed Codex package does not match the requested version.");
        await new Promise<void>((resolve,reject)=>execFile(bun,[entry,'--version'],{timeout:10000,maxBuffer:65536,encoding:'utf8'},(error,stdout)=>{if(error||stdout.trim()!=='codex-cli '+version)reject(Error("Codex executable did not confirm the version."));else resolve();}));
        const launcher=join(destination,'codex');
        writeFileSync(launcher,'#!'+bun+'\nawait import('+JSON.stringify(pathToFileURL(entry).href)+');\n',{mode:0o700,flag:'wx'});
        await verifyManagedCodex({version,location:launcher});
      }});
      let executable:string|null=null;
      if(result.status==='succeeded'){
        executable=join(destination,'codex');
        const component={id:'codex',version,location:executable,operationId:result.id};
        if(previous)store.updateManaged(component,previous);else store.registerManaged(component);
      }
      return{status:result.status,operationId:result.id,executable};
    }finally{store.close();}
  }finally{release();}
}
