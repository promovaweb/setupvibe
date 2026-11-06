/** Confere origem do mise e instalação opt-in sem alterar o mise externo do usuário. */
import {expect,test} from 'bun:test';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {homedir} from 'node:os';
import {parseMiseArtifact} from '../src/core/mise-artifact';
import {installMise,misePreview} from '../src/core/install-mise';
import {miseExecutable} from '../src/core/mise-executable';
const target={edition:'desktop' as const,system:'linux',arch:'x64'};
test('release mise exige digest e origem oficial para a platform exata',()=>{
 const asset={name:'mise-v2026.11.0-linux-x64',digest:'sha256:'+'a'.repeat(64),size:100,browser_download_url:'https://github.com/jdx/mise/releases/download/v2026.11.0/mise-v2026.11.0-linux-x64'},release={tag_name:'v2026.11.0',assets:[asset]};
 expect(parseMiseArtifact(release,'2026.11.0',target).sha256).toBe('a'.repeat(64));
 expect(()=>parseMiseArtifact({...release,assets:[{...asset,browser_download_url:'https://example.com/mise'}]},'2026.11.0',target)).toThrow(new RegExp("invalid","i"));
 expect(()=>parseMiseArtifact({...release,assets:[asset,asset]},'2026.11.0',target)).toThrow(new RegExp("invalid","i"));
});
test("mise exige confirmação antes de read onlyr release",async()=>{await expect(installMise('2026.11.0',target,{confirmed:false})).rejects.toThrow(new RegExp("confirmation","i"));});
(process.env.SETUPVIBE_MISE_INTEGRATION==='1'?test:test.skip)("mise próprio instala, verifica e resolve sem alterar PATH external",async()=>{
 const dir=mkdtempSync(join(homedir(),'setupvibe-mise-native-')),path=join(dir,'state.db'),external=Bun.which('mise');
 try{
  const result=await installMise('2026.11.0',target,{confirmed:true,path,directory:join(dir,'apps')});expect(result.status).toBe('succeeded');expect(miseExecutable(path)).toBe(result.executable!);expect(Bun.which('mise')).toBe(external);
  expect((await misePreview('2026.11.0',target,{path})).action).toBe('current');expect((await installMise('2026.11.0',target,{confirmed:true,path})).status).toBe('current');
 }finally{rmSync(dir,{recursive:true,force:true});}
},180000);
