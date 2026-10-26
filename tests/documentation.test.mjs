/** Regressões de navegação do manual: seções removidas, exemplos e âncoras repetidas. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {headingIds,markdownLinkErrors} from '../scripts/markdown-links.mjs';

test('âncoras preservam acentos e distinguem headings repetidos',()=>{
 assert.deepEqual([...headingIds('# Introdução\n## `--scope`\n## Introdução\n## Introdução\n')],['introdução','--scope','introdução-1','introdução-2']);
});

test('links para seções removidas falham mesmo quando o arquivo existe',()=>{
 const root=mkdtempSync(join(tmpdir(),'setupvibe-doc-links-'));
 try{
  const file=join(root,'index.md'),target=join(root,'target.md');writeFileSync(target,'# Introdução\n## Uso\n');
  writeFileSync(file,'# Índice\n[local](#índice)\n[alvo](target.md#introdu%C3%A7%C3%A3o)\n');
  assert.deepEqual(markdownLinkErrors(root,[file]),[]);
  writeFileSync(file,'# Índice\n[removido](target.md#ausente)\n[arquivo](missing.md)\n[escape](#%ZZ)\n');
  const errors=markdownLinkErrors(root,[file]);assert.equal(errors.length,3);assert.match(errors.join('\n'),/seção ausente/);assert.match(errors.join('\n'),/arquivo ausente/);assert.match(errors.join('\n'),/endereço inválido/);
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('exemplos de links e headings dentro de cercas não entram na conferência',()=>{
 const root=mkdtempSync(join(tmpdir(),'setupvibe-doc-examples-'));
 try{
  const file=join(root,'index.md');writeFileSync(file,'# Real\n~~~md\n# Falso\n[exemplo](absent.md)\n~~~\n`[inline](absent.md)`\n```md\n# Outro\n```\n[real](#real)\n');
  assert.deepEqual(markdownLinkErrors(root,[file]),[]);assert.deepEqual([...headingIds(readFileSync(file,'utf8'))],['real']);
 }finally{rmSync(root,{recursive:true,force:true});}
});
