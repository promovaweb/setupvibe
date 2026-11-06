/** Atualiza o próprio SetupVibe e permite rollback com os mesmos recibos e lock do bootstrap. */
import {constants} from 'node:fs';
import {lstat,open,readlink,realpath,mkdir,rmdir,mkdtemp,rename,rm,unlink} from 'node:fs/promises';
import {dirname,join,parse,isAbsolute,normalize} from 'node:path';
import {spawn} from 'node:child_process';
import {verifyArtifact} from './integrity';
import {prepareRelease} from './prepare-release';
import {activateRelease} from './release-pointer';
import {selectArtifact} from './manifest';
import {fetchOfficialRelease,fixedReleaseVersion,releaseRedirectHosts,type ReleaseFetcher} from './official-release';
import {installationPreflight} from './preflight';
import {StateStore} from './state';
import {statePath} from './history';
import {executeSteps} from './executor';
import type {Target} from './platform';
interface Journal {schemaVersion:1;id:string;artifact:string;sha256:string;previous:string;previousSha256:string;}
export interface ReleaseReview {artifact:string;sha256:string;}
interface Options {path?:string;signal?:AbortSignal;fetcher?:ReleaseFetcher;verifyVersion?:typeof verifyReleaseVersion;expectedCurrent?:ReleaseReview;expectedSha256?:string;}
const pendingName='.setupvibe-update-pending.json',headName='.setupvibe-update.json';
/** Prefixo pode ser inferido somente do executável real, nunca do PATH de outro programa. */
export async function selfInstallDirectory(){return dirname(await realpath(process.execPath));}
/** Diretórios de instalação devem manter o contrato de propriedade adotado pelo bootstrap. */
async function privateParents(directory:string){
 if(!isAbsolute(directory)||directory!==normalize(directory)||directory==='/')throw Error('SetupVibe installation directory must be a normalized absolute path.');
 const root=parse(directory).root;let current=root;
 for(const part of directory.slice(root.length).split('/').filter(Boolean)){current=join(current,part);const stat=await lstat(current);if(!stat.isDirectory()||stat.isSymbolicLink()||(stat.mode&0o022)!==0||![0,process.getuid?.()].includes(stat.uid))throw Error('SetupVibe installation directories must reject symlinks and external writes.');}
}
async function regular(path:string){const stat=await lstat(path);if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||stat.uid!==process.getuid?.()||(stat.mode&0o022)!==0)throw Error('SetupVibe ownership file is external or unsafe.');return stat;}
async function privateText(path:string,optional=false){
 let file;try{file=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);}catch(error){if(optional&&(error as NodeJS.ErrnoException).code==='ENOENT')return null;throw error;}
 try{const stat=await regular(path),descriptor=await file.stat();if(stat.dev!==descriptor.dev||stat.ino!==descriptor.ino||stat.size>4096)throw Error('SetupVibe ownership metadata is invalid.');const bytes=await file.readFile(),after=await file.stat();if(stat.size!==after.size||stat.ctimeMs!==after.ctimeMs||stat.mtimeMs!==after.mtimeMs)throw Error('SetupVibe ownership metadata changed.');return bytes.toString('utf8');}finally{await file.close();}
}
function artifactVersion(name:string,target:Target){const match=name.match(/^setupvibe-(\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?)-(linux|darwin)-(x64|arm64)$/);if(!match||match[2]!==target.system||match[3]!==target.arch)throw Error('Registered SetupVibe artifact does not match this platform.');return match[1]!;}
async function hashReceipt(prefix:string,name:string,optional=false){const text=await privateText(join(prefix,name+'.sha256'),optional);if(text===null)return null;if(!/^[a-f0-9]{64}\n?$/.test(text))throw Error('Invalid SetupVibe checksum receipt.');return text.trim();}
async function ownedArtifact(prefix:string,name:string,target:Target){const version=artifactVersion(name,target),sha256=await hashReceipt(prefix,name);if(!sha256)throw Error('SetupVibe artifact has no ownership receipt.');const path=join(prefix,name);await regular(path);await verifyArtifact(path,sha256);return{name,version,sha256,path};}
async function journal(prefix:string,name:string){
 const text=await privateText(join(prefix,name),true);if(text===null)return null;let value:Journal;try{value=JSON.parse(text);}catch{throw Error('Invalid SetupVibe update journal.');}
 if(value?.schemaVersion!==1||!/^[a-f0-9-]{36}$/.test(value.id)||typeof value.artifact!=='string'||typeof value.previous!=='string'||value.artifact===value.previous||![value.artifact,value.previous].every(item=>/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(item))||![value.sha256,value.previousSha256].every(item=>typeof item==='string'&&/^[a-f0-9]{64}$/.test(item)))throw Error('Invalid SetupVibe update journal.');return value;
}
async function installation(prefix:string,target:Target){
 await installationPreflight(target);await privateParents(prefix);
 if(await privateText(join(prefix,'.setupvibe-bootstrap'))!=='setupvibe-bootstrap-v1\n')throw Error('SetupVibe installation is not registered by the bootstrap.');
 const pointer=join(prefix,'current'),stat=await lstat(pointer);if(!stat.isSymbolicLink()||stat.uid!==process.getuid?.())throw Error('SetupVibe current pointer is external.');
 const current=await ownedArtifact(prefix,await readlink(pointer),target),launcher=await hashReceipt(prefix,'launch');if(!launcher)throw Error('SetupVibe launcher has no receipt.');await regular(join(prefix,'launch'));await verifyArtifact(join(prefix,'launch'),launcher);
 const pending=await journal(prefix,pendingName),head=await journal(prefix,headName);
 if(pending&&!([pending.artifact,pending.previous].includes(current.name)))throw Error('SetupVibe pending update does not match the active release; reconciliation required.');
 if(pending&&(current.name===pending.artifact?pending.sha256:pending.previousSha256)!==current.sha256)throw Error('SetupVibe pending update checksum mismatch.');
 return{prefix,current,pending,head};
}
async function candidate(prefix:string,name:string,sha256:string,target:Target){
 const receipt=await hashReceipt(prefix,name,true);if(receipt!==null&&receipt!==sha256)throw Error('Registered SetupVibe version differs from the official release.');
 try{await lstat(join(prefix,name));}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return false;throw error;}
 if(receipt===null)throw Error('SetupVibe release path belongs to an external artifact.');await ownedArtifact(prefix,name,target);return true;
}
async function executableMode(path:string){const file=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);try{const stat=await file.stat();if(!stat.isFile()||stat.nlink!==1||stat.uid!==process.getuid?.())throw Error('SetupVibe executable ownership changed.');await file.chmod(0o700);}finally{await file.close();}}
/** A versão só é consultada depois de verificar bytes e propriedade; cancelamento aguarda o processo terminar. */
export async function verifyReleaseVersion(path:string,version:string,signal?:AbortSignal):Promise<void>{
 await new Promise<void>((resolve,reject)=>{
  const child=spawn(path,['--version'],{stdio:['ignore','pipe','ignore'],shell:false,detached:process.platform!=='win32',env:{PATH:process.env.PATH??'/usr/bin:/bin',LC_ALL:'C'}});let output='',failed=false,escalation:ReturnType<typeof setTimeout>|undefined,stopped:Promise<void>|undefined;
  const kill=(force=false)=>{if(!child.pid)return;try{if(process.platform!=='win32')process.kill(-child.pid,force?'SIGKILL':'SIGTERM');else child.kill(force?'SIGKILL':'SIGTERM');}catch{/* O processo pode já ter terminado. */}};
  const stop=()=>{failed=true;if(!stopped){kill();stopped=new Promise(done=>{escalation=setTimeout(()=>{kill(true);done();},250);});}},timeout=setTimeout(stop,10000);signal?.addEventListener('abort',stop,{once:true});
  child.stdout.setEncoding('utf8');child.stdout.on('data',(chunk:string)=>{if(failed)return;if(output.length+chunk.length>8192){stop();return;}output+=chunk;});child.once('error',()=>{failed=true;});
  child.once('close',code=>{clearTimeout(timeout);signal?.removeEventListener('abort',stop);void(stopped??Promise.resolve()).then(()=>{clearTimeout(escalation);if(failed||signal?.aborted||code!==0||output.trim()!==version)reject(Error('SetupVibe executable version verification failed.'));else resolve();});});if(signal?.aborted)stop();
 });
}
async function updatePlan(version:string,prefix:string,target:Target,options:Options){
 fixedReleaseVersion(version);const installed=await installation(prefix,target),manifest=await fetchOfficialRelease(version,target,options),artifact=selectArtifact(manifest,target),name='setupvibe-'+version+'-'+target.system+'-'+target.arch,reusable=await candidate(prefix,name,artifact.sha256,target);
 return{...installed,manifest,artifact,name,reusable,action:installed.current.name===name?'current' as const:'update' as const};
}
/** Consulta origem oficial e instalação registrada, sem criar lock, histórico ou diretórios. */
export async function previewSelfUpdate(version:string,prefix:string,target:Target,options:Options={}){const plan=await updatePlan(version,prefix,target,options);return{action:plan.action,version,previousVersion:plan.current.version,activeArtifact:plan.current.name,activeSha256:plan.current.sha256,artifact:plan.artifact,reusable:plan.reusable,executed:false as const};}
function reviewed(current:{name:string;sha256:string},expected?:ReleaseReview){if(expected&&(current.name!==expected.artifact||current.sha256!==expected.sha256))throw Error('Active SetupVibe release changed after review.');}
async function writeJson(prefix:string,name:string,value:Journal){const staging=await mkdtemp(join(prefix,'.update-record-'));try{const path=join(staging,'record'),file=await open(path,'wx',0o600);try{await file.writeFile(JSON.stringify(value)+'\n');await file.sync();}finally{await file.close();}await rename(path,join(prefix,name));}finally{await rm(staging,{recursive:true,force:true});}}
async function reserveReceipt(prefix:string,name:string,sha256:string){const existing=await hashReceipt(prefix,name,true);if(existing!==null){if(existing!==sha256)throw Error('SetupVibe receipt changed.');return;}const file=await open(join(prefix,name+'.sha256'),'wx',0o600);try{await file.writeFile(sha256+'\n');await file.sync();}finally{await file.close();}}
/** mkdir compartilha exclusão com o bootstrap Bash, preservando locks que já existiam. */
async function updateLock(prefix:string){const path=join(prefix,'.bootstrap-lock');try{await mkdir(path,{mode:0o700});}catch{throw Error('Another SetupVibe bootstrap or update is active, or a stale lock requires inspection.');}return()=>rmdir(path);}
/** Download ou verificação inválidos preservam current; recibos anteriores e launcher são reutilizados. */
export async function updateSelf(version:string,prefix:string,target:Target,options:Options&{confirmed:boolean}){
 if(!options.confirmed)throw Error('Explicit confirmation required.');if(options.signal?.aborted)return{status:'cancelled' as const,operationId:null};
 const plan=await updatePlan(version,prefix,target,options).catch(error=>{if(options.signal?.aborted)return null;throw error;});if(!plan||options.signal?.aborted)return{status:'cancelled' as const,operationId:null};
 if(options.expectedSha256&&options.expectedSha256!==plan.artifact.sha256)throw Error('SetupVibe release checksum changed after review.');
 return applySelfUpdate(plan,prefix,target,options);
}
/** A ativação compartilhada mantém o mesmo journal em updates de rede e no bootstrap com artefato já verificado. */
async function applySelfUpdate(plan:Awaited<ReturnType<typeof updatePlan>>,prefix:string,target:Target,options:Options&{confirmed:boolean},requireCached=false){
 reviewed(plan.current,options.expectedCurrent);
 if(plan.action==='current')return{status:'current' as const,operationId:null,activeArtifact:plan.current.name};
 const release=await updateLock(prefix);let store:StateStore|undefined;
 try{
  const active=await installation(prefix,target);reviewed(active.current,options.expectedCurrent);if(options.signal?.aborted)return{status:'cancelled' as const,operationId:null};if(active.current.name===plan.name&&active.current.sha256===plan.artifact.sha256)return{status:'current' as const,operationId:null,activeArtifact:active.current.name};
  if(active.current.name!==plan.current.name||active.current.sha256!==plan.current.sha256)throw Error('SetupVibe active release changed after review.');
  const reusable=await candidate(prefix,plan.name,plan.artifact.sha256,target);if(requireCached&&!reusable)throw Error('SetupVibe cached release disappeared; activation refused.');store=new StateStore(options.path??statePath(),true);let errorMessage:string|undefined;
  const result=await executeSteps(store,[],{confirmed:true,signal:options.signal,verify:async()=>{try{
   if(active.pending&&active.current.name===active.pending.artifact)await rename(join(prefix,pendingName),join(prefix,headName));
   await reserveReceipt(prefix,plan.name,plan.artifact.sha256);
   if(!reusable)await prepareRelease(plan.manifest,target,prefix,{signal:options.signal,redirectHosts:releaseRedirectHosts,timeoutMs:180000,fetcher:options.fetcher});
   const path=join(prefix,plan.name);await executableMode(path);await ownedArtifact(prefix,plan.name,target);await(options.verifyVersion??verifyReleaseVersion)(path,plan.manifest.version,options.signal);
   if(options.signal?.aborted)throw Error('SetupVibe update cancelled.');
   const record:Journal={schemaVersion:1,id:crypto.randomUUID(),artifact:plan.name,sha256:plan.artifact.sha256,previous:active.current.name,previousSha256:active.current.sha256};await writeJson(prefix,pendingName,record);
   if(options.signal?.aborted)throw Error('SetupVibe update cancelled.');
   const checked=await installation(prefix,target);if(checked.current.name!==active.current.name||checked.current.sha256!==active.current.sha256)throw Error('SetupVibe changed before activation.');
   await activateRelease(prefix,path,true);await rename(join(prefix,pendingName),join(prefix,headName));
  }catch(error){errorMessage=error instanceof Error?error.message:'SetupVibe update failed.';throw error;}}});
  return{status:result.status,operationId:result.id,activeArtifact:await readlink(join(prefix,'current')),...(errorMessage?{error:errorMessage}:{})};
 }finally{store?.close();await release();}
}
/** Ativa apenas cache registrado com hash explícito; usado pelo bootstrap sem repetir o download ou consultar a rede. */
export async function activatePreparedRelease(version:string,sha256:string,prefix:string,target:Target,options:Options&{confirmed:boolean}){
 if(!options.confirmed)throw Error('Explicit confirmation required.');fixedReleaseVersion(version);if(!/^[a-f0-9]{64}$/.test(sha256))throw Error('A valid release SHA-256 is required.');if(options.signal?.aborted)return{status:'cancelled' as const,operationId:null};
 const installed=await installation(prefix,target),name='setupvibe-'+version+'-'+target.system+'-'+target.arch,artifact={system:target.system,arch:target.arch,url:'https://github.com/promovaweb/setupvibe/releases/download/v'+version+'/'+name,sha256},manifest={version,artifacts:[artifact]},reusable=await candidate(prefix,name,sha256,target);
 if(options.signal?.aborted)return{status:'cancelled' as const,operationId:null};if(!reusable)throw Error('SetupVibe cached release is missing or unregistered.');
 const plan={...installed,manifest,artifact,name,reusable,action:installed.current.name===name?'current' as const:'update' as const};return applySelfUpdate(plan,prefix,target,options,true);
}
async function rollbackPlan(prefix:string,target:Target){
 const installed=await installation(prefix,target),record=installed.pending&&installed.current.name===installed.pending.artifact?installed.pending:installed.head;
 if(!record)return{...installed,record:null,previous:null,action:'unavailable' as const};
 if(installed.current.name===record.previous){if(installed.current.sha256!==record.previousSha256)throw Error('Rolled-back SetupVibe checksum changed.');return{...installed,record,previous:installed.current,action:'current' as const};}
 if(installed.current.name!==record.artifact||installed.current.sha256!==record.sha256)throw Error('SetupVibe update journal is stale; rollback refused.');
 const previous=await ownedArtifact(prefix,record.previous,target);if(previous.sha256!==record.previousSha256)throw Error('Previous SetupVibe checksum changed.');return{...installed,record,previous,action:'rollback' as const};
}
/** Rollback usa bytes registrados localmente e não depende de rede. */
export async function previewSelfRollback(prefix:string,target:Target){const plan=await rollbackPlan(prefix,target);return{action:plan.action,activeVersion:plan.current.version,activeArtifact:plan.current.name,activeSha256:plan.current.sha256,previousVersion:plan.previous?.version??null,previousArtifact:plan.previous?.name??null,previousSha256:plan.previous?.sha256??null,executed:false as const};}
/** Promove journal pendente quando necessário e volta somente ao artefato anterior com checksum e recibo válidos. */
export async function rollbackSelf(prefix:string,target:Target,options:{confirmed:boolean;path?:string;signal?:AbortSignal;verifyVersion?:typeof verifyReleaseVersion;expectedCurrent?:ReleaseReview;expectedPrevious?:ReleaseReview}){
 if(!options.confirmed)throw Error('Explicit confirmation required.');if(options.signal?.aborted)return{status:'cancelled' as const,operationId:null};
 const initial=await rollbackPlan(prefix,target);reviewed(initial.current,options.expectedCurrent);if(options.expectedPrevious&&(!initial.previous||initial.previous.name!==options.expectedPrevious.artifact||initial.previous.sha256!==options.expectedPrevious.sha256))throw Error('SetupVibe rollback target changed after review.');if(options.signal?.aborted)return{status:'cancelled' as const,operationId:null};if(initial.action==='unavailable')throw Error('SetupVibe has no recorded update to roll back.');if(initial.action==='current')return{status:'current' as const,operationId:null,activeArtifact:initial.current.name};
 const release=await updateLock(prefix);let store:StateStore|undefined;
 try{
  const plan=await rollbackPlan(prefix,target);reviewed(plan.current,options.expectedCurrent);if(options.expectedPrevious&&(!plan.previous||plan.previous.name!==options.expectedPrevious.artifact||plan.previous.sha256!==options.expectedPrevious.sha256))throw Error('SetupVibe rollback target changed after review.');if(options.signal?.aborted)return{status:'cancelled' as const,operationId:null};if(plan.action==='current')return{status:'current' as const,operationId:null,activeArtifact:plan.current.name};if(plan.action!=='rollback'||!plan.previous||!plan.record)throw Error('SetupVibe rollback changed after review.');
  store=new StateStore(options.path??statePath(),true);let errorMessage:string|undefined;
  const result=await executeSteps(store,[],{confirmed:true,signal:options.signal,verify:async()=>{try{
   await(options.verifyVersion??verifyReleaseVersion)(plan.previous.path,plan.previous.version,options.signal);
   if(options.signal?.aborted)throw Error('SetupVibe rollback cancelled.');
   if(plan.pending){if(plan.current.name===plan.pending.artifact)await rename(join(prefix,pendingName),join(prefix,headName));else await unlink(join(prefix,pendingName));}
   const checked=await installation(prefix,target);if(checked.current.name!==plan.current.name||checked.current.sha256!==plan.current.sha256)throw Error('SetupVibe changed before rollback.');await activateRelease(prefix,plan.previous.path,true);
  }catch(error){errorMessage=error instanceof Error?error.message:'SetupVibe rollback failed.';throw error;}}});
  return{status:result.status,operationId:result.id,activeArtifact:await readlink(join(prefix,'current')),...(errorMessage?{error:errorMessage}:{})};
 }finally{store?.close();await release();}
}
