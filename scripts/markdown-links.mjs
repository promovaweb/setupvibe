/** Confere caminhos e âncoras locais em Markdown ATX, incluindo títulos repetidos. */
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname,relative,extname} from 'node:path';

/** Exclui exemplos cercados por crases ou tils para não interpretá-los como documentação real. */
function withoutFences(source){
 let fence=null;
 return source.split('\n').map(line=>{
  const mark=line.match(/^ {0,3}(`{3,}|~{3,})/);
  if(!fence&&mark){fence=mark[1];return '';}
  if(fence){if(mark&&mark[1][0]===fence[0]&&mark[1].length>=fence.length&&line.slice(mark[0].length).trim()==='')fence=null;return '';}
  return line;
 }).join('\n');
}

/** Obtém IDs de headings usados pelos manuais do repositório, com sufixos para repetições. */
export function headingIds(source){
 const ids=new Set();
 for(const [,heading]of withoutFences(source).matchAll(/^ {0,3}#{1,6}\s+(.+?)\s*#*\s*$/gm)){
  const base=heading.toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu,'').replace(/\s/g,'-');
  let id=base,index=0;while(ids.has(id))id=`${base}-${++index}`;ids.add(id);
 }
 return ids;
}

/** Retorna falhas de links locais sem escrever arquivos. Links web não são consultados. */
export function markdownLinkErrors(root,files){
 const errors=[],cache=new Map();
 for(const file of files){
  const source=withoutFences(readFileSync(file,'utf8')).replace(/`[^`\n]+`/g,'');
  for(const [,raw]of source.matchAll(/\]\(([^)]+)\)/g)){
   if(/^(?:https?:|mailto:)/.test(raw))continue;
   let link;try{link=decodeURIComponent(raw);}catch{errors.push(`${relative(root,file)}: endereço inválido ${raw}`);continue;}
   const index=link.indexOf('#'),path=index<0?link:link.slice(0,index),fragment=index<0?'':link.slice(index+1);
   const target=path?resolve(dirname(file),path):file;
   if(!existsSync(target)){errors.push(`${relative(root,file)}: arquivo ausente ${raw}`);continue;}
   if(fragment&&extname(target)==='.md'){
    if(!cache.has(target))cache.set(target,headingIds(readFileSync(target,'utf8')));
    if(!cache.get(target).has(fragment))errors.push(`${relative(root,file)}: seção ausente ${raw}`);
   }
  }
 }
 return errors;
}
