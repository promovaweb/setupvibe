/** Valida geração e sintaxe systemd sem instalar ou iniciar unidades. */
import{expect,test}from'bun:test';
import{mkdtempSync,writeFileSync,rmSync}from'node:fs';
import{join}from'node:path';
import{tmpdir}from'node:os';
import{systemdCollector}from'../src/core/supervisor';
test('unidade preserva caminhos com espaços e recusa injeção',()=>{
 const unit=systemdCollector({executable:'/opt/Setup Vibe/collector',stateDirectory:'/home/user/state%dir',intervalMs:5000});expect(unit).toContain('ExecStart="/opt/Setup Vibe/collector" 5000');expect(unit).toContain('state%%dir');expect(unit).toContain('UMask=0077');expect(()=>systemdCollector({executable:'/bin/x\nExecStart=/bin/y',stateDirectory:'/state',intervalMs:5000})).toThrow(new RegExp("path","i"));
});
test.skipIf(process.platform!=='linux')('systemd aceita sintaxe da unidade gerada',()=>{
 const dir=mkdtempSync(join(tmpdir(),'setupvibe-unit-')),path=join(dir,'setupvibe-collector.service');
 try{writeFileSync(path,systemdCollector({executable:process.execPath,stateDirectory:dir,intervalMs:5000}));const result=Bun.spawnSync(['systemd-analyze','--user','verify',path]);expect(result.exitCode).toBe(0);}
 finally{rmSync(dir,{recursive:true,force:true});}
});
test('launchd mantém argumentos separados e escapa conteúdo XML',async()=>{
 const {launchdCollector}=await import('../src/core/supervisor');const plist=launchdCollector({executable:'/Applications/Setup Vibe/collector',stateDirectory:'/Users/test/a&b',intervalMs:5000});expect(plist).toContain('<string>/Applications/Setup Vibe/collector</string>');expect(plist).toContain('/Users/test/a&amp;b');expect(plist).toContain('<key>SuccessfulExit</key><false/>');expect(plist).toContain('<key>Umask</key><integer>63</integer>');expect(()=>launchdCollector({executable:'relative',stateDirectory:'/state',intervalMs:5000})).toThrow(new RegExp("path","i"));
});
test("systemd recusa dollar no executável e preserva dollar no ambiente",()=>{
 expect(()=>systemdCollector({executable:'/opt/$HOME/collector',stateDirectory:'/state',intervalMs:5000})).toThrow(new RegExp("dollar","i"));
 expect(systemdCollector({executable:'/opt/collector',stateDirectory:'/state/$literal',intervalMs:5000})).toContain('Environment="SETUPVIBE_STATE_DIR=/state/$literal"');
});

test('supervisores usam o próprio SetupVibe com argumento --collector',async()=>{
 const {launchdCollector}=await import('../src/core/supervisor');const config={executable:'/opt/setupvibe',stateDirectory:'/state',intervalMs:5000,embedded:true};
 expect(systemdCollector(config)).toContain('ExecStart="/opt/setupvibe" --collector 5000');
 expect(launchdCollector(config)).toContain('<string>/opt/setupvibe</string>\n<string>--collector</string>\n<string>5000</string>');
});
