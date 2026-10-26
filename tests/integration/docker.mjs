/** Integração Docker-in-Docker descartável: não monta socket, volumes ou credenciais do host. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
const binary=resolve(import.meta.dirname,'../../target/debug/setupvibe');
const container=`setupvibe-docker-${randomUUID()}`;
const docker=args=>execFileSync('docker',args,{encoding:'utf8',timeout:360000,maxBuffer:8*1024*1024});

test('Engine oficial, serviços persistentes, conflitos, controles e Swarm isolados',{timeout:1200000},async()=>{
  try {
    docker(['run','--detach','--privileged','--name',container,'--volume',`${binary}:/usr/local/bin/setupvibe:ro`,'debian:13-slim','sleep','infinity']);
    const exec=args=>docker(['exec',container,...args]);
    const run=args=>{try{return JSON.parse(exec(['setupvibe','--output','json','--timeout','300',...args]));}catch(e){throw new Error(e.stdout||e.message);}};
    const installed=run(['--edition','server','component','install','docker','--yes']);
    assert.equal(installed.success,true);
    console.log(JSON.stringify({stage:'engine_installed',version:installed.data.results[0].observed.version}));
    docker(['exec','--detach',container,'dockerd','--host','unix:///var/run/docker.sock','--storage-driver','vfs']);
    let ready=false;
    for(let i=0;i<100;i++){try{exec(['docker','info']);ready=true;break;}catch{await new Promise(r=>setTimeout(r,300));}}
    assert.equal(ready,true,'daemon isolado precisa iniciar');
    for(const id of ['redis','postgresql','mailpit','portainer']){
      const result=run(['component','install',id,'--yes']);
      assert.equal(result.success,true,id);
      const services=run(['service','list']).data.containers;
      const service=services.find(s=>s.component===id);
      assert.equal(service.managed,true);assert.equal(service.state,'running');
      console.log(JSON.stringify({component:id,state:service.state,health:service.health,ports:service.ports}));
      assert.equal(run(['component','install',id,'--yes']).data.results.at(-1).status,'unchanged');
    }
    exec(['docker','rm','--force','setupvibe-mailpit']);
    const conflict=run(['component','install','mailpit','--option','port=6379','--dry-run']);
    assert.equal(conflict.data.ready,false);assert.match(JSON.stringify(conflict),/Porta 6379/);
    assert.throws(()=>run(['component','install','mailpit','--option','port=6379','--yes']),/Porta 6379/);
    assert.equal(run(['component','install','mailpit','--yes']).success,true);
    const password=exec(['cat','/root/.local/share/setupvibe/secrets/postgresql-password']);
    assert.ok(!JSON.stringify(run(['service','inspect','setupvibe-postgresql'])).includes(password));
    assert.ok(!JSON.stringify(run(['operation','list'])).includes(password));
    exec(['docker','rm','--force','setupvibe-portainer']);
    assert.equal(run(['portainer','install','--role','agent','--yes']).success,true);
    const agent=run(['service','inspect','setupvibe-portainer']).data;
    assert.equal(agent.role,'agent');assert.equal(agent.ports['9001/tcp'][0].HostPort,'9001');
    console.log(JSON.stringify({port_conflict_refused:true,secret_not_exposed:true,portainer_agent_running:true}));
    exec(['docker','exec','setupvibe-redis','redis-cli','SET','preservar','valor']);
    assert.equal(run(['component','update','redis','--yes']).success,true);
    assert.equal(exec(['docker','exec','setupvibe-redis','redis-cli','GET','preservar']).trim(),'valor');
    assert.equal(run(['updates','list','redis']).data.updates[0].available,false);
    assert.equal(run(['service','stop','setupvibe-redis','--yes']).data.result.state,'exited');
    assert.equal(run(['service','start','setupvibe-redis','--yes']).data.result.state,'running');
    assert.equal(run(['service','restart','setupvibe-redis','--yes']).success,true);
    assert.ok(run(['service','logs','setupvibe-redis','--tail','10']).data.stdout);
    exec(['docker','run','--detach','--name','externo','redis:7']);
    assert.throws(()=>run(['service','stop','externo','--yes']),/Container externo/);
    exec(['docker','rm','--force','externo']);
    assert.throws(()=>run(['--edition','server','service','stop','setupvibe-redis','--yes']),/indisponível nesta edição/);
    const address=exec(['hostname','-I']).trim().split(/\s/)[0];
    assert.equal(run(['swarm','init','--advertise-addr',address,'--yes']).success,true);
    assert.equal(run(['swarm','status']).data.manager,true);
    assert.throws(()=>run(['swarm','init','--advertise-addr',address,'--yes']),/já configurado/);
    exec(['docker','rm','--force','setupvibe-portainer']);
    const preview=run(['portainer','install','--option','bind=0.0.0.0','--dry-run']);assert.equal(preview.data.ready,true,JSON.stringify(preview));
    assert.equal(run(['portainer','install','--option','bind=0.0.0.0','--yes']).success,true);
    const current=run(['service','list']);assert.equal(current.success,true);
    assert.ok(current.data.swarm_services.some(s=>s.role==='server'&&s.managed));
    assert.ok(current.data.swarm_services.some(s=>s.role==='agent'&&s.mode.Global));
    assert.ok(current.data.stacks.includes('setupvibe-portainer'));assert.ok(current.data.networks.length);
    assert.equal(run(['service','stop','setupvibe-portainer_server','--yes']).data.result.mode.Replicated.Replicas,0);
    assert.equal(run(['service','start','setupvibe-portainer_server','--yes']).data.result.mode.Replicated.Replicas,1);
    assert.equal(run(['service','logs','setupvibe-portainer_server']).success,true);
    assert.equal(run(['component','update','portainer','--dry-run']).data.ready,true);
    assert.equal(run(['service','restart','setupvibe-portainer_agent','--yes']).success,true);
    assert.equal(run(['component','update','portainer','--yes']).success,true);
    assert.equal(run(['updates','list','portainer']).data.updates[0].available,false);
    console.log(JSON.stringify({portainer_swarm_server_and_global_agent:true,swarm_control:true,swarm_update:true,networks_and_volumes_discovered:true}));
    console.log(JSON.stringify({redis_data_preserved:true,external_control_refused:true,server_scope_preserved:true,swarm_initialized:true}));
  } finally {try{docker(['rm','--force',container]);}catch{}}
});
