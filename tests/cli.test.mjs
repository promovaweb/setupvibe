/** Verifica automação, canais de saída e subprocessos com comandos Node descartáveis. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync, spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, chmodSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
const binary=resolve(import.meta.dirname,'../target/debug/setupvibe');

function run(args,env={}) {
  const r=spawnSync(binary,args,{encoding:'utf8',timeout:10000,env:{...process.env,...env}});
  assert.equal(r.error,undefined);
  return r;
}
/** Os simuladores testam o transporte; não substituem homologação de pacotes. */
async function withGit(code,fn) {
  const dir=mkdtempSync(join(tmpdir(),'setupvibe-cli-'));
  try {
    const file=join(dir,'git');
    writeFileSync(file,`#!${process.execPath}\n${code}\n`);chmodSync(file,0o700);
    await fn(dir);
  } finally {rmSync(dir,{recursive:true,force:true});}
}

test('JSON tem exatamente um resultado e stderr vazio',()=>{
  const r=run(['--output','json','version']);
  assert.equal(r.status,0);assert.equal(r.stderr,'');
  assert.equal(r.stdout.trim().split('\n').length,1);
  assert.equal(JSON.parse(r.stdout).data.version,'2.0.0-alpha.1');
});

test('NDJSON contém eventos tipados com resultado final',()=>{
  const r=run(['--output','ndjson','catalog','validate']);
  const events=r.stdout.trim().split('\n').map(x=>JSON.parse(x));
  assert.deepEqual(events.map(e=>e.event),['started','result']);
  assert.ok(events.every(e=>!Number.isNaN(Date.parse(e.timestamp))));
  assert.equal(events.at(-1).success,true);
});

for(const args of [
  ['--output','json','comando-inexistente'],
  ['catalog','show','--output=json'],
  ['--output=json','--timeout','0','doctor'],
])test(`parsing retorna erro JSON e código 2: ${args.join(' ')}`,()=>{
  const r=run(args);assert.equal(r.status,2);assert.equal(JSON.parse(r.stdout).error.code,2);
});

test('diagnóstico remove credenciais e sequências de terminal',async()=>{
  await withGit('process.stdout.write("\\u001b[31mgit 1.0\\u001b[0m token=segredo ghp_123456\\n");process.stderr.write("Bearer secreto");',dir=>{
    const r=run(['--output','json','doctor'],{PATH:dir});
    assert.equal(r.status,0);
    assert.doesNotMatch(r.stdout,/segredo|123456|secreto|\\u001b/);
    assert.match(r.stdout,/SEGREDO REMOVIDO/);
    assert.equal(JSON.parse(r.stdout).data.checks[0].available,true);
  });
});

test('stdin do subprocesso é fechado sem prompt',async()=>{
  await withGit('const fs=require("node:fs");process.stdout.write(fs.readFileSync(0,"utf8")===""?"stdin fechado":"inesperado");',dir=>{
    const r=run(['--output','json','doctor','--non-interactive'],{PATH:dir});
    assert.equal(r.status,0);assert.match(r.stdout,/stdin fechado/);
  });
});

test('timeout encerra subprocesso e retorna 6',async()=>{
  await withGit('setInterval(()=>{},1000);',dir=>{
    const start=Date.now();const r=run(['--output','json','--timeout','1','doctor'],{PATH:dir});
    assert.equal(r.status,6);assert.ok(Date.now()-start<4000);
    assert.equal(JSON.parse(r.stdout).success,false);
  });
});

test('saída volumosa é limitada sem deadlock',async()=>{
  await withGit('process.stdout.write("x".repeat(3*1024*1024));',dir=>{
    const r=spawnSync(binary,['--output','json','doctor'],{encoding:'utf8',timeout:10000,maxBuffer:4*1024*1024,env:{...process.env,PATH:dir}});
    assert.equal(r.error,undefined);assert.equal(r.status,0);
    const check=JSON.parse(r.stdout).data.checks[0];
    assert.equal(check.truncated,true);assert.equal(check.version.length,2*1024*1024);
  });
});

test('SIGINT retorna 130 com resultado final estruturado',async()=>{
  await withGit('setInterval(()=>{},1000);',async dir=>{
    const child=spawn(binary,['--output','ndjson','doctor'],{env:{...process.env,PATH:dir},stdio:['ignore','pipe','pipe']});
    let out='';child.stdout.on('data',chunk=>{out+=chunk;});
    const done=new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',(code)=>resolve(code));});
    const timer=setTimeout(()=>child.kill('SIGINT'),200);
    const guard=setTimeout(()=>child.kill('SIGKILL'),5000);
    try {assert.equal(await done,130);assert.equal(JSON.parse(out.trim().split('\n').at(-1)).success,false);}
    finally {clearTimeout(timer);clearTimeout(guard);}
  });
});

test('credencial com chave JSON entre aspas também é filtrada',async()=>{
  await withGit('process.stdout.write(JSON.stringify({token:"credencial-sigilosa",password:"senha-sigilosa"}));',dir=>{
    const r=run(['--output','json','doctor'],{PATH:dir});
    assert.equal(r.status,0);assert.doesNotMatch(r.stdout,/credencial-sigilosa|senha-sigilosa/);
  });
});

test('ajuda de subcomando usa rótulos em português',()=>{
  const r=run(['state','--help']);
  assert.equal(r.status,0);assert.match(r.stdout,/Comandos:/);assert.match(r.stdout,/Opções:/);assert.match(r.stdout,/Exibe a ajuda/);
});

test('descendente fora do grupo não prende captura depois do timeout',async()=>{
  await withGit(`const fs=require('node:fs');const {spawn}=require('node:child_process');const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{detached:true,stdio:['ignore',1,2]});fs.writeFileSync(process.env.HOME+'/detached.pid',String(child.pid));setInterval(()=>{},1000);`,dir=>{
    try {
      const start=Date.now();const r=run(['--output','json','--timeout','1','doctor'],{PATH:dir,HOME:dir});
      assert.equal(r.status,6);assert.ok(Date.now()-start<4000);
    }finally{const pid=join(dir,'detached.pid');if(existsSync(pid)){try{process.kill(Number(readFileSync(pid)),'SIGKILL');}catch{}}}
  });
});
