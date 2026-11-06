/** Recusas sem escrita e integração opt-in com pacote oficial em diretório descartável. */
import {expect,test,spyOn} from 'bun:test';
import {mkdtempSync,rmSync,existsSync,writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {installCodex,codexPreview} from '../src/core/install-codex';
import {StateStore} from '../src/core/state';
const target={edition:'desktop' as const,system:'linux',arch:'x64'};
test("prévia Codex não cria estado e recusa instalação registrada missing",async()=>{
  const dir=mkdtempSync(join(homedir(),'setupvibe-codex-preview-')),path=join(dir,'state.db');
  try{
    expect((await codexPreview('0.166.0',target,{path,bun:process.execPath})).action).toBe('install');expect(existsSync(path)).toBe(false);
    const store=new StateStore(path,true);store.start('install');store.finish('install','succeeded');store.registerManaged({id:'codex',version:'0.165.0',location:join(dir,'codex'),operationId:'install'});store.close();
    await expect(codexPreview('0.166.0',target,{path,bun:process.execPath})).rejects.toThrow(new RegExp("missing or mismatched","i"));
  }finally{rmSync(dir,{recursive:true,force:true});}
});
test("Codex exige confirmação e version fixa antes de criar estado",async()=>{
  const dir=mkdtempSync(join(homedir(),'setupvibe-codex-')),path=join(dir,'state.db');
  try{
    await expect(installCodex('0.166.0',target,{confirmed:false,path})).rejects.toThrow(new RegExp("confirmation","i"));
    await expect(installCodex('latest',target,{confirmed:true,path})).rejects.toThrow(new RegExp("fixed","i"));expect(existsSync(path)).toBe(false);
  }finally{rmSync(dir,{recursive:true,force:true});}
});
(process.env.SETUPVIBE_CODEX_INTEGRATION==='1'?test:test.skip)("Codex oficial instala isolado e confirma version no launcher",async()=>{
  const dir=mkdtempSync(join(homedir(),'setupvibe-codex-real-')),path=join(dir,'state.db');
  try{
    const result=await installCodex('0.166.0',target,{confirmed:true,path,bun:Bun.which('bun')!,directory:join(dir,'apps')});
    expect(result.status).toBe('succeeded');expect(result.executable).not.toBeNull();
    expect(execFileSync(result.executable!,['--version'],{encoding:'utf8',timeout:10000}).trim()).toBe('codex-cli 0.166.0');
    const store=new StateStore(path);try{expect(store.managed('codex')?.location).toBe(result.executable!);}finally{store.close();}
    expect((await codexPreview('0.166.0',target,{path})).action).toBe('current');
    const current=await installCodex('0.166.0',target,{confirmed:true,path,directory:join(dir,'apps')});
    expect(current.status).toBe('current');expect(current.operationId).toBeNull();
    expect((await codexPreview('0.165.0',target,{path})).action).toBe('update');
    const updated=await installCodex('0.165.0',target,{confirmed:true,path,directory:join(dir,'apps')});
    expect(updated.status).toBe('succeeded');expect(updated.executable).not.toBe(result.executable);
    expect(execFileSync(updated.executable!,['--version'],{encoding:'utf8',timeout:10000}).trim()).toBe('codex-cli 0.165.0');
    expect(execFileSync(result.executable!,['--version'],{encoding:'utf8',timeout:10000}).trim()).toBe('codex-cli 0.166.0');
    const after=new StateStore(path);try{expect(after.managed('codex')?.location).toBe(updated.executable!);expect(after.list().length).toBe(2);}finally{after.close();}
    const brokenBun=join(dir,'bun-failure');writeFileSync(brokenBun,'#!'+process.execPath+'\nprocess.exit(1);\n',{mode:0o700});
    const failed=await installCodex('0.166.0',target,{confirmed:true,path,directory:join(dir,'apps'),bun:brokenBun});
    expect(failed.status).toBe('failed');
    const preserved=new StateStore(path);try{expect(preserved.managed('codex')?.location).toBe(updated.executable!);expect(preserved.list().length).toBe(3);}finally{preserved.close();}
    expect(execFileSync(updated.executable!,['--version'],{encoding:'utf8',timeout:10000}).trim()).toBe('codex-cli 0.165.0');
  }finally{rmSync(dir,{recursive:true,force:true});}
},120000);

/** A tolerância vale só para revisão; o instalador continua exigindo Bun disponível. */
test('prévia aguarda Bun selecionado sem criar estado nem autorizar instalação automática',async()=>{
 const dir=mkdtempSync(join(homedir(),'setupvibe-codex-planned-')),path=join(dir,'state.db');
 const which=spyOn(Bun,'which').mockReturnValue(null);
 try{
  await expect(codexPreview('0.166.0',target,{path})).rejects.toThrow('Bun executable');
  const preview=await codexPreview('0.166.0',target,{path,allowMissingBun:true});
  expect(preview.action).toBe('awaiting-dependencies');expect(preview.executed).toBe(false);
  await expect(installCodex('0.166.0',target,{path,confirmed:true})).rejects.toThrow('Bun executable');
  expect(existsSync(path)).toBe(false);
 }finally{which.mockRestore();rmSync(dir,{recursive:true,force:true});}
});
