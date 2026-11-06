/** Verifica o contrato do executável real sem realizar instalações. */
import { expect, test } from 'bun:test';
const cli = (args: string[]) => Bun.spawnSync([process.execPath, 'src/cli.ts', ...args], { cwd: import.meta.dir + '/..' });
test('atualização e rollback exigem confirmação antes de consultar instalação ou rede',()=>{
 for(const args of [['update','2.0.1','/not-installed','--json'],['rollback','/not-installed','--json'],['activate-release','2.0.1','a'.repeat(64),'/not-installed','--json']]){const result=cli(args);expect(result.exitCode).toBe(2);expect(JSON.parse(result.stderr.toString()).error.message).toBe('Explicit confirmation required.');}
 expect(cli(['--help']).stdout.toString()).toContain('preview-update');
});
test('alteração de PATH exige confirmação antes de acessar perfis',()=>{
 for(const command of ['install-path','remove-path']){const result=cli([command,'/not-a-real-directory','bash','--json']);expect(result.exitCode).toBe(2);expect(JSON.parse(result.stderr.toString()).error.message).toBe('Explicit confirmation required.');}
 const help=cli(['--help']).stdout.toString();expect(help).toContain('preview-path');expect(help).toContain('preview-remove-path');
});
test('edição Server funciona antes do comando e junto à consulta de versão',()=>{
 const before=cli(['--server','catalog','--json']),after=cli(['catalog','--server','--json']);expect(before.exitCode).toBe(0);expect(before.stdout.toString()).toBe(after.stdout.toString());expect(cli(['--version','--server']).exitCode).toBe(0);
});
test('CLI publica comandos e opções em inglês e exige confirmação para remover',()=>{
 const help=cli(['--help']).stdout.toString();for(const value of ['install-runtime','--install-dependencies','--confirm','--events','preview-uninstall','uninstall'])expect(help).toContain(value);
 for(const value of ['--confirmar','--instalar-dependencias','runtime-instalar'])expect(help).not.toContain(value);
 const refused=cli(['uninstall','redis','--json']);expect(refused.exitCode).toBe(2);expect(JSON.parse(refused.stderr.toString()).error.message).toBe('Explicit confirmation required.');
});
test('prévia JSON inclui mise antes de Node.js', () => {
  const result = cli(['plan', 'node', '--json']);
  expect(result.exitCode).toBe(0);
  expect(JSON.parse(result.stdout.toString()).components.map((item: {id:string}) => item.id)).toEqual(['mise', 'node']);
});
test('Server apresenta somente os seis componentes comuns', () => {
  const result = cli(['catalog', '--server', '--json']);
  expect(result.exitCode).toBe(0);
  expect(JSON.parse(result.stdout.toString()).map((item: {id:string}) => item.id).sort()).toEqual(["collector",'docker','gh','git','portainer','tailscale']);
});
test('recusa seleção Desktop no Server e opções incorretas', () => {
  for(const args of [['plan','node','--server','--json'],['catalog','--incorreto','--json'],['inexistente','--json']]) {
    const result = cli(args);
    expect(result.exitCode).toBe(2);
    expect(JSON.parse(result.stderr.toString()).error.code).toBe("INVALID_INPUT");
  }
});
test('serviços sem Docker retornam indisponibilidade estruturada',()=>{
 const result=Bun.spawnSync([process.execPath,'src/cli.ts','services','--json'],{cwd:import.meta.dir+'/..',env:{...process.env,PATH:'/nonexistent/setupvibe-bin'}});
 expect(result.exitCode).toBe(3);expect(JSON.parse(result.stdout.toString())).toEqual({available:false,containers:[]});
});
test("diagnóstico Server não read only runtimes e mantém indisponibilidade explícita",()=>{
 const result=Bun.spawnSync([process.execPath,'src/cli.ts','doctor','--server','--json'],{cwd:import.meta.dir+'/..',env:{...process.env,PATH:'/nonexistent/setupvibe-bin'}});
 expect(result.exitCode).toBe(0);const data=JSON.parse(result.stdout.toString());expect(data.mise).toBeNull();expect(data.docker.available).toBe(false);expect(data.homologated).toBe(false);
});
test("read only de runtimes diferencia mise missing de edição incompatible",()=>{
 const run=(args:string[])=>Bun.spawnSync([process.execPath,'src/cli.ts','runtimes',...args,'--json'],{cwd:import.meta.dir+'/..',env:{...process.env,PATH:'/nonexistent/setupvibe-bin'}});
 const result=run([]);expect(result.exitCode).toBe(3);expect(JSON.parse(result.stdout.toString())).toEqual({available:false,installations:[]});expect(run(['--server']).exitCode).toBe(2);
});
test('prévia de supervisão não instala serviço e exige caminho absoluto',()=>{
 const run=(path:string)=>Bun.spawnSync([process.execPath,'src/cli.ts','preview-collector',path,'--json'],{cwd:import.meta.dir+'/..'});
 const result=run('/opt/setupvibe/collector');expect(result.exitCode).toBe(0);const data=JSON.parse(result.stdout.toString());expect(data.installed).toBe(false);expect(data.content).toContain('/opt/setupvibe/collector');expect(run('relative').exitCode).toBe(2);
});
test("prévia de runtime exige version fixa e não executa mise",()=>{
 const run=(args:string[])=>Bun.spawnSync([process.execPath,'src/cli.ts','plan-runtime',...args,'--json'],{cwd:import.meta.dir+'/..',env:{...process.env,PATH:'/nonexistent/setupvibe-bin'}});
 const result=run(['node','24.1.0']);expect(result.exitCode).toBe(0);expect(JSON.parse(result.stdout.toString())).toEqual({steps:[{id:'mise-install-node',command:'mise',args:['install','node@24.1.0']}],executed:false});expect(run(['node','latest']).exitCode).toBe(2);expect(run(['node','24.1.0','--server']).exitCode).toBe(2);
});
test("version do executável acompanha manifest do produto",async()=>{
 const manifest=await import('../package.json');const result=cli(['--version']);expect(result.exitCode).toBe(0);expect(result.stdout.toString().trim()).toBe(manifest.default.version);
});
test("instalar runtime exige confirmação antes de read onlyr mise",()=>{
 const result=cli(['install-runtime','node','24.1.0','--json']);expect(result.exitCode).toBe(2);expect(JSON.parse(result.stderr.toString()).error.message).toContain("confirmation");
});
test('modo eventos mantém erro estruturado sem confirmação',()=>{const result=cli(['install-runtime','node','24.1.0','--events']);expect(result.exitCode).toBe(2);expect(JSON.parse(result.stderr.toString()).error.message).toContain("confirmation");expect(result.stdout.toString()).toBe('');});
test('gravação de supervisor exige confirmação antes de acessar destino',()=>{const result=cli(['write-collector','/missing/collector','/missing/config','--json']);expect(result.exitCode).toBe(2);expect(JSON.parse(result.stderr.toString()).error.message).toContain("confirmation");});
test('controle de serviço exige confirmação e ação conhecida',()=>{
 const result=cli(['control-service','redis','stop','--json']);expect(result.exitCode).toBe(2);expect(JSON.parse(result.stderr.toString()).error.message).toContain("confirmation");expect(cli(['control-service','redis','remove','--confirm','--json']).exitCode).toBe(2);
});
test('criação de serviço exige confirmação antes de Docker e valida porta',()=>{
 const result=cli(['create-service','mailpit','axllent/mailpit@sha256:'+'a'.repeat(64),'8025','--json']);expect(result.exitCode).toBe(2);expect(JSON.parse(result.stderr.toString()).error.message).toContain("confirmation");expect(cli(['create-service','redis','redis@sha256:'+'a'.repeat(64),'bad','--confirm','--json']).exitCode).toBe(2);
});

