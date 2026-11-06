/** Resolve artefato nativo fixo a partir do manifesto HTTPS oficial da Anthropic. */
import {installationPreflight} from './preflight';
import type {Target} from './platform';
const origin='https://downloads.claude.ai/claude-code-releases';
/** Limita tamanho, tempo e platform antes de aceitar checksum e URL. */
export async function claudeArtifact(version:string,target:Target,signal?:AbortSignal){
  if(!/^\d+\.\d+\.\d+$/.test(version))throw Error("A fixed Claude Code version is required.");
  if(target.edition!=='desktop')throw Error("Claude Code is available in Desktop only.");
  await installationPreflight(target);
  const response=await fetch(`${origin}/${version}/manifest.json`,{redirect:'error',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000)});
  if(!response.ok||!response.body)throw Error("Claude manifest unavailable.");
  const reader=response.body.getReader();const chunks:Uint8Array[]=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>262144)throw Error("Claude manifest exceeded the limit.");chunks.push(value);}}finally{await reader.cancel();reader.releaseLock();}
  return parseClaudeArtifact(JSON.parse(Buffer.concat(chunks).toString('utf8')),version,target);
}
/** Campos adicionais do fornecedor são permitidos; versão e platform devem corresponder. */
export function parseClaudeArtifact(manifest:unknown,version:string,target:Target){
  const row=manifest as {version?:unknown;platforms?:Record<string,{binary?:unknown;checksum?:unknown;size?:unknown}>};
  if(!/^\d+\.\d+\.\d+$/.test(version)||!row||row.version!==version||!['linux','darwin'].includes(target.system)||!['x64','arm64'].includes(target.arch))throw Error("Incompatible Claude manifest.");
  const platform=target.system+'-'+target.arch,artifact=row.platforms?.[platform];
  if(!artifact||artifact.binary!=='claude'||typeof artifact.checksum!=='string'||! /^[a-f0-9]{64}$/.test(artifact.checksum)||!Number.isSafeInteger(artifact.size)||Number(artifact.size)<1||Number(artifact.size)>512*1024*1024)throw Error("Invalid Claude artifact.");
  return{version,platform,sha256:artifact.checksum,size:Number(artifact.size),url:`${origin}/${version}/${platform}/claude`};
}
