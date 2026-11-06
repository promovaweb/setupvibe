/** Grava configuração de supervisor somente após confirmação e validação do executável. */
import{lstat,access,open,mkdtemp,link,rm}from'node:fs/promises';
import{constants}from'node:fs';
import{isAbsolute,dirname,join}from'node:path';
import{systemdCollector,launchdCollector,type CollectorService}from'./supervisor';
/** Diretório de destino deve existir; criação exclusiva preserva configurações externas. */
export async function writeCollectorConfig(config:CollectorService,destination:string,format:'systemd'|'launchd',confirmed:boolean):Promise<void>{
 if(!confirmed)throw new Error("Explicit confirmation required.");
 if(!isAbsolute(destination))throw new Error('Destination must be absolute.');
 if(!['systemd','launchd'].includes(format))throw new Error("Invalid supervisor format.");
 const content=format==='systemd'?systemdCollector(config):launchdCollector(config);
 const stat=await lstat(config.executable);if(!stat.isFile()||stat.isSymbolicLink())throw new Error("Collector must be a regular executable.");
 await access(config.executable,constants.X_OK);
 const staging=await mkdtemp(join(dirname(destination),'.setupvibe-service-'));
 try{const path=join(staging,'config');const file=await open(path,'wx',0o600);
 try{await file.writeFile(content);await file.sync();}finally{await file.close();}
 await link(path,destination);
 }finally{await rm(staging,{recursive:true,force:true});}
}
