/** Define campos e converte a configuração de serviços sem incluir o conteúdo de senhas. */
import type {ServiceRequest} from '../adapters/docker-service';
export type ServiceId=ServiceRequest['id'];
export function serviceFields(id:ServiceId):{label:string;value:string}[]{
  return [{label:"Official image with SHA-256 digest",value:''},{label:"Local port",value:String(id==='portainer'?9443:id==='postgresql'?5432:id==='redis'?6379:8025)},
    ...(id==='mailpit'?[{label:"Local SMTP port",value:'1025'}]:[{label:"Managed volume",value:'setupvibe-'+id}]),
    ...(id==='portainer'?[{label:"Docker socket on the daemon host",value:'/var/run/docker.sock'},{label:"Type YES to grant administrative Docker access",value:''}]:[]),
    ...(id==='postgresql'?[{label:"Absolute path to the private password file",value:''},{label:"PostgreSQL user",value:'dev'},{label:"PostgreSQL database",value:'app'}]:[])];
}
/** A validação completa continua no planejador e no instalador. */
export function serviceRequest(id:ServiceId,values:string[]):ServiceRequest{
  const port=(value:string)=>{if(!/^\d+$/.test(value))throw Error("Port must contain digits only.");return Number(value);};
  if(id==='portainer'&&values[4]!=="YES")throw Error("Docker access consent was not confirmed.");
  return{id,image:values[0]!,port:port(values[1]!),...(id==='mailpit'?{smtpPort:port(values[2]!)}:{volume:values[2]}),
    ...(id==='portainer'?{portainer:{socketPath:values[3]!,allowDockerSocket:true}}:{}),
    ...(id==='postgresql'?{postgres:{passwordFile:values[3]!,user:values[4]!,database:values[5]!}}:{})};
}
