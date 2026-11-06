/** Consulta espaço do filesystem sem criar diretórios ou executar comandos externos. */
import {statfsSync}from'node:fs';
export interface DiskSample {path:string;total:number;available:number;used:number;}
/** Usa blocos disponíveis ao usuário, preservando a diferença dos blocos reservados. */
export function readDisk(path:string):DiskSample|null {
 try{
  const stat=statfsSync(path,{bigint:true});
  const values=[stat.blocks*stat.bsize,stat.bavail*stat.bsize,(stat.blocks-stat.bfree)*stat.bsize];
  if(values.some(value=>value<0n||value>BigInt(Number.MAX_SAFE_INTEGER)))return null;
  return{path,total:Number(values[0]),available:Number(values[1]),used:Number(values[2])};
 }catch{return null;}
}
