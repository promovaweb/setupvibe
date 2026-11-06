/** Verifica todo o conjunto antes de executar runtimes sequencialmente. */
import { runtimePreview } from './runtime-preview';
import { installRuntime } from './runtime-install';
import type { Target } from './platform';
import type { ExecutionEvent } from './executor';
export interface RuntimeSelection {id:string;version:string;}
export interface RuntimeBatchItem extends RuntimeSelection {
  status:'pending'|'current'|'succeeded'|'failed'|'cancelled';
  operationId:string|null;
  error?:string;
}
/** Uma falha preserva os resultados anteriores e deixa os itens seguintes pendentes. */
export async function installRuntimeBatch(selection:RuntimeSelection[],target:Target,options:{confirmed:boolean;signal?:AbortSignal;onEvent?:(item:RuntimeSelection,index:number,event:ExecutionEvent)=>void},provider={preview:runtimePreview,install:installRuntime}) {
  if(!options.confirmed)throw new Error("Explicit confirmation required.");
  if(!selection.length||new Set(selection.map(item=>item.id)).size!==selection.length)throw new Error("Empty or duplicate selection.");
  const items:RuntimeBatchItem[]=selection.map(item=>({...item,status:'pending',operationId:null}));
  // Todas as prévias devem passar antes de qualquer chamada ao instalador.
  for(const item of items){
    if(options.signal?.aborted)return{status:'cancelled' as const,items};
    try{await provider.preview(item.id,item.version,target,{signal:options.signal});if(options.signal?.aborted){item.status='cancelled';return{status:'cancelled' as const,items};}}catch(error){
      if(options.signal?.aborted){item.status='cancelled';return{status:'cancelled' as const,items};}
      item.status='failed';item.error=error instanceof Error?error.message:String(error);
      return{status:'failed' as const,items};
    }
  }
  for(const [index,item] of items.entries()){
    if(options.signal?.aborted)return{status:'cancelled' as const,items};
    try{
      const result=await provider.install(item.id,item.version,target,{confirmed:true,signal:options.signal,onEvent:event=>options.onEvent?.(item,index,event)});
      if(result.status!=='current'&&result.status!=='succeeded'&&result.status!=='failed'&&result.status!=='cancelled')throw new Error("Invalid installation result.");
      item.status=result.status;item.operationId=result.operationId;
      if(result.status==='failed'||result.status==='cancelled')return{status:result.status,items};
    }catch(error){
      item.status='failed';item.error=error instanceof Error?error.message:String(error);
      return{status:'failed' as const,items};
    }
  }
  return{status:'succeeded' as const,items};
}
