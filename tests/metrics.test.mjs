/** Exercita coleta real do host, isolamento do Docker e consultas SQLite sem preencher lacunas. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync,spawn} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,chmodSync,rmSync,existsSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
const binary=resolve(import.meta.dirname,'../target/debug/setupvibe');

/** Nunca conecta ao daemon do host; cada teste tem comandos e bancos próprios. */
async function fixture(fn){
  const dir=mkdtempSync(join(tmpdir(),'setupvibe-metrics-'));
  const bin=join(dir,'bin');mkdirSync(bin);
  const data=join(dir,'data');
  const env={...process.env,HOME:dir,PATH:bin,DOCKER_HOST:'unix:///tmp/metrics-test.sock',DOCKER_CONTEXT:''};
  function script(name,body){const path=join(bin,name);writeFileSync(path,`#!${process.execPath}\n${body}`);chmodSync(path,0o700);}
  script('docker','process.exit(1)');script('curl','process.exit(1)');
  const args=a=>['--data-dir',data,'--output','json',...a];
  function run(a){const r=spawnSync(binary,args(a),{env,encoding:'utf8',timeout:15000});assert.equal(r.error,undefined);return {code:r.status,body:JSON.parse(r.stdout),text:r.stdout};}
  try{await fn({dir,data,env,args,script,run});}finally{rmSync(dir,{recursive:true,force:true});}
}

test('consulta, prévia e confirmação não criam dados',()=>fixture(f=>{
  assert.equal(f.run(['metrics','current']).body.data.collected,false);
  assert.deepEqual(f.run(['metrics','history']).body.data.samples,[]);
  assert.equal(f.run(['collector','run','--once','--dry-run']).code,0);
  assert.equal(f.run(['collector','run','--once']).code,4);
  assert.equal(existsSync(f.data),false);
}));

test('cursores inválidos e paginação ambígua falham mesmo sem banco',()=>fixture(f=>{
  const invalid=[['--after','18446744073709551615'],['--snapshot-id','18446744073709551615'],['--after','1','--offset','1']];
  for(const flags of invalid){const r=f.run(['metrics','history',...flags]);assert.equal(r.code,2,r.text);assert.equal(r.body.success,false);}
  assert.equal(existsSync(f.data),false);
  assert.equal(f.run(['state','init','--yes']).code,0);
  for(const flags of invalid)assert.equal(f.run(['metrics','history',...flags]).code,2);
  assert.equal(f.run(['metrics','history','--after','1','--offset','0']).code,0);
  assert.equal(f.run(['metrics','history','--offset','1']).code,0);
}));

test('consultas vazias mantêm metadados antes e depois de criar o banco',()=>fixture(f=>{
  const from=new Date(Date.now()-10*86400000).toISOString();
  const current=f.run(['metrics','current']).body.data;
  const history=f.run(['metrics','history','--from',from]).body.data;
  assert.equal(current.has_more,false);assert.equal(current.next_offset,null);assert.equal(current.collector_stopped,false);
  assert.equal(history.next_after,null);assert.equal(history.retention_clamped,true);assert.equal(history.order,'insertion_id');
  assert.equal(existsSync(f.data),false);
  assert.equal(f.run(['state','init','--yes']).code,0);
  assert.deepEqual(Object.keys(current).sort(),Object.keys(f.run(['metrics','current']).body.data).sort());
  assert.deepEqual(Object.keys(history).sort(),Object.keys(f.run(['metrics','history','--from',from]).body.data).sort());
}));

test('host continua com Docker indisponível e CPU inicial nula',()=>fixture(f=>{
  const r=f.run(['collector','run','--interval','1','--samples','2','--yes']);assert.equal(r.code,0,r.text);
  const current=f.run(['metrics','current','--scope','host']).body.data;
  assert.equal(current.samples.length,1);assert.equal(current.collector_stopped,true);
  assert.equal(current.samples[0].fresh,true);assert.ok(current.samples[0].values.memory_total_bytes>0);
  const history=f.run(['metrics','history','--scope','host']).body.data.samples;
  assert.equal(history.length,2);assert.equal(history[0].values.cpu_percent,null);
  assert.equal(typeof history[1].values.cpu_percent,'number');
  assert.ok(current.health.some(h=>h.source==='docker'&&h.error_code));
  assert.equal(readdirSync(f.data).includes('setupvibe.db'),false);
}));

