/** Verifica propriedade e execução usando gerenciadores Node controlados em área privada. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync, spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync, readFileSync, rmSync, existsSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
const binary=resolve(import.meta.dirname,'../target/debug/setupvibe');

async function fixture(fn) {
  const dir=mkdtempSync(join(tmpdir(),'setupvibe-adapters-'));
  const bin=join(dir,'bin');mkdirSync(bin);
  const log=join(dir,'commands.jsonl');
  function script(name,code) {const file=join(bin,name);writeFileSync(file,`#!${process.execPath}\n${code}`);chmodSync(file,0o700);return file;}
  const preamble=`const fs=require('node:fs');const a=process.argv.slice(2);fs.appendFileSync(${JSON.stringify(log)},JSON.stringify({exe:require('node:path').basename(process.argv[1]),args:a})+'\\n');`;
  const env={...process.env,HOME:dir,PATH:bin};
  const run=args=>{
    const r=spawnSync(binary,['--output','json','--data-dir',join(dir,'state'),...args],{env,encoding:'utf8',timeout:15000});
    assert.equal(r.error,undefined);return {code:r.status,body:JSON.parse(r.stdout)};
  };
  const commands=()=>existsSync(log)?readFileSync(log,'utf8').trim().split('\n').map(x=>JSON.parse(x)):[];
  try {await fn({dir,bin,script,preamble,run,commands});} finally {rmSync(dir,{recursive:true,force:true});}
}

function systemFixture(f,{failGh=false,external=false}={}) {
  for(const name of ['git','gh'])f.script(name,f.preamble+`process.stdout.write('${name} '+(fs.existsSync(${JSON.stringify(join(f.dir,name+'.updated'))})?'2.0':'1.0'));`);
  f.script('brew',f.preamble+'process.stdout.write(JSON.stringify({formulae:[],casks:[]}));');
  f.script('dpkg-query',f.preamble+(external?'process.exit(1);':`const name=require('node:path').basename(a[1]);if(['git','gh'].includes(name))process.stdout.write(name+': '+a[1]);else process.exit(1);`));
  f.script('apt-get',f.preamble+`const pkg=a.at(-1);if(pkg==='gh'&&${failGh}){process.stderr.write('falha planejada');process.exit(1);}fs.writeFileSync(require('node:path').join(${JSON.stringify(f.dir)},pkg+'.updated'),'ok');`);
  f.script('sudo',f.preamble+`const cp=require('node:child_process');const index=a.findIndex(x=>x.endsWith('apt-get'));const r=cp.spawnSync(a[index],a.slice(index+1),{encoding:'utf8'});process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');process.exit(r.status);`);
  f.script('apt-cache',f.preamble+`process.stdout.write('  Installed: 1.0\\n  Candidate: 2.0\\n');`);
}

test('instalação existente é preservada sem executar apt-get',()=>fixture(f=>{
  systemFixture(f);
  const r=f.run(['component','install','git','--yes']);
  assert.equal(r.code,0);assert.equal(r.body.data.results[0].status,'unchanged');
  assert.equal(r.body.data.results[0].observed.managed,false);
  assert.equal(f.commands().some(c=>c.exe==='apt-get'),false);
}));

test('atualização usa proprietário APT e verifica a versão final',()=>fixture(f=>{
  systemFixture(f);
  const r=f.run(['component','update','git','--yes']);
  assert.equal(r.code,0);
  assert.equal(r.body.data.results[0].observed.owner,'system:git');
  assert.match(r.body.data.results[0].observed.version,/2.0/);
  const command=f.commands().find(c=>c.exe==='apt-get'&&c.args.includes('install'));
  assert.ok(command.args.includes('--only-upgrade'));assert.equal(command.args.at(-1),'git');
}));

test('falha parcial preserva sucesso e histórico por componente',()=>fixture(f=>{
  systemFixture(f,{failGh:true});
  const r=f.run(['component','update','git','gh','--yes']);
  assert.equal(r.code,5);assert.equal(r.body.success,false);
  assert.equal(r.body.data.results.find(x=>x.component==='git').status,'succeeded');
  const history=f.run(['operation','show',r.body.data.operation_id]).body.data.operations[0];
  assert.equal(history.status,'partial');assert.equal(history.steps.find(x=>x.component==='gh').status,'failed');
}));

test('origem externa não é adotada nem atualizada',()=>fixture(f=>{
  systemFixture(f,{external:true});
  const r=f.run(['component','update','git','--yes']);
  assert.equal(r.code,4);assert.equal(f.commands().some(c=>c.exe==='apt-get'),false);
}));

test('consulta APT não atualiza índices nem instala',()=>fixture(f=>{
  systemFixture(f);
  const r=f.run(['updates','list','git']);
  assert.equal(r.code,0);assert.equal(r.body.data.updates[0].available,true);
  assert.equal(f.commands().some(c=>c.exe==='apt-get'),false);
}));

test('prévia exibe comando do proprietário sem escrever banco',()=>fixture(f=>{
  systemFixture(f);
  const r=f.run(['component','update','git','--dry-run']);
  assert.equal(r.code,0);assert.equal(r.body.data.observations[0].command.executable,'apt-get');
  assert.equal(existsSync(join(f.dir,'state')),false);
  assert.equal(f.commands().some(c=>c.exe==='apt-get'),false);
}));

test('mise usa JSON e atualiza somente escopo global sem bump',()=>fixture(f=>{
  f.script('node',f.preamble+`process.stdout.write('v24.0.0');`);
  f.script('dpkg-query','process.exit(1);');
  f.script('mise',f.preamble+`if(a[0]==='ls')process.stdout.write(JSON.stringify([{version:'24.0.0',install_path:${JSON.stringify(f.dir)}}]));else if(a[0]==='outdated')process.stdout.write(JSON.stringify({node:{current:'24.0.0',latest:'24.1.0'}}));else process.stdout.write('mise 2026');`);
  const updates=f.run(['updates','list','node']);
  assert.equal(updates.code,0);assert.equal(updates.body.data.updates[0].available,true);
  const r=f.run(['component','update','node','--yes']);assert.equal(r.code,0);
  const command=f.commands().find(c=>c.exe==='mise'&&c.args[0]==='upgrade');
  assert.deepEqual(command.args,['upgrade','--global','node','--yes']);
}));

test('versão alvo malformada é recusada antes de subprocessos',()=>fixture(f=>{
  const r=f.run(['component','update','node','--target-version','24;touch /tmp/proibido','--yes']);
  assert.equal(r.code,2);assert.deepEqual(f.commands(),[]);
}));

test('Homebrew comprova prefixo, lê JSON e atualiza somente a fórmula selecionada',()=>fixture(f=>{
  const prefix=join(f.dir,'Cellar','git','1.0');mkdirSync(join(prefix,'bin'),{recursive:true});
  const actual=join(prefix,'bin','git');
  writeFileSync(actual,`#!${process.execPath}\nprocess.stdout.write('git 1.0');`);chmodSync(actual,0o700);
  // O caminho no PATH é um symlink para o prefixo comprovado pelo Homebrew.
  f.script('git','process.stdout.write("git 1.0");');
  rmSync(join(f.bin,'git'));
  symlinkSync(actual,join(f.bin,'git'));
  f.script('dpkg-query','process.exit(1);');
  f.script('brew',f.preamble+`if(a[0]==='info')process.stdout.write(JSON.stringify({formulae:[{name:'git',installed:[{version:'1.0'}]}],casks:[]}));else if(a[0]==='--prefix')process.stdout.write(${JSON.stringify(prefix)});else if(a[0]==='outdated')process.stdout.write(JSON.stringify({formulae:[{name:'git',installed_versions:['1.0'],current_version:'2.0'}],casks:[]}));`);
  const inspected=f.run(['component','inspect','git']);assert.equal(inspected.body.data.owner,'brew:git');
  const updates=f.run(['updates','list','git']);assert.equal(updates.body.data.updates[0].available,true);
  assert.equal(f.run(['component','update','git','--yes']).code,0);
  const command=f.commands().find(c=>c.exe==='brew'&&c.args[0]==='upgrade');
  assert.deepEqual(command.args,['upgrade','git']);
}));

test('duas mutações em diretórios distintos disputam o mesmo lock do host',()=>fixture(async f=>{
  systemFixture(f);
  f.script('apt-get',f.preamble+'setTimeout(()=>{},800);');
  const child=spawn(binary,['--output','json','--data-dir',join(f.dir,'primeiro'),'component','update','git','--yes'],{env:{...process.env,HOME:f.dir,PATH:f.bin},stdio:['ignore','pipe','pipe']});
  const finished=new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',code=>resolve(code));});
  try {
    for(let i=0;i<100&&!f.commands().some(c=>c.exe==='apt-get');i++)await new Promise(resolve=>setTimeout(resolve,10));
    assert.ok(f.commands().some(c=>c.exe==='apt-get'));
    const second=f.run(['component','update','git','--yes']);
    assert.equal(second.code,6);
    assert.equal(await finished,0);
  } finally {if(child.exitCode===null)child.kill('SIGTERM');}
}));

test('comando dedicado Herdr compartilha plano, recibo e atualização sem perfis',()=>fixture(f=>{
  for(const name of ['bash','tar','gzip','unzip','xz'])f.script(name,'process.exit(0);');
  f.script('dpkg-query','process.exit(1);');
  const destination=join(f.dir,'.local/bin/herdr');
  const installer='#!/bin/bash\n'+process.execPath+" <<'INSTALL_NODE'\n"+`const fs=require('node:fs');fs.mkdirSync(${JSON.stringify(join(f.dir,'.local/bin'))},{recursive:true});fs.writeFileSync(${JSON.stringify(destination)},${JSON.stringify('#!'+process.execPath+'\nprocess.stdout.write("herdr 1.0.0");')},{mode:0o755});`+'\nINSTALL_NODE\n';
  f.script('curl',f.preamble+`fs.writeFileSync(a[a.indexOf('--output')+1],${JSON.stringify(installer)});`);
  writeFileSync(join(f.dir,'.bashrc'),'# configuração preservada\n');
  const preview=f.run(['herdr','install','--dry-run']);
  assert.equal(preview.code,0);assert.equal(preview.body.data.observations[0].command.executable,'setupvibe-vendor');
  assert.equal(f.commands().some(c=>c.exe==='curl'),false);
  const installed=f.run(['herdr','install','--yes']);
  assert.equal(installed.code,0,JSON.stringify(installed.body));
  assert.equal(installed.body.data.results[0].observed.owner,'vendor:herdr');
  assert.equal(f.run(['herdr','verify']).code,0);
  assert.equal(f.run(['herdr','update','--yes']).code,0);
  assert.equal(readFileSync(join(f.dir,'.bashrc'),'utf8'),'# configuração preservada\n');
  const download=f.commands().find(c=>c.exe==='curl');
  assert.equal(download.args.at(-1),'https://herdr.dev/install.sh');
  assert.ok(download.args.includes('--proto-redir'));
  assert.equal(f.run(['updates','list','herdr']).body.data.updates[0].available,null);
}));

test('aliases de aplicativos Desktop são recusados na Server antes de dependências',()=>fixture(f=>{
  for(const app of ['herdr','codex','claude','antigravity','opencode','kimi','ansible']){
    const r=f.run(['--edition','server',app,'install','--yes']);assert.equal(r.code,3,app);
  }
  assert.deepEqual(f.commands(),[]);assert.equal(existsSync(join(f.dir,'state')),false);
}));

test('resposta HTML de fornecedor é recusada antes da execução',()=>fixture(f=>{
  for(const name of ['bash','tar','gzip','unzip','xz'])f.script(name,'process.exit(0);');
  f.script('curl',f.preamble+`fs.writeFileSync(a[a.indexOf('--output')+1],'<html>erro</html>');`);
  const r=f.run(['herdr','install','--yes']);assert.equal(r.code,4);
  assert.equal(existsSync(join(f.dir,'.local/bin/herdr')),false);
}));

test('Tailscale verifica sem autenticar e não expõe comandos de rede',()=>fixture(f=>{
  f.script('tailscale',f.preamble+`if(a[0]==='version')process.stdout.write('1.104.2');else if(a[0]==='status'&&a[1]==='--json')process.stdout.write(JSON.stringify({BackendState:'NeedsLogin',AuthURL:'https://example.invalid/segredo-login',Peer:{privado:'nao-expor'}}));else process.exit(99);`);
  f.script('dpkg-query',f.preamble+`process.stdout.write('tailscale: '+a[1]);`);
  const verification=f.run(['--edition','server','tailscale','verify']);assert.equal(verification.code,0);
  assert.equal(verification.body.data.diagnostic.authentication_state,'needs_login');assert.doesNotMatch(JSON.stringify(verification.body),/segredo-login|nao-expor/);
  assert.equal(f.run(['tailscale','install','--yes']).body.data.results[0].status,'unchanged');
  for(const command of ['up','login','logout','serve','services','funnel'])assert.equal(f.run(['tailscale',command,'--yes']).code,2);
  assert.ok(f.commands().filter(c=>c.exe==='tailscale').every(c=>(c.args.length===1&&c.args[0]==='version')||(c.args[0]==='status'&&c.args[1]==='--json')));
}));

test('instalação externa presente não instala dependências do catálogo',()=>fixture(f=>{
  f.script('ansible',f.preamble+`process.stdout.write('ansible externo');`);
  f.script('dpkg-query','process.exit(1)');
  const preview=f.run(['component','install','ansible','--dry-run']);
  assert.equal(preview.code,0);assert.deepEqual(preview.body.data.plan.steps.map(s=>s.component),['ansible']);
  const r=f.run(['component','install','ansible','--yes']);assert.equal(r.code,0);
  assert.deepEqual(r.body.data.results.map(s=>s.component),['ansible']);
  assert.equal(f.commands().some(c=>['curl','sudo','apt-get'].includes(c.exe)||(c.exe==='brew'&&c.args.includes('install'))),false);
}));

test('atualizar serviço ausente não instala Docker',()=>fixture(f=>{
  f.script('docker',f.preamble+'process.exit(1)');
  const r=f.run(['component','update','redis','--yes']);
  assert.notEqual(r.code,0);assert.deepEqual(r.body.data.results.map(s=>s.component),['redis']);
  assert.equal(f.commands().some(c=>['curl','sudo','apt-get'].includes(c.exe)),false);
}));

test('versão alvo exige versão global mise correspondente, não apenas exit zero',()=>fixture(f=>{
  f.script('node',f.preamble+`process.stdout.write('v24.0.0');`);
  f.script('dpkg-query','process.exit(1)');
  f.script('mise',f.preamble+`if(a[0]==='ls')process.stdout.write(JSON.stringify([{version:'24.0.0',install_path:${JSON.stringify(f.dir)}}]));else process.stdout.write('mise 2026');`);
  assert.equal(f.run(['component','update','node','--target-version','25','--yes']).code,4);
  assert.equal(f.run(['component','update','node','--target-version','24','--yes']).code,0);
  const n=f.commands().filter(c=>c.exe==='mise'&&c.args[0]==='use').length;
  assert.equal(f.run(['component','install','node','--target-version','25','--yes']).code,4);
  assert.equal(f.commands().filter(c=>c.exe==='mise'&&c.args[0]==='use').length,n);
  assert.equal(f.run(['component','update','node','--target-version','latest','--yes']).code,2);
}));

test('arquivo sem permissão de execução não é reconhecido como aplicativo',()=>fixture(f=>{
  mkdirSync(join(f.dir,'.local/bin'),{recursive:true});writeFileSync(join(f.dir,'.local/bin/codex'),'conteúdo sem execução',{mode:0o600});
  assert.equal(f.run(['component','inspect','codex']).body.data.present,false);
}));

test('serviço em máquina sem Docker mantém dependência e prévia adiada explícita',()=>fixture(f=>{
  const r=f.run(['component','install','redis','--dry-run']);
  assert.equal(r.code,0);assert.equal(r.body.data.ready,true);
  assert.deepEqual(r.body.data.plan.steps.map(s=>s.component),['docker','redis']);
  assert.equal(r.body.data.observations.find(s=>s.component==='redis').deferred,true);
  assert.equal(existsSync(join(f.dir,'state')),false);
}));
