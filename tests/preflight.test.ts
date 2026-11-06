/** Verifica recusa antes da execução sem alterar o sistema operacional do teste. */
import{expect,test}from'bun:test';
import{installationPreflight}from'../src/core/preflight';
const target={edition:'desktop' as const,system:'linux',arch:'x64'};
test("precheck exige comprovação da matrix",async()=>{await expect(installationPreflight(target,async()=>({supported:false,description:'Arch'}))).rejects.toThrow(new RegExp("outside the supported matrix","i"));expect(await installationPreflight(target,async()=>({supported:true,description:'Debian 13'}))).toEqual({supported:true,description:'Debian 13'});});
test("platform invalid é recusada antes de inspect host",async()=>{let inspected=false;await expect(installationPreflight({...target,system:'win32'},async()=>{inspected=true;return{supported:true,description:'Windows'};})).rejects.toThrow(new RegExp("system","i"));expect(inspected).toBe(false);});
