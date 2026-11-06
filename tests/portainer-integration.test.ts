/** Integração opt-in com Portainer descartável e proxy Docker restrito a consultas. */
import {expect,test} from 'bun:test';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {createServer,request as httpRequest} from 'node:http';
import {request as httpsRequest} from 'node:https';
import {createServer as netServer} from 'node:net';
import {installService} from '../src/core/install-service';
import {controlManagedContainer} from '../src/core/container-operation';
import {StateStore} from '../src/core/state';
import {uninstallResource} from '../src/core/uninstall-resource';
const enabled=process.env.SETUPVIBE_PORTAINER_INTEGRATION==='1';
(enabled?test:test.skip)("Portainer real responde HTTPS e mantém identidade após restart",async()=>{
  const docker=(args:string[])=>execFileSync('docker',args,{encoding:'utf8',timeout:30000,stdio:['pipe','pipe','pipe']});
  const image=process.env.SETUPVIBE_PORTAINER_IMAGE;
  if(!image||!/^portainer\/portainer-ce@sha256:[a-f0-9]{64}$/.test(image))throw Error('Informe SETUPVIBE_PORTAINER_IMAGE por digest.');
  if(docker(['ps','-a','--format','{{.Names}}']).split('\n').includes('setupvibe-portainer'))throw Error('Container setupvibe-portainer existente; teste recusado.');
  const port=await new Promise<number>((resolve,reject)=>{const server=netServer();server.on('error',reject);server.listen(0,'127.0.0.1',()=>{const address=server.address();if(!address||typeof address==='string')return reject(Error("Porta unavailable"));server.close(()=>resolve(address.port));});});
  const dir=mkdtempSync(join(homedir(),'setupvibe-portainer-test-')),path=join(dir,'state.db'),socket=join(dir,'docker.sock');
  const volume='setupvibe-portainer-test-'+crypto.randomUUID();let container:string|null=null,registeredVolume=false;
  // Nem métodos de escrita, nem upgrades de conexão chegam ao daemon do host.
  const proxy=createServer((req,res)=>{
    if(req.method!=='GET'&&req.method!=='HEAD'||!/^\/(?:v\d+\.\d+\/)?(?:_ping|version|info)$/.test(req.url??'')){res.writeHead(403);res.end('Consulta não permitida pelo teste.');return;}
    const upstream=httpRequest({socketPath:'/var/run/docker.sock',path:req.url,method:req.method},response=>{res.writeHead(response.statusCode??502,response.headers);response.pipe(res);});
    upstream.on('error',()=>{res.writeHead(502);res.end();});req.pipe(upstream);
  });proxy.on('upgrade',(_req,connection)=>connection.destroy());
  await new Promise<void>((resolve,reject)=>{proxy.once('error',reject);proxy.listen(socket,resolve);});
  const status=()=>new Promise<{Version:string;InstanceID:string}>((resolve,reject)=>{
    const req=httpsRequest({hostname:'127.0.0.1',port,path:'/api/status',rejectUnauthorized:false,timeout:2000},response=>{let text='';response.on('data',chunk=>{text+=chunk;if(text.length>65536)req.destroy(Error('Resposta excessiva'));});response.on('end',()=>{try{if(response.statusCode!==200)throw Error("HTTPS unavailable");resolve(JSON.parse(text));}catch(error){reject(error);}});});req.on('error',reject);req.on('timeout',()=>req.destroy(Error('Timeout HTTPS')));req.end();
  });
  const ready=async()=>{for(let attempt=0;attempt<40;attempt++){try{return await status();}catch{await Bun.sleep(500);}}throw Error("Portainer não ficou available.");};
  try{
    const refused=await new Promise<number>((resolve,reject)=>{const req=httpRequest({socketPath:socket,path:'/containers/create',method:'POST'},res=>{res.resume();resolve(res.statusCode!);});req.on('error',reject);req.end();});expect(refused).toBe(403);
    const request={id:'portainer' as const,image,port,volume,portainer:{socketPath:socket,allowDockerSocket:true}};
    const result=await installService(request,{edition:'server',system:'linux',arch:'x64'},{confirmed:true,path});expect(result.status).toBe('succeeded');
    const store=new StateStore(path);try{container=store.managed('portainer')!.location.slice('/docker/'.length);registeredVolume=store.managed('portainer-volume')?.location==='/docker-volume/'+volume;}finally{store.close();}
    expect(registeredVolume).toBe(true);expect((await controlManagedContainer('portainer','start',{confirmed:true,path})).status).toBe('succeeded');
    const before=await ready();expect(typeof before.Version).toBe('string');expect(before.InstanceID.length).toBeGreaterThan(0);
    expect((await controlManagedContainer('portainer','restart',{confirmed:true,path})).status).toBe('succeeded');expect((await ready()).InstanceID).toBe(before.InstanceID);
    expect((await uninstallResource('portainer',{edition:'server',system:'linux',arch:'x64'},{confirmed:true,path})).status).toBe('succeeded');container=null;
    expect(docker(['volume','inspect',volume,'--format','{{.Name}}']).trim()).toBe(volume);
    const after=new StateStore(path);try{expect(after.managed('portainer')).toBeNull();expect(after.managed('portainer-volume')).not.toBeNull();}finally{after.close();}
    expect((await installService(request,{edition:'server',system:'linux',arch:'x64'},{confirmed:true,path})).status).toBe('succeeded');
    const reinstalled=new StateStore(path);try{container=reinstalled.managed('portainer')!.location.slice('/docker/'.length);expect(reinstalled.managed('portainer-volume')?.operation_id).toBe(result.id);}finally{reinstalled.close();}
    expect((await controlManagedContainer('portainer','start',{confirmed:true,path})).status).toBe('succeeded');expect((await ready()).InstanceID).toBe(before.InstanceID);
  }finally{
    if(container)docker(['rm','--force',container]);if(registeredVolume)docker(['volume','rm',volume]);
    proxy.closeAllConnections();await new Promise<void>(resolve=>proxy.close(()=>resolve()));rmSync(dir,{recursive:true,force:true});
  }
},90000);
