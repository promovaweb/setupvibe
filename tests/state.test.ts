/** Usa bancos temporários reais para testar concorrência e preservação dos resultados. */
import { expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StateStore } from '../src/core/state';
test("read only missing não cria banco nem diretório", () => {
  const dir = mkdtempSync(join(tmpdir(), 'setupvibe-state-'));
  try { const path = join(dir, 'absent', 'state.db'); expect(() => new StateStore(path)).toThrow(new RegExp("does not exist","i")); expect(existsSync(join(dir,'absent'))).toBe(false); }
  finally { rmSync(dir,{recursive:true,force:true}); }
});
test('conexões concorrentes recusam segunda operação e preservam resultado terminal', () => {
  const dir = mkdtempSync(join(tmpdir(), 'setupvibe-state-')); const path = join(dir,'state.db');
  const first = new StateStore(path,true), second = new StateStore(path,true);
  try {
    first.start('a'); expect(() => second.start('b')).toThrow();
    first.finish('a','interrupted'); second.start('b'); second.finish('b','succeeded');
    expect(() => first.finish('a','succeeded')).toThrow(new RegExp("finished","i"));
    expect(first.list().find(item=>item.id==='a')?.status).toBe('interrupted');
    expect(statSync(path).mode & 0o777).toBe(0o600);
    const reader = new StateStore(path); try { expect(reader.list()).toHaveLength(2); expect(()=>reader.start('c')).toThrow(new RegExp("read only","i")); } finally {reader.close();}
  } finally {first.close();second.close();rmSync(dir,{recursive:true,force:true});}
});
test('recusa schema futuro sem rebaixá-lo', () => {
  const dir=mkdtempSync(join(tmpdir(),'setupvibe-state-')),path=join(dir,'state.db');
  try {const db=new Database(path);db.exec('PRAGMA user_version=99');db.close();expect(()=>new StateStore(path,true)).toThrow(new RegExp("newer","i"));const check=new Database(path);expect(check.query('PRAGMA user_version').get()).toEqual({user_version:99});check.close();}
  finally {rmSync(dir,{recursive:true,force:true});}
});
test('operação não conclui com etapa ativa e falha encerra etapa atomicamente',()=>{
 const dir=mkdtempSync(join(tmpdir(),'setupvibe-terminal-'));const store=new StateStore(join(dir,'state.db'),true);
 try{store.start('a');store.startStep('a','step');expect(()=>store.finish('a','succeeded')).toThrow(new RegExp("steps","i"));expect(store.get('a')?.status).toBe('running');store.finish('a','failed');expect(store.steps('a')).toEqual([{id:'step',status:'failed',exit_code:null}]);expect(store.get('a')?.status).toBe('failed');}
 finally{store.close();rmSync(dir,{recursive:true,force:true});}
});
test('migração do schema 1 preserva operações anteriores',()=>{
 const dir=mkdtempSync(join(tmpdir(),'setupvibe-migrate-')),path=join(dir,'state.db');
 try{const old=new Database(path);old.exec("CREATE TABLE operations(id TEXT PRIMARY KEY,status TEXT,started_at TEXT,finished_at TEXT); INSERT INTO operations VALUES('old','succeeded','2026-01-01',NULL); PRAGMA user_version=1");old.close();const store=new StateStore(path,true);try{expect(store.get('old')?.status).toBe('succeeded');expect(store.steps('old')).toEqual([]);store.start('new');store.startStep('new','step');store.finishStep('new','step','succeeded',0);store.finish('new','succeeded');}finally{store.close();}}
 finally{rmSync(dir,{recursive:true,force:true});}
});
test('backup inclui WAL e preserva destino existente',()=>{
 const dir=mkdtempSync(join(tmpdir(),'setupvibe-backup-')),path=join(dir,'state.db'),backup=join(dir,'backup.db');const store=new StateStore(path,true);
 try{store.start('a');store.startStep('a','step');store.finishStep('a','step','succeeded',0);store.finish('a','succeeded');store.backup(backup);const reader=new StateStore(backup);try{expect(reader.get('a')?.status).toBe('succeeded');expect(reader.steps('a')).toEqual([{id:'step',status:'succeeded',exit_code:0}]);}finally{reader.close();}expect(()=>store.backup(backup)).toThrow();expect(statSync(backup).mode&0o777).toBe(0o600);}
 finally{store.close();rmSync(dir,{recursive:true,force:true});}
});
test('paginação do histórico não repete registros',()=>{
 const dir=mkdtempSync(join(tmpdir(),'setupvibe-page-')),store=new StateStore(join(dir,'state.db'),true);
 try{for(const id of ['a','b','c']){store.start(id);store.finish(id,'succeeded');}const seen:string[]=[];let cursor:string|undefined;do{const page=store.page(1,cursor);seen.push(...page.operations.map(item=>item.id));cursor=page.nextCursor??undefined;}while(cursor);expect(new Set(seen).size).toBe(3);expect(seen).toHaveLength(3);expect(()=>store.page(1,'bad!')).toThrow(new RegExp("Cursor","i"));}
 finally{store.close();rmSync(dir,{recursive:true,force:true});}
});
test("ownership exige successful e não sobrescreve registro existente",()=>{
 const dir=mkdtempSync(join(tmpdir(),'setupvibe-owner-')),store=new StateStore(join(dir,'state.db'),true);
 try{expect(store.managed('node')).toBeNull();store.start('install');const component={id:'node',version:'24.1.0',location:'/managed/node/24.1.0',operationId:'install'};expect(()=>store.registerManaged(component)).toThrow(new RegExp("successful","i"));store.finish('install','succeeded');store.registerManaged(component);expect(store.managed('node')?.location).toBe(component.location);expect(()=>store.registerManaged({...component,location:"/external/node"})).toThrow();expect(store.managed('node')?.location).toBe(component.location);}
 finally{store.close();rmSync(dir,{recursive:true,force:true});}
});
test("atualização de ownership compara registro anterior e exige successful",()=>{
 const dir=mkdtempSync(join(tmpdir(),'setupvibe-owner-update-')),store=new StateStore(join(dir,'state.db'),true);
 try{store.start('install');store.finish('install','succeeded');store.registerManaged({id:'node',version:'22.1.0',location:'/managed/22',operationId:'install'});store.start('update');const next={id:'node',version:'24.1.0',location:'/managed/24',operationId:'update'};const previous={version:'22.1.0',location:'/managed/22'};expect(()=>store.updateManaged(next,previous)).toThrow(new RegExp("successful","i"));store.finish('update','succeeded');store.updateManaged(next,previous);expect(store.managed('node')?.version).toBe('24.1.0');expect(()=>store.updateManaged({...next,version:'25.0.0'},previous)).toThrow(new RegExp("changed","i"));expect(store.managed('node')?.version).toBe('24.1.0');}
 finally{store.close();rmSync(dir,{recursive:true,force:true});}
});
test("ownership de múltiplos recursos não fica parcialmente gravada",()=>{
 const dir=mkdtempSync(join(tmpdir(),'setupvibe-owner-atomic-')),store=new StateStore(join(dir,'state.db'),true);
 try{store.start('install');store.finish('install','succeeded');const base={version:'1',operationId:'install'};store.registerManaged({id:'existing',location:"/external",...base});expect(()=>store.registerManagedMany([{id:'new',location:'/managed',...base},{id:'existing',location:'/overwrite',...base}])).toThrow();expect(store.managed('new')).toBeNull();expect(store.managed('existing')?.location).toBe("/external");store.registerManagedMany([{id:'service',location:'/docker/id',...base},{id:'volume',location:'/docker-volume/name',...base}]);expect(store.managed('service')).not.toBeNull();expect(store.managed('volume')).not.toBeNull();}
 finally{store.close();rmSync(dir,{recursive:true,force:true});}
});
