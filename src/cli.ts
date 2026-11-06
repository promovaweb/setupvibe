/** Expõe consultas, prévias e operações que exigem confirmação explícita. */
import {discoverSwarm,previewSwarmInit,initializeSwarm} from './core/swarm';
import {installCollector,previewCollectorInstallation} from './core/install-collector';
import {collectorController} from './core/collector-controller';
import {readInstallManifest} from './core/install-manifest';
import {installSelection} from './core/install-selection';
import {previewUninstall} from './core/uninstall-resource';
import {uninstallSelection} from './core/uninstall-selection';
import {dockerEnginePreview,installDockerEngine} from './core/install-docker';
import {inspectAptDocker} from './adapters/apt-docker';
import {gitPreview,installGit} from './core/install-git';
import {inspectAptGit} from './adapters/apt-git';
import {openCodePreview,installOpenCode} from './core/install-opencode';
import {ghPreview,installGh} from './core/install-gh';
import {herdrPreview,installHerdr} from './core/install-herdr';
import {installMise} from './core/install-mise';
import {installClaude} from './core/install-claude';
import {installCodex,codexPreview} from './core/install-codex';
import { version } from './version';
import { validateTarget, type Target } from './core/platform';
import { createPlan, validateCatalog } from './core/catalog';
import { readHistory, readOperation, readHistoryPage } from './core/history';
import { readMetrics } from './core/metrics-query';
import { discoverContainers } from './core/docker';
import { diagnose } from './core/diagnostics';
import { discoverMise, miseInstallSteps } from './adapters/mise';
import { systemdCollector, launchdCollector } from './core/supervisor';
import { dirname } from 'node:path';
import { statePath } from './core/history';
import { runtimePreview } from './core/runtime-preview';
import { installRuntime } from './core/runtime-install';
import { writeCollectorConfig } from './core/install-supervisor';
import {activatePreparedRelease,previewSelfUpdate,updateSelf,previewSelfRollback,rollbackSelf,selfInstallDirectory} from './core/self-update';
import {changePathIntegration,previewPathIntegration,pathShell} from './core/shell-path';
import { controlManagedContainer } from './core/container-operation';
import { installService } from './core/install-service';
import embedded from './data/catalog.json';
const invocation = process.argv.slice(2);
// A edição é global, inclusive no launcher Server e antes do nome do comando.
const args = invocation.filter(arg=>arg!=='--server');
const json = args.includes('--json');
const target: Target = { edition: invocation.includes('--server') ? 'server' : 'desktop', system: process.platform, arch: process.arch };
const help = "SetupVibe 2\n\nCommands:\n  activate-release <version> <sha256> [install-directory] --confirm [--json]\n  preview-update <version> [install-directory] [--json]\n  update <version> [install-directory] --confirm [--json]\n  preview-rollback [install-directory] [--json]\n  rollback [install-directory] --confirm [--json]\n  preview-path <bin-directory> [bash|zsh] [--json]\n  install-path <bin-directory> [bash|zsh] --confirm [--json]\n  preview-remove-path <bin-directory> [bash|zsh] [--json]\n  remove-path <bin-directory> [bash|zsh] --confirm [--json]\n  docker-info [--json]\n  preview-docker [package-version] [--json]\n  install-docker [package-version] --confirm [--json|--events]\n  git-info [--json]\n  preview-git [package-version] [--json]\n  install-git [package-version] --confirm [--json|--events]\n  preview-opencode <version> [--json]\n  install-opencode <version> --confirm [--json]\n  preview-gh <version> [--json]\n  install-gh <version> --confirm [--json]\n  preview-herdr <version> [--json]\n  install-herdr <version> --confirm [--json]\n  install-collector <absolute-executable> --confirm [--embedded] [--json]\n  preview-install-collector <absolute-executable> [--embedded] [--json]\n  --collector [interval-ms]\n  collector-status [--json]\n  activate-collector <absolute-executable> --confirm [--embedded] [--json]\n  stop-collector <absolute-executable> --confirm [--embedded] [--json]\n  swarm [--json]\n  preview-swarm <address> [--json]\n  init-swarm <address> --confirm [--json]\n  install <manifest.json> --confirm [--install-dependencies] [--json|--events]\n  preview-install <manifest.json> [--install-dependencies] [--json]\n  uninstall <ids...> --confirm [--json]\n  preview-uninstall <ids...> [--json]\n  install-mise <version> --confirm [--json]\n  install-claude <version> --confirm [--json]\n  preview-codex <version> [--install-dependencies] [--json]\n  install-codex <version> --confirm [--install-dependencies] [--json]\n  write-collector <executable> <destination> --confirm [--embedded] [--json]\n  preview-collector <absolute-executable> [--embedded] [--json]\n  install-runtime <runtime> <version> --confirm [--install-dependencies] [--json|--events]\n  preview-runtime <runtime> <version> [--install-dependencies] [--json]\n  plan-runtime <runtime> <version> [--json]\n  runtimes [--json]\n  doctor [--server] [--json]\n  create-service portainer <image-digest> <https-port> <volume> <docker-socket> --confirm [--json]\n  create-service postgresql <image-digest> <port> <volume> <password-file> <user> <database> --confirm [--json]\n  create-service <redis|mailpit> <image-digest> <port> [volume-or-smtp-port] --confirm [--json]\n  control-service <component> <start|stop|restart> --confirm [--json]\n  services [--json]\n  metrics [cursor] [--json]\n  history-page [cursor] [--json]\n  history [id] [--json]\n  platform [--server]\n  catalog [--server] [--json]\n  plan <ids...> [--server] [--json]\n  --version";
try {
  if(args[0]==='--collector'){
    validateTarget(target);
    const {runCollector}=await import('./core/run-collector');
    await runCollector(args.slice(1));
  }else if (args.every(arg=>['--server','--install-dependencies'].includes(arg)) && process.stdin.isTTY && process.stdout.isTTY) {
    validateTarget(target);
    const { createCliRenderer } = await import('@opentui/core');
    const { mountApp } = await import('./tui/app');
    mountApp(await createCliRenderer({ exitOnCtrlC: true }), target,undefined,undefined,undefined,undefined,undefined,undefined,{installDependencies:args.includes('--install-dependencies')});
  } else if (args.every(arg=>['--server','--install-dependencies'].includes(arg)) || args.includes('--help')) console.log(help);
  else if (args.length === 1 && args[0] === '--version') console.log(version);
  else {
    const command = args[0];
    const unknown = args.slice(1).filter(arg => arg.startsWith('-') && !['--server', '--json', ...(['install-collector','preview-install-collector','preview-collector','write-collector','activate-collector','stop-collector'].includes(command!)?['--embedded']:[]), ...(['install','preview-install','install-codex','preview-codex','install-runtime','preview-runtime'].includes(command!)?['--install-dependencies']:[]), ...(['install-runtime','install','install-git','install-docker'].includes(command!) ? ['--confirm','--events'] : ['activate-release','update','rollback','install-path','remove-path','install-opencode','install-gh','install-herdr','install-collector','activate-collector','stop-collector','init-swarm','install','uninstall','install-mise','install-claude','install-codex','write-collector','control-service','create-service'].includes(command!) ? ['--confirm'] : [])].includes(arg));
    if (unknown.length) throw new Error(`Unknown option: ${unknown[0]}.`);
    validateTarget(target);
    const ids = args.slice(1).filter(arg => !arg.startsWith('-'));
    if (!['activate-release','preview-update','update','preview-rollback','rollback','preview-path','install-path','preview-remove-path','remove-path'].includes(command!) && command !== 'install-docker' && command !== 'preview-docker' && command !== 'install-git' && command !== 'preview-git' && command !== 'install-opencode' && command !== 'preview-opencode' && command !== 'install-gh' && command !== 'preview-gh' && command !== 'install-herdr' && command !== 'preview-herdr' && command !== 'install-collector' && command !== 'preview-install-collector' && command !== 'activate-collector' && command !== 'stop-collector' && command !== 'init-swarm' && command !== 'preview-swarm' && command !== 'install' && command !== 'preview-install' && command !== 'uninstall' && command !== 'preview-uninstall' && command !== 'preview-codex' && command !== 'install-mise' && command !== 'install-claude' && command !== 'install-codex' && command !== 'plan' && command !== 'history' && command !== 'metrics' && command !== 'history-page' && command !== 'preview-collector' && command !== 'plan-runtime' && command !== 'preview-runtime' && command !== 'install-runtime' && command !== 'write-collector' && command !== 'control-service' && command !== 'create-service' && ids.length) throw new Error("This command does not accept resource IDs.");
    if(command==='activate-release'){
      if(ids.length<2||ids.length>3)throw Error('Provide a cached release version, SHA-256 and optional install directory.');
      const prefix=ids[2]??await selfInstallDirectory(),controller=new AbortController(),cancel=()=>controller.abort();process.on('SIGINT',cancel);process.on('SIGTERM',cancel);
      try{const result=await activatePreparedRelease(ids[0]!,ids[1]!,prefix,target,{confirmed:args.includes('--confirm'),signal:controller.signal});console.log(JSON.stringify(result,null,json?undefined:2));if(!['succeeded','current'].includes(result.status))process.exitCode=result.status==='cancelled'?130:1;}
      finally{process.off('SIGINT',cancel);process.off('SIGTERM',cancel);}
    }else if(['preview-update','update','preview-rollback','rollback'].includes(command!)){
      const updating=command==='preview-update'||command==='update';if(updating?(ids.length<1||ids.length>2):ids.length>1)throw Error('Provide a release version and optional install directory for update, or an optional install directory for rollback.');
      const prefix=ids[updating?1:0]??await selfInstallDirectory(),controller=new AbortController(),cancel=()=>controller.abort();process.on('SIGINT',cancel);process.on('SIGTERM',cancel);
      try{
        const result=command==='preview-update'?await previewSelfUpdate(ids[0]!,prefix,target,{signal:controller.signal}):command==='update'?await updateSelf(ids[0]!,prefix,target,{confirmed:args.includes('--confirm'),signal:controller.signal}):command==='preview-rollback'?await previewSelfRollback(prefix,target):await rollbackSelf(prefix,target,{confirmed:args.includes('--confirm'),signal:controller.signal});
        if(command!.startsWith('preview-')&&controller.signal.aborted){console.log(JSON.stringify({status:'cancelled',executed:false}));process.exitCode=130;}
        else{console.log(JSON.stringify(result,null,json?undefined:2));if('status'in result&&!['succeeded','current'].includes(result.status))process.exitCode=result.status==='cancelled'?130:1;}
      }catch(error){if(controller.signal.aborted){console.log(JSON.stringify({status:'cancelled',executed:false}));process.exitCode=130;}else throw error;}finally{process.off('SIGINT',cancel);process.off('SIGTERM',cancel);}
    }else if(['preview-path','install-path','preview-remove-path','remove-path'].includes(command!)){
      if(ids.length<1||ids.length>2)throw Error('Provide an absolute bin directory and optionally bash or zsh.');
      const shell=pathShell(ids[1]),remove=command==='preview-remove-path'||command==='remove-path',controller=new AbortController(),cancel=()=>controller.abort();process.on('SIGINT',cancel);process.on('SIGTERM',cancel);
      try{const result=command!.startsWith('preview-')?await previewPathIntegration(ids[0]!,shell,{remove}):await changePathIntegration(ids[0]!,shell,{remove,confirmed:args.includes('--confirm'),signal:controller.signal});console.log(JSON.stringify(result,null,json?undefined:2));if('status'in result&&!['succeeded','current'].includes(result.status))process.exitCode=result.status==='cancelled'?130:1;}
      finally{process.off('SIGINT',cancel);process.off('SIGTERM',cancel);}
    }else if(command==='git-info'){if(target.system!=='linux')throw Error('APT Git discovery requires Linux.');console.log(JSON.stringify(await inspectAptGit(),null,json?undefined:2));}
    else if(command==='docker-info')console.log(JSON.stringify(await inspectAptDocker(),null,json?undefined:2));
    else if(command==='preview-docker'||command==='install-docker'){
      if(ids.length>1)throw Error('Provide at most one Docker package version.');
      const requested=ids[0]??'candidate',controller=new AbortController(),cancel=()=>controller.abort();process.on('SIGINT',cancel);process.on('SIGTERM',cancel);
      try{const result=command==='preview-docker'?await dockerEnginePreview(requested,target,{signal:controller.signal}):await installDockerEngine(requested,target,{confirmed:args.includes('--confirm'),signal:controller.signal,onEvent:args.includes('--events')?event=>console.log(JSON.stringify({type:'event',event})):undefined});console.log(args.includes('--events')?JSON.stringify({type:'result',result}):JSON.stringify(result,null,json?undefined:2));if('status'in result&&typeof result.status==='string'&&!['succeeded','current','external'].includes(result.status))process.exitCode=result.status==='cancelled'?130:1;}catch(error){if(controller.signal.aborted){console.log(JSON.stringify({status:'cancelled',executed:false}));process.exitCode=130;}else throw error;}finally{process.off('SIGINT',cancel);process.off('SIGTERM',cancel);}
    }else if(command==='preview-git'||command==='install-git'){
      if(ids.length>1)throw Error('Provide at most one Git package version.');
      const requested=ids[0]??'candidate',controller=new AbortController(),cancel=()=>controller.abort();process.on('SIGINT',cancel);process.on('SIGTERM',cancel);
      try{
        const result=command==='preview-git'?await gitPreview(requested,target):await installGit(requested,target,{confirmed:args.includes('--confirm'),signal:controller.signal,onEvent:args.includes('--events')?event=>console.log(JSON.stringify({type:'event',event})):undefined});
        console.log(args.includes('--events')?JSON.stringify({type:'result',result}):JSON.stringify(result,null,json?undefined:2));
        if('status'in result&&typeof result.status==='string'&&!['succeeded','current','external'].includes(result.status))process.exitCode=result.status==='cancelled'?130:1;
      }finally{process.off('SIGINT',cancel);process.off('SIGTERM',cancel);}
    }else if(command==='install-collector'||command==='preview-install-collector'){
      if(ids.length!==1)throw Error('Provide one absolute collector executable path.');
      const config={executable:ids[0]!,stateDirectory:dirname(statePath()),intervalMs:5000,embedded:args.includes('--embedded')};
      const controller=new AbortController(),cancel=()=>controller.abort();process.on('SIGINT',cancel);process.on('SIGTERM',cancel);
      try{const result=command==='preview-install-collector'?await previewCollectorInstallation(config,target):await installCollector(config,target,{confirmed:args.includes('--confirm'),signal:controller.signal});console.log(JSON.stringify(result,null,json?undefined:2));if('status'in result&&typeof result.status==='string'&&result.status!=='succeeded')process.exitCode=result.status==='cancelled'?130:1;}
      finally{process.off('SIGINT',cancel);process.off('SIGTERM',cancel);}
    }else if(command==='collector-status')console.log(JSON.stringify(await collectorController().status(),null,json?undefined:2));
    else if(command==='activate-collector'||command==='stop-collector'){
      if(ids.length!==1)throw Error('Provide one absolute collector executable path.');
      const config={executable:ids[0]!,stateDirectory:dirname(statePath()),intervalMs:5000,embedded:args.includes('--embedded')};
      const controller=new AbortController(),cancel=()=>controller.abort();process.on('SIGINT',cancel);process.on('SIGTERM',cancel);
      try{const result=await(command==='activate-collector'?collectorController().activate:collectorController().stop)(config,collectorController().directory(),{confirmed:args.includes('--confirm'),signal:controller.signal});console.log(JSON.stringify(result));if(result.status!=='succeeded')process.exitCode=result.status==='cancelled'?130:1;}
      finally{process.off('SIGINT',cancel);process.off('SIGTERM',cancel);}
    }else if(command==='swarm'){
      const result=await discoverSwarm();console.log(JSON.stringify(result,null,json?undefined:2));
    }else if(command==='preview-swarm'||command==='init-swarm'){
      if(ids.length!==1)throw Error('Provide one advertised IP address.');
      if(command==='preview-swarm')console.log(JSON.stringify(await previewSwarmInit(ids[0]!,target),null,json?undefined:2));
      else{
        const controller=new AbortController(),cancel=()=>controller.abort();process.on('SIGINT',cancel);process.on('SIGTERM',cancel);
        try{const result=await initializeSwarm(ids[0]!,target,{confirmed:args.includes('--confirm'),signal:controller.signal});console.log(JSON.stringify(result));if(!['current','succeeded'].includes(result.status))process.exitCode=result.status==='cancelled'?130:1;}
        finally{process.off('SIGINT',cancel);process.off('SIGTERM',cancel);}
      }
    }else if(command==='install'||command==='preview-install'){
      if(ids.length!==1)throw Error('Provide one installation manifest path.');
      if(command==='install'&&!args.includes('--confirm'))throw Error('Explicit confirmation required.');
      const selection=readInstallManifest(ids[0]!,target);
      const controller=new AbortController(),cancel=()=>controller.abort();process.on('SIGINT',cancel);process.on('SIGTERM',cancel);
      try{
        const result=await installSelection(selection,target,{confirmed:args.includes('--confirm'),previewOnly:command==='preview-install',installDependencies:args.includes('--install-dependencies'),signal:controller.signal,onProgress:args.includes('--events')?(id,index)=>console.log(JSON.stringify({type:'resource-started',id,index,total:selection.length})):undefined});
        console.log(args.includes('--events')?JSON.stringify({type:'result',result}):json?JSON.stringify(result):command==='preview-install'?JSON.stringify(result,null,2):'Result: '+result.status+'\n'+result.items.map(item=>item.id+': '+item.status+(item.error?' · '+item.error:'')).join('\n'));
        if(!['succeeded','previewed'].includes(result.status))process.exitCode=result.status==='cancelled'?130:1;
      }finally{process.off('SIGINT',cancel);process.off('SIGTERM',cancel);}
    }else if(command==='uninstall'||command==='preview-uninstall'){
      const selected=createPlan(embedded,ids,target).components.filter(item=>ids.includes(item.id)).map(item=>item.id).reverse();
      if(command==='preview-uninstall'){
        const previews=await Promise.all(selected.map(id=>previewUninstall(id,target,{plannedRemovals:selected})));console.log(json?JSON.stringify({previews,executed:false}):previews.map(item=>item.id+'@'+item.owned.version+'\n'+item.retainedData).join('\n\n'));
      }else{
        const controller=new AbortController(),cancel=()=>controller.abort();process.on('SIGINT',cancel);process.on('SIGTERM',cancel);
        try{const result=await uninstallSelection(selected,target,{confirmed:args.includes('--confirm'),signal:controller.signal});console.log(json?JSON.stringify(result):'Result: '+result.status);if(result.status!=='succeeded')process.exitCode=result.status==='cancelled'?130:1;}finally{process.off('SIGINT',cancel);process.off('SIGTERM',cancel);}
      }
    }else if(command==='preview-codex'||command==='preview-gh'||command==='preview-opencode'||command==='preview-herdr'){
      if(ids.length!==1)throw Error("Provide a fixed application version.");
      const preview=await (command==='preview-opencode'?openCodePreview(ids[0]!,target):command==='preview-gh'?ghPreview(ids[0]!,target):command==='preview-herdr'?herdrPreview(ids[0]!,target):codexPreview(ids[0]!,target,{installDependencies:args.includes('--install-dependencies')}));console.log(json?JSON.stringify(preview):JSON.stringify(preview,null,2));
    } else if(command==='install-opencode'||command==='install-gh'||command==='install-herdr'||command==='install-mise'||command==='install-codex'||command==='install-claude'){
      if(ids.length!==1)throw Error("Provide a fixed application version.");
      const controller=new AbortController(),cancel=()=>controller.abort();process.on('SIGINT',cancel);process.on('SIGTERM',cancel);
      try{const result=await (command==='install-opencode'?installOpenCode:command==='install-gh'?installGh:command==='install-herdr'?installHerdr:command==='install-mise'?installMise:command==='install-claude'?installClaude:installCodex)(ids[0]!,target,{confirmed:args.includes('--confirm'),installDependencies:args.includes('--install-dependencies'),signal:controller.signal});console.log(json?JSON.stringify(result):`Result: ${result.status}\nExecutable: ${result.executable??"unavailable"}`);if(result.status!=='succeeded'&&result.status!=='current')process.exitCode=result.status==='cancelled'?130:1;}
      finally{process.off('SIGINT',cancel);process.off('SIGTERM',cancel);}
    } else if (command === 'create-service') {
      if ((ids[0]==='postgresql'?ids.length!==7:ids[0]==='portainer'?ids.length!==5:ids.length<3||ids.length>4) || !['postgresql','redis','mailpit','portainer'].includes(ids[0]!) || !/^\d+$/.test(ids[2]!)) throw new Error("Provide a service, image digest, port and volume when required.");
      const controller = new AbortController(),cancel=()=>controller.abort();process.on('SIGINT',cancel);process.on('SIGTERM',cancel);
      try {const result=await installService({id:ids[0] as 'postgresql'|'redis'|'mailpit'|'portainer',image:ids[1]!,port:Number(ids[2]),volume:ids[0]!=='mailpit'?ids[3]:undefined,portainer:ids[0]==='portainer'?{socketPath:ids[4]!,allowDockerSocket:true}:undefined,postgres:ids[0]==='postgresql'?{passwordFile:ids[4]!,user:ids[5]!,database:ids[6]!}:undefined,smtpPort:ids[0]==='mailpit'&&ids[3]?Number(ids[3]):undefined},target,{confirmed:args.includes('--confirm'),signal:controller.signal});console.log(json?JSON.stringify(result):`Result: ${result.status}`);if(result.status!=='succeeded')process.exitCode=result.status==='cancelled'?130:1;}
      finally{process.off('SIGINT',cancel);process.off('SIGTERM',cancel);}
    } else if (command === 'control-service') {
      if (ids.length !== 2 || !['start','stop','restart'].includes(ids[1]!)) throw new Error("Provide a component and start, stop or restart.");
      const controller = new AbortController(),cancel = () => controller.abort();
      process.on('SIGINT',cancel);process.on('SIGTERM',cancel);
      try { const result = await controlManagedContainer(ids[0]!,ids[1] as 'start'|'stop'|'restart',{confirmed:args.includes('--confirm'),signal:controller.signal});
      console.log(json ? JSON.stringify(result) : `Result: ${result.status}`);if(result.status!=='succeeded')process.exitCode=result.status==='cancelled'?130:1;
      } finally {process.off('SIGINT',cancel);process.off('SIGTERM',cancel);}
    } else if (command === 'write-collector') {
      if (ids.length !== 2) throw new Error("Provide absolute executable and destination paths.");
      const format = target.system === 'darwin' ? 'launchd' : 'systemd';
      await writeCollectorConfig({executable:ids[0]!,stateDirectory:dirname(statePath()),intervalMs:5000,embedded:args.includes('--embedded')},ids[1]!,format,args.includes('--confirm'));
      console.log(json ? JSON.stringify({written:true,activated:false,path:ids[1],format}) : "Configuration written. Activation pending.");
    } else if (command === 'install-runtime') {
      if (ids.length !== 2) throw new Error("Provide a runtime and an explicit version.");
      const controller = new AbortController();
      const cancel = () => controller.abort();
      process.on('SIGINT',cancel); process.on('SIGTERM',cancel);
      try {
        const result = await installRuntime(ids[0]!,ids[1]!,target,{confirmed:args.includes('--confirm'),signal:controller.signal,installDependencies:args.includes('--install-dependencies'),onEvent:args.includes('--events') ? event => console.log(JSON.stringify({type:'event',event})) : undefined});
        console.log(args.includes('--events') ? JSON.stringify({type:'result',result}) : json ? JSON.stringify(result) : `Result: ${result.status}`);
        if (!['succeeded','current'].includes(result.status)) process.exitCode = result.status === 'cancelled' ? 130 : 1;
      } finally { process.off('SIGINT',cancel); process.off('SIGTERM',cancel); }
    } else if (command === 'preview-runtime') {
      if (ids.length !== 2) throw new Error("Provide a runtime and an explicit version.");
      const preview = await runtimePreview(ids[0]!,ids[1]!,target,{allowMissingMise:args.includes('--install-dependencies')});
      console.log(json ? JSON.stringify(preview) : `${preview.runtime}@${preview.version}: ${preview.action}\nNo changes performed.`);
    } else if (command === 'plan-runtime') {
      if (ids.length !== 2) throw new Error("Provide a runtime and an explicit version.");
      const steps = miseInstallSteps(ids[0]!,ids[1]!,target);
      console.log(json ? JSON.stringify({steps,executed:false}) : ["Preview: no changes performed.",...steps.map(step => [step.command,...step.args].join(' '))].join('\n'));
    } else if (command === 'preview-collector') {
      if (ids.length !== 1) throw new Error("Provide the absolute compiled collector path.");
      const config = {executable:ids[0]!,stateDirectory:dirname(statePath()),intervalMs:5000,embedded:args.includes('--embedded')};
      const format = target.system === 'darwin' ? 'launchd' : 'systemd';
      const content = format === 'launchd' ? launchdCollector(config) : systemdCollector(config);
      console.log(json ? JSON.stringify({format,content,installed:false}) : content);
    } else if (command === 'runtimes') {
      if (target.edition !== 'desktop') throw new Error("Runtimes are available in Desktop only.");
      const result = await discoverMise();
      console.log(json ? JSON.stringify(result) : !result.available ? "mise unavailable." : result.installations.length ? result.installations.map(item => `${item.runtime}@${item.version} · ${item.active ? 'active' : 'installed'} · ${item.path}`).join('\n') : "No runtimes found in mise.");
      if (!result.available) process.exitCode = 3;
    } else if (command === 'history-page') {
      if (ids.length > 1) throw new Error("Provide one cursor only.");
      const page = readHistoryPage(ids[0]);
      console.log(json ? JSON.stringify(page) : [...page.operations.map(item => `${item.started_at} · ${item.id} · ${item.status}`), page.nextCursor ? `Next cursor: ${page.nextCursor}` : "End of history."].join('\n'));
    } else if (command === 'doctor') {
      const result = await diagnose(target);
      console.log(json ? JSON.stringify(result) : [`Edition: ${target.edition}`, `Platform: ${target.system}/${target.arch}`, `Docker: ${result.docker.available ? "available" : "unavailable"}`, `mise: ${result.mise === null ? "outside the Server scope" : result.mise.available ? "available" : "unavailable"}`, `Distribution: ${result.linux?.release ? result.linux.release.id + ' ' + result.linux.release.version : "not identified in this query"}`, `Linux support matrix: ${result.linux ? result.linux.supported ? 'planned' : "outside the supported matrix or unavailable" : "not applicable"}`, "Platform validation: pending"].join('\n'));
    } else if (command === 'services') {
      const result = await discoverContainers();
      console.log(json ? JSON.stringify(result) : !result.available ? "Docker unavailable." : result.containers.length ? result.containers.map(item => `${item.name} · ${item.state} · ${item.image}`).join('\n') : "No containers found.");
      if (!result.available) process.exitCode = 3;
    } else if (command === 'metrics') {
      if (ids.length > 1 || (ids[0] && !/^\d+$/.test(ids[0]))) throw new Error("Invalid cursor.");
      const result = readMetrics(ids[0] ? Number(ids[0]) : 0);
      console.log(json ? JSON.stringify(result) : result.samples.length ? result.samples.map(row => `${row.sample.timestamp} · CPU ${row.sample.cpuPercent ?? "unavailable"} · memory ${row.sample.memoryUsed}/${row.sample.memoryTotal}`).join('\n') : "No samples available.");
    } else if (command === 'history') {
      if (ids.length > 1) throw new Error("Provide one operation ID only.");
      if (ids[0]) {
        const operation = readOperation(ids[0]);
        if (!operation) throw new Error("Operation not found.");
        console.log(json ? JSON.stringify(operation) : [operation.id + ' · ' + operation.status, ...operation.steps.map(step => `${step.id} · ${step.status} · exit ${step.exit_code ?? "missing"}`)].join('\n'));
      } else {
      const history = readHistory();
      console.log(json ? JSON.stringify(history) : history.length ? history.map(item => `${item.started_at}  ${item.id}  ${item.status}`).join('\n') : "No recorded operations.");
      }
    } else if (command === 'platform') console.log(JSON.stringify({ ...target, homologated: false }));
    else if (command === 'catalog') {
      const catalog = validateCatalog(embedded).filter(item => item.editions.includes(target.edition) && item.systems.includes(target.system));
      console.log(json ? JSON.stringify(catalog) : catalog.map(item => `${item.id.padEnd(14)} ${item.name}`).join('\n'));
    } else if (command === 'plan') {
      const plan = createPlan(embedded, ids, target);
      console.log(json ? JSON.stringify(plan) : ["Preview: no changes performed.", ...plan.components.map((item, index) => `${index + 1}. ${item.name} (${item.manager})`)].join('\n'));
    } else throw new Error(`Unknown command: ${command}.`);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(json || args.includes('--events') ? JSON.stringify({ error: { code: "INVALID_INPUT", message } }) : message);
  process.exitCode = 2;
}
