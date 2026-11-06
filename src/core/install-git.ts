/** Instala Git via APT somente quando ausente ou já registrado, preservando instalações externas. */
import {existsSync} from 'node:fs';
import {inspectAptGit,aptGitSteps,gitUsesSudo,verifyAptGit,validGitPackageVersion} from '../adapters/apt-git';
import {StateStore} from './state';
import {statePath} from './history';
import {installationPreflight} from './preflight';
import {executeSteps,type ExecutionEvent} from './executor';
import {acquireCollectorLock} from './collector-lock';
import type {Target} from './platform';
export const gitProvider={inspect:inspectAptGit,sudo:gitUsesSudo,verify:verifyAptGit,steps:aptGitSteps};
/** candidate é resolvido após atualizar índices quando a máquina ainda não tem metadados APT. */
export async function gitPreview(version:string,target:Target,options:{path?:string;signal?:AbortSignal;provider?:typeof gitProvider}={}){
 if(!validGitPackageVersion(version))throw Error('Provide candidate or an explicit Debian Git package version.');
 if(target.system!=='linux')throw Error('APT Git installation is available on Linux only.');
 await installationPreflight(target);
 const path=options.path??statePath(),provider=options.provider??gitProvider,status=await provider.inspect(options.signal);
 let owned:ReturnType<StateStore['managed']>=null;
 if(existsSync(path)){const store=new StateStore(path);try{owned=store.managed('git');}finally{store.close();}}
 if(owned&&(owned.location!=='/apt/git'||owned.version!==status.installed))throw Error('Registered Git package changed; automatic control refused.');
 if(!owned&&(status.installed||status.binary)){
  if(version!=='candidate'&&version!==status.installed)throw Error('External Git does not match the requested package version; installation preserved.');
  return{action:'external' as const,version:status.installed,status,steps:[],executed:false as const,sudo:false};
 }
 const desired=version==='candidate'?status.candidate:version;
 if(owned&&desired===owned.version){await provider.verify(owned.version,options.signal);return{action:'current' as const,version:desired,status,steps:[],executed:false as const,sudo:false};}
 const sudo=await provider.sudo();
 return{action:desired?'install' as const:'awaiting-index' as const,version:desired,status,steps:provider.steps(desired,sudo),executed:false as const,sudo};
}
/** O pacote e dependências são globais; registros não autorizam remoção automática de pacotes compartilhados. */
export async function installGit(version:string,target:Target,options:{confirmed:boolean;path?:string;signal?:AbortSignal;provider?:typeof gitProvider;onEvent?:(event:ExecutionEvent)=>void}){
 if(!options.confirmed)throw Error('Explicit confirmation required.');
 if(options.signal?.aborted)return{status:'cancelled' as const,operationId:null,executable:null};
 const provider=options.provider??gitProvider,path=options.path??statePath();
 const initial=await gitPreview(version,target,{path,provider,signal:options.signal}).catch(error=>{if(options.signal?.aborted)return null;throw error;});
 if(!initial||options.signal?.aborted)return{status:'cancelled' as const,operationId:null,executable:null};
 if(initial.action==='external')return{status:'external' as const,operationId:null,executable:initial.status.binary,version:initial.status.installed,managed:false};
 if(initial.action==='current')return{status:'current' as const,operationId:null,executable:'/usr/bin/git',version:initial.version,managed:true};
 const store=new StateStore(path,true);let release:(()=>void)|undefined;
 try{
  release=acquireCollectorLock(path+'.system-packages-lock','system package installer');
  const preview=await gitPreview(version,target,{path,provider,signal:options.signal});
  if(preview.action==='external')return{status:'external' as const,operationId:null,executable:preview.status.binary,version:preview.status.installed,managed:false};
  if(preview.action==='current')return{status:'current' as const,operationId:null,executable:'/usr/bin/git',version:preview.version,managed:true};
  const previous=store.managed('git');let desired=preview.version;
  const result=await executeSteps(store,preview.steps,{confirmed:true,signal:options.signal,onEvent:options.onEvent,beforeStep:async step=>{
   const status=await provider.inspect(options.signal);
   if(status.installed!==preview.status.installed||!previous&&status.binary)throw Error('Git installation changed after review.');
   if(step.id==='apt-install-git'){
    desired=desired??status.candidate;if(!desired)throw Error('APT did not provide a Git package candidate.');
    step.args[step.args.length-1]='git='+desired;
   }
  },verify:async()=>{if(!desired)throw Error('Git package version is missing.');await provider.verify(desired,options.signal);}});
  if(result.status==='succeeded'&&desired){const component={id:'git',version:desired,location:'/apt/git',operationId:result.id};if(previous)store.updateManaged(component,previous);else store.registerManaged(component);}
  return{status:result.status,operationId:result.id,executable:result.status==='succeeded'?'/usr/bin/git':null,version:desired,managed:result.status==='succeeded'};
 }catch(error){if(options.signal?.aborted)return{status:'cancelled' as const,operationId:null,executable:null};throw error;}finally{release?.();store.close();}
}
