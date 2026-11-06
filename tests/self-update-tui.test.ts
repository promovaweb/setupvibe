/** Testa o painel About com renderer nativo e fornecedores isolados, sem atualizar o host. */
import {writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {expect,test,spyOn} from 'bun:test';
import {createTestRenderer} from '@opentui/core/testing';
import {mountApp} from '../src/tui/app';
import type {SelfUpdateProvider} from '../src/tui/self-update-panel';
const current='setupvibe-2.0.0-dev.1-linux-x64',currentSha='a'.repeat(64),nextSha='b'.repeat(64),previous='setupvibe-1.9.0-linux-x64';
const capture=(name:string,view:Awaited<ReturnType<typeof createTestRenderer>>)=>{const directory=process.env.SETUPVIBE_TUI_CAPTURE_DIR;if(directory){mkdirSync(directory,{recursive:true});writeFileSync(join(directory,name+'.txt'),view.captureCharFrame());}};
const unexpected=async()=>{throw Error('Unexpected provider');};
function provider(overrides:Partial<SelfUpdateProvider>={}):SelfUpdateProvider{return{
 directory:async()=>'/isolated/setupvibe',
 preview:async(version)=>({action:'update',version,previousVersion:'2.0.0-dev.1',activeArtifact:current,activeSha256:currentSha,artifact:{system:'linux',arch:'x64',url:'https://github.com/promovaweb/setupvibe/releases/download/v'+version+'/setupvibe-'+version+'-linux-x64',sha256:nextSha},reusable:false,executed:false}),
 update:unexpected,
 previewRollback:async()=>({action:'rollback',activeVersion:'2.0.0-dev.1',activeArtifact:current,activeSha256:currentSha,previousVersion:'1.9.0',previousArtifact:previous,previousSha256:'c'.repeat(64),executed:false}),
 rollback:unexpected,...overrides};}
const mount=(view:Awaited<ReturnType<typeof createTestRenderer>>,selfUpdate:SelfUpdateProvider)=>mountApp(view.renderer,{edition:'desktop',system:'linux',arch:'x64'},{preview:unexpected,install:unexpected},{discover:async()=>({available:false,containers:[]}),owner:()=>null,control:unexpected},{preview:unexpected,install:unexpected},{preview:unexpected,install:unexpected},{preview:unexpected,install:unexpected},{preview:unexpected,install:unexpected},{selfUpdate});
async function reviewUpdate(view:Awaited<ReturnType<typeof createTestRenderer>>){view.mockInput.pressKey('u');await view.mockInput.typeText('2.0.0');view.mockInput.pressEnter();await Bun.sleep(10);await view.renderOnce();}
test.each([[80,24],[129,44],[160,50]])('About apresenta ações sem consultar fornecedores em %sx%s',async(width,height)=>{
 const view=await createTestRenderer({width,height});try{const app=mount(view,provider({directory:unexpected,preview:unexpected,previewRollback:unexpected}));app.select(5);await view.renderOnce();capture('about-home-'+width+'x'+height,view);const frame=view.captureCharFrame();expect(frame).toContain('Check update');expect(frame).toContain('Review rollback');expect(frame).toContain('running process');expect(frame).toContain('Bun · TypeScript · OpenTUI');}finally{await view.dispose();}
});
test('update exige UPDATE e encaminha hashes da revisão ao núcleo',async()=>{
 const view=await createTestRenderer({width:100,height:30});let writes=0;try{
  const app=mount(view,provider({update:async(version,prefix,_target,options)=>{expect(version).toBe('2.0.0');expect(prefix).toBe('/isolated/setupvibe');expect(options.confirmed).toBe(true);expect(options.expectedCurrent).toEqual({artifact:current,sha256:currentSha});expect(options.expectedSha256).toBe(nextSha);writes++;return{status:'succeeded',operationId:'update-test',activeArtifact:'setupvibe-2.0.0-linux-x64'};}}));app.select(5);await reviewUpdate(view);capture('about-update-review',view);expect(view.captureCharFrame()).toContain('Update review');expect(writes).toBe(0);
  view.mockInput.pressKey('c');await view.renderOnce();capture('about-update-confirmation',view);await view.mockInput.typeText('UPDATE');view.mockInput.pressEnter();await Bun.sleep(10);await view.renderOnce();capture('about-update-result',view);expect(writes).toBe(1);expect(view.captureCharFrame()).toContain('Result: Completed');expect(view.captureCharFrame()).toContain('Restart SetupVibe');
 }finally{await view.dispose();}
});
test('rollback exige ROLLBACK e mantém os hashes atual e anterior',async()=>{
 const view=await createTestRenderer({width:100,height:30});let writes=0;try{
  const app=mount(view,provider({rollback:async(prefix,_target,options)=>{expect(prefix).toBe('/isolated/setupvibe');expect(options.expectedCurrent).toEqual({artifact:current,sha256:currentSha});expect(options.expectedPrevious).toEqual({artifact:previous,sha256:'c'.repeat(64)});writes++;return{status:'succeeded',operationId:'rollback-test',activeArtifact:previous};}}));app.select(5);view.mockInput.pressKey('r');await Bun.sleep(10);await view.renderOnce();expect(view.captureCharFrame()).toContain('Rollback review');expect(writes).toBe(0);view.mockInput.pressKey('c');await view.mockInput.typeText('ROLLBACK');view.mockInput.pressEnter();await Bun.sleep(10);await view.renderOnce();expect(writes).toBe(1);expect(view.captureCharFrame()).toContain('Result: Completed');
 }finally{await view.dispose();}
});
test('token incorreto, Tab e Escape preservam revisão sem executar',async()=>{
 const view=await createTestRenderer({width:100,height:30});try{
  const app=mount(view,provider());app.select(5);await reviewUpdate(view);view.mockInput.pressKey('c');await view.mockInput.typeText('INSTALL');view.mockInput.pressEnter();await view.renderOnce();expect(view.captureCharFrame()).toContain('Type UPDATE exactly');view.mockInput.pressEscape();await view.renderOnce();expect(view.captureCharFrame()).toContain('Update review');expect(view.captureCharFrame()).not.toContain('[object Object]');
  view.mockInput.pressKey('c');await view.mockInput.typeText('UPDATE');view.mockInput.pressKey('tab');view.mockInput.pressEscape();await view.renderOnce();expect(view.captureCharFrame()).toContain('Update review');
 }finally{await view.dispose();}
});
test('versão atual e rollback indisponível desabilitam confirmação',async()=>{
 const view=await createTestRenderer({width:100,height:30});try{
  const app=mount(view,provider({preview:async(version)=>({action:'current',version,previousVersion:version,activeArtifact:current,activeSha256:currentSha,artifact:{system:'linux',arch:'x64',url:'https://example.test',sha256:nextSha},reusable:true,executed:false}),previewRollback:async()=>({action:'unavailable',activeVersion:'2.0.0',activeArtifact:current,activeSha256:currentSha,previousVersion:null,previousArtifact:null,previousSha256:null,executed:false})}));app.select(5);await reviewUpdate(view);expect(view.captureCharFrame()).toContain('Already current');view.mockInput.pressKey('c');await view.renderOnce();expect(view.captureCharFrame()).not.toContain('Type UPDATE');view.mockInput.pressEscape();view.mockInput.pressKey('r');await Bun.sleep(10);await view.renderOnce();expect(view.captureCharFrame()).toContain('No rollback available');view.mockInput.pressKey('c');await view.renderOnce();expect(view.captureCharFrame()).not.toContain('Type ROLLBACK');
 }finally{await view.dispose();}
});
test('ajuda isola atalhos e resposta tardia não volta após navegar',async()=>{
 const view=await createTestRenderer({width:100,height:30});let reads=0,finish!:(value:Awaited<ReturnType<SelfUpdateProvider['preview']>>)=>void;
 try{
  const fake=provider({preview:async()=>{reads++;return new Promise(resolve=>{finish=resolve;});}}),app=mount(view,fake);app.select(5);view.mockInput.pressKey('?');view.mockInput.pressKey('r');view.mockInput.pressKey('u');view.mockInput.pressKey('c');await view.renderOnce();expect(view.captureCharFrame()).toContain('Help · Software updates');expect(reads).toBe(0);view.mockInput.pressEscape();await Bun.sleep(50);await reviewUpdate(view);expect(reads).toBe(1);app.select(0);finish(await provider().preview('2.0.0','/isolated',{edition:'desktop',system:'linux',arch:'x64'}));await Bun.sleep(10);await view.renderOnce();expect(view.captureCharFrame()).toContain('Prepare your environment');expect(view.captureCharFrame()).not.toContain('Update review');view.mockInput.pressKey('q',{ctrl:true});expect(view.renderer.isDestroyed).toBe(true);
 }finally{await view.dispose();}
});
test('operação bloqueia navegação, cancela abaixo do mínimo e ignora cena destruída',async()=>{
 const view=await createTestRenderer({width:100,height:30});let cancelled=false;const errors=spyOn(console,'error').mockImplementation(()=>{});
 try{
  const app=mount(view,provider({update:async(_version,_prefix,_target,options)=>new Promise(resolve=>{options.signal!.addEventListener('abort',()=>{cancelled=true;resolve({status:'cancelled',operationId:'cancelled-update',activeArtifact:current});},{once:true});})}));app.select(5);await reviewUpdate(view);view.mockInput.pressKey('c');await view.mockInput.typeText('UPDATE');view.mockInput.pressEnter();await Bun.sleep(10);app.select(1);await view.renderOnce();expect(view.captureCharFrame()).toContain('Updating SetupVibe');view.resize(60,18);view.mockInput.pressKey('q',{ctrl:true});await Bun.sleep(10);expect(cancelled).toBe(true);view.resize(100,30);await view.renderOnce();expect(view.captureCharFrame()).toContain('Result: Cancelled');expect(errors).not.toHaveBeenCalled();
 }finally{errors.mockRestore();await view.dispose();}
});

test('destruir o renderer cancela consulta e descarta resposta tardia',async()=>{
 const view=await createTestRenderer({width:80,height:24});let signal:AbortSignal|undefined,finish!:(value:Awaited<ReturnType<SelfUpdateProvider['preview']>>)=>void;const errors=spyOn(console,'error').mockImplementation(()=>{});
 try{
  const app=mount(view,provider({preview:async(_version,_prefix,_target,options)=>{signal=options?.signal;return new Promise(resolve=>{finish=resolve;});}}));app.select(5);await reviewUpdate(view);expect(signal?.aborted).toBe(false);view.renderer.destroy();expect(signal?.aborted).toBe(true);finish(await provider().preview('2.0.0','/isolated',{edition:'desktop',system:'linux',arch:'x64'}));await Bun.sleep(10);expect(errors).not.toHaveBeenCalled();
 }finally{errors.mockRestore();await view.dispose();}
});
