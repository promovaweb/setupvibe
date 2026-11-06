/** Confere a execução de conjuntos sem instalar runtimes no computador. */
import {expect,test} from 'bun:test';
import {installRuntimeBatch} from '../src/core/runtime-batch';
const target={edition:'desktop' as const,system:'linux',arch:'x64'};
const selection=[{id:'node',version:'24.1.0'},{id:'bun',version:'1.3.14'}];
test('falha na segunda prévia impede toda instalação',async()=>{
  let installs=0;
  const result=await installRuntimeBatch(selection,target,{confirmed:true},{preview:async(id,version)=>{if(id==='bun')throw Error("external");return{runtime:id,version,action:'install',steps:[],executed:false};},install:async()=>{installs++;return{status:'succeeded',operationId:'op'};}});
  expect(installs).toBe(0);expect(result.status).toBe('failed');expect(result.items.map(item=>item.status)).toEqual(['pending','failed']);expect(result.items[1]!.error).toBe("external");
});
test('falha de execução deixa itens seguintes pendentes',async()=>{
  const installed:string[]=[];
  const result=await installRuntimeBatch(selection,target,{confirmed:true},{preview:async(id,version)=>({runtime:id,version,action:'install',steps:[],executed:false}),install:async(id)=>{installed.push(id);return{status:'failed',operationId:'failed-op'};}});
  expect(installed).toEqual(['node']);expect(result.items.map(item=>item.status)).toEqual(['failed','pending']);
});
test('cancelamento após primeiro item preserva seu resultado',async()=>{
  const controller=new AbortController();
  const result=await installRuntimeBatch(selection,target,{confirmed:true,signal:controller.signal},{preview:async(id,version)=>({runtime:id,version,action:'install',steps:[],executed:false}),install:async()=>{controller.abort();return{status:'succeeded',operationId:'first'};}});
  expect(result.status).toBe('cancelled');expect(result.items.map(item=>item.status)).toEqual(['succeeded','pending']);
});
test("sem confirmação nenhum fornecedor é read onlydo",async()=>{
  let called=false;
  await expect(installRuntimeBatch(selection,target,{confirmed:false},{preview:async()=>{called=true;throw Error('não deve executar');},install:async()=>{called=true;throw Error('não deve executar');}})).rejects.toThrow(new RegExp("confirmation","i"));
  expect(called).toBe(false);
});

test.each([false,true])('cancelamento na prévia do lote preserva estado cancelled (rejeita: %s)',async(reject)=>{
 const controller=new AbortController();let installs=0;
 const result=await installRuntimeBatch(selection,target,{confirmed:true,signal:controller.signal},{preview:async(id,version,_target,options)=>{expect(options?.signal).toBe(controller.signal);controller.abort();if(reject)throw Error('aborted');return{runtime:id,version,action:'install',steps:[],executed:false};},install:async()=>{installs++;return{status:'succeeded',operationId:'unexpected'};}});
 expect(result.status).toBe('cancelled');expect(result.items.map(item=>item.status)).toEqual(['cancelled','pending']);expect(installs).toBe(0);
});
