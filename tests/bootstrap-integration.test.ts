/** Homologa TLS, instalação, reexecução e falhas do bootstrap em Debian descartável. */
import {expect,test} from 'bun:test';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
(process.env.SETUPVIBE_BOOTSTRAP_INTEGRATION==='1'?test:test.skip)('bootstrap instala sem Bun no PATH, verifica TLS e preserva instalação após falhas',()=>{
 const release=process.env.SETUPVIBE_RELEASE_DIRECTORY,image=process.env.SETUPVIBE_BOOTSTRAP_IMAGE;
 if(!release||!image)throw Error('Informe diretório de release e imagem Debian de teste.');
 const dir=mkdtempSync(join(homedir(),'setupvibe-bootstrap-test-'));
 const docker=(args:string[])=>{const result=Bun.spawnSync(['docker',...args],{stdout:'pipe',stderr:'pipe',timeout:240000});if(result.exitCode!==0)throw Error('Docker test failed: '+result.stderr.toString()+result.stdout.toString());return result.stdout.toString().trim();};
 let container:string|null=null;
 try{
  const manifest=JSON.parse(readFileSync(join(release,'release-manifest.json'),'utf8')),artifact=manifest.artifacts.find((item:{system:string;arch:string})=>item.system==='linux'&&item.arch===process.arch);if(!artifact)throw Error('Release Linux ausente.');
  const file=join(release,new URL(artifact.url).pathname.split('/').at(-1)!);
  const local={version:manifest.version,artifacts:[{...artifact,url:'https://127.0.0.1:9443/'+new URL(artifact.url).pathname.split('/').at(-1)}]};
  const content=execFileSync('node',['--input-type=module','-e',"import{renderBootstrap}from'./scripts/bootstrap.mjs';process.stdout.write(renderBootstrap(JSON.parse(process.argv[1])));",JSON.stringify(local)],{cwd:join(import.meta.dir,'..'),encoding:'utf8'});writeFileSync(join(dir,'install.sh'),content,{mode:0o700});writeFileSync(join(dir,'manifest.json'),JSON.stringify(manifest));
  execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',join(dir,'key.pem'),'-out',join(dir,'cert.pem'),'-days','1','-subj','/CN=127.0.0.1','-addext','subjectAltName=IP:127.0.0.1'],{stdio:'ignore'});
  container=docker(['create','--label','dev.setupvibe.test=bootstrap','--name','setupvibe-bootstrap-'+crypto.randomUUID(),image,'/root/test-runtime','/root/verify.mjs']);
  for(const [source,name] of [[process.execPath,'test-runtime'],[file,'artifact'],[join(import.meta.dir,'fixtures/bootstrap/verify.mjs'),'verify.mjs'],...['install.sh','manifest.json','cert.pem','key.pem'].map(name=>[join(dir,name),name])])docker(['cp',source!,container+':/root/'+name]);
  const output=docker(['start','--attach',container]);expect(docker(['inspect','--format','{{.State.ExitCode}}',container])).toBe('0');const result=JSON.parse(output.split('\n').at(-1)!);expect(result.status).toBe('passed');expect(result.checks).toBeGreaterThanOrEqual(40);console.log('Bootstrap checks: '+result.checks);
 }finally{if(container)docker(['rm','--force','--volumes',container]);rmSync(dir,{recursive:true,force:true});}
},300000);
