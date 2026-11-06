/** Combina descoberta e propriedade sem executar instalação ou criar estado. */
import{miseExecutable}from'./mise-executable';
import{dependencyVersions}from'./dependency-versions';
import{installationPreflight}from'./preflight';
import{existsSync}from'node:fs';
import{discoverMise,miseInstallSteps,reconcileMise}from'../adapters/mise';
import{StateStore}from'./state';
import{statePath}from'./history';
import type{Target}from'./platform';
import type{CommandStep}from'./executor';
export interface RuntimePreview {runtime:string;version:string;action:'install'|'update'|'current'|'awaiting-manager';steps:CommandStep[];executed:false;dependencies?:{id:string;version:string}[];}
/** Falha de descoberta impede prévia executável; banco ausente não é criado. */
export async function runtimePreview(runtime:string,version:string,target:Target,options:{path?:string;executable?:string;allowMissingMise?:boolean;signal?:AbortSignal}={}):Promise<RuntimePreview>{
 const path=options.path??statePath(),executable=options.executable??miseExecutable(path);
 const steps=miseInstallSteps(runtime,version,target,executable);
 if(options.signal?.aborted)throw Error('Runtime preview cancelled.');
 await installationPreflight(target);
 // Apenas ausência comprovada permite aguardar instalação do gerenciador selecionado.
 if(options.allowMissingMise&&executable==='mise'&&!Bun.which('mise'))return{runtime,version,action:'awaiting-manager' as const,steps,executed:false,dependencies:[{id:'mise',version:dependencyVersions.mise}]};
 const discovery=await discoverMise(executable,options.signal);
 if(options.signal?.aborted)throw Error('Runtime preview cancelled.');
 if(!discovery.available)throw new Error("mise unavailable; existing installations could not be checked.");
 let managed:null|{version:string;location:string}=null;
 if(existsSync(path)){const store=new StateStore(path);try{managed=store.managed(runtime);}finally{store.close();}}
 const action=reconcileMise(runtime,version,discovery.installations,managed);
 return{runtime,version,action,steps:action==='current'?[]:steps,executed:false};
}
