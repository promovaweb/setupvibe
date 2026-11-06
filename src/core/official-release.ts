/** Obtém metadados de uma versão fixa no release oficial, por HTTPS limitado e sem gravar estado. */
import {parseManifest,selectArtifact,type ReleaseManifest} from './manifest';
import {artifactUrl} from './integrity';
import type {Target} from './platform';
export const releaseRedirectHosts=['github.com','release-assets.githubusercontent.com','objects.githubusercontent.com'];
export type ReleaseFetcher=(url:URL,options:RequestInit)=>Promise<Response>;
/** Canais móveis não podem selecionar silenciosamente outro executável. */
export function fixedReleaseVersion(version:string){if(!/^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/.test(version))throw Error('A fixed SetupVibe release version is required.');}
/** Origem canônica dos assets publicados; nenhuma URL é fornecida pela entrada da CLI. */
export function releaseDirectory(version:string){fixedReleaseVersion(version);return'https://github.com/promovaweb/setupvibe/releases/download/v'+version;}
/** Versão, nome e endereço de cada artefato precisam corresponder ao release solicitado. */
export function officialReleaseManifest(input:unknown,version:string,target:Target):ReleaseManifest{
 const manifest=parseManifest(input);if(manifest.version!==version)throw Error('SetupVibe release version mismatch.');
 for(const artifact of manifest.artifacts){if(artifact.url!==releaseDirectory(version)+'/setupvibe-'+version+'-'+artifact.system+'-'+artifact.arch)throw Error('SetupVibe artifact must belong to the requested official release.');}
 selectArtifact(manifest,target);return manifest;
}
/** A confiança vem do endpoint HTTPS oficial; assinatura independente não é inferida do checksum. */
export async function fetchOfficialRelease(version:string,target:Target,options:{signal?:AbortSignal;fetcher?:ReleaseFetcher}={}):Promise<ReleaseManifest>{
 let current=artifactUrl(releaseDirectory(version)+'/release-manifest.json');const signal=options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000);
 let response:Response|undefined;
 for(let redirects=0;redirects<=3;redirects++){
  response=await(options.fetcher??fetch)(current,{redirect:'manual',signal,headers:{Accept:'application/json'}});
  if(response.status<300||response.status>=400)break;
  const location=response.headers.get('location');await response.body?.cancel();if(!location||redirects===3)throw Error('SetupVibe metadata redirect refused.');
  const next=artifactUrl(new URL(location,current).href);if(!releaseRedirectHosts.includes(next.hostname)||next.port&&next.port!=='443')throw Error('SetupVibe metadata redirect host refused.');current=next;
 }
 if(!response||response.status!==200||!response.body){await response?.body?.cancel();throw Error('SetupVibe release manifest unavailable.');}
 const reader=response.body.getReader(),chunks:Uint8Array[]=[];let size=0;const cancel=()=>{void reader.cancel().catch(()=>{});};signal.addEventListener('abort',cancel,{once:true});
 try{
  if(signal.aborted)throw Error('SetupVibe metadata query cancelled.');
  while(true){const {value,done}=await reader.read();if(signal.aborted)throw Error('SetupVibe metadata query cancelled.');if(done)break;size+=value.length;if(size>1048576)throw Error('SetupVibe release metadata exceeded the limit.');chunks.push(value);}
  let input:unknown;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw Error('SetupVibe release manifest is invalid JSON.');}
  return officialReleaseManifest(input,version,target);
 }finally{signal.removeEventListener('abort',cancel);await reader.cancel().catch(()=>{});reader.releaseLock();}
}
