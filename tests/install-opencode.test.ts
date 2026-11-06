/** Confere origem e versão; testes reais usam diretórios descartáveis e execução opt-in. */
import {expect,test} from 'bun:test';
import {mkdtempSync,rmSync,existsSync,openSync,readSync,writeSync,closeSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {uninstallResource} from '../src/core/uninstall-resource';
import {parseOpenCodeArtifact} from '../src/core/opencode-artifact';
import {installOpenCode,openCodePreview} from '../src/core/install-opencode';
const target={edition:'desktop' as const,system:'linux',arch:'x64'};
test('OpenCode seleciona pacote baseline x64 e recusa origem ou digest divergentes',()=>{
 const name='opencode-linux-x64-baseline.tar.gz',asset={name,size:100,digest:'sha256:'+'a'.repeat(64),browser_download_url:'https://github.com/anomalyco/opencode/releases/download/v1.19.5/'+name},release={tag_name:'v1.19.5',assets:[asset]};
 expect(parseOpenCodeArtifact(release,'1.19.5',target).entry).toBe('opencode');
 for(const override of [{digest:null},{name:'opencode-linux-x64.tar.gz'},{browser_download_url:'https://external.test/file'},{size:0}])expect(()=>parseOpenCodeArtifact({...release,assets:[{...asset,...override}]},'1.19.5',target)).toThrow();
});
test('OpenCode exige confirmação antes de criar estado',async()=>{
 const dir=mkdtempSync(join(homedir(),'setupvibe-opencode-confirm-')),path=join(dir,'state.db');
 try{await expect(installOpenCode('1.19.5',target,{confirmed:false,path})).rejects.toThrow('confirmation');expect(existsSync(path)).toBe(false);}finally{rmSync(dir,{recursive:true,force:true});}
});
(process.env.SETUPVIBE_OPENCODE_INTEGRATION==='1'?test:test.skip)('OpenCode oficial instala, verifica, troca versão e remove somente o binário registrado',async()=>{
 const dir=mkdtempSync(join(homedir(),'setupvibe-opencode-real-')),path=join(dir,'state.db');
 try{
  expect((await openCodePreview('1.19.5',target,{path})).action).toBe('install');expect(existsSync(path)).toBe(false);
  const result=await installOpenCode('1.19.5',target,{confirmed:true,path,directory:join(dir,'applications')});expect(result.status).toBe('succeeded');
  expect(execFileSync(result.executable!,['--version'],{encoding:'utf8',timeout:10000,env:{...process.env,XDG_CONFIG_HOME:join(dir,'config'),XDG_DATA_HOME:join(dir,'data'),XDG_STATE_HOME:join(dir,'state'),XDG_CACHE_HOME:join(dir,'cache')}}).trim()).toBe('1.19.5');
  expect((await installOpenCode('1.19.5',target,{confirmed:true,path,directory:join(dir,'applications')})).status).toBe('current');
  const handle=openSync(result.executable!,'r+'),byte=Buffer.alloc(1);readSync(handle,byte,0,1,0);const original=byte[0]!;byte[0]=original^1;writeSync(handle,byte,0,1,0);
  await expect(openCodePreview('1.19.5',target,{path})).rejects.toThrow('missing or mismatched');byte[0]=original;writeSync(handle,byte,0,1,0);closeSync(handle);
  const next=await installOpenCode('1.19.4',target,{confirmed:true,path,directory:join(dir,'applications')});expect(next.status).toBe('succeeded');expect(next.executable).not.toBe(result.executable);
  expect((await uninstallResource('opencode',target,{confirmed:true,path})).status).toBe('succeeded');expect(existsSync(next.executable!)).toBe(false);expect(existsSync(result.executable!)).toBe(true);
 }finally{rmSync(dir,{recursive:true,force:true});}
},180000);

(process.env.SETUPVIBE_OPENCODE_INTEGRATION==='1'?test:test.skip)('CLI compilada instala e remove OpenCode com estado isolado',()=>{
 const dir=mkdtempSync(join(homedir(),'setupvibe-opencode-cli-')),binary=join(import.meta.dir,'../dist/setupvibe');
 const env={...process.env,SETUPVIBE_STATE_DIR:join(dir,'managed'),XDG_CONFIG_HOME:join(dir,'config'),XDG_DATA_HOME:join(dir,'data'),XDG_STATE_HOME:join(dir,'state'),XDG_CACHE_HOME:join(dir,'cache'),OPENCODE_DISABLE_AUTOUPDATE:'true'};
 const cli=(args:string[])=>JSON.parse(execFileSync(binary,[...args,'--json'],{encoding:'utf8',timeout:180000,env}));
 try{const result=cli(['install-opencode','1.19.5','--confirm']);expect(result.status).toBe('succeeded');expect(execFileSync(result.executable,['--version'],{encoding:'utf8',timeout:10000,env}).trim()).toBe('1.19.5');expect(cli(['uninstall','opencode','--confirm']).status).toBe('succeeded');}
 finally{rmSync(dir,{recursive:true,force:true});}
},180000);
