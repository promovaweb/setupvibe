/** Resolve o binário oficial do Herdr por versão, plataforma e digest do release. */
import {installationPreflight} from './preflight';
import type {Target} from './platform';
/** Tag, nome, origem e tamanho devem corresponder exatamente ao release solicitado. */
export function parseHerdrArtifact(data:unknown,version:string,target:Target){
 if(!/^\d+\.\d+\.\d+$/.test(version)||!['linux','darwin'].includes(target.system)||!['x64','arm64'].includes(target.arch))throw Error('Invalid Herdr version or platform.');
 const release=data as {tag_name?:unknown;assets?:unknown[]};
 if(!release||release.tag_name!=='v'+version||!Array.isArray(release.assets))throw Error('Herdr release mismatch.');
 const name=`herdr-${target.system==='darwin'?'macos':'linux'}-${target.arch==='x64'?'x86_64':'aarch64'}`;
 const matches=release.assets.filter((row:any)=>row?.name===name) as {digest?:unknown;size?:unknown;browser_download_url?:unknown}[];
 const asset=matches[0],url=`https://github.com/herdrdev/herdr/releases/download/v${version}/${name}`;
 if(matches.length!==1||!asset||typeof asset.digest!=='string'||!/^sha256:[a-f0-9]{64}$/.test(asset.digest)||!Number.isSafeInteger(asset.size)||Number(asset.size)<1||Number(asset.size)>64*1024*1024||asset.browser_download_url!==url)throw Error('Invalid Herdr artifact.');
 return{version,url,sha256:asset.digest.slice(7),size:Number(asset.size)};
}
/** Cache limitado por execução evita consultas repetidas, sem gravar metadados durante prévias. */
export function createHerdrArtifactResolver(fetcher:(url:string,options:RequestInit)=>Promise<Response>=fetch){
 const cache=new Map<string,{expires:number;value:ReturnType<typeof parseHerdrArtifact>}>();
 return async(version:string,target:Target,signal?:AbortSignal)=>{
  if(!/^\d+\.\d+\.\d+$/.test(version))throw Error('A fixed Herdr version is required.');
  if(target.edition!=='desktop')throw Error('Herdr is available in Desktop only.');
  await installationPreflight(target);
  if(signal?.aborted)throw Error('Herdr metadata query cancelled.');
  const key=[version,target.system,target.arch].join('/'),saved=cache.get(key);
  if(saved&&saved.expires>Date.now())return{...saved.value};
  const headers:Record<string,string>={Accept:'application/vnd.github+json'},token=process.env.GH_TOKEN||process.env.GITHUB_TOKEN;
  if(token){if(/[\x00-\x1f\x7f]/.test(token))throw Error('Invalid GitHub API token format.');headers.Authorization='Bearer '+token;}
  const response=await fetcher(`https://api.github.com/repos/herdrdev/herdr/releases/tags/v${version}`,{headers,redirect:'error',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000)});
  if(!response.ok||!response.body){await response.body?.cancel();if(response.status===429||response.status===403&&response.headers.get('x-ratelimit-remaining')==='0')throw Error('GitHub API rate limit reached; retry later or provide GH_TOKEN/GITHUB_TOKEN.');throw Error('Herdr release unavailable (HTTP '+response.status+').');}
  const reader=response.body.getReader(),chunks:Uint8Array[]=[];let bytes=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>2*1024*1024)throw Error('Herdr metadata exceeded the limit.');chunks.push(value);}}finally{await reader.cancel();reader.releaseLock();}
  const value=parseHerdrArtifact(JSON.parse(Buffer.concat(chunks).toString('utf8')),version,target);
  if(cache.size>=16)cache.delete(cache.keys().next().value!);cache.set(key,{expires:Date.now()+300000,value});return{...value};
 };
}
/** Consulta HTTPS fixa, sem redirects; tokens explícitos não aparecem em resultados ou registros. */
export const herdrArtifact=createHerdrArtifactResolver();
