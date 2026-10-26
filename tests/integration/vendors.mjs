/** Valida fornecedores reais em Debian descartável, sem credenciais ou socket do host. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
const binary=resolve(import.meta.dirname,'../../target/debug/setupvibe');
const container=`setupvibe-vendors-${randomUUID()}`;
const docker=args=>execFileSync('docker',args,{encoding:'utf8',timeout:360000,maxBuffer:8*1024*1024});

test('Debian 13: instaladores oficiais, recibos, repetição e perfis preservados',{timeout:1800000},()=>{
  try {
    docker(['run','--detach','--name',container,'--volume',`${binary}:/usr/local/bin/setupvibe:ro`,'debian:13-slim','sleep','infinity']);
    const run=args=>{try{return JSON.parse(docker(['exec',container,'setupvibe','--output','json','--timeout','300',...args]));}catch(e){throw new Error(e.stdout||e.message);}};
    const profileBefore=docker(['exec',container,'cat','/root/.bashrc']);
    const failures=[];
    const cpuFlags=docker(['exec',container,'cat','/proc/cpuinfo']);
    for(const id of ['mise','herdr','codex','claude','opencode','kimi','antigravity']) {
      try {
        if(id==='antigravity'&&!/\bpclmulqdq\b/.test(cpuFlags)){
          assert.throws(()=>run(['component','install',id,'--yes']),/PCLMUL/);
          console.log(JSON.stringify({component:id,outcome:'unsupported',reason:'CPU sem PCLMUL; recusa verificada',installation_tested:false}));continue;
        }
        const installed=run(['component','install',id,'--yes']);
        assert.equal(installed.success,true);
        const observation=installed.data.results.at(-1).observed;
        assert.equal(observation.owner,`vendor:${id}`);
        assert.equal(observation.managed,true);
        const repeated=run(['component','install',id,'--yes']);
        assert.equal(repeated.data.results.at(-1).status,'unchanged');
        assert.equal(docker(['exec',container,'cat','/root/.bashrc']),profileBefore);
        console.log(JSON.stringify({component:id,version:observation.version,owner:observation.owner,repeated:'unchanged',profile_preserved:true}));
      } catch(error) { failures.push({id,message:error.message}); console.log(JSON.stringify({component:id,error:error.message})); }
    }
    assert.deepEqual(failures,[]);
    // Confere versão solicitada e configuração global com mise real, sem alterar projeto.
    docker(['exec',container,'mkdir','-p','/workspace/projeto']);
    execFileSync('docker',['exec','-i',container,'tee','/workspace/projeto/mise.toml'],{input:'[tools]\nnode = "22"\n',encoding:'utf8'});
    const projectBefore=docker(['exec',container,'cat','/workspace/projeto/mise.toml']);
    const nodeInstalled=run(['component','install','node','--target-version','24','--yes']);
    assert.equal(nodeInstalled.data.results.at(-1).observed.owner,'mise:node');
    assert.match(nodeInstalled.data.results.at(-1).observed.version,/v24\./);
    assert.equal(run(['component','install','node','--target-version','24','--yes']).data.results.at(-1).status,'unchanged');
    assert.equal(run(['component','update','node','--target-version','24','--yes']).success,true);
    assert.equal(docker(['exec',container,'cat','/workspace/projeto/mise.toml']),projectBefore);
    console.log(JSON.stringify({component:'node',owner:'mise:node',version:nodeInstalled.data.results.at(-1).observed.version,explicit_version_verified:true,project_preserved:true}));
  } finally {try{docker(['rm','--force',container]);}catch{}}
});
