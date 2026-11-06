/** Homologa executáveis compilados num user manager real em Debian descartável. */
import {expect,test} from 'bun:test';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {existsSync} from 'node:fs';
(process.env.SETUPVIBE_SYSTEMD_INTEGRATION==='1'?test:test.skip).each([false,true])('coletor real inicia por systemd e preserva métricas (embutido: %s)',async(embedded)=>{
 const image=process.env.SETUPVIBE_SYSTEMD_IMAGE;
 if(!image)throw Error('Informe SETUPVIBE_SYSTEMD_IMAGE com a imagem de teste construída.');
 for(const name of ['setupvibe','setupvibe-collector'])if(!existsSync(join(import.meta.dir,'../dist',name)))throw Error('Compile CLI e coletor antes do teste.');
 const docker=(args:string[])=>execFileSync('docker',args,{encoding:'utf8',timeout:30000,stdio:['pipe','pipe','pipe']}).trim();
 const name='setupvibe-systemd-test-'+crypto.randomUUID();let container:string|null=null;
 try{
  container=docker(['run','--detach','--privileged','--cgroupns','private','--network','none','--tmpfs','/run','--tmpfs','/run/lock','--label','dev.setupvibe.test=systemd','--name',name,image]);
  const root=(args:string[])=>docker(['exec',container!,...args]);
  let ready=false;
  for(let attempt=0;attempt<60;attempt++){try{root(['systemctl','show','--property=Version']);ready=true;break;}catch{await Bun.sleep(500);}}
  if(!ready)throw Error('systemd do container não ficou disponível.');
  root(['systemctl','start','user@1000.service']);
  for(const binary of embedded?['setupvibe']:['setupvibe','setupvibe-collector'])docker(['cp',join(import.meta.dir,'../dist',binary),container+':/usr/local/bin/'+binary]);
  const user=(args:string[])=>docker(['exec','--user','1000:1000','--env','HOME=/home/tester','--env','XDG_RUNTIME_DIR=/run/user/1000','--env','DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus',container!,...args]);
  const cli=(args:string[])=>JSON.parse(user(['/usr/local/bin/setupvibe',...args,...(embedded&&['install-collector','preview-install-collector','write-collector','activate-collector','stop-collector'].includes(args[0]!)?['--embedded']:[]),'--json']));
  expect(cli(['collector-status']).load).toBe('not-found');
  const unit='/home/tester/.config/systemd/user/setupvibe-collector.service',collector=embedded?'/usr/local/bin/setupvibe':'/usr/local/bin/setupvibe-collector';
  expect(cli(['preview-install-collector',collector]).existing).toBe(false);
  user(['test','!','-e','/home/tester/.config/systemd/user']);
  expect(cli(['install-collector',collector,'--confirm']).status).toBe('succeeded');
  expect(cli(['install-collector',collector,'--confirm']).configurationOperationId).toBeNull();
  const active=cli(['collector-status']);expect(active.active).toBe('active');expect(active.enabled).toBe('enabled');expect(active.fragment).toBe(unit);
  let samples:{samples:{id:number}[];nextCursor:number}={samples:[],nextCursor:0};
  for(let attempt=0;attempt<30;attempt++){samples=cli(['metrics']);if(samples.samples.length)break;await Bun.sleep(500);}
  expect(samples.samples.length).toBeGreaterThan(0);
  const pid=Number(user(['systemctl','--user','show','setupvibe-collector.service','--property=MainPID','--value']));
  expect(Number.isSafeInteger(pid)&&pid>1).toBe(true);
  user(['systemctl','--user','kill','--kill-whom=main','--signal=SIGKILL','setupvibe-collector.service']);
  let restarted=false;
  for(let attempt=0;attempt<40;attempt++){
   const nextPid=Number(user(['systemctl','--user','show','setupvibe-collector.service','--property=MainPID','--value']));
   if(nextPid>1&&nextPid!==pid&&cli(['metrics']).nextCursor>samples.nextCursor){restarted=true;break;}
   await Bun.sleep(500);
  }
  expect(restarted).toBe(true);
  expect(cli(['stop-collector',collector,'--confirm']).status).toBe('succeeded');expect(cli(['collector-status']).active).toBe('inactive');
  const stopped=cli(['metrics']);expect(stopped.samples.length).toBeGreaterThanOrEqual(samples.samples.length);
  await Bun.sleep(1100);expect(cli(['metrics']).nextCursor).toBe(stopped.nextCursor);
  expect(cli(['activate-collector',collector,'--confirm']).status).toBe('succeeded');expect(cli(['stop-collector',collector,'--confirm']).status).toBe('succeeded');
 }finally{if(container)docker(['rm','--force','--volumes',container]);}
},120000);
