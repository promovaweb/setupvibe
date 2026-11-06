/** Lê swap Linux por meminfo; ausência da fonte não significa consumo zero. */
import {readFileSync}from'node:fs';
export interface SwapSample {total:number;used:number;}
/** Aceita apenas contadores inteiros em kB e recusa valores contraditórios. */
export function parseSwap(meminfo:string):SwapSample|null {
 const value=(key:string)=>{const match=meminfo.match(new RegExp('^'+key+':\\s+(\\d+) kB\\s*$','m'));return match?Number(match[1])*1024:null;};
 const total=value('SwapTotal'),free=value('SwapFree');
 if(total===null||free===null||!Number.isSafeInteger(total)||!Number.isSafeInteger(free)||free>total)return null;
 return{total,used:total-free};
}
export function readSwap():SwapSample|null {
 if(process.platform!=='linux')return null;
 try{return parseSwap(readFileSync('/proc/meminfo','utf8'));}catch{return null;}
}
