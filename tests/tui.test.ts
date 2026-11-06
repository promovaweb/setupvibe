/** Renderiza o shell com o backend nativo real em três dimensões de terminal. */
import { expect, test, spyOn } from 'bun:test';
import { createTestRenderer } from '@opentui/core/testing';
import { mountApp as mountRealApp } from '../src/tui/app';
test('Resources oferece Uninstall e botão Execute action com confirmação própria',async()=>{
 const view=await createTestRenderer({width:129,height:44});let removed=false;
 try{
  const app=mountApp(view.renderer,undefined,undefined,undefined,undefined,undefined,undefined,undefined,{removal:{preview:async(id)=>({id,owned:{id,version:'1.0.0',location:'/managed/'+id,operation_id:'install'},steps:[],archiveSource:null,retainedData:'Persistent volumes are preserved.',executed:false}),uninstall:async(id,_target,options)=>{expect(options.confirmed).toBe(true);expect(id).toBe('redis');removed=true;return{id:'removed',status:'succeeded',steps:[],archived:null,retainedData:''};}}});
  app.select(1);await view.renderOnce();view.mockInput.pressKey('/');await view.mockInput.typeText('redis');view.mockInput.pressEnter();view.mockInput.pressEnter();view.mockInput.pressKey('u');await view.renderOnce();expect(view.captureCharFrame()).toContain('[ Execute action ]');expect(view.captureCharFrame()).toContain('Resources');
  await view.mockMouse.click(40,8);await Bun.sleep(10);await view.renderOnce();expect(view.captureCharFrame()).toContain('Uninstall review');expect(view.captureCharFrame()).toContain('Type UNINSTALL');expect(removed).toBe(false);
  await view.mockInput.typeText('UNINSTALL');view.mockInput.pressEnter();await Bun.sleep(10);expect(removed).toBe(true);
 }finally{await view.dispose();}
});
/** Qualquer fornecedor de escrita não injetado pelo teste falha antes de tocar o computador. */
const unexpected=async()=>{throw Error('Fornecedor de escrita não configurado pelo teste.');};
const mountApp:typeof mountRealApp=(renderer,target,runtime,services,serviceInstaller,codex,claude,mise,options)=>mountRealApp(renderer,target,
 runtime??{preview:unexpected,install:unexpected},services??{discover:async()=>({available:false,containers:[]}),owner:()=>null,control:unexpected},
 serviceInstaller??{preview:unexpected,install:unexpected},
 codex??{preview:unexpected,install:unexpected},claude??{preview:unexpected,install:unexpected},mise??{preview:unexpected,install:unexpected},{...options,dockerEngine:options?.dockerEngine??{preview:unexpected,install:unexpected},openCode:options?.openCode??{preview:unexpected,install:unexpected},gh:options?.gh??{preview:unexpected,install:unexpected},herdr:options?.herdr??{preview:unexpected,install:unexpected},collectorInstallation:options?.collectorInstallation??{preview:unexpected,install:unexpected},collector:options?.collector??{status:unexpected,preview:unexpected,activate:unexpected,stop:unexpected},swarm:options?.swarm??{discover:unexpected,preview:unexpected,initialize:unexpected},removal:options?.removal??{preview:unexpected,uninstall:unexpected}});
