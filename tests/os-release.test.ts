/** Verifica parsing sem shell e matriz explícita de distribuições. */
import{expect,test}from'bun:test';
import{parseOsRelease,validateLinuxRelease}from'../src/core/os-release';
test('lê valores entre aspas e ignora campos não utilizados',()=>{expect(parseOsRelease('NAME="Debian GNU/Linux"\nID=debian\nVERSION_ID="13"\n')).toEqual({id:'debian',version:'13'});expect(()=>validateLinuxRelease(parseOsRelease('ID=ubuntu\nVERSION_ID="24.04"'))).not.toThrow();});
test("recusa duplicates, expansão shell e identificação incompleta",()=>{for(const text of ['ID=debian\nID=ubuntu\nVERSION_ID=13','ID=$(whoami)\nVERSION_ID=13','ID=debian'])expect(()=>parseOsRelease(text)).toThrow();});
test('derivadas e versões não selecionadas não são presumidas compatíveis',()=>{for(const release of [{id:'arch',version:'rolling'},{id:'ubuntu',version:'22.04'},{id:'debian',version:'11'}])expect(()=>validateLinuxRelease(release)).toThrow(new RegExp("matrix","i"));});
test("detecção de arquivo missing retorna indisponibilidade explícita",async()=>{
 const{detectLinuxRelease}=await import('../src/core/os-release');expect(await detectLinuxRelease('/nonexistent/setupvibe/os-release')).toEqual({release:null,supported:false,error:"Linux identification is unavailable or invalid."});
});
