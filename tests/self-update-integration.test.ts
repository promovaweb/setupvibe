/** Compila duas versões em cópia descartável e homologa o atualizador em Debian isolado. */
import {expect,test} from 'bun:test';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,cpSync,symlinkSync,readFileSync,writeFileSync,rmSync,mkdirSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
(process.env.SETUPVIBE_SELF_UPDATE_INTEGRATION==='1'?test:test.skip)('CLI compilada atualiza, preserva launcher Server e faz rollback sem rede',()=>{
 const image=process.env.SETUPVIBE_SELF_UPDATE_IMAGE;if(!image)throw Error('Informe uma imagem Debian para testar atualização.');
 const root=mkdtempSync(join(homedir(),'setupvibe-update-integration-')),project=join(root,'project'),source=join(import.meta.dir,'..');mkdirSync(project,{mode:0o700});
 const docker=(args:string[])=>{const result=Bun.spawnSync(['docker',...args],{stdout:'pipe',stderr:'pipe',timeout:240000});if(result.exitCode!==0)throw Error('Docker update test failed: '+result.stderr.toString()+result.stdout.toString());return result.stdout.toString().trim();};let container:string|null=null;
 try{
  for(const name of ['src','scripts'])cpSync(join(source,name),join(project,name),{recursive:true});symlinkSync(join(source,'node_modules'),join(project,'node_modules'),'dir');
  const pkg=JSON.parse(readFileSync(join(source,'package.json'),'utf8'));
  for(const [name,version] of [['old','2.0.0-test.old'],['new','2.0.0-test.new']]){writeFileSync(join(project,'package.json'),JSON.stringify({...pkg,version}));execFileSync('node',['scripts/build-release.mjs','--target','linux-x64','--output',join(root,name!)],{cwd:project,env:{...process.env,BUN_BINARY:process.execPath},timeout:180000,stdio:'pipe'});}
  execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',join(root,'key.pem'),'-out',join(root,'cert.pem'),'-days','1','-subj','/CN=github.com','-addext','subjectAltName=DNS:github.com'],{stdio:'ignore'});
  container=docker(['create','--label','dev.setupvibe.test=self-update','--name','setupvibe-self-update-'+crypto.randomUUID(),'--add-host','github.com:127.0.0.1',image,'/root/test-runtime','/root/verify.mjs']);
  for(const [file,destination] of [[process.execPath,'/root/test-runtime'],[join(import.meta.dir,'fixtures/self-update/verify.mjs'),'/root/verify.mjs'],...['old','new','key.pem','cert.pem'].map(name=>[join(root,name),'/root/'+name])])docker(['cp',file!,container+':'+destination]);
  const output=docker(['start','--attach',container]);expect(docker(['inspect','--format','{{.State.ExitCode}}',container])).toBe('0');const result=JSON.parse(output.split('\n').at(-1)!);expect(result.status).toBe('passed');expect(result.checks).toBeGreaterThanOrEqual(25);expect(result.oldVersion).not.toBe(result.newVersion);console.log('Self-update checks: '+result.checks);
 }finally{if(container)docker(['rm','--force','--volumes',container]);rmSync(root,{recursive:true,force:true});}
},360000);
