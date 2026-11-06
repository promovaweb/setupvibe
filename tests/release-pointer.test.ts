/** Testa troca e rollback locais sem executar releases. */
import{expect,test}from'bun:test';
import{mkdtempSync,rmSync,writeFileSync,readlinkSync}from'node:fs';
import{join}from'node:path';
import{tmpdir}from'node:os';
import{activateRelease}from'../src/core/release-pointer';
test('ativação troca ponteiro e permite retornar à release anterior',async()=>{const dir=mkdtempSync(join(tmpdir(),'setupvibe-pointer-'));try{writeFileSync(join(dir,'v1'),'one');writeFileSync(join(dir,'v2'),'two');await activateRelease(dir,join(dir,'v1'),true);const changed=await activateRelease(dir,join(dir,'v2'),true);expect(changed.previous).toBe('v1');expect(readlinkSync(join(dir,'current'))).toBe('v2');await activateRelease(dir,join(dir,changed.previous!),true);expect(readlinkSync(join(dir,'current'))).toBe('v1');}finally{rmSync(dir,{recursive:true,force:true});}});
test("arquivo external no destino é preservado",async()=>{const dir=mkdtempSync(join(tmpdir(),'setupvibe-pointer-'));try{writeFileSync(join(dir,'v1'),'one');writeFileSync(join(dir,'current'),"external");await expect(activateRelease(dir,join(dir,'v1'),true)).rejects.toThrow(new RegExp("external","i"));}finally{rmSync(dir,{recursive:true,force:true});}});
