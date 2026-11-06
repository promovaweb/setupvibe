/** Verifica conjuntos mistos sem alterar runtimes ou containers do computador. */
import {expect,test} from 'bun:test';
import {installSelection,type InstallSelection} from '../src/core/install-selection';
const target={edition:'desktop' as const,system:'linux',arch:'x64'};
const selection:InstallSelection[]=[{kind:'runtime',id:'bun',version:'1.3.14'},{kind:'service',id:'redis',request:{id:'redis',image:'redis@sha256:'+'a'.repeat(64),port:6379,volume:'setupvibe-redis'}}];
test('recusa runtime antes do mise selecionado e preserva runtime se gerenciador falhar',async()=>{
 const manager:InstallSelection={kind:'application',id:'mise',version:'2026.11.0'},runtime=selection[0]!;
 await expect(installSelection([runtime,manager],target,{confirmed:true})).rejects.toThrow(new RegExp("must precede","i"));
 const unexpected=async()=>{throw Error('Fornecedor não configurado pelo teste');};let installs=0;
 const result=await installSelection([manager,runtime],target,{confirmed:true},{credentials:()=>{},runtime:{preview:async(id,version,_target,options)=>{expect(options?.allowMissingMise).toBe(true);return{runtime:id,version,action:'awaiting-manager',steps:[],executed:false};},install:async()=>{installs++;return{status:'succeeded',operationId:'não deve instalar'};}},service:{preview:unexpected,install:unexpected}},{preview:unexpected,install:unexpected},{preview:unexpected,install:unexpected},{preview:async()=>({action:'install',steps:[],executed:false}),install:async()=>({status:'failed',operationId:'manager-failed',executable:null})});
 expect(result.status).toBe('failed');expect(installs).toBe(0);expect(result.items.map(item=>item.status)).toEqual(['failed','pending']);
});
test('verifica conjunto misto antes de executar na ordem recebida',async()=>{
  const calls:string[]=[];
  const result=await installSelection(selection,target,{confirmed:true},{credentials:()=>{},runtime:{preview:async(id,version)=>{calls.push('preview-runtime');return{runtime:id,version,action:'install',steps:[],executed:false};},install:async()=>{calls.push('install-runtime');return{status:'succeeded',operationId:'runtime'};}},service:{preview:async()=>{calls.push('preview-service');return{step:{id:'create',command:'docker',args:[]},executed:false};},install:async()=>{calls.push('install-service');return{id:'service',status:'succeeded',steps:[]};}}});
  expect(calls).toEqual(['preview-runtime','preview-service','install-runtime','install-service']);expect(result.status).toBe('succeeded');expect(result.items.map(item=>item.operationId)).toEqual(['runtime','service']);
});
test("recusa portas e volumes repetidos antes de read onlyr fornecedores",async()=>{
  const redis=selection[1]!;if(redis.kind!=='service')throw Error('fixture');
  const mailpit:InstallSelection={kind:'service',id:'mailpit',request:{id:'mailpit',image:'axllent/mailpit@sha256:'+'a'.repeat(64),port:6379}};
  await expect(installSelection([redis,mailpit],target,{confirmed:true})).rejects.toThrow(new RegExp("Duplicate port","i"));
  const pg:InstallSelection={kind:'service',id:'postgresql',request:{id:'postgresql',image:'postgres@sha256:'+'a'.repeat(64),port:5432,volume:'setupvibe-redis'}};
  await expect(installSelection([redis,pg],target,{confirmed:true})).rejects.toThrow(new RegExp("Duplicate volume","i"));
});

test('Bun selecionado deve preceder Codex, mesmo com dependências automáticas',async()=>{
 const codex:InstallSelection={kind:'application',id:'codex',version:'0.100.0'};
 await expect(installSelection([codex,selection[0]!],target,{confirmed:true,installDependencies:true})).rejects.toThrow('Bun must precede Codex');
});

test.each(['succeeded','failed'] as const)('Codex aguarda resultado %s do Bun selecionado',async(status)=>{
 const calls:string[]=[];let bunReady=false;
 const unexpected=async()=>{throw Error('Fornecedor não configurado pelo teste');};
 const result=await installSelection([selection[0]!,{kind:'application',id:'codex',version:'0.100.0'}],target,{confirmed:true},{
  credentials:()=>{},service:{preview:unexpected,install:unexpected},runtime:{
   preview:async(id,version)=>({runtime:id,version,action:'install',steps:[],executed:false}),
   install:async()=>{calls.push('bun');bunReady=status==='succeeded';return{status,operationId:'bun-operation'};},
  },
 },{
  preview:async(_version,_target,options)=>{
   expect(options?.allowMissingBun).toBe(true);expect(options?.installDependencies).toBeUndefined();
   return{action:'awaiting-dependencies',steps:[],executed:false,dependencies:[{id:'bun',version:'1.3.14'}]};
  },
  install:async(_version,_target,options)=>{
   expect(bunReady).toBe(true);expect(options.installDependencies).toBeUndefined();calls.push('codex');
   return{status:'succeeded',operationId:'codex-operation',executable:'/isolado/codex'};
  },
 });
 expect(calls).toEqual(status==='succeeded'?['bun','codex']:['bun']);
 expect(result.status).toBe(status);
 expect(result.items[1]!.status).toBe(status==='succeeded'?'succeeded':'pending');
});

