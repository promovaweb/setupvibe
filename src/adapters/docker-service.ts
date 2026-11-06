/** Planeja serviços Docker sem executar comandos ou assumir recursos existentes. */
import type { CommandStep } from '../core/executor';
import { validateTarget, type Target } from '../core/platform';
export interface ServiceRequest {id:'postgresql'|'redis'|'mailpit'|'portainer';image:string;port:number;volume?:string;smtpPort?:number;postgres?:{passwordFile:string;user:string;database:string};portainer?:{socketPath:string;allowDockerSocket:boolean};}
const services={postgresql:{port:5432,path:'/var/lib/postgresql'},redis:{port:6379,path:'/data'},mailpit:{port:8025,path:null},portainer:{port:9443,path:'/data'}};
/** Exige imagem por digest e publicação loopback; segredos não entram nos argumentos. */
export function planDockerService(request:ServiceRequest,target:Target,existingNames:string[],occupiedPorts:number[]):CommandStep {
  validateTarget(target);
  if(target.edition!=='desktop'&&request.id!=='portainer')throw new Error("Service available in Desktop only.");
  const spec=services[request.id];if(!spec)throw new Error("Unknown service.");
  if(!/^[a-z0-9][a-z0-9./:_-]*@sha256:[a-f0-9]{64}$/.test(request.image))throw new Error("Image requires an explicit SHA-256 digest.");
  const repository=request.id==='portainer'?'portainer/portainer-ce':request.id==='postgresql'?'postgres':request.id==='redis'?'redis':'axllent/mailpit';
  if(!request.image.startsWith(repository+'@sha256:'))throw new Error("Service image is outside the catalog.");
  if(!Number.isInteger(request.port)||request.port<1024||request.port>65535)throw new Error("Invalid local port.");
  const name=`setupvibe-${request.id}`;
  if(existingNames.includes(name))throw new Error("Container name already exists; verify ownership before continuing.");
  if(occupiedPorts.includes(request.port))throw new Error("Port is in use.");
  const args=['create','--name',name,'--label','dev.setupvibe.managed=true','--restart','unless-stopped','--publish',`127.0.0.1:${request.port}:${spec.port}`];
  if(request.id==='mailpit'){const smtp=request.smtpPort??1025;if(!Number.isInteger(smtp)||smtp<1024||smtp>65535||smtp===request.port)throw new Error("Invalid SMTP port.");if(occupiedPorts.includes(smtp))throw new Error("SMTP port is in use.");args.push('--publish',`127.0.0.1:${smtp}:1025`);}
  if(spec.path){if(!request.volume||!/^setupvibe-[a-z0-9-]+$/.test(request.volume))throw new Error("A managed volume is required.");args.push('--mount',`type=volume,source=${request.volume},target=${spec.path}`);}
  if(request.id==='portainer'){
    const config=request.portainer;
    if(!config?.allowDockerSocket)throw new Error("Portainer requires explicit consent for Docker socket access.");
    if(!/^\/[a-zA-Z0-9/_. -]+$/.test(config.socketPath))throw new Error("Invalid Docker socket path.");
    args.push('--mount',`type=bind,source=${config.socketPath},target=/var/run/docker.sock`);
  }
  if(request.id==='postgresql'){
    const config=request.postgres;
    if(!config)throw new Error("PostgreSQL requires protected credentials.");
    if(!/^\/[a-zA-Z0-9/_. -]+$/.test(config.passwordFile))throw new Error("Invalid credentials path.");
    if(!/^[a-z_][a-z0-9_]{0,62}$/.test(config.user)||! /^[a-z_][a-z0-9_]{0,62}$/.test(config.database))throw new Error("Invalid PostgreSQL user or database.");
    args.push('--mount',`type=bind,source=${config.passwordFile},target=/run/secrets/postgres-password,readonly`,
      '--env','POSTGRES_PASSWORD_FILE=/run/secrets/postgres-password',
      '--env',`POSTGRES_USER=${config.user}`,'--env',`POSTGRES_DB=${config.database}`,
      '--env','PGDATA=/var/lib/postgresql/setupvibe',
      '--env','POSTGRES_INITDB_ARGS=--auth-host=scram-sha-256 --auth-local=trust',
      '--env','POSTGRES_HOST_AUTH_METHOD=scram-sha-256');
  }
  args.push(request.image);
  return {id:`create-${request.id}`,command:'docker',args};
}

/** Combina descoberta Docker e bind local antes de produzir a prévia do serviço. */
export async function previewDockerService(request:ServiceRequest,target:Target,options:{allowMissingDocker?:boolean}={}){
 const{discoverContainers}=await import('../core/docker');const{checkLocalPort}=await import('../core/ports');
 // Valida entrada antes de abrir socket ou consultar o daemon.
 planDockerService(request,target,[],[]);
 const discovery=await discoverContainers();if(!discovery.available&&!options.allowMissingDocker)throw new Error("Docker unavailable; conflicts could not be checked.");
 const ports=[request.port,...(request.id==='mailpit'?[request.smtpPort??1025]:[])];
 const availability=await Promise.all(ports.map(port=>checkLocalPort(port)));
 return{step:planDockerService(request,target,discovery.containers.map(item=>item.name),ports.filter((_port,index)=>!availability[index])),executed:false,...(!discovery.available?{action:'awaiting-docker' as const,dependencies:[{id:'docker',version:'candidate'}]}:{})};
}
