/** Instala engine real em systemd descartável, sem socket, volumes ou portas do host. */
import {expect,test} from 'bun:test';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
(process.env.SETUPVIBE_DOCKER_ENGINE_INTEGRATION==='1'?test:test.skip)('Docker APT instala, verifica daemon e preserva instalação externa',()=>{
 const image=process.env.SETUPVIBE_DOCKER_ENGINE_IMAGE;if(!image)throw Error('Provide SETUPVIBE_DOCKER_ENGINE_IMAGE.');
 const binary=process.env.SETUPVIBE_DOCKER_ENGINE_BINARY??join(import.meta.dir,'../dist/setupvibe'),directory=mkdtempSync(join(homedir(),'setupvibe-docker-engine-'));let container:string|undefined;
 const docker=(args:string[],timeout=30000)=>execFileSync('docker',args,{encoding:'utf8',timeout,maxBuffer:2097152}).trim();
 try{
  container=docker(['create','--privileged','--cgroupns','private','--tmpfs','/run','--tmpfs','/run/lock','--label','dev.setupvibe.test=docker-engine',image,'/bin/sh','-c','/usr/local/bin/test-bun /root/prepare.mjs && exec /sbin/init']);
  for(const [source,destination] of [[binary,'/usr/local/bin/setupvibe'],[process.execPath,'/usr/local/bin/test-bun'],[join(import.meta.dir,'fixtures/docker-engine/prepare.mjs'),'/root/prepare.mjs'],[join(import.meta.dir,'fixtures/docker-engine/verify.mjs'),'/root/verify.mjs']])docker(['cp',source!,container+':'+destination]);
  try{docker(['start','--attach',container],240000);}catch(error){if(docker(['inspect','--format','{{.State.Running}}',container])==='true')throw error;}docker(['cp',container+':/root/test-result.json',join(directory,'result.json')]);const result=JSON.parse(readFileSync(join(directory,'result.json'),'utf8'));if(result.status!=='passed')throw Error(JSON.stringify(result));expect(result.status).toBe('passed');expect(result.checks).toBeGreaterThanOrEqual(15);expect(result.version).toBeString();console.log('Docker engine checks: '+result.checks);
 }finally{if(container)docker(['rm','--force','--volumes',container]);rmSync(directory,{recursive:true,force:true});}
},300000);
