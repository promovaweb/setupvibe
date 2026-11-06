/** Verifica que recusa de confirmação não cria estado nem consulta instaladores. */
import{expect,test}from'bun:test';
import{mkdtempSync,rmSync,existsSync}from'node:fs';
import{join}from'node:path';
import{tmpdir}from'node:os';
import{installRuntime}from'../src/core/runtime-install';
test('instalação sem confirmação não cria banco',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'setupvibe-install-')),path=join(dir,'state.db');
 try{await expect(installRuntime('node','24.1.0',{edition:'desktop',system:'linux',arch:'x64'},{confirmed:false,path})).rejects.toThrow(new RegExp("confirmation","i"));expect(existsSync(path)).toBe(false);}
 finally{rmSync(dir,{recursive:true,force:true});}
});
test("instalação integrada verifica version e registra ownership",async()=>{
 const{writeFileSync,chmodSync}=await import('node:fs');const{StateStore}=await import('../src/core/state');
 const dir=mkdtempSync(join(tmpdir(),'setupvibe-install-flow-')),path=join(dir,'state.db'),executable=join(dir,'mise'),installed=join(dir,'installed.json');
 const source='#!'+process.execPath+'\n'+`const fs=require('node:fs');const file=${JSON.stringify(installed)};const args=process.argv.slice(2);if(args[0]==='ls'){console.log(fs.existsSync(file)?fs.readFileSync(file,'utf8'):'{}');}else if(args[0]==='install'){const [runtime,version]=args[1].split('@');fs.writeFileSync(file,JSON.stringify({[runtime]:[{version,install_path:${JSON.stringify(dir)}+'/'+runtime+'/'+version,installed:true,active:false}]}));}else process.exit(2);`;
 try{writeFileSync(executable,source);chmodSync(executable,0o700);const result=await installRuntime('node','24.1.0',{edition:'desktop',system:'linux',arch:'x64'},{confirmed:true,path,executable});expect(result.status).toBe('succeeded');const store=new StateStore(path);try{expect(store.managed('node')?.version).toBe('24.1.0');expect(store.get(result.operationId!)?.status).toBe('succeeded');}finally{store.close();}const again=await installRuntime('node','24.1.0',{edition:'desktop',system:'linux',arch:'x64'},{confirmed:true,path,executable});expect(again.status).toBe('current');}
 finally{rmSync(dir,{recursive:true,force:true});}
});
test("comando bem sucedido sem runtime instalado não registra ownership",async()=>{
 const{writeFileSync,chmodSync}=await import('node:fs');const{StateStore}=await import('../src/core/state');
 const dir=mkdtempSync(join(tmpdir(),'setupvibe-install-false-')),path=join(dir,'state.db'),executable=join(dir,'mise');
 try{writeFileSync(executable,'#!'+process.execPath+'\n'+"if(process.argv[2]==='ls')console.log('{}');");chmodSync(executable,0o700);const result=await installRuntime('node','24.1.0',{edition:'desktop',system:'linux',arch:'x64'},{confirmed:true,path,executable});expect(result.status).toBe('failed');const store=new StateStore(path);try{expect(store.managed('node')).toBeNull();expect(store.get(result.operationId!)?.status).toBe('failed');expect(store.steps(result.operationId!)[0]?.status).toBe('succeeded');}finally{store.close();}}
 finally{rmSync(dir,{recursive:true,force:true});}
});
test("runtime external impede instalação e criação de estado",async()=>{
 const{writeFileSync,chmodSync}=await import('node:fs');const dir=mkdtempSync(join(tmpdir(),"setupvibe-external-")),path=join(dir,'state.db'),executable=join(dir,'mise');
 try{const discovered={node:[{version:'22.1.0',install_path:"/external/node",installed:true,active:true}]};writeFileSync(executable,'#!'+process.execPath+'\n'+'console.log('+JSON.stringify(JSON.stringify(discovered))+');');chmodSync(executable,0o700);await expect(installRuntime('node','24.1.0',{edition:'desktop',system:'linux',arch:'x64'},{confirmed:true,path,executable})).rejects.toThrow(new RegExp("external","i"));expect(existsSync(path)).toBe(false);}
 finally{rmSync(dir,{recursive:true,force:true});}
});
test('lock do fluxo impede segunda instalação antes de descobrir ambiente',async()=>{
 const{acquireCollectorLock}=await import('../src/core/collector-lock');const dir=mkdtempSync(join(tmpdir(),'setupvibe-flow-lock-')),path=join(dir,'state.db');const release=acquireCollectorLock(path+'.runtime-lock');
 try{await expect(installRuntime('node','24.1.0',{edition:'desktop',system:'linux',arch:'x64'},{confirmed:true,path,executable:'/missing/mise'})).rejects.toThrow(new RegExp("installer","i"));expect(existsSync(path)).toBe(false);}
 finally{release();rmSync(dir,{recursive:true,force:true});}
});
