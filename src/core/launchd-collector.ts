/** Supervisiona somente o LaunchAgent registrado pelo SetupVibe, sem analisar launchctl print. */
import {execFile} from 'node:child_process';
import {lstat,readFile,realpath,access} from 'node:fs/promises';
import {constants,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {homedir} from 'node:os';
import {join,resolve} from 'node:path';
import {launchdCollector,type CollectorService} from './supervisor';
import type {CollectorStatus} from './activate-collector';
import {StateStore} from './state';
import {statePath} from './history';
import {executeSteps} from './executor';
import {acquireCollectorLock} from './collector-lock';
const label='dev.setupvibe.collector',ownerId='collector-launchd';
/** Identidade injetável permite testes em Linux; os pontos de entrada usam a identidade real. */
export interface LaunchdEnvironment {platform:string;home:string;uid:number;}
const environment=():LaunchdEnvironment=>({platform:process.platform,home:homedir(),uid:process.getuid?.()??-1});
/** Consulta somente o rótulo esperado na listagem documentada de três colunas. */
export function parseLaunchdList(output:string):{loaded:boolean;pid:number|null;lastExit:number|null}{
 const lines=output.trim().split('\n');
 if(!/^PID\s+Status\s+Label$/.test(lines.shift()??''))throw Error('Invalid launchctl list header.');
 let found:{loaded:boolean;pid:number|null;lastExit:number|null}|null=null;
 for(const line of lines){
  const match=/^(\d+|-)\s+(-?\d+)\s+(\S+)$/.exec(line.trim());
  if(!match)throw Error('Invalid launchctl list row.');
  if(match[3]!==label)continue;
  if(found)throw Error('Duplicate collector service.');
  const pid=match[1]==='-'?null:Number(match[1]),lastExit=Number(match[2]);
  if(pid!==null&&(!Number.isSafeInteger(pid)||pid<1)||!Number.isSafeInteger(lastExit))throw Error('Invalid launchctl process state.');
  found={loaded:true,pid,lastExit};
 }
 return found??{loaded:false,pid:null,lastExit:null};
}
/** Não retorna nomes ou informações dos outros serviços consultados. */
export class LaunchdCollectorController {
 constructor(private env:LaunchdEnvironment=environment(),private executable='launchctl',private path=statePath()){}
 directory=()=>join(this.env.home,'Library','LaunchAgents');
 private assertPlatform(){if(this.env.platform!=='darwin'||!Number.isSafeInteger(this.env.uid)||this.env.uid<=0)throw Error('LaunchAgent supervision requires a macOS user session.');}
 private owner(){if(!existsSync(this.path))return null;const store=new StateStore(this.path);try{return store.managed(ownerId);}finally{store.close();}}
 private async query(){
  this.assertPlatform();
  return new Promise<ReturnType<typeof parseLaunchdList>>((resolve,reject)=>execFile(this.executable,['list'],{timeout:5000,maxBuffer:2*1024*1024,encoding:'utf8'},(error,stdout)=>{
   if(error)return reject(Error('launchd user manager unavailable.'));
   try{resolve(parseLaunchdList(stdout));}catch{reject(Error('Invalid launchctl list response.'));}
  }));
 }
 /** Estado de habilitação é desconhecido; nenhuma saída instável de print-disabled é interpretada. */
 status=async():Promise<CollectorStatus>=>{
  const current=await this.query(),owner=this.owner();
  return{load:current.loaded?'loaded':'not-found',active:current.pid?'active':'inactive',sub:current.pid?'running':current.loaded?'waiting':'absent',enabled:'unknown',fragment:owner?.location??'',dropIns:''};
 };
 private async verify(config:CollectorService,directory:string,allowPendingRegistration=false){
  this.assertPlatform();
  if(resolve(directory)!==this.directory())throw Error('LaunchAgent is outside the canonical directory.');
  const unit=join(directory,label+'.plist'),stat=await lstat(unit);
  if(!stat.isFile()||stat.isSymbolicLink()||await realpath(unit)!==unit||stat.uid!==process.getuid?.()||(stat.mode&0o022)!==0)throw Error('LaunchAgent must be owned by the current user without symlinks or external writes.');
  const content=await readFile(unit,'utf8');
  if(content!==launchdCollector(config))throw Error('LaunchAgent does not match the expected configuration.');
  const binary=await lstat(config.executable);if(!binary.isFile()||binary.isSymbolicLink())throw Error('Collector must be a regular executable.');
  await access(config.executable,constants.X_OK);
  const digest=createHash('sha256').update(content).digest('hex'),owner=this.owner(),current=await this.query();
  if(owner&&(owner.location!==unit||owner.version!==digest)||current.loaded&&!owner&&!allowPendingRegistration)throw Error('External LaunchAgent or mismatched ownership; control refused.');
  return{unit,digest,owner,current};
 }
 /** Prévia não cria banco nem modifica a habilitação do agente. */
 preview=async(config:CollectorService,directory:string,action:'activate'|'stop')=>{
  if(!['activate','stop'].includes(action))throw Error('Invalid collector action.');
  const checked=await this.verify(config,directory),target='gui/'+this.env.uid+'/'+label;
  if(action==='stop'&&!checked.current.loaded)throw Error('Collector LaunchAgent is not loaded.');
  const steps=action==='stop'?[{id:'launchd-bootout',command:this.executable,args:['bootout',target]}]:[
   {id:'launchd-enable',command:this.executable,args:['enable',target]},
   ...(!checked.current.loaded?[{id:'launchd-bootstrap',command:this.executable,args:['bootstrap','gui/'+this.env.uid,checked.unit]}]:[]),
   {id:'launchd-kickstart',command:this.executable,args:['kickstart',target]},
  ];
  return{action,unit:checked.unit,status:await this.status(),steps,executed:false as const};
 };
 private async control(config:CollectorService,directory:string,action:'activate'|'stop',options:{confirmed:boolean;signal?:AbortSignal}){
  if(!options.confirmed)throw Error('Explicit confirmation required.');
  await this.preview(config,directory,action);
  const store=new StateStore(this.path,true);let release:(()=>void)|undefined;
  try{
   release=acquireCollectorLock(this.path+'.launchd-lock','LaunchAgent controller');
   const preview=await this.preview(config,directory,action),checked=await this.verify(config,directory);
   // Após bootstrap o vínculo ainda não foi gravado; a verificação final consulta apenas o estado do processo.
   const result=await executeSteps(store,preview.steps,{confirmed:true,signal:options.signal,beforeStep:async step=>{await this.verify(config,directory,step.id==='launchd-kickstart'&&!checked.owner&&!checked.current.loaded);},verify:async()=>{
    await this.verify(config,directory,action==='activate'&&!checked.owner);
    for(let attempt=0;attempt<40;attempt++){
     if(options.signal?.aborted)throw Error('Collector verification cancelled.');
     const after=await this.query();if(action==='activate'?after.loaded&&after.pid!==null:!after.loaded)return;
     await new Promise(resolve=>setTimeout(resolve,100));
    }
    throw Error('LaunchAgent did not reach the requested state.');
   }});
   if(result.status==='succeeded'&&action==='activate'&&!checked.owner)store.registerManaged({id:ownerId,version:checked.digest,location:checked.unit,operationId:result.id});
   return result;
  }finally{release?.();store.close();}
 }
 /** Ativa sem reiniciar um processo que já esteja rodando. */
 activate=(config:CollectorService,directory:string,options:{confirmed:boolean;signal?:AbortSignal})=>this.control(config,directory,'activate',options);
 /** Descarrega o agente, preservando plist, registro e métricas para o próximo login. */
 stop=(config:CollectorService,directory:string,options:{confirmed:boolean;signal?:AbortSignal})=>this.control(config,directory,'stop',options);
}
