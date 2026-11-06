/** Valida manifestos sem instalar ferramentas nem consultar serviços do host. */
import {expect,test} from 'bun:test';
import {parseInstallManifest} from '../src/core/install-manifest';
import {installSelection} from '../src/core/install-selection';
const target={edition:'desktop' as const,system:'linux',arch:'x64'};
const resources=[{kind:'application',id:'codex',version:'0.166.0'},{kind:'runtime',id:'bun',version:'1.3.14'},{kind:'application',id:'mise',version:'2026.11.0'}];
test('manifesto ordena dependências selecionadas pelo catálogo',()=>{
 expect(parseInstallManifest({schemaVersion:1,resources},target).map(item=>item.id)).toEqual(['mise','bun','codex']);
});
test('manifesto recusa campos desconhecidos, duplicatas, versões móveis e edição incompatível',()=>{
 for(const input of [{schemaVersion:2,resources},{schemaVersion:1,resources,confirm:true},{schemaVersion:1,resources:[resources[0],resources[0]]},{schemaVersion:1,resources:[{...resources[0],version:'latest'}]},{schemaVersion:1,resources:[{...resources[0],password:'secret'}]}])expect(()=>parseInstallManifest(input,target)).toThrow();
 expect(()=>parseInstallManifest({schemaVersion:1,resources},{...target,edition:'server'})).toThrow();
});
test('prévia verifica todos os recursos e não chama instaladores',async()=>{
 let previews=0,installs=0;
 const result=await installSelection([{kind:'runtime',id:'bun',version:'1.3.14'}],target,{confirmed:false,previewOnly:true},{credentials:()=>{},service:{preview:async()=>{throw Error('unexpected');},install:async()=>{throw Error('unexpected');}},runtime:{preview:async(id,version)=>{previews++;return{runtime:id,version,action:'install',steps:[],executed:false};},install:async()=>{installs++;return{status:'succeeded',operationId:'unexpected'};}}});
 expect(result.status).toBe('previewed');expect(previews).toBe(1);expect(installs).toBe(0);
});

test('manifesto aceita GitHub CLI nativo no Server',()=>{
 expect(parseInstallManifest({schemaVersion:1,resources:[{kind:'application',id:'gh',version:'2.103.3'}]},{edition:'server',system:'linux',arch:'x64'})).toEqual([{kind:'application',id:'gh',version:'2.103.3'}]);
});

test('manifesto aceita OpenCode no Desktop e recusa a seleção no Server',()=>{
 const input={schemaVersion:1,resources:[{kind:'application' as const,id:'opencode' as const,version:'1.19.5'}]};
 expect(parseInstallManifest(input,target)).toEqual(input.resources);
 expect(()=>parseInstallManifest(input,{edition:'server',system:'linux',arch:'x64'})).toThrow();
});

test('manifesto aceita Herdr no Desktop e recusa a seleção no Server',()=>{
 const input={schemaVersion:1,resources:[{kind:'application' as const,id:'herdr' as const,version:'0.9.5'}]};
 expect(parseInstallManifest(input,target)).toEqual(input.resources);
 expect(()=>parseInstallManifest(input,{edition:'server',system:'linux',arch:'x64'})).toThrow();
});

test('manifesto aceita candidato APT somente para Git no Linux',()=>{
 const input={schemaVersion:1,resources:[{kind:'application' as const,id:'git' as const,version:'candidate'}]};
 expect(parseInstallManifest(input,target)).toEqual(input.resources);
 expect(parseInstallManifest({...input,resources:[{...input.resources[0],version:'1:2.47.3-0+deb13u1'}]},target)).toEqual([{kind:'application',id:'git',version:'1:2.47.3-0+deb13u1'}]);
 expect(()=>parseInstallManifest(input,{...target,system:'darwin'})).toThrow();
 expect(()=>parseInstallManifest({...input,resources:[{...input.resources[0],version:'--option'}]},target)).toThrow();
});

test('manifesto aceita Docker APT e o ordena antes de serviços',()=>{
 const service={kind:'service',id:'redis',request:{id:'redis',image:'redis@sha256:'+'a'.repeat(64),port:6379,volume:'setupvibe-redis'}};
 expect(parseInstallManifest({schemaVersion:1,resources:[service,{kind:'application',id:'docker',version:'candidate'}]},target).map(item=>item.id)).toEqual(['docker','redis']);
 expect(()=>parseInstallManifest({schemaVersion:1,resources:[{kind:'application',id:'docker',version:'candidate'}]},{...target,system:'darwin'})).toThrow();
});
