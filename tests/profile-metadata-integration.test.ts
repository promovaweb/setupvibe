/** Homologa preservação de ACL/xattr em Debian, sem instalar pacotes no host. */
import {expect,test} from 'bun:test';
import {join} from 'node:path';
(process.env.SETUPVIBE_PROFILE_METADATA_INTEGRATION==='1'?test:test.skip)('ACL/xattr sobrevivem à remoção de PATH como root e usuário comum',()=>{
 const image=process.env.SETUPVIBE_PROFILE_METADATA_IMAGE,artifact=process.env.SETUPVIBE_PROFILE_METADATA_BINARY;
 if(!image||!artifact)throw Error('Informe imagem Debian e binário compilado para o teste de metadados.');
 const docker=(args:string[])=>{const result=Bun.spawnSync(['docker',...args],{stdout:'pipe',stderr:'pipe',timeout:240000});if(result.exitCode!==0)throw Error('Docker metadata test failed: '+result.stderr.toString()+result.stdout.toString());return result.stdout.toString().trim();};let container:string|null=null;
 try{
  container=docker(['create','--label','dev.setupvibe.test=profile-metadata','--name','setupvibe-profile-metadata-'+crypto.randomUUID(),image,'/root/test-runtime','/root/verify.mjs']);
  for(const [source,destination] of [[process.execPath,'/root/test-runtime'],[artifact,'/usr/local/bin/setupvibe'],[join(import.meta.dir,'fixtures/profile-metadata/verify.mjs'),'/root/verify.mjs']])docker(['cp',source!,container+':'+destination]);
  const output=docker(['start','--attach',container]);expect(docker(['inspect','--format','{{.State.ExitCode}}',container])).toBe('0');const result=JSON.parse(output.split('\n').at(-1)!);expect(result.status).toBe('passed');expect(result.checks).toBe(16);console.log('Metadata checks: '+result.checks);
 }finally{if(container)docker(['rm','--force','--volumes',container]);}
},300000);
