/** Instala Docker do repositório da distribuição, sem trocar fontes ou configurações do daemon. */
import {execFile} from 'node:child_process';
import {existsSync} from 'node:fs';
import type {CommandStep} from '../core/executor';
export interface AptDockerState {installed:string|null;candidate:string|null;client:string|null;clientCandidate:string|null;binary:string|null;occupied:boolean;}
export const validDockerPackageVersion=(version:string)=>version==='candidate'||/^[0-9][A-Za-z0-9.+:~_-]{0,127}$/.test(version);
/** Consultas limitadas usam locale fixo e não devolvem stderr de comandos externos. */
async function query(command:string,args:string[],signal?:AbortSignal){
 return new Promise<{code:number;output:string}>((resolve,reject)=>execFile(command,args,{timeout:15000,maxBuffer:262144,encoding:'utf8',signal,env:{...process.env,LC_ALL:'C'}},(error,stdout)=>{if(error&&typeof error.code!=='number')reject(Error('Docker package discovery unavailable.'));else resolve({code:error?Number(error.code):0,output:stdout});}));
}
async function packageState(name:string,signal?:AbortSignal){
 const format=['db:Status-Status','Version'].map(field=>'$'+'{'+field+'}').join('\t')+'\n';
 const result=await query('/usr/bin/dpkg-query',['--show','--showformat='+format,name],signal);let installed:string|null=null;
 if(result.code===0){const [status,version]=result.output.trim().split('\t');if(status==='installed'&&version&&validDockerPackageVersion(version))installed=version;else if(!['not-installed','config-files'].includes(status??''))throw Error('Docker package requires manual dpkg reconciliation.');}else if(result.code!==1)throw Error('Could not query Docker package.');
 const policy=await query('/usr/bin/apt-cache',['policy',name],signal);if(policy.code!==0)throw Error('Could not query Docker package versions.');
 const values=[...policy.output.matchAll(/^\s*Candidate:\s*(\S+)\s*$/gm)].map(match=>match[1]!);if(values.length>1)throw Error('Ambiguous Docker package candidate.');const candidate=values[0]&&values[0]!=='(none)'?values[0]:null;if(candidate&&!validDockerPackageVersion(candidate))throw Error('Invalid Docker package version.');return{installed,candidate};
}
/** Binários, socket, dados ou configuração anteriores impedem adoção automática. */
export async function inspectAptDocker(signal?:AbortSignal):Promise<AptDockerState>{
 const engine=await packageState('docker.io',signal),client=await packageState('docker-cli',signal);
 return{installed:engine.installed,candidate:engine.candidate,client:client.installed,clientCandidate:client.candidate,binary:Bun.which('docker'),occupied:['/var/run/docker.sock','/var/lib/docker','/etc/docker','/etc/containerd','/var/lib/containerd','/usr/sbin/dockerd','/usr/bin/dockerd','/usr/local/bin/dockerd'].some(path=>existsSync(path))};
}
/** Recusa ausência do system manager antes do APT e limita elevação aos comandos administrativos. */
export async function dockerUsesSudo(){const manager=await query('/usr/bin/systemctl',['show','--property=Version','--value']).catch(()=>{throw Error('Docker installation requires an available systemd system manager.');});if(manager.code!==0||!manager.output.trim())throw Error('Docker installation requires an available systemd system manager.');if(process.getuid?.()===0)return false;const result=await query('/usr/bin/sudo',['-n','--','/usr/bin/true']).catch(()=>{throw Error('Docker installation requires root or non-interactive sudo.');});if(result.code!==0)throw Error('Docker installation requires root or non-interactive sudo.');return true;}
/** O cliente é pacote separado no Debian 13; antes dos índices, ele será resolvido após refresh. */
export function aptDockerSteps(version:string|null,clientVersion:string|null,sudo:boolean):CommandStep[]{
 const command=sudo?'/usr/bin/sudo':'/usr/bin/env',prefix=sudo?['-n','--','/usr/bin/env']:[],apt=['DEBIAN_FRONTEND=noninteractive','LC_ALL=C','/usr/bin/apt-get','-o','DPkg::Lock::Timeout=60','-o','APT::Get::AllowUnauthenticated=false','-o','Acquire::AllowInsecureRepositories=false','-o','Acquire::AllowDowngradeToInsecureRepositories=false','-o','Dpkg::Use-Pty=0'];
 return[{id:'apt-refresh',command,args:[...prefix,...apt,'update']},{id:'apt-install-docker',command,args:[...prefix,...apt,'-o','Dpkg::Options::=--force-confold','install','--assume-yes','--no-install-recommends','--no-remove','ca-certificates',...(clientVersion?['docker-cli='+clientVersion]:[]),version?'docker.io='+version:'docker.io']},{id:'enable-docker',command:sudo?'/usr/bin/sudo':'/usr/bin/systemctl',args:[...(sudo?['-n','--','/usr/bin/systemctl']:[]),'enable','--now','docker.service']}];
}
/** Ausências documentais de imagens mínimas são toleradas; bytes alterados nunca são aceitos. */
export function dockerIntegrityValid(code:number,output:string){return(code===0||code===1&&!!output.trim())&&output.trim().split('\n').filter(Boolean).every(line=>/^missing\s+\/usr\/share\/(?:doc|man|lintian)(?:\/[^\s]+)+$/.test(line)&&!line.includes('/../'));}
/** Confere os pacotes, a unidade e o daemon local; não consulta um contexto remoto configurado. */
export async function verifyAptDocker(version:string,clientVersion:string|null,sudo:boolean,signal?:AbortSignal){
 const status=await inspectAptDocker(signal);if(status.installed!==version||clientVersion&&status.client!==clientVersion)throw Error('Installed Docker package does not match the requested version.');
 for(const name of ['docker.io',...(clientVersion?['docker-cli']:[])]){const result=await query('/usr/bin/dpkg',['--verify-format=rpm','--verify',name],signal);if(!dockerIntegrityValid(result.code,result.output))throw Error('Docker package verification failed.');}
 for(const args of [['is-active','docker.service'],['is-enabled','docker.service']]){const result=await query('/usr/bin/systemctl',args,signal);if(result.code!==0||!['active','enabled'].includes(result.output.trim()))throw Error('Docker service is not active and enabled.');}
 const args=['--host','unix:///var/run/docker.sock','info','--format','{{json .}}'];const result=await query(sudo?'/usr/bin/sudo':'/usr/bin/docker',sudo?['-n','--','/usr/bin/docker',...args]:args,signal);
 let info;try{info=JSON.parse(result.output);}catch{throw Error('Docker local daemon verification failed.');}if(result.code!==0||typeof info?.ID!=='string'||!info.ID||typeof info.ServerVersion!=='string')throw Error('Docker local daemon verification failed.');
}
