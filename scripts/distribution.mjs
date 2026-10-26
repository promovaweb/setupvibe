/** Gera bootstraps versionados ou empacota um executável nativo verificado, sem publicar. */
import {readFileSync,writeFileSync,mkdirSync,copyFileSync,chmodSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=resolve(import.meta.dirname,'..');
const version=readFileSync(resolve(root,'Cargo.toml'),'utf8').match(/^version = "([^"]+)"/m)[1];
const [mode,...args]=process.argv.slice(2);
if(mode==='bootstrap'||mode==='check'){
  const template=readFileSync(resolve(root,'scripts/templates/bootstrap.sh'),'utf8');
  for(const edition of ['desktop','server']){
    const expected=template.replaceAll('@EDITION@',edition).replaceAll('@VERSION@',version);
    const file=resolve(root,`${edition}.sh`);
    if(mode==='check'){
      if(readFileSync(file,'utf8')!==expected)throw Error(`${edition}.sh divergente; execute npm run bootstrap:generate`);
    }else{writeFileSync(file,expected);chmodSync(file,0o755);}
  }
}else if(mode==='package'){
  const [edition,target,input]=args;
  const allowed=['x86_64-unknown-linux-musl','aarch64-unknown-linux-musl','x86_64-apple-darwin','aarch64-apple-darwin'];
  if(!['desktop','server'].includes(edition)||!allowed.includes(target)||!input||(edition==='server'&&target.includes('apple')))throw Error('Uso: package desktop|server TARGET CAMINHO_BINÁRIO');
  const binary=resolve(input);
  const env={...process.env};delete env.SETUPVIBE_EDITION;
  const run=arguments_=>execFileSync(binary,arguments_,{encoding:'utf8',timeout:15000,env});
  if(run(['--version']).trim()!==`setupvibe ${version}`)throw Error('Versão do executável diverge do Cargo.toml');
  const data=JSON.parse(run(['--output','json','catalog','list'])).data;
  if((data.components.length===6?'server':'desktop')!==edition)throw Error('Edição compilada incorreta');
  const format=execFileSync('file',['-b',binary],{encoding:'utf8'});
  if(target.includes('linux')&&!/static(-pie)? linked|statically linked/.test(format))throw Error('Linux requer executável estático');
  if(target.startsWith('x86_64')&&!/x86-64|x86_64/.test(format))throw Error('Arquitetura divergente');
  if(target.startsWith('aarch64')&&!/aarch64|arm64/.test(format))throw Error('Arquitetura divergente');
  if(target.includes('apple')&&!format.includes('Mach-O'))throw Error('macOS requer Mach-O');
  const dir=resolve(root,'dist');mkdirSync(dir,{recursive:true});
  const name=`setupvibe-${edition}-${version}-${target}`;
  const bytes=readFileSync(binary);const hash=createHash('sha256').update(bytes).digest('hex');
  copyFileSync(binary,resolve(dir,name));chmodSync(resolve(dir,name),0o755);
  writeFileSync(resolve(dir,`${name}.sha256`),`${hash}  ${name}\n`);
  writeFileSync(resolve(dir,`${name}.json`),JSON.stringify({schema_version:1,version,edition,target,sha256:hash,size:bytes.length},null,2)+'\n');
  for(const file of ['LICENSE','desktop.sh','server.sh'])copyFileSync(resolve(root,file),resolve(dir,file));
  console.log(JSON.stringify({artifact:name,sha256:hash,size:bytes.length}));
}else throw Error('Modos: bootstrap, check, package');
