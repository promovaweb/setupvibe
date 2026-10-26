/** Verifica pacote Tailscale em Debian descartável sem autenticar ou configurar uma tailnet. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {resolve} from 'node:path';
const binary=resolve(import.meta.dirname,'../../target/debug/setupvibe');
const container=`setupvibe-tailscale-${randomUUID()}`;
const docker=(args,input)=>execFileSync('docker',args,{encoding:'utf8',input,timeout:300000,maxBuffer:8*1024*1024});
test('Tailscale Linux instala, repete, atualiza e preserva estado sem login',{timeout:300000},()=>{
  try {
    docker(['run','--detach','--name',container,'--volume',`${binary}:/usr/local/bin/setupvibe:ro`,'debian:13-slim','sleep','infinity']);
    const run=args=>{try{return JSON.parse(docker(['exec',container,'setupvibe','--edition','server','--output','json',...args]));}catch(e){throw new Error(e.stdout||e.message);}};
    const result=run(['tailscale','install','--yes']);assert.equal(result.success,true);
    const observation=result.data.results[0].observed;assert.equal(observation.owner,'system:tailscale');
    assert.equal(run(['tailscale','verify']).success,true);
    assert.equal(run(['tailscale','install','--yes']).data.results[0].status,'unchanged');
    docker(['exec',container,'mkdir','-p','/var/lib/tailscale']);
    docker(['exec','-i',container,'tee','/var/lib/tailscale/setupvibe-preservation-test'],'estado preservado\n');
    assert.equal(run(['tailscale','update','--yes']).success,true);
    assert.equal(docker(['exec',container,'cat','/var/lib/tailscale/setupvibe-preservation-test']),'estado preservado\n');
    assert.equal(run(['updates','list','tailscale']).data.updates[0].available,false);
    console.log(JSON.stringify({installed:observation.version,owner:observation.owner,repeated:'unchanged',updated:true,existing_state_preserved:true,authentication_requested:false}));
  } finally {try{docker(['rm','--force',container]);}catch{}}
});
