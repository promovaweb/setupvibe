/** Instala a unidade canônica do coletor e ativa o supervisor sem substituir configuração externa. */
import {lstat,readFile,realpath,access,mkdir} from 'node:fs/promises';
import {constants,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,join,isAbsolute,parse} from 'node:path';
import {collectorController} from './collector-controller';
import {systemdCollector,launchdCollector,type CollectorService} from './supervisor';
import {writeCollectorConfig} from './install-supervisor';
import {StateStore} from './state';
import {statePath} from './history';
import {installationPreflight} from './preflight';
import type {Target} from './platform';
import {acquireCollectorLock} from './collector-lock';
import {executeSteps} from './executor';
const unitOwner='collector-unit';
/** Confere os pais existentes antes de mkdir; links e diretórios graváveis por terceiros são recusados. */
async function checkParents(directory:string){
 if(!isAbsolute(directory))throw Error('Collector unit directory must be absolute.');
 const root=parse(directory).root;let current=root;
 for(const part of directory.slice(root.length).split('/').filter(Boolean)){
  current=join(current,part);
  try{const stat=await lstat(current);if(!stat.isDirectory()||stat.isSymbolicLink()||(stat.mode&0o022)!==0||await realpath(current)!==current)throw Error('Collector directory must reject symlinks and external writes.');}
  catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')break;throw error;}
 }
}
/** A prévia comprova executável, diretório, propriedade e disponibilidade do supervisor sem gravar estado. */
export async function previewCollectorInstallation(config:CollectorService,target:Target,options:{path?:string;controller?:ReturnType<typeof collectorController>}={}){
 await installationPreflight(target);
 const controller=options.controller??collectorController(),directory=controller.directory(),format=target.system==='darwin'?'launchd':'systemd';
 const content=format==='launchd'?launchdCollector(config):systemdCollector(config),unit=join(directory,format==='launchd'?'dev.setupvibe.collector.plist':'setupvibe-collector.service');
 const binary=await lstat(config.executable);
 if(!binary.isFile()||binary.isSymbolicLink()||(binary.mode&0o022)!==0)throw Error('Collector must be a regular executable protected from external writes.');
 await access(config.executable,constants.X_OK);await checkParents(directory);
 const path=options.path??statePath();let owner:ReturnType<StateStore['managed']>=null;
 if(existsSync(path)){const store=new StateStore(path);try{owner=store.managed(unitOwner);}finally{store.close();}}
 const digest=createHash('sha256').update(content).digest('hex');
 if(owner&&(owner.version!==digest||owner.location!==unit))throw Error('Registered collector configuration differs; automatic replacement refused.');
 let existing=false;
 try{const stat=await lstat(unit);existing=true;if(!owner||!stat.isFile()||stat.isSymbolicLink()||stat.uid!==process.getuid?.()||(stat.mode&0o022)!==0||await readFile(unit,'utf8')!==content)throw Error('External or modified collector unit; installation refused.');}
 catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;if(owner)throw Error('Registered collector unit is missing; reconciliation required.');}
 const status=await controller.status();
 if(status.dropIns)throw Error('Collector drop-ins require manual reconciliation before installation.');
 if(status.load!=='not-found'&&!owner)throw Error('External collector service is already loaded.');
 if(existing)await controller.preview(config,directory,'activate');
 return{unit,directory,format,digest,existing,status,executed:false as const};
}
/** Falha de ativação preserva a unidade registrada para diagnóstico e nova tentativa. */
export async function installCollector(config:CollectorService,target:Target,options:{confirmed:boolean;path?:string;signal?:AbortSignal;controller?:ReturnType<typeof collectorController>}){
 if(!options.confirmed)throw Error('Explicit confirmation required.');
 const controller=options.controller??collectorController(),path=options.path??statePath();
 await previewCollectorInstallation(config,target,{path,controller});
 const store=new StateStore(path,true);let release:(()=>void)|undefined;
 try{
  release=acquireCollectorLock(path+'.collector-install-lock','collector installer');
  const preview=await previewCollectorInstallation(config,target,{path,controller});let configurationOperationId:string|null=null;
  if(!preview.existing){
   const result=await executeSteps(store,[],{confirmed:true,signal:options.signal,verify:async()=>{
    await checkParents(preview.directory);await mkdir(preview.directory,{recursive:true,mode:0o700});await checkParents(preview.directory);
    await writeCollectorConfig(config,preview.unit,preview.format as 'systemd'|'launchd',true);
   }});configurationOperationId=result.id;
   if(result.status!=='succeeded')return{...result,unit:preview.unit,configurationOperationId};
   store.registerManaged({id:unitOwner,version:preview.digest,location:preview.unit,operationId:result.id});
  }
  const result=await controller.activate(config,preview.directory,{confirmed:true,signal:options.signal});
  return{...result,unit:preview.unit,configurationOperationId};
 }finally{release?.();store.close();}
}
