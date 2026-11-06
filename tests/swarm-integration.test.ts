/** Integração opt-in: daemon descartável sem socket do host, rede externa ou portas publicadas. */
import {expect,test} from 'bun:test';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync,writeFileSync,existsSync,readFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {previewSwarmInit,initializeSwarm,discoverSwarm} from '../src/core/swarm';
import {StateStore} from '../src/core/state';
(process.env.SETUPVIBE_SWARM_INTEGRATION==='1'?test:test.skip)('Swarm real inicializa manager isolado e preserva identidade na reexecução',async()=>{
 const image=process.env.SETUPVIBE_DIND_IMAGE;
 if(!image||!/^docker@sha256:[a-f0-9]{64}$/.test(image))throw Error('Informe SETUPVIBE_DIND_IMAGE por digest.');
 const docker=(args:string[])=>execFileSync('docker',args,{encoding:'utf8',timeout:30000,stdio:['pipe','pipe','pipe']}).trim();
 const dir=mkdtempSync(join(homedir(),'setupvibe-swarm-real-')),path=join(dir,'state.db'),executable=join(dir,'docker');
 const name='setupvibe-swarm-test-'+crypto.randomUUID();let container:string|null=null;
 const hostBefore=docker(['info','--format','{{json .Swarm}}']);
 try{
  container=docker(['run','--detach','--privileged','--network','none','--name',name,'--label','dev.setupvibe.test=swarm','--env','DOCKER_TLS_CERTDIR=',image,'dockerd','--host=unix:///var/run/docker.sock','--storage-driver=vfs','--iptables=false','--bridge=none']);
  writeFileSync(executable,'#!'+process.execPath+'\n'+`const {spawnSync}=require('node:child_process');const result=spawnSync('docker',['exec',${JSON.stringify(container)},'docker',...process.argv.slice(2)],{stdio:'inherit'});process.exit(result.status??1);`,{mode:0o700});
  let ready=false;
  for(let attempt=0;attempt<60;attempt++){try{await discoverSwarm(executable);ready=true;break;}catch{await Bun.sleep(500);}}
  if(!ready)throw Error('Daemon Docker isolado não ficou disponível.');
  const target={edition:'server' as const,system:'linux',arch:'x64'};
  expect((await previewSwarmInit('127.0.0.1',target,{path,executable})).action).toBe('initialize');expect(existsSync(path)).toBe(false);
  const result=await initializeSwarm('127.0.0.1',target,{path,executable,confirmed:true});expect(result.status).toBe('succeeded');
  const status=await discoverSwarm(executable);expect(status.manager).toBe(true);expect(status.state).toBe('active');
  const store=new StateStore(path);try{expect(store.managed('swarm')?.version).toBe(status.clusterId!);expect(store.managed('swarm')?.location).toBe('/swarm-node/'+status.nodeId);}finally{store.close();}
  docker(['restart',container]);
  let restored=false;
  for(let attempt=0;attempt<60;attempt++){try{const after=await discoverSwarm(executable);if(after.state==='active'&&after.manager){expect(after.nodeId).toBe(status.nodeId);expect(after.clusterId).toBe(status.clusterId!);restored=true;break;}}catch{/* O daemon ainda pode estar iniciando. */}await Bun.sleep(500);}
  expect(restored).toBe(true);
  expect((await initializeSwarm('127.0.0.1',target,{path,executable,confirmed:true})).status).toBe('current');
  await expect(previewSwarmInit('127.0.0.1',target,{path:join(dir,'external.db'),executable})).rejects.toThrow('External Swarm');
  expect(readFileSync(path).includes(Buffer.from('SWMTKN-'))).toBe(false);
 }finally{
  if(container)docker(['rm','--force','--volumes',container]);
  rmSync(dir,{recursive:true,force:true});
  expect(docker(['info','--format','{{json .Swarm}}'])).toBe(hostBefore);
 }
},90000);
