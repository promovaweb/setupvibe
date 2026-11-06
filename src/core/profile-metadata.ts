/** Preserva metadados nativos ao preparar a substituição de um perfil no mesmo filesystem. */
import {spawn} from 'node:child_process';
/** Lista explícita no GNU cp faz falha de preservação de xattr interromper a operação. */
export function profileCopyCommand(source:string,destination:string,system=process.platform):{command:string;args:string[]}{
 if(system==='linux')return{command:'/usr/bin/cp',args:['--attributes-only','--preserve=mode,ownership,xattr','--no-dereference','--',source,destination]};
 if(system==='darwin')return{command:'/bin/cp',args:['-pP',source,destination]};
 throw Error('Profile metadata preservation requires Linux or macOS.');
}
/** O destino é staging privado; stdout/stderr externos não expõem dados dos perfis na CLI. */
export async function preserveProfileMetadata(source:string,destination:string,signal?:AbortSignal):Promise<void>{
 const step=profileCopyCommand(source,destination);
 await new Promise<void>((resolve,reject)=>{
  const child=spawn(step.command,step.args,{stdio:'ignore',shell:false,env:{...process.env,LC_ALL:'C'}});let failed=false,escalation:ReturnType<typeof setTimeout>|undefined;
  const stop=()=>{failed=true;child.kill('SIGTERM');escalation??=setTimeout(()=>child.kill('SIGKILL'),250);},timeout=setTimeout(stop,10000);
  signal?.addEventListener('abort',stop,{once:true});child.once('error',()=>{failed=true;});
  child.once('close',code=>{clearTimeout(timeout);clearTimeout(escalation);signal?.removeEventListener('abort',stop);if(failed||signal?.aborted||code!==0)reject(Error('Profile metadata could not be preserved; original profile retained.'));else resolve();});
  if(signal?.aborted)stop();
 });
}
