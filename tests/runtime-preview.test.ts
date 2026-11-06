/** Verifica que descoberta indisponível nunca produz plano executável presumido. */
import{expect,test}from'bun:test';
import{mkdtempSync,rmSync,existsSync}from'node:fs';
import{join}from'node:path';
import{tmpdir}from'node:os';
import{runtimePreview}from'../src/core/runtime-preview';
test("mise missing impede plano e não cria estado",async()=>{
 const dir=mkdtempSync(join(tmpdir(),'setupvibe-runtime-')),path=join(dir,'state.db');
 try{await expect(runtimePreview('node','24.1.0',{edition:'desktop',system:'linux',arch:'x64'},{path,executable:'/missing/mise'})).rejects.toThrow(new RegExp("unavailable","i"));expect(existsSync(path)).toBe(false);}
 finally{rmSync(dir,{recursive:true,force:true});}
});
