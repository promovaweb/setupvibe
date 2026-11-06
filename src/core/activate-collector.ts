/** Controla somente a unidade de usuário conferida, sem substituir configurações existentes. */
import {execFile} from 'node:child_process';
import {readFile,lstat,realpath,access} from 'node:fs/promises';
import {constants} from 'node:fs';
import {join,isAbsolute,resolve} from 'node:path';
import {homedir} from 'node:os';
import {systemdCollector,type CollectorService} from './supervisor';
import {StateStore} from './state';
import {executeSteps} from './executor';
import {statePath} from './history';
export interface CollectorStatus {load:string;active:string;sub:string;enabled:string;fragment:string;dropIns:string;}
/** Respeita XDG absoluto e utiliza sempre o nome fixo do serviço. */
export function collectorUnitDirectory():string{
 const configHome=process.env.XDG_CONFIG_HOME;
 return join(configHome&&isAbsolute(configHome)?configHome:join(homedir(),'.config'),'systemd','user');
}
/** Consulta sem criar estado; ausência de user manager é um erro distinto de unidade ausente. */
export function systemdCollectorStatus(executable='systemctl'):Promise<CollectorStatus>{
 if(process.platform!=='linux')return Promise.reject(Error('systemd supervision requires Linux.'));
 return new Promise((resolve,reject)=>execFile(executable,['--user','show','setupvibe-collector.service','--property=LoadState,ActiveState,SubState,UnitFileState,FragmentPath,DropInPaths'],{timeout:5000,maxBuffer:65536,encoding:'utf8'},(error,stdout)=>{
  if(error)return reject(Error('systemd user manager unavailable.'));
  const rows=new Map<string,string>();
  for(const line of stdout.trim().split('\n')){const at=line.indexOf('=');if(at<1||rows.has(line.slice(0,at)))return reject(Error('Invalid systemd status.'));rows.set(line.slice(0,at),line.slice(at+1));}
  if(['LoadState','ActiveState','SubState','UnitFileState','FragmentPath','DropInPaths'].some(key=>!rows.has(key)))return reject(Error('Incomplete systemd status.'));
  resolve({load:rows.get('LoadState')!,active:rows.get('ActiveState')!,sub:rows.get('SubState')!,enabled:rows.get('UnitFileState')!,fragment:rows.get('FragmentPath')!,dropIns:rows.get('DropInPaths')!});
 }));
}
/** Confere conteúdo e caminho real; diretórios redirecionados e arquivos graváveis por terceiros são recusados. */
async function verifyUnit(config:CollectorService,unitDirectory:string){
 if(process.platform!=='linux')throw Error('systemd activation requires Linux.');
 if(resolve(unitDirectory)!==resolve(collectorUnitDirectory()))throw Error('Unit is outside the canonical systemd directory.');
 const unit=join(unitDirectory,'setupvibe-collector.service'),stat=await lstat(unit);
 if(!stat.isFile()||stat.isSymbolicLink()||await realpath(unit)!==unit)throw Error('Unit must be a regular file without symlinks.');
 if((stat.mode&0o022)!==0||typeof process.getuid==='function'&&stat.uid!==process.getuid())throw Error('Unit must belong to the current user and reject external writes.');
 if(await readFile(unit,'utf8')!==systemdCollector(config))throw Error('Existing unit does not match the expected configuration.');
 const binary=await lstat(config.executable);
 if(!binary.isFile()||binary.isSymbolicLink())throw Error('Collector must be a regular executable.');
 await access(config.executable,constants.X_OK);
 return unit;
}
/** O gerenciador deve carregar o arquivo conferido, sem drop-ins capazes de trocar ExecStart. */
async function loadedUnit(unit:string,executable:string){
 const status=await systemdCollectorStatus(executable);
 if(status.load!=='loaded'||status.fragment!==unit||status.dropIns)throw Error('Loaded collector unit or drop-ins do not match the reviewed configuration.');
 return status;
}
/** Revisão sem escrita confere a configuração e consulta o user manager antes da confirmação. */
export async function previewCollectorControl(config:CollectorService,unitDirectory:string,action:'activate'|'stop',executable='systemctl'){
 if(!['activate','stop'].includes(action))throw Error('Invalid collector action.');
 const unit=await verifyUnit(config,unitDirectory),status=await systemdCollectorStatus(executable);
 if(status.dropIns||status.load==='loaded'&&status.fragment!==unit||action==='stop'&&status.load!=='loaded')throw Error('Loaded collector unit or drop-ins do not match the reviewed configuration.');
 if(!['loaded','not-found'].includes(status.load))throw Error('Collector unit is not loadable.');
 const steps=action==='activate'?[{id:'systemd-reload',command:executable,args:['--user','daemon-reload']},{id:'systemd-enable',command:executable,args:['--user','enable','--now','setupvibe-collector.service']}]:[{id:'systemd-stop',command:executable,args:['--user','stop','setupvibe-collector.service']}];
 return{action,unit,status,steps,executed:false as const};
}
/** Ativação recarrega, confere, habilita e verifica o estado; parada preserva a habilitação e as métricas. */
async function controlCollector(config:CollectorService,unitDirectory:string,action:'activate'|'stop',options:{confirmed:boolean;path?:string;signal?:AbortSignal;executable?:string}){
 if(!options.confirmed)throw Error('Explicit confirmation required.');
 const executable=options.executable??'systemctl',preview=await previewCollectorControl(config,unitDirectory,action,executable),unit=preview.unit;
 const store=new StateStore(options.path??statePath(),true);
 try{return await executeSteps(store,preview.steps,{confirmed:true,signal:options.signal,beforeStep:async step=>{
  await verifyUnit(config,unitDirectory);
  if(step.id!=='systemd-reload')await loadedUnit(unit,executable);
 },verify:async()=>{
  const status=await loadedUnit(unit,executable);
  if(action==='activate'?(status.active!=='active'||status.enabled!=='enabled'):status.active!=='inactive')throw Error('Collector service did not reach the requested state.');
 }});}finally{store.close();}
}
/** Exige confirmação antes de criar operação persistente. */
export const activateSystemdCollector=(config:CollectorService,unitDirectory:string,options:Parameters<typeof controlCollector>[3])=>controlCollector(config,unitDirectory,'activate',options);
/** Para somente o serviço conferido, mantendo configuração, autostart e métricas. */
export const stopSystemdCollector=(config:CollectorService,unitDirectory:string,options:Parameters<typeof controlCollector>[3])=>controlCollector(config,unitDirectory,'stop',options);
