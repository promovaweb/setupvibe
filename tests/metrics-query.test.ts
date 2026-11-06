/** Exercita a consulta pelo executável e confirma ausência sem efeitos persistentes. */
import {expect,test} from 'bun:test';
import {mkdtempSync,rmSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {MetricsStore} from '../src/core/metrics-store';
test("CLI read only amostras e respeita cursor",()=>{
 const dir=mkdtempSync(join(tmpdir(),'setupvibe-query-'));
 const run=(cursor:string[])=>Bun.spawnSync([process.execPath,'src/cli.ts','metrics',...cursor,'--json'],{cwd:import.meta.dir+'/..',env:{...process.env,SETUPVIBE_STATE_DIR:dir}});
 try{
  expect(JSON.parse(run([]).stdout.toString())).toEqual({samples:[],nextCursor:0});expect(existsSync(join(dir,'metrics.db'))).toBe(false);
  const store=new MetricsStore(join(dir,'metrics.db'),true);store.append({timestamp:new Date().toISOString(),cpuPercent:null,memoryTotal:100,memoryUsed:40,uptimeSeconds:1});store.close();
  const result=run([]);expect(result.exitCode).toBe(0);const body=JSON.parse(result.stdout.toString());expect(body.samples[0].sample.cpuPercent).toBeNull();expect(JSON.parse(run([String(body.nextCursor)]).stdout.toString()).samples).toEqual([]);expect(run(['-1']).exitCode).toBe(2);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test("última amostra distingue leitura newer e antiga",async()=>{
 const {latestMetrics}=await import('../src/core/metrics-query');const dir=mkdtempSync(join(tmpdir(),'setupvibe-latest-')),path=join(dir,'metrics.db');
 try{const now=Date.now();expect(latestMetrics(path,now)).toBeNull();const store=new MetricsStore(path,true);store.append({timestamp:new Date(now).toISOString(),cpuPercent:0,memoryTotal:100,memoryUsed:40,uptimeSeconds:1},now);store.close();expect(latestMetrics(path,now+1000)?.stale).toBe(false);expect(latestMetrics(path,now+16000)?.stale).toBe(true);expect(latestMetrics(path,now+16000)?.sample.cpuPercent).toBe(0);}
 finally{rmSync(dir,{recursive:true,force:true});}
});
