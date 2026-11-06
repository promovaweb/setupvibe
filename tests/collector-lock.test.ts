/** Verifica concorrência e liberação de lock por fechamento da conexão. */
import {expect,test} from 'bun:test';
import {mkdtempSync,rmSync}from'node:fs';
import {join}from'node:path';
import {tmpdir}from'node:os';
import {acquireCollectorLock}from'../src/core/collector-lock';
test("segundo collector é recusado e fechamento permite retomada",()=>{
 const dir=mkdtempSync(join(tmpdir(),'setupvibe-lock-')),path=join(dir,'lock.db');let release=acquireCollectorLock(path);
 try{expect(()=>acquireCollectorLock(path)).toThrow(new RegExp("Another collector","i"));release();release();release=acquireCollectorLock(path);}
 finally{release();rmSync(dir,{recursive:true,force:true});}
});
test('queda de subprocesso libera lock SQLite',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'setupvibe-lock-')),path=join(dir,'lock.db');
 try{
 const source=`import {acquireCollectorLock} from './src/core/collector-lock'; acquireCollectorLock(${JSON.stringify(path)}); console.log('ready');setInterval(()=>{},1000);`;
 const child=Bun.spawn([process.execPath,'-e',source],{cwd:import.meta.dir+'/..',stdout:'pipe',stderr:'pipe'});
 try{const reader=child.stdout.getReader();const output=await reader.read();expect(new TextDecoder().decode(output.value)).toContain('ready');reader.releaseLock();expect(()=>acquireCollectorLock(path)).toThrow();child.kill('SIGKILL');await child.exited;const release=acquireCollectorLock(path);release();}
 finally{child.kill();await child.exited;}
 }finally{rmSync(dir,{recursive:true,force:true});}
});
