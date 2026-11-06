/** Instala unidades em diretórios descartáveis com supervisor simulado, sem serviços no host. */
import {expect,test} from 'bun:test';
import {mkdtempSync,rmSync,existsSync,writeFileSync,readFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {installCollector,previewCollectorInstallation} from '../src/core/install-collector';
import {StateStore} from '../src/core/state';
const target={edition:'desktop' as const,system:'linux',arch:'x64'};
test('prévia não cria diretórios; instalação cria e registra unidade antes de ativar',async()=>{
 const dir=mkdtempSync(join(homedir(),'setupvibe-install-collector-')),directory=join(dir,'config','systemd','user'),path=join(dir,'state.db');let activated=0;
 const config={executable:process.execPath,stateDirectory:dir,intervalMs:5000,embedded:true};
 const status={load:'not-found',active:'inactive',sub:'dead',enabled:'',fragment:'',dropIns:''};
 const controller={directory:()=>directory,status:async()=>status,preview:async(_config:unknown,_directory:string,action:'activate'|'stop')=>({action,unit:join(directory,'setupvibe-collector.service'),status,steps:[],executed:false as const}),activate:async()=>{activated++;expect(existsSync(join(directory,'setupvibe-collector.service'))).toBe(true);return{id:'activate',status:'succeeded' as const,steps:[]};},stop:async()=>{throw Error('unexpected');}};
 try{
  await expect(installCollector(config,target,{confirmed:false,path,controller})).rejects.toThrow('confirmation');expect(existsSync(path)).toBe(false);
  status.dropIns='/external/override.conf';await expect(previewCollectorInstallation(config,target,{path,controller})).rejects.toThrow('drop-ins');expect(existsSync(path)).toBe(false);status.dropIns='';
  const preview=await previewCollectorInstallation(config,target,{path,controller});expect(preview.existing).toBe(false);expect(existsSync(directory)).toBe(false);expect(existsSync(path)).toBe(false);
  const first=await installCollector(config,target,{confirmed:true,path,controller});expect(first.status).toBe('succeeded');expect(activated).toBe(1);expect(readFileSync(first.unit,'utf8')).toContain('--collector');
  const store=new StateStore(path);try{expect(store.managed('collector-unit')?.location).toBe(first.unit);}finally{store.close();}
  const original=readFileSync(first.unit);expect((await installCollector(config,target,{confirmed:true,path,controller})).configurationOperationId).toBeNull();expect(readFileSync(first.unit)).toEqual(original);expect(activated).toBe(2);
  writeFileSync(first.unit,'external');await expect(installCollector(config,target,{confirmed:true,path,controller})).rejects.toThrow('modified');expect(activated).toBe(2);expect(readFileSync(first.unit,'utf8')).toBe('external');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
