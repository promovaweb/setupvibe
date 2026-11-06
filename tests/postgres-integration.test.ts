/** Integração opt-in: cria PostgreSQL descartável e remove somente recursos registrados pelo teste. */
import {expect,test} from 'bun:test';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:net';
import {installService} from '../src/core/install-service';
import {controlManagedContainer} from '../src/core/container-operation';
import {StateStore} from '../src/core/state';
const enabled=process.env.SETUPVIBE_DOCKER_INTEGRATION==='1';
(enabled?test:test.skip)("PostgreSQL real autentica e preserva dados após restart",async()=>{
  const docker=(args:string[],input?:string)=>execFileSync('docker',args,{encoding:'utf8',timeout:30000,input,stdio:['pipe','pipe','pipe']});
  const image=process.env.SETUPVIBE_POSTGRES_IMAGE;
  if(!image||!/^postgres@sha256:[a-f0-9]{64}$/.test(image))throw Error('Informe SETUPVIBE_POSTGRES_IMAGE por digest.');
  const names=docker(['ps','-a','--format','{{.Names}}']).trim().split('\n');
  if(names.includes('setupvibe-postgresql'))throw Error('Container setupvibe-postgresql existente; teste recusado.');
  const port=await new Promise<number>((resolve,reject)=>{const server=createServer();server.on('error',reject);server.listen(0,'127.0.0.1',()=>{const address=server.address();if(!address||typeof address==='string')return reject(Error("Porta unavailable"));server.close(()=>resolve(address.port));});});
  const dir=mkdtempSync(join(homedir(),'setupvibe-pg-test-')),path=join(dir,'state.db'),passwordFile=join(dir,'password');
  const password=crypto.randomUUID(),volume='setupvibe-pg-test-'+crypto.randomUUID();let container:string|null=null,registeredVolume=false;
  try{
    writeFileSync(passwordFile,password,{mode:0o600});
    const result=await installService({id:'postgresql',image,port,volume,postgres:{passwordFile,user:'dev',database:'app'}},{edition:'desktop',system:'linux',arch:'x64'},{confirmed:true,path});
    expect(result.status).toBe('succeeded');
    const store=new StateStore(path);try{container=store.managed('postgresql')!.location.slice('/docker/'.length);registeredVolume=store.managed('postgresql-volume')?.location==='/docker-volume/'+volume;}finally{store.close();}
    expect(registeredVolume).toBe(true);
    expect((await controlManagedContainer('postgresql','start',{confirmed:true,path})).status).toBe('succeeded');
    // A inicialização usa um servidor temporário por socket antes de abrir TCP.
    const ready=async()=>{for(let attempt=0;attempt<60;attempt++){try{docker(['exec',container!,'pg_isready','-h','127.0.0.1','-U','dev','-d','app']);return;}catch{await Bun.sleep(500);}}throw Error("PostgreSQL não ficou available.");};
    await ready();
    const query=(sql:string)=>docker(['exec','-i',container!,'psql','--host','127.0.0.1','--username','dev','--dbname','app','--password','--tuples-only','--no-align','--command',sql],password+'\n').trim();
    expect(query('SELECT 42')).toBe('42');
    expect(()=>docker(['exec','-i',container!,'psql','--host','127.0.0.1','--username','dev','--dbname','app','--password','--command','SELECT 42'],'senha-incorreta\n')).toThrow();
    query('CREATE TABLE prova (valor integer); INSERT INTO prova VALUES (73);');
    expect((await controlManagedContainer('postgresql','restart',{confirmed:true,path})).status).toBe('succeeded');
    await ready();expect(query('SELECT valor FROM prova')).toBe('73');
  }finally{
    if(container)docker(['rm','--force',container]);
    if(registeredVolume)docker(['volume','rm',volume]);
    rmSync(dir,{recursive:true,force:true});
  }
},90000);