test("opção de dependências automáticas passa da revisão ao installer",async()=>{
 const view=await createTestRenderer({width:129,height:44});let installed=false;
 try{
  const app=mountApp(view.renderer,undefined,{preview:async(id,version,_target,options)=>{expect(options?.allowMissingMise).toBe(true);return{runtime:id,version,action:'awaiting-manager',steps:[],executed:false};},install:async(_id,_version,_target,options)=>{expect(options.installDependencies).toBe(true);installed=true;return{status:'succeeded',operationId:'auto'};}},undefined,undefined,undefined,undefined,undefined,{installDependencies:true});
  app.select(1);await view.renderOnce();view.mockInput.pressKey('/');await view.mockInput.typeText('bun');view.mockInput.pressEnter();view.mockInput.pressEnter();view.mockInput.pressKey('v');await view.mockInput.typeText('1.3.14');view.mockInput.pressEnter();await Bun.sleep(10);view.mockInput.pressEscape();await Bun.sleep(50);view.mockInput.pressKey('p');await view.renderOnce();expect(view.captureCharFrame()).toContain("Missing prerequisites");
  view.mockInput.pressKey('c');await view.mockInput.typeText("INSTALL");view.mockInput.pressEnter();await Bun.sleep(10);expect(installed).toBe(true);
 }finally{await view.dispose();}
});
test('TUI configura runtime aguardando mise e executa o gerenciador primeiro',async()=>{
 const view=await createTestRenderer({width:129,height:44});const installed:string[]=[];let manager=false;
 try{
  const app=mountApp(view.renderer,undefined,{
   preview:async(id,version,_target,options)=>{expect(options?.allowMissingMise).toBe(true);return{runtime:id,version,action:manager?'install':'awaiting-manager',steps:[],executed:false};},
   install:async(id)=>{expect(manager).toBe(true);installed.push(id);return{status:'succeeded',operationId:'runtime'};},
  },undefined,undefined,undefined,undefined,{
   preview:async()=>({action:'install',steps:[],executed:false}),install:async()=>{manager=true;installed.push('mise');return{status:'succeeded',operationId:'manager',executable:'/isolado/mise'};},
  });app.select(1);await view.renderOnce();
  for(const [id,version] of [['mise','2026.11.0'],['bun','1.3.14']] as const){
   view.mockInput.pressKey('/');await view.mockInput.typeText(id);view.mockInput.pressEnter();view.mockInput.pressEnter();view.mockInput.pressKey('v');await view.mockInput.typeText(version);view.mockInput.pressEnter();await Bun.sleep(10);await view.renderOnce();
   if(id==='bun')expect(view.captureCharFrame()).toContain("Waiting for mise");
   view.mockInput.pressEscape();await Bun.sleep(50);view.mockInput.pressKey('/');for(let i=0;i<id.length;i++)view.mockInput.pressBackspace();view.mockInput.pressEnter();
  }
  view.mockInput.pressKey('p');view.mockInput.pressKey('c');await view.mockInput.typeText("INSTALL");view.mockInput.pressEnter();await Bun.sleep(10);expect(installed).toEqual(['mise','bun']);
 }finally{await view.dispose();}
});
test("mise pode ser instalado pela TUI com version fixa e confirmação",async()=>{
 const view=await createTestRenderer({width:129,height:44});let installs=0;
 try{
  const app=mountApp(view.renderer,undefined,undefined,undefined,undefined,undefined,undefined,{
   preview:async(version)=>{expect(version).toBe('2026.11.0');return{action:'install',steps:[],executed:false};},
   install:async(_version,_target,options)=>{expect(options.confirmed).toBe(true);installs++;return{status:'succeeded',operationId:'mise-test',executable:'/isolado/mise'};},
  });app.select(1);await view.renderOnce();view.mockInput.pressKey('/');await view.mockInput.typeText('mise');view.mockInput.pressEnter();view.mockInput.pressKey('v');await view.mockInput.typeText('2026.11.0');view.mockInput.pressEnter();await Bun.sleep(10);
  expect(installs).toBe(0);view.mockInput.pressKey('c');await view.mockInput.typeText("INSTALL");view.mockInput.pressEnter();await Bun.sleep(10);await view.renderOnce();expect(installs).toBe(1);expect(view.captureCharFrame()).toContain("mise: Completed");
 }finally{await view.dispose();}
});
test('saída por Ctrl+Q não atualiza cena destruída',async()=>{
 const view=await createTestRenderer({width:80,height:24}),errors=spyOn(console,'error').mockImplementation(()=>{});
 try{mountApp(view.renderer);await view.renderOnce();view.mockInput.pressKey('q',{ctrl:true});expect(view.renderer.isDestroyed).toBe(true);expect(errors).not.toHaveBeenCalled();}
 finally{errors.mockRestore();await view.dispose();}
});
test('Ctrl+Q cancela operação quando o terminal fica abaixo do mínimo',async()=>{
 const view=await createTestRenderer({width:129,height:44});let aborted=false;
 try{
  const app=mountApp(view.renderer,undefined,{preview:async(id,version)=>({runtime:id,version,action:'install',steps:[],executed:false}),install:async(_id,_version,_target,options)=>new Promise(resolve=>{options.signal!.addEventListener('abort',()=>{aborted=true;resolve({status:'cancelled',operationId:'small-cancel'});},{once:true});})});
  app.select(1);await view.renderOnce();view.mockInput.pressKey('/');await view.mockInput.typeText('node');view.mockInput.pressEnter();view.mockInput.pressKey('v');await view.mockInput.typeText('24.1.0');view.mockInput.pressEnter();await Bun.sleep(10);view.mockInput.pressKey('c');await view.mockInput.typeText("INSTALL");view.mockInput.pressEnter();
  await Bun.sleep(10);view.resize(60,18);view.mockInput.pressKey('q',{ctrl:true});await Bun.sleep(10);expect(aborted).toBe(true);
  view.resize(129,44);await view.renderOnce();expect(view.captureCharFrame()).toContain("Result: Cancelled");
 }finally{await view.dispose();}
});
test('terminal pequeno orienta ampliação e impede navegação oculta',async()=>{
 const view=await createTestRenderer({width:60,height:18});
 try{
  const app=mountApp(view.renderer);await view.renderOnce();expect(view.captureCharFrame()).toContain("Terminal too small");expect(view.captureCharFrame()).toContain('80×24');
  view.mockInput.pressKey('2');app.select(1);view.resize(129,44);await view.renderOnce();expect(view.captureCharFrame()).toContain("Prepare your environment");
  app.select(1);view.mockInput.pressEnter();view.resize(40,12);await view.renderOnce();expect(view.captureCharFrame()).toContain('40×12');
  view.mockInput.pressEnter();view.resize(80,24);await view.renderOnce();expect(view.captureCharFrame()).toContain("[Selected]");
 }finally{await view.dispose();}
});
test("redimensionamento preserva version em edição e ignora digitação oculta",async()=>{
 const view=await createTestRenderer({width:129,height:44});let verified='';
 try{
  const app=mountApp(view.renderer,undefined,{preview:async(id,version)=>{verified=version;return{runtime:id,version,action:'install',steps:[],executed:false};},install:async()=>{throw Error('não deve instalar');}});
  app.select(1);await view.renderOnce();view.mockInput.pressKey('/');await view.mockInput.typeText('node');view.mockInput.pressEnter();view.mockInput.pressKey('v');await view.mockInput.typeText('24.1.0');
  view.resize(60,18);await view.mockInput.typeText('999');view.mockInput.pressEnter();expect(verified).toBe('');view.resize(129,44);view.mockInput.pressEnter();await Bun.sleep(10);expect(verified).toBe('24.1.0');
 }finally{await view.dispose();}
});
test("Metrics apresenta containers persistidos pelo collector",async()=>{
 const {mkdtempSync,rmSync}=await import('node:fs'),{tmpdir}=await import('node:os'),{join}=await import('node:path'),{MetricsStore}=await import('../src/core/metrics-store');
 const dir=mkdtempSync(join(tmpdir(),'setupvibe-tui-docker-metrics-')),previous=process.env.SETUPVIBE_STATE_DIR;process.env.SETUPVIBE_STATE_DIR=dir;const now=new Date().toISOString();
 const store=new MetricsStore(join(dir,'metrics.db'),true);store.append({timestamp:now,cpuPercent:1,memoryTotal:1024,memoryUsed:512,uptimeSeconds:60,docker:{status:'available',sampledAt:now,containers:[{id:'a'.repeat(64),name:'metrics-app',cpuPercent:150,memoryUsed:1024,memoryLimit:2048,pids:2}]}});store.close();
 const view=await createTestRenderer({width:129,height:44});
 try{const app=mountApp(view.renderer);app.select(3);view.mockInput.pressKey('pagedown');await view.renderOnce();expect(view.captureCharFrame()).toContain('metrics-app');expect(view.captureCharFrame()).toContain('150.0%');}
 finally{await view.dispose();if(previous===undefined)delete process.env.SETUPVIBE_STATE_DIR;else process.env.SETUPVIBE_STATE_DIR=previous;rmSync(dir,{recursive:true,force:true});}
});
test("Server configura Portainer somente após consent do controle Docker",async()=>{
  const view=await createTestRenderer({width:129,height:44});let previews=0;
  try{
    const app=mountApp(view.renderer,{edition:'server',system:'linux',arch:'x64'},undefined,undefined,{
      preview:async(request)=>{previews++;expect(request.port).toBe(9443);expect(request.portainer).toEqual({socketPath:'/var/run/docker.sock',allowDockerSocket:true});return{step:{id:'create-portainer',command:'docker',args:[]},executed:false};},
      install:async()=>{throw Error('não deve executar');},
    });app.select(1);await view.renderOnce();view.mockInput.pressKey('/');await view.mockInput.typeText('portainer');view.mockInput.pressEnter();view.mockInput.pressKey('g');
    await view.mockInput.typeText('portainer/portainer-ce@sha256:'+'a'.repeat(64));view.mockInput.pressEnter();view.mockInput.pressEnter();view.mockInput.pressEnter();view.mockInput.pressEnter();await view.renderOnce();
    expect(previews).toBe(0);expect(view.captureCharFrame()).toContain("administrative Docker access");await view.mockInput.typeText("YES");view.mockInput.pressEnter();await Bun.sleep(10);await view.renderOnce();
    expect(previews).toBe(1);expect(view.captureCharFrame()).toContain("Portainer will have administrative Docker access");
  }finally{await view.dispose();}
});
test("Claude Code usa installer nativo após informar version e confirmar",async()=>{
  const view=await createTestRenderer({width:80,height:24});let installs=0;
  try{
    const app=mountApp(view.renderer,undefined,undefined,undefined,undefined,undefined,{
      preview:async(version)=>{expect(version).toBe('2.1.318');return{action:'install',steps:[],executed:false};},
      install:async(version,_target,options)=>{expect(version).toBe('2.1.318');expect(options.confirmed).toBe(true);installs++;return{status:'succeeded',operationId:'claude-test',executable:'/isolado/claude'};},
    });app.select(1);await view.renderOnce();view.mockInput.pressKey('/');await view.mockInput.typeText('claude');view.mockInput.pressEnter();view.mockInput.pressKey('v');await view.mockInput.typeText('2.1.318');view.mockInput.pressEnter();await Bun.sleep(10);
    expect(installs).toBe(0);view.mockInput.pressKey('c');await view.mockInput.typeText("INSTALL");view.mockInput.pressEnter();await Bun.sleep(10);await view.renderOnce();
    expect(installs).toBe(1);expect(view.captureCharFrame()).toContain("claude: Completed");
  }finally{await view.dispose();}
});
test('Codex participa da seleção e exige confirmação antes da instalação',async()=>{
  const view=await createTestRenderer({width:129,height:44});let installs=0,previews=0;
  try{
    const app=mountApp(view.renderer,undefined,undefined,undefined,undefined,{
      preview:async(version)=>{expect(version).toBe('0.166.0');previews++;return{action:'install',steps:[],executed:false};},
      install:async(version,_target,options)=>{expect(version).toBe('0.166.0');expect(options.confirmed).toBe(true);installs++;return{status:'succeeded',operationId:'codex-test',executable:'/isolado/codex'};},
    });app.select(1);await view.renderOnce();view.mockInput.pressKey('/');await view.mockInput.typeText('codex');view.mockInput.pressEnter();view.mockInput.pressEnter();view.mockInput.pressKey('v');await view.mockInput.typeText('0.166.0');view.mockInput.pressEnter();await Bun.sleep(10);
    view.mockInput.pressEscape();await Bun.sleep(50);view.mockInput.pressKey('p');await view.renderOnce();expect(view.captureCharFrame()).toContain("install selected resources");expect(installs).toBe(0);
    view.mockInput.pressKey('c');await view.mockInput.typeText("INSTALL");view.mockInput.pressEnter();await Bun.sleep(10);await view.renderOnce();
    expect(previews).toBe(2);expect(installs).toBe(1);expect(view.captureCharFrame()).toContain("codex: Completed");
  }finally{await view.dispose();}
});
test('seleção de Redis e Mailpit instala ambos após uma confirmação',async()=>{
  const view=await createTestRenderer({width:129,height:44});const installed:string[]=[];
  try{
    const app=mountApp(view.renderer,undefined,undefined,undefined,{
      preview:async(request)=>({step:{id:'create-'+request.id,command:'docker',args:['create',request.image]},executed:false}),
      install:async(request)=>{installed.push(request.id);return{id:request.id,status:'succeeded',steps:[]};},
    });app.select(1);await view.renderOnce();
    for(const id of ['redis','mailpit']){
      view.mockInput.pressKey('/');await view.mockInput.typeText(id);view.mockInput.pressEnter();view.mockInput.pressEnter();view.mockInput.pressKey('g');
      await view.mockInput.typeText((id==='redis'?'redis':'axllent/mailpit')+'@sha256:'+'a'.repeat(64));view.mockInput.pressEnter();view.mockInput.pressEnter();view.mockInput.pressEnter();await Bun.sleep(10);
      view.mockInput.pressEscape();await Bun.sleep(50);view.mockInput.pressKey('/');for(let i=0;i<id.length;i++)view.mockInput.pressBackspace();view.mockInput.pressEnter();
    }
    view.mockInput.pressKey('p');await view.renderOnce();expect(view.captureCharFrame()).toContain("install selected resources");expect(installed).toEqual([]);
    view.mockInput.pressKey('c');await view.mockInput.typeText("INSTALL");view.mockInput.pressEnter();await Bun.sleep(10);await view.renderOnce();
    expect(installed).toEqual(['mailpit','redis']);expect(view.captureCharFrame()).toContain("redis: Completed");expect(view.captureCharFrame()).toContain("mailpit: Completed");
  }finally{await view.dispose();}
});
test("formulário PostgreSQL envia caminho de credentials e pode ser cancelado",async()=>{
  const view=await createTestRenderer({width:80,height:24});let previews=0;
  try{
    const app=mountApp(view.renderer,undefined,undefined,undefined,{
      preview:async(request)=>{previews++;expect(request.postgres).toEqual({passwordFile:'/home/teste/senha',user:'dev',database:'app'});expect(request.volume).toBe('setupvibe-postgresql');return{step:{id:'create-postgresql',command:'docker',args:['create',request.image]},executed:false};},
      install:async()=>{throw Error('não deve instalar');},
    });
    app.select(1);await view.renderOnce();view.mockInput.pressKey('/');await view.mockInput.typeText('postgresql');view.mockInput.pressEnter();view.mockInput.pressKey('g');
    view.mockInput.pressEscape();await Bun.sleep(50);await view.renderOnce();expect(previews).toBe(0);expect(view.captureCharFrame()).toContain("Manager:");
    view.mockInput.pressKey('g');await view.mockInput.typeText('postgres@sha256:'+'a'.repeat(64));view.mockInput.pressEnter();view.mockInput.pressEnter();view.mockInput.pressEnter();
    await view.renderOnce();expect(view.captureCharFrame()).toContain("password file");
    await view.mockInput.typeText('/home/teste/senha');view.mockInput.pressEnter();view.mockInput.pressEnter();view.mockInput.pressEnter();await Bun.sleep(10);await view.renderOnce();
    expect(previews).toBe(1);expect(view.captureCharFrame()).toContain("Service review");
  }finally{await view.dispose();}
});
test('formulário Redis revisa configuração e exige confirmação antes de criar',async()=>{
  const view=await createTestRenderer({width:129,height:44});let installs=0;
  try{
    const app=mountApp(view.renderer,undefined,undefined,undefined,{
      preview:async(request)=>{expect(request.port).toBe(6379);expect(request.volume).toBe('setupvibe-redis');return{step:{id:'create-redis',command:'docker',args:['create',request.image]},executed:false};},
      install:async(request,_target,options)=>{expect(request.id).toBe('redis');expect(options.confirmed).toBe(true);installs++;return{id:'created-redis',status:'succeeded',steps:[]};},
    });
    app.select(1);await view.renderOnce();view.mockInput.pressKey('/');await view.mockInput.typeText('redis');view.mockInput.pressEnter();view.mockInput.pressKey('g');
    await view.renderOnce();expect(view.captureCharFrame()).toContain("Configure redis");
    await view.mockInput.typeText('redis@sha256:'+'a'.repeat(64));view.mockInput.pressEnter();view.mockInput.pressEnter();view.mockInput.pressEnter();await Bun.sleep(10);await view.renderOnce();
    expect(view.captureCharFrame()).toContain("Service review");expect(installs).toBe(0);
    view.mockInput.pressKey('c');await view.mockInput.typeText("INSTALL");view.mockInput.pressEnter();await Bun.sleep(10);await view.renderOnce();
    expect(installs).toBe(1);expect(view.captureCharFrame()).toContain("Result: Completed");
  }finally{await view.dispose();}
});
test('instala runtimes selecionados em sequência após confirmar o conjunto',async()=>{
  const view=await createTestRenderer({width:129,height:44});const installed:string[]=[];
  try{
    const app=mountApp(view.renderer,{edition:'desktop',system:'linux',arch:'x64'},{preview:async(id,version)=>({runtime:id,version,action:'install',steps:[],executed:false}),install:async(id)=>{installed.push(id);return{status:'succeeded',operationId:id};}});
    app.select(1);await view.renderOnce();
    for(const id of ['node','bun']){
      view.mockInput.pressKey('/');await view.mockInput.typeText(id);view.mockInput.pressEnter();view.mockInput.pressEnter();
      view.mockInput.pressKey('v');await view.mockInput.typeText('1.2.3');view.mockInput.pressEnter();await Bun.sleep(10);
      view.mockInput.pressEscape();await Bun.sleep(50);
      view.mockInput.pressKey('/');for(let i=0;i<id.length;i++)view.mockInput.pressBackspace();view.mockInput.pressEnter();
    }
    view.mockInput.pressKey('p');await view.renderOnce();expect(view.captureCharFrame()).toContain("install selected resources");expect(installed).toEqual([]);
    view.mockInput.pressKey('c');await view.mockInput.typeText("INSTALL");view.mockInput.pressEnter();await Bun.sleep(20);
    expect(installed).toEqual(['bun','node']);
  }finally{await view.dispose();}
});
test("serviço exige confirmação e recusa container external",async()=>{
  const view=await createTestRenderer({width:129,height:44});let calls=0;let owned=false;
  try{
    const app=mountApp(view.renderer,undefined,undefined,{
      discover:async()=>({available:true,containers:[{id:'a'.repeat(64),name:'redis-test',image:'redis',state:'exited',status:'Exited',ports:''}]}),
      owner:()=>owned?'redis':null,
      control:async(component,action,options)=>{expect(component).toBe('redis');expect(action).toBe('start');expect(options.confirmed).toBe(true);calls++;return{id:'service-test',status:'succeeded',steps:[]};},
    });
    app.select(2);await Bun.sleep(10);await view.renderOnce();
    expect(view.captureCharFrame()).toContain('redis-test');
    view.mockInput.pressKey('i');await view.renderOnce();
    expect(view.captureCharFrame()).toContain("External container");expect(calls).toBe(0);
    owned=true;view.mockInput.pressKey('i');await view.renderOnce();
    expect(view.captureCharFrame()).toContain("type EXECUTE");
    await view.mockInput.typeText('EXEC');view.mockInput.pressEnter();expect(calls).toBe(0);
    await view.mockInput.typeText('UTE');view.mockInput.pressEnter();await Bun.sleep(10);await view.renderOnce();
    expect(calls).toBe(1);expect(view.captureCharFrame()).toContain("Result: Completed");
  }finally{await view.dispose();}
});
test('rodapé acompanha a área e a revisão do plano', async () => {
  const view = await createTestRenderer({width:80,height:24});
  try {
    const app = mountApp(view.renderer);
    await view.renderOnce();
    expect(view.captureCharFrame()).toContain("^U Diagnose");
    app.select(1); await view.renderOnce();
    expect(view.captureCharFrame()).toContain("I Install");
    view.mockInput.pressEnter(); view.mockInput.pressKey('p'); await view.renderOnce();
    expect(view.captureCharFrame()).toContain("Review · check");
    app.select(4); await view.renderOnce();
    expect(view.captureCharFrame()).toContain("N Next · B Previous");
    expect(view.captureCharFrame()).not.toContain("I Install");
  } finally { await view.dispose(); }
});
for (const [width,height] of [[80,24],[129,44],[160,50]]) test(`shell OpenTUI ${width}x${height}`, async () => {
  const view=await createTestRenderer({width,height});
  try {
    const app=mountApp(view.renderer);await view.renderOnce();
    expect(view.captureCharFrame()).toContain('SetupVibe:');
    expect(view.captureCharFrame()).toContain("Quit");
    app.select(5);await view.renderOnce();expect(view.captureCharFrame()).toContain('2.0.0-dev.1');
  } finally {await view.dispose();}
});
test('busca por teclado seleciona Node e revisa dependência mise', async () => {
  const view=await createTestRenderer({width:129,height:44});
  try {
    const app=mountApp(view.renderer);app.select(1);await view.renderOnce();
    view.mockInput.pressKey('/');await view.mockInput.typeText('node');
    view.mockInput.pressEnter();await view.renderOnce();
    expect(view.captureCharFrame()).toContain('Node.js');
    view.mockInput.pressEnter();view.mockInput.pressKey('p');await view.renderOnce();
    expect(view.captureCharFrame()).toContain("Plan review");
    expect(view.captureCharFrame()).toContain('mise');
  } finally {await view.dispose();}
});
test('Home mostra resumo e seleção permanece após trocar de área', async () => {
  const view=await createTestRenderer({width:80,height:24});
  try {
    const app=mountApp(view.renderer);await view.renderOnce();expect(view.captureCharFrame()).toContain("Available");
    app.select(1);view.mockInput.pressEnter();await view.renderOnce();expect(view.captureCharFrame()).toContain("[Selected]");
    app.select(0);app.select(1);await view.renderOnce();expect(view.captureCharFrame()).toContain("[Selected]");
  } finally {await view.dispose();}
});
test("edição Server mostra apenas catalog permitido na interface",async()=>{
 const view=await createTestRenderer({width:129,height:44});
 try{const app=mountApp(view.renderer,{edition:'server',system:'linux',arch:'x64'});app.select(1);await view.renderOnce();const frame=view.captureCharFrame();expect(frame).toContain('Server');expect(frame).toContain('Tailscale');expect(frame).not.toContain('Node.js');expect(frame).not.toContain('PostgreSQL');}
 finally{await view.dispose();}
});
test('Esc sai da revisão preservando seleção e Ctrl+D limpa explicitamente',async()=>{
 const view=await createTestRenderer({width:129,height:44});
 try{const app=mountApp(view.renderer);app.select(1);await view.renderOnce();view.mockInput.pressEnter();view.mockInput.pressKey('p');await view.renderOnce();expect(view.captureCharFrame()).toContain("Plan review");view.mockInput.pressEscape();await Bun.sleep(50);await view.renderOnce();expect(view.captureCharFrame()).toContain("[Selected]");view.mockInput.pressKey('d',{ctrl:true});await view.renderOnce();expect(view.captureCharFrame()).toContain("[Not selected]");}
 finally{await view.dispose();}
});
test('Home informa ação de diagnóstico e descarta resposta após troca de área',async()=>{
 const view=await createTestRenderer({width:129,height:44});
 try{const app=mountApp(view.renderer);await view.renderOnce();expect(view.captureCharFrame()).toContain("diagnose");view.mockInput.pressKey('u',{ctrl:true});app.select(5);await Bun.sleep(100);await view.renderOnce();expect(view.captureCharFrame()).toContain('2.0.0-dev.1');expect(view.captureCharFrame()).not.toContain("Environment diagnostics");}
 finally{await view.dispose();}
});
test("History avança e retorna entre páginas de operações",async()=>{
 const {mkdtempSync,rmSync}=await import('node:fs');const{tmpdir}=await import('node:os');const{join}=await import('node:path');const{StateStore}=await import('../src/core/state');
 const dir=mkdtempSync(join(tmpdir(),'setupvibe-tui-history-'));const previous=process.env.SETUPVIBE_STATE_DIR;process.env.SETUPVIBE_STATE_DIR=dir;
 const store=new StateStore(join(dir,'state.db'),true);for(let i=0;i<10;i++){store.start('operation-'+i);store.finish('operation-'+i,'succeeded');}store.close();
 const view=await createTestRenderer({width:129,height:44});
 try{const app=mountApp(view.renderer);app.select(4);await view.renderOnce();expect(view.captureCharFrame()).toContain("page 1");view.mockInput.pressKey('n');await view.renderOnce();expect(view.captureCharFrame()).toContain("page 2");view.mockInput.pressKey('b');await view.renderOnce();expect(view.captureCharFrame()).toContain("page 1");}
 finally{await view.dispose();if(previous===undefined)delete process.env.SETUPVIBE_STATE_DIR;else process.env.SETUPVIBE_STATE_DIR=previous;rmSync(dir,{recursive:true,force:true});}
});
test('ajuda contextual abre e retorna à área atual',async()=>{
 const view=await createTestRenderer({width:80,height:24});
 try{const app=mountApp(view.renderer);app.select(1);await view.renderOnce();view.mockInput.pressKey('?');await view.renderOnce();expect(view.captureCharFrame()).toContain("Help · Resources");expect(view.captureCharFrame()).toContain("review plan");view.mockInput.pressEscape();await Bun.sleep(50);await view.renderOnce();expect(view.captureCharFrame()).not.toContain("Help · Resources");expect(view.captureCharFrame()).toContain("Manager:");}
 finally{await view.dispose();}
});
test("mouse seleciona aba Resources",async()=>{
 const view=await createTestRenderer({width:129,height:44});
 try{mountApp(view.renderer);await view.renderOnce();await view.mockMouse.click(12,4);await view.renderOnce();expect(view.captureCharFrame()).toContain("Manager:");expect(view.captureCharFrame()).toContain("Search resources");}
 finally{await view.dispose();}
});
test("runtime exige confirmação digitada antes de chamar installer",async()=>{
 const view=await createTestRenderer({width:129,height:44});let installs=0;
 try{const app=mountApp(view.renderer,{edition:'desktop',system:'linux',arch:'x64'},{preview:async(id,version)=>({runtime:id,version,action:'install' as const,steps:[],executed:false}),install:async()=>{installs++;return{status:'succeeded',operationId:'test-operation'};}});
 app.select(1);await view.renderOnce();view.mockInput.pressKey('/');await view.mockInput.typeText('node');view.mockInput.pressEnter();view.mockInput.pressKey('v');await view.mockInput.typeText('24.1.0');view.mockInput.pressEnter();await Bun.sleep(10);await view.renderOnce();expect(view.captureCharFrame()).toContain("Action: Install");expect(installs).toBe(0);
 view.mockInput.pressKey('c');await view.mockInput.typeText('INST');view.mockInput.pressEnter();expect(installs).toBe(0);await view.mockInput.typeText('ALL');view.mockInput.pressEnter();await Bun.sleep(10);await view.renderOnce();expect(installs).toBe(1);expect(view.captureCharFrame()).toContain("Result: Completed");
 }finally{await view.dispose();}
});
test('instalação na TUI mantém área e permite cancelamento por Esc',async()=>{
 const view=await createTestRenderer({width:129,height:44});let aborted=false;
 try{const app=mountApp(view.renderer,{edition:'desktop',system:'linux',arch:'x64'},{preview:async(id,version)=>({runtime:id,version,action:'install' as const,steps:[],executed:false}),install:async(_id,_version,_target,options)=>new Promise(resolve=>{options.signal!.addEventListener('abort',()=>{aborted=true;resolve({status:'cancelled',operationId:'cancelled-op'});},{once:true});})});
 app.select(1);await view.renderOnce();view.mockInput.pressKey('/');await view.mockInput.typeText('node');view.mockInput.pressEnter();view.mockInput.pressKey('v');await view.mockInput.typeText('24.1.0');view.mockInput.pressEnter();await Bun.sleep(10);view.mockInput.pressKey('c');await view.mockInput.typeText("INSTALL");view.mockInput.pressEnter();app.select(5);await view.renderOnce();expect(view.captureCharFrame()).toContain("Installing node");expect(view.captureCharFrame()).not.toContain('SetupVibe 2.0.0');view.mockInput.pressEscape();await Bun.sleep(60);await view.renderOnce();expect(aborted).toBe(true);expect(view.captureCharFrame()).toContain("Result: Cancelled");
 }finally{await view.dispose();}
});
test('detalhes expandidos usam área de leitura e retornam à lista',async()=>{
 const view=await createTestRenderer({width:80,height:24});
 try{const app=mountApp(view.renderer);app.select(1);await view.renderOnce();view.mockInput.pressKey('d');await view.renderOnce();expect(view.captureCharFrame()).toContain("Manager:");expect(view.captureCharFrame()).not.toContain('GitHub CLI');view.mockInput.pressKey('d');await view.renderOnce();expect(view.captureCharFrame()).toContain('GitHub CLI');}
 finally{await view.dispose();}
});

