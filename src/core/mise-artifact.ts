/** Resolve binário mise de versão fixa e digest publicado pelo GitHub oficial. */
import {installationPreflight} from './preflight';
import type {Target} from './platform';
/** Confere tag, nome, tamanho, digest e origem exata antes de aceitar um artefato. */
export function parseMiseArtifact(data:unknown,version:string,target:Target){
  if(!/^\d+\.\d+\.\d+$/.test(version)||!['linux','darwin'].includes(target.system)||!['x64','arm64'].includes(target.arch))throw Error("Invalid mise version or platform.");
  const release=data as {tag_name?:unknown;assets?:unknown[]};
  if(!release||release.tag_name!=='v'+version||!Array.isArray(release.assets))throw Error("mise release mismatch.");
  const name=`mise-v${version}-${target.system==='darwin'?'macos':'linux'}-${target.arch}`;
  const matches=release.assets.filter((item:any)=>item?.name===name) as {digest?:unknown;size?:unknown;browser_download_url?:unknown}[];
  const asset=matches[0],url=`https://github.com/jdx/mise/releases/download/v${version}/${name}`;
  if(matches.length!==1||!asset||typeof asset.digest!=='string'||! /^sha256:[a-f0-9]{64}$/.test(asset.digest)||!Number.isSafeInteger(asset.size)||Number(asset.size)<1||Number(asset.size)>256*1024*1024||asset.browser_download_url!==url)throw Error("Invalid mise artifact.");
  return{version,url,sha256:asset.digest.slice(7),size:Number(asset.size)};
}
/** A API é consultada por HTTPS sem seguir redirects, com prazo e corpo limitados. */
export async function miseArtifact(version:string,target:Target,signal?:AbortSignal){
  if(!/^\d+\.\d+\.\d+$/.test(version))throw Error("A fixed mise version is required.");
  if(target.edition!=='desktop')throw Error("mise is available in Desktop only.");
  await installationPreflight(target);
  const response=await fetch(`https://api.github.com/repos/jdx/mise/releases/tags/v${version}`,{redirect:'error',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000)});
  if(!response.ok||!response.body)throw Error("mise release unavailable.");
  const reader=response.body.getReader(),chunks:Uint8Array[]=[];let bytes=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>2*1024*1024)throw Error("mise metadata exceeded the limit.");chunks.push(value);}}finally{await reader.cancel();reader.releaseLock();}
  return parseMiseArtifact(JSON.parse(Buffer.concat(chunks).toString('utf8')),version,target);
}
