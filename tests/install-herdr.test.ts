/** Verifica artefatos e recusas locais; instalação oficial fica em teste opt-in isolado. */
import {expect,test} from 'bun:test';
import {mkdtempSync,rmSync,existsSync,readFileSync,writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {parseHerdrArtifact,createHerdrArtifactResolver} from '../src/core/herdr-artifact';
import {installHerdr,herdrPreview} from '../src/core/install-herdr';
import {uninstallResource} from '../src/core/uninstall-resource';
const target={edition:'desktop' as const,system:'linux',arch:'x64'};
test('artefato Herdr exige identidade, digest e plataforma exatos',()=>{
 const name='herdr-linux-x86_64',asset={name,size:100,digest:'sha256:'+'a'.repeat(64),browser_download_url:'https://github.com/herdrdev/herdr/releases/download/v0.9.5/'+name},release={tag_name:'v0.9.5',assets:[asset]};
 expect(parseHerdrArtifact(release,'0.9.5',target).url).toBe(asset.browser_download_url);
 expect(parseHerdrArtifact({tag_name:'v0.9.5',assets:[{...asset,name:'herdr-macos-aarch64',browser_download_url:'https://github.com/herdrdev/herdr/releases/download/v0.9.5/herdr-macos-aarch64'}]},'0.9.5',{edition:'desktop',system:'darwin',arch:'arm64'}).sha256).toBe('a'.repeat(64));
 for(const change of [{digest:null},{browser_download_url:'https://external.test/file'},{name:'wrong'},{size:0}])expect(()=>parseHerdrArtifact({...release,assets:[{...asset,...change}]},'0.9.5',target)).toThrow();
 expect(()=>parseHerdrArtifact({...release,assets:[asset,asset]},'0.9.5',target)).toThrow();
 expect(()=>parseHerdrArtifact(release,'0.9.5',{edition:'desktop',system:'windows',arch:'x64'})).toThrow();
});
test('Herdr exige confirmação antes de criar estado',async()=>{
 const dir=mkdtempSync(join(homedir(),'setupvibe-herdr-confirm-')),path=join(dir,'state.db');
 try{await expect(installHerdr('0.9.5',target,{confirmed:false,path})).rejects.toThrow('confirmation');expect(existsSync(path)).toBe(false);}finally{rmSync(dir,{recursive:true,force:true});}
});
test('metadados Herdr reutilizam consulta na execução e distinguem limite da API',async()=>{
 let calls=0;
 const name='herdr-linux-x86_64';
 const resolver=createHerdrArtifactResolver(async()=>{calls++;return Response.json({tag_name:'v0.9.5',assets:[{name,size:100,digest:'sha256:'+'a'.repeat(64),browser_download_url:'https://github.com/herdrdev/herdr/releases/download/v0.9.5/'+name}]});});
 expect((await resolver('0.9.5',target)).size).toBe(100);expect((await resolver('0.9.5',target)).size).toBe(100);expect(calls).toBe(1);
 const limited=createHerdrArtifactResolver(async()=>new Response('',{status:403,headers:{'x-ratelimit-remaining':'0'}}));await expect(limited('0.9.5',target)).rejects.toThrow('rate limit');
});
test('CLI recusa Herdr sem confirmação e no Server antes de consultar a rede',()=>{
 const run=(args:string[])=>Bun.spawnSync([process.execPath,'src/cli.ts',...args,'--json'],{cwd:import.meta.dir+'/..'});
 const refused=run(['install-herdr','0.9.5']);expect(refused.exitCode).toBe(2);expect(JSON.parse(refused.stderr.toString()).error.message).toContain('confirmation');
 const server=run(['--server','preview-herdr','0.9.5']);expect(server.exitCode).toBe(2);expect(JSON.parse(server.stderr.toString()).error.message).toContain('Desktop only');
});
(process.env.SETUPVIBE_HERDR_INTEGRATION==='1'?test:test.skip)('Herdr oficial instala, atualiza, verifica e arquiva somente o binário próprio',async()=>{
 const dir=mkdtempSync(join(homedir(),'setupvibe-herdr-real-')),path=join(dir,'state.db'),directory=join(dir,'applications');
 const run=(file:string)=>execFileSync(file,['--version'],{encoding:'utf8',timeout:10000,env:{...process.env,HOME:dir}}).trim();
 try{
  expect((await herdrPreview('0.9.5',target,{path})).action).toBe('install');expect(existsSync(path)).toBe(false);
  const first=await installHerdr('0.9.5',target,{confirmed:true,path,directory});expect(first.status).toBe('succeeded');expect(run(first.executable!)).toBe('herdr 0.9.5');
  expect((await installHerdr('0.9.5',target,{confirmed:true,path,directory})).status).toBe('current');
  const next=await installHerdr('0.9.4',target,{confirmed:true,path,directory});expect(next.status).toBe('succeeded');expect(run(next.executable!)).toBe('herdr 0.9.4');expect(run(first.executable!)).toBe('herdr 0.9.5');
  const bytes=readFileSync(next.executable!);writeFileSync(next.executable!,Buffer.from('modified'));await expect(herdrPreview('0.9.5',target,{path})).rejects.toThrow('missing or mismatched');writeFileSync(next.executable!,bytes);
  expect((await uninstallResource('herdr',target,{confirmed:true,path})).status).toBe('succeeded');expect(existsSync(next.executable!)).toBe(false);expect(existsSync(first.executable!)).toBe(true);
 }finally{rmSync(dir,{recursive:true,force:true});}
},180000);
