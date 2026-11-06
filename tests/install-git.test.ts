/** Usa consultas e comandos simulados para não executar APT no host. */
import {expect,test} from 'bun:test';
import {mkdtempSync,rmSync,existsSync,writeFileSync,readFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {gitPreview,installGit} from '../src/core/install-git';
import {aptGitSteps,validGitPackageVersion,gitPackageIntegrityValid} from '../src/adapters/apt-git';
import {acquireCollectorLock} from '../src/core/collector-lock';
import {StateStore} from '../src/core/state';
const target={edition:'desktop' as const,system:'linux',arch:'x64'};
test('plano APT fixa pacote e preserva configuração sem remover outros pacotes',()=>{
 const steps=aptGitSteps('1:2.47.3-1',true);expect(steps[0]!.command).toBe('/usr/bin/sudo');expect(steps[1]!.args).toContain('git=1:2.47.3-1');expect(steps[1]!.args).toContain('--no-remove');expect(steps[1]!.args).toContain('Dpkg::Options::=--force-confold');expect(steps[1]!.args).toContain('ca-certificates');expect(steps[1]!.args).toContain('openssh-client');expect(validGitPackageVersion('--option')).toBe(false);
});
test.skipIf(process.platform!=='linux')('Git externo é preservado sem registro ou consulta de sudo',async()=>{
 const dir=mkdtempSync(join(homedir(),'setupvibe-git-external-')),path=join(dir,'state.db');
 const unexpected=async()=>{throw Error('unexpected');};
 const provider={inspect:async()=>({installed:'1:2.47.3-1',candidate:'1:2.47.4-1',binary:'/usr/bin/git'}),sudo:unexpected,verify:unexpected,steps:()=>{throw Error('unexpected');}};
 try{
  expect((await gitPreview('candidate',target,{path,provider})).action).toBe('external');
  expect((await installGit('candidate',target,{confirmed:true,path,provider})).status).toBe('external');expect(existsSync(path)).toBe(false);
  await expect(installGit('1:2.47.4-1',target,{confirmed:true,path,provider})).rejects.toThrow('External Git');expect(existsSync(path)).toBe(false);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test.skipIf(process.platform!=='linux')('instalação resolve candidato após refresh e registra somente após verificação',async()=>{
 const dir=mkdtempSync(join(homedir(),'setupvibe-git-install-')),path=join(dir,'state.db'),fixture=join(dir,'package.json');
 writeFileSync(fixture,JSON.stringify({installed:null,candidate:null,binary:null}));
 const provider={
  inspect:async()=>JSON.parse(readFileSync(fixture,'utf8')) as {installed:string|null;candidate:string|null;binary:string|null},
  sudo:async()=>false,
  verify:async(version:string)=>{expect(JSON.parse(readFileSync(fixture,'utf8')).installed).toBe(version);},
  steps:()=>[
   {id:'apt-refresh',command:process.execPath,args:['-e','const fs=require("node:fs");const p='+JSON.stringify(fixture)+';const data=JSON.parse(fs.readFileSync(p));data.candidate="1:2.47.3-1";fs.writeFileSync(p,JSON.stringify(data));']},
   {id:'apt-install-git',command:process.execPath,args:['-e','const fs=require("node:fs");const p='+JSON.stringify(fixture)+';const data=JSON.parse(fs.readFileSync(p));data.installed=process.argv.at(-1).slice(4);data.binary="/usr/bin/git";fs.writeFileSync(p,JSON.stringify(data));','--','git']},
  ],
 };
 try{
  await expect(installGit('candidate',target,{confirmed:false,path,provider})).rejects.toThrow('confirmation');
  expect((await gitPreview('candidate',target,{path,provider})).action).toBe('awaiting-index');expect(existsSync(path)).toBe(false);
  const result=await installGit('candidate',target,{confirmed:true,path,provider});expect(result.status).toBe('succeeded');expect(result.version).toBe('1:2.47.3-1');
  const store=new StateStore(path);try{expect(store.managed('git')?.location).toBe('/apt/git');}finally{store.close();}
  expect((await installGit('candidate',target,{confirmed:true,path,provider})).status).toBe('current');
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('verificação aceita somente documentação e traduções ausentes de imagens mínimas',()=>{
 expect(gitPackageIntegrityValid(0,'')).toBe(true);
 expect(gitPackageIntegrityValid(1,'missing     /usr/share/doc/git/README.md\nmissing     /usr/share/locale/pt_BR/LC_MESSAGES/git.mo\n')).toBe(true);
 for(const line of ['missing     /usr/bin/git','??5??????   /usr/bin/git','??5??????   /usr/share/doc/git/README.md','missing     /usr/share/doc/git/../../bin/git','missing     /usr/share/git-core/templates/hooks/pre-commit.sample'])expect(gitPackageIntegrityValid(1,line)).toBe(false);
 expect(gitPackageIntegrityValid(2,'')).toBe(false);
});

test.skipIf(process.platform!=='linux')('cancelamento durante nova consulta não executa APT nem registra propriedade',async()=>{
 const dir=mkdtempSync(join(homedir(),'setupvibe-git-cancel-')),path=join(dir,'state.db'),controller=new AbortController();let calls=0;
 const provider={inspect:async()=>{if(++calls===2){controller.abort();throw Error('query aborted');}return{installed:null,candidate:'1:2.47.3-1',binary:null};},sudo:async()=>false,verify:async()=>{throw Error('unexpected');},steps:()=>[{id:'apt-refresh',command:'unexpected',args:[]}]};
 try{
  expect((await installGit('candidate',target,{confirmed:true,path,provider,signal:controller.signal})).status).toBe('cancelled');
  const store=new StateStore(path);try{expect(store.managed('git')).toBeNull();}finally{store.close();}
  const release=acquireCollectorLock(path+'.system-packages-lock','test');release();
 }finally{rmSync(dir,{recursive:true,force:true});}
});
