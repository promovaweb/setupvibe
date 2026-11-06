/** Verifica planejamento mise sem baixar runtimes ou alterar configuração local. */
import{expect,test}from'bun:test';
import{miseInstallSteps}from'../src/adapters/mise';
const target={edition:'desktop' as const,system:'linux',arch:'x64'};
test("mise instala version explícita sem mise use ou arquivos de projeto",()=>{expect(miseInstallSteps('node','24.1.0',target)).toEqual([{id:'mise-install-node',command:'mise',args:['install','node@24.1.0']}]);});
test("recusa Server, runtime unknown, version móvel e injeção",()=>{expect(()=>miseInstallSteps('node','24.1.0',{...target,edition:'server'})).toThrow(new RegExp("Desktop","i"));for(const version of ['latest','lts','24;rm -rf /','--help'])expect(()=>miseInstallSteps('node',version,target)).toThrow(new RegExp("version","i"));expect(()=>miseInstallSteps('shell','1.0',target)).toThrow(new RegExp("Runtime","i"));});
test("descoberta valida JSON sem adotar instalações externals",async()=>{
 const {parseMiseInstallations,discoverMise}=await import('../src/adapters/mise');
 expect(parseMiseInstallations(JSON.stringify({node:[{version:'22.1.0',install_path:'/tools/node',installed:true,active:false}]}))).toEqual([{runtime:'node',version:'22.1.0',path:'/tools/node',active:false}]);
 expect(()=>parseMiseInstallations('{"node":[{}]}')).toThrow(new RegExp("invalid","i"));expect(()=>parseMiseInstallations('[]')).toThrow(new RegExp("invalid","i"));expect(await discoverMise('/missing/mise')).toEqual({available:false,installations:[]});
});
test("reconciliação preserva instalações externals e recusa divergências",async()=>{
 const{reconcileMise}=await import('../src/adapters/mise');const installed=[{runtime:'node',version:'22.1.0',path:'/managed/node',active:true}];
 expect(reconcileMise('node','24.1.0',[],null)).toBe('install');expect(()=>reconcileMise('node','24.1.0',installed,null)).toThrow(new RegExp("external","i"));expect(reconcileMise('node','22.1.0',installed,{version:'22.1.0',location:'/managed/node'})).toBe('current');expect(reconcileMise('node','24.1.0',installed,{version:'22.1.0',location:'/managed/node'})).toBe('update');expect(()=>reconcileMise('node','24.1.0',installed,{version:'22.1.0',location:'/other'})).toThrow(new RegExp("does not match","i"));
});
