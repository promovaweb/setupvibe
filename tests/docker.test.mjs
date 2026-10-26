/** Contratos Docker com processos controlados: projeção pública, propriedade, edição e token por stdin. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,mkdirSync,chmodSync,readFileSync,rmSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
const binary=resolve(import.meta.dirname,'../target/debug/setupvibe');
function fixture(fn){
  const dir=mkdtempSync(join(tmpdir(),'setupvibe-docker-unit-'));const bin=join(dir,'bin');mkdirSync(bin);
  const raw={Id:'abc123',Name:'/setupvibe-redis',Image:'sha256:111',Config:{Image:'redis:7',Env:['PASSWORD=credencial-nao-publica'],Labels:{'dev.setupvibe.managed':'true','dev.setupvibe.component':'redis',secret:'segredo-na-label'}},State:{Status:'running',Running:true,Health:{Status:'healthy'}},HostConfig:{Memory:0,NanoCpus:0},NetworkSettings:{Ports:{}},Mounts:[]};
  const state=join(dir,'container.json');writeFileSync(state,JSON.stringify(raw));
  const log=join(dir,'calls.jsonl');
  function script(name,body){const p=join(bin,name);writeFileSync(p,`#!${process.execPath}\n${body}`);chmodSync(p,0o700);}
  script('docker',`const fs=require('node:fs');const a=process.argv.slice(2);fs.appendFileSync(${JSON.stringify(log)},JSON.stringify(a)+'\\n');const v=JSON.parse(fs.readFileSync(${JSON.stringify(state)}));if(a[0]==='ps')console.log(v.Id);else if(a[0]==='container')console.log(JSON.stringify([v]));else if(a[0]==='info')console.log(JSON.stringify({Swarm:{LocalNodeState:'inactive',ControlAvailable:false}}));else if(a[0]==='context')console.log(JSON.stringify('unix:///tmp/fake.sock'));else if(a[0]==='logs')console.log('token=credencial-no-log');else {v.State.Status=a[0]==='stop'?'exited':'running';fs.writeFileSync(${JSON.stringify(state)},JSON.stringify(v));}`);
  script('curl',`const fs=require('node:fs');const a=process.argv.slice(2);fs.appendFileSync(${JSON.stringify(log)},JSON.stringify(a)+'\\n');if(a.includes('http://localhost/version'))console.log(JSON.stringify({ApiVersion:'1.53',MinAPIVersion:'1.44'}));else {let data='';process.stdin.on('data',c=>data+=c);process.stdin.on('end',()=>{const v=JSON.parse(data);if(v.JoinToken!=='SWMTKN-segredo-exclusivo')process.exit(1);});}`);
  const run=(args,input)=>{const r=spawnSync(binary,['--output','json','--data-dir',join(dir,'data'),...args],{env:{...process.env,HOME:dir,PATH:bin,DOCKER_HOST:'unix:///tmp/fake.sock'},input,encoding:'utf8',timeout:10000});assert.equal(r.error,undefined);return {code:r.status,body:JSON.parse(r.stdout),text:r.stdout};};
  try{fn({dir,state,raw,run,script,calls:()=>existsSync(log)?readFileSync(log,'utf8'):''});}finally{rmSync(dir,{recursive:true,force:true});}
}
test('descoberta não expõe env, labels privadas ou credenciais',()=>fixture(f=>{
  const r=f.run(['service','list']);assert.equal(r.code,0);assert.equal(r.body.data.containers[0].health,'healthy');assert.doesNotMatch(r.text,/credencial|segredo-na-label|PASSWORD/);assert.equal(existsSync(join(f.dir,'data')),false);
}));
test('controle exige confirmação e registra resultado sem configuração secreta',()=>fixture(f=>{
  assert.equal(f.run(['service','stop','abc123']).code,4);
  assert.equal(f.run(['service','stop','abc123','--dry-run']).code,0);assert.equal(existsSync(join(f.dir,'data')),false);
  const r=f.run(['service','stop','abc123','--yes']);assert.equal(r.code,0);assert.equal(r.body.data.result.state,'exited');
  const history=f.run(['operation','show',r.body.data.operation_id]);assert.doesNotMatch(history.text,/credencial|segredo-na-label/);assert.equal(history.body.data.operations[0].status,'succeeded');
}));
test('controle externo e serviço Desktop na Server são recusados',()=>fixture(f=>{
  assert.equal(f.run(['--edition','server','service','stop','abc123','--yes']).code,3);
  f.raw.Config.Labels['dev.setupvibe.managed']='false';writeFileSync(f.state,JSON.stringify(f.raw));
  assert.equal(f.run(['service','restart','abc123','--yes']).code,4);assert.doesNotMatch(f.calls(),/\["restart"/);
}));
test('logs filtram credenciais e validam datas antes de consultar logs',()=>fixture(f=>{
  const r=f.run(['service','logs','abc123']);assert.equal(r.code,0);assert.doesNotMatch(r.text,/credencial-no-log/);
  assert.equal(f.run(['service','logs','abc123','--since','ontem']).code,2);
}));
test('token Swarm entra por stdin e não aparece em argv nem histórico',()=>fixture(f=>{
  const r=f.run(['swarm','join','--manager','192.0.2.1:2377','--token-stdin','--yes'],'SWMTKN-segredo-exclusivo\n');assert.equal(r.code,0,JSON.stringify(r));assert.doesNotMatch(f.calls(),/SWMTKN|segredo-exclusivo/);
  assert.doesNotMatch(f.run(['operation','list']).text,/SWMTKN|segredo-exclusivo/);
}));

test('falha ao criar substituto tenta restaurar o container anterior sem excluir volume',()=>fixture(f=>{
  f.script('curl',`const a=process.argv.slice(2);if(a.includes('http://localhost/version'))console.log(JSON.stringify({ApiVersion:'1.53',MinAPIVersion:'1.44'}));else {process.stderr.write('falha de criação controlada');process.exit(22);}`);
  const r=f.run(['component','update','redis','--yes']);
  // A atualização tem somente Redis; Docker não conta como sucesso artificial.
  assert.equal(r.code,1,JSON.stringify(r.body));
  assert.deepEqual(r.body.data.results.map(s=>s.component),['redis']);
  assert.match(r.text,/restauração: concluída/);
  const calls=f.calls();assert.match(calls,/\["stop","abc123"\]/);assert.match(calls,/\["start","abc123"\]/);assert.doesNotMatch(calls,/volume.*rm/);
}));

test('follow emite NDJSON higienizado e termina por timeout',()=>fixture(f=>{
  f.script('docker',`const a=process.argv.slice(2);if(a[0]==='container')console.log(JSON.stringify([${JSON.stringify({Id:'abc123'})}]));else if(a[0]==='logs'){console.log('token=segredo-stream');setTimeout(()=>{},5000);}`);
  const r=spawnSync(binary,['--output','ndjson','--timeout','1','service','logs','abc123','--follow'],{env:{...process.env,HOME:f.dir,PATH:join(f.dir,'bin')},encoding:'utf8',timeout:5000});
  assert.equal(r.error,undefined);assert.equal(r.status,6);assert.doesNotMatch(r.stdout,/segredo-stream/);
  const events=r.stdout.trim().split('\n').map(s=>JSON.parse(s));assert.ok(events.some(e=>e.event==='log'));assert.equal(events.at(-1).event,'result');
}));
