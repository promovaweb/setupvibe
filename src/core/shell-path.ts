/** Integra PATH em perfis Bash/Zsh com backup, recibo e remoção exclusiva do bloco registrado. */
import {createHash} from 'node:crypto';
import {constants,type Stats} from 'node:fs';
import {access,lstat,open,mkdir,mkdtemp,rename,rm,unlink} from 'node:fs/promises';
import {homedir} from 'node:os';
import {basename,dirname,isAbsolute,join,normalize,parse} from 'node:path';
import {StateStore} from './state';
import {statePath} from './history';
import {acquireCollectorLock} from './collector-lock';
import {executeSteps} from './executor';
import {preserveProfileMetadata} from './profile-metadata';
export type PathShell='bash'|'zsh';
export interface PathOptions {home?:string;zdotdir?:string;path?:string;}
/** Resultado não contém o conteúdo dos perfis; backups ficam privados no diretório de estado. */
export interface PathResult {status:'succeeded'|'failed'|'cancelled'|'current';operationId:string|null;profiles?:string[];backupDirectory?:string|null;error?:string;}
interface Entry {path:string;originalHash:string|null;separator:boolean;}
interface Receipt {schemaVersion:1;key:string;generation:string;status:'prepared'|'installed'|'removing'|'removed';entries:Entry[];}
interface Snapshot {bytes:Buffer|null;stat:Stats|null;}
const digest=(bytes:Buffer|string)=>createHash('sha256').update(bytes).digest('hex');
/** Identificação vem de dados do shell, nunca da execução de seu perfil. */
export function pathShell(value=process.env.SHELL??'/bin/bash'):PathShell{
 const shell=basename(value);if(shell!=='bash'&&shell!=='zsh')throw Error('PATH integration supports Bash and Zsh; choose a supported shell or skip PATH integration.');return shell;
}
/** Recusa controles e separadores de PATH sem impedir espaços ou aspas em nomes de diretório. */
function absolute(value:string):string{if(!isAbsolute(value)||value!==normalize(value)||value==='/'||/[\x00-\x1f\x7f:]/.test(value))throw Error('PATH integration requires normalized absolute paths without control characters or colons.');return value;}
/** Pais não podem redirecionar a escrita nem permitir alterações por outro usuário. */
async function parents(directory:string){
 const root=parse(directory).root;let current=root;
 for(const part of directory.slice(root.length).split('/').filter(Boolean)){
  current=join(current,part);
  try{const stat=await lstat(current);if(!stat.isDirectory()||stat.isSymbolicLink()||(stat.mode&0o022)!==0||![0,process.getuid?.()].includes(stat.uid))throw Error('PATH integration directories must reject symlinks and external writes.');}
  catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return;throw error;}
 }
}
/** O descritor sem links permite conferir identidade, limites e propriedade antes da leitura. */
async function snapshot(path:string):Promise<Snapshot>{
 await parents(dirname(path));let file;
 try{file=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return{bytes:null,stat:null};throw Error('Shell integration file must be a regular file without symlinks.');}
 try{
  const before=await file.stat();if(!before.isFile()||before.nlink!==1||before.uid!==process.getuid?.()||(before.mode&0o7022)!==0||before.size>1048576)throw Error('Shell integration file has unsupported ownership, permissions, links or size.');
  const bytes=await file.readFile(),after=await file.stat();
  if(!sameStat(before,after))throw Error('Shell integration file changed during reading.');return{bytes,stat:before};
 }finally{await file.close();}
}
function sameStat(a:NonNullable<Snapshot['stat']>,b:NonNullable<Snapshot['stat']>){return a.dev===b.dev&&a.ino===b.ino&&a.size===b.size&&a.mtimeMs===b.mtimeMs&&a.ctimeMs===b.ctimeMs&&a.mode===b.mode&&a.uid===b.uid&&a.gid===b.gid;}
function sameSnapshot(a:Snapshot,b:Snapshot){return a.bytes===null?b.bytes===null:b.bytes!==null&&a.stat!==null&&b.stat!==null&&sameStat(a.stat,b.stat)&&a.bytes.equals(b.bytes);}
/** Aspas simples literais evitam executar conteúdo dos caminhos ao abrir o shell. */
function block(bin:string,key:string){const quoted="'"+bin.replaceAll("'","'\\''")+"'";return '# >>> SetupVibe PATH '+key+' >>>\ncase ":${PATH-}:" in\n  *:'+quoted+':*) ;;\n  *) export PATH='+quoted+'"${PATH:+:$PATH}" ;;\nesac\n# <<< SetupVibe PATH '+key+' <<<\n';}
async function context(bin:string,shell:PathShell,options:PathOptions,remove=false){
 if(shell!=='bash'&&shell!=='zsh')throw Error('Unsupported PATH shell.');
 bin=absolute(bin);const home=absolute(options.home??homedir()),zdir=shell==='zsh'?absolute(options.zdotdir??process.env.ZDOTDIR??home):home,path=absolute(options.path??statePath());
 if(!remove){await parents(bin);const binStat=await lstat(bin);if(!binStat.isDirectory()||binStat.isSymbolicLink())throw Error('PATH command directory must already exist.');await access(bin,constants.X_OK);}
 await parents(home);await parents(dirname(path));
 const key=digest(JSON.stringify([bin,shell,home,shell==='zsh'?zdir:null])).slice(0,24),directory=join(dirname(path),'path-integrations',key),receiptPath=join(directory,'receipt.json');
 await parents(directory);
 const allowed=shell==='bash'?['.bash_profile','.bash_login','.profile','.bashrc'].map(name=>join(home,name)):['.zprofile','.zshrc'].map(name=>join(zdir,name));
 let profiles:string[];
 if(shell==='bash'){let login=join(home,'.profile');if(!remove)for(const candidate of allowed.slice(0,3)){const value=await snapshot(candidate);if(value.bytes!==null){login=candidate;break;}}profiles=[login,join(home,'.bashrc')];}else profiles=allowed;
 const stored=await snapshot(receiptPath);let receipt:Receipt|null=null;
 if(stored.bytes){
  const value=JSON.parse(stored.bytes.toString('utf8')) as Receipt;
  if(value.schemaVersion!==1||value.key!==key||!/^[0-9a-f-]{36}$/.test(value.generation)||!['prepared','installed','removing','removed'].includes(value.status)||!Array.isArray(value.entries)||value.entries.length!==2||new Set(value.entries.map(entry=>entry.path)).size!==2||value.entries.some(entry=>!allowed.includes(entry.path)||typeof entry.separator!=='boolean'||entry.originalHash!==null&&!/^[a-f0-9]{64}$/.test(entry.originalHash)))throw Error('Invalid PATH ownership receipt.');
  receipt=value;
 }
 return{bin,shell,home,key,path,directory,receiptPath,profiles,receipt,block:block(bin,key)};
}
/** Localiza apenas o bloco exato; marcadores incompletos ou duplicados nunca autorizam remoção. */
function locate(bytes:Buffer|null,text:string,key:string){
 if(bytes===null)return-1;
 const start=Buffer.from('# >>> SetupVibe PATH '+key+' >>>'),end=Buffer.from('# <<< SetupVibe PATH '+key+' <<<'),needle=Buffer.from(text),index=bytes.indexOf(needle);
 if(bytes.indexOf(start)<0&&bytes.indexOf(end)<0)return-1;
 if(index<0||bytes.indexOf(start,bytes.indexOf(start)+start.length)>=0||bytes.indexOf(end,bytes.indexOf(end)+end.length)>=0)throw Error('Registered PATH block was changed or duplicated; automatic editing refused.');
 return index;
}
async function plan(bin:string,shell:PathShell,options:PathOptions,remove=false){
 const ctx=await context(bin,shell,options,remove),active=ctx.receipt&&ctx.receipt.status!=='removed'?ctx.receipt:null;
 if(active?.status==='removing'&&!remove)throw Error('Finish the interrupted PATH removal before installing again.');
 if(active&&!remove&&JSON.stringify(active.entries.map(entry=>entry.path))!==JSON.stringify(ctx.profiles))throw Error('Shell startup file selection changed; remove the previous PATH integration first.');
 const files=[];
 for(const path of active?active.entries.map(entry=>entry.path):ctx.profiles){
  const value=await snapshot(path),entry=active?.entries.find(item=>item.path===path),text=(entry?.separator?'\n':'')+ctx.block,index=locate(value.bytes,text,ctx.key);
  if(index>=0&&!active)throw Error('External PATH block has no ownership receipt.');
  if(active&&!remove&&active.status!=='removing'&&index<0&&(active.status==='installed'||(value.bytes?digest(value.bytes):null)!==entry!.originalHash))throw Error('Registered PATH profile changed before integration could finish.');
  files.push({path,snapshot:value,entry,text,index});
 }
 const current=remove?!active:active?.status==='installed'&&files.every(file=>file.index>=0);
 return{ctx,files,active,action:current?'current' as const:remove?'remove' as const:'install' as const};
}
/** A prévia retorna caminhos e ações, sem conteúdo privado de perfis e sem criar estado. */
export async function previewPathIntegration(bin:string,shell:PathShell,options:PathOptions&{remove?:boolean}={}){
 const result=await plan(bin,shell,options,options.remove);return{action:result.action,shell,binDirectory:bin,profiles:result.files.map(file=>file.path),executed:false as const};
}
/** O recibo é publicado antes de editar perfis; backups e gerações anteriores ficam preservados. */
async function saveReceipt(path:string,receipt:Receipt){
 const staging=await mkdtemp(join(dirname(path),'.receipt-'));try{const file=await open(join(staging,'receipt'),'wx',0o600);try{await file.writeFile(JSON.stringify(receipt)+'\n');await file.sync();}finally{await file.close();}await rename(join(staging,'receipt'),path);}finally{await rm(staging,{recursive:true,force:true});}
}
/** Acrescenta pelo descritor existente, sem substituir inode, modo ou bytes anteriores do perfil. */
async function appendProfile(path:string,before:Snapshot,text:Buffer){
 const file=await open(path,before.bytes===null?'wx':constants.O_RDWR|constants.O_APPEND|constants.O_NOFOLLOW|constants.O_NONBLOCK,0o600);
 try{
  const stat=await file.stat();
  if(before.stat){
   // OverlayFS pode copiar o arquivo ao abri-lo para escrita; conferimos os bytes e o caminho atual pelo descritor novo.
   const bytes=await file.readFile(),current=await snapshot(path);
   if(!stat.isFile()||stat.nlink!==1||stat.mode!==before.stat.mode||stat.uid!==before.stat.uid||stat.gid!==before.stat.gid||!bytes.equals(before.bytes!)||!current.stat||!sameStat(stat,current.stat)||!current.bytes?.equals(bytes))throw Error('Shell profile changed before append.');
  }
  let offset=0;while(offset<text.length){const result=await file.write(text,offset,text.length-offset);if(!result.bytesWritten)throw Error('Shell profile append failed.');offset+=result.bytesWritten;}await file.sync();
 }finally{await file.close();}
}
/** Metadados são copiados antes de escrever pelo descritor já aberto; o perfil original só é substituído depois da verificação. */
async function replaceProfile(path:string,before:Snapshot,bytes:Buffer,removeFile:boolean,signal?:AbortSignal){
 const staging=await mkdtemp(join(dirname(path),'.setupvibe-path-'));
 try{
  const temporary=join(staging,'profile'),file=await open(temporary,'wx+',0o600);
  try{
   await preserveProfileMetadata(path,temporary,signal);
   const stat=await file.stat(),named=await lstat(temporary);
   if(!stat.isFile()||named.isSymbolicLink()||stat.dev!==named.dev||stat.ino!==named.ino||stat.mode!==before.stat!.mode||stat.uid!==before.stat!.uid||stat.gid!==before.stat!.gid)throw Error('Profile metadata changed during preparation; original profile retained.');
   if(signal?.aborted)throw Error('PATH integration cancelled.');await file.truncate(0);await file.writeFile(bytes);await file.sync();
  }finally{await file.close();}
  if(!sameSnapshot(before,await snapshot(path)))throw Error('Shell profile changed before removal.');
  if(signal?.aborted)throw Error('PATH integration cancelled.');
  if(removeFile)await unlink(path);else await rename(temporary,path);
 }finally{await rm(staging,{recursive:true,force:true});}
}
/** Instala ou remove com confirmação, histórico e retomada de perfis já editados em uma tentativa parcial. */
export async function changePathIntegration(bin:string,shell:PathShell,options:PathOptions&{confirmed:boolean;remove?:boolean;signal?:AbortSignal;beforeWrite?:(path:string,index:number)=>Promise<void>}):Promise<PathResult>{
 if(!options.confirmed)throw Error('Explicit confirmation required.');
 if(options.signal?.aborted)return{status:'cancelled' as const,operationId:null};
 const initial=await plan(bin,shell,options,options.remove);if(initial.action==='current')return{status:'current' as const,operationId:null};
 await mkdir(initial.ctx.directory,{recursive:true,mode:0o700});await parents(initial.ctx.directory);
 const release=acquireCollectorLock(join(initial.ctx.directory,'lock'),'PATH integration');let store:StateStore|undefined;
 try{
  const selected=await plan(bin,shell,options,options.remove);if(selected.action==='current')return{status:'current' as const,operationId:null};
  store=new StateStore(selected.ctx.path,true);let receipt=selected.active,errorMessage:string|undefined;
  const result=await executeSteps(store,[],{confirmed:true,signal:options.signal,verify:async()=>{try{
   if(!receipt){
    const generation=crypto.randomUUID(),backupDirectory=join(selected.ctx.directory,generation);await mkdir(backupDirectory,{mode:0o700});
    const entries:Entry[]=[];
    for(const [index,file] of selected.files.entries()){
     if(file.snapshot.bytes!==null){const backup=await open(join(backupDirectory,index+'.original'),'wx',0o600);try{await backup.writeFile(file.snapshot.bytes);await backup.sync();}finally{await backup.close();}}
     entries.push({path:file.path,originalHash:file.snapshot.bytes?digest(file.snapshot.bytes):null,separator:!!file.snapshot.bytes?.length&&file.snapshot.bytes.at(-1)!==10});
    }
    receipt={schemaVersion:1,key:selected.ctx.key,generation,status:'prepared',entries};await saveReceipt(selected.ctx.receiptPath,receipt);
   }
   if(options.remove&&receipt.status!=='removing'){receipt.status='removing';await saveReceipt(selected.ctx.receiptPath,receipt);}
   for(const [index,entry] of receipt.entries.entries()){
    if(options.signal?.aborted)throw Error('PATH integration cancelled.');
    const file=selected.files.find(file=>file.path===entry.path)!,text=(entry.separator?'\n':'')+selected.ctx.block;
    if(!options.remove&&file.index>=0||options.remove&&file.index<0)continue;
    await options.beforeWrite?.(file.path,index);
    if(options.signal?.aborted)throw Error('PATH integration cancelled.');
    if(!sameSnapshot(file.snapshot,await snapshot(file.path)))throw Error('Shell profile changed after review.');
    if(!options.remove)await appendProfile(file.path,file.snapshot,Buffer.from(text));
    else{
     const prefix=file.snapshot.bytes!.subarray(0,file.index),suffix=file.snapshot.bytes!.subarray(file.index+Buffer.byteLength(text)),separator=prefix.length&&suffix.length&&prefix.at(-1)!==10?Buffer.from('\n'):Buffer.alloc(0),bytes=Buffer.concat([prefix,separator,suffix]);
     await replaceProfile(file.path,file.snapshot,bytes,entry.originalHash===null&&bytes.length===0,options.signal);
    }
   }
   receipt.status=options.remove?'removed':'installed';await saveReceipt(selected.ctx.receiptPath,receipt);
  }catch(error){errorMessage=error instanceof Error?error.message:'PATH integration failed.';throw error;}}});
  return{status:result.status,operationId:result.id,profiles:selected.files.map(file=>file.path),backupDirectory:receipt?join(selected.ctx.directory,receipt.generation):null,...(errorMessage?{error:errorMessage}:{})};
 }finally{store?.close();release();}
}