test.each([false,true])('cancelamento durante prévia mista impede instalações (rejeita: %s)',async(reject)=>{
 const controller=new AbortController();let installs=0;
 const result=await installSelection([selection[0]!],target,{confirmed:true,signal:controller.signal},{credentials:()=>{},service:{preview:async()=>{throw Error('unexpected');},install:async()=>{throw Error('unexpected');}},runtime:{preview:async(id,version,_target,options)=>{expect(options?.signal).toBe(controller.signal);controller.abort();if(reject)throw Error('aborted');return{runtime:id,version,action:'install',steps:[],executed:false};},install:async()=>{installs++;return{status:'succeeded',operationId:'unexpected'};}}});
 expect(result.status).toBe('cancelled');expect(result.items[0]!.status).toBe('cancelled');expect(installs).toBe(0);
});
test('cancelar no evento de progresso impede chamar o instalador',async()=>{
 const controller=new AbortController();let installs=0;
 const result=await installSelection([selection[0]!],target,{confirmed:true,signal:controller.signal,onProgress:()=>controller.abort()},{credentials:()=>{},service:{preview:async()=>{throw Error('unexpected');},install:async()=>{throw Error('unexpected');}},runtime:{preview:async(id,version)=>({runtime:id,version,action:'install',steps:[],executed:false}),install:async()=>{installs++;return{status:'succeeded',operationId:'unexpected'};}}});
 expect(result.status).toBe('cancelled');expect(installs).toBe(0);
});

test.each(['succeeded','failed','cancelled'] as const)('dependência Docker automática respeita resultado %s antes de criar serviço',async(status)=>{
 const calls:string[]=[],service=selection[1]!;let ready=false;
 const providers={credentials:()=>{},runtime:{preview:async()=>{throw Error('unexpected');},install:async()=>{throw Error('unexpected');}},service:{preview:async(_request:unknown,_target:unknown,options?:{allowMissingDocker?:boolean})=>{if(!ready&&!options?.allowMissingDocker)throw Error('Docker unavailable; conflicts could not be checked.');calls.push('preview-service');return{step:{id:'create',command:'docker',args:[]},executed:false};},install:async()=>{expect(ready).toBe(true);calls.push('install-service');return{id:'service-test',status:'succeeded' as const,steps:[]};}}};
 const docker={preview:async()=>({action:'install' as const,version:'26.1.5-1',clientVersion:null,status:{installed:null,candidate:'26.1.5-1',client:null,clientCandidate:null,binary:null,occupied:false},steps:[],executed:false as const,sudo:false}),install:async()=>{calls.push('install-docker');ready=status==='succeeded';return{status,operationId:'docker-test',executable:ready?'/usr/bin/docker':null,version:'26.1.5-1',managed:ready};}};
 const result=await installSelection([service],target,{confirmed:true,installDependencies:true},providers,undefined,undefined,undefined,undefined,undefined,undefined,docker);expect(result.status).toBe(status);expect(calls).toEqual(status==='succeeded'?['preview-service','install-docker','install-service']:['preview-service','install-docker']);
});
test('prévia com Docker ausente anuncia dependência sem instalar e recusa ordem invertida',async()=>{
 const service=selection[1]!,engine:InstallSelection={kind:'application',id:'docker',version:'candidate'};let writes=0;
 const providers={credentials:()=>{},runtime:{preview:async()=>{throw Error('unexpected');},install:async()=>{throw Error('unexpected');}},service:{preview:async(_request:unknown,_target:unknown,options?:{allowMissingDocker?:boolean})=>{if(!options?.allowMissingDocker)throw Error('Docker unavailable; conflicts could not be checked.');return{step:{id:'create',command:'docker',args:[]},executed:false};},install:async()=>{writes++;throw Error('unexpected');}}};
 const docker={preview:async()=>({action:'install' as const,version:'26.1.5-1',clientVersion:null,status:{installed:null,candidate:'26.1.5-1',client:null,clientCandidate:null,binary:null,occupied:false},steps:[],executed:false as const,sudo:false}),install:async()=>{writes++;throw Error('unexpected');}};
 const result=await installSelection([service],target,{confirmed:false,previewOnly:true,installDependencies:true},providers,undefined,undefined,undefined,undefined,undefined,undefined,docker);expect(result.status).toBe('previewed');expect('dependencies'in result?result.dependencies:null).toEqual([{id:'docker',version:'candidate'}]);expect(writes).toBe(0);
 await expect(installSelection([service,engine],target,{confirmed:true})).rejects.toThrow('Docker must precede services');
});