test('destruir a TUI durante instalação cancela sem atualizar a cena encerrada',async()=>{
 const view=await createTestRenderer({width:129,height:44});
 const errors=spyOn(console,'error').mockImplementation(()=>{});
 let aborted=false,finished=false;
 try{
  const app=mountApp(view.renderer,undefined,{
   preview:async(id,version)=>({runtime:id,version,action:'install',steps:[],executed:false}),
   install:async(_id,_version,_target,options)=>new Promise(resolve=>{
    options.signal!.addEventListener('abort',()=>{
     aborted=true;
     setTimeout(()=>{finished=true;resolve({status:'cancelled',operationId:'closed-tui'});},5);
    },{once:true});
   }),
  });
  app.select(1);await view.renderOnce();view.mockInput.pressKey('/');
  await view.mockInput.typeText('node');view.mockInput.pressEnter();view.mockInput.pressKey('v');
  await view.mockInput.typeText('24.1.0');view.mockInput.pressEnter();await Bun.sleep(10);
  view.mockInput.pressKey('c');await view.mockInput.typeText('INSTALL');view.mockInput.pressEnter();
  await Bun.sleep(10);view.renderer.destroy();await Bun.sleep(30);
  expect(aborted).toBe(true);expect(finished).toBe(true);expect(errors).not.toHaveBeenCalled();
 }finally{errors.mockRestore();await view.dispose();}
});

