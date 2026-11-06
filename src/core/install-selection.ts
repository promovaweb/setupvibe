/** Executa seleção mista após verificar todos os itens e seus conflitos internos. */
import {dockerEnginePreview,installDockerEngine} from './install-docker';
import {gitPreview,installGit} from './install-git';
import {openCodePreview,installOpenCode} from './install-opencode';
import {ghPreview,installGh} from './install-gh';
import {herdrPreview,installHerdr} from './install-herdr';
import {misePreview,installMise} from './install-mise';
import {claudePreview,installClaude} from './install-claude';
import {codexPreview,installCodex} from './install-codex';
import {runtimePreview} from './runtime-preview';
import {installRuntime} from './runtime-install';
import {previewDockerService,type ServiceRequest} from '../adapters/docker-service';
import {installService} from './install-service';
import {validateCredentialFile} from './credential-file';
import type {Target} from './platform';
export type InstallSelection={kind:'application';id:'codex'|'claude'|'mise'|'gh'|'opencode'|'herdr'|'git'|'docker';version:string}|{kind:'runtime';id:string;version:string}|{kind:'service';id:string;request:ServiceRequest};
export interface SelectionResult {id:string;status:'pending'|'external'|'current'|'succeeded'|'failed'|'cancelled';operationId:string|null;error?:string;}
/** O conjunto não é transacional: falhas preservam instalações anteriores e interrompem as seguintes.
 * previewOnly executa apenas consultas dos fornecedores e dispensa confirmação; nunca entra no laço de instalação.
 */
