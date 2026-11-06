/** Confere unidades, ausência e CPU Docker sem limitar utilização a um núcleo. */
import {expect,test} from 'bun:test';
import {parseContainerMetrics,discoverContainerMetrics,validateContainerMetrics} from '../src/core/container-metrics';
import {containerMetricsText} from '../src/tui/container-metrics';
const row={ID:'a'.repeat(64),Name:'app-1',CPUPerc:'240.50%',MemUsage:'2MiB / 1GiB',PIDs:'12'};
test('estatísticas preservam CPU multicore e convertem unidades de memória',()=>{
  expect(parseContainerMetrics(JSON.stringify(row))).toEqual([{id:row.ID,name:row.Name,cpuPercent:240.5,memoryUsed:2097152,memoryLimit:1073741824,pids:12}]);
  const absent=parseContainerMetrics(JSON.stringify({...row,CPUPerc:'--',MemUsage:'-- / --',PIDs:'--'}))[0]!;expect(absent.cpuPercent).toBeNull();expect(absent.memoryUsed).toBeNull();expect(absent.pids).toBeNull();
  expect(()=>parseContainerMetrics(JSON.stringify({...row,MemUsage:'2MiB / 1MiB'}))).toThrow(new RegExp("counters","i"));
  expect(()=>parseContainerMetrics(JSON.stringify(row)+'\n'+JSON.stringify(row))).toThrow(new RegExp("invalid","i"));
});
test("Docker missing é indisponibilidade, diferente de lista vazia válida",async()=>{
  expect((await discoverContainerMetrics("/executavel/missing")).status).toBe('unavailable');expect(parseContainerMetrics('')).toEqual([]);
});
test("apresentação distingue carga, ausência, empty e idade da amostra",()=>{
  expect(containerMetricsText()).toContain("No collector samples");expect(containerMetricsText({status:'loading',sampledAt:null,containers:[]})).toContain("Waiting");
  expect(containerMetricsText({status:'unavailable',sampledAt:new Date().toISOString(),containers:[]})).toContain("unavailable");
  const sample={status:'available' as const,sampledAt:'2026-11-04T12:00:00.000Z',containers:parseContainerMetrics(JSON.stringify(row))};
  expect(containerMetricsText(sample,Date.parse(sample.sampledAt))).toContain('240.5%');expect(containerMetricsText(sample,Date.parse(sample.sampledAt)+16000)).toContain("Stale sample");
  expect(()=>validateContainerMetrics({...sample,containers:[{...sample.containers[0]!,pids:-1}]},Date.parse(sample.sampledAt))).toThrow(new RegExp("counters","i"));
});
