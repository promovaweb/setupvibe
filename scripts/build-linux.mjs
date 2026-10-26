/** Compila as duas edições em musl no Docker, exporta localmente e gera SHA-256; não publica. */
import {execFileSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
if(process.platform!=='linux'||!['x64','arm64'].includes(process.arch))throw Error('Execute em Linux amd64 ou arm64 nativo');
const target=process.arch==='x64'?'x86_64-unknown-linux-musl':'aarch64-unknown-linux-musl';
const destination=resolve(root,'target/distribution');mkdirSync(destination,{recursive:true});
execFileSync('docker',['buildx','build','--file','Dockerfile.distribution','--output',`type=local,dest=${destination}`,'.'],{cwd:root,stdio:'inherit',timeout:1800000});
for(const edition of ['desktop','server'])execFileSync(process.execPath,['scripts/distribution.mjs','package',edition,target,resolve(destination,`setupvibe-${edition}`)],{cwd:root,stdio:'inherit'});
