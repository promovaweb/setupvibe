/** Exercita o coletor compilado quando o build local está disponível. */
import{expect,test}from'bun:test';
import{existsSync,mkdtempSync,rmSync}from'node:fs';
import{join}from'node:path';
import{tmpdir}from'node:os';
import{MetricsStore}from'../src/core/metrics-store';
const binary=join(import.meta.dir,"../dist/setupvibe-collector");
test.skipIf(!existsSync(binary))("collector compilado grava e encerra por SIGTERM",async()=>{
 const dir=mkdtempSync(join(tmpdir(),'setupvibe-compiled-'));const child=Bun.spawn([binary,'100'],{env:{...process.env,SETUPVIBE_STATE_DIR:dir},stdout:'ignore',stderr:'pipe'});
 try{for(let i=0;i<100&&!existsSync(join(dir,'metrics.db'));i++)await Bun.sleep(10);await Bun.sleep(250);child.kill('SIGTERM');expect(await child.exited).toBe(0);const store=new MetricsStore(join(dir,'metrics.db'));try{expect(store.list().length).toBeGreaterThanOrEqual(2);}finally{store.close();}}
 finally{child.kill();await child.exited;rmSync(dir,{recursive:true,force:true});}
});
