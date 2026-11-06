/** Mantém os três comandos Docker documentados com contratos e cinco exemplos por comando. */
import {expect,test} from 'bun:test';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
test('manual Docker cobre comandos públicos e exemplos distintos',()=>{
 const manual=readFileSync(join(import.meta.dir,'../docs/v2/DOCKER.md'),'utf8'),cli=readFileSync(join(import.meta.dir,'../src/cli.ts'),'utf8');
 for(const command of ['docker-info','preview-docker','install-docker']){
  expect(cli).toContain(command);const section=manual.split('## '+command+'\n')[1]?.split('\n## ')[0]??'';expect(section.length).toBeGreaterThan(250);
  const examples=section.split('\n').filter(line=>line.includes('bun src/cli.ts '+command));expect(new Set(examples).size).toBeGreaterThanOrEqual(5);
 }
 expect(manual).toContain('sem homologação');expect(manual).toContain('--install-dependencies');
});
