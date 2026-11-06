/** Usa arquivos temporários sem habilitar serviços do usuário ou do sistema. */
import{expect,test}from'bun:test';
import{mkdtempSync,rmSync,readFileSync,existsSync}from'node:fs';
import{join}from'node:path';
import{tmpdir}from'node:os';
import{writeCollectorConfig}from'../src/core/install-supervisor';
test('confirmação e criação exclusiva preservam unidade existente',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'setupvibe-service-write-')),destination=join(dir,'collector.service');const config={executable:process.execPath,stateDirectory:dir,intervalMs:5000};
 try{await expect(writeCollectorConfig(config,destination,'systemd',false)).rejects.toThrow(new RegExp("confirmation","i"));expect(existsSync(destination)).toBe(false);await writeCollectorConfig(config,destination,'systemd',true);const original=readFileSync(destination,'utf8');expect(original).toContain('[Service]');await expect(writeCollectorConfig({...config,intervalMs:1000},destination,'systemd',true)).rejects.toThrow();expect(readFileSync(destination,'utf8')).toBe(original);}
 finally{rmSync(dir,{recursive:true,force:true});}
});
