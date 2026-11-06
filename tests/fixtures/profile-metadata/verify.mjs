/** Verifica ACL/xattr de perfis pelo binário compilado, como root e usuário comum no contêiner. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync,chmodSync,chownSync,renameSync,existsSync} from 'node:fs';
const command=(file,args,options={})=>execFileSync(file,args,{encoding:'utf8',timeout:180000,env:{...process.env,LC_ALL:'C'},...options});
command('/usr/bin/apt-get',['update']);command('/usr/bin/apt-get',['install','--assume-yes','--no-install-recommends','acl','attr','util-linux'],{env:{...process.env,DEBIAN_FRONTEND:'noninteractive',LC_ALL:'C'}});
chmodSync('/usr/local/bin/setupvibe',0o755);
let checks=0;
for(const user of [{uid:0,home:'/root/profile-home'},{uid:1000,home:'/home/tester'}]){
 const home=user.home,bin=home+'/test-bin',profile=home+'/.profile',original='# profile metadata preservation\n';
 mkdirSync(home,{recursive:true,mode:0o700});mkdirSync(bin,{mode:0o700});chownSync(bin,user.uid,user.uid);writeFileSync(profile,original,{mode:0o600});chownSync(profile,user.uid,user.uid);chmodSync(profile,0o600);
 command('/usr/bin/setfacl',['--modify','user:1234:r--',profile]);command('/usr/bin/setfattr',['--name','user.setupvibe_test','--value','opaque-metadata',profile]);
 const acl=command('/usr/bin/getfacl',['--omit-header','--numeric','--absolute-names',profile]),xattr=command('/usr/bin/getfattr',['--only-values','--name','user.setupvibe_test',profile],{stdio:['ignore','pipe','ignore']});
 const cli=args=>{
  const environment=['HOME='+home,'SHELL=/bin/bash','SETUPVIBE_STATE_DIR='+home+'/.local/state/setupvibe'];
  const output=user.uid===0?command('/usr/bin/env',[...environment,'/usr/local/bin/setupvibe',...args,'--json']):command('/usr/sbin/runuser',['--user','tester','--','/usr/bin/env',...environment,'/usr/local/bin/setupvibe',...args,'--json']);return JSON.parse(output);
 };
 assert.equal(cli(['install-path',bin,'bash','--confirm']).status,'succeeded');checks++;
 const integrated=readFileSync(profile);
 if(user.uid===0){
  renameSync('/usr/bin/cp','/usr/bin/setupvibe-test-cp');
  try{let failure;try{cli(['remove-path',bin,'bash','--confirm']);}catch(error){failure=JSON.parse(error.stdout);}assert.equal(failure?.status,'failed');assert.match(failure.error,/original profile retained/);assert.deepEqual(readFileSync(profile),integrated);checks+=3;}
  finally{renameSync('/usr/bin/setupvibe-test-cp','/usr/bin/cp');}
 }
 assert.equal(cli(['remove-path',bin,'bash','--confirm']).status,'succeeded');assert.equal(readFileSync(profile,'utf8'),original);assert.equal(command('/usr/bin/getfacl',['--omit-header','--numeric','--absolute-names',profile]),acl);assert.equal(command('/usr/bin/getfattr',['--only-values','--name','user.setupvibe_test',profile],{stdio:['ignore','pipe','ignore']}),xattr);checks+=4;
 assert.equal(cli(['preview-remove-path',bin,'bash']).action,'current');checks++;
}
assert.equal(existsSync('/usr/bin/setupvibe-test-cp'),false);checks++;
console.log(JSON.stringify({status:'passed',checks}));
