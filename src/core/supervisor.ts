/** Gera configuração de supervisão sem escrever em diretórios de serviços. */
import{isAbsolute}from'node:path';
/** embedded acrescenta --collector ao executável principal; ausente mantém a entrada dedicada. */
export interface CollectorService {executable:string;stateDirectory:string;intervalMs:number;embedded?:boolean;}
/** Escapa os especificadores systemd e recusa controles para evitar novas diretivas. */
function quote(value:string):string{
 if(!isAbsolute(value)||/[\x00-\x1f\x7f]/.test(value))throw new Error("A valid absolute path is required.");
 return '"'+value.replaceAll('\\','\\\\').replaceAll('"','\\"').replaceAll('%','%%')+'"';
}
/** Unidade de usuário; habilitação e instalação são ações separadas e explícitas. */
export function systemdCollector(config:CollectorService):string{
 if(config.executable.includes(String.fromCharCode(36)))throw new Error("systemd executable cannot contain a dollar sign.");
 if(!Number.isInteger(config.intervalMs)||config.intervalMs<100||config.intervalMs>3600000)throw new Error("Invalid interval.");
 return ['[Unit]',"Description=SetupVibe metrics collector",'','[Service]','Type=simple',`ExecStart=${quote(config.executable)}${config.embedded?' --collector':''} ${config.intervalMs}`,`Environment=${quoteEnvironment(config.stateDirectory)}`,'Restart=on-failure','RestartSec=5','TimeoutStopSec=10','UMask=0077','NoNewPrivileges=true','PrivateTmp=true','','[Install]','WantedBy=default.target',''].join('\n');
}
function quoteEnvironment(path:string):string{
 quote(path);
 return '"SETUPVIBE_STATE_DIR='+path.replaceAll('\\','\\\\').replaceAll('"','\\"').replaceAll('%','%%')+'"';
}

/** Codifica valores de plist sem permitir inserção de elementos XML. */
function xml(value:string):string{return value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');}
/** Gera LaunchAgent com executável direto, sem shell intermediário. */
export function launchdCollector(config:CollectorService):string{
 quote(config.executable);quote(config.stateDirectory);
 if(!Number.isInteger(config.intervalMs)||config.intervalMs<100||config.intervalMs>3600000)throw new Error("Invalid interval.");
 return ['<?xml version="1.0" encoding="UTF-8"?>','<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">','<plist version="1.0"><dict>','<key>Label</key><string>dev.setupvibe.collector</string>','<key>ProgramArguments</key><array>',`<string>${xml(config.executable)}</string>`,...(config.embedded?['<string>--collector</string>']:[]),`<string>${config.intervalMs}</string>`,'</array>','<key>EnvironmentVariables</key><dict>',`<key>SETUPVIBE_STATE_DIR</key><string>${xml(config.stateDirectory)}</string>`,'</dict>','<key>RunAtLoad</key><true/>','<key>KeepAlive</key><dict><key>SuccessfulExit</key><false/></dict>','<key>ThrottleInterval</key><integer>5</integer>','<key>ExitTimeOut</key><integer>10</integer>','<key>Umask</key><integer>63</integer>','</dict></plist>',''].join('\n');
}
