/** Cancela uma descoberta real simulada por processo, sem instalar runtime no computador. */
import {expect,test} from 'bun:test';
import {mkdtempSync,writeFileSync,existsSync,readFileSync,rmSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {installRuntime} from '../src/core/runtime-install';
test.each([false,true])('cancelar descoberta encerra processo (ignora SIGTERM: %s)',async(ignoreTerm)=>{
 const dir=mkdtempSync(join(homedir(),'setupvibe-runtime-cancel-')),path=join(dir,'state.db'),executable=join(dir,'mise'),pidFile=join(dir,'pid');const controller=new AbortController();
 writeFileSync(executable,'#!'+process.execPath+'\n'+`if(${ignoreTerm})process.on('SIGTERM',()=>{});require('node:fs').writeFileSync(${JSON.stringify(pidFile)},String(process.pid));setTimeout(()=>{},30000);`,{mode:0o700});
 const pending=installRuntime('bun','1.3.14',{edition:'desktop',system:'linux',arch:'x64'},{confirmed:true,path,executable,signal:controller.signal});
 try{
  for(let attempt=0;attempt<40&&!existsSync(pidFile);attempt++)await Bun.sleep(25);expect(existsSync(pidFile)).toBe(true);const pid=Number(readFileSync(pidFile,'utf8'));controller.abort();expect((await pending).status).toBe('cancelled');expect(existsSync(path)).toBe(false);expect(()=>process.kill(pid,0)).toThrow();
 }finally{controller.abort();await pending.catch(()=>{});rmSync(dir,{recursive:true,force:true});}
});
