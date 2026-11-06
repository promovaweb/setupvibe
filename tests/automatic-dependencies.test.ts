/** Integração opt-in do parâmetro público em ambiente sem Bun ou mise no PATH. */
import {expect,test} from 'bun:test';
import {mkdtempSync,rmSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {homedir} from 'node:os';
import {StateStore} from '../src/core/state';
(process.env.SETUPVIBE_DEPENDENCIES_INTEGRATION==='1'?test:test.skip)('Codex instala seus pré-requisitos com --install-dependencies',async()=>{
 const dir=mkdtempSync(join(homedir(),'setupvibe-dependencies-real-')),state=join(dir,'setupvibe'),path=join(state,'state.db');
 const env={...process.env,PATH:'/usr/bin:/bin',SETUPVIBE_STATE_DIR:state,MISE_DATA_DIR:join(dir,'data'),MISE_CONFIG_DIR:join(dir,'config'),MISE_CACHE_DIR:join(dir,'cache'),MISE_STATE_DIR:join(dir,'state'),MISE_GLOBAL_CONFIG_FILE:join(dir,'config/config.toml'),MISE_YES:'1'};
 const invocation=process.env.SETUPVIBE_TEST_BINARY?[process.env.SETUPVIBE_TEST_BINARY]:[process.execPath,join(import.meta.dir,'../src/cli.ts')];
 const run=async(args:string[])=>{const child=Bun.spawn([...invocation,...args],{env,stdout:'pipe',stderr:'pipe'});const [stdout,stderr,code]=await Promise.all([new Response(child.stdout).text(),new Response(child.stderr).text(),child.exited]);return{stdout,stderr,code};};
 try{
  const preview=await run(['preview-codex','0.166.0','--install-dependencies','--json']);expect(preview.code).toBe(0);expect(JSON.parse(preview.stdout).action).toBe('awaiting-dependencies');expect(existsSync(path)).toBe(false);
  const refused=await run(['install-codex','0.166.0','--install-dependencies','--json']);expect(refused.code).toBe(2);expect(existsSync(path)).toBe(false);
  const installed=await run(['install-codex','0.166.0','--install-dependencies','--confirm','--json']);if(installed.code!==0)throw Error('Instalação automática falhou: '+installed.stderr+' '+installed.stdout);
  expect(JSON.parse(installed.stdout).status).toBe('succeeded');
  const store=new StateStore(path);try{expect(store.managed('mise')).not.toBeNull();expect(store.managed('bun')).not.toBeNull();expect(store.managed('codex')).not.toBeNull();expect(store.list().length).toBe(3);}finally{store.close();}
 }finally{rmSync(dir,{recursive:true,force:true});}
},180000);
