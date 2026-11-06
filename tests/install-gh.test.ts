/** Verifica artefatos e recusas locais; instalação oficial fica em teste opt-in isolado. */
import {expect,test} from 'bun:test';
import {mkdtempSync,rmSync,existsSync,readFileSync,writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {parseGhArtifact} from '../src/core/gh-artifact';
import {installGh,ghPreview} from '../src/core/install-gh';
import {uninstallResource} from '../src/core/uninstall-resource';
const target={edition:'server' as const,system:'linux',arch:'x64'};
test('artefato GitHub CLI exige identidade, digest e plataforma exatos',()=>{
 const name='gh_2.103.3_linux_amd64.tar.gz',asset={name,size:100,digest:'sha256:'+'a'.repeat(64),browser_download_url:'https://github.com/cli/cli/releases/download/v2.103.3/'+name},release={tag_name:'v2.103.3',assets:[asset]};
 expect(parseGhArtifact(release,'2.103.3',target).entry).toBe('gh_2.103.3_linux_amd64/bin/gh');
 for(const change of [{digest:null},{browser_download_url:'https://external.test/file'},{name:'wrong'},{size:0}])expect(()=>parseGhArtifact({...release,assets:[{...asset,...change}]},'2.103.3',target)).toThrow();
 expect(()=>parseGhArtifact({...release,assets:[asset,asset]},'2.103.3',target)).toThrow();
});
test('GitHub CLI exige confirmação antes de criar estado',async()=>{
 const dir=mkdtempSync(join(homedir(),'setupvibe-gh-confirm-')),path=join(dir,'state.db');
 try{await expect(installGh('2.103.3',target,{confirmed:false,path})).rejects.toThrow('confirmation');expect(existsSync(path)).toBe(false);}finally{rmSync(dir,{recursive:true,force:true});}
});
(process.env.SETUPVIBE_GH_INTEGRATION==='1'?test:test.skip)('GitHub CLI oficial instala, atualiza, verifica e arquiva somente o binário próprio',async()=>{
 const dir=mkdtempSync(join(homedir(),'setupvibe-gh-real-')),path=join(dir,'state.db'),directory=join(dir,'applications');
 const run=(file:string)=>execFileSync(file,['--version'],{encoding:'utf8',timeout:10000}).split('\n')[0]!;
 try{
  expect((await ghPreview('2.103.3',target,{path})).action).toBe('install');expect(existsSync(path)).toBe(false);
  const first=await installGh('2.103.3',target,{confirmed:true,path,directory});expect(first.status).toBe('succeeded');expect(run(first.executable!)).toContain('gh version 2.103.3');
  expect((await installGh('2.103.3',target,{confirmed:true,path,directory})).status).toBe('current');
  const next=await installGh('2.103.2',target,{confirmed:true,path,directory});expect(next.status).toBe('succeeded');expect(run(next.executable!)).toContain('gh version 2.103.2');expect(run(first.executable!)).toContain('gh version 2.103.3');
  const bytes=readFileSync(next.executable!);writeFileSync(next.executable!,Buffer.from('modified'));await expect(ghPreview('2.103.3',target,{path})).rejects.toThrow('missing or mismatched');writeFileSync(next.executable!,bytes);
  expect((await uninstallResource('gh',target,{confirmed:true,path})).status).toBe('succeeded');expect(existsSync(next.executable!)).toBe(false);expect(existsSync(first.executable!)).toBe(true);
 }finally{rmSync(dir,{recursive:true,force:true});}
},120000);

(process.env.SETUPVIBE_GH_INTEGRATION==='1'?test:test.skip)('CLI compilada instala e remove GitHub CLI com estado isolado',()=>{
 const dir=mkdtempSync(join(homedir(),'setupvibe-gh-cli-')),binary=join(import.meta.dir,'../dist/setupvibe');
 const env={...process.env,SETUPVIBE_STATE_DIR:dir};
 const cli=(args:string[])=>JSON.parse(execFileSync(binary,[...args,'--server','--json'],{encoding:'utf8',timeout:120000,env}));
 try{
  const result=cli(['install-gh','2.103.3','--confirm']);expect(result.status).toBe('succeeded');expect(execFileSync(result.executable,['--version'],{encoding:'utf8',timeout:10000})).toContain('gh version 2.103.3');expect(cli(['uninstall','gh','--confirm']).status).toBe('succeeded');
 }finally{rmSync(dir,{recursive:true,force:true});}
},120000);

test('metadados reutilizam consulta na execução e distinguem limite da API',async()=>{
 const {createGhArtifactResolver}=await import('../src/core/gh-artifact');let calls=0;
 const name='gh_2.103.3_linux_amd64.tar.gz';
 const resolver=createGhArtifactResolver(async()=>{calls++;return Response.json({tag_name:'v2.103.3',assets:[{name,size:100,digest:'sha256:'+'a'.repeat(64),browser_download_url:'https://github.com/cli/cli/releases/download/v2.103.3/'+name}]});});
 expect((await resolver('2.103.3',target)).size).toBe(100);expect((await resolver('2.103.3',target)).size).toBe(100);expect(calls).toBe(1);
 const limited=createGhArtifactResolver(async()=>new Response('',{status:403,headers:{'x-ratelimit-remaining':'0'}}));await expect(limited('2.103.3',target)).rejects.toThrow('rate limit');
});
