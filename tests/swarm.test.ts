/** Exercita Swarm com CLI simulado; nunca altera o daemon Docker do computador. */
import {expect,test} from 'bun:test';
import {mkdtempSync,rmSync,writeFileSync,existsSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {homedir} from 'node:os';
import {parseSwarmStatus,previewSwarmInit,initializeSwarm} from '../src/core/swarm';
import {StateStore} from '../src/core/state';
const target={edition:'server' as const,system:'linux',arch:'x64'},node='a'.repeat(25),cluster='b'.repeat(25);
const inactive={LocalNodeState:'inactive',NodeID:'',ControlAvailable:false,NodeAddr:''};
const active={LocalNodeState:'active',NodeID:node,ControlAvailable:true,NodeAddr:'192.0.2.10',Cluster:{ID:cluster}};
test('descoberta recusa identidade parcial',()=>{
 expect(parseSwarmStatus(JSON.stringify(inactive)).state).toBe('inactive');
 expect(()=>parseSwarmStatus(JSON.stringify({...active,Cluster:null}))).toThrow();
 expect(()=>parseSwarmStatus('{}')).toThrow();
});
test('inicialização verifica propriedade, preserva tokens e é idempotente',async()=>{
 const dir=mkdtempSync(join(homedir(),'setupvibe-swarm-')),path=join(dir,'state.db'),executable=join(dir,'docker'),flag=join(dir,'active');
 try{
  writeFileSync(executable,'#!'+process.execPath+'\n'+`const fs=require('node:fs');const flag=${JSON.stringify(flag)};if(process.argv[2]==='info')console.log(JSON.stringify(fs.existsSync(flag)?${JSON.stringify(active)}:${JSON.stringify(inactive)}));else if(process.argv[2]==='swarm'){fs.writeFileSync(flag,'yes');console.log('SWMTKN-1-private-test-token');}else process.exit(1);`,{mode:0o700});
  await expect(initializeSwarm('192.0.2.10',target,{confirmed:false,path,executable})).rejects.toThrow('confirmation');expect(existsSync(path)).toBe(false);
  const preview=await previewSwarmInit('192.0.2.10',target,{path,executable});expect(preview.action).toBe('initialize');expect(existsSync(path)).toBe(false);
  expect(preview.steps[0]!.args).toContain('192.0.2.10:2377');
  const result=await initializeSwarm('192.0.2.10',target,{confirmed:true,path,executable});expect(result.status).toBe('succeeded');
  const store=new StateStore(path);try{expect(store.managed('swarm')?.version).toBe(cluster);expect(store.managed('swarm')?.location).toBe('/swarm-node/'+node);expect(JSON.stringify(store.get(result.operationId!))).not.toContain('SWMTKN');}finally{store.close();}
  expect(readFileSync(path).includes(Buffer.from('private-test-token'))).toBe(false);
  expect((await initializeSwarm('192.0.2.10',target,{confirmed:true,path,executable})).status).toBe('current');
  await expect(previewSwarmInit('192.0.2.11',target,{path,executable})).rejects.toThrow('different advertised');
  await expect(previewSwarmInit('192.0.2.10',target,{path:join(dir,'external.db'),executable})).rejects.toThrow('External Swarm');
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('falha de verificação não registra Swarm e entrada inválida não cria estado',async()=>{
 const dir=mkdtempSync(join(homedir(),'setupvibe-swarm-failure-')),path=join(dir,'state.db'),executable=join(dir,'docker');
 try{
  writeFileSync(executable,'#!'+process.execPath+'\n'+`if(process.argv[2]==='info')console.log(${JSON.stringify(JSON.stringify(inactive))});else if(process.argv[2]==='swarm')process.exit(0);else process.exit(1);`,{mode:0o700});
  await expect(previewSwarmInit('0.0.0.0',target,{path,executable})).rejects.toThrow('explicit');expect(existsSync(path)).toBe(false);
  await expect(previewSwarmInit('example.com',target,{path,executable})).rejects.toThrow('explicit');
  const controller=new AbortController();controller.abort();expect((await initializeSwarm('192.0.2.10',target,{confirmed:true,path,executable,signal:controller.signal})).status).toBe('cancelled');expect(existsSync(path)).toBe(false);
  const result=await initializeSwarm('192.0.2.10',target,{confirmed:true,path,executable});expect(result.status).toBe('failed');
  const store=new StateStore(path);try{expect(store.managed('swarm')).toBeNull();expect(store.get(result.operationId!)?.status).toBe('failed');}finally{store.close();}
 }finally{rmSync(dir,{recursive:true,force:true});}
});
