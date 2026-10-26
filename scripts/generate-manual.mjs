/** Gera e confere o manual completo contra --help, sem executar exemplos ou alterar o host. */
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {discover} from './cli-surface.mjs';
import {entry,globalOptions,localOptions} from './manual-source.mjs';
const root=resolve(import.meta.dirname,'..');
const version=readFileSync(resolve(root,'Cargo.toml'),'utf8').match(/^version\s*=\s*"([^"]+)"/m)?.[1];
if(!version)throw Error('Versão ausente em Cargo.toml');
const nodes=discover();
const commands=nodes.filter(n=>!n.children.length);
const shell=(args)=>'setupvibe '+args.map(a=>/^[\w./:=,-]+$/.test(a)?a:`'${a.replaceAll("'","'\\''")}'`).join(' ')+(args.includes('--token-stdin')&&!args.includes('--dry-run')?' < /caminho/privado/swarm-token':'');
const anchor=(path)=>`setupvibe${path?'-'+path.replaceAll(' ','-'):''}`;
/** Exige cinco situações explicadas. Exemplos são documentação, nunca comandos de teste. */
function renderExamples(items){
 if(items.length<5)throw Error('São necessários cinco exemplos por entrada');
 return items.map((e,i)=>`**Exemplo ${i+1}: ${e.situation}.**\n\n\`\`\`bash\n${shell(e.args)}\n\`\`\``).join('\n\n');
}
const groups={catalog:'Consultar e validar o catálogo embarcado',component:'Inspecionar, instalar e atualizar componentes',updates:'Consultar e aplicar atualizações selecionadas',service:'Descobrir e controlar serviços Docker',swarm:'Consultar e preparar o nó Swarm',state:'Manter bancos e reconciliar observações',operation:'Consultar histórico de operações',metrics:'Consultar recursos e histórico do coletor',collector:'Instalar, supervisionar e executar o coletor'};
let md=`# Referência completa do CLI\n\nGerada de contratos autorados e da ajuda do executável. Versão ${version}.\n\nNão edite este arquivo diretamente. Edite \`scripts/manual-source.mjs\`, execute \`npm run docs:generate\` e confira \`npm run docs:check\`.\n\nTodos os exemplos usam o executável no PATH. Substitua caminhos e IDs ilustrativos. Exemplos com \`--yes\` executam alterações reais. Os exemplos de Swarm usam endereços de documentação, que precisam ser substituídos. O token vem de arquivo privado em stdin.\n\nPermissões pertencem ao gerenciador: APT, Docker Engine e coletor system exigem autorização administrativa. Homebrew, mise e coletor user usam a conta atual. Consultas Docker dependem do acesso ao socket. O programa não amplia permissões automaticamente.\n\nLeia [guia de uso](../user/README.md), [protocolo e automação](../development/CLI.md), [edições](../development/COMPATIBILITY.md) e [preservação das instalações](../development/ADAPTERS.md).\n\n## Índice de comandos\n\n`;
md+=nodes.map(n=>`- [${n.path||'setupvibe (raiz)'}](#${anchor(n.path)})`).join('\n')+'\n\n';
for(const n of nodes){
 let contract;
 if(n.children.length){
  const descendants=commands.filter(c=>!n.path||c.path.startsWith(n.path+' '));
  const items=descendants.flatMap(c=>entry(c.path).examples).slice(0,5);
  contract={purpose:n.path?(groups[n.path]??`Operar ${n.path} pelo núcleo compartilhado de componentes`)+'.':'Abre a TUI quando stdin e stdout são terminais. Sem TTY, exige subcomando e retorna 4. Não instala componentes ao abrir.',inputs:n.path?'Escolha um subcomando obrigatório. As opções globais podem aparecer antes ou depois do grupo.':'Comando opcional em terminal interativo. --non-interactive exige uma operação explícita.',output:'O grupo organiza as operações descritas abaixo. --help não executa consultas de host nem grava dados.',confirmation:'Consulte a confirmação e as condições de cada subcomando antes de executar.',examples:items};
 }else contract=entry(n.path);
 const locals=n.options.filter(o=>!globalOptions[o]);
 for(const option of locals)if(!localOptions[option])throw Error(`Opção sem contrato: ${n.path} --${option}`);
 md+=`## ${n.path?`setupvibe ${n.path}`:'setupvibe'}\n\n${contract.purpose}\n\n\`\`\`text\n${n.usage}\n\`\`\`\n\n**Entradas.** ${contract.inputs}\n\n**Saída e efeitos.** ${contract.output}\n\n**Conferência.** ${contract.confirmation}\n\n`;
 if(n.children.length)md+='Subcomandos: '+n.children.map(c=>`[${c}](#${anchor([n.path,c].filter(Boolean).join(' '))})`).join(', ')+'.\n\n';
 if(locals.length)md+='| Opção local | Tipo, padrão e condições |\n| --- | --- |\n'+locals.map(o=>`| \`--${o}\` | ${localOptions[o]} |`).join('\n')+'\n\n';
 md+=renderExamples(contract.examples)+'\n\n';
}
md+='## Opções globais\n\nAs flags globais alteram o contexto da operação. Elas não habilitam componentes excluídos da edição nem substituem pré-condições do host.\n\n';
for(const [name,[type,behavior,examples]] of Object.entries(globalOptions)){
 if(!nodes[0].options.includes(name))throw Error(`Flag documentada ausente: --${name}`);
 md+=`### --${name}\n\n${type}\n\n${behavior}\n\n${renderExamples(examples.map((args,i)=>({args,situation:`Aplicação ${i+1} de --${name}`})))}\n\n`;
}
const localExamples={role:['portainer','install','--role','agent','--dry-run'],option:['component','install','redis','--option','port=7000','--dry-run'],interval:['collector','run','--interval','5','--once','--dry-run'],scope:['metrics','current','--scope','host'],platform:['collector','render','--platform','linux'],once:['collector','run','--once','--dry-run'],samples:['collector','run','--samples','3','--dry-run'],id:['metrics','current','--id','host'],limit:['operation','list','--limit','20'],offset:['operation','list','--offset','20'],'max-age':['metrics','current','--max-age','60'],from:['metrics','history','--from','2026-10-22T00:00:00Z'],to:['metrics','history','--to','2026-10-22T12:00:00Z'],after:['metrics','history','--after','10'],'snapshot-id':['metrics','history','--snapshot-id','100'],since:['service','logs','setupvibe-redis','--since','2026-10-22T00:00:00Z'],follow:['service','logs','setupvibe-redis','--follow'],tail:['service','logs','setupvibe-redis','--tail','20'],'advertise-addr':['swarm','init','--advertise-addr','192.0.2.10','--dry-run'],manager:['swarm','join','--manager','192.0.2.10:2377','--dry-run'],'token-stdin':['swarm','join','--manager','192.0.2.10:2377','--token-stdin','--dry-run'],destination:['state','backup','--destination','/caminho/privado/backup.db','--dry-run'],file:['catalog','validate','--file','catalog/components.json'],snapshot:['tui','--snapshot'],width:['tui','--snapshot','--width','80'],height:['tui','--snapshot','--height','24'],tab:['tui','--snapshot','--tab','3']};
md+='## Opções locais\n\nEstas flags só existem nos comandos relacionados. Datas, IDs e caminhos dos exemplos são ilustrativos. Em paginação, reutilize os cursores retornados pela primeira consulta.\n\n';
for(const [name,description] of Object.entries(localOptions)){
 const args=localExamples[name];if(!args)throw Error(`Faltam exemplos de --${name}`);
 const users=nodes.filter(n=>n.options.includes(name));
 if(!users.length)throw Error(`Opção local removida: --${name}`);
 const variants=[['Consultar ou revisar no terminal',args],['Consumir a resposta JSON',['--output','json',...args]],['Receber NDJSON',['--output','ndjson',...args]],['Usar sem interação',['--non-interactive',...args]],['Limitar espera de subprocessos',['--timeout','10',...args]]];
 md+=`### Opção local --${name}\n\n${description}\n\nDisponível em ${users.map(n=>`[${n.path}](#${anchor(n.path)})`).join(', ')}.\n\n${renderExamples(variants.map(([situation,args])=>({situation,args})))}\n\n`;
}
const files=new Map([['docs/cli/REFERENCE.md',md.trimEnd()+'\n'],['docs/cli/surface.json',JSON.stringify(nodes.map(({help,...n})=>n),null,2)+'\n']]);
for(const [file,content]of files){
 const path=resolve(root,file);
 if(process.argv.includes('--check')){if(readFileSync(path,'utf8')!==content)throw Error(`${file} diverge do executável ou dos contratos. Execute npm run docs:generate.`);}
 else writeFileSync(path,content);
}
console.log(`${nodes.length} entradas, ${commands.length} comandos finais e ${Object.keys(globalOptions).length} opções globais documentados, com cinco exemplos por entrada.`);
