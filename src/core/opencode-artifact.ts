/** Resolve pacote nativo do OpenCode por versão, plataforma e digest oficial. */
import {installationPreflight} from './preflight';
import type {Target} from './platform';
/** Nome, tag, origem e tamanho devem corresponder exatamente ao release solicitado. */
export function parseOpenCodeArtifact(data:unknown,version:string,target:Target){
 if(!/^\d+\.\d+\.\d+$/.test(version)||!['linux','darwin'].includes(target.system)||!['x64','arm64'].includes(target.arch))throw Error('Invalid OpenCode version or platform.');
 const release=data as {tag_name?:unknown;assets?:unknown[]};
 if(!release||release.tag_name!=='v'+version||!Array.isArray(release.assets))throw Error('OpenCode release mismatch.');
 const base=`opencode-${target.system}-${target.arch}${target.arch==='x64'?'-baseline':''}`,name=base+(target.system==='darwin'?'.zip':'.tar.gz');
 const matches=release.assets.filter((row:any)=>row?.name===name) as {digest?:unknown;size?:unknown;browser_download_url?:unknown}[];
 const asset=matches[0],url=`https://github.com/anomalyco/opencode/releases/download/v${version}/${name}`;
 if(matches.length!==1||!asset||typeof asset.digest!=='string'||!/^sha256:[a-f0-9]{64}$/.test(asset.digest)||!Number.isSafeInteger(asset.size)||Number(asset.size)<1||Number(asset.size)>256*1024*1024||asset.browser_download_url!==url)throw Error('Invalid OpenCode artifact.');
 return{version,url,sha256:asset.digest.slice(7),size:Number(asset.size),entry:'opencode'};
}
/** Cache limitado por execução evita consultas repetidas, sem gravar metadados durante prévias. */
export function createOpenCodeArtifactResolver(fetcher:(url:string,options:RequestInit)=>Promise<Response>=fetch){
 const cache=new Map<string,{expires:number;value:ReturnType<typeof parseOpenCodeArtifact>}>();
 return async(version:string,target:Target,signal?:AbortSignal)=>{
  if(!/^\d+\.\d+\.\d+$/.test(version))throw Error('A fixed OpenCode version is required.');
  if(target.edition!=='desktop')throw Error('OpenCode is available in Desktop only.');
  await installationPreflight(target);
  if(signal?.aborted)throw Error('OpenCode metadata query cancelled.');
  const key=[version,target.system,target.arch].join('/'),saved=cache.get(key);
  if(saved&&saved.expires>Date.now())return{...saved.value};
  const headers:Record<string,string>={Accept:'application/vnd.github+json'},token=process.env.GH_TOKEN||process.env.GITHUB_TOKEN;
  if(token){if(/[\x00-\x1f\x7f]/.test(token))throw Error('Invalid GitHub API token format.');headers.Authorization='Bearer '+token;}
  const response=await fetcher(`https://api.github.com/repos/anomalyco/opencode/releases/tags/v${version}`,{headers,redirect:'error',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000)});
  if(!response.ok||!response.body){await response.body?.cancel();if(response.status===429||response.status===403&&response.headers.get('x-ratelimit-remaining')==='0')throw Error('GitHub API rate limit reached; retry later or provide GH_TOKEN/GITHUB_TOKEN.');throw Error('OpenCode release unavailable (HTTP '+response.status+').');}
  const reader=response.body.getReader(),chunks:Uint8Array[]=[];let bytes=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>2*1024*1024)throw Error('OpenCode metadata exceeded the limit.');chunks.push(value);}}finally{await reader.cancel();reader.releaseLock();}
  const value=parseOpenCodeArtifact(JSON.parse(Buffer.concat(chunks).toString('utf8')),version,target);
  if(cache.size>=16)cache.delete(cache.keys().next().value!);cache.set(key,{expires:Date.now()+300000,value});return{...value};
 };
}
/** Consulta HTTPS fixa, sem redirects; tokens explícitos não aparecem em resultados ou registros. */
export const openCodeArtifact=createOpenCodeArtifactResolver();