/** O fornecedor simulado impede qualquer chamada ao Docker real neste percurso. */
test('Services revisa Swarm e exige INITIALIZE antes de executar',async()=>{
 const view=await createTestRenderer({width:129,height:44});let initialized=0;
 try{
  const app=mountApp(view.renderer,undefined,undefined,undefined,undefined,undefined,undefined,undefined,{swarm:{
   discover:async()=>({state:'inactive',nodeId:'',manager:false,clusterId:null,address:''}),
   preview:async(address)=>{expect(address).toBe('192.0.2.10');return{action:'initialize',status:{state:'inactive',nodeId:'',manager:false,clusterId:null,address:''},steps:[{id:'swarm-init',command:'docker',args:['swarm','init']}],executed:false};},
   initialize:async(address,_target,options)=>{expect(address).toBe('192.0.2.10');expect(options.confirmed).toBe(true);initialized++;return{status:'succeeded',operationId:'swarm-test'};},
  }});
  app.select(2);await Bun.sleep(10);view.mockInput.pressKey('w');await Bun.sleep(10);await view.renderOnce();expect(view.captureCharFrame()).toContain('Docker Swarm');
  view.mockInput.pressKey('n');await view.mockInput.typeText('192.0.2.10');view.mockInput.pressEnter();await Bun.sleep(10);await view.renderOnce();expect(view.captureCharFrame()).toContain('C: confirm initialization');expect(initialized).toBe(0);
  view.mockInput.pressKey('c');await view.mockInput.typeText('INSTALL');view.mockInput.pressEnter();expect(initialized).toBe(0);
  for(let i=0;i<7;i++)view.mockInput.pressBackspace();await view.mockInput.typeText('INITIALIZE');view.mockInput.pressEnter();await Bun.sleep(10);await view.renderOnce();expect(initialized).toBe(1);expect(view.captureCharFrame()).toContain('Swarm result: Completed');
 }finally{await view.dispose();}
});

