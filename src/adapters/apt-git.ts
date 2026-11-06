/** Consulta o pacote Git e produz comandos APT sem modificar repositórios ou perfis. */
import {execFile} from 'node:child_process';
import {existsSync} from 'node:fs';
import type {CommandStep} from '../core/executor';
export interface AptGitState {installed:string|null;candidate:string|null;binary:string|null;}
export function validGitPackageVersion(version:string):boolean{return version==='candidate'||/^[0-9][A-Za-z0-9.+:~_-]{0,127}$/.test(version);}
/** Saída é limitada e consultas usam locale fixo; nenhum stderr externo entra nos resultados. */
function query(executable:string,args:string[],signal?:AbortSignal):Promise<{code:number;output:string}>{
 return new Promise((resolve,reject)=>execFile(executable,args,{timeout:10000,maxBuffer:262144,encoding:'utf8',signal,env:{...process.env,LC_ALL:'C'}},(error,stdout)=>{if(error&&typeof error.code!=='number')return reject(Error('APT Git discovery unavailable.'));resolve({code:error?Number(error.code):0,output:stdout});}));
}
/** Rejeita estados parciais do dpkg; ausência do pacote não é confundida com falha da consulta. */
export async function inspectAptGit(signal?:AbortSignal):Promise<AptGitState>{
 const format=['db:Status-Status','Version'].map(field=>'$'+'{'+field+'}').join('\t')+'\n';
 const installed=await query('/usr/bin/dpkg-query',['--show','--showformat='+format,'git'],signal);
 let version:string|null=null;
 if(installed.code===0){const fields=installed.output.trim().split('\t');if(fields[0]==='installed'&&fields[1]&&validGitPackageVersion(fields[1]))version=fields[1];else if(!['not-installed','config-files'].includes(fields[0]??''))throw Error('Git package requires manual dpkg reconciliation.');}
 else if(installed.code!==1)throw Error('Could not query the Git package.');
 const policy=await query('/usr/bin/apt-cache',['policy','git'],signal);
 if(policy.code!==0)throw Error('Could not query Git package versions.');
 const candidates=[...policy.output.matchAll(/^\s*Candidate:\s*(\S+)\s*$/gm)].map(match=>match[1]!);
 if(candidates.length>1)throw Error('Ambiguous Git package candidate.');
 const candidate=candidates[0]&&candidates[0]!=='(none)'?candidates[0]:null;
 if(candidate&&!validGitPackageVersion(candidate))throw Error('Invalid Git package version.');
 return{installed:version,candidate,binary:Bun.which('git')??(existsSync('/usr/bin/git')?'/usr/bin/git':null)};
}
/** APT recebe ambiente não interativo, assinaturas obrigatórias e preservação de conffiles. */
export function aptGitSteps(version:string|null,sudo:boolean):CommandStep[]{
 const options=['-o','DPkg::Lock::Timeout=60','-o','APT::Get::AllowUnauthenticated=false','-o','Acquire::AllowInsecureRepositories=false','-o','Acquire::AllowDowngradeToInsecureRepositories=false','-o','Dpkg::Use-Pty=0'];
 const command=sudo?'/usr/bin/sudo':'/usr/bin/env',prefix=sudo?['-n','--','/usr/bin/env']:[];
 const environment=['DEBIAN_FRONTEND=noninteractive','LC_ALL=C','/usr/bin/apt-get',...options];
 return[
  {id:'apt-refresh',command,args:[...prefix,...environment,'update']},
  {id:'apt-install-git',command,args:[...prefix,...environment,'-o','Dpkg::Options::=--force-confold','install','--assume-yes','--no-install-recommends','--no-remove','ca-certificates','openssh-client',version?'git='+version:'git']},
 ];
}
/** Privilégio é usado somente para APT, mantendo banco e arquivos do usuário no processo original. */
export async function gitUsesSudo():Promise<boolean>{
 if(process.getuid?.()===0)return false;
 const result=await query('/usr/bin/sudo',['-n','--','/usr/bin/true']).catch(()=>{throw Error('Git installation requires root or non-interactive sudo.');});if(result.code!==0)throw Error('Git installation requires root or non-interactive sudo.');return true;
}
/** Imagens mínimas omitem documentação e traduções; qualquer outra ausência ou alteração é recusada. */
export function gitPackageIntegrityValid(code:number,output:string):boolean{
 if(code!==0&&code!==1||code===1&&!output.trim())return false;
 return output.trim().split('\n').filter(Boolean).every(line=>/^missing\s+\/usr\/share\/(?:lintian\/overrides\/git|doc\/git(?:\/[^\s]+)?|locale(?:\/[^\s]+)?)$/.test(line)&&!line.includes('/../'));
}
/** Confere o pacote esperado e os bytes registrados pelo dpkg antes de registrar sucesso. */
export async function verifyAptGit(version:string,signal?:AbortSignal):Promise<void>{
 const status=await inspectAptGit(signal);if(status.installed!==version)throw Error('Installed Git package does not match the requested version.');
 const integrity=await query('/usr/bin/dpkg',['--verify-format=rpm','--verify','git'],signal);if(!gitPackageIntegrityValid(integrity.code,integrity.output))throw Error('Git package verification failed.');
 const binary=await query('/usr/bin/git',['--version'],signal);if(binary.code!==0||!/^git version \S+/.test(binary.output))throw Error('Git executable verification failed.');
}
