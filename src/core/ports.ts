/** Verifica disponibilidade momentânea de bind sem manter serviço em execução. */
import{createServer}from'node:net';
/** Resultado é um precheck: o adaptador ainda deve tratar conflito na criação real. */
export function checkLocalPort(port:number):Promise<boolean>{
 if(!Number.isInteger(port)||port<1024||port>65535)return Promise.reject(new Error("Invalid local port."));
 return new Promise((resolve,reject)=>{
  const server=createServer();
  server.once('error',error=>{if(['EADDRINUSE','EACCES'].includes((error as NodeJS.ErrnoException).code??''))resolve(false);else reject(error);});
  server.listen({host:'127.0.0.1',port,exclusive:true},()=>server.close(error=>error?reject(error):resolve(true)));
 });
}
