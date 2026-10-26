/** Descobre comandos, uso e opções pelo executável compilado, usando apenas --help. */
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
/** Retorna a árvore pública sem executar consultas de host ou mutações. */
export function discover(binary=resolve(root,'target/debug/setupvibe')){
 const nodes=[];
 function visit(path){
  const help=execFileSync(binary,[...path,'--help'],{encoding:'utf8',timeout:10000,env:{...process.env,SETUPVIBE_EDITION:'desktop',SETUPVIBE_DATA_DIR:''}});
  const section=help.split('Comandos:\n')[1]?.split('\n\n')[0]??'';
  const children=[...section.matchAll(/^  ([a-z][a-z0-9-]*)\s+/gm)].map(m=>m[1]);
  const options=[...help.matchAll(/--([a-z][a-z-]*)/g)].map(m=>m[1]);
  const usage=help.split('\n').find(l=>l.startsWith('Uso: '))?.slice(5)??'';
  nodes.push({path:path.join(' '),usage,options:[...new Set(options)],children,help});
  for(const child of children)visit([...path,child]);
 }
 visit([]);return nodes;
}
if(process.argv[1]===new URL(import.meta.url).pathname)console.log(JSON.stringify(discover(),null,2));
