/** Executa a TUI compilada em contêiner sem Bun, fontes ou node_modules. */
import {expect,test} from 'bun:test';
import {execFileSync,spawn} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
(process.env.SETUPVIBE_DISTRIBUTION_INTEGRATION==='1'?test:test.skip)('artefato abre OpenTUI sem dependências do projeto e encerra pelo teclado',async()=>{
 const directory=process.env.SETUPVIBE_RELEASE_DIRECTORY,image=process.env.SETUPVIBE_DISTRIBUTION_IMAGE;
 if(!directory||!image)throw Error('Informe diretório de release e imagem Debian de teste.');
 const manifest=JSON.parse(readFileSync(join(directory,'release-manifest.json'),'utf8')),artifact=manifest.artifacts.find((item:{system:string;arch:string})=>item.system==='linux'&&item.arch===process.arch);
 if(!artifact)throw Error('Release sem artefato correspondente.');
 const file=join(directory,new URL(artifact.url).pathname.split('/').at(-1)!);
 expect(createHash('sha256').update(readFileSync(file)).digest('hex')).toBe(artifact.sha256);
 const docker=(args:string[])=>execFileSync('docker',args,{encoding:'utf8',timeout:30000}).trim();
 let container:string|null=null;
 try{
  container=docker(['create','--interactive','--tty','--network','none','--label','dev.setupvibe.test=distribution','--name','setupvibe-distribution-'+crypto.randomUUID(),'--env','TERM=xterm-256color','--env','SETUPVIBE_STATE_DIR=/root/test-state',image,'/usr/local/bin/setupvibe']);
  docker(['cp',file,container+':/usr/local/bin/setupvibe']);
  const output=await new Promise<{code:number|null;text:string}>((resolve,reject)=>{
   const child=spawn('docker',['start','--attach','--interactive',container!],{stdio:['pipe','pipe','pipe']});let text='',quit=false;
   const timeout=setTimeout(()=>{child.kill('SIGTERM');reject(Error('Standalone TUI did not exit. Output: '+text.slice(-4000)));},20000);
   const capture=(chunk:Buffer)=>{text+=chunk.toString();if(text.length>262144){child.kill('SIGTERM');clearTimeout(timeout);reject(Error('Unexpected TUI output volume.'));return;}if(!quit&&text.includes('Resources')){quit=true;setTimeout(()=>child.stdin.write('\x11'),250);}};
   child.stdout.on('data',capture);child.stderr.on('data',capture);child.stdin.on('error',()=>{});
   child.once('error',error=>{clearTimeout(timeout);reject(error);});child.once('close',code=>{clearTimeout(timeout);resolve({code,text});});
  });
  expect(output.text).toContain('SetupVibe');expect(output.text).toContain('Resources');expect(output.text).not.toContain('Cannot find module');expect(output.code).toBe(0);
  expect(docker(['inspect','--format','{{.State.ExitCode}}',container])).toBe('0');
 }finally{if(container)docker(['rm','--force','--volumes',container]);}
},60000);
