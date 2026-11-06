/** Usa subprocessos inofensivos e bancos temporários para verificar o executor real. */
import { expect, test } from 'bun:test';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StateStore } from '../src/core/state';
import { executeSteps } from '../src/core/executor';
const step = (id: string, source: string) => ({ id, command: process.execPath, args: ['-e', source] });
async function withStore(run: (store: StateStore, dir: string) => Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(),'setupvibe-exec-')),store = new StateStore(join(dir,'state.db'),true);
  try {await run(store,dir);} finally {store.close();rmSync(dir,{recursive:true,force:true});}
}
test("confirmação missing não registra operação", async () => withStore(async store => {
  await expect(executeSteps(store,[step('a','')],{confirmed:false})).rejects.toThrow(new RegExp("confirmation","i"));expect(store.list()).toHaveLength(0);
}));
test("falha interrompe as próximas steps e persiste resultado", async () => withStore(async (store,dir) => {
  const marker=join(dir,'marker');
  const result=await executeSteps(store,[step('a','process.exit(7)'),step('b',`Bun.write(${JSON.stringify(marker)},'x')`)],{confirmed:true});
  expect(result.status).toBe('failed');expect(result.steps).toHaveLength(1);expect(existsSync(marker)).toBe(false);expect(store.list()[0]?.status).toBe('failed');
}));
test('timeout e cancelamento encerram processos', async () => withStore(async store => {
  const result=await executeSteps(store,[step('a','setInterval(()=>{},1000)')],{confirmed:true,timeoutMs:40});expect(result.status).toBe('failed');
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),40);
  try {const cancelled=await executeSteps(store,[step('a','setInterval(()=>{},1000)')],{confirmed:true,signal:controller.signal});expect(cancelled.status).toBe('cancelled');} finally {clearTimeout(timer);}
}));
test('argumentos não passam por interpretação de shell', async () => withStore(async store => {
  const result=await executeSteps(store,[{id:'literal',command:process.execPath,args:['-e',"if(process.argv[1]!=='$(exit 9); echo x')process.exit(3)",'$(exit 9); echo x']}],{confirmed:true});expect(result.status).toBe('succeeded');
}));
test("steps permanecem consultáveis após reabrir o banco", async () => withStore(async (store,dir) => {
  const result=await executeSteps(store,[step('ok',''),step('bad','process.exit(9)')],{confirmed:true});
  const reader=new StateStore(join(dir,'state.db'));
  try {expect(reader.steps(result.id)).toEqual([{id:'ok',status:'succeeded',exit_code:0},{id:'bad',status:'failed',exit_code:9}]);}
  finally {reader.close();}
}));
test.skipIf(process.platform !== 'linux')('cancelamento encerra descendente que ignora SIGTERM',async()=>withStore(async(store,dir)=>{
  const {readFileSync}=await import('node:fs');const marker=join(dir,'child-pid');
  const childSource=`process.on('SIGTERM',()=>{});require('fs').writeFileSync(${JSON.stringify(marker)},String(process.pid));setInterval(()=>{},1000);`;
  const parentSource=`require('child_process').spawn(process.execPath,['-e',${JSON.stringify(childSource)}],{stdio:'ignore'});setInterval(()=>{},1000);`;
  const controller=new AbortController();const running=executeSteps(store,[step('parent',parentSource)],{confirmed:true,signal:controller.signal,timeoutMs:3000});
  let pid:number|undefined;
  try{
    for(let i=0;i<100&&!existsSync(marker);i++)await Bun.sleep(10);
    expect(existsSync(marker)).toBe(true);pid=Number(readFileSync(marker,'utf8'));controller.abort();expect((await running).status).toBe('cancelled');
    // No Linux, um zombie já terminou e pode aguardar recolhimento pelo processo adotivo.
    let alive=true;
    for(let i=0;i<100;i++){try{const stat=readFileSync(`/proc/${pid}/stat`,'utf8');if(stat.split(') ')[1]?.startsWith('Z')){alive=false;break;}}catch{alive=false;break;}await Bun.sleep(10);}
    expect(alive).toBe(false);
  }finally{controller.abort();await running;if(pid)try{process.kill(pid,'SIGKILL');}catch{}}
}));
test('eventos seguem persistência e falha de observador não interrompe execução',async()=>withStore(async store=>{
 const events:string[]=[];let persisted:string|undefined;const result=await executeSteps(store,[step('a','')],{confirmed:true,onEvent:event=>{events.push(event.type);if(event.type==='step-finished'){persisted=store.steps(event.operationId)[0]?.status;throw new Error("observador unavailable");}}});
 expect(persisted).toBe('succeeded');expect(result.status).toBe('succeeded');expect(events).toEqual(['operation-started','step-started','step-finished','operation-finished']);
}));
test('entrada protegida chega por stdin sem aparecer nos eventos',async()=>withStore(async store=>{
 const secret='example-private-value';const events:unknown[]=[];
 const result=await executeSteps(store,[{id:'stdin',command:process.execPath,args:['-e',"const value=await Bun.stdin.text();if(value!=='example-private-value')process.exit(4)"],input:secret}],{confirmed:true,onEvent:event=>events.push(event)});
 expect(result.status).toBe('succeeded');expect(JSON.stringify(events)).not.toContain(secret);expect(JSON.stringify(store.steps(result.id))).not.toContain(secret);
}));
test('logs filtram segredo dividido e limitam saída entregue',async()=>withStore(async store=>{
 const output:string[]=[];const result=await executeSteps(store,[step('logs',"process.stdout.write('private-');setTimeout(()=>{process.stdout.write('token');process.stderr.write('x'.repeat(100000));},10)")],{confirmed:true,secrets:['private-token'],onLog:(_id,_stream,text)=>output.push(text)});
 expect(result.status).toBe('succeeded');expect(output.join('')).not.toContain('private-token');expect(output.join('')).toContain('[SEGREDO]');expect(output.join('').length).toBeLessThanOrEqual(65536*2);
}));
test("verificação posterior impede successful fictício do comando",async()=>withStore(async store=>{
 const result=await executeSteps(store,[step('install','')],{confirmed:true,verify:async()=>{throw new Error("version não encontrada");}});
 expect(result.steps[0]?.status).toBe('succeeded');expect(result.status).toBe('failed');expect(store.get(result.id)?.status).toBe('failed');
}));
test('histórico distingue verificação posterior do comando executado',async()=>withStore(async store=>{
 const result=await executeSteps(store,[step('install','')],{confirmed:true,verify:async()=>{throw new Error('not installed');}});
 expect(store.steps(result.id)).toEqual([{id:'install',status:'succeeded',exit_code:0},{id:'__verify',status:'failed',exit_code:null}]);
 await expect(executeSteps(store,[step('__verify','')],{confirmed:true})).rejects.toThrow(new RegExp("invalid","i"));
}));
test('nova execução reconcilia operação abandonada antes de iniciar',async()=>withStore(async store=>{
 store.start('abandoned');store.startStep('abandoned','partial');const result=await executeSteps(store,[step('new','')],{confirmed:true});expect(result.status).toBe('succeeded');expect(store.get('abandoned')?.status).toBe('interrupted');expect(store.steps('abandoned')[0]?.status).toBe('interrupted');
}));
test('executor ativo impede reconciliação concorrente',async()=>withStore(async store=>{
 const{acquireCollectorLock}=await import('../src/core/collector-lock');store.start('active');const release=acquireCollectorLock(store.path+'.operation-lock');
 try{await expect(executeSteps(store,[step('new','')],{confirmed:true})).rejects.toThrow(new RegExp("executor","i"));expect(store.get('active')?.status).toBe('running');}
 finally{release();store.finish('active','cancelled');}
}));
test('precondição da etapa impede comando e registra falha',async()=>withStore(async(store,dir)=>{
 const marker=join(dir,'should-not-exist');const result=await executeSteps(store,[step('create',`Bun.write(${JSON.stringify(marker)},'x')`)],{confirmed:true,beforeStep:async()=>{throw new Error("volume external");}});expect(result.status).toBe('failed');expect(existsSync(marker)).toBe(false);expect(store.steps(result.id)[0]?.status).toBe('failed');
}));
