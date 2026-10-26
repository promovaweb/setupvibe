/** Exercita os bootstraps reais com transporte substituído; nenhum download é executado no host. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync,symlinkSync,chmodSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const root=resolve(import.meta.dirname,'..');
const version=readFileSync(join(root,'Cargo.toml'),'utf8').match(/^version = "([^"]+)"/m)[1];
/** Cria diretório privado e curl falso, preservando flags HTTPS e checksum reais. */
function fixture(){
 const dir=mkdtempSync(join(tmpdir(),'setupvibe-bootstrap-'));const bin=join(dir,'bin');mkdirSync(bin);
 const curl=`#!${process.execPath}\nimport fs from 'node:fs';import crypto from 'node:crypto';import path from 'node:path';
 const args=process.argv.slice(2);if(args[0]!=='-q'||!args.includes('=https'))process.exit(90);
 if(process.env.FAIL_DOWNLOAD==='1')process.exit(22);
 const url=args.at(-1),out=args[args.indexOf('--output')+1];
 const content=process.env.HTML==='1'?'<html>erro</html>':${JSON.stringify('#!/usr/bin/env bash\nprintf "setupvibe '+version+'\\n"\n')};
 const name=path.basename(url).replace(/\\.sha256$/,'');
 let hash=crypto.createHash('sha256').update(content).digest('hex');if(process.env.BAD_HASH==='1')hash='0'.repeat(64);
 fs.writeFileSync(out,url.endsWith('.sha256')?hash+'  '+name+'\\n':content);
 `;
 writeFileSync(join(bin,'curl'),curl,{mode:0o755});
 const env={...process.env,HOME:dir,PATH:`${bin}:/usr/bin:/bin`,SETUPVIBE_INSTALL_DIR:join(dir,'instalação com espaços')};
 delete env.SETUPVIBE_EDITION;delete env.SETUPVIBE_DOWNLOAD_BASE;
 return{dir,bin,env,run:(args=[],extra={},edition='desktop')=>spawnSync('/bin/bash',[join(root,`${edition}.sh`),...args],{env:{...env,...extra},encoding:'utf8',timeout:10000}),close:()=>rmSync(dir,{recursive:true,force:true})};
}
test('bootstrap: prévia Server não cria destino nem exige stdin',()=>{const f=fixture();try{const r=f.run(['--dry-run','--non-interactive'],{},'server');assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/Edição: server/);assert.match(r.stdout,/unknown-linux-musl/);assert.equal(existsSync(f.env.SETUPVIBE_INSTALL_DIR),false);}finally{f.close();}});
test('bootstrap: instala, repete e mantém perfil e estado',()=>{const f=fixture();try{writeFileSync(join(f.dir,'.profile'),'preservar');for(let n=0;n<2;n++){const r=f.run(['--yes','--non-interactive']);assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/Instalado:/);assert.match(r.stdout,/export PATH=/);}assert.equal(readFileSync(join(f.dir,'.profile'),'utf8'),'preservar');assert.equal(existsSync(join(f.dir,'.local/share')),false);assert.match(readFileSync(join(f.env.SETUPVIBE_INSTALL_DIR,'.setupvibe.sha256'),'utf8'),/^[a-f0-9]{64}\n$/);}finally{f.close();}});
for(const [name,env]of [['checksum',{BAD_HASH:'1'}],['download',{FAIL_DOWNLOAD:'1'}],['HTML',{HTML:'1'}]])test(`bootstrap: ${name} inválido preserva executável anterior`,()=>{const f=fixture();try{assert.equal(f.run().status,0);const path=join(f.env.SETUPVIBE_INSTALL_DIR,'setupvibe'),old=readFileSync(path);const r=f.run([],env);assert.notEqual(r.status,0);assert.deepEqual(readFileSync(path),old);assert.equal(existsSync(join(f.env.SETUPVIBE_INSTALL_DIR,'.setupvibe-bootstrap.lock')),false);}finally{f.close();}});
test('bootstrap: não adota executável externo nem segue symlink',()=>{const f=fixture();try{mkdirSync(f.env.SETUPVIBE_INSTALL_DIR);const path=join(f.env.SETUPVIBE_INSTALL_DIR,'setupvibe');writeFileSync(path,'externo');assert.notEqual(f.run().status,0);assert.equal(readFileSync(path,'utf8'),'externo');rmSync(path);symlinkSync(join(f.dir,'.profile'),path);assert.notEqual(f.run().status,0);assert.equal(existsSync(join(f.dir,'.profile')),false);}finally{f.close();}});
test('bootstrap: alteração externa e execução simultânea são recusadas',()=>{const f=fixture();try{assert.equal(f.run().status,0);const path=join(f.env.SETUPVIBE_INSTALL_DIR,'setupvibe');writeFileSync(path,'alterado');assert.match(f.run().stderr,/alterado fora/);mkdirSync(join(f.env.SETUPVIBE_INSTALL_DIR,'.setupvibe-bootstrap.lock'));assert.match(f.run().stderr,/Outra instalação/);}finally{f.close();}});
test('bootstrap: parâmetros e transporte inválidos não escrevem',()=>{const f=fixture();try{for(const args of [['--version','../../outro'],['--install-dir','relativo'],['--instalar-tudo'],['--version']])assert.notEqual(f.run(args).status,0);assert.notEqual(f.run([],{SETUPVIBE_DOWNLOAD_BASE:'http://localhost'}).status,0);assert.equal(existsSync(f.env.SETUPVIBE_INSTALL_DIR),false);}finally{f.close();}});
test('bootstrap: arquitetura e edição macOS são verificadas na prévia',()=>{const f=fixture();try{writeFileSync(join(f.bin,'uname'),'#!/bin/bash\nif [ "$1" = -s ]; then echo Darwin; else echo arm64; fi\n',{mode:0o755});writeFileSync(join(f.bin,'sw_vers'),'#!/bin/bash\necho 14.0\n',{mode:0o755});assert.match(f.run(['--dry-run']).stdout,/aarch64-apple-darwin/);assert.notEqual(f.run(['--dry-run'],{},'server').status,0);}finally{f.close();}});

test('bootstrap: sistema e arquitetura desconhecidos falham antes de escrever',()=>{const f=fixture();try{
  for(const [system,arch]of [['FreeBSD','x86_64'],['Linux','riscv64']]){
    writeFileSync(join(f.bin,'uname'),`#!/bin/bash\nif [ "$1" = -s ]; then echo ${system}; else echo ${arch}; fi\n`,{mode:0o755});
    assert.notEqual(f.run().status,0);assert.equal(existsSync(f.env.SETUPVIBE_INSTALL_DIR),false);
  }
}finally{f.close();}});
