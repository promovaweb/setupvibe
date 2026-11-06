/** Integra Docker APT ao executor, preservando engines externos, dados, contextos e configuração. */
import {existsSync} from 'node:fs';
import {inspectAptDocker,aptDockerSteps,dockerUsesSudo,verifyAptDocker,validDockerPackageVersion} from '../adapters/apt-docker';
import {installationPreflight} from './preflight';
import {StateStore} from './state';
import {statePath} from './history';
import {executeSteps,type ExecutionEvent} from './executor';
import {acquireCollectorLock} from './collector-lock';
import type {Target} from './platform';
export const dockerEngineProvider={inspect:inspectAptDocker,sudo:dockerUsesSudo,verify:verifyAptDocker,steps:aptDockerSteps};
/** O registro refere-se ao pacote global; ele não autoriza remover containers ou o daemon. */
export async function dockerEnginePreview(version:string,target:Target,options:{path?:string;signal?:AbortSignal;provider?:typeof dockerEngineProvider}={}){
 if(!validDockerPackageVersion(version))throw Error('Provide candidate or an explicit Debian Docker package version.');
 if(target.system!=='linux')throw Error('APT Docker installation is available on Linux only.');await installationPreflight(target);
 if(process.env.DOCKER_HOST||process.env.DOCKER_CONTEXT)throw Error('Docker installation requires the local default context; explicit remote contexts are preserved.');
 const path=options.path??statePath(),provider=options.provider??dockerEngineProvider,status=await provider.inspect(options.signal);let owned:ReturnType<StateStore['managed']>=null;
 if(existsSync(path)){const store=new StateStore(path);try{owned=store.managed('docker');}finally{store.close();}}
 if(owned&&(owned.location!=='/apt/docker.io'||owned.version!==status.installed))throw Error('Registered Docker package changed; automatic control refused.');
 if(!owned&&(status.installed||status.client||status.binary||status.occupied)){
  if(version!=='candidate'&&version!==status.installed)throw Error('External Docker does not match the requested package version; installation preserved.');
  return{action:'external' as const,version:status.installed,clientVersion:status.client,status,steps:[],executed:false as const,sudo:false};
 }
 const desired=version==='candidate'?status.candidate:version,sudo=await provider.sudo();
 if(owned&&desired===owned.version){await provider.verify(owned.version,status.client,sudo,options.signal);return{action:'current' as const,version:desired,clientVersion:status.client,status,steps:[],executed:false as const,sudo};}
 return{action:desired?'install' as const:'awaiting-index' as const,version:desired,clientVersion:status.clientCandidate,status,steps:provider.steps(desired,status.clientCandidate,sudo),executed:false as const,sudo};
}
/** Registra propriedade somente após pacote, unidade e daemon local passarem na verificação. */
export async function installDockerEngine(version:string,target:Target,options:{confirmed:boolean;path?:string;signal?:AbortSignal;provider?:typeof dockerEngineProvider;onEvent?:(event:ExecutionEvent)=>void}){
 if(!options.confirmed)throw Error('Explicit confirmation required.');if(options.signal?.aborted)return{status:'cancelled' as const,operationId:null,executable:null};
 const provider=options.provider??dockerEngineProvider,path=options.path??statePath();
 const initial=await dockerEnginePreview(version,target,{path,provider,signal:options.signal}).catch(error=>{if(options.signal?.aborted)return null;throw error;});
 if(!initial||options.signal?.aborted)return{status:'cancelled' as const,operationId:null,executable:null};
 const unchanged=(plan:typeof initial)=>({status:plan.action as 'external'|'current',operationId:null,executable:plan.status.binary,version:plan.version,managed:plan.action==='current'});
 if(initial.action==='external'||initial.action==='current')return unchanged(initial);
 const store=new StateStore(path,true);let release:(()=>void)|undefined;
 try{
  release=acquireCollectorLock(path+'.system-packages-lock','system package installer');const preview=await dockerEnginePreview(version,target,{path,provider,signal:options.signal});
  if(preview.action==='external'||preview.action==='current')return unchanged(preview);
  const previous=store.managed('docker');let desired=preview.version,clientVersion=preview.clientVersion;
  const result=await executeSteps(store,preview.steps,{confirmed:true,signal:options.signal,onEvent:options.onEvent,beforeStep:async step=>{
   if(!['apt-refresh','apt-install-docker'].includes(step.id))return;
   const status=await provider.inspect(options.signal);if(status.installed!==preview.status.installed||!previous&&(status.binary||status.occupied||status.client))throw Error('Docker installation changed after review.');
   if(step.id==='apt-install-docker'){
    desired=desired??status.candidate;if(!desired)throw Error('APT did not provide a Docker package candidate.');clientVersion=clientVersion??status.clientCandidate;
    // Recria somente os argumentos do passo APT: índices novos podem revelar o pacote separado do cliente.
    step.args=provider.steps(desired,clientVersion,preview.sudo).find(item=>item.id==='apt-install-docker')!.args;
   }
  },verify:async()=>{if(!desired)throw Error('Docker package version is missing.');await provider.verify(desired,clientVersion,preview.sudo,options.signal);}});
  if(result.status==='succeeded'&&desired){const component={id:'docker',version:desired,location:'/apt/docker.io',operationId:result.id};if(previous)store.updateManaged(component,previous);else store.registerManaged(component);}
  return{status:result.status,operationId:result.id,executable:result.status==='succeeded'?'/usr/bin/docker':null,version:desired,managed:result.status==='succeeded'};
 }catch(error){if(options.signal?.aborted)return{status:'cancelled' as const,operationId:null,executable:null};throw error;}finally{release?.();store.close();}
}
