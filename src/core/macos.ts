/** Consulta versão macOS sem inferir suporte a partir da versão do kernel Darwin. */
import{execFile}from'node:child_process';
/** Valida versão do produto e mantém homologação separada da matriz pretendida. */
export function parseMacVersion(value:string):{version:string;supported:boolean}{
 const version=value.trim();if(!/^\d+\.\d+(?:\.\d+)?$/.test(version))throw new Error("Invalid macOS version.");
 return{version,supported:Number(version.split('.')[0])>=14};
}
export function detectMacVersion():Promise<{version:string|null;supported:boolean;error:string|null}>{
 return new Promise(resolve=>execFile('/usr/bin/sw_vers',['-productVersion'],{timeout:3000,maxBuffer:4096,encoding:'utf8'},(error,stdout)=>{
  if(error)return resolve({version:null,supported:false,error:"macOS version unavailable."});
  try{resolve({...parseMacVersion(stdout),error:null});}catch{resolve({version:null,supported:false,error:"Invalid macOS version."});}
 }));
}
