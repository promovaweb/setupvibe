/** Usa releases simulados em prefixo descartável para verificar preservação, journal e rollback. */
import {expect,test} from 'bun:test';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,readlinkSync,symlinkSync,rmSync,existsSync,renameSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {activatePreparedRelease,previewSelfUpdate,updateSelf,previewSelfRollback,rollbackSelf,verifyReleaseVersion} from '../src/core/self-update';
import {fetchOfficialRelease,officialReleaseManifest,releaseDirectory,type ReleaseFetcher} from '../src/core/official-release';
const target={edition:'desktop' as const,system:'linux',arch:'x64'},sha=(bytes:Buffer|string)=>createHash('sha256').update(bytes).digest('hex');
const binary=(version:string)=>Buffer.from("#!/bin/sh\nprintf '%s\\n' '"+version+"'\n");
function fixture(){
 const root=mkdtempSync(join(homedir(),'setupvibe-self-update-')),prefix=join(root,'installation'),path=join(root,'state.db');mkdirSync(prefix,{mode:0o700});
 const seed=(version:string)=>{const name='setupvibe-'+version+'-linux-x64',bytes=binary(version);writeFileSync(join(prefix,name),bytes,{mode:0o700});writeFileSync(join(prefix,name+'.sha256'),sha(bytes)+'\n',{mode:0o600});return{name,bytes,sha256:sha(bytes)};};
 const old=seed('2.0.0');writeFileSync(join(prefix,'.setupvibe-bootstrap'),'setupvibe-bootstrap-v1\n',{mode:0o600});writeFileSync(join(prefix,'launch'),'launcher preserved',{mode:0o700});writeFileSync(join(prefix,'launch.sha256'),sha('launcher preserved')+'\n',{mode:0o600});symlinkSync(old.name,join(prefix,'current'));
 return{root,prefix,path,old,seed,cleanup:()=>rmSync(root,{recursive:true,force:true})};
}
function source(version='2.0.1',contents=binary(version),download:Buffer=contents){
 const manifest={version,artifacts:[{system:'linux',arch:'x64',url:releaseDirectory(version)+'/setupvibe-'+version+'-linux-x64',sha256:sha(contents)}]};
 const fetcher:ReleaseFetcher=async url=>url.pathname.endsWith('/release-manifest.json')?Response.json(manifest):new Response(new Uint8Array(download));return{manifest,fetcher};
}
test('metadados oficiais recusam versão, origem, tamanho e redirects divergentes',async()=>{
 const sample=source();expect(()=>officialReleaseManifest({...sample.manifest,version:'2.0.2'},'2.0.1',target)).toThrow('mismatch');expect(()=>officialReleaseManifest({...sample.manifest,artifacts:[{...sample.manifest.artifacts[0],url:'https://foreign.test/file'}]},'2.0.1',target)).toThrow('official release');
 await expect(fetchOfficialRelease('latest',target,{fetcher:sample.fetcher})).rejects.toThrow('fixed');await expect(fetchOfficialRelease('2.0.1',target,{fetcher:async()=>new Response(null,{status:302,headers:{location:'https://foreign.test/metadata'}})})).rejects.toThrow('redirect host');await expect(fetchOfficialRelease('2.0.1',target,{fetcher:async()=>new Response('x'.repeat(1048577))})).rejects.toThrow('limit');
});
test.skipIf(process.platform!=='linux')('prévia é somente leitura e alteração exige confirmação',async()=>{
 const f=fixture(),provider=source();try{
  const preview=await previewSelfUpdate('2.0.1',f.prefix,target,{fetcher:provider.fetcher});expect(preview.action).toBe('update');expect(preview.executed).toBe(false);expect(existsSync(f.path)).toBe(false);expect(existsSync(join(f.prefix,'.bootstrap-lock'))).toBe(false);
  await expect(updateSelf('2.0.1',f.prefix,target,{confirmed:false,fetcher:provider.fetcher,path:f.path})).rejects.toThrow('confirmation');await expect(rollbackSelf(f.prefix,target,{confirmed:false,path:f.path})).rejects.toThrow('confirmation');expect(readlinkSync(join(f.prefix,'current'))).toBe(f.old.name);
 }finally{f.cleanup();}
});
test.skipIf(process.platform!=='linux')('checksum incorreto preserva current e repetição válida permite rollback idempotente',async()=>{
 const f=fixture(),valid=source();try{
  expect((await updateSelf('2.0.1',f.prefix,target,{confirmed:true,path:f.path,fetcher:source('2.0.1',binary('2.0.1'),Buffer.from('bad')).fetcher})).status).toBe('failed');expect(readlinkSync(join(f.prefix,'current'))).toBe(f.old.name);
  expect((await updateSelf('2.0.1',f.prefix,target,{confirmed:true,path:f.path,fetcher:valid.fetcher})).status).toBe('succeeded');expect(readlinkSync(join(f.prefix,'current'))).toBe('setupvibe-2.0.1-linux-x64');expect(readFileSync(join(f.prefix,f.old.name))).toEqual(f.old.bytes);expect(readFileSync(join(f.prefix,'launch'),'utf8')).toBe('launcher preserved');
  expect((await updateSelf('2.0.1',f.prefix,target,{confirmed:true,path:f.path,fetcher:valid.fetcher})).status).toBe('current');expect((await previewSelfRollback(f.prefix,target)).action).toBe('rollback');expect((await rollbackSelf(f.prefix,target,{confirmed:true,path:f.path})).status).toBe('succeeded');expect(readlinkSync(join(f.prefix,'current'))).toBe(f.old.name);expect((await rollbackSelf(f.prefix,target,{confirmed:true,path:f.path})).status).toBe('current');
 }finally{f.cleanup();}
});
test.skipIf(process.platform!=='linux')('rollback recusa bytes anteriores alterados e update recusa artefato externo',async()=>{
 const f=fixture();try{
  await updateSelf('2.0.1',f.prefix,target,{confirmed:true,path:f.path,fetcher:source().fetcher});writeFileSync(join(f.prefix,f.old.name),'changed');await expect(rollbackSelf(f.prefix,target,{confirmed:true,path:f.path})).rejects.toThrow('checksum');expect(readlinkSync(join(f.prefix,'current'))).toBe('setupvibe-2.0.1-linux-x64');writeFileSync(join(f.prefix,f.old.name),f.old.bytes);
  writeFileSync(join(f.prefix,'setupvibe-2.0.2-linux-x64'),'external',{mode:0o700});await expect(previewSelfUpdate('2.0.2',f.prefix,target,{fetcher:source('2.0.2').fetcher})).rejects.toThrow('external artifact');expect(readFileSync(join(f.prefix,'setupvibe-2.0.2-linux-x64'),'utf8')).toBe('external');
 }finally{f.cleanup();}
});
test.skipIf(process.platform!=='linux')('journal pendente com ponteiro já ativado permite rollback e nova atualização',async()=>{
 const f=fixture();try{
  await updateSelf('2.0.1',f.prefix,target,{confirmed:true,path:f.path,fetcher:source().fetcher});renameSync(join(f.prefix,'.setupvibe-update.json'),join(f.prefix,'.setupvibe-update-pending.json'));
  expect((await previewSelfRollback(f.prefix,target)).action).toBe('rollback');expect((await updateSelf('2.0.2',f.prefix,target,{confirmed:true,path:f.path,fetcher:source('2.0.2').fetcher})).status).toBe('succeeded');expect((await rollbackSelf(f.prefix,target,{confirmed:true,path:f.path})).status).toBe('succeeded');expect(readlinkSync(join(f.prefix,'current'))).toBe('setupvibe-2.0.1-linux-x64');expect((await rollbackSelf(f.prefix,target,{confirmed:true,path:f.path})).status).toBe('current');
 }finally{f.cleanup();}
});
test.skipIf(process.platform!=='linux')('tentativa pendente sem ativação não apaga o rollback da última atualização',async()=>{
 const f=fixture();try{
  await updateSelf('2.0.1',f.prefix,target,{confirmed:true,path:f.path,fetcher:source().fetcher});const future=f.seed('2.0.2'),current=f.seed('2.0.1');writeFileSync(join(f.prefix,'.setupvibe-update-pending.json'),JSON.stringify({schemaVersion:1,id:crypto.randomUUID(),artifact:future.name,sha256:future.sha256,previous:current.name,previousSha256:current.sha256}),{mode:0o600});
  expect((await rollbackSelf(f.prefix,target,{confirmed:true,path:f.path})).status).toBe('succeeded');expect(readlinkSync(join(f.prefix,'current'))).toBe(f.old.name);expect(existsSync(join(f.prefix,'.setupvibe-update-pending.json'))).toBe(false);expect((await previewSelfRollback(f.prefix,target)).action).toBe('current');
 }finally{f.cleanup();}
});
test.skipIf(process.platform!=='linux')('versão divergente e cancelamento preservam a instalação anterior',async()=>{
 const f=fixture();try{
  expect((await updateSelf('2.0.1',f.prefix,target,{confirmed:true,path:f.path,fetcher:source('2.0.1',binary('2.0.9')).fetcher})).status).toBe('failed');expect(readlinkSync(join(f.prefix,'current'))).toBe(f.old.name);
  const controller=new AbortController(),provider=source('2.0.2'),fetcher:ReleaseFetcher=async(url,init)=>url.pathname.endsWith('/release-manifest.json')?provider.fetcher(url,init):new Response(new ReadableStream({start(stream){stream.enqueue(new Uint8Array([1]));setTimeout(()=>controller.abort(),5);}}));
  expect((await updateSelf('2.0.2',f.prefix,target,{confirmed:true,path:f.path,fetcher,signal:controller.signal})).status).toBe('cancelled');expect(readlinkSync(join(f.prefix,'current'))).toBe(f.old.name);expect(existsSync(join(f.prefix,'.bootstrap-lock'))).toBe(false);
 }finally{f.cleanup();}
});
test.skipIf(process.platform!=='linux')('ativação de cache registrado usa o journal compartilhado sem rede',async()=>{
 const f=fixture();try{
  await expect(activatePreparedRelease('2.0.1','a'.repeat(64),f.prefix,target,{confirmed:true,path:f.path})).rejects.toThrow('missing or unregistered');expect(existsSync(f.path)).toBe(false);
  const cached=f.seed('2.0.1');expect((await activatePreparedRelease('2.0.1',cached.sha256,f.prefix,target,{confirmed:true,path:f.path,fetcher:async()=>{throw Error('unexpected network');}})).status).toBe('succeeded');expect((await rollbackSelf(f.prefix,target,{confirmed:true,path:f.path})).status).toBe('succeeded');expect(readlinkSync(join(f.prefix,'current'))).toBe(f.old.name);
 }finally{f.cleanup();}
});
test.skipIf(process.platform!=='linux')('cancelamento da verificação aguarda encerrar processo que ignora SIGTERM',async()=>{
 const f=fixture(),pidPath=join(f.root,'version.pid'),program=join(f.root,'version-check'),controller=new AbortController(),quoted="'"+pidPath.replaceAll("'","'\\''")+"'";
 writeFileSync(program,'#!/bin/sh\nprintf "%s" "$$" > '+quoted+"\ntrap '' TERM\nexec /bin/sleep 30\n",{mode:0o700});const pending=verifyReleaseVersion(program,'2.0.0',controller.signal).then(()=>null,error=>error);
 try{
  const deadline=Date.now()+2000;while(!existsSync(pidPath)&&Date.now()<deadline)await Bun.sleep(5);expect(existsSync(pidPath)).toBe(true);const pid=Number(readFileSync(pidPath,'utf8'));controller.abort();expect(await pending).toBeInstanceOf(Error);expect(()=>process.kill(pid,0)).toThrow();
 }finally{controller.abort();await pending;f.cleanup();}
});

