/** Verifica artefatos por streaming sem carregar o executável inteiro em memória. */
import{createHash,timingSafeEqual}from'node:crypto';
import{constants}from'node:fs';
import{open}from'node:fs/promises';
/** Recusa links e tipos especiais; o checksum esperado deve vir de fonte confiável. */
export async function verifyArtifact(path:string,expected:string):Promise<void>{
 if(!/^[a-fA-F0-9]{64}$/.test(expected))throw new Error("Invalid expected SHA-256.");
 let file;
 try { file=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK); }
 catch { throw new Error("Artifact must be an accessible regular file without symlinks."); }
 try {
  const before=await file.stat();
  if(!before.isFile())throw new Error("Artifact must be a regular file.");
  const hash=createHash('sha256');
  const buffer=Buffer.alloc(65536);
  let position=0;
  while(true){const {bytesRead}=await file.read(buffer,0,buffer.length,position);if(!bytesRead)break;hash.update(buffer.subarray(0,bytesRead));position+=bytesRead;}
  const after=await file.stat();
  if(before.size!==after.size||before.mtimeMs!==after.mtimeMs||before.ctimeMs!==after.ctimeMs)throw new Error("Artifact changed during verification.");
  if(!timingSafeEqual(hash.digest(),Buffer.from(expected,'hex')))throw new Error("Artifact checksum does not match.");
 } finally { await file.close(); }
}
/** Aceita somente HTTPS sem credenciais; o downloader deve verificar também redirecionamentos. */
export function artifactUrl(value:string):URL{
 const url=new URL(value);
 if(url.protocol!=='https:'||url.username||url.password||url.hash)throw new Error("Invalid artifact URL.");
 return url;
}
