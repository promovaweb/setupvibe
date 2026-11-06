/** Produz comandos mise com versões explícitas, sem escrever configurações de projeto. */
import {miseExecutable} from '../core/mise-executable';
import type { CommandStep } from '../core/executor';
import type { Target } from '../core/platform';
import { validateTarget } from '../core/platform';
const runtimes = new Set(['node','python','go','rust','php','ruby','java','bun']);
/** Recusa versões móveis e IDs fora do catálogo antes de produzir comandos executáveis. */
export function miseInstallSteps(runtime:string,version:string,target:Target,executable='mise'):CommandStep[] {
  validateTarget(target);
  if(target.edition!=='desktop')throw new Error("mise runtimes require Desktop.");
  if(!runtimes.has(runtime))throw new Error("Runtime is not allowed.");
  if(!/^[0-9]+(?:\.[0-9]+){1,3}(?:[-+][a-zA-Z0-9.-]+)?$/.test(version))throw new Error("Provide an explicit numeric version.");
  if(!executable.trim()||executable.includes('\0'))throw new Error("Invalid mise executable.");
  return [{id:`mise-install-${runtime}`,command:executable,args:['install',`${runtime}@${version}`]}];
}

export interface MiseInstallation {runtime:string;version:string;path:string;active:boolean;}
/** Converte resposta instalada sem assumir que recursos mise pertencem ao SetupVibe. */
export function parseMiseInstallations(output:string):MiseInstallation[] {
  const data=JSON.parse(output);
  if(!data||typeof data!=='object'||Array.isArray(data))throw new Error("Invalid mise response.");
  const result:MiseInstallation[]=[];
  for(const [runtime,rows] of Object.entries(data)){
    if(!Array.isArray(rows))throw new Error("Invalid mise list.");
    for(const row of rows){
      if(!row||typeof row.version!=='string'||typeof row.install_path!=='string'||typeof row.installed!=='boolean'||typeof row.active!=='boolean')throw new Error("Invalid mise installation.");
      if(row.installed)result.push({runtime,version:row.version,path:row.install_path,active:row.active});
    }
  }
  return result;
}
/** Consulta ls com prazo e sinal; falha ou cancelamento retorna available:false, sem instalar ferramentas. */
export async function discoverMise(executable=miseExecutable(),signal?:AbortSignal):Promise<{available:boolean;installations:MiseInstallation[]}> {
  const {execFile}=await import('node:child_process');
  return new Promise(resolve=>{
    let result:{available:boolean;installations:MiseInstallation[]}={available:false,installations:[]};
    try{
      const child=execFile(executable,['ls','--installed','--json'],{timeout:3000,maxBuffer:2*1024*1024,encoding:'utf8',signal},(error,stdout)=>{
        if(error)return;
        try{result={available:true,installations:parseMiseInstallations(stdout)};}catch{/* Resposta inválida continua indisponível. */}
      });
      let escalation:ReturnType<typeof setTimeout>|undefined;
      // AbortError pode chegar antes de close; só devolvemos o controle após encerrar o processo.
      const cancel=()=>{if(!escalation)escalation=setTimeout(()=>child.kill('SIGKILL'),250);};
      let timedOut=false;const deadline=setTimeout(()=>{timedOut=true;child.kill('SIGTERM');cancel();},3000);
      signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();
      child.once('close',()=>{clearTimeout(deadline);if(escalation)clearTimeout(escalation);signal?.removeEventListener('abort',cancel);resolve(signal?.aborted||timedOut?{available:false,installations:[]}:result);});
    }catch{resolve({available:false,installations:[]});}
  });
}

/** Compara descoberta e registro antes de oferecer instalação ou atualização. */
export function reconcileMise(runtime:string,version:string,installations:MiseInstallation[],managed:{version:string;location:string}|null):'install'|'current'|'update'{
 if(!runtimes.has(runtime))throw new Error("Runtime is not allowed.");
 const present=installations.filter(item=>item.runtime===runtime);
 if(!managed){if(present.length)throw new Error("External installation preserved; ownership not verified.");return'install';}
 const owned=present.find(item=>item.version===managed.version&&item.path===managed.location);
 if(!owned)throw new Error("Managed installation does not match the local record.");
 const desired=present.find(item=>item.version===version);
 if(desired&&desired.path!==managed.location)throw new Error("Target version already exists outside the managed installation.");
 return managed.version===version?'current':'update';
}
