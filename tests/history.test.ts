/** Confere consulta ausente e leitura de operações reais em diretório temporário. */
import { expect, test } from 'bun:test';
import { mkdtempSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readHistory } from '../src/core/history';
import { StateStore } from '../src/core/state';
test("histórico missing permanece sem diretório", () => {
  const dir=mkdtempSync(join(tmpdir(),'setupvibe-history-'));
  try {expect(readHistory(join(dir,'absent','state.db'))).toEqual([]);expect(existsSync(join(dir,'absent'))).toBe(false);}finally{rmSync(dir,{recursive:true,force:true});}
});
test('CLI lê histórico persistido e não oculta corrupção', () => {
  const dir=mkdtempSync(join(tmpdir(),'setupvibe-history-')),path=join(dir,'state.db');
  try {
    const store=new StateStore(path,true);store.start('operation');store.finish('operation','succeeded');store.close();
    const result=Bun.spawnSync([process.execPath,'src/cli.ts','history','--json'],{cwd:import.meta.dir+'/..',env:{...process.env,SETUPVIBE_STATE_DIR:dir}});
    expect(result.exitCode).toBe(0);expect(JSON.parse(result.stdout.toString())[0].id).toBe('operation');
    writeFileSync(join(dir,'bad.db'),'invalid');expect(()=>readHistory(join(dir,'bad.db'))).toThrow();
  }finally{rmSync(dir,{recursive:true,force:true});}
});
test("CLI read only steps de uma operação pelo ID e recusa ID missing", () => {
  const dir=mkdtempSync(join(tmpdir(),'setupvibe-detail-'));
  try {
    const store=new StateStore(join(dir,'state.db'),true);store.start('example');store.startStep('example','download');store.finishStep('example','download','failed',7);store.finish('example','failed');store.close();
    const run=(id:string)=>Bun.spawnSync([process.execPath,'src/cli.ts','history',id,'--json'],{cwd:import.meta.dir+'/..',env:{...process.env,SETUPVIBE_STATE_DIR:dir}});
    const result=run('example');expect(result.exitCode).toBe(0);expect(JSON.parse(result.stdout.toString()).steps).toEqual([{id:'download',status:'failed',exit_code:7}]);expect(run('missing').exitCode).toBe(2);
  } finally {rmSync(dir,{recursive:true,force:true});}
});
test("CLI pagina histórico empty sem criar banco e recusa cursor invalid",()=>{
 const dir=mkdtempSync(join(tmpdir(),'setupvibe-page-cli-'));
 try{const run=(args:string[])=>Bun.spawnSync([process.execPath,'src/cli.ts','history-page',...args,'--json'],{cwd:import.meta.dir+'/..',env:{...process.env,SETUPVIBE_STATE_DIR:dir}});const result=run([]);expect(result.exitCode).toBe(0);expect(JSON.parse(result.stdout.toString())).toEqual({operations:[],nextCursor:null});expect(existsSync(join(dir,'state.db'))).toBe(false);expect(run(['bad!']).exitCode).toBe(2);}
 finally{rmSync(dir,{recursive:true,force:true});}
});