test('histórico limita retenção, futuro, paginação e alteração concorrente',()=>fixture(f=>{
  assert.equal(f.run(['state','init','--yes']).code,0);
  const db=new DatabaseSync(join(f.data,'metrics.db'));
  const insert=db.prepare('INSERT INTO samples(scope,resource,sampled_at,payload) VALUES(?,?,?,?)');
  const at=(delta)=>new Date(Date.now()+delta).toISOString();
  for(const delta of [-8*86400000,-10000,-9000,-8000,86400000])insert.run('host','host',at(delta),'{}');
  const first=f.run(['metrics','history','--from',at(-10*86400000),'--limit','2']).body.data;
  assert.equal(first.retention_clamped,true);assert.equal(first.samples.length,2);assert.equal(first.has_more,true);
  insert.run('host','host',at(-1000),'{}');
  const second=f.run(['metrics','history','--after',String(first.next_after),'--snapshot-id',String(first.snapshot_id),'--limit','2']).body.data;
  assert.equal(second.samples.length,1);assert.equal(second.has_more,false);
  const current=f.run(['metrics','current','--max-age','1']).body.data.samples[0];
  assert.ok(current.age_seconds>=1);assert.equal(current.fresh,false);
  assert.equal(f.run(['metrics','history','--from','ontem']).code,2);
  assert.equal(f.run(['metrics','history','--after','18446744073709551615']).code,2);
  db.close();
}));

test('retenção elimina linhas vencidas em lotes e conserva histórico recente',()=>fixture(f=>{
  assert.equal(f.run(['state','init','--yes']).code,0);
  const db=new DatabaseSync(join(f.data,'metrics.db'));
  const stmt=db.prepare('INSERT INTO samples(scope,resource,sampled_at,payload) VALUES(?,?,?,?)');
  db.exec('BEGIN');for(let i=0;i<4500;i++)stmt.run('host','old',new Date(Date.now()-8*86400000).toISOString(),'{}');db.exec('COMMIT');
  assert.equal(f.run(['collector','run','--once','--yes']).code,0);
  assert.equal(db.prepare("SELECT count(*) n FROM samples WHERE resource='old'").get().n,500);
  assert.equal(f.run(['metrics','history','--id','old']).body.data.samples.length,0);
  assert.equal(f.run(['collector','run','--once','--yes']).code,0);
  assert.equal(db.prepare("SELECT count(*) n FROM samples WHERE resource='old'").get().n,0);db.close();
}));

test('coletor exclusivo permite leitores e encerra por SIGTERM',()=>fixture(async f=>{
  const child=spawn(binary,f.args(['collector','run','--interval','1','--yes']),{env:f.env,stdio:['ignore','pipe','pipe']});
  let out='';child.stdout.on('data',c=>out+=c);
  const done=new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',resolve);});
  try{
    for(let i=0;i<50&&!existsSync(join(f.data,'metrics.db'));i++)await new Promise(r=>setTimeout(r,50));
    await new Promise(r=>setTimeout(r,200));
    assert.equal(f.run(['collector','run','--once','--yes']).code,6);
    assert.equal(f.run(['metrics','current']).code,0);
    child.kill('SIGTERM');assert.equal(await done,130);assert.equal(JSON.parse(out).error.code,130);
    assert.equal(f.run(['collector','run','--once','--yes']).code,0);
  }finally{child.kill('SIGKILL');await done;}
}));

test('Docker mede deltas e memória sem persistir campos privados',()=>fixture(f=>{
  const counter=join(f.dir,'counter');
  f.script('curl',`const fs=require('node:fs');const a=process.argv.slice(2),url=a.find(x=>x.startsWith('http:'));
    if(url.endsWith('/version'))console.log(JSON.stringify({ApiVersion:'1.53'}));
    else if(url.includes('/containers/json'))console.log(JSON.stringify([{Id:'abc',State:'running',Names:['/teste'],Labels:{token:'nao-persistir'}}]));
    else {let n=fs.existsSync(${JSON.stringify(counter)})?+fs.readFileSync(${JSON.stringify(counter)}):0;n++;fs.writeFileSync(${JSON.stringify(counter)},String(n));console.log(JSON.stringify({cpu_stats:{cpu_usage:{total_usage:n*50},system_cpu_usage:n*100,online_cpus:2},memory_stats:{usage:1000,limit:2000,stats:{inactive_file:200}},private:'nao-persistir'}));}`);
  assert.equal(f.run(['collector','run','--interval','1','--samples','4','--yes']).code,0);
  const result=f.run(['metrics','history','--scope','container']);assert.doesNotMatch(result.text,/nao-persistir/);
  const samples=result.body.data.samples;assert.ok(samples.length>=2);assert.equal(samples[0].values.cpu_percent,null);
  assert.equal(samples[1].values.cpu_percent,100);assert.equal(samples[1].values.memory_working_set_bytes,800);
}));

