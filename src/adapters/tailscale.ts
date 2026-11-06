/** Consulta apenas a versão do cliente, sem autenticar ou alterar a rede. */
import{execFile}from'node:child_process';
export function parseTailscaleVersion(output:string):string{
 const first=output.trim().split('\n')[0]??'';
 if(!/^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/.test(first))throw new Error("Invalid Tailscale version.");return first;
}
export function discoverTailscale(executable='tailscale'):Promise<{available:boolean;version:string|null}>{
 return new Promise(resolve=>execFile(executable,['version'],{timeout:3000,maxBuffer:16384,encoding:'utf8'},(error,stdout)=>{
  if(error)return resolve({available:false,version:null});try{resolve({available:true,version:parseTailscaleVersion(stdout)});}catch{resolve({available:false,version:null});}
 }));
}
