/** Exercita propriedade e falhas com consultas e comandos locais simulados, sem APT no host. */
import {expect,test} from 'bun:test';
import {mkdtempSync,rmSync,existsSync,readFileSync,writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {dockerEnginePreview,installDockerEngine} from '../src/core/install-docker';
import {aptDockerSteps,dockerIntegrityValid,validDockerPackageVersion,type AptDockerState} from '../src/adapters/apt-docker';
import {StateStore} from '../src/core/state';
const target={edition:'server' as const,system:'linux',arch:'x64'},empty:AptDockerState={installed:null,candidate:'26.1.5-1',client:null,clientCandidate:'26.1.5-1',binary:null,occupied:false};
const unexpected=async()=>{throw Error('unexpected provider');};
test('plano Docker fixa engine e cliente, preserva conffiles e ativa somente após APT',()=>{
 const steps=aptDockerSteps('26.1.5-1','26.1.5-1',true);expect(steps[1]!.args).toContain('docker.io=26.1.5-1');expect(steps[1]!.args).toContain('docker-cli=26.1.5-1');expect(steps[1]!.args).toContain('--no-remove');expect(steps[1]!.args).toContain('Dpkg::Options::=--force-confold');expect(steps[2]!.args).toEqual(['-n','--','/usr/bin/systemctl','enable','--now','docker.service']);expect(validDockerPackageVersion('--option')).toBe(false);
 expect(dockerIntegrityValid(0,'')).toBe(true);expect(dockerIntegrityValid(1,'missing     /usr/share/doc/docker.io/README\n')).toBe(true);for(const text of ['missing     /usr/sbin/dockerd','??5??????   /usr/bin/docker','missing     /usr/share/doc/../../bin/docker'])expect(dockerIntegrityValid(1,text)).toBe(false);
});
test.skipIf(process.platform!=='linux')('engine, cliente ou dados externos são preservados sem criar estado',async()=>{
 const directory=mkdtempSync(join(homedir(),'setupvibe-docker-external-')),path=join(directory,'state.db');try{
  for(const state of [{...empty,installed:'26.1.5-1'},{...empty,binary:'/external/docker'},{...empty,occupied:true},{...empty,client:'26.1.5-1'}]){
   const provider={inspect:async()=>state,sudo:unexpected,verify:unexpected,steps:()=>{throw Error('unexpected');}};
   expect((await dockerEnginePreview('candidate',target,{path,provider})).action).toBe('external');expect((await installDockerEngine('candidate',target,{confirmed:true,path,provider})).status).toBe('external');expect(existsSync(path)).toBe(false);
  }
 }finally{rmSync(directory,{recursive:true,force:true});}
});
test.skipIf(process.platform!=='linux')('instalação resolve índices e registra somente após verificar serviço e daemon',async()=>{
 const directory=mkdtempSync(join(homedir(),'setupvibe-docker-install-')),path=join(directory,'state.db'),file=join(directory,'fixture.json');writeFileSync(file,JSON.stringify({...empty,candidate:null,clientCandidate:null}));let fail=false;
 const provider={inspect:async()=>JSON.parse(readFileSync(file,'utf8')) as AptDockerState,sudo:async()=>false,verify:async(version:string,client:string|null)=>{expect(version).toBe('26.1.5-1');expect(client).toBe('26.1.5-1');if(fail)throw Error('daemon failed');},steps:(version:string|null,client:string|null)=>[
  {id:'apt-refresh',command:process.execPath,args:['-e','const fs=require("node:fs");const file=process.argv.at(-1);fs.writeFileSync(file,JSON.stringify('+JSON.stringify(empty)+'));','--',file]},
  {id:'apt-install-docker',command:process.execPath,args:['-e','const fs=require("node:fs");const file=process.argv.at(-1);fs.writeFileSync(file,JSON.stringify({...JSON.parse(fs.readFileSync(file)),installed:'+JSON.stringify(version)+',client:'+JSON.stringify(client)+',binary:"/usr/bin/docker",occupied:true}));','--',file]},
 ]};
 try{
  await expect(installDockerEngine('candidate',target,{confirmed:false,path,provider})).rejects.toThrow('confirmation');expect(existsSync(path)).toBe(false);
  expect((await dockerEnginePreview('candidate',target,{path,provider})).action).toBe('awaiting-index');expect(existsSync(path)).toBe(false);
  expect((await installDockerEngine('candidate',target,{confirmed:true,path,provider})).status).toBe('succeeded');const store=new StateStore(path);try{expect(store.managed('docker')?.location).toBe('/apt/docker.io');}finally{store.close();}
  expect((await installDockerEngine('candidate',target,{confirmed:true,path,provider})).status).toBe('current');fail=true;await expect(dockerEnginePreview('candidate',target,{path,provider})).rejects.toThrow('daemon failed');
 }finally{rmSync(directory,{recursive:true,force:true});}
});
test('plataforma, versão inválida e cancelamento recusam antes de consultar fornecedor',async()=>{
 const provider={inspect:unexpected,sudo:unexpected,verify:unexpected,steps:()=>{throw Error('unexpected');}};
 await expect(dockerEnginePreview('candidate',{...target,system:'darwin'},{provider})).rejects.toThrow('Linux only');await expect(dockerEnginePreview('latest',target,{provider})).rejects.toThrow('explicit');const controller=new AbortController();controller.abort();expect((await installDockerEngine('candidate',target,{confirmed:true,provider,signal:controller.signal})).status).toBe('cancelled');
});
