/** Testa retenção e cursores em SQLite real sem escrever no estado do host. */
import { expect,test } from 'bun:test';
import { mkdtempSync,rmSync,existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { MetricsStore } from '../src/core/metrics-store';
test("retenção de sete dias e cursor preservam ordem e CPU missing",()=>{
  const dir=mkdtempSync(join(tmpdir(),'setupvibe-metrics-')),path=join(dir,'metrics.db');const store=new MetricsStore(path,true);
  try{
    const now=Date.now(),sample={timestamp:new Date(now).toISOString(),cpuPercent:null,memoryTotal:100,memoryUsed:50,uptimeSeconds:2};
    store.append(sample,now);store.append({...sample,timestamp:new Date(now+1000).toISOString()},now+1000);
    const first=store.list(0,1,now+1000);expect(first).toHaveLength(1);expect(first[0]?.sample.cpuPercent).toBeNull();expect(store.list(first[0]!.id,100,now+1000)).toHaveLength(1);
    expect(store.list(0,100,now+8*86400000)).toHaveLength(0);
    expect(()=>store.append({...sample,cpuPercent:NaN},now)).toThrow(new RegExp("CPU","i"));
  }finally{store.close();rmSync(dir,{recursive:true,force:true});}
});
test("read only missing não cria diretório",()=>{const dir=mkdtempSync(join(tmpdir(),'setupvibe-metrics-'));try{expect(()=>new MetricsStore(join(dir,'absent','metrics.db'))).toThrow(new RegExp("missing","i"));expect(existsSync(join(dir,'absent'))).toBe(false);}finally{rmSync(dir,{recursive:true,force:true});}});
test('regressão do relógio não apresenta amostras futuras',()=>{
 const dir=mkdtempSync(join(tmpdir(),'setupvibe-clock-')),store=new MetricsStore(join(dir,'metrics.db'),true);
 try{const now=Date.now();store.append({timestamp:new Date(now).toISOString(),cpuPercent:10,memoryTotal:100,memoryUsed:30,uptimeSeconds:1},now);expect(store.latest(now-1000)).toBeNull();expect(store.list(0,100,now-1000)).toEqual([]);expect(store.latest(now)?.sample.cpuPercent).toBe(10);expect(store.list(0,100,now)).toHaveLength(1);}
 finally{store.close();rmSync(dir,{recursive:true,force:true});}
});
test('disco e swap inconsistentes não são persistidos',()=>{
 const dir=mkdtempSync(join(tmpdir(),'setupvibe-invalid-')),store=new MetricsStore(join(dir,'metrics.db'),true);
 try{const now=Date.now(),sample={timestamp:new Date(now).toISOString(),cpuPercent:null,memoryTotal:100,memoryUsed:50,uptimeSeconds:1};
 expect(()=>store.append({...sample,swap:{total:100,used:101}},now)).toThrow(new RegExp("Swap","i"));
 expect(()=>store.append({...sample,disk:{path:'/',total:100,available:101,used:0}},now)).toThrow(new RegExp("disk","i"));
 expect(()=>store.append({...sample,disk:{path:'/',total:100,available:10,used:NaN}},now)).toThrow(new RegExp("disk","i"));
 expect(store.list()).toEqual([]);store.append({...sample,swap:{total:0,used:0},disk:null},now);expect(store.list()).toHaveLength(1);
 }finally{store.close();rmSync(dir,{recursive:true,force:true});}
});
