/** Valida unidades, preservação de arquivos e controle sem alterar o supervisor do host. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,chmodSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
const binary=resolve(import.meta.dirname,'../target/debug/setupvibe');
function fixture(fn){
  const dir=mkdtempSync(join(tmpdir(),'setupvibe-supervisor-'));
  const data=join(dir,'dados com espaços $ e %');
  const bin=join(dir,'bin');mkdirSync(bin);
  const active=join(dir,'active');const calls=join(dir,'calls');
  const script=join(bin,'systemctl');writeFileSync(script,`#!${process.execPath}\nconst fs=require('node:fs'),a=process.argv.slice(2).filter(x=>x!=='--user');fs.appendFileSync(${JSON.stringify(calls)},JSON.stringify(a)+'\\n');if(a[0]==='stop')fs.writeFileSync(${JSON.stringify(active)},'inactive');if(['start','restart','enable'].includes(a[0]))fs.writeFileSync(${JSON.stringify(active)},'active');if(a[0]==='show')console.log('ActiveState='+(fs.existsSync(${JSON.stringify(active)})?fs.readFileSync(${JSON.stringify(active)},'utf8'):'inactive')+'\\nSubState=running\\nMainPID=123\\nUnitFileState=enabled');`);chmodSync(script,0o700);
  const env={...process.env,HOME:dir,PATH:bin,DOCKER_HOST:'',DOCKER_CONTEXT:''};
  function run(args){const r=spawnSync(binary,['--data-dir',data,'--output','json',...args],{env,encoding:'utf8',timeout:15000});assert.equal(r.error,undefined);return {code:r.status,body:JSON.parse(r.stdout),text:r.stdout};}
  const unit=join(dir,'.config/systemd/user/setupvibe-collector.service');
  try{fn({dir,data,bin,env,unit,run,calls:()=>existsSync(calls)?readFileSync(calls,'utf8'):''});}finally{rmSync(dir,{recursive:true,force:true});}
}

test('renderiza systemd e launchd com argumentos escapados sem escrita',()=>fixture(f=>{
  const linux=f.run(['collector','render','--platform','linux']);assert.equal(linux.code,0,linux.text);
  assert.match(linux.body.data.unit,/\$\$ e %%/);assert.match(linux.body.data.unit,/Restart=on-failure/);
  const mac=f.run(['collector','render','--platform','macos']);assert.equal(mac.code,0,mac.text);assert.match(mac.body.data.unit,/<key>ProgramArguments<\/key>/);assert.match(mac.body.data.unit,/<key>KeepAlive<\/key><true\/>/);
  assert.equal(f.run(['--edition','server','collector','render','--platform','macos']).code,3);
  assert.equal(f.run(['collector','install','--dry-run']).code,0);assert.equal(existsSync(f.data),false);assert.equal(existsSync(f.unit),false);
}));

test('instalação explícita preserva intervalo e permite controle com histórico',()=>fixture(f=>{
  assert.equal(f.run(['collector','install']).code,4);assert.equal(existsSync(f.unit),false);
  const first=f.run(['collector','install','--scope','user','--interval','2','--yes']);assert.equal(first.code,0,first.text);
  assert.equal(first.body.data.result.active,true);assert.equal(existsSync(join(f.data,'collector/bin/setupvibe')),true);
  const repeated=f.run(['collector','install','--interval','10','--yes']);assert.equal(repeated.code,0,repeated.text);assert.equal(repeated.body.data.result.interval_seconds,2);
  assert.equal(f.run(['collector','stop']).code,4);
  assert.equal(f.run(['collector','stop','--yes']).body.data.result.active,false);
  assert.equal(f.run(['collector','start','--yes']).body.data.result.active,true);
  assert.equal(f.run(['collector','configure','--interval','3','--yes']).body.data.result.interval_seconds,3);
  assert.equal(f.run(['collector','update','--yes']).code,0);
  assert.equal(f.run(['component','verify','collector']).code,0);
  assert.ok(f.run(['operation','list']).body.data.operations.length>=6);
}));

test('unidade externa não é adotada ou sobrescrita',()=>fixture(f=>{
  mkdirSync(join(f.dir,'.config/systemd/user'),{recursive:true});writeFileSync(f.unit,'[Service]\nExecStart=/bin/false\n');
  assert.notEqual(f.run(['collector','install','--yes']).code,0);
  assert.equal(readFileSync(f.unit,'utf8'),'[Service]\nExecStart=/bin/false\n');assert.doesNotMatch(f.calls(),/enable/);
}));

test('alteração externa após instalação impede controle e atualização',()=>fixture(f=>{
  assert.equal(f.run(['collector','install','--yes']).code,0);
  writeFileSync(f.unit,readFileSync(f.unit,'utf8')+'# ajuste externo\n');
  assert.equal(f.run(['collector','restart','--yes']).code,4);assert.equal(f.run(['collector','update','--yes']).code,4);
  assert.match(readFileSync(f.unit,'utf8'),/ajuste externo/);
}));

test('serviço não pode migrar de diretório implicitamente',()=>fixture(f=>{
  assert.equal(f.run(['collector','install','--yes']).code,0);
  const r=spawnSync(binary,['--output','json','--data-dir',join(f.dir,'outro'),'collector','stop','--yes'],{env:f.env,encoding:'utf8'});
  assert.equal(r.status,4);assert.doesNotMatch(f.calls(),/\["stop"/);
}));

test('systemd valida a unidade realmente gerada',()=>fixture(f=>{
  const rendered=f.run(['collector','render','--scope','user']).body.data.unit;
  // O validador exige executável existente; o render usa a cópia gerenciada futura.
  assert.equal(f.run(['collector','install','--yes']).code,0);
  const path=join(f.dir,'validar.service');writeFileSync(path,rendered);
  const checked=spawnSync('/usr/bin/systemd-analyze',['verify',path],{encoding:'utf8',timeout:10000});
  assert.equal(checked.status,0,checked.stderr);
}));
