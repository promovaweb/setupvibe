/** Confere links locais, cobertura do manual e contexto de agentes sem executar operações de produto. */
import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {discover} from './cli-surface.mjs';
import {entry,globalOptions} from './manual-source.mjs';
import {markdownLinkErrors} from './markdown-links.mjs';
const root=resolve(import.meta.dirname,'..');
const files=[];
/** Ignora builds e dependências para conferir somente documentação mantida no repositório. */
function walk(dir){for(const item of readdirSync(dir,{withFileTypes:true})){
 if(['.git','node_modules','target','dist'].includes(item.name))continue;
 const path=resolve(dir,item.name);if(item.isDirectory())walk(path);else if(item.name.endsWith('.md'))files.push(path);
}}
walk(root);
const errors=markdownLinkErrors(root,files);
assert.deepEqual(errors,[],`Links locais ausentes: ${errors.join(', ')}`);
const binary=resolve(root,'target/debug/setupvibe');
const nodes=discover(binary),manual=readFileSync(resolve(root,'docs/cli/REFERENCE.md'),'utf8');
let examples=0;
for(const node of nodes){
 const heading=`## setupvibe${node.path?' '+node.path:''}\n`;
 assert(manual.includes(heading),`Comando não documentado: ${node.path}`);
 const section=manual.split(heading)[1].split('\n## ')[0];
 assert((section.match(/\*\*Exemplo \d+:/g)??[]).length>=5,`Exemplos insuficientes: ${node.path}`);
 if(node.children.length)continue;
 for(const example of entry(node.path).examples){
  // --help encerra no parser. Nunca execute os exemplos reais com --yes durante esta conferência.
  execFileSync(binary,[...example.args,'--help'],{stdio:'pipe',timeout:10000});examples++;
 }
}
for(const [name,[,,items]]of Object.entries(globalOptions)){assert(items.length>=5,`Exemplos insuficientes: --${name}`);}
assert.equal(readFileSync(resolve(root,'AGENTS.md'),'utf8'),readFileSync(resolve(root,'CLAUDE.md'),'utf8'),'Contextos de agentes divergentes');
const skill=readFileSync(resolve(root,'.codex/skills/setupvibe-v2-maintenance/SKILL.md'),'utf8');
assert.equal(skill,readFileSync(resolve(root,'.claude/skills/setupvibe-v2-maintenance/SKILL.md'),'utf8'));
assert.match(skill,/^---\nname: setupvibe-v2-maintenance\ndescription: .+\n---\n/);
assert(!/(?:—|\briscos?\b|\bdecis(?:ão|ões)\b|\bevidências?\b|\bcritérios?\b|\binventário\b|\batrito\b|\bbloque(?:io|ar)\b|\bem que\b)/iu.test(skill),'Texto da skill precisa de revisão');
console.log(`${files.length} arquivos Markdown com links conferidos; ${nodes.length} entradas cobertas; ${examples} exemplos de comandos aceitos pelo parser; skill e contextos alinhados.`);