test('resposta atrasada de Swarm não substitui a seção escolhida depois',async()=>{
 const view=await createTestRenderer({width:129,height:44});let finish!:(value:Awaited<ReturnType<typeof import('../src/core/swarm').discoverSwarm>>)=>void;
 try{
  const app=mountApp(view.renderer,undefined,undefined,undefined,undefined,undefined,undefined,undefined,{swarm:{discover:()=>new Promise(resolve=>{finish=resolve;}),preview:unexpected,initialize:unexpected}});
  app.select(2);view.mockInput.pressKey('w');app.select(5);finish({state:'active',nodeId:'late-node',manager:true,clusterId:'late-cluster',address:'192.0.2.10'});await Bun.sleep(10);await view.renderOnce();expect(view.captureCharFrame()).toContain('Bun · TypeScript · OpenTUI');expect(view.captureCharFrame()).not.toContain('late-cluster');
 }finally{await view.dispose();}
});

test('Swarm permite corrigir endereço recusado e cancelar inicialização',async()=>{
 const view=await createTestRenderer({width:80,height:24});let cancelled=false;
 try{
  const app=mountApp(view.renderer,undefined,undefined,undefined,undefined,undefined,undefined,undefined,{swarm:{
   discover:async()=>({state:'inactive',nodeId:'',manager:false,clusterId:null,address:''}),
   preview:async(address)=>{if(address==='invalid')throw Error('Provide an explicit IPv4 or IPv6 address.');return{action:'initialize',status:{state:'inactive',nodeId:'',manager:false,clusterId:null,address:''},steps:[],executed:false};},
   initialize:async(_address,_target,options)=>new Promise(resolve=>{options.signal!.addEventListener('abort',()=>{cancelled=true;resolve({status:'cancelled',operationId:'swarm-cancel'});},{once:true});}),
  }});
  app.select(2);view.mockInput.pressKey('w');await Bun.sleep(10);view.mockInput.pressKey('n');await view.mockInput.typeText('invalid');view.mockInput.pressEnter();await Bun.sleep(10);await view.renderOnce();expect(view.captureCharFrame()).toContain('Swarm review failed');
  view.mockInput.pressKey('n');await view.mockInput.typeText('192.0.2.10');view.mockInput.pressEnter();await Bun.sleep(10);view.mockInput.pressKey('c');await view.renderOnce();expect(view.captureCharFrame()).toContain('Type INITIALIZE');await view.mockInput.typeText('INITIALIZE');view.mockInput.pressEnter();await Bun.sleep(10);view.mockInput.pressEscape();await Bun.sleep(80);await view.renderOnce();expect(cancelled).toBe(true);expect(view.captureCharFrame()).toContain('Swarm result: Cancelled');
 }finally{await view.dispose();}
});

