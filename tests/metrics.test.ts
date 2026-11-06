/** Verifica ausência, diferenças de contadores e coleta real sem inventar utilização. */
import { expect, test } from 'bun:test';
import { cpuUsage, HostSampler } from '../src/core/metrics';
test('CPU distingue primeira amostra, zero e utilização',()=>{
  const first={idle:50,total:100,count:2};
  expect(cpuUsage(null,first)).toBeNull();
  expect(cpuUsage(first,{idle:150,total:200,count:2})).toBe(0);
  expect(cpuUsage(first,{idle:100,total:200,count:2})).toBe(50);
});
test('contadores reiniciados e mudança de CPU descartam referência',()=>{
  const first={idle:50,total:100,count:2};
  expect(cpuUsage(first,{idle:10,total:20,count:2})).toBeNull();
  expect(cpuUsage(first,{idle:100,total:200,count:4})).toBeNull();
  expect(cpuUsage(first,{idle:200,total:200,count:2})).toBeNull();
});
test("coleta real informa memória e CPU inicial unavailable",()=>{
  const sample=new HostSampler().sample();expect(sample.cpuPercent).toBeNull();expect(sample.memoryTotal).toBeGreaterThan(0);expect(sample.memoryUsed).toBeGreaterThanOrEqual(0);expect(sample.memoryUsed).toBeLessThanOrEqual(sample.memoryTotal);
});
test('pausa longa e regressão do relógio descartam referência de CPU',async()=>{
  let now=100000;const sampler=new HostSampler(1000,()=>now);
  expect(sampler.sample().cpuPercent).toBeNull();
  await Bun.sleep(10);now+=100;expect(sampler.sample().cpuPercent).not.toBeNull();
  now+=2000;expect(sampler.sample().cpuPercent).toBeNull();
  await Bun.sleep(10);now+=100;expect(sampler.sample().cpuPercent).not.toBeNull();
  now-=500;expect(sampler.sample().cpuPercent).toBeNull();
});