export async function installSelection(selection:InstallSelection[],target:Target,options:{confirmed:boolean;previewOnly?:boolean;installDependencies?:boolean;signal?:AbortSignal;onProgress?:(id:string,index:number)=>void},providers={runtime:{preview:runtimePreview,install:installRuntime},service:{preview:previewDockerService,install:installService},credentials:validateCredentialFile},codex={preview:codexPreview,install:installCodex},claude={preview:claudePreview,install:installClaude},mise={preview:misePreview,install:installMise},gh={preview:ghPreview,install:installGh},openCode={preview:openCodePreview,install:installOpenCode},git={preview:gitPreview,install:installGit},docker={preview:dockerEnginePreview,install:installDockerEngine},herdr={preview:herdrPreview,install:installHerdr}){
  if(!options.confirmed&&!options.previewOnly)throw Error("Explicit confirmation required.");
  if(!selection.length||new Set(selection.map(item=>item.id)).size!==selection.length)throw Error("Empty or duplicate selection.");
  const managerIndex=selection.findIndex(item=>item.kind==='application'&&item.id==='mise');
  if(managerIndex>=0&&selection.some((item,index)=>item.kind==='runtime'&&index<managerIndex))throw Error("mise must precede runtimes in the plan.");
  const dockerIndex=selection.findIndex(item=>item.kind==='application'&&item.id==='docker');
  if(dockerIndex>=0&&selection.some((item,index)=>item.kind==='service'&&index<dockerIndex))throw Error('Docker must precede services in the plan.');
  let prepareDocker=false;
  const bunIndex=selection.findIndex(item=>item.kind==='runtime'&&item.id==='bun');
  const codexIndex=selection.findIndex(item=>item.kind==='application'&&item.id==='codex');
  if(bunIndex>=0&&codexIndex>=0&&bunIndex>codexIndex)throw Error("Bun must precede Codex in the plan.");
  const application=(id:string)=>{
    switch(id){case 'docker':return docker;case 'git':return git;case 'opencode':return openCode;case 'gh':return gh;case 'herdr':return herdr;case 'mise':return mise;case 'claude':return claude;case 'codex':return codex;default:throw Error("Application has no integrated provider.");}
  };
  const ports=new Set<number>(),volumes=new Set<string>();
  for(const item of selection){if(item.kind!=='service')continue;
    if(item.id!==item.request.id)throw Error("Service identity mismatch.");
    for(const port of [item.request.port,...(item.request.id==='mailpit'?[item.request.smtpPort??1025]:[])]){if(ports.has(port))throw Error("Duplicate port in selection: "+port);ports.add(port);}
    if(item.request.volume){if(volumes.has(item.request.volume))throw Error("Duplicate volume in selection.");volumes.add(item.request.volume);}
  }
  const items:SelectionResult[]=selection.map(item=>({id:item.id,status:'pending',operationId:null}));
  const failed=(index:number,error:unknown)=>{if(options.signal?.aborted){items[index]!.status='cancelled';return{status:'cancelled' as const,items};}items[index]!.status='failed';items[index]!.error=error instanceof Error?error.message:String(error);return{status:'failed' as const,items};};
  const previews:{id:string;preview:unknown}[]=[];
  for(const [index,item] of selection.entries()){
    if(options.signal?.aborted)return{status:'cancelled' as const,items};
    try{
      let preview:unknown;
      if(item.kind==='application'){if(item.id==='codex')preview=await codex.preview(item.version,target,{installDependencies:options.installDependencies,allowMissingBun:bunIndex>=0});else preview=await application(item.id).preview(item.version,target,{signal:options.signal});}
      else if(item.kind==='runtime')preview=await providers.runtime.preview(item.id,item.version,target,{allowMissingMise:managerIndex>=0||options.installDependencies,signal:options.signal});
      else{if(item.request.id==='postgresql'){if(!item.request.postgres)throw Error("PostgreSQL credentials are missing.");providers.credentials(item.request.postgres.passwordFile);}try{preview=await providers.service.preview(item.request,target);}catch(error){
        if(!(error instanceof Error)||error.message!=='Docker unavailable; conflicts could not be checked.'||!(options.installDependencies||dockerIndex>=0))throw error;
        const engine=selection[dockerIndex],version=engine?.kind==='application'?engine.version:'candidate';
        const dependency=await docker.preview(version,target,{signal:options.signal});
        if(dependency.action==='external'||dependency.action==='current')throw Error('Existing Docker is unavailable; restore access to its daemon before installing services.');
        preview=await providers.service.preview(item.request,target,{allowMissingDocker:true});prepareDocker=true;
      }}
      if(options.signal?.aborted){items[index]!.status='cancelled';return{status:'cancelled' as const,items};}
      previews.push({id:item.id,preview});
    }catch(error){return failed(index,error);}
  }
  if(options.previewOnly)return{status:'previewed' as const,items,previews,executed:false as const,...(prepareDocker&&dockerIndex<0?{dependencies:[{id:'docker',version:'candidate'}]}:{})};
  if(prepareDocker&&dockerIndex<0){
    const index=selection.findIndex(item=>item.kind==='service');
    try{options.onProgress?.('docker',0);if(options.signal?.aborted)return{status:'cancelled' as const,items};const result=await docker.install('candidate',target,{confirmed:true,signal:options.signal});if(!['succeeded','current'].includes(result.status)){items[index]!.status=result.status==='cancelled'?'cancelled':'failed';items[index]!.error='Docker prerequisite installation did not complete.';return{status:items[index]!.status as 'failed'|'cancelled',items};}}catch(error){return failed(index,error);}
  }
  for(const [index,item] of selection.entries()){
    if(options.signal?.aborted)return{status:'cancelled' as const,items};
    try{
      options.onProgress?.(item.id,index);
      if(options.signal?.aborted){items[index]!.status='cancelled';return{status:'cancelled' as const,items};}
      const result=item.kind==='application'?await application(item.id).install(item.version,target,{confirmed:true,installDependencies:options.installDependencies,signal:options.signal}):item.kind==='runtime'?await providers.runtime.install(item.id,item.version,target,{confirmed:true,installDependencies:options.installDependencies,signal:options.signal}):await providers.service.install(item.request,target,{confirmed:true,signal:options.signal});
      const status=result.status;
      if(status!=='external'&&status!=='current'&&status!=='succeeded'&&status!=='failed'&&status!=='cancelled')throw Error("Invalid installation result.");
      items[index]!.status=status;items[index]!.operationId='operationId'in result?result.operationId:result.id;
      if(status==='failed'||status==='cancelled')return{status,items};
    }catch(error){return failed(index,error);}
  }
  return{status:'succeeded' as const,items};
}