test.each(['activate','stop'] as const)('Metrics exige revisão e EXECUTE para %s do coletor',async(action)=>{
 const view=await createTestRenderer({width:80,height:24});let changed=false;
 const status={load:'loaded',active:'inactive',sub:'dead',enabled:'enabled',fragment:'/managed/unit.service',dropIns:''};
 try{
  const control=async(config:{executable:string},_directory:string,options:{confirmed:boolean})=>{expect(config.executable).toBe('/managed/collector');expect(options.confirmed).toBe(true);changed=true;return{id:'collector-op',status:'succeeded' as const,steps:[]};};
  const app=mountApp(view.renderer,undefined,undefined,undefined,undefined,undefined,undefined,undefined,{collector:{status:async()=>status,preview:async(config,_directory,chosen)=>{expect(config.executable).toBe('/managed/collector');expect(chosen).toBe(action);return{action:chosen,unit:'/managed/unit.service',status,steps:[],executed:false};},activate:control,stop:control}});
  app.select(3);view.mockInput.pressKey('c');await Bun.sleep(10);await view.renderOnce();expect(view.captureCharFrame()).toContain('Metrics collector');
  view.mockInput.pressKey(action==='activate'?'a':'s');await view.mockInput.typeText('/managed/collector');view.mockInput.pressEnter();await Bun.sleep(10);await view.renderOnce();expect(view.captureCharFrame()).toContain('Collector review');expect(changed).toBe(false);
  view.mockInput.pressKey('c');await view.mockInput.typeText('INSTALL');view.mockInput.pressEnter();expect(changed).toBe(false);
  for(let i=0;i<7;i++)view.mockInput.pressBackspace();await view.mockInput.typeText('EXECUTE');view.mockInput.pressEnter();await Bun.sleep(10);await view.renderOnce();expect(changed).toBe(true);expect(view.captureCharFrame()).toContain('Collector result: Completed');
 }finally{await view.dispose();}
});

