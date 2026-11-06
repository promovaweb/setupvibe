/** Serve HTTPS local e testa o bootstrap no contêiner, sem instalações no host. */
import strict from 'node:assert/strict';
import {createServer} from 'node:https';
import {createReadStream,readFileSync,writeFileSync,mkdirSync,existsSync,readlinkSync,readdirSync,symlinkSync} from 'node:fs';
import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
const exec=promisify(execFile),installer='/root/install.sh',prefix='/root/install-root',bin='/root/commands';
let checks=0;
const assert=new Proxy(strict,{get(target,key){const value=Reflect.get(target,key);return typeof value==='function'?(...args)=>{checks++;return value.apply(target,args);}:value;}});
const originals=new Map(['/root/.bash_profile','/root/.bash_login','/root/.profile','/root/.bashrc'].map(path=>[path,existsSync(path)?readFileSync(path):null]));
let requests=0,mode='valid',slowRequest;
const server=createServer({key:readFileSync('/root/key.pem'),cert:readFileSync('/root/cert.pem')},(request,response)=>{
 requests++;
 if(mode==='slow'){response.writeHead(200);response.write('partial');slowRequest?.();return;}
 if(mode==='bad'){response.end('incorrect artifact');return;}
 response.writeHead(200,{'content-length':readFileSync('/root/artifact').length});createReadStream('/root/artifact').pipe(response);
});
server.on('tlsClientError',()=>{});
await new Promise(resolve=>server.listen(9443,'127.0.0.1',resolve));
const environment={...process.env,CURL_CA_BUNDLE:'/root/cert.pem'};
const args=(root=prefix,commands=bin)=>[installer,'--prefix',root,'--bin-directory',commands];
const run=(extra=[],root=prefix,commands=bin,env=environment)=>exec('/bin/bash',[...args(root,commands),...extra],{env,timeout:180000,maxBuffer:2097152});
try{
 await run();assert.equal(existsSync(prefix),false);assert.equal(requests,0);
 // A imagem começa sem curl; somente esta execução confirmada prepara os pacotes de transporte.
 await run(['--confirm','--install-dependencies']);
 assert.equal(requests,1);assert.equal(readlinkSync(bin+'/setupvibe'),prefix+'/launch');
 const current=readlinkSync(prefix+'/current'),binary=readFileSync(prefix+'/'+current),expected=JSON.parse(readFileSync('/root/manifest.json','utf8')).version;
 assert.equal((await exec(bin+'/setupvibe',['--version'])).stdout.trim(),expected);
 const pathPreview=JSON.parse((await exec(bin+'/setupvibe',['preview-path',bin,'bash','--json'])).stdout);assert.equal(pathPreview.action,'current');
 for(const path of pathPreview.profiles){const original=originals.get(path);if(original)assert.deepEqual(readFileSync(path).subarray(0,original.length),original);}
 const afterPath=pathPreview.profiles.map(path=>readFileSync(path));
 const cleanEnvironment={...environment,PATH:'/usr/bin:/bin'};
 assert.equal((await exec('/bin/bash',['--login','-c','command -v setupvibe'],{env:cleanEnvironment})).stdout.trim(),bin+'/setupvibe');
 assert.equal((await exec('/bin/bash',['-i','-c','command -v setupvibe'],{env:cleanEnvironment})).stdout.trim(),bin+'/setupvibe');
 await run(['--confirm']);assert.equal(requests,1);assert.equal(readlinkSync(prefix+'/current'),current);
 for(const [index,path] of pathPreview.profiles.entries())assert.deepEqual(readFileSync(path),afterPath[index]);
 writeFileSync(prefix+'/'+current,Buffer.concat([binary,Buffer.from([0])]));await assert.rejects(run(['--confirm']),/Managed release bytes changed/);assert.equal(readlinkSync(prefix+'/current'),current);writeFileSync(prefix+'/'+current,binary);
 mkdirSync('/root/external-bin');writeFileSync('/root/external-bin/setupvibe','external');
 await assert.rejects(run(['--confirm'],'/root/external-prefix','/root/external-bin'),/external file/);assert.equal(readFileSync('/root/external-bin/setupvibe','utf8'),'external');
 mkdirSync('/root/foreign-root');writeFileSync('/root/foreign-root/foreign','preserved');await assert.rejects(run(['--confirm'],'/root/foreign-root','/root/foreign-bin'),/external files/);assert.equal(readFileSync('/root/foreign-root/foreign','utf8'),'preserved');
 mkdirSync('/root/real-path');symlinkSync('/root/real-path','/root/linked-path');await assert.rejects(run(['--confirm'],'/root/linked-path/install','/root/linked-bin'),/symlinks/);assert.equal(existsSync('/root/real-path/install'),false);
 mkdirSync('/root/unowned-bin');symlinkSync('/root/unowned-root/launch','/root/unowned-bin/setupvibe');await assert.rejects(run(['--confirm'],'/root/unowned-root','/root/unowned-bin'),/ownership receipt/);assert.equal(readlinkSync('/root/unowned-bin/setupvibe'),'/root/unowned-root/launch');
 const oldPrefix='/root/update-root',oldName='setupvibe-2.0.0-test.previous-linux-x64';mkdirSync(oldPrefix);writeFileSync(oldPrefix+'/.setupvibe-bootstrap','setupvibe-bootstrap-v1\n');writeFileSync(oldPrefix+'/'+oldName,'previous');writeFileSync(oldPrefix+'/'+oldName+'.sha256',createHash('sha256').update('previous').digest('hex')+'\n');
 symlinkSync(oldName,oldPrefix+'/current');
 mode='bad';await assert.rejects(run(['--confirm'],oldPrefix,'/root/update-bin'),/checksum/);assert.equal(readlinkSync(oldPrefix+'/current'),oldName);assert.equal(readFileSync(oldPrefix+'/'+oldName,'utf8'),'previous');
 mode='valid';const untrusted={...environment};delete untrusted.CURL_CA_BUNDLE;await assert.rejects(run(['--confirm'],oldPrefix,'/root/update-bin',untrusted));assert.equal(readlinkSync(oldPrefix+'/current'),oldName);
 mode='slow';
 const started=new Promise(resolve=>{slowRequest=resolve;});
 const child=spawn('/bin/bash',[...args(oldPrefix,'/root/update-bin'),'--confirm'],{env:environment,stdio:['ignore','pipe','pipe']});let errors='';child.stdout.resume();child.stderr.on('data',chunk=>{errors+=chunk;});
 const closed=new Promise(resolve=>child.once('close',(code,signal)=>resolve({code,signal})));
 await Promise.race([started,new Promise((_,reject)=>setTimeout(()=>reject(Error('Slow download did not start: '+errors)),10000).unref())]);child.kill('SIGTERM');
 const outcome=await Promise.race([closed,new Promise((_,reject)=>setTimeout(()=>reject(Error('Bootstrap did not cancel.')),5000).unref())]);assert.equal(outcome.code,143);assert.equal(readlinkSync(oldPrefix+'/current'),oldName);assert.equal(existsSync(oldPrefix+'/.bootstrap-lock'),false);assert.equal(readdirSync(oldPrefix).some(name=>name.startsWith('.bootstrap-download-')),false);
 mode='valid';await run(['--confirm'],oldPrefix,'/root/update-bin');assert.notEqual(readlinkSync(oldPrefix+'/current'),oldName);assert.equal(readFileSync(oldPrefix+'/'+oldName,'utf8'),'previous');
 await run(['--confirm','--server'],'/root/server-root','/root/server-bin');assert.equal((await exec('/root/server-bin/setupvibe',['--version'])).stdout.trim(),expected);assert.deepEqual(JSON.parse((await exec('/root/server-bin/setupvibe',['catalog','--json'])).stdout).map(item=>item.id).sort(),['collector','docker','gh','git','portainer','tailscale']);
 await assert.rejects(run(['--confirm','--server']),/edition or launcher/);assert.equal(readlinkSync(prefix+'/current'),current);
 const beforeSkip=pathPreview.profiles.map(path=>readFileSync(path));await run(['--confirm','--no-path'],'/root/skip-root','/root/skip-bin');for(const [index,path] of pathPreview.profiles.entries())assert.deepEqual(readFileSync(path),beforeSkip[index]);
 const login=pathPreview.profiles[0];writeFileSync(login,Buffer.concat([readFileSync(login),Buffer.from('# user addition\n')]));
 assert.equal(JSON.parse((await exec(bin+'/setupvibe',['remove-path',bin,'bash','--confirm','--json'])).stdout).status,'succeeded');assert.equal(readFileSync(login,'utf8').includes('# user addition\n'),true);
 assert.equal(JSON.parse((await exec('/root/server-bin/setupvibe',['preview-path','/root/server-bin','bash','--json'])).stdout).action,'current');assert.equal((await exec('/bin/bash',['--login','-c','command -v setupvibe'],{env:cleanEnvironment})).stdout.trim(),'/root/server-bin/setupvibe');
 console.log(JSON.stringify({status:'passed',checks,version:expected}));
}finally{server.closeAllConnections();server.close();}
