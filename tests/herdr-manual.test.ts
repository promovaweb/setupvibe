/** Mantém os comandos Herdr documentados com contratos e cinco exemplos por comando. */
import {expect,test} from 'bun:test';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
test('manual Herdr cobre comandos públicos e exemplos distintos',()=>{
 const manual=readFileSync(join(import.meta.dir,'../docs/v2/HERDR.md'),'utf8'),cli=readFileSync(join(import.meta.dir,'../src/cli.ts'),'utf8');
 for(const command of ['preview-herdr','install-herdr']){
  expect(cli).toContain(command);const section=manual.split('## '+command+'\n')[1]?.split('\n## ')[0]??'';expect(section.length).toBeGreaterThan(250);
  const examples=section.split('\n').filter(line=>line.includes('bun src/cli.ts '+command)||line.includes('bun src/cli.ts --server '+command));expect(new Set(examples).size).toBeGreaterThanOrEqual(5);
 }
 expect(manual).toContain('macOS');expect(manual).toContain('--confirm');expect(manual).toContain('SETUPVIBE_HERDR_INTEGRATION');
});