test('Metrics alterna para o coletor embutido e mantém o modo até a execução',async()=>{
 const view=await createTestRenderer({width:100,height:30});let changed=false;
 const status={load:'loaded',active:'inactive',sub:'dead',enabled:'enabled',fragment:'/managed/unit',dropIns:''};
 try{
  const app=mountApp(view.renderer,undefined,undefined,undefined,undefined,undefined,undefined,undefined,{collector:{status:async()=>status,preview:async(config,_directory,action)=>{expect(config.embedded).toBe(true);return{action,unit:'/managed/unit',status,steps:[],executed:false};},activate:async(config)=>{expect(config.embedded).toBe(true);changed=true;return{id:'embedded',status:'succeeded',steps:[]};},stop:unexpected}});
  app.select(3);view.mockInput.pressKey('c');await Bun.sleep(10);view.mockInput.pressKey('m');await Bun.sleep(10);await view.renderOnce();expect(view.captureCharFrame()).toContain('Embedded SetupVibe');view.mockInput.pressKey('a');await view.mockInput.typeText('/managed/setupvibe');view.mockInput.pressEnter();await Bun.sleep(10);view.mockInput.pressKey('c');await view.mockInput.typeText('EXECUTE');view.mockInput.pressEnter();await Bun.sleep(10);expect(changed).toBe(true);
 }finally{await view.dispose();}
});

test('Metrics instala unidade do coletor somente após prévia e confirmação',async()=>{
 const view=await createTestRenderer({width:80,height:24});let installed=false,refuse=true;
 const status={load:'not-found',active:'inactive',sub:'dead',enabled:'',fragment:'',dropIns:''};
 try{
  const app=mountApp(view.renderer,undefined,undefined,undefined,undefined,undefined,undefined,undefined,{collector:{status:async()=>status,preview:unexpected,activate:unexpected,stop:unexpected},collectorInstallation:{
   preview:async(config)=>{expect(config.embedded).toBe(true);if(refuse)throw Error('External collector unit.');return{unit:'/managed/unit',directory:'/managed',format:'systemd',digest:'hash',existing:false,status,executed:false};},
   install:async(config,_target,options)=>{expect(config.embedded).toBe(true);expect(options.confirmed).toBe(true);installed=true;return{id:'activated',status:'succeeded',steps:[],unit:'/managed/unit',configurationOperationId:'created'};},
  }});
  app.select(3);view.mockInput.pressKey('c');await Bun.sleep(10);view.mockInput.pressKey('m');await Bun.sleep(10);
  view.mockInput.pressKey('i');await view.mockInput.typeText('/managed/setupvibe');view.mockInput.pressEnter();await Bun.sleep(10);await view.renderOnce();expect(view.captureCharFrame()).toContain('External collector unit.');expect(installed).toBe(false);
  refuse=false;view.mockInput.pressKey('i');await view.mockInput.typeText('/managed/setupvibe');view.mockInput.pressEnter();await Bun.sleep(10);await view.renderOnce();expect(view.captureCharFrame()).toContain('Collector review');expect(installed).toBe(false);
  view.mockInput.pressKey('c');await view.mockInput.typeText('EXECUTE');view.mockInput.pressEnter();await Bun.sleep(10);await view.renderOnce();expect(installed).toBe(true);expect(view.captureCharFrame()).toContain('Collector result: Completed');
 }finally{await view.dispose();}
});

test('ajuda do coletor não permite abrir instalação por atalho oculto',async()=>{
 const view=await createTestRenderer({width:80,height:24});
 try{
  const app=mountApp(view.renderer,undefined,undefined,undefined,undefined,undefined,undefined,undefined,{collector:{status:async()=>({load:'not-found',active:'inactive',sub:'dead',enabled:'',fragment:'',dropIns:''}),preview:unexpected,activate:unexpected,stop:unexpected}});
  app.select(3);view.mockInput.pressKey('c');await Bun.sleep(10);view.mockInput.pressKey('?');view.mockInput.pressKey('i');await view.renderOnce();expect(view.captureCharFrame()).toContain('Help · Metrics');expect(view.captureCharFrame()).not.toContain('Enter the absolute compiled collector path.');
 }finally{await view.dispose();}
});

test('Resources instala GitHub CLI pelo fornecedor próprio com confirmação',async()=>{
 const view=await createTestRenderer({width:100,height:30});let installed=false;
 try{
  const app=mountApp(view.renderer,{edition:'server',system:'linux',arch:'x64'},undefined,undefined,undefined,undefined,undefined,undefined,{gh:{preview:async(version)=>{expect(version).toBe('2.103.3');return{action:'install',steps:[],executed:false};},install:async(_version,_target,options)=>{expect(options.confirmed).toBe(true);installed=true;return{status:'succeeded',operationId:'gh-install',executable:'/managed/gh'};}}});
  app.select(1);view.mockInput.pressKey('/');await view.mockInput.typeText('github');view.mockInput.pressEnter();view.mockInput.pressKey('v');await view.mockInput.typeText('2.103.3');view.mockInput.pressEnter();await Bun.sleep(10);expect(installed).toBe(false);view.mockInput.pressKey('c');await view.mockInput.typeText('INSTALL');view.mockInput.pressEnter();await Bun.sleep(10);await view.renderOnce();expect(installed).toBe(true);expect(view.captureCharFrame()).toContain('gh: Completed');
 }finally{await view.dispose();}
});

