/** Entrada compartilhada do coletor autônomo e do modo embutido no executável principal. */
import {collectHost} from './collector';
import {metricsPath} from './metrics-query';
/** Valida antes de gravar estado e encerra consultas e bancos ao receber SIGINT ou SIGTERM. */
export async function runCollector(args:string[]):Promise<number>{
 if(args.length>1||args[0]!==undefined&&!/^\d+$/.test(args[0]))throw Error('Provide at most one interval in milliseconds.');
 const controller=new AbortController(),stop=()=>controller.abort();
 process.on('SIGINT',stop);process.on('SIGTERM',stop);
 try{return await collectHost(metricsPath(),{signal:controller.signal,intervalMs:args[0]===undefined?5000:Number(args[0])});}
 finally{process.off('SIGINT',stop);process.off('SIGTERM',stop);}
}
