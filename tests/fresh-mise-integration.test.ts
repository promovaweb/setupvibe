/** Integração opt-in com PATH sem mise e todos os diretórios do gerenciador isolados. */
import {expect,test} from 'bun:test';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {homedir} from 'node:os';
(process.env.SETUPVIBE_MISE_INTEGRATION==='1'?test:test.skip)('seleção instala mise e Bun em ambiente inicialmente sem gerenciador',async()=>{
 const dir=mkdtempSync(join(homedir(),'setupvibe-fresh-mise-'));
 const source=`import{uninstallSelection}from${JSON.stringify(join(import.meta.dir,'../src/core/uninstall-selection.ts'))};import{installSelection}from${JSON.stringify(join(import.meta.dir,'../src/core/install-selection.ts'))};import{StateStore}from${JSON.stringify(join(import.meta.dir,'../src/core/state.ts'))};import{statePath}from${JSON.stringify(join(import.meta.dir,'../src/core/history.ts'))};import{execFileSync}from'node:child_process';if(Bun.which('mise'))throw Error('PATH do teste contém mise');const result=await installSelection([{kind:'application',id:'mise',version:'2026.11.0'},{kind:'runtime',id:'bun',version:'1.3.14'}],{edition:'desktop',system:'linux',arch:'x64'},{confirmed:true});const store=new StateStore(statePath());try{const runtime=store.managed('bun');const report={result,manager:!!store.managed('mise'),bun:runtime?execFileSync(runtime.location+'/bin/bun',['--version'],{encoding:'utf8'}).trim():null};const removed=await uninstallSelection(['bun','mise'],{edition:'desktop',system:'linux',arch:'x64'},{confirmed:true});console.log(JSON.stringify({...report,removed,remaining:!!store.managed('bun')||!!store.managed('mise')}));}finally{store.close();}`;
 try{
  const child=Bun.spawn([process.execPath,'--eval',source],{env:{...process.env,PATH:'/usr/bin:/bin',SETUPVIBE_STATE_DIR:join(dir,'setupvibe'),MISE_DATA_DIR:join(dir,'data'),MISE_CONFIG_DIR:join(dir,'config'),MISE_CACHE_DIR:join(dir,'cache'),MISE_STATE_DIR:join(dir,'state'),MISE_GLOBAL_CONFIG_FILE:join(dir,'config/config.toml'),MISE_YES:'1'},stdout:'pipe',stderr:'pipe'});
  const [stdout,stderr,code]=await Promise.all([new Response(child.stdout).text(),new Response(child.stderr).text(),child.exited]);
  if(code!==0)throw Error('Integração sem mise falhou: '+stderr);
  const report=JSON.parse(stdout);expect(report.result.status).toBe('succeeded');expect(report.result.items.map((item:{status:string})=>item.status)).toEqual(['succeeded','succeeded']);expect(report.manager).toBe(true);expect(report.bun).toBe('1.3.14');expect(report.removed.status).toBe('succeeded');expect(report.remaining).toBe(false);
 }finally{rmSync(dir,{recursive:true,force:true});}
},180000);
