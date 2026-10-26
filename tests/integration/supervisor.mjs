/** Exercita systemd real em container próprio, sem montar o cgroup ou socket Docker do host. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {resolve} from 'node:path';
const binary=resolve(import.meta.dirname,'../../target/debug/setupvibe');
const name=`setupvibe-systemd-${randomUUID()}`;
const docker=(args,input)=>execFileSync('docker',args,{encoding:'utf8',input,timeout:300000,maxBuffer:4*1024*1024});
test('systemd instala, supervisiona, reinicia e para coletor real',{timeout:300000},async()=>{
  try{
    docker(['build','--tag',name,'-'],`FROM debian:13-slim\nENV container=docker\nRUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install --yes --no-install-recommends systemd systemd-sysv dbus libplist-utils && rm -rf /var/lib/apt/lists/*\nSTOPSIGNAL SIGRTMIN+3\nCMD ["/sbin/init"]\n`);
    docker(['run','--detach','--privileged','--cgroupns=private','--tmpfs','/run','--tmpfs','/run/lock','--name',name,'--volume',`${binary}:/usr/local/bin/setupvibe:ro`,name]);
    for(let i=0;i<60;i++){
      try{docker(['exec',name,'systemctl','show-environment']);break;}catch{if(i===59)throw new Error(docker(['logs',name]));await new Promise(r=>setTimeout(r,500));}
    }
    const run=args=>{try{return JSON.parse(docker(['exec',name,'setupvibe','--edition','server','--data-dir','/var/lib/setupvibe dados $ %','--output','json',...args]));}catch(e){throw new Error(e.stdout||e.message);}};
    const plist=JSON.parse(docker(['exec',name,'setupvibe','--output','json','collector','render','--platform','macos'])).data.unit;
    docker(['exec','-i',name,'tee','/tmp/collector.plist'],plist);
    docker(['exec',name,'plistutil','-i','/tmp/collector.plist','-o','/tmp/collector.bin','-f','bin']);
    const result=run(['collector','install','--interval','1','--yes']);assert.equal(result.data.result.active,true);
    await new Promise(r=>setTimeout(r,2200));
    const current=run(['metrics','current','--scope','host']).data;
    assert.equal(current.samples[0].fresh,true);assert.ok(current.samples[0].values.memory_total_bytes>0);
    const first=run(['collector','status']).data;assert.ok(first.pid>0);
    const restarted=run(['collector','restart','--yes']).data.result;assert.equal(restarted.active,true);assert.notEqual(restarted.pid,first.pid);
    assert.equal(run(['collector','configure','--interval','2','--yes']).data.result.interval_seconds,2);
    assert.equal(run(['collector','stop','--yes']).data.result.active,false);
    const history=run(['metrics','history','--scope','host']).data.samples;assert.ok(history.length>=2);
    assert.equal(run(['collector','start','--yes']).data.result.active,true);
    assert.equal(run(['component','update','collector','--yes']).success,true);
    console.log(JSON.stringify({supervisor:'systemd',installation:true,metrics:true,restart:true,stop_preserves_history:true,update:true}));
  }finally{try{docker(['rm','--force',name]);}catch{}try{docker(['image','rm',name]);}catch{}}
});
