/** Confere artefatos reais com HTTPS local e execução em três distribuições descartáveis. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtempSync,readFileSync,writeFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,basename} from 'node:path';
import {createServer} from 'node:https';
import {randomUUID} from 'node:crypto';
const root=resolve(import.meta.dirname,'../..');
const version=readFileSync(join(root,'Cargo.toml'),'utf8').match(/^version = "([^"]+)"/m)[1];
const target=process.arch==='arm64'?'aarch64-unknown-linux-musl':'x86_64-unknown-linux-musl';
const binary=edition=>join(root,'dist',`setupvibe-${edition}-${version}-${target}`);
const exec=promisify(execFile);
for(const edition of ['desktop','server'])test(`distribuição: bootstrap ${edition} via HTTPS e SHA-256 reais`,{timeout:60000},async()=>{
 assert.ok(existsSync(binary(edition)),'Execute npm run build:linux antes da integração');
 const dir=mkdtempSync(join(tmpdir(),'setupvibe-https-'));
 const key=join(dir,'key.pem'),cert=join(dir,'cert.pem');
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN=localhost','-addext','subjectAltName=IP:127.0.0.1'],{stdio:'ignore'});
 const requests=[];
 const server=createServer({key:readFileSync(key),cert:readFileSync(cert)},(req,res)=>{
  const name=basename(req.url);requests.push(name);
  if(![basename(binary(edition)),basename(binary(edition))+'.sha256'].includes(name)){res.writeHead(404);res.end();return;}
  res.end(readFileSync(join(root,'dist',name)));
 });
 try{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const env={...process.env,HOME:dir,SETUPVIBE_INSTALL_DIR:join(dir,'bin'),SETUPVIBE_DOWNLOAD_BASE:`https://127.0.0.1:${server.address().port}`,CURL_CA_BUNDLE:cert};
  delete env.SETUPVIBE_EDITION;
  for(let n=0;n<2;n++)await exec('/bin/bash',[join(root,`${edition}.sh`),'--non-interactive'],{env,timeout:30000});
  const installed=join(dir,'bin/setupvibe');
  const parsed=JSON.parse((await exec(installed,['--output','json','catalog','list'],{env})).stdout);
  assert.equal(parsed.data.components.length,edition==='server'?6:26);
  const override=JSON.parse((await exec(installed,['--edition',edition==='server'?'desktop':'server','--output','json','catalog','list'],{env})).stdout);
  assert.equal(override.data.components.length,edition==='server'?26:6);
  const current=JSON.parse((await exec(installed,['--output','json','metrics','current'],{env})).stdout);
  assert.equal(current.data.has_more,false);assert.equal(current.data.next_offset,null);
  await assert.rejects(exec(installed,['--output','json','metrics','history','--after','18446744073709551615'],{env}),error=>error.code===2&&JSON.parse(error.stdout).success===false);
  await assert.rejects(exec(installed,['--output','json','metrics','history','--after','1','--offset','1'],{env}),error=>error.code===2);
  assert.equal(existsSync(join(dir,'.local/share/setupvibe')),false);
  assert.equal(requests.length,4);
 }finally{await new Promise(r=>server.close(r));rmSync(dir,{recursive:true,force:true});}
});
for(const image of ['debian:12-slim','debian:13-slim','ubuntu:24.04'])test(`distribuição: binário estático e SQLite em ${image}`,{timeout:180000},()=>{
 const name=`setupvibe-dist-${randomUUID()}`;
 const docker=args=>execFileSync('docker',args,{encoding:'utf8',timeout:180000,maxBuffer:4*1024*1024});
 try{
  docker(['run','--detach','--name',name,'--volume',`${binary('server')}:/usr/local/bin/setupvibe:ro`,image,'sleep','infinity']);
  const run=args=>JSON.parse(docker(['exec',name,'setupvibe','--output','json',...args]));
  assert.equal(run(['catalog','list']).data.components.length,6);
  const empty=run(['metrics','history']).data;
  assert.equal(empty.next_after,null);assert.equal(empty.order,'insertion_id');
  assert.equal(run(['state','init','--yes']).success,true);
  assert.equal(run(['collector','run','--once','--yes']).success,true);
  assert.equal(run(['metrics','current']).success,true);
  console.log(JSON.stringify({image,target,version,checks:['catalog','state','collector','metrics']}));
 }finally{try{docker(['rm','--force',name]);}catch{}}
});
