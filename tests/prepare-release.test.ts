/** Integra manifesto e download com filesystem temporário e HTTP simulado. */
import{expect,test}from'bun:test';
import{mkdtempSync,rmSync,readFileSync,readdirSync}from'node:fs';
import{join}from'node:path';
import{tmpdir}from'node:os';
import{prepareRelease}from'../src/core/prepare-release';
const target={edition:'desktop' as const,system:'linux',arch:'x64'};
const manifest={version:'2.0.0-dev.1',artifacts:[{system:'linux',arch:'x64',url:'https://example.com/a',sha256:'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'}]};
test('preparação integra seleção e checksum sem executar artefato',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'setupvibe-release-'));let calls=0;const fetcher=async()=>{calls++;return new Response('abc');};
 try{const prepared=await prepareRelease(manifest,target,dir,{fetcher});expect(prepared.version).toBe(manifest.version);expect(readFileSync(prepared.path,'utf8')).toBe('abc');expect(calls).toBe(1);expect(readdirSync(dir)).toEqual(['setupvibe-2.0.0-dev.1-linux-x64']);}
 finally{rmSync(dir,{recursive:true,force:true});}
});
test("platform missing impede download e não cria staging",async()=>{
 const dir=mkdtempSync(join(tmpdir(),'setupvibe-release-'));let calls=0;
 try{await expect(prepareRelease(manifest,{...target,arch:'arm64'},dir,{fetcher:async()=>{calls++;return new Response('abc');}})).rejects.toThrow(new RegExp("no artifact","i"));expect(calls).toBe(0);expect(readdirSync(dir)).toEqual([]);}
 finally{rmSync(dir,{recursive:true,force:true});}
});