test('CLI instala manifesto somente com confirmação e prévia não cria estado',async()=>{
 const {mkdtempSync,writeFileSync,rmSync,existsSync}=await import('node:fs');
 const {homedir}=await import('node:os');const {join}=await import('node:path');
 const dir=mkdtempSync(join(homedir(),'setupvibe-manifest-cli-'));
 try{
  const manifest=join(dir,'install.json');writeFileSync(manifest,JSON.stringify({schemaVersion:1,resources:[{kind:'runtime',id:'bun',version:'1.3.14'}]}));
  const env={...process.env,PATH:'/nonexistent/setupvibe-bin',XDG_STATE_HOME:join(dir,'state')};
  const run=(args:string[])=>Bun.spawnSync([process.execPath,'src/cli.ts',...args,'--json'],{cwd:import.meta.dir+'/..',env});
  const refused=run(['install',manifest]);expect(refused.exitCode).toBe(2);expect(JSON.parse(refused.stderr.toString()).error.message).toContain('confirmation');
  const preview=run(['preview-install',manifest,'--install-dependencies']);expect(preview.exitCode).toBe(0);
  const result=JSON.parse(preview.stdout.toString());expect(result.status).toBe('previewed');expect(result.executed).toBe(false);expect(result.previews[0].preview.action).toBe('awaiting-manager');expect(result.items.map((item:{id:string})=>item.id)).toEqual(['bun']);
  expect(existsSync(join(dir,'state'))).toBe(false);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('controle do coletor exige confirmação antes de acessar arquivo ou systemctl',()=>{
 for(const command of ['activate-collector','stop-collector']){
  const result=cli([command,'/missing/collector','--json']);expect(result.exitCode).toBe(2);expect(JSON.parse(result.stderr.toString()).error.message).toContain('confirmation');
 }
});

test('modo --collector grava métricas sem TUI e encerra por SIGTERM',async()=>{
 const {mkdtempSync,rmSync,existsSync}=await import('node:fs');const {homedir}=await import('node:os');const {join}=await import('node:path');const {MetricsStore}=await import('../src/core/metrics-store');
 const dir=mkdtempSync(join(homedir(),'setupvibe-embedded-collector-'));
 const child=Bun.spawn([process.execPath,'src/cli.ts','--collector','100'],{cwd:import.meta.dir+'/..',env:{...process.env,SETUPVIBE_STATE_DIR:dir,PATH:'/nonexistent/setupvibe-bin'},stdout:'pipe',stderr:'pipe'});
 try{
  const path=join(dir,'metrics.db');for(let attempt=0;attempt<40&&!existsSync(path);attempt++)await Bun.sleep(50);expect(existsSync(path)).toBe(true);await Bun.sleep(150);child.kill('SIGTERM');expect(await child.exited).toBe(0);
  expect(await new Response(child.stdout).text()).toBe('');expect(await new Response(child.stderr).text()).toBe('');
  const store=new MetricsStore(path);try{expect(store.list().length).toBeGreaterThan(1);}finally{store.close();}
 }finally{if(child.exitCode===null){child.kill('SIGKILL');await child.exited;}rmSync(dir,{recursive:true,force:true});}
});

test('instalação do coletor exige confirmação antes de ler o executável',()=>{
 const result=cli(['install-collector','/missing/collector','--embedded','--json']);expect(result.exitCode).toBe(2);expect(JSON.parse(result.stderr.toString()).error.message).toContain('confirmation');
});

test('instalação por manifesto aceita --events e mantém erro estruturado antes de confirmar',()=>{
 const result=cli(['install','/missing/manifest.json','--events']);expect(result.exitCode).toBe(2);expect(result.stdout.toString()).toBe('');expect(JSON.parse(result.stderr.toString()).error.message).toContain('confirmation');
});

test('NDJSON do manifesto emite resultado sem início de recurso quando prévia falha',async()=>{
 const {mkdtempSync,writeFileSync,rmSync,existsSync}=await import('node:fs');const {homedir}=await import('node:os');const {join}=await import('node:path');const dir=mkdtempSync(join(homedir(),'setupvibe-manifest-events-'));
 try{
  const manifest=join(dir,'install.json'),state=join(dir,'state');writeFileSync(manifest,JSON.stringify({schemaVersion:1,resources:[{kind:'runtime',id:'bun',version:'1.3.14'}]}));
  const result=Bun.spawnSync([process.execPath,'src/cli.ts','install',manifest,'--confirm','--events'],{cwd:import.meta.dir+'/..',env:{...process.env,SETUPVIBE_STATE_DIR:state,PATH:'/nonexistent/setupvibe-bin'}});
  expect(result.exitCode).toBe(1);expect(result.stderr.toString()).toBe('');const events=result.stdout.toString().trim().split('\n').map(line=>JSON.parse(line));expect(events.map(event=>event.type)).toEqual(['result']);expect(events[0].result.status).toBe('failed');expect(existsSync(state)).toBe(false);
 }finally{rmSync(dir,{recursive:true,force:true});}
});


test('platform e doctor publicam contrato em inglês',()=>{
 const platform=JSON.parse(cli(['platform','--json']).stdout.toString());
 expect(platform.homologated).toBe(false);expect(platform).not.toHaveProperty('homologada');
 const doctor=Bun.spawnSync([process.execPath,'src/cli.ts','doctor'],{cwd:import.meta.dir+'/..',env:{...process.env,PATH:'/nonexistent/setupvibe-bin'}});
 expect(doctor.exitCode).toBe(0);const output=doctor.stdout.toString();expect(output).toContain('Platform:');expect(output).toContain('Linux support matrix:');expect(output).not.toContain('Plataforma:');expect(output).not.toContain('Matriz Linux:');
});
test('listagem de runtimes usa active e installed e erro de caminho usa inglês',async()=>{
 const {mkdtempSync,writeFileSync,rmSync}=await import('node:fs');const {homedir}=await import('node:os');const {join}=await import('node:path');
 const dir=mkdtempSync(join(homedir(),'setupvibe-english-runtimes-'));
 try{
  const data={node:[{version:'24.1.0',install_path:'/managed/node',installed:true,active:true}],bun:[{version:'1.3.14',install_path:'/managed/bun',installed:true,active:false}]};
  writeFileSync(join(dir,'mise'),'#!'+process.execPath+'\nconsole.log('+JSON.stringify(JSON.stringify(data))+');\n',{mode:0o700});
  const result=Bun.spawnSync([process.execPath,'src/cli.ts','runtimes'],{cwd:import.meta.dir+'/..',env:{...process.env,PATH:dir,SETUPVIBE_STATE_DIR:join(dir,'state')}});
  expect(result.exitCode).toBe(0);expect(result.stdout.toString()).toContain('node@24.1.0 · active');expect(result.stdout.toString()).toContain('bun@1.3.14 · installed');
  const invalid=Bun.spawnSync([process.execPath,'src/cli.ts','history','--json'],{cwd:import.meta.dir+'/..',env:{...process.env,SETUPVIBE_STATE_DIR:'relative'}});
  expect(invalid.exitCode).toBe(2);expect(JSON.parse(invalid.stderr.toString()).error.message).toBe('SETUPVIBE_STATE_DIR must be absolute.');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