test.skipIf(process.platform!=='linux')('revisão divergente recusa update e rollback antes de escrever',async()=>{
 const f=fixture();try{
  const options={confirmed:true,path:f.path,fetcher:source().fetcher};
  await expect(updateSelf('2.0.1',f.prefix,target,{...options,expectedCurrent:{artifact:f.old.name,sha256:'0'.repeat(64)}})).rejects.toThrow('changed after review');
  await expect(updateSelf('2.0.1',f.prefix,target,{...options,expectedSha256:'0'.repeat(64)})).rejects.toThrow('checksum changed after review');
  expect(existsSync(f.path)).toBe(false);expect(existsSync(join(f.prefix,'.bootstrap-lock'))).toBe(false);expect(readlinkSync(join(f.prefix,'current'))).toBe(f.old.name);
  await updateSelf('2.0.1',f.prefix,target,options);const preview=await previewSelfRollback(f.prefix,target);
  await expect(rollbackSelf(f.prefix,target,{confirmed:true,path:f.path,expectedCurrent:{artifact:f.old.name,sha256:f.old.sha256}})).rejects.toThrow('Active SetupVibe release changed');
  await expect(rollbackSelf(f.prefix,target,{confirmed:true,path:f.path,expectedCurrent:{artifact:preview.activeArtifact,sha256:preview.activeSha256},expectedPrevious:{artifact:f.old.name,sha256:'0'.repeat(64)}})).rejects.toThrow('rollback target changed');
  expect(readlinkSync(join(f.prefix,'current'))).toBe(preview.activeArtifact);expect(existsSync(join(f.prefix,'.bootstrap-lock'))).toBe(false);
 }finally{f.cleanup();}
});
