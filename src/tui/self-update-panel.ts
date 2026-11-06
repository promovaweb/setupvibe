/* Hallmark · pre-emit critique: P4 H4 E4 S4 R5 V3 */
/** Painel OpenTUI de atualização própria com revisão vinculada aos hashes, confirmação e cancelamento. */
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {BoxRenderable,TextRenderable,InputRenderable,SelectRenderable,ScrollBoxRenderable,type CliRenderer} from '@opentui/core';
import {previewSelfUpdate,updateSelf,previewSelfRollback,rollbackSelf,selfInstallDirectory,type ReleaseReview} from '../core/self-update';
import {fixedReleaseVersion} from '../core/official-release';
import type {Target} from '../core/platform';
import {stateLabel} from './labels';
export interface SelfUpdateProvider {directory:typeof selfInstallDirectory;preview:typeof previewSelfUpdate;update:typeof updateSelf;previewRollback:typeof previewSelfRollback;rollback:typeof rollbackSelf;}
export const selfUpdateProvider:SelfUpdateProvider={directory:async()=>{const prefix=await selfInstallDirectory();if(!existsSync(join(prefix,'.setupvibe-bootstrap')))throw Error('Install SetupVibe with the bootstrap before updating this copy.');return prefix;},preview:previewSelfUpdate,update:updateSelf,previewRollback:previewSelfRollback,rollback:rollbackSelf};
interface Key {name:string;ctrl:boolean;shift?:boolean;preventDefault():void;}
interface Colors {background:string;text:string;muted:string;border:string;selected:string;active:string;}
type Ready={kind:'update';prefix:string;version:string;expectedCurrent:ReleaseReview;sha256:string}|{kind:'rollback';prefix:string;expectedCurrent:ReleaseReview;previous:ReleaseReview};
/** O componente não consulta o filesystem ou a rede na montagem; consultas só começam após ação explícita. */
export function mountSelfUpdatePanel(renderer:CliRenderer,parent:BoxRenderable,target:Target,runningVersion:string,colors:Colors,provider:SelfUpdateProvider=selfUpdateProvider,onChange:()=>void=()=>{},onLeave:()=>void=()=>{}){
 const root=new BoxRenderable(renderer,{width:'100%',flexGrow:1,flexDirection:'column',visible:false});parent.add(root);
 root.add(new TextRenderable(renderer,{content:'SetupVibe '+runningVersion+' · running process\nBun · TypeScript · OpenTUI · Promovaweb',height:2,fg:colors.muted}));
 const menu=new SelectRenderable(renderer,{height:4,width:'100%',options:[{name:'Check update',description:'Choose a fixed release version',value:'update'},{name:'Review rollback',description:'Use the recorded previous release without network',value:'rollback'}],textColor:colors.text,selectedBackgroundColor:colors.selected,selectedTextColor:colors.text});root.add(menu);
 const inputColors={backgroundColor:colors.background,textColor:colors.text,focusedBackgroundColor:colors.selected,focusedTextColor:colors.text,placeholderColor:colors.muted};
 const version=new InputRenderable(renderer,{...inputColors,id:'self-update-version',placeholder:'Fixed version · Enter to review',maxLength:60,visible:false});root.add(version);
 const confirmation=new InputRenderable(renderer,{...inputColors,id:'self-update-confirmation',placeholder:'',maxLength:16,visible:false});root.add(confirmation);
 const reading=new ScrollBoxRenderable(renderer,{flexGrow:1,width:'100%',scrollY:true,scrollX:false});root.add(reading);
 const body=new TextRenderable(renderer,{width:'100%',content:'',fg:colors.text});reading.add(body);
 const controls=new BoxRenderable(renderer,{height:1,flexDirection:'row',gap:2});root.add(controls);
 const confirm=new TextRenderable(renderer,{id:'self-update-confirm-button',content:'[ C Confirm ]',height:1,fg:colors.muted});controls.add(confirm);
 const back=new TextRenderable(renderer,{id:'self-update-back-button',content:'[ Esc Back ]',height:1,fg:colors.active});controls.add(back);
 let phase:'home'|'version'|'checking'|'review'|'confirm'|'running'|'result'|'help'='home',ready:Ready|null=null,controller:AbortController|null=null,ticket=0,alive=true,resultKind='',reviewText='';
 const focus=(control:{focus():void})=>{if(renderer.width>=80&&renderer.height>=24&&!renderer.isDestroyed&&root.visible)control.focus();};
 const canConfirm=()=>phase==='review'&&ready!==null;
 const token=()=>ready?.kind==='rollback'?'ROLLBACK':'UPDATE';
 const valid=(id:number)=>alive&&!renderer.isDestroyed&&root.visible&&ticket===id;
 const render=()=>{
  if(!alive||renderer.isDestroyed)return;
  menu.visible=phase==='home'||phase==='result';version.visible=phase==='version';confirmation.visible=phase==='confirm';
  confirm.visible=phase==='review'||phase==='confirm';confirm.fg=canConfirm()?colors.active:colors.muted;confirm.bg=colors.background;
  back.content=phase==='running'||phase==='checking'?'[ Esc Cancel ]':'[ Esc Back ]';back.bg=colors.background;
  onChange();
 };
 const errorText=(error:unknown)=>{
  if(error&&typeof error==='object'&&'code'in error&&error.code==='ENOENT'&&'path'in error&&String(error.path).endsWith('/.setupvibe-bootstrap'))return'Install SetupVibe with the bootstrap before updating this copy.';
  return error instanceof Error?error.message:String(error);
 };
 const home=()=>{
  ticket++;controller?.abort();controller=null;ready=null;phase='home';resultKind='';version.blur();confirmation.blur();reading.blur();
  body.content='Software updates\n\nReview a fixed version before updating.\nPrevious executables and the installed launcher are preserved.\n\nUpdates require an installation registered by the bootstrap.';
  render();focus(menu);
 };
 const showVersion=()=>{
  if(phase==='checking'||phase==='running')return;ticket++;ready=null;phase='version';resultKind='';menu.blur();confirmation.blur();reading.blur();version.value='';body.content='Check update\n\nEnter a fixed release version, for example 2.0.0.\nThe preview checks the official manifest and installation.\nNo changes are made during the preview.';render();focus(version);
 };
 const query=async(kind:'update'|'rollback')=>{
  if(phase==='checking'||phase==='running')return;
  const requested=version.value.trim();if(kind==='update'){try{fixedReleaseVersion(requested);}catch(error){body.content=errorText(error);resultKind='error';render();focus(version);return;}}
  const id=++ticket,abort=new AbortController();controller=abort;ready=null;phase='checking';resultKind='';menu.blur();version.blur();confirmation.blur();body.content=kind==='update'?'Checking official release and registered installation…':'Checking the recorded previous release…';render();focus(reading);
  try{
   const prefix=await provider.directory();if(!valid(id)||abort.signal.aborted)return;
   if(kind==='update'){
    const preview=await provider.preview(requested,prefix,target,{signal:abort.signal});if(!valid(id)||abort.signal.aborted)return;
    phase='review';
    if(preview.action==='current'){body.content='Already current\n\nThe registered installation already uses '+preview.version+'.\nNo update is needed.';}
    else{ready={kind:'update',prefix,version:requested,expectedCurrent:{artifact:preview.activeArtifact,sha256:preview.activeSha256},sha256:preview.artifact.sha256};body.content='Update review\nCurrent: '+preview.previousVersion+'\nRequested: '+preview.version+'\n\nSHA-256:\n'+preview.artifact.sha256+'\n\nInstall directory:\n'+prefix+'\n\nThe previous executable and launcher will be preserved.';}
   }else{
    const preview=await provider.previewRollback(prefix,target);if(!valid(id)||abort.signal.aborted)return;phase='review';
    if(preview.action!=='rollback'||!preview.previousArtifact||!preview.previousSha256){body.content=preview.action==='current'?'Rollback already applied\n\nThe recorded previous release is active.\nNo changes are needed.':'No rollback available\n\nNo recorded update can be rolled back.\nNo changes were made.';}
    else{ready={kind:'rollback',prefix,expectedCurrent:{artifact:preview.activeArtifact,sha256:preview.activeSha256},previous:{artifact:preview.previousArtifact,sha256:preview.previousSha256}};body.content='Rollback review\nCurrent: '+preview.activeVersion+'\nPrevious: '+preview.previousVersion+'\n\nSHA-256:\n'+preview.previousSha256+'\n\nThe recorded previous executable will be restored.\nThe launcher and other installed resources are preserved.\nNo network is required.';}
   }
   reviewText=body.content.chunks.map(chunk=>chunk.text).join('');reading.scrollTo(0);render();focus(reading);
  }catch(error){if(valid(id)){phase='result';resultKind=abort.signal.aborted?'cancelled':'error';body.content=abort.signal.aborted?'Query cancelled.':'Error: '+errorText(error);render();focus(reading);}}
  finally{if(valid(id)&&controller===abort){controller=null;render();}}
 };
 const ask=()=>{if(!canConfirm())return;phase='confirm';confirmation.value='';confirmation.placeholder='Type '+token()+' and press Enter';render();focus(confirmation);};
 const execute=async()=>{
  if(phase!=='confirm'||!ready)return;
  if(confirmation.value!==token()){body.content='Type '+token()+' exactly to confirm.\n\n'+reviewText;resultKind='error';render();focus(confirmation);return;}
  const action=ready,id=++ticket,abort=new AbortController();controller=abort;phase='running';resultKind='';confirmation.blur();body.content=action.kind==='update'?'Updating SetupVibe…\n\nEsc cancels. Wait for the operation to finish.':'Restoring the previous SetupVibe release…\n\nEsc cancels. Wait for the operation to finish.';render();focus(reading);
  try{
   const result=action.kind==='update'?await provider.update(action.version,action.prefix,target,{confirmed:true,signal:abort.signal,expectedCurrent:action.expectedCurrent,expectedSha256:action.sha256}):await provider.rollback(action.prefix,target,{confirmed:true,signal:abort.signal,expectedCurrent:action.expectedCurrent,expectedPrevious:action.previous});
   if(!valid(id))return;phase='result';resultKind=result.status==='failed'?'error':result.status==='cancelled'?'cancelled':'success';ready=null;
   body.content='Result: '+stateLabel(result.status)+('activeArtifact'in result&&result.activeArtifact?'\nActive: '+result.activeArtifact:'')+('operationId'in result&&result.operationId?'\nOperation: '+result.operationId:'')+('error'in result&&result.error?'\n\n'+result.error:'')+(result.status==='succeeded'?'\n\nRestart SetupVibe to load the active release.':'\n\nReview the active release before retrying.');reading.scrollTo(0);render();focus(reading);
  }catch(error){if(valid(id)){phase='result';resultKind=abort.signal.aborted?'cancelled':'error';ready=null;body.content=abort.signal.aborted?'Operation cancelled.\nReview the active release before retrying.':'Error: '+errorText(error);render();focus(reading);}}
  finally{if(valid(id)&&controller===abort){controller=null;render();}}
 };
 const cancel=()=>{
  if(phase==='running'){controller?.abort();body.content='Cancelling…\n\nWaiting for the operation and its processes to stop.';render();return;}
  if(phase==='checking'){ticket++;controller?.abort();controller=null;ready=null;phase='result';resultKind='cancelled';body.content='Query cancelled.\nNo changes were made.';render();focus(reading);}
 };
 const goBack=()=>{
  if(phase==='home'){onLeave();return;}
  if(phase==='checking'||phase==='running'){cancel();return;}
  if(phase==='confirm'){confirmation.blur();phase='review';resultKind='';body.content=reviewText;render();focus(reading);return;}
  home();
 };
 confirm.onMouseOver=()=>{if(canConfirm()){confirm.bg=colors.active;confirm.fg=colors.background;}};confirm.onMouseOut=()=>{confirm.bg=colors.background;confirm.fg=canConfirm()?colors.active:colors.muted;};confirm.onMouseDown=()=>{if(canConfirm()){confirm.bg=colors.selected;ask();}};
 back.onMouseOver=()=>{back.bg=colors.active;back.fg=colors.background;};back.onMouseOut=()=>{back.bg=colors.background;back.fg=colors.active;};back.onMouseDown=goBack;
 menu.on('itemSelected',()=>{if(!menu.visible)return;if(menu.getSelectedOption()?.value==='rollback')void query('rollback');else showVersion();});
 version.on('enter',()=>{if(phase==='version')void query('update');});confirmation.on('enter',()=>{void execute();});
 renderer.once('destroy',()=>{alive=false;ticket++;controller?.abort();});
 /** Chamado antes dos atalhos globais; campos e ajuda não podem disparar ações de outras áreas. */
 const handleKey=(key:Key)=>{
  if(!root.visible)return false;
  if(phase==='running'||phase==='checking'){if(key.name==='escape'||key.ctrl&&key.name==='q'){key.preventDefault();cancel();}return true;}
  if(key.ctrl&&key.name==='q')return false;
  if(phase==='help'){if(key.name==='escape'){key.preventDefault();home();}else if(key.name==='pageup')reading.scrollBy(-8);else if(key.name==='pagedown')reading.scrollBy(8);return true;}
  if(version.focused||confirmation.focused){if(key.name==='escape'){key.preventDefault();goBack();}else if(key.name==='tab'){key.preventDefault();focus(reading);}return true;}
  if((phase==='version'||phase==='confirm')&&['return','enter'].includes(key.name)){key.preventDefault();if(phase==='version')void query('update');else void execute();return true;}
  if(key.name==='?'){key.preventDefault();ticket++;ready=null;phase='help';menu.blur();body.content='Help · Software updates\n\nU: enter a fixed version\nR: review rollback\nC or Enter in review: confirm\nType UPDATE or ROLLBACK, then Enter\nTab: switch focus\nPgUp/PgDn: scroll\nEsc during a query or operation: cancel\n\nUpdates require a bootstrap installation.\nEsc: close help';render();focus(reading);return true;}
  if(key.name==='escape'&&phase!=='home'){key.preventDefault();goBack();return true;}
  if(!key.ctrl&&key.name==='u'){key.preventDefault();showVersion();return true;}
  if(!key.ctrl&&key.name==='r'){key.preventDefault();void query('rollback');return true;}
  if(phase==='review'&&(key.name==='c'||key.name==='return'||key.name==='enter')){key.preventDefault();ask();return true;}
  if(key.name==='pageup'||key.name==='pagedown'){key.preventDefault();reading.scrollBy(key.name==='pageup'?-8:8);return true;}
  if(key.name==='tab'){key.preventDefault();if(phase==='version')focus(version);else if(phase==='confirm')focus(confirmation);else if(menu.visible&&!menu.focused)focus(menu);else focus(reading);return true;}
  return menu.focused&&['up','down','return','enter'].includes(key.name);
 };
 return{root,focusables:[menu,version,confirmation,reading],handleKey,cancel,isBusy:()=>phase==='checking'||phase==='running',isWriting:()=>phase==='running',show:()=>{root.visible=true;home();},hide:()=>{ticket++;controller?.abort();controller=null;ready=null;phase='home';resultKind='';menu.blur();version.blur();confirmation.blur();reading.blur();root.visible=false;},footer:()=>({status:phase==='running'?'Software updates · operation running':phase==='checking'?'Software updates · read-only query':phase==='confirm'?'Confirmation required · type '+token():resultKind==='error'?'Software updates · error':resultKind==='cancelled'?'Software updates · cancelled':phase==='review'?'Software updates · review':'About · software updates',actions:phase==='running'||phase==='checking'?'Esc Cancel · wait for completion':phase==='version'?'Enter Review · Esc Back':phase==='confirm'?'Enter Confirm · Esc Back':phase==='review'?(ready?'C Confirm · Esc Back · PgUp PgDn Scroll':'Esc Back · PgUp PgDn Scroll'):phase==='help'?'PgUp PgDn Scroll · Esc Close help':'U Update · R Rollback · Tab Focus · PgUp PgDn Scroll · ? Help'})};
}
