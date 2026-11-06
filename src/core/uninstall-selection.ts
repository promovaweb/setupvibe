/** Confere todo o conjunto de remoção e interrompe na primeira falha ou cancelamento. */
import {previewUninstall,uninstallResource} from './uninstall-resource';
import type {Target} from './platform';
import type {SelectionResult} from './install-selection';
export async function uninstallSelection(ids:string[],target:Target,options:{confirmed:boolean;signal?:AbortSignal;onProgress?:(id:string,index:number)=>void},provider={preview:previewUninstall,uninstall:uninstallResource}){
  if(!options.confirmed)throw Error('Explicit confirmation required.');
  if(!ids.length||new Set(ids).size!==ids.length)throw Error('Empty or duplicate selection.');
  const items:SelectionResult[]=ids.map(id=>({id,status:'pending',operationId:null}));
  const fail=(index:number,error:unknown)=>{items[index]!.status='failed';items[index]!.error=error instanceof Error?error.message:String(error);return{status:'failed' as const,items};};
  for(const [index,id] of ids.entries()){
    if(options.signal?.aborted)return{status:'cancelled' as const,items};
    try{await provider.preview(id,target,{plannedRemovals:ids});}catch(error){return fail(index,error);}
  }
  for(const [index,id] of ids.entries()){
    if(options.signal?.aborted)return{status:'cancelled' as const,items};
    try{
      options.onProgress?.(id,index);
      const result=await provider.uninstall(id,target,{confirmed:true,signal:options.signal});items[index]!.status=result.status;items[index]!.operationId=result.id;
      if(result.status!=='succeeded')return{status:result.status,items};
    }catch(error){return fail(index,error);}
  }
  return{status:'succeeded' as const,items};
}
