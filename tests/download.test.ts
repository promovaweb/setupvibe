/** Simula respostas HTTP para testar staging e integridade sem rede externa. */
import{expect,test}from'bun:test';
import{mkdtempSync,rmSync,readFileSync,existsSync,readdirSync}from'node:fs';
import{join}from'node:path';
import{tmpdir}from'node:os';
import{downloadArtifact}from'../src/core/download';
const digest='ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
test('redirect exige HTTPS e host permitido explicitamente',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'setupvibe-download-redirect-')),path=join(dir,'artifact');
 try{
  const fetcher=async(url:URL)=>url.hostname==='example.com'?new Response(null,{status:302,headers:{location:'https://cdn.example.com/a'}}):new Response('abc');
  await downloadArtifact('https://example.com/a',path,digest,{fetcher,redirectHosts:['cdn.example.com']});expect(readFileSync(path,'utf8')).toBe('abc');
  await expect(downloadArtifact('https://example.com/a',join(dir,'bad'),digest,{fetcher,redirectHosts:['other.example.com']})).rejects.toThrow(new RegExp("not allowed","i"));
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test("cancelamento external interrompe corpo e limpa staging",async()=>{
 const dir=mkdtempSync(join(tmpdir(),'setupvibe-download-cancel-')),path=join(dir,'artifact'),controller=new AbortController();
 try{
  const fetcher=async()=>new Response(new ReadableStream<Uint8Array>({start(stream){stream.enqueue(new TextEncoder().encode('a'));setTimeout(()=>controller.abort(),10);}}));
  await expect(downloadArtifact('https://example.com/a',path,digest,{fetcher,signal:controller.signal})).rejects.toThrow();expect(readdirSync(dir)).toEqual([]);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('download verificado preserva destino e limpa staging',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'setupvibe-download-')),path=join(dir,'artifact');const fetcher=(async()=>new Response('abc'));
 try{await downloadArtifact('https://example.com/a',path,digest,{fetcher});expect(readFileSync(path,'utf8')).toBe('abc');await expect(downloadArtifact('https://example.com/a',path,digest,{fetcher})).rejects.toThrow();expect(readdirSync(dir)).toEqual(['artifact']);}
 finally{rmSync(dir,{recursive:true,force:true});}
});
test('checksum incorreto, excesso de tamanho e redirect não publicam arquivo',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'setupvibe-download-')),path=join(dir,'artifact');
 try{for(const [body,status,maxBytes]of [['bad',200,100],['abc',200,1],['',302,100]] as const){const fetcher=(async()=>new Response(body,{status}));await expect(downloadArtifact('https://example.com/a',path,digest,{fetcher,maxBytes})).rejects.toThrow();expect(existsSync(path)).toBe(false);expect(readdirSync(dir)).toEqual([]);}}
 finally{rmSync(dir,{recursive:true,force:true});}
});
test("corpo travado e stream interrupted limpam arquivos parciais",async()=>{
 const dir=mkdtempSync(join(tmpdir(),'setupvibe-stream-')),path=join(dir,'artifact');
 try{
  const stalled=async()=>new Response(new ReadableStream<Uint8Array>({start(controller){controller.enqueue(new TextEncoder().encode('a'));}}));
  await expect(downloadArtifact('https://example.com/a',path,digest,{fetcher:stalled,timeoutMs:30})).rejects.toThrow(new RegExp("deadline","i"));expect(readdirSync(dir)).toEqual([]);
  const broken=async()=>new Response(new ReadableStream<Uint8Array>({start(controller){controller.error(new Error("interrupted"));}}));
  await expect(downloadArtifact('https://example.com/a',path,digest,{fetcher:broken})).rejects.toThrow(new RegExp("interrupted","i"));expect(existsSync(path)).toBe(false);expect(readdirSync(dir)).toEqual([]);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
