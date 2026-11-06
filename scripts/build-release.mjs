/** Gera executáveis Bun com assets OpenTUI, hashes e manifesto, sem publicar ou alterar releases existentes. */
import {createHash} from 'node:crypto';
import {createReadStream,existsSync,readFileSync} from 'node:fs';
import {chmod,mkdir,mkdtemp,rename,rm,writeFile} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {renderBootstrap} from './bootstrap.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const matrix={
 'linux-x64':{system:'linux',arch:'x64',compile:'bun-linux-x64-baseline'},
 'linux-arm64':{system:'linux',arch:'arm64',compile:'bun-linux-arm64'},
 'darwin-x64':{system:'darwin',arch:'x64',compile:'bun-darwin-x64-baseline'},
 'darwin-arm64':{system:'darwin',arch:'arm64',compile:'bun-darwin-arm64'},
};
/** Captura saídas limitadas, propaga falhas e nunca executa comandos por shell. */
function run(command,args){const result=spawnSync(command,args,{cwd:root,encoding:'utf8',maxBuffer:1048576,timeout:300000});if(result.error||result.status!==0)throw Error('Build command failed: '+command+'\n'+(result.stderr??'')+(result.stdout??''));return result.stdout.trim();}
/** Streaming mantém uso de memória constante mesmo para os executáveis compilados. */
async function checksum(path){const hash=createHash('sha256');for await(const chunk of createReadStream(path))hash.update(chunk);return hash.digest('hex');}
async function main(){
 const args=process.argv.slice(2);
 if(args.includes('--help')){console.log('Usage: node scripts/build-release.mjs [--target linux-x64|linux-arm64|darwin-x64|darwin-arm64|--all] [--output directory]\nRequires Bun 1.3.14 and the matching OpenTUI native packages. Existing output directories are preserved.');return;}
 const config={target:process.platform+'-'+process.arch,all:false,output:join(root,'dist','release')};
 for(let i=0;i<args.length;i++){const arg=args[i];if(arg==='--all')config.all=true;else if(arg==='--target'&&args[i+1])config.target=args[++i];else if(arg==='--output'&&args[i+1])config.output=resolve(args[++i]);else throw Error('Unknown or incomplete build option: '+arg);}
 if(config.all&&args.includes('--target'))throw Error('Choose --all or --target.');
 const targets=config.all?Object.keys(matrix):[config.target];
 if(targets.some(target=>!Object.hasOwn(matrix,target)))throw Error('Unsupported build target.');
 const destination=resolve(config.output);if(existsSync(destination))throw Error('Output directory already exists; existing release preserved.');
 const manifest=JSON.parse(readFileSync(join(root,'package.json'),'utf8'));
 if(!/^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/.test(manifest.version))throw Error('Invalid release version.');
 const bun=process.env.BUN_BINARY??'bun',bunVersion=run(bun,['--version']);
 if(bunVersion!=='1.3.14')throw Error('Release builds require Bun 1.3.14.');
 for(const target of targets){let native;try{native=fileURLToPath(import.meta.resolve('@opentui/core-'+target));}catch{throw Error('Missing native package: @opentui/core-'+target+'. Install optional packages for the requested platforms first.');}if(!existsSync(native)||!existsSync(join(dirname(native),target.startsWith('linux-')?'libopentui.so':'libopentui.dylib')))throw Error('Native package files are missing.');if(JSON.parse(readFileSync(join(dirname(native),'package.json'),'utf8')).version!==manifest.dependencies['@opentui/core'])throw Error('Native package version does not match OpenTUI.');}
 // Somente a pasta temporária própria é removida em falhas; a publicação local ocorre por rename.
 await mkdir(dirname(destination),{recursive:true});
 const staging=await mkdtemp(join(dirname(destination),'.setupvibe-build-'));
 try{
  const artifacts=[];
  for(const target of targets){
   const item=matrix[target],name='setupvibe-'+manifest.version+'-'+target,path=join(staging,name);
   const args=['build','--compile','--target='+item.compile,'src/cli.ts','--outfile',path];
   if(item.system==='linux')args.push('--define','process.env.OPENTUI_LIBC="glibc"');
   run(bun,args);await chmod(path,0o700);
   if(item.system===process.platform&&item.arch===process.arch&&run(path,['--version'])!==manifest.version)throw Error('Compiled executable has an unexpected version.');
   const sha256=await checksum(path);
   artifacts.push({system:item.system,arch:item.arch,url:'https://github.com/promovaweb/setupvibe/releases/download/v'+manifest.version+'/'+name,sha256});
   console.log('Built '+target+' '+sha256);
  }
  const releaseManifest={version:manifest.version,artifacts};
  await writeFile(join(staging,'release-manifest.json'),JSON.stringify(releaseManifest,null,2)+'\n',{flag:'wx',mode:0o600});
  await writeFile(join(staging,'install.sh'),renderBootstrap(releaseManifest),{flag:'wx',mode:0o700});
  await writeFile(join(staging,'SHA256SUMS'),[...artifacts.map(item=>item.sha256+'  '+new URL(item.url).pathname.split('/').at(-1)),await checksum(join(staging,'install.sh'))+'  install.sh'].join('\n')+'\n',{flag:'wx',mode:0o600});
  await writeFile(join(staging,'build-info.json'),JSON.stringify({version:manifest.version,bun:bunVersion,opentui:manifest.dependencies['@opentui/core'],targets,homologated:false},null,2)+'\n',{flag:'wx',mode:0o600});
  if(existsSync(destination))throw Error('Output directory appeared during build; existing release preserved.');
  await rename(staging,destination);
  console.log('Release staged at '+destination);
 }finally{await rm(staging,{recursive:true,force:true});}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
