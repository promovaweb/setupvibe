/** Simula launchctl no Linux; não homologa sessões ou serviços reais do macOS. */
import {expect,test} from 'bun:test';
import {mkdtempSync,mkdirSync,writeFileSync,existsSync,rmSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {LaunchdCollectorController,parseLaunchdList} from '../src/core/launchd-collector';
import {launchdCollector} from '../src/core/supervisor';
test('listagem reduz estado apenas para o coletor e recusa dados ambíguos',()=>{
 expect(parseLaunchdList('PID Status Label\n12 0 external.job\n- -15 dev.setupvibe.collector')).toEqual({loaded:true,pid:null,lastExit:-15});
 expect(parseLaunchdList('PID Status Label\n')).toEqual({loaded:false,pid:null,lastExit:null});
 expect(()=>parseLaunchdList('PID Status Label\n12 0 dev.setupvibe.collector\n13 0 dev.setupvibe.collector')).toThrow('Duplicate');
 expect(()=>parseLaunchdList('invalid')).toThrow();
});
test('LaunchAgent exige confirmação, registra bootstrap e preserva configuração na parada',async()=>{
 const home=mkdtempSync(join(homedir(),'setupvibe-launchd-')),path=join(home,'state.db'),binary=join(home,'launchctl'),flag=join(home,'loaded');
 try{
  const manager=new LaunchdCollectorController({platform:'darwin',home,uid:501},binary,path),directory=manager.directory();mkdirSync(directory,{recursive:true});
  const config={executable:process.execPath,stateDirectory:home,intervalMs:5000},unit=join(directory,'dev.setupvibe.collector.plist');writeFileSync(unit,launchdCollector(config),{mode:0o600});
  writeFileSync(binary,'#!'+process.execPath+'\n'+`const fs=require('node:fs'),flag=${JSON.stringify(flag)},args=process.argv.slice(2);if(args[0]==='list')console.log('PID Status Label\\n'+(fs.existsSync(flag)?'123 0 dev.setupvibe.collector':''));else if(args[0]==='bootstrap')fs.writeFileSync(flag,'yes');else if(args[0]==='bootout')fs.rmSync(flag,{force:true});else if(!['enable','kickstart'].includes(args[0]))process.exit(1);`,{mode:0o700});
  await expect(manager.activate(config,directory,{confirmed:false})).rejects.toThrow('confirmation');expect(existsSync(path)).toBe(false);
  expect((await manager.preview(config,directory,'activate')).executed).toBe(false);expect(existsSync(path)).toBe(false);
  expect((await manager.activate(config,directory,{confirmed:true})).status).toBe('succeeded');expect((await manager.status()).active).toBe('active');
  expect((await manager.activate(config,directory,{confirmed:true})).status).toBe('succeeded');
  const external=new LaunchdCollectorController({platform:'darwin',home,uid:501},binary,join(home,'external.db'));
  await expect(external.stop(config,directory,{confirmed:true})).rejects.toThrow('External LaunchAgent');
  expect((await manager.stop(config,directory,{confirmed:true})).status).toBe('succeeded');expect((await manager.status()).load).toBe('not-found');expect(existsSync(unit)).toBe(true);
  expect((await manager.activate(config,directory,{confirmed:true})).status).toBe('succeeded');
  writeFileSync(unit,'external');await expect(manager.stop(config,directory,{confirmed:true})).rejects.toThrow('does not match');
 }finally{rmSync(home,{recursive:true,force:true});}
});
