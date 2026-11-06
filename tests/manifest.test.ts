/** Verifica seleção de platform e recusa metadados ambíguos antes do download. */
import{expect,test}from'bun:test';
import{parseManifest,selectArtifact}from'../src/core/manifest';
const artifact={system:'linux',arch:'x64',url:'https://example.com/setupvibe',sha256:'a'.repeat(64)};
const manifest={version:'2.0.0',artifacts:[artifact]};
test('seleciona somente arquitetura e sistema correspondentes',()=>{expect(selectArtifact(manifest,{edition:'server',system:'linux',arch:'x64'})).toEqual(artifact);expect(()=>selectArtifact(manifest,{edition:'desktop',system:'darwin',arch:'arm64'})).toThrow(new RegExp("no artifact","i"));});
test("recusa duplicates, URL sem TLS e campos unknowns",()=>{expect(()=>parseManifest({...manifest,artifacts:[artifact,artifact]})).toThrow(new RegExp("duplicate","i"));expect(()=>parseManifest({...manifest,artifacts:[{...artifact,url:'http://example.com/a'}]})).toThrow(new RegExp("URL","i"));expect(()=>parseManifest({...manifest,extra:true})).toThrow(new RegExp("manifest","i"));expect(()=>parseManifest({...manifest,version:'latest'})).toThrow(new RegExp("manifest","i"));});
