/** Confere checksum real e recusa entradas inadequadas sem baixar ou executar arquivos. */
import{expect,test}from'bun:test';
import{mkdtempSync,rmSync,writeFileSync,symlinkSync}from'node:fs';
import{join}from'node:path';
import{tmpdir}from'node:os';
import{verifyArtifact,artifactUrl}from'../src/core/integrity';
test('checksum valida conteúdo e recusa alteração e link',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'setupvibe-integrity-')),path=join(dir,'artifact');
 try{writeFileSync(path,'abc');await verifyArtifact(path,'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');writeFileSync(path,'changed');await expect(verifyArtifact(path,'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')).rejects.toThrow(new RegExp("checksum","i"));symlinkSync(path,join(dir,'link'));await expect(verifyArtifact(join(dir,'link'),'a'.repeat(64))).rejects.toThrow(new RegExp("regular","i"));}
 finally{rmSync(dir,{recursive:true,force:true});}
});
test("origem exige HTTPS e não aceita credentials embutidas",()=>{expect(artifactUrl('https://example.com/artifact').protocol).toBe('https:');for(const url of ['http://example.com/a','https://user:pass@example.com/a','file:///tmp/a','https://example.com/a#fragment'])expect(()=>artifactUrl(url)).toThrow(new RegExp("invalid","i"));});
test('diretório e checksum malformado são recusados',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'setupvibe-integrity-'));
 try{await expect(verifyArtifact(dir,'a'.repeat(64))).rejects.toThrow(new RegExp("regular","i"));await expect(verifyArtifact(dir,'not-a-digest')).rejects.toThrow(new RegExp("SHA-256","i"));}
 finally{rmSync(dir,{recursive:true,force:true});}
});
