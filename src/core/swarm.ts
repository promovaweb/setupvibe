/** Consulta e inicializa Swarm sem adotar clusters externos nem expor tokens. */
import {execFile} from 'node:child_process';
import {isIP} from 'node:net';
import {existsSync} from 'node:fs';
import {StateStore} from './state';
import {statePath} from './history';
import {installationPreflight} from './preflight';
import {acquireCollectorLock} from './collector-lock';
import {executeSteps,type CommandStep} from './executor';
import type {Target} from './platform';
export interface SwarmStatus {state:string;nodeId:string;manager:boolean;clusterId:string|null;address:string;}
/** Consulta reduzida não retorna tokens de worker ou manager. */
export function parseSwarmStatus(output:string):SwarmStatus{
 const row=JSON.parse(output);
 if(!row||typeof row.LocalNodeState!=='string'||typeof row.NodeID!=='string'||typeof row.ControlAvailable!=='boolean'||typeof row.NodeAddr!=='string')throw Error('Invalid Docker Swarm response.');
 const clusterId=typeof row.Cluster?.ID==='string'?row.Cluster.ID:null;
 if(row.LocalNodeState==='active'&&(!/^[a-z0-9]{25}$/.test(row.NodeID)||row.ControlAvailable&&!clusterId))throw Error('Incomplete Docker Swarm identity.');
 if(clusterId!==null&&!/^[a-z0-9]{25}$/.test(clusterId))throw Error('Invalid Swarm cluster ID.');
 return{state:row.LocalNodeState,nodeId:row.NodeID,manager:row.ControlAvailable,clusterId,address:row.NodeAddr};
}
/** Indisponibilidade não é confundida com daemon sem Swarm. */
export function discoverSwarm(executable='docker'):Promise<SwarmStatus>{
 return new Promise((resolve,reject)=>execFile(executable,['info','--format','{{json .Swarm}}'],{timeout:5000,maxBuffer:262144,encoding:'utf8'},(error,stdout)=>{
  if(error)return reject(Error('Docker Swarm discovery unavailable.'));
  try{resolve(parseSwarmStatus(stdout));}catch{reject(Error('Invalid Docker Swarm response.'));}
 }));
}
/** IP explícito fixa anúncio e escuta na interface escolhida. */
function initStep(address:string,executable:string):CommandStep{
 if(!isIP(address)||address==='0.0.0.0'||address==='::')throw Error('Provide an explicit IPv4 or IPv6 address.');
 const endpoint=(isIP(address)===6?'['+address+']':address)+':2377';
 return{id:'swarm-init',command:executable,args:['swarm','init','--advertise-addr',endpoint,'--listen-addr',endpoint]};
}
/** Prévia somente consulta; clusters externos e vínculos antigos são recusados. */
export async function previewSwarmInit(address:string,target:Target,options:{path?:string;executable?:string}={}){
 const step=initStep(address,options.executable??'docker');
 if(target.system!=='linux')throw Error('Swarm initialization is available on Linux only.');
 await installationPreflight(target);
 const status=await discoverSwarm(options.executable),path=options.path??statePath();
 let owner:ReturnType<StateStore['managed']>=null;
 if(existsSync(path)){const store=new StateStore(path);try{owner=store.managed('swarm');}finally{store.close();}}
 if(status.state==='active'){
  if(!owner||!status.manager||owner.version!==status.clusterId||owner.location!=='/swarm-node/'+status.nodeId)throw Error('External Swarm or mismatched ownership; initialization refused.');
  if(status.address!==address)throw Error('Managed Swarm uses a different advertised address.');
  return{action:'current' as const,status,steps:[] as CommandStep[],executed:false as const};
 }
 if(status.state!=='inactive'||owner)throw Error('Swarm state requires manual reconciliation before initialization.');
 return{action:'initialize' as const,status,steps:[step],executed:false as const};
}
/** Não encaminha stdout de swarm init, que contém token, para observadores ou histórico. */
export async function initializeSwarm(address:string,target:Target,options:{confirmed:boolean;path?:string;executable?:string;signal?:AbortSignal}){
 if(!options.confirmed)throw Error('Explicit confirmation required.');
 const path=options.path??statePath();
 const initial=await previewSwarmInit(address,target,options);
 if(initial.action==='current')return{status:'current' as const,operationId:null};
 if(options.signal?.aborted)return{status:'cancelled' as const,operationId:null};
 const store=new StateStore(path,true);
 let release:(()=>void)|undefined;
 try{
  release=acquireCollectorLock(path+'.swarm-lock','Swarm initializer');
  const preview=await previewSwarmInit(address,target,options);
  if(preview.action==='current')return{status:'current' as const,operationId:null};
  let identity:SwarmStatus|null=null;
  const result=await executeSteps(store,preview.steps,{confirmed:true,signal:options.signal,beforeStep:async()=>{
   if((await discoverSwarm(options.executable)).state!=='inactive')throw Error('Swarm state changed after review.');
  },verify:async()=>{
   const status=await discoverSwarm(options.executable);
   if(status.state!=='active'||!status.manager||!status.clusterId||status.address!==address)throw Error('Swarm manager verification failed.');
   identity=status;
  }});
  if(result.status==='succeeded'&&identity){const status=identity as SwarmStatus;store.registerManaged({id:'swarm',version:status.clusterId!,location:'/swarm-node/'+status.nodeId,operationId:result.id});}
  return{status:result.status,operationId:result.id};
 }finally{release?.();store.close();}
}
