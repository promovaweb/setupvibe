/** Verifica CLI e daemon reais; todos os comandos de pacote e serviço ficam dentro do contêiner. */
import strict from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {existsSync,writeFileSync,readFileSync,appendFileSync} from 'node:fs';
let checks=0;const assert=new Proxy(strict,{get(target,key){const value=Reflect.get(target,key);return typeof value==='function'?(...args)=>{checks++;return value.apply(target,args);}:value;}}),state='/root/setupvibe-test-state';
const cli=(args,path=state)=>JSON.parse(execFileSync('/usr/local/bin/setupvibe',[...args,'--json'],{encoding:'utf8',env:{...process.env,SETUPVIBE_STATE_DIR:path},timeout:180000,maxBuffer:2097152}));
try{
 assert.equal(cli(['docker-info']).installed,null);assert.equal(cli(['preview-docker']).executed,false);assert.equal(existsSync(state),false);assert.throws(()=>cli(['install-docker']));assert.equal(existsSync(state),false);
 writeFileSync('/root/service-manifest.json',JSON.stringify({schemaVersion:1,resources:[{kind:'service',id:'redis',request:{id:'redis',image:'redis@sha256:'+'a'.repeat(64),port:16379,volume:'setupvibe-redis'}}]}));
 const preview=cli(['preview-install','/root/service-manifest.json','--install-dependencies']);assert.equal(preview.status,'previewed');assert.deepEqual(preview.dependencies,[{id:'docker',version:'candidate'}]);assert.equal(existsSync(state),false);
 writeFileSync('/root/engine-manifest.json',JSON.stringify({schemaVersion:1,resources:[{kind:'application',id:'docker',version:'candidate'}]}));assert.equal(cli(['install','/root/engine-manifest.json','--confirm']).items[0].status,'succeeded');
 const installed=cli(['install-docker','--confirm']);assert.equal(installed.status,'current');assert.equal(installed.managed,true);assert.equal(installed.version,cli(['docker-info']).installed);assert.equal(cli(['install-docker','--confirm']).status,'current');
 const info=JSON.parse(execFileSync('/usr/bin/docker',['--host','unix:///var/run/docker.sock','info','--format','{{json .}}'],{encoding:'utf8'}));assert.equal(typeof info.ID,'string');assert.ok(info.ID.length>0);assert.equal(info.Driver,'vfs');
 const binary=readFileSync('/usr/bin/docker');try{appendFileSync('/usr/bin/docker',new Uint8Array([0]));assert.throws(()=>cli(['install-docker','--confirm']));}finally{writeFileSync('/usr/bin/docker',binary);}
 assert.equal(cli(['install-docker','--confirm']).status,'current');const external=cli(['install-docker','--confirm'],'/root/external-state');assert.equal(external.status,'external');assert.equal(external.managed,false);assert.equal(existsSync('/root/external-state'),false);
 const preserved=JSON.parse(execFileSync('/usr/bin/docker',['--host','unix:///var/run/docker.sock','info','--format','{{json .}}'],{encoding:'utf8'}));assert.equal(preserved.ID,info.ID);writeFileSync('/root/test-result.json',JSON.stringify({status:'passed',checks,version:installed.version}));
}catch(error){let history;try{history=cli(['history']).map(item=>cli(['history',item.id]));}catch{}writeFileSync('/root/test-result.json',JSON.stringify({status:'failed',checks,error:String(error),history}));console.error(error);}finally{execFileSync('/usr/bin/systemctl',['poweroff','--no-block']);}
