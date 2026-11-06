/** Serve dois releases compilados por HTTPS e verifica atualização/rollback sem publicar no GitHub. */
import strict from 'node:assert/strict';
import {createServer} from 'node:https';
import {createReadStream,readFileSync,readlinkSync,readdirSync,existsSync,appendFileSync,truncateSync,statSync,renameSync} from 'node:fs';
import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile),prefix='/root/setupvibe',bin='/root/commands',state='/root/test-state';let checks=0,requests=0,bad=false,slowMetadata=false,metadataStarted;
const assert=new Proxy(strict,{get(target,key){const value=Reflect.get(target,key);return typeof value==='function'?(...args)=>{checks++;return value.apply(target,args);}:value;}});
const old=JSON.parse(readFileSync('/root/old/release-manifest.json','utf8')),next=JSON.parse(readFileSync('/root/new/release-manifest.json','utf8'));
const server=createServer({key:readFileSync('/root/key.pem'),cert:readFileSync('/root/cert.pem')},(request,response)=>{
 requests++;const path=new URL(request.url,'https://github.com').pathname;
 for(const [release,directory] of [[old,'old'],[next,'new']]){
  const base='/promovaweb/setupvibe/releases/download/v'+release.version;
  if(path===base+'/release-manifest.json'){response.setHeader('content-type','application/json');if(slowMetadata){response.write('{"version":');metadataStarted?.();return;}response.end(JSON.stringify(release));return;}
  const artifact=release.artifacts[0];if(path===new URL(artifact.url).pathname){if(bad&&release.version===next.version){response.end('incorrect artifact');return;}const file='/root/'+directory+'/'+path.split('/').at(-1);response.setHeader('content-length',statSync(file).size);createReadStream(file).pipe(response);return;}
 }
 response.writeHead(404);response.end();
});server.on('tlsClientError',()=>{});await new Promise(resolve=>server.listen(443,'0.0.0.0',resolve));
const env={...process.env,CURL_CA_BUNDLE:'/root/cert.pem',NODE_EXTRA_CA_CERTS:'/root/cert.pem',SSL_CERT_FILE:'/root/cert.pem',SETUPVIBE_STATE_DIR:state,NO_PROXY:'github.com,127.0.0.1',no_proxy:'github.com,127.0.0.1',HTTPS_PROXY:'',HTTP_PROXY:'',ALL_PROXY:''};
const install=()=>exec('/bin/bash',['/root/old/install.sh','--confirm','--server','--no-path','--install-dependencies','--prefix',prefix,'--bin-directory',bin],{env,timeout:180000,maxBuffer:2097152});
const cli=async(args,allowFailure=false,environment=env)=>{try{return JSON.parse((await exec(bin+'/setupvibe',[...args,'--json'],{env:environment,timeout:180000,maxBuffer:2097152})).stdout);}catch(error){if(allowFailure&&error.stdout)return JSON.parse(error.stdout);throw error;}};
const version=async()=>(await exec(bin+'/setupvibe',['--version'],{env,timeout:10000})).stdout.trim();
try{
 await install();assert.equal(await version(),old.version);const previous=readlinkSync(prefix+'/current'),launcher=readFileSync(prefix+'/launch'),files=readdirSync(prefix).sort(),beforeQuery=requests;
 assert.equal(existsSync(state),false);const untrusted={...env};for(const key of ['NODE_EXTRA_CA_CERTS','SSL_CERT_FILE','CURL_CA_BUNDLE','NODE_TLS_REJECT_UNAUTHORIZED'])delete untrusted[key];await assert.rejects(cli(['preview-update',next.version],false,untrusted));assert.equal(existsSync(state),false);assert.deepEqual(readdirSync(prefix).sort(),files);
 const preview=await cli(['preview-update',next.version]);assert.equal(preview.action,'update');assert.equal(preview.executed,false);assert.deepEqual(readdirSync(prefix).sort(),files);assert.equal(existsSync(state),false);assert.equal(requests,beforeQuery+1);
 slowMetadata=true;const started=new Promise(resolve=>{metadataStarted=resolve;}),child=spawn(bin+'/setupvibe',['preview-update',next.version,'--json'],{env,stdio:['ignore','pipe','pipe']});let cancelOutput='';child.stdout.on('data',chunk=>{cancelOutput+=chunk;});child.stderr.resume();
 const closed=new Promise(resolve=>child.once('close',code=>resolve(code)));await Promise.race([started,new Promise((_,reject)=>setTimeout(()=>reject(Error('Metadata query did not start.')),10000).unref())]);child.kill('SIGTERM');assert.equal(await Promise.race([closed,new Promise((_,reject)=>setTimeout(()=>reject(Error('Metadata query did not cancel.')),5000).unref())]),130);const cancelled=JSON.parse(cancelOutput);assert.equal(cancelled.status,'cancelled');assert.equal(cancelled.executed,false);assert.equal(existsSync(state),false);assert.deepEqual(readdirSync(prefix).sort(),files);slowMetadata=false;
 const beforeRefusal=requests;await assert.rejects(cli(['update',next.version]),/Explicit confirmation/);assert.equal(requests,beforeRefusal);
 bad=true;assert.equal((await cli(['update',next.version,'--confirm'],true)).status,'failed');assert.equal(await version(),old.version);assert.equal(readlinkSync(prefix+'/current'),previous);
 bad=false;assert.equal((await cli(['update',next.version,'--confirm'])).status,'succeeded');assert.equal(await version(),next.version);assert.deepEqual(readFileSync(prefix+'/launch'),launcher);assert.equal(existsSync(prefix+'/'+previous),true);assert.deepEqual((await cli(['catalog'])).map(item=>item.id).sort(),['collector','docker','gh','git','portainer','tailscale']);
 assert.equal((await cli(['update',next.version,'--confirm'])).status,'current');
 const oldSize=statSync(prefix+'/'+previous).size;appendFileSync(prefix+'/'+previous,Buffer.from([0]));await assert.rejects(cli(['rollback','--confirm']),/checksum/);assert.equal(await version(),next.version);truncateSync(prefix+'/'+previous,oldSize);

 // Executa a atualização pelo terminal real; o lançador continua apontando para o processo antigo até encerrar.
 assert.equal((await cli(['rollback','--confirm'])).status,'succeeded');assert.equal(await version(),old.version);
 const terminal=spawn('/usr/bin/script',['--quiet','--return','--command','stty cols 100 rows 30; exec /root/commands/setupvibe','/dev/null'],{env:{...env,TERM:'xterm-256color'},stdio:['pipe','pipe','pipe']});let screen='',terminalClosed=false;
 const terminalExit=new Promise(resolve=>terminal.once('close',code=>{terminalClosed=true;resolve(code);}));terminal.stdout.on('data',chunk=>{screen+=chunk;});terminal.stderr.on('data',chunk=>{screen+=chunk;});
 const waitText=async text=>{const end=Date.now()+20000;while(!screen.includes(text)){if(terminalClosed||Date.now()>end)throw Error('TUI did not show '+text+': '+screen.slice(-4000));await new Promise(resolve=>setTimeout(resolve,25));}assert.ok(screen.includes(text));};
 try{
  await waitText('Prepare your environment');terminal.stdin.write('6');await waitText('Software updates');
  terminal.stdin.write('u');await waitText('Fixed version');terminal.stdin.write(next.version+'\r');await waitText('Update review');
  terminal.stdin.write('c');await waitText('Type UPDATE');terminal.stdin.write('UPDATE\r');await waitText('Result: Completed');
  terminal.stdin.write('\x11');assert.equal(await Promise.race([terminalExit,new Promise((_,reject)=>setTimeout(()=>reject(Error('TUI did not exit.')),5000).unref())]),0);
 }finally{if(!terminalClosed)terminal.kill('SIGKILL');}
 assert.equal(await version(),next.version);assert.deepEqual(readFileSync(prefix+'/launch'),launcher);
 // Simula encerramento após ativar current e antes de promover o journal pendente.
 renameSync(prefix+'/.setupvibe-update.json',prefix+'/.setupvibe-update-pending.json');server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
 assert.equal((await cli(['preview-rollback'])).action,'rollback');assert.equal((await cli(['rollback','--confirm'])).status,'succeeded');assert.equal(await version(),old.version);assert.equal(readlinkSync(prefix+'/current'),previous);assert.equal((await cli(['rollback','--confirm'])).status,'current');
 await install();assert.equal(await version(),old.version);assert.deepEqual(readFileSync(prefix+'/launch'),launcher);assert.equal(existsSync(prefix+'/.bootstrap-lock'),false);
 await exec('/bin/bash',['/root/new/install.sh','--confirm','--server','--no-path','--prefix',prefix,'--bin-directory',bin],{env,timeout:30000,maxBuffer:2097152});assert.equal(await version(),next.version);assert.equal((await cli(['rollback','--confirm'])).status,'succeeded');assert.equal(await version(),old.version);
 console.log(JSON.stringify({status:'passed',checks,oldVersion:old.version,newVersion:next.version}));
}finally{if(server.listening){server.closeAllConnections();server.close();}}
