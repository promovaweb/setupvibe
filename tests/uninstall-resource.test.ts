/** Verifica remoção de propriedade e preservação dos arquivos de aplicativos em arquivo privado. */
import {expect,test} from 'bun:test';
import {mkdtempSync,mkdirSync,writeFileSync,existsSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {StateStore} from '../src/core/state';
import {uninstallResource,previewUninstall} from '../src/core/uninstall-resource';
const target={edition:'desktop' as const,system:'linux',arch:'x64'};
test('desinstalação exige confirmação e não adota recurso externo',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'setupvibe-uninstall-')),path=join(dir,'state.db');
 try{await expect(uninstallResource('codex',target,{confirmed:false,path})).rejects.toThrow('confirmation');expect(existsSync(path)).toBe(false);await expect(previewUninstall('codex',target,{path})).rejects.toThrow('not managed');expect(existsSync(path)).toBe(false);}finally{rmSync(dir,{recursive:true,force:true});}
});
test('aplicativo registrado é arquivado e perde somente seu vínculo de propriedade',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'setupvibe-uninstall-app-')),path=join(dir,'state.db'),app=join(dir,'codex-0.166.0-test'),executable=join(app,'codex');mkdirSync(app,{mode:0o700});writeFileSync(executable,'managed',{mode:0o700});
 const store=new StateStore(path,true);store.start('install');store.finish('install','succeeded');store.registerManaged({id:'codex',version:'0.166.0',location:executable,operationId:'install'});store.close();
 try{
  const result=await uninstallResource('codex',target,{confirmed:true,path});expect(result.status).toBe('succeeded');expect(existsSync(executable)).toBe(false);expect(existsSync(join(result.archived!,'codex'))).toBe(true);
  const after=new StateStore(path);try{expect(after.managed('codex')).toBeNull();expect(after.get(result.id)?.status).toBe('succeeded');expect(after.get('install')?.status).toBe('succeeded');}finally{after.close();}
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('mise não pode ser removido enquanto um runtime registrado depender dele',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'setupvibe-uninstall-dependency-')),path=join(dir,'state.db'),store=new StateStore(path,true);store.start('install');store.finish('install','succeeded');for(const id of ['mise','bun'])store.registerManaged({id,version:'1.0.0',location:'/managed/'+id,operationId:'install'});store.close();
 try{await expect(previewUninstall('mise',target,{path})).rejects.toThrow('dependent resources');}finally{rmSync(dir,{recursive:true,force:true});}
});
