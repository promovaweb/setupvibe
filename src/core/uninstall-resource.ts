/** Remove somente recursos registrados, preservando volumes e arquivos arquivados de aplicativos. */
import {existsSync,lstatSync,realpathSync,mkdirSync} from 'node:fs';
import {rename} from 'node:fs/promises';
import {join,dirname,basename} from 'node:path';
import {StateStore} from './state';
import {statePath} from './history';
import {miseExecutable} from './mise-executable';
import {discoverMise} from '../adapters/mise';
import {inspectContainer,discoverContainers,containerControl} from './docker';
import {executeSteps,type CommandStep} from './executor';
import {installationPreflight} from './preflight';
import type {Target} from './platform';
const runtimes=new Set(['node','python','go','rust','php','ruby','java','bun']);
const services=new Set(['postgresql','redis','mailpit','portainer']);
const applications=new Set(['codex','claude','mise','gh','opencode','herdr']);
/** A prévia não cria estado e verifica identidade antes de oferecer a remoção. */
export async function previewUninstall(id:string,target:Target,options:{path?:string;docker?:string;mise?:string;plannedRemovals?:string[]}={}){
  if(!runtimes.has(id)&&!services.has(id)&&!applications.has(id))throw Error('Uninstallation is not integrated for this resource.');
  await installationPreflight(target);
  const path=options.path??statePath();if(!existsSync(path))throw Error('Resource is not managed by SetupVibe.');
  const store=new StateStore(path);let owned;
  try{
    owned=store.managed(id);
    const dependents=id==='mise'?[...runtimes].filter(runtime=>store.managed(runtime)):id==='bun'&&store.managed('codex')?['codex']:[];
    const blocking=dependents.filter(resource=>!options.plannedRemovals?.includes(resource));
    if(blocking.length)throw Error('Uninstall dependent resources first: '+blocking.join(', '));
  }finally{store.close();}
  if(!owned)throw Error('Resource is not managed by SetupVibe.');
  let steps:CommandStep[]=[],archiveSource:string|null=null;
  if(runtimes.has(id)){
    const executable=options.mise??miseExecutable(path),discovery=await discoverMise(executable);
    if(!discovery.available||!discovery.installations.some(item=>item.runtime===id&&item.version===owned.version&&item.path===owned.location))throw Error('Runtime ownership does not match the installed version.');
    steps=[{id:'uninstall-'+id,command:executable,args:['uninstall','--yes',id+'@'+owned.version]}];
  }else if(services.has(id)){
    if(!owned.location.startsWith('/docker/'))throw Error('Docker ownership is not verified.');
    const containerId=owned.location.slice('/docker/'.length),identity=await inspectContainer(containerId,options.docker??'docker');containerControl(identity,containerId,'stop');
    if(identity.image!==owned.version)throw Error('Container image does not match the ownership record.');
    steps=[{id:'uninstall-'+id,command:options.docker??'docker',args:['rm','--force',containerId]}];
  }else{
    const parent=dirname(owned.location),stat=lstatSync(owned.location),directory=lstatSync(parent);
    if(!stat.isFile()||stat.isSymbolicLink()||realpathSync(parent)!==parent||basename(owned.location)!==id||!basename(parent).startsWith(id+'-'+owned.version+'-')||!directory.isDirectory()||(directory.mode&0o077)!==0||typeof process.getuid==='function'&&directory.uid!==process.getuid())throw Error('Application location does not match a private managed installation.');
    archiveSource=parent;
  }
  return{id,owned,steps,archiveSource,retainedData:services.has(id)?'Persistent volumes are preserved.':applications.has(id)?'Application files are moved to a private archive.':'Project and shell configuration are preserved.',executed:false};
}
/** Cada recurso possui sua operação; alteração de propriedade durante a remoção é recusada. */
export async function uninstallResource(id:string,target:Target,options:{confirmed:boolean;path?:string;docker?:string;mise?:string;signal?:AbortSignal}){
  if(!options.confirmed)throw Error('Explicit confirmation required.');
  const path=options.path??statePath(),preview=await previewUninstall(id,target,options),store=new StateStore(path,true);let archived:string|null=null;
  try{
    const result=await executeSteps(store,preview.steps,{confirmed:true,signal:options.signal,verify:async()=>{
      if(preview.archiveSource){
        const archive=join(dirname(path),'uninstalled');mkdirSync(archive,{recursive:true,mode:0o700});
        if(realpathSync(archive)!==archive||(lstatSync(archive).mode&0o077)!==0)throw Error('Archive directory must be private and cannot contain symlinks.');
        archived=join(archive,basename(preview.archiveSource)+'-'+crypto.randomUUID());await rename(preview.archiveSource,archived);
      }else if(services.has(id)){
        const discovery=await discoverContainers(options.docker??'docker');if(!discovery.available||discovery.containers.some(item=>'/docker/'+item.id===preview.owned.location))throw Error('Container removal could not be verified.');
      }else{
        const discovery=await discoverMise(options.mise??miseExecutable(path));if(!discovery.available||discovery.installations.some(item=>item.runtime===id&&item.version===preview.owned.version))throw Error('Runtime removal could not be verified.');
      }
    }});
    if(result.status==='succeeded'){
      try{store.forgetManaged(id,result.id,preview.owned);}catch(error){if(archived&&preview.archiveSource&&!existsSync(preview.archiveSource))await rename(archived,preview.archiveSource);throw error;}
    }else if(archived&&preview.archiveSource&&!existsSync(preview.archiveSource)){await rename(archived,preview.archiveSource);archived=null;}
    return{...result,archived,retainedData:preview.retainedData};
  }finally{store.close();}
}