test('timeout Docker não atrasa os ciclos do host',()=>fixture(f=>{
  f.script('curl','setInterval(()=>{},1000)');
  assert.equal(f.run(['collector','run','--interval','1','--samples','3','--yes']).code,0);
  const rows=f.run(['metrics','history','--scope','host']).body.data.samples;
  assert.equal(rows.length,3);assert.ok(Date.parse(rows[2].sampled_at)-Date.parse(rows[0].sampled_at)<3000);
}));

test('suspensão e retomada registram lacuna sem reutilizar delta de CPU',()=>fixture(async f=>{
  const child=spawn(binary,f.args(['collector','run','--interval','1','--yes']),{env:f.env,stdio:['ignore','pipe','pipe']});
  child.stdout.resume();child.stderr.resume();const done=new Promise(r=>child.on('close',r));
  try{
    for(let i=0;i<100;i++){await new Promise(r=>setTimeout(r,30));if(existsSync(join(f.data,'metrics.db'))&&f.run(['metrics','history','--scope','host']).body.data.samples.length>=1)break;}
    child.kill('SIGSTOP');await new Promise(r=>setTimeout(r,2300));child.kill('SIGCONT');
    await new Promise(r=>setTimeout(r,300));
    const rows=f.run(['metrics','history','--scope','host']).body.data.samples;
    assert.ok(rows.length>=2);assert.equal(rows.at(-1).values.cpu_percent,null);assert.ok(rows.at(-1).values.gap_seconds>2);
  }finally{child.kill('SIGCONT');child.kill('SIGTERM');await done;}
}));

test('endpoint Docker permanece fixo entre lista e estatísticas de um ciclo',()=>fixture(f=>{
  delete f.env.DOCKER_HOST;delete f.env.DOCKER_CONTEXT;
  const count=join(f.dir,'context-count');
  f.script('docker',`const fs=require('node:fs');let n=fs.existsSync(${JSON.stringify(count)})?+fs.readFileSync(${JSON.stringify(count)}):0;fs.writeFileSync(${JSON.stringify(count)},String(n+1));console.log(JSON.stringify(n===0?'unix:///tmp/primeiro.sock':'unix:///tmp/segundo.sock'));`);
  f.script('curl',`const a=process.argv.slice(2),url=a.find(x=>x.startsWith('http:'));if(a[a.indexOf('--unix-socket')+1]!=='/tmp/primeiro.sock')process.exit(9);if(url.endsWith('/version'))console.log(JSON.stringify({ApiVersion:'1.53'}));else if(url.includes('/containers/json'))console.log(JSON.stringify([{Id:'abc',State:'running',Names:['/teste']}]));else console.log(JSON.stringify({memory_stats:{usage:100,limit:200}}));`);
  assert.equal(f.run(['collector','run','--once','--yes']).code,0);
  const sample=f.run(['metrics','history','--scope','container']).body.data.samples[0];
  assert.equal(sample.values.available,true);assert.equal(sample.values.endpoint,'unix:///tmp/primeiro.sock');
}));

test('troca de contexto entre ciclos não mistura contadores do mesmo ID',()=>fixture(f=>{
  delete f.env.DOCKER_HOST;delete f.env.DOCKER_CONTEXT;
  const context=join(f.dir,'context'),counter=join(f.dir,'stats');
  f.script('docker',`const fs=require('node:fs');let n=fs.existsSync(${JSON.stringify(context)})?+fs.readFileSync(${JSON.stringify(context)}):0;fs.writeFileSync(${JSON.stringify(context)},String(n+1));console.log(JSON.stringify(n===0?'unix:///tmp/a.sock':'unix:///tmp/b.sock'));`);
  f.script('curl',`const fs=require('node:fs'),a=process.argv.slice(2),url=a.find(x=>x.startsWith('http:'));if(url.endsWith('/version'))console.log(JSON.stringify({ApiVersion:'1.53'}));else if(url.includes('/containers/json'))console.log(JSON.stringify([{Id:'abc',State:'running'}]));else {let n=fs.existsSync(${JSON.stringify(counter)})?+fs.readFileSync(${JSON.stringify(counter)}):0;fs.writeFileSync(${JSON.stringify(counter)},String(++n));console.log(JSON.stringify({cpu_stats:{cpu_usage:{total_usage:n*50},system_cpu_usage:n*100,online_cpus:2}}));}`);
  assert.equal(f.run(['collector','run','--interval','1','--samples','4','--yes']).code,0);
  const rows=f.run(['metrics','history','--scope','container']).body.data.samples;
  assert.ok(rows.length>=3);assert.equal(rows[0].values.cpu_percent,null);assert.equal(rows[1].values.cpu_percent,null);assert.equal(rows[2].values.cpu_percent,100);
  assert.notEqual(rows[0].values.endpoint,rows[1].values.endpoint);
}));