test('Resources encaminha OpenCode ao fornecedor nativo após INSTALL',async()=>{
 const view=await createTestRenderer({width:100,height:30});let installed=false;
 try{
  const app=mountApp(view.renderer,undefined,undefined,undefined,undefined,undefined,undefined,undefined,{openCode:{preview:async(version)=>{expect(version).toBe('1.19.5');return{action:'install',steps:[],executed:false};},install:async(_version,_target,options)=>{expect(options.confirmed).toBe(true);installed=true;return{status:'succeeded',operationId:'opencode-install',executable:'/managed/opencode'};}}});
  app.select(1);view.mockInput.pressKey('/');await view.mockInput.typeText('opencode');view.mockInput.pressEnter();view.mockInput.pressKey('v');await view.mockInput.typeText('1.19.5');view.mockInput.pressEnter();await Bun.sleep(10);expect(installed).toBe(false);view.mockInput.pressKey('c');await view.mockInput.typeText('INSTALL');view.mockInput.pressEnter();await Bun.sleep(10);await view.renderOnce();expect(installed).toBe(true);expect(view.captureCharFrame()).toContain('opencode: Completed');
 }finally{await view.dispose();}
});

test('Resources encaminha Herdr ao fornecedor nativo após INSTALL',async()=>{
 const view=await createTestRenderer({width:100,height:30});let installed=false;
 try{
  const app=mountApp(view.renderer,{edition:'desktop',system:'linux',arch:'x64'},undefined,undefined,undefined,undefined,undefined,undefined,{herdr:{preview:async(version)=>{expect(version).toBe('0.9.5');return{action:'install',steps:[],executed:false};},install:async(_version,_target,options)=>{expect(options.confirmed).toBe(true);installed=true;return{status:'succeeded',operationId:'herdr-install',executable:'/managed/herdr'};}}});
  app.select(1);view.mockInput.pressKey('/');await view.mockInput.typeText('herdr');view.mockInput.pressEnter();view.mockInput.pressKey('v');await view.mockInput.typeText('0.9.5');view.mockInput.pressEnter();await Bun.sleep(10);expect(installed).toBe(false);view.mockInput.pressKey('c');await view.mockInput.typeText('INSTALL');view.mockInput.pressEnter();await Bun.sleep(10);await view.renderOnce();expect(installed).toBe(true);expect(view.captureCharFrame()).toContain('herdr: Completed');
 }finally{await view.dispose();}
});

test('Resources preserva Git externo pelo fornecedor APT e mostra o resultado',async()=>{
 const view=await createTestRenderer({width:110,height:30});let installed=false;
 const status={installed:'1:2.47.3-1',candidate:'1:2.47.3-1',binary:'/usr/bin/git'};
 try{
  const app=mountApp(view.renderer,{edition:'server',system:'linux',arch:'x64'},undefined,undefined,undefined,undefined,undefined,undefined,{git:{preview:async(version)=>{expect(version).toBe('candidate');return{action:'external',version:status.installed,status,steps:[],executed:false,sudo:false};},install:async(_version,_target,options)=>{expect(options.confirmed).toBe(true);installed=true;return{status:'external',operationId:null,executable:'/usr/bin/git',version:status.installed,managed:false};}}});
  app.select(1);view.mockInput.pressKey('/');await view.mockInput.typeText('git');view.mockInput.pressEnter();view.mockInput.pressKey('v');view.mockInput.pressEnter();await Bun.sleep(10);expect(installed).toBe(false);view.mockInput.pressKey('c');await view.mockInput.typeText('INSTALL');view.mockInput.pressEnter();await Bun.sleep(10);await view.renderOnce();expect(installed).toBe(true);expect(view.captureCharFrame()).toContain('git: External installation preserved');
 }finally{await view.dispose();}
});

test('Resources instala engine Docker com revisão e INSTALL sem chamar instalador de runtime',async()=>{
 const view=await createTestRenderer({width:100,height:30});let installed=false;const status={installed:null,candidate:'26.1.5-1',client:null,clientCandidate:'26.1.5-1',binary:null,occupied:false};
 try{
  const app=mountApp(view.renderer,{edition:'server',system:'linux',arch:'x64'},{preview:async()=>{throw Error('unexpected runtime');},install:async()=>{throw Error('unexpected runtime');}},undefined,undefined,undefined,undefined,undefined,{dockerEngine:{preview:async(version)=>{expect(version).toBe('candidate');return{action:'install',version:status.candidate,clientVersion:status.clientCandidate,status,steps:[],executed:false,sudo:false};},install:async(_version,_target,options)=>{expect(options.confirmed).toBe(true);installed=true;return{status:'succeeded',operationId:'docker-test',executable:'/usr/bin/docker',version:status.candidate,managed:true};}}});
  app.select(1);view.mockInput.pressKey('/');await view.mockInput.typeText('docker');view.mockInput.pressEnter();view.mockInput.pressKey('v');view.mockInput.pressEnter();await Bun.sleep(10);expect(installed).toBe(false);view.mockInput.pressKey('c');await view.mockInput.typeText('INSTALL');view.mockInput.pressEnter();await Bun.sleep(10);await view.renderOnce();expect(installed).toBe(true);expect(view.captureCharFrame()).toContain('docker: Completed');
 }finally{await view.dispose();}
});

test('formulário de serviço prepara Docker apenas após INSTALL com dependências habilitadas',async()=>{
 const view=await createTestRenderer({width:100,height:30});let dockerReady=false,created=false;
 const status={installed:null,candidate:'26.1.5-1',client:null,clientCandidate:null,binary:null,occupied:false};
 try{
  const app=mountApp(view.renderer,undefined,undefined,undefined,{preview:async(_request,_target,options)=>{if(!dockerReady&&!options?.allowMissingDocker)throw Error('Docker unavailable; conflicts could not be checked.');return{step:{id:'create',command:'docker',args:[]},executed:false,...(!dockerReady?{action:'awaiting-docker' as const}: {})};},install:async()=>{expect(dockerReady).toBe(true);created=true;return{id:'service-test',status:'succeeded',steps:[]};}},undefined,undefined,undefined,{installDependencies:true,dockerEngine:{preview:async()=>({action:'install',version:status.candidate,clientVersion:null,status,steps:[],executed:false,sudo:false}),install:async()=>{dockerReady=true;return{status:'succeeded',operationId:'docker-test',executable:'/usr/bin/docker',version:status.candidate,managed:true};}}});
  app.select(1);view.mockInput.pressKey('/');await view.mockInput.typeText('redis');view.mockInput.pressEnter();view.mockInput.pressKey('g');await view.mockInput.typeText('redis@sha256:'+'a'.repeat(64));view.mockInput.pressEnter();view.mockInput.pressEnter();view.mockInput.pressEnter();await Bun.sleep(10);await view.renderOnce();expect(view.captureCharFrame()).toContain('Docker will be prepared');expect(dockerReady).toBe(false);expect(created).toBe(false);
  view.mockInput.pressKey('c');await view.mockInput.typeText('INSTALL');view.mockInput.pressEnter();await Bun.sleep(10);expect(created).toBe(true);expect(dockerReady).toBe(true);
 }finally{await view.dispose();}
});
