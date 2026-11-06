/** Testa recusas antes de systemctl, sem habilitar serviços no host. */
import{expect,test}from'bun:test';
import{mkdtempSync,writeFileSync,rmSync,existsSync}from'node:fs';
import{join}from'node:path';
import{tmpdir}from'node:os';
import{activateSystemdCollector}from'../src/core/activate-collector';
test('ativação exige confirmação sem criar estado',async()=>{const config={executable:'/missing/collector',stateDirectory:'/missing/state',intervalMs:5000};await expect(activateSystemdCollector(config,'/missing',{confirmed:false})).rejects.toThrow(new RegExp("confirmation","i"));});
test.skipIf(process.platform!=='linux')("diretório fora do caminho canônico impede ativação e banco",async()=>{const dir=mkdtempSync(join(tmpdir(),'setupvibe-activate-')),path=join(dir,'state.db');try{writeFileSync(join(dir,'setupvibe-collector.service'),"external");await expect(activateSystemdCollector({executable:process.execPath,stateDirectory:dir,intervalMs:5000},dir,{confirmed:true,path})).rejects.toThrow(new RegExp("canonical","i"));expect(existsSync(path)).toBe(false);}finally{rmSync(dir,{recursive:true,force:true});}});

test.skipIf(process.platform!=='linux')('ativação e parada conferem unidade carregada e recusam drop-ins',async()=>{
 const {mkdirSync}=await import('node:fs');const {homedir}=await import('node:os');const {systemdCollector}=await import('../src/core/supervisor');const {stopSystemdCollector,systemdCollectorStatus,previewCollectorControl}=await import('../src/core/activate-collector');
 const dir=mkdtempSync(join(homedir(),'setupvibe-supervision-')),unitDirectory=join(dir,'systemd','user'),unit=join(unitDirectory,'setupvibe-collector.service'),path=join(dir,'state.db'),executable=join(dir,'systemctl'),running=join(dir,'running'),override=join(dir,'override');
 const previous=process.env.XDG_CONFIG_HOME;
 try{
  process.env.XDG_CONFIG_HOME=dir;mkdirSync(unitDirectory,{recursive:true});
  const config={executable:process.execPath,stateDirectory:dir,intervalMs:5000};writeFileSync(unit,systemdCollector(config),{mode:0o600});
  writeFileSync(executable,'#!'+process.execPath+'\n'+`const fs=require('node:fs'),running=${JSON.stringify(running)},override=${JSON.stringify(override)};const args=process.argv.slice(2);if(args.includes('show'))console.log('LoadState=loaded\\nActiveState='+(fs.existsSync(running)?'active':'inactive')+'\\nSubState=running\\nUnitFileState=enabled\\nFragmentPath='+${JSON.stringify(unit)}+'\\nDropInPaths='+(fs.existsSync(override)?'/external/override.conf':''));else if(args.includes('enable'))fs.writeFileSync(running,'yes');else if(args.includes('stop'))fs.rmSync(running,{force:true});else if(!args.includes('daemon-reload'))process.exit(1);`,{mode:0o700});
  expect((await previewCollectorControl(config,unitDirectory,'activate',executable)).executed).toBe(false);expect(existsSync(path)).toBe(false);
  expect((await activateSystemdCollector(config,unitDirectory,{confirmed:true,path,executable})).status).toBe('succeeded');expect((await systemdCollectorStatus(executable)).active).toBe('active');
  writeFileSync(override,'override');await expect(stopSystemdCollector(config,unitDirectory,{confirmed:true,path,executable})).rejects.toThrow('drop-ins');expect(existsSync(running)).toBe(true);rmSync(override);
  expect((await stopSystemdCollector(config,unitDirectory,{confirmed:true,path,executable})).status).toBe('succeeded');expect((await systemdCollectorStatus(executable)).active).toBe('inactive');expect(existsSync(unit)).toBe(true);writeFileSync(unit,'external');await expect(activateSystemdCollector(config,unitDirectory,{confirmed:true,path,executable})).rejects.toThrow('does not match');
 }finally{if(previous===undefined)delete process.env.XDG_CONFIG_HOME;else process.env.XDG_CONFIG_HOME=previous;rmSync(dir,{recursive:true,force:true});}
});
