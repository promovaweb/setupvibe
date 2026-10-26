/** Integração destrutiva somente dentro de container descartável; nunca monta o socket Docker. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
const binary=resolve(import.meta.dirname,'../../target/debug/setupvibe');
const container=`setupvibe-test-${randomUUID()}`;
const docker=args=>execFileSync('docker',args,{encoding:'utf8',timeout:300000,maxBuffer:8*1024*1024});

test('Debian 13: instalação limpa, repetida, atualização e preservação', {timeout:300000},()=>{
  try {
    docker(['run','--detach','--name',container,'--volume',`${binary}:/usr/local/bin/setupvibe:ro`,'debian:13-slim','sleep','infinity']);
    const run=args=>JSON.parse(docker(['exec',container,'setupvibe','--edition','server','--output','json',...args]));
    const before=run(['component','inspect','git']);
    assert.equal(before.data.present,false);
    const installed=run(['component','install','git','--yes']);
    assert.equal(installed.success,true);
    const observation=installed.data.results[0].observed;
    assert.equal(observation.owner,'system:git');
    assert.equal(observation.managed,true);
    assert.match(observation.version,/git version/);
    docker(['exec',container,'git','config','--global','user.name','Teste de preservação']);
    const repeated=run(['component','install','git','--yes']);
    assert.equal(repeated.data.results[0].status,'unchanged');
    const updated=run(['component','update','git','--yes']);
    assert.equal(updated.success,true);
    assert.equal(docker(['exec',container,'git','config','--global','user.name']).trim(),'Teste de preservação');
    assert.equal(run(['operation','list']).data.operations.length,3);
    console.log(JSON.stringify({environment:'debian:13-slim x86_64',installed:observation.version,repeated:repeated.data.results[0].status,updated:updated.success,configuration_preserved:true}));
  } finally {try{docker(['rm','--force',container]);}catch{}}
});
