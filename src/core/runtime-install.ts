/** Integra prévia, execução e verificação mise com registro de propriedade. */
import{miseExecutable}from'./mise-executable';
import{installMise}from'./install-mise';
import{dependencyVersions}from'./dependency-versions';
import{acquireCollectorLock}from'./collector-lock';
import{miseInstallSteps}from'../adapters/mise';
import{runtimePreview}from'./runtime-preview';
import{discoverMise}from'../adapters/mise';
import{executeSteps,type ExecutionEvent}from'./executor';
import{StateStore}from'./state';
import{statePath}from'./history';
import type{Target}from'./platform';
/** Confirmação é obrigatória antes de criar estado ou executar comandos de instalação. */
export async function installRuntime(runtime:string,version:string,target:Target,options:{confirmed:boolean;installDependencies?:boolean;path?:string;executable?:string;signal?:AbortSignal;onEvent?:(event:ExecutionEvent)=>void}){
 if(!options.confirmed)throw new Error("Explicit confirmation required.");
 const path=options.path??statePath();let executable=options.executable??miseExecutable(path);
 miseInstallSteps(runtime,version,target,executable);
 if(options.signal?.aborted)return{status:'cancelled',operationId:null};
 if(options.installDependencies&&!options.executable&&executable==='mise'&&!Bun.which('mise')){
  const dependency=await installMise(dependencyVersions.mise,target,{confirmed:true,path,signal:options.signal});
  if(!['succeeded','current'].includes(dependency.status))return{status:dependency.status,operationId:dependency.operationId};
  executable=miseExecutable(path);
 }
 const release=acquireCollectorLock(path+'.runtime-lock',"runtime installer");
 try{
 const preview=await runtimePreview(runtime,version,target,{path,executable,signal:options.signal}).catch(error=>{if(options.signal?.aborted)return null;throw error;});
 if(!preview||options.signal?.aborted)return{status:'cancelled',operationId:null};
 if(preview.action==='current')return{status:'current',operationId:null};
 const store=new StateStore(path,true);const previous=store.managed(runtime);let location:string|null=null;
 try{
  const result=await executeSteps(store,preview.steps,{confirmed:true,signal:options.signal,onEvent:options.onEvent,verify:async()=>{
   const discovered=await discoverMise(executable,options.signal);
   if(!discovered.available)throw new Error("Could not verify installation.");
   const match=discovered.installations.find(item=>item.runtime===runtime&&item.version===version);
   if(!match||!match.path.startsWith('/'))throw new Error("Installed version not found.");
   location=match.path;
  }});
  if(result.status==='succeeded'&&location){
   const component={id:runtime,version,location,operationId:result.id};
   if(previous)store.updateManaged(component,previous);else store.registerManaged(component);
  }
  return{status:result.status,operationId:result.id};
 }finally{store.close();}
 }finally{release();}
}
