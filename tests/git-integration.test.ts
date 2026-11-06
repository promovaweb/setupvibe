/** Homologa Git via APT em Debian descartável, sem APT ou alterações de Git no host. */
import {expect,test} from 'bun:test';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
(process.env.SETUPVIBE_GIT_INTEGRATION==='1'?test:test.skip)('Git via APT instala do zero, preserva perfil e reconhece instalação externa',()=>{
 const image=process.env.SETUPVIBE_GIT_IMAGE;if(!image)throw Error('Informe SETUPVIBE_GIT_IMAGE com a imagem Debian de teste.');
 const docker=(args:string[])=>{const result=Bun.spawnSync(['docker',...args],{stdout:'pipe',stderr:'pipe',timeout:240000});if(result.exitCode!==0)throw Error('Docker test command failed (exit '+result.exitCode+'): '+result.stderr.toString()+result.stdout.toString());return result.stdout.toString().trim();};
 const dir=mkdtempSync(join(homedir(),'setupvibe-git-apt-'));
 let container:string|null=null;
 try{
  // O verificador como PID 1 dispensa docker exec e seus arquivos temporários no daemon.
  container=docker(['create','--label','dev.setupvibe.test=git','--name','setupvibe-git-test-'+crypto.randomUUID(),image,'/usr/local/bin/test-bun','/root/verify.mjs']);
  docker(['cp',join(import.meta.dir,'../dist/setupvibe'),container+':/usr/local/bin/setupvibe']);
  docker(['cp',process.execPath,container+':/usr/local/bin/test-bun']);
  docker(['cp',join(import.meta.dir,'fixtures/git/verify.mjs'),container+':/root/verify.mjs']);
  const source=join(dir,'gitconfig');writeFileSync(source,'[user]\n name = Preserved Tester\n email = preserved@example.test\n',{mode:0o600});docker(['cp',source,container+':/root/.gitconfig']);
  const output=docker(['start','--attach',container]);
  expect(docker(['inspect','--format','{{.State.ExitCode}}',container])).toBe('0');
  const result=JSON.parse(output.split('\n').at(-1)!);
  expect(result.status).toBe('passed');expect(result.checks).toBe(14);expect(result.version).toBeString();
 }finally{if(container)docker(['rm','--force','--volumes',container]);rmSync(dir,{recursive:true,force:true});}
},300000);
