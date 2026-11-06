/** Interface OpenTUI para recursos, serviços e métricas com ações confirmadas. */
import {dockerEnginePreview,installDockerEngine} from '../core/install-docker';
import {gitPreview,installGit} from '../core/install-git';
import {mountSelfUpdatePanel,type SelfUpdateProvider} from './self-update-panel';
import {openCodePreview,installOpenCode} from '../core/install-opencode';
import {ghPreview,installGh} from '../core/install-gh';
import {herdrPreview,installHerdr} from '../core/install-herdr';
import {installCollector,previewCollectorInstallation} from '../core/install-collector';
import {collectorController} from '../core/collector-controller';
import {dirname} from 'node:path';
import {statePath} from '../core/history';
import {collectorUnitDirectory,systemdCollectorStatus,previewCollectorControl,activateSystemdCollector,stopSystemdCollector} from '../core/activate-collector';
import {discoverSwarm,previewSwarmInit,initializeSwarm} from '../core/swarm';
import {previewUninstall,uninstallResource} from '../core/uninstall-resource';
import {uninstallSelection} from '../core/uninstall-selection';
import {misePreview,installMise} from '../core/install-mise';
import {claudePreview,installClaude} from '../core/install-claude';
import {codexPreview,installCodex} from '../core/install-codex';
import {installSelection,type InstallSelection} from '../core/install-selection';
import {validateCredentialFile} from '../core/credential-file';
import {serviceFields,serviceRequest,type ServiceId} from './service-form';
import {previewDockerService,type ServiceRequest} from '../adapters/docker-service';
import {installService} from '../core/install-service';
import {containerMetricsText} from './container-metrics';
import {mountTerminalSizeGuard} from './terminal-size';
import { stateLabel } from './labels';
import { version } from '../version';
import { BoxRenderable, TextRenderable, SelectRenderable, InputRenderable, ScrollBoxRenderable, type CliRenderer } from '@opentui/core';
import { validateTarget, type Target } from '../core/platform';
import { installRuntimeBatch } from '../core/runtime-batch';
import { installRuntime } from '../core/runtime-install';
import { runtimePreview } from '../core/runtime-preview';
import { meter } from './meter';
import { diagnose } from '../core/diagnostics';
import { discoverContainers } from '../core/docker';
import { serviceOwner } from '../core/service-ownership';
import { controlManagedContainer } from '../core/container-operation';
import { latestMetrics } from '../core/metrics-query';
import { HostSampler } from '../core/metrics';
import { createPlan } from '../core/catalog';
import { readHistoryPage } from '../core/history';
import catalog from '../data/catalog.json';
export const tabs = ['Home', "Resources", "Services", "Metrics", "History", "About"];
const colors = { background: '#000A0E', text: '#F2F8F9', muted: '#B2C6CE', border: '#5F7D8C', selected: '#6D28D9', active: '#5EEDE1' };
/** Monta a interface sem instalar componentes ou criar banco de estado. */
export function mountApp(renderer: CliRenderer, target: Target = {edition:'desktop',system:process.platform,arch:process.arch}, runtime: {preview:typeof runtimePreview;install:typeof installRuntime} = {preview:runtimePreview,install:installRuntime}, services = {discover:discoverContainers,owner:serviceOwner,control:controlManagedContainer}, serviceInstaller={preview:previewDockerService,install:installService},codex={preview:codexPreview,install:installCodex},claude={preview:claudePreview,install:installClaude},mise={preview:misePreview,install:installMise},options:{dockerEngine?:{preview:typeof dockerEnginePreview;install:typeof installDockerEngine};selfUpdate?:SelfUpdateProvider;git?:{preview:typeof gitPreview;install:typeof installGit};openCode?:{preview:typeof openCodePreview;install:typeof installOpenCode};gh?:{preview:typeof ghPreview;install:typeof installGh};herdr?:{preview:typeof herdrPreview;install:typeof installHerdr};collectorInstallation?:{preview:typeof previewCollectorInstallation;install:typeof installCollector};collector?:{directory?:()=>string;status:typeof systemdCollectorStatus;preview:typeof previewCollectorControl;activate:typeof activateSystemdCollector;stop:typeof stopSystemdCollector};swarm?:{discover:typeof discoverSwarm;preview:typeof previewSwarmInit;initialize:typeof initializeSwarm};installDependencies?:boolean;removal?:{preview:typeof previewUninstall;uninstall:typeof uninstallResource}}={}): { select: (index: number) => void } {
  validateTarget(target);
  const shell = new BoxRenderable(renderer, { width: '100%', height: '100%', flexDirection: 'column', backgroundColor: colors.background });
  renderer.root.add(shell);
  shell.add(new TextRenderable(renderer, { content: "SetupVibe: development environment", height: 1, bg: colors.selected, fg: colors.text }));
  shell.add(new TextRenderable(renderer, { content: `Environment: ${target.system}/${target.arch} · ${target.edition === 'server' ? 'Server' : 'Desktop'}`, height: 3, fg: colors.muted }));
  const nav = new BoxRenderable(renderer, { height: 1, flexDirection: 'row', gap: 1 }); shell.add(nav);
  const tabControls = tabs.map((label,index) => {
    const control = new TextRenderable(renderer, { content: ` ${label} `, height: 1, fg: colors.muted, onMouseDown: () => select(index) });
    nav.add(control); return control;
  });
  const panel = new BoxRenderable(renderer, { flexGrow: 1, border: true, borderColor: colors.border, padding: 1, flexDirection: 'column' });shell.add(panel);
  const search = new InputRenderable(renderer, { placeholder: "Search resources… (/ to search)", maxLength: 80 }); panel.add(search);
  let resourceAction:'install'|'uninstall'='install';
  let uninstallReady:string[]=[];
  const removal=options.removal??{preview:previewUninstall,uninstall:uninstallResource};
  const actionBar=new BoxRenderable(renderer,{height:1,flexDirection:'row',gap:2,visible:false});panel.add(actionBar);
  const installChoice=new TextRenderable(renderer,{content:'[ Install ]',height:1,fg:colors.text,onMouseDown:()=>changeAction('install')});actionBar.add(installChoice);
  const uninstallChoice=new TextRenderable(renderer,{content:'[ Uninstall ]',height:1,fg:colors.text,onMouseDown:()=>changeAction('uninstall')});actionBar.add(uninstallChoice);
  const executeButton=new TextRenderable(renderer,{content:'[ Execute action ]',height:1,fg:colors.active,onMouseDown:()=>reviewSelection(true)});actionBar.add(executeButton);
  const versionInput = new InputRenderable(renderer, { placeholder: "Explicit version · Enter to preview", maxLength: 60, visible: false }); panel.add(versionInput);
  const serviceInput=new InputRenderable(renderer,{placeholder:'',maxLength:512,visible:false}); panel.add(serviceInput);
  const swarm=options.swarm??{discover:discoverSwarm,preview:previewSwarmInit,initialize:initializeSwarm};
  const swarmInput=new InputRenderable(renderer,{placeholder:'Advertised IPv4 or IPv6 address · Enter to review',maxLength:64,visible:false});panel.add(swarmInput);
  let swarmView=false,swarmReady:string|null=null;
  const collector=options.collector??collectorController();
  const dockerEngine=options.dockerEngine??{preview:dockerEnginePreview,install:installDockerEngine};
  const git=options.git??{preview:gitPreview,install:installGit};
  const openCode=options.openCode??{preview:openCodePreview,install:installOpenCode};
  const gh=options.gh??{preview:ghPreview,install:installGh};
  const herdr=options.herdr??{preview:herdrPreview,install:installHerdr};
  const collectorInstallation=options.collectorInstallation??{preview:previewCollectorInstallation,install:installCollector};
  const collectorInput=new InputRenderable(renderer,{placeholder:'Absolute collector executable path · Enter to review',maxLength:512,visible:false});panel.add(collectorInput);
  let collectorEmbedded=false;
  let collectorView=false,collectorAction:'install'|'activate'|'stop'='activate',collectorReady:{action:'install'|'activate'|'stop';executable:string;embedded:boolean}|null=null;
  let form:{id:ServiceId;fields:ReturnType<typeof serviceFields>;values:string[];index:number}|null=null;
  const serviceConfigurations=new Map<string,ServiceRequest>();
  let selectionReady:InstallSelection[]=[];
  let serviceCreateReady:ServiceRequest|null=null;
  let runtimeId: string | null = null;
  let runtimeReady: {id:string;version:string}|null = null;
  const runtimeVersions=new Map<string,string>();
  let batchReady:{id:string;version:string}[]=[];
  let execution: AbortController|null = null;
  let serviceReady:{component:string;name:string;action:'start'|'stop'|'restart'}|null=null;
  const confirmation = new InputRenderable(renderer, {placeholder:"Type INSTALL and press Enter",maxLength:20,visible:false}); panel.add(confirmation);
  const summary = new BoxRenderable(renderer, { height: 5, flexDirection: 'row', gap: 1 }); panel.add(summary);
  const summaryValues: TextRenderable[] = [];
  for (const label of ["Available", "Selected", 'Runtimes', "Services"]) {
    const card = new BoxRenderable(renderer, { flexGrow: 1, border: true, borderColor: colors.border, paddingLeft: 1 });
    const value = new TextRenderable(renderer, { content: label, fg: colors.active }); card.add(value); summary.add(card); summaryValues.push(value);
  }
  const workspace = new BoxRenderable(renderer, { flexDirection: 'row', flexGrow: 1, gap: 2 }); panel.add(workspace);
  const available = catalog.filter(item => item.editions.includes(target.edition) && item.systems.includes(target.system));
  const chosen = new Set<string>();
  const list = new SelectRenderable(renderer, { width: '45%', height: '100%', options: available.map(item => ({name:item.name, description:item.category, value:item.id})), textColor: colors.text, selectedBackgroundColor: colors.selected, selectedTextColor: colors.text, showScrollIndicator: true });
  workspace.add(list);
  const serviceList = new SelectRenderable(renderer, {width:'45%',height:'100%',visible:false,options:[],textColor:colors.text,selectedBackgroundColor:colors.selected,selectedTextColor:colors.text,showScrollIndicator:true}); workspace.add(serviceList);
  const reading = new ScrollBoxRenderable(renderer, { flexGrow: 1, height: '100%', scrollY: true, scrollX: false }); workspace.add(reading);
  const body = new TextRenderable(renderer, { content: '', fg: colors.text, width: '100%' }); reading.add(body);
  const status = new TextRenderable(renderer, { content: '', height: 1, fg: colors.active }); shell.add(status);
  const actions = new TextRenderable(renderer, { content: '', height: 1, fg: colors.muted }); shell.add(actions);
  shell.add(new TextRenderable(renderer, { content: "^Q Quit · Esc Back · ? Help", height: 1, fg: colors.text }));
  const sampler = new HostSampler();
  let request = 0;
  let active = 0;
  const historyCursors: (string | undefined)[] = [undefined];
  let historyNext: string | null = null;
  let reviewing = false;
  let helpOpen = false;
  let detailsExpanded = false;
  let sizeGuard:ReturnType<typeof mountTerminalSizeGuard>|undefined;
  let selfPanel:ReturnType<typeof mountSelfUpdatePanel>|undefined;
  /** Exibe apenas os atalhos relevantes para a área e a etapa atual. */
  const refreshChrome = () => {
    if(renderer.isDestroyed)return;
    if(active===5&&selfPanel){const footer=selfPanel.footer();status.content=footer.status;actions.content=footer.actions;return;}
    installChoice.bg=resourceAction==='install'?colors.selected:colors.background;
    uninstallChoice.bg=resourceAction==='uninstall'?colors.selected:colors.background;
    executeButton.fg=chosen.size&&!execution?colors.active:colors.muted;
    status.content = execution ? "Operation running · Esc cancels" : confirmation.visible ? `Confirmation required · type ${swarmReady?"INITIALIZE":collectorReady?"EXECUTE":serviceReady?"EXECUTE":uninstallReady.length?"UNINSTALL":"INSTALL"}` : collectorReady ? "Collector review · check the action before continuing" : swarmReady ? "Swarm review · check the address before continuing" : reviewing ? "Review · check details before continuing" : `${tabs[active]} · local query`;
    actions.content = execution ? "Esc Cancel · wait for completion" : confirmation.visible ? "Enter Confirm · Esc Back" : collectorReady ? "C Confirm · Esc Metrics · PgUp PgDn Scroll" : swarmReady ? "C Confirm · Esc Services · PgUp PgDn Scroll" : helpOpen ? "PgUp PgDn Scroll · Esc Close help" : reviewing ? (uninstallReady.length||selectionReady.length||serviceCreateReady||runtimeReady||batchReady.length ? "C Confirm · Esc Back · PgUp PgDn Scroll" : "Esc Back · PgUp PgDn Scroll") : [
      "^U Diagnose · 1–6 Sections",
      "I Install · U Uninstall · X Execute · Enter Select · / Search",
      swarmView?"N Initialize · W Refresh Swarm · Esc Services":"↑ ↓ Select · I Start · O Stop · R Restart · W Swarm · ^U Refresh",
      collectorView?"I Install · A Activate · S Stop · M Mode · C Refresh · Esc Metrics":"C Collector · ^U Refresh · PgUp PgDn Scroll",
      "N Next · B Previous · ^U Refresh",
      "1–6 Sections · ← → Navigate",
    ][active] ?? '';
  };
  selfPanel=mountSelfUpdatePanel(renderer,panel,target,version,colors,options.selfUpdate,refreshChrome,()=>select(0));
  const detail = () => {
    const item = available.find(item => item.id === list.getSelectedOption()?.value);
    if (item) body.content = `${item.name}\n${item.category}\n\nManager: ${item.manager}\nDependencies: ${item.dependencies.join(', ') || "none"}\n\n${chosen.has(item.id) ? "[Selected]" : "[Not selected]"}\n\nEnter: select\nV: application or runtime version\nG: configure service\nD: expand details\nP: review plan\n\n${chosen.size} selected resource(s)`;
  };
  const refreshList = () => {
    const selectedId = list.getSelectedOption()?.value;
    const query = search.value.toLocaleLowerCase('pt-BR');
    list.options = available.filter(item => `${item.id} ${item.name} ${item.category}`.toLocaleLowerCase('pt-BR').includes(query)).map(item => ({name: `${chosen.has(item.id) ? '✓ ' : ''}${item.name}`, description:item.category,value:item.id}));
    const index = list.options.findIndex(item => item.value === selectedId);
    if (index >= 0) list.setSelectedIndex(index);
    detail();
    if (!list.options.length) body.content = "No resources found.\n\nChange the search query.";
  };
  search.on('input', refreshList);
  search.on('enter', () => list.focus());
  serviceList.on('selectionChanged',()=>{
    const item=serviceList.getSelectedOption();
    if(item)body.content=`${item.name}\n\n${item.description}\n\nI: start · O: stop · R: restart\nActions require registered ownership and confirmation.`;
  });
  serviceInput.on('enter',()=>{
    if(!form)return;
    form.values[form.index]=serviceInput.value.trim();form.index++;
    if(form.index<form.fields.length){serviceInput.placeholder=form.fields[form.index]!.label;serviceInput.value=form.fields[form.index]!.value;body.content=`Configure ${form.id} · field ${form.index+1}/${form.fields.length}\n\n${serviceInput.placeholder}\n\nEnter: next · Esc: cancel`;return;}
    const configured=form;form=null;serviceInput.blur();serviceInput.visible=false;reviewing=true;reading.focus();const verification=++request;
    try{
      const draft=serviceRequest(configured.id,configured.values);body.content="Checking service configuration…";
      void (async()=>{try{return await serviceInstaller.preview(draft,target);}catch(error){if(!(error instanceof Error)||error.message!=='Docker unavailable; conflicts could not be checked.'||!(options.installDependencies||chosen.has('docker')&&runtimeVersions.has('docker')))throw error;const engine=await dockerEngine.preview(runtimeVersions.get('docker')??'candidate',target);if(engine.action==='external'||engine.action==='current')throw Error('Existing Docker is unavailable; restore daemon access first.');return serviceInstaller.preview(draft,target,{allowMissingDocker:true});}})().then(preview=>{if(request!==verification)return;serviceConfigurations.set(draft.id,draft);const awaiting='action'in preview&&preview.action==='awaiting-docker';serviceCreateReady=awaiting?null:draft;selectionReady=awaiting?[...(chosen.has('docker')&&runtimeVersions.has('docker')?[{kind:'application' as const,id:'docker' as const,version:runtimeVersions.get('docker')!}]:[]),{kind:'service',id:draft.id,request:draft}]:[];body.content="Service review\n\n"+(draft.id==='portainer'?"Portainer will have administrative Docker access through this socket.\n\n":'')+[preview.step.command,...preview.step.args].join(' ')+(awaiting?"\n\nDocker will be prepared before creating this service.":"")+"\n\nThe container will be created stopped.\nC: confirm creation · Esc: back";refreshChrome();}).catch(error=>{if(request===verification)body.content=error instanceof Error?error.message:String(error);});
    }catch(error){body.content=error instanceof Error?error.message:String(error);}
  });
  /* Hallmark · pre-emit critique: P4 H4 E4 S5 R5 V3 */
  /** Cada consulta recebe uma geração; navegação ou encerramento invalida respostas atrasadas. */
  const showSwarm=()=>{
    if(execution||sizeGuard?.isSmall())return;
    const verification=++request;swarmView=true;swarmReady=null;serviceList.visible=false;serviceList.blur();reading.focus();body.content='Swarm · querying Docker…';refreshChrome();
    void swarm.discover().then(status=>{
      if(request!==verification||renderer.isDestroyed)return;
      body.content='Docker Swarm\n\nState: '+status.state+'\nRole: '+(status.manager?'Manager':'Worker or inactive')+'\nAddress: '+(status.address||'unavailable')+'\nNode: '+(status.nodeId||'unavailable')+'\nCluster: '+(status.clusterId||'unavailable')+'\n\nN: review initialization · W: refresh · Esc: services';
    }).catch(error=>{if(request===verification&&!renderer.isDestroyed)body.content='Swarm unavailable\n\n'+(error instanceof Error?error.message:String(error))+'\n\nW: retry · Esc: services';});
  };
  swarmInput.on('enter',()=>{
    const address=swarmInput.value.trim(),verification=++request;swarmReady=null;swarmInput.blur();swarmInput.visible=false;reading.focus();body.content='Swarm · checking initialization…';
    void swarm.preview(address,target).then(preview=>{
      if(request!==verification||renderer.isDestroyed)return;
      if(preview.action==='current'){body.content='Swarm is already managed at this address.\n\nW: refresh · Esc: services';return;}
      swarmReady=address;body.content='Initialize Swarm\n\nAddress: '+address+'\nManager traffic listens on this address at port 2377.\nFirewall rules remain unchanged.\n\n'+preview.steps.map(step=>[step.command,...step.args].join(' ')).join('\n')+'\n\nC: confirm initialization · Esc: services';refreshChrome();
    }).catch(error=>{if(request===verification&&!renderer.isDestroyed)body.content='Swarm review failed\n\n'+(error instanceof Error?error.message:String(error))+'\n\nN: change address · W: refresh · Esc: services';});
  });
  /** Gerações invalidam consultas ao trocar de seção ou iniciar outra revisão. */
  const showCollector=()=>{
    const verification=++request;collectorView=true;collectorReady=null;reading.focus();body.content='Collector · querying supervisor…';refreshChrome();
    void collector.status().then(status=>{if(request!==verification||renderer.isDestroyed)return;body.content='Metrics collector\nMode: '+(collectorEmbedded?'Embedded SetupVibe':'Dedicated collector')+'\n\nLoaded: '+status.load+'\nState: '+status.active+' / '+status.sub+'\nEnabled: '+(status.enabled||'unavailable')+'\nUnit: '+(status.fragment||'unavailable')+'\n\nI: review installation · A: activate · S: stop\nM: switch mode · C: refresh · Esc: metrics';}).catch(error=>{if(request===verification&&!renderer.isDestroyed)body.content='Collector supervisor unavailable\n\n'+(error instanceof Error?error.message:String(error))+'\n\nC: retry · Esc: metrics';});
  };
  collectorInput.on('enter',()=>{
    const executable=collectorInput.value.trim(),action=collectorAction,verification=++request;collectorReady=null;collectorInput.blur();collectorInput.visible=false;reading.focus();body.content='Collector · checking configuration…';
    const config={executable,stateDirectory:dirname(statePath()),intervalMs:5000,embedded:collectorEmbedded};
    void (action==='install'?collectorInstallation.preview(config,target):collector.preview(config,(collector.directory?.()??collectorUnitDirectory()),action)).then(preview=>{
      if(request!==verification||renderer.isDestroyed)return;collectorReady={action,executable,embedded:collectorEmbedded};body.content='Collector review\nMode: '+(collectorEmbedded?'Embedded SetupVibe':'Dedicated collector')+'\n\nAction: '+action+'\nExecutable: '+executable+'\nUnit: '+preview.unit+'\n\n'+('steps'in preview?preview.steps.map(step=>[step.command,...step.args].join(' ')).join('\n'):'Create required directories and register the unit.\nActivate the native supervisor.')+(action==='stop'?'\n\nMetrics and login activation are preserved.':'\n\nThe user service will be enabled and started.')+'\n\nC: confirm · Esc: metrics';refreshChrome();
    }).catch(error=>{if(request===verification&&!renderer.isDestroyed)body.content='Collector review failed\n\n'+(error instanceof Error?error.message:String(error))+'\n\nI: install · A: activate · S: stop · Esc: metrics';});
  });
  confirmation.on('enter', () => {
    if(collectorReady&&confirmation.value==='EXECUTE'&&!execution){
      const selected=collectorReady;collectorReady=null;confirmation.blur();confirmation.visible=false;execution=new AbortController();body.content='Collector operation running…\nEsc: cancel';refreshChrome();
      const config={executable:selected.executable,stateDirectory:dirname(statePath()),intervalMs:5000,embedded:selected.embedded};
      void (selected.action==='install'?collectorInstallation.install(config,target,{confirmed:true,signal:execution.signal}):(selected.action==='activate'?collector.activate:collector.stop)(config,(collector.directory?.()??collectorUnitDirectory()),{confirmed:true,signal:execution.signal})).then(result=>{if(!renderer.isDestroyed)body.content='Collector result: '+stateLabel(result.status)+'\nOperation: '+result.id+'\n\nC: refresh · Esc: metrics';}).catch(error=>{if(!renderer.isDestroyed)body.content=error instanceof Error?error.message:String(error);}).finally(()=>{execution=null;refreshChrome();});return;
    }
    if(swarmReady&&confirmation.value==='INITIALIZE'&&!execution){
      const address=swarmReady;swarmReady=null;confirmation.blur();confirmation.visible=false;execution=new AbortController();body.content='Initializing Swarm…\nEsc: cancel';refreshChrome();
      void swarm.initialize(address,target,{confirmed:true,signal:execution.signal}).then(result=>{if(!renderer.isDestroyed)body.content='Swarm result: '+stateLabel(result.status)+'\nOperation: '+(result.operationId??'no changes')+'\n\nW: refresh · Esc: services';}).catch(error=>{if(!renderer.isDestroyed)body.content=error instanceof Error?error.message:String(error);}).finally(()=>{execution=null;refreshChrome();});return;
    }
    if(uninstallReady.length&&confirmation.value==='UNINSTALL'&&!execution){
      const ids=[...uninstallReady];uninstallReady=[];confirmation.blur();confirmation.visible=false;execution=new AbortController();refreshChrome();
      void uninstallSelection(ids,target,{confirmed:true,signal:execution.signal,onProgress:(id,index)=>{if(!renderer.isDestroyed)body.content=`Uninstalling ${index+1}/${ids.length}: ${id}\nEsc: cancel`;}},removal).then(result=>{if(!renderer.isDestroyed)body.content=`Result: ${stateLabel(result.status)}\n\n`+result.items.map(item=>`${item.id}: ${stateLabel(item.status)}${item.error?'\n'+item.error:''}`).join('\n');}).catch(error=>{if(!renderer.isDestroyed)body.content=error instanceof Error?error.message:String(error);}).finally(()=>{execution=null;refreshChrome();});return;
    }
    if(selectionReady.length&&confirmation.value==="INSTALL"&&!execution){
      const pending=[...selectionReady];selectionReady=[];confirmation.blur();confirmation.visible=false;execution=new AbortController();refreshChrome();
      body.content="Checking all selected resources…";
      void installSelection(pending,target,{confirmed:true,installDependencies:options.installDependencies,signal:execution.signal,onProgress:(id,index)=>{if(renderer.isDestroyed)return;body.content=`Installing ${index+1}/${pending.length}: ${id}\nEsc: cancel`;}},{runtime,service:serviceInstaller,credentials:validateCredentialFile},codex,claude,mise,gh,openCode,git,dockerEngine,herdr).then(result=>{if(renderer.isDestroyed)return;body.content=`Result: ${stateLabel(result.status)}\n\n`+result.items.map(item=>`${item.id}: ${item.status==='pending'?"Pending":stateLabel(item.status)}\nOperation: ${item.operationId??"no changes"}${item.error?'\n'+item.error:''}`).join('\n\n');}).catch(error=>{if(renderer.isDestroyed)return;body.content=error instanceof Error?error.message:String(error);}).finally(()=>{execution=null;refreshChrome();});return;
    }
    if(serviceCreateReady&&confirmation.value==="INSTALL"&&!execution){
      const draft=serviceCreateReady;serviceCreateReady=null;confirmation.blur();confirmation.visible=false;execution=new AbortController();refreshChrome();body.content="Creating service "+draft.id+'…';
      void serviceInstaller.install(draft,target,{confirmed:true,signal:execution.signal}).then(result=>{if(renderer.isDestroyed)return;body.content=`Result: ${stateLabel(result.status)}\nOperation: ${result.id}\n\nOpen Services to start the container.`;}).catch(error=>{if(renderer.isDestroyed)return;body.content=error instanceof Error?error.message:String(error);}).finally(()=>{execution=null;refreshChrome();});return;
    }
    if(serviceReady && confirmation.value==="EXECUTE" && !execution){
      const selected=serviceReady; serviceReady=null; confirmation.blur(); confirmation.visible=false;
      execution=new AbortController(); refreshChrome(); body.content=`Running action on ${selected.name}…\nEsc: cancel`;
      void services.control(selected.component,selected.action,{confirmed:true,signal:execution.signal}).then(result=>{if(renderer.isDestroyed)return;body.content=`Result: ${stateLabel(result.status)}\nOperation: ${result.id}\n\nCtrl+U: refresh services`;}).catch(error=>{if(renderer.isDestroyed)return;body.content=error instanceof Error?error.message:String(error);}).finally(()=>{execution=null;refreshChrome();});
      return;
    }
    if (confirmation.value !== "INSTALL" || (!runtimeReady&&!batchReady.length) || execution) return;
    const pending=batchReady.length?[...batchReady]:[runtimeReady!];batchReady=[];
    const selected = pending[0]!; runtimeReady = null; confirmation.blur(); confirmation.visible = false;
    execution = new AbortController(); const controller = execution; refreshChrome();
    body.content = `Installing ${selected.id}@${selected.version}…\nEsc: cancel`;
    void installRuntimeBatch(pending,target,{confirmed:true,signal:controller.signal,onEvent:(item,index,event)=>{if(renderer.isDestroyed)return;body.content=`Installing ${index+1}/${pending.length}: ${item.id}@${item.version}\n${stateLabel(event.type)}\nEsc: cancel`;}},runtime).then(result=>{
      if(renderer.isDestroyed)return;
      body.content=`Result: ${stateLabel(result.status)}\n\n`+result.items.map(item=>`${item.id}@${item.version}: ${item.status==='pending'?"Pending":stateLabel(item.status)}\nOperation: ${item.operationId??"no changes"}${item.error?'\n'+item.error:''}`).join('\n\n')+"\n\nEsc: back to selection";
    }).catch(error=>{if(renderer.isDestroyed)return;body.content=error instanceof Error?error.message:String(error);}).finally(()=>{execution=null;refreshChrome();});
  });
  versionInput.on('enter', () => {
    if (!runtimeId) return;
    runtimeReady = null;selectionReady=[];
    const id = runtimeId, version = versionInput.value, verification = ++request;
    versionInput.blur(); versionInput.visible = false; list.visible=false; reading.focus(); reviewing = true;
    body.content = "Checking version and ownership…";
    void (id==='docker'?dockerEngine.preview(version,target):id==='git'?git.preview(version,target):id==='opencode'?openCode.preview(version,target):id==='gh'?gh.preview(version,target):id==='herdr'?herdr.preview(version,target):id==='mise'?mise.preview(version,target):id==='claude'?claude.preview(version,target):id==='codex'?codex.preview(version,target,{installDependencies:options.installDependencies,allowMissingBun:chosen.has('bun')&&runtimeVersions.has('bun')}):runtime.preview(id,version,target,{allowMissingMise:options.installDependencies||chosen.has('mise')&&runtimeVersions.has('mise')})).then(preview => { if (request === verification) { runtimeVersions.set(id,version);if(id==='codex'||id==='claude'||id==='mise'||id==='gh'||id==='opencode'||id==='herdr'||id==='git'||id==='docker')selectionReady=[{kind:'application',id,version}]; runtimeReady = preview.action === 'current'||preview.action==='awaiting-manager'||id==='codex'||id==='claude'||id==='mise'||id==='gh'||id==='opencode'||id==='herdr'||id==='git'||id==='docker' ? null : {id,version}; body.content = `Resource: ${id}@${version}\nAction: ${stateLabel(preview.action)}\n\n` + preview.steps.map(step => [step.command,...step.args].join(' ')).join('\n') + (preview.action==='awaiting-manager'?"\n\nOwnership will be checked after mise is installed.\nEsc: back, then review the selection with P.":"\n\nC: confirm installation · Esc: back"); refreshChrome(); } }).catch(error => { if (request === verification) body.content = error instanceof Error ? error.message : String(error); });
  });
  list.on('selectionChanged', detail);
  list.on('itemSelected', () => { if (reviewing) return; const id = list.getSelectedOption()?.value; if (id) { chosen.has(id) ? chosen.delete(id) : chosen.add(id); refreshList(); } });
  const select = (index: number) => {
    if(renderer.isDestroyed)return;
    if(sizeGuard?.isSmall())return;
    if (execution||selfPanel?.isWriting()) return;
    selfPanel?.hide();workspace.visible=true;
    reading.scrollTo(0);
    collectorView=false;collectorReady=null;collectorInput.blur();collectorInput.visible=false;
    swarmView=false;swarmReady=null;swarmInput.blur();swarmInput.visible=false;
    runtimeReady = null; confirmation.blur(); confirmation.visible = false;
    uninstallReady=[];selectionReady=[];serviceCreateReady=null;form=null;serviceInput.blur();serviceInput.visible=false;
    batchReady=[]; serviceReady=null; confirmation.placeholder="Type INSTALL and press Enter";
    helpOpen = false;
    reviewing = false;
    const currentRequest = ++request;
    active = (index + tabs.length) % tabs.length;
    summary.visible = active === 0;
    const values = [available.length, chosen.size, available.filter(item=>item.category === 'runtimes').length, available.filter(item=>item.category === 'services').length];
    ["Available", "Selected", 'Runtimes', "Services"].forEach((label,i) => { summaryValues[i]!.content = `${values[i]}\n${label}`; });
    versionInput.blur(); versionInput.visible = false;
    search.visible = active === 1;actionBar.visible=active===1;
    search.blur();
    detailsExpanded = false;
    list.visible = active === 1;
    serviceList.visible=active===2; serviceList.blur();
    if (active === 1) list.focus(); else { list.blur(); reading.focus(); }
    tabControls.forEach((control,index) => { control.fg = index === active ? colors.background : colors.muted; control.bg = index === active ? colors.active : colors.background; });
    refreshChrome();
    if(active===5){workspace.visible=false;reading.blur();selfPanel!.show();refreshChrome();return;}
    const content = [
      "Prepare your environment\n\nReview resources and requirements before planning installation.\n\nCtrl+U: diagnose Docker and mise.\nThis version is under development.",
      catalog.filter(item => item.editions.includes(target.edition) && item.systems.includes(target.system)).map(item => `${item.id} · ${item.name}`).join('\n'),
      "Services\n\nDocker, Portainer, PostgreSQL, Redis and Mailpit.\nEnvironment discovery is pending.",
      "Metrics\n\nCollector integration is pending. No samples available.",
      "History\n\nSQLite state queries are pending.",
      `SetupVibe ${version}\n\nBun · TypeScript · OpenTUI\nPromovaweb`,
    ];
    if (active === 1) { detail(); return; }
    if (active === 2) {
      body.content = "Services\n\nQuerying Docker…";
      serviceList.options=[];
      void services.discover().then(result => {
        if (request !== currentRequest) return;
        serviceList.options=result.containers.map(item=>({name:item.name,description:`${item.state} · ${item.image}\n${item.ports||"No published ports"}`,value:item.id}));
        if(result.available&&result.containers.length){serviceList.focus();const item=serviceList.getSelectedOption();body.content=`${item?.name}\n\n${item?.description}\n\nI: start · O: stop · R: restart\nActions require registered ownership and confirmation.`;return;}
        body.content = "Docker services · read only\n\n" + (!result.available ? "Docker unavailable or invalid response." : result.containers.length ? result.containers.map(item => `${item.name} · ${item.state}\n${item.image}\n${item.ports || "No published ports"}\n`).join('\n') : "No containers found.") + "\n\nW: Docker Swarm · Ctrl+U refreshes the query.";
      });
      return;
    }
    if (active === 3) {
      let saved;
      try { saved = latestMetrics(); } catch { body.content = "Metrics\n\nCould not query the metrics database."; return; }
      const sample = saved?.sample ?? sampler.sample();
      const source = saved ? saved.stale ? "Collector · stale sample" : "Collector · recent sample" : "Local reading · no collector sample";
      const gib = (value: number) => (value / 1024 ** 3).toFixed(1);
      body.content = `Host metrics\n${source}\n\nMemory: ${gib(sample.memoryUsed)} / ${gib(sample.memoryTotal)} GiB\n${meter(sample.memoryUsed,sample.memoryTotal)}\nCPU: ${sample.cpuPercent === null ? "waiting for the second sample" : sample.cpuPercent.toFixed(1) + '%'}\nSwap: ${sample.swap ? gib(sample.swap.used) + ' / ' + gib(sample.swap.total) + ' GiB' : "unavailable"}\nDisk: ${sample.disk ? gib(sample.disk.used) + ' / ' + gib(sample.disk.total) + ' GiB' : "unavailable"}\n${sample.disk ? meter(sample.disk.used,sample.disk.total) : ''}\nUptime: ${Math.floor(sample.uptimeSeconds / 60)} min\n\nSample: ${sample.timestamp}\n\nC: collector controls · Ctrl+U refreshes the sample.\nThe collector runs separately.`;
      body.content += '\n\n' + containerMetricsText(sample.docker);
      return;
    }
    if (active === 4) {
      try {
        const page = readHistoryPage(historyCursors.at(-1), undefined, 8);
        historyNext = page.nextCursor;
        body.content = `History · page ${historyCursors.length}\n\n` + (page.operations.length ? page.operations.map(item => `${item.id} · ${stateLabel(item.status)}`).join('\n') : "No recorded operations.") + "\n\nN Next · B Previous · Ctrl+U Refresh";
      } catch { body.content = "History\n\nCould not query the state database."; }
    } else body.content = content[active] ?? '';
  };
  /** A escolha da ação preserva a seleção e descarta apenas a revisão anterior. */
  const changeAction=(action:'install'|'uninstall')=>{if(execution||sizeGuard?.isSmall())return;resourceAction=action;select(1);};
  const reviewSelection=(confirmNow=false)=>{
    if(execution||sizeGuard?.isSmall()||active!==1)return;
    const confirm=()=>{confirmation.value='';confirmation.placeholder=uninstallReady.length?'Type UNINSTALL and press Enter':'Type INSTALL and press Enter';confirmation.visible=true;confirmation.focus();refreshChrome();};
    if(resourceAction==='uninstall'){
      const verification=++request;selectionReady=[];runtimeReady=null;serviceCreateReady=null;uninstallReady=[];
      try{
        const ids=createPlan(catalog,[...chosen],target).components.filter(item=>chosen.has(item.id)).map(item=>item.id).reverse();
        reviewing=true;list.visible=false;list.blur();reading.focus();body.content='Checking ownership before uninstallation…';
        void Promise.all(ids.map(id=>removal.preview(id,target,{plannedRemovals:ids}))).then(previews=>{
          if(request!==verification||renderer.isDestroyed)return;uninstallReady=ids;
          body.content='Uninstall review\n\n'+previews.map(item=>item.id+'@'+item.owned.version+'\n'+item.retainedData).join('\n\n')+'\n\nC: confirm uninstallation · Esc: back';
          if(confirmNow)confirm();refreshChrome();
        }).catch(error=>{if(request===verification&&!renderer.isDestroyed)body.content=error instanceof Error?error.message:String(error);});
      }catch(error){body.content=error instanceof Error?error.message:String(error);}
      refreshChrome();return;
    }
      try { const plan = createPlan(catalog, [...chosen], target); reviewing = true; list.visible=false; list.blur(); reading.focus(); reading.scrollTo(0); const selectedItems=plan.components.filter(item=>chosen.has(item.id));const unsupported=selectedItems.filter(item=>item.manager!=='mise'&&item.id!=='codex'&&item.id!=='claude'&&item.id!=='mise'&&item.id!=='gh'&&item.id!=='opencode'&&item.id!=='herdr'&&item.id!=='git'&&item.id!=='docker'&&!['postgresql','redis','mailpit','portainer'].includes(item.id));const missing=selectedItems.filter(item=>(item.manager==='mise'||['codex','claude','mise','gh','opencode','herdr','git','docker'].includes(item.id))?!runtimeVersions.has(item.id):!serviceConfigurations.has(item.id));selectionReady=unsupported.length||missing.length?[]:selectedItems.map(item=>item.id==='codex'||item.id==='claude'||item.id==='mise'||item.id==='gh'||item.id==='opencode'||item.id==='herdr'||item.id==='git'||item.id==='docker'?{kind:'application',id:item.id,version:runtimeVersions.get(item.id)!}:item.manager==='mise'?{kind:'runtime',id:item.id,version:runtimeVersions.get(item.id)!}:{kind:'service',id:item.id,request:serviceConfigurations.get(item.id)!});batchReady=[];runtimeReady=null;serviceCreateReady=null;
      body.content="Plan review\n\n"+plan.components.map((item,i)=>`${i+1}. ${item.name}`).join('\n')+(unsupported.length?"\n\nInstaller unavailable: "+unsupported.map(item=>item.name).join(', '):missing.length?"\n\nConfigure with V (runtime) or G (service): "+missing.map(item=>item.name).join(', '):"\n\nC: install selected resources"+(options.installDependencies?"\nMissing prerequisites will be installed automatically.":''))+"\n\nEsc: back to selection"; } catch (error) { body.content = error instanceof Error ? error.message : String(error); }
    if(confirmNow&&selectionReady.length)confirm();refreshChrome();
  };
  renderer.keyInput.on('keypress', key => {
    if(sizeGuard?.isSmall()){
      key.preventDefault();
      if(key.ctrl&&key.name==='q'){if(selfPanel?.isBusy())selfPanel.cancel();else if(execution)execution.abort();else renderer.destroy();}
      return;
    }
    if(active===5&&selfPanel?.handleKey(key))return;
    if (execution) { if (key.name === 'escape' || key.ctrl && key.name === 'q') execution.abort(); return; }
    if(collectorInput.focused){if(key.ctrl&&key.name==='q'){renderer.destroy();return;}if(key.name==='escape'){key.preventDefault();collectorInput.blur();collectorInput.visible=false;showCollector();}return;}
    if(swarmInput.focused){if(key.ctrl&&key.name==='q'){renderer.destroy();return;}if(key.name==='escape'){key.preventDefault();swarmInput.blur();swarmInput.visible=false;showSwarm();}return;}
    if(serviceInput.focused){if(key.ctrl&&key.name==='q'){renderer.destroy();return;}if(key.name==='escape'){key.preventDefault();form=null;serviceInput.blur();serviceInput.visible=false;list.visible=true;list.focus();detail();}return;}
    if (confirmation.focused && key.name === 'escape') { key.preventDefault(); serviceReady=null; confirmation.blur(); confirmation.visible=false; reading.focus(); }
    else if (confirmation.focused) return;
    else if(active===3&&collectorView&&!helpOpen&&collectorReady&&key.name==='c'){key.preventDefault();confirmation.value='';confirmation.placeholder='Type EXECUTE and press Enter';confirmation.visible=true;confirmation.focus();}
    else if(active===3&&collectorView&&!helpOpen&&key.name==='m'&&!key.ctrl){key.preventDefault();collectorEmbedded=!collectorEmbedded;showCollector();}
    else if(active===3&&!helpOpen&&key.name==='c'&&!key.ctrl){key.preventDefault();showCollector();}
    else if(active===3&&collectorView&&!helpOpen&&['i','a','s'].includes(key.name)&&!key.ctrl){key.preventDefault();request++;collectorReady=null;collectorAction=key.name==='i'?'install':key.name==='a'?'activate':'stop';collectorInput.placeholder=collectorEmbedded?'Absolute SetupVibe executable path · Enter to review':'Absolute collector executable path · Enter to review';collectorInput.value='';collectorInput.visible=true;collectorInput.focus();body.content='Collector '+collectorAction+'\n\nEnter the absolute compiled collector path.\nConfiguration is checked before any changes.\nEnter: review · Esc: cancel';}
    else if(active===3&&collectorView&&!helpOpen&&key.name==='escape'){key.preventDefault();select(3);}
    else if(active===2&&key.name==='w'&&!key.ctrl){key.preventDefault();showSwarm();}
    else if(active===2&&swarmView&&key.name==='n'&&!key.ctrl){key.preventDefault();request++;swarmReady=null;swarmInput.value='';swarmInput.visible=true;swarmInput.focus();body.content='Initialize Swarm\n\nEnter the IP address of the intended manager interface.\nEnter: review · Esc: cancel';}
    else if(active===2&&swarmView&&swarmReady&&key.name==='c'){key.preventDefault();confirmation.value='';confirmation.placeholder='Type INITIALIZE and press Enter';confirmation.visible=true;confirmation.focus();}
    else if(active===2&&swarmView&&key.name==='escape'){key.preventDefault();select(2);}
    else if(active===2 && !swarmView && ['i','o','r'].includes(key.name) && !key.ctrl){
      key.preventDefault();
      const item=serviceList.getSelectedOption();if(!item)return;
      try{
        const component=services.owner(item.value);
        if(!component){body.content="External container · control unavailable.\nNo registered ownership for this ID.";return;}
        const action=key.name==='i'?'start':key.name==='o'?'stop':'restart';
        serviceReady={component,name:item.name,action};
        body.content=`Confirm ${key.name==='i'?"start":key.name==='o'?"stop":"restart"}\n\nContainer: ${item.name}\nComponent: ${component}\n\nType EXECUTE to confirm.`;
        confirmation.value='';confirmation.placeholder="Type EXECUTE and press Enter";confirmation.visible=true;confirmation.focus();
      }catch(error){body.content=error instanceof Error?error.message:String(error);}
    }
    else if ((uninstallReady.length||selectionReady.length||serviceCreateReady||runtimeReady||batchReady.length) && reviewing && key.name === 'c') { key.preventDefault(); confirmation.value='';confirmation.placeholder=uninstallReady.length?'Type UNINSTALL and press Enter':'Type INSTALL and press Enter'; confirmation.visible=true; confirmation.focus(); }
    else if (key.ctrl && key.name === 'q') renderer.destroy();
    else if (helpOpen && key.name === 'escape') { key.preventDefault(); select(active); }
    else if (helpOpen && key.name === 'pagedown') reading.scrollBy(8);
    else if (helpOpen && key.name === 'pageup') reading.scrollBy(-8);
    else if (helpOpen) return;
    else if (!search.focused && key.name === '?') {
      key.preventDefault(); request++; helpOpen = true; list.blur(); reading.focus();
      body.content = "Help · " + tabs[active] + '\n\n' +
        "1–6: select section · ← →: switch\nCtrl+U: refresh · Ctrl+Q: quit\n\n" +
        (active === 1 ? "/: search · Tab: change focus\n↑ ↓: browse list\nEnter: select or deselect\nP: review plan · Ctrl+D: clear\nEsc in review: back to selection" : active === 4 ? "N: next page · B: previous\nCtrl+U: return to the latest page" : active === 3 ? "C: collector status\nI/A/S in collector: install, activate or stop\nActions require EXECUTE confirmation." : active === 2 ? "I: start · O: stop · R: restart\nW: Swarm · N in Swarm: initialize\nActions require review and confirmation." : active === 0 ? "Ctrl+U: diagnose Docker and mise" : "Read-only section: no changes are performed.") +
        "\n\nEsc: close help";
    }
    else if (active === 4 && key.name === 'n') { if (historyNext) { historyCursors.push(historyNext); select(4); } }
    else if (active === 4 && key.name === 'b') { if (historyCursors.length > 1) { historyCursors.pop(); select(4); } }
    else if (key.ctrl && key.name === 'u') {
      if (active === 4) historyCursors.splice(0, historyCursors.length, undefined);
      if (active !== 0) select(active);
      else {
        const diagnosticRequest = ++request;
        body.content = "Environment diagnostics\n\nQuerying Docker and mise…";
        void diagnose(target).then(result => {
          if (request !== diagnosticRequest) return;
          body.content = "Environment diagnostics\n\n" +
            'Docker: ' + (result.docker.available ? result.docker.containers.length + ' container(s)' : "unavailable") + '\n' +
            'mise: ' + (result.mise === null ? "outside the Server scope" : result.mise.available ? result.mise.installations.length + " installed version(s)" : "unavailable") +
            "\n\nExisting installations have not been adopted by SetupVibe.\nPlatform validation: pending.\n\nCtrl+U refreshes diagnostics.";
        }).catch(() => { if (request === diagnosticRequest) body.content = "Could not query diagnostics."; });
      }
    }
    else if (versionInput.focused && key.name === 'escape') { key.preventDefault(); versionInput.blur(); versionInput.visible = false; list.focus(); }
    else if (versionInput.focused) return;
    else if(active===1&&!search.focused&&!reviewing&&key.name==='g'){
      key.preventDefault();const id=list.getSelectedOption()?.value;
      if(!['postgresql','redis','mailpit','portainer'].includes(id??'')){body.content="Select PostgreSQL, Redis, Mailpit or Portainer to configure.";return;}
      const fields=serviceFields(id as ServiceId);form={id:id as ServiceId,fields,values:[],index:0};list.visible=false;list.blur();serviceInput.visible=true;serviceInput.placeholder=fields[0]!.label;serviceInput.value='';serviceInput.focus();body.content=`Configure ${id} · field 1/${fields.length}\n\n${fields[0]!.label}\n\nEnter: next · Esc: cancel`;
    }
    else if (active === 1 && !search.focused && key.name === 'v' && !reviewing) {
      key.preventDefault();
      const item = available.find(item => item.id === list.getSelectedOption()?.value);
      if (item?.manager === 'mise'||item?.id==='codex'||item?.id==='claude'||item?.id==='mise'||item?.id==='gh'||item?.id==='opencode'||item?.id==='herdr'||item?.id==='git'||item?.id==='docker') { runtimeId = item.id; versionInput.visible = true; versionInput.value = ['git','docker'].includes(item.id)?'candidate':''; versionInput.focus(); }
      else body.content = "Select Docker, Git, a mise runtime, mise, GitHub CLI, OpenCode, Herdr, Codex or Claude Code to enter a version.";
    }
    else if (active === 1 && reviewing && key.name === 'escape') { key.preventDefault(); request++;uninstallReady=[]; selectionReady=[];serviceCreateReady=null; runtimeReady=null; batchReady=[]; reviewing = false; detailsExpanded=false; list.visible=true; list.focus(); detail(); }
    else if (key.name === 'pagedown' && !search.focused) reading.scrollBy(8);
    else if (key.name === 'pageup' && !search.focused) reading.scrollBy(-8);
    else if (active === 1 && reviewing) return;
    else if(active===1&&!search.focused&&(key.name==='i'||key.name==='u')){key.preventDefault();changeAction(key.name==='i'?'install':'uninstall');}
    else if (active === 1 && !search.focused && key.name === 'd' && !key.ctrl) { detailsExpanded = !detailsExpanded; list.visible = !detailsExpanded; if (detailsExpanded) {list.blur(); reading.focus();} else list.focus(); }
    else if (active === 1 && key.ctrl && key.name === 'd') { key.preventDefault(); chosen.clear(); refreshList(); }
    else if (active === 1 && key.name === 'tab') { search.focused ? (detailsExpanded ? reading.focus() : list.focus()) : search.focus(); }
    else if (active === 1 && !search.focused && key.name === '/') { key.preventDefault(); search.focus(); }
    else if (search.focused && key.name !== 'escape') return;
    else if (active===1&&(key.name==='p'||key.name==='x')) {key.preventDefault();reviewSelection(key.name==='x');}
    else if (key.name === 'escape') select(0);
    else if (key.name === 'right') select(active + 1);
    else if (key.name === 'left') select(active - 1);
    else if (/^[1-6]$/.test(key.name)) select(Number(key.name) - 1);
  });
  renderer.keyInput.on('keypress', refreshChrome);
  /** Invalida consultas e cancela operações antes que retornos assíncronos alcancem a cena encerrada. */
  renderer.once('destroy',()=>{request++;execution?.abort();});
  select(0);
  sizeGuard=mountTerminalSizeGuard(renderer,shell,[collectorInput,swarmInput,search,versionInput,serviceInput,confirmation,list,serviceList,reading,...selfPanel.focusables],colors);
  return { select };
}
