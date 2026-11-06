/** Baixa para staging privado e disponibiliza somente conteúdo com checksum válido. */
import{mkdtemp,open,rm,link}from'node:fs/promises';
import{dirname,join}from'node:path';
import{artifactUrl,verifyArtifact}from'./integrity';
/** Destino existente é preservado; redirecionamentos exigem hosts explicitamente permitidos. */
export async function downloadArtifact(url:string,destination:string,sha256:string,options:{maxBytes?:number;timeoutMs?:number;signal?:AbortSignal;redirectHosts?:string[];fetcher?:(url:URL,init:RequestInit)=>Promise<Response>}={}):Promise<void>{
 const source=artifactUrl(url),max=options.maxBytes??256*1024*1024,timeout=options.timeoutMs??60000;
 if(!Number.isSafeInteger(max)||max<1||!Number.isInteger(timeout)||timeout<1||timeout>3600000)throw new Error("Invalid download limits.");
 if(!/^[a-f0-9]{64}$/i.test(sha256))throw new Error("Invalid expected SHA-256.");
 const staging=await mkdtemp(join(dirname(destination),'.setupvibe-download-')),path=join(staging,'artifact');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
 const cancel=()=>controller.abort();options.signal?.addEventListener('abort',cancel,{once:true});if(options.signal?.aborted)controller.abort();
 try{
  let current=source,response:Response|undefined;
  for(let redirects=0;redirects<=3;redirects++){
    response=await(options.fetcher??fetch)(current,{redirect:'manual',signal:controller.signal});
    if(response.status<300||response.status>=400)break;
    const location=response.headers.get('location');await response.body?.cancel();
    if(!location||!options.redirectHosts?.length||redirects===3)throw new Error("Download redirect refused.");
    const next=artifactUrl(new URL(location,current).href);
    if(!options.redirectHosts.includes(next.hostname))throw new Error("Redirect destination is not allowed.");
    current=next;
  }
  if(!response)throw new Error("Download unavailable.");
  if(response.status!==200||!response.body){await response.body?.cancel();throw new Error("Download refused or empty.");}
  const reader=response.body.getReader();
  const abortBody=()=>{ void reader.cancel().catch(()=>{}); };
  controller.signal.addEventListener('abort',abortBody,{once:true});
  const file=await open(path,'wx',0o600);let size=0;
  try{
   while(true){
    const {value:chunk,done}=await reader.read();
    if(controller.signal.aborted)throw new Error("Download deadline exceeded.");
    if(done)break;
    if(controller.signal.aborted)throw new Error("Download deadline exceeded.");
    size+=chunk.byteLength;if(size>max)throw new Error("Artifact exceeded the maximum size.");
    let offset=0;while(offset<chunk.byteLength){const result=await file.write(chunk,offset,chunk.byteLength-offset);if(!result.bytesWritten)throw new Error("Write failed.");offset+=result.bytesWritten;}
   }
   await file.sync();
  }finally{controller.signal.removeEventListener('abort',abortBody);await reader.cancel().catch(()=>{});reader.releaseLock();await file.close();}
  await verifyArtifact(path,sha256);
  if(controller.signal.aborted)throw new Error("Download deadline exceeded.");
  // Hard link oferece criação exclusiva no mesmo filesystem, sem sobrescrever destino.
  await link(path,destination);
 }finally{clearTimeout(timer);options.signal?.removeEventListener('abort',cancel);await rm(staging,{recursive:true,force:true});}
}
