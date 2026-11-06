/** Lê seleções declarativas e ordena recursos pelo catálogo antes de consultar o host. */
import {validDockerPackageVersion} from '../adapters/apt-docker';
import {validGitPackageVersion} from '../adapters/apt-git';
import {readFileSync,statSync} from 'node:fs';
import {createPlan} from './catalog';
import {miseInstallSteps} from '../adapters/mise';
import {planDockerService,type ServiceRequest} from '../adapters/docker-service';
import type {InstallSelection} from './install-selection';
import type {Target} from './platform';
import catalog from '../data/catalog.json';
/** Rejeita campos desconhecidos para que erros de digitação não mudem a operação silenciosamente. */
function record(value:unknown,fields:string[]):Record<string,unknown>{
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!fields.includes(key)))throw Error('Invalid installation manifest fields.');
 return value as Record<string,unknown>;
}
/** O manifesto contém versões fixas e caminhos para credenciais, nunca senhas. */
export function parseInstallManifest(input:unknown,target:Target):InstallSelection[]{
 const root=record(input,['schemaVersion','resources']);
 if(root.schemaVersion!==1||!Array.isArray(root.resources)||!root.resources.length||root.resources.length>100)throw Error('Manifest requires schemaVersion 1 and 1–100 resources.');
 const resources:InstallSelection[]=root.resources.map(raw=>{
  const row=record(raw,['kind','id','version','request']);
  if(typeof row.id!=='string')throw Error('Manifest resource requires an ID.');
  if(row.kind==='service'){
   if(row.version!==undefined)throw Error('Service versions must use image digests.');
   const request=record(row.request,['id','image','port','volume','smtpPort','postgres','portainer']);
   if(request.id!==row.id)throw Error('Service identity mismatch.');
   if(typeof request.image!=='string'||typeof request.port!=='number'||request.volume!==undefined&&typeof request.volume!=='string'||request.smtpPort!==undefined&&typeof request.smtpPort!=='number')throw Error('Invalid service fields.');
   if(request.postgres!==undefined){const config=record(request.postgres,['passwordFile','user','database']);if(['passwordFile','user','database'].some(key=>typeof config[key]!=='string'))throw Error('Invalid PostgreSQL fields.');}
   if(request.portainer!==undefined){const config=record(request.portainer,['socketPath','allowDockerSocket']);if(typeof config.socketPath!=='string'||config.allowDockerSocket!==true)throw Error('Portainer requires explicit Docker socket consent.');}
   planDockerService(request as unknown as ServiceRequest,target,[],[]);
   return{kind:'service',id:row.id,request:request as unknown as ServiceRequest};
  }
  if(row.request!==undefined||typeof row.version!=='string')throw Error('Manifest resource requires a fixed version.');
  if(row.kind==='runtime'){
   miseInstallSteps(row.id,row.version,target);
   return{kind:'runtime',id:row.id,version:row.version};
  }
  if(row.kind==='application'&&row.id==='docker'&&target.system==='linux'&&validDockerPackageVersion(row.version))return{kind:'application',id:'docker',version:row.version};
  if(row.kind==='application'&&row.id==='git'&&target.system==='linux'&&validGitPackageVersion(row.version))return{kind:'application',id:'git',version:row.version};
  if(row.kind==='application'&&['mise','claude','codex','gh','opencode','herdr'].includes(row.id)&&/^\d+\.\d+\.\d+$/.test(row.version))return{kind:'application',id:row.id as 'mise'|'claude'|'codex'|'gh'|'opencode'|'herdr',version:row.version};
  throw Error('Unsupported manifest resource or version.');
 });
 const ids=resources.map(item=>item.id);
 if(new Set(ids).size!==ids.length)throw Error('Duplicate manifest resource.');
 const plan=createPlan(catalog,ids,target);
 return plan.components.flatMap(component=>resources.filter(item=>item.id===component.id));
}
/** Limita o arquivo de entrada; nenhuma configuração ou instalação é gravada pela leitura. */
export function readInstallManifest(path:string,target:Target):InstallSelection[]{
 const stat=statSync(path);
 if(!stat.isFile()||stat.size>1024*1024)throw Error('Manifest must be a file of at most 1 MiB.');
 return parseInstallManifest(JSON.parse(readFileSync(path,'utf8')),target);
}
