/** Confere coleta periódica real e parada sem instalar supervisores no host. */
import {expect,test}from 'bun:test';
import{mkdtempSync,rmSync,existsSync}from'node:fs';
import{join}from'node:path';
import{tmpdir}from'node:os';
import{collectHost}from'../src/core/collector';
import{MetricsStore}from'../src/core/metrics-store';
test('Docker lento não interrompe amostras do host e seu resultado é persistido',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'setupvibe-collector-docker-')),path=join(dir,'metrics.db'),controller=new AbortController();const timer=setTimeout(()=>controller.abort(),450);let queries=0;
 try{
  const count=await collectHost(path,{signal:controller.signal,intervalMs:100,containerMetrics:async()=>{queries++;await Bun.sleep(180);return{status:'available',sampledAt:new Date().toISOString(),containers:[{id:'a'.repeat(64),name:'app-test',cpuPercent:150,memoryUsed:1024,memoryLimit:2048,pids:2}]};}});
  expect(count).toBeGreaterThanOrEqual(4);expect(queries).toBe(1);const store=new MetricsStore(path);try{const samples=store.list();expect(samples[0]!.sample.docker?.status).toBe('loading');expect(samples.at(-1)!.sample.docker?.containers[0]?.cpuPercent).toBe(150);}finally{store.close();}
 }finally{clearTimeout(timer);controller.abort();rmSync(dir,{recursive:true,force:true});}
});
test("collector grava amostras e encerra ao receber cancelamento",async()=>{
 const dir=mkdtempSync(join(tmpdir(),'setupvibe-collector-')),path=join(dir,'metrics.db');const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),350);
 try{const count=await collectHost(path,{signal:controller.signal,intervalMs:100});expect(count).toBeGreaterThanOrEqual(2);const store=new MetricsStore(path);try{const samples=store.list();expect(samples.length).toBe(count);expect(samples[0]?.sample.cpuPercent).toBeNull();expect(samples[1]?.sample.cpuPercent).not.toBeNull();}finally{store.close();}}
 finally{clearTimeout(timer);controller.abort();rmSync(dir,{recursive:true,force:true});}
});
test('sinal já cancelado não cria banco',async()=>{const dir=mkdtempSync(join(tmpdir(),'setupvibe-collector-')),path=join(dir,'metrics.db');try{const c=new AbortController();c.abort();expect(await collectHost(path,{signal:c.signal})).toBe(0);expect(existsSync(path)).toBe(false);}finally{rmSync(dir,{recursive:true,force:true});}});
