/** Valida o fornecedor APT dentro do contêiner, sem processos docker exec. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {existsSync,readFileSync,writeFileSync,appendFileSync} from 'node:fs';
const state='/root/setupvibe-test-state';
const cli=(args,path=state)=>JSON.parse(execFileSync('/usr/local/bin/setupvibe',[...args,'--json'],{encoding:'utf8',env:{...process.env,SETUPVIBE_STATE_DIR:path},timeout:180000}));
const config=readFileSync('/root/.gitconfig','utf8');
assert.equal(cli(['git-info']).installed,null);
assert.equal(cli(['preview-git']).executed,false);
assert.equal(existsSync(state),false);
let installed;try{installed=cli(['install-git','--confirm']);}catch(error){for(const [bin,args] of [['/usr/bin/dpkg',['--verify','git']],['/usr/bin/dpkg-query',['--show','git']],['/usr/bin/git',['--version']]]){try{console.error(bin,execFileSync(bin,args,{encoding:'utf8'}));}catch(e){console.error(bin,e.stdout?.toString(),e.stderr?.toString());}}for(const operation of cli(['history']))console.error(JSON.stringify(cli(['history',operation.id])));throw error;}
assert.equal(installed.status,'succeeded');
assert.equal(installed.managed,true);
assert.equal(installed.version,cli(['git-info']).installed);
assert.match(execFileSync('/usr/bin/git',['--version'],{encoding:'utf8'}),/^git version /);
assert.equal(cli(['install-git','--confirm']).status,'current');
const binary=readFileSync('/usr/bin/git');
try{appendFileSync('/usr/bin/git',new Uint8Array([0]));assert.throws(()=>cli(['install-git','--confirm']));}finally{writeFileSync('/usr/bin/git',binary);}
assert.equal(cli(['install-git','--confirm']).status,'current');
assert.equal(readFileSync('/root/.gitconfig','utf8'),config);
const external=cli(['install-git','--confirm'],'/root/external-state');
assert.equal(external.status,'external');
assert.equal(external.managed,false);
assert.equal(existsSync('/root/external-state'),false);
console.log(JSON.stringify({status:'passed',version:installed.version,checks:14}));
