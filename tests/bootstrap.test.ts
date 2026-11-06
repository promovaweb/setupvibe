/** Verifica geração e prévia do bootstrap sem instalar ferramentas no host. */
import {expect,test} from 'bun:test';
import {mkdtempSync,existsSync,rmSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
const manifest={version:'2.0.0-dev.1',artifacts:[{system:'linux',arch:'x64',url:'https://example.test/v2/setupvibe-2.0.0-dev.1-linux-x64',sha256:'a'.repeat(64)}]};
const render=(input:unknown)=>Bun.spawnSync(['node','--input-type=module','-e',"import{renderBootstrap}from'./scripts/bootstrap.mjs';process.stdout.write(renderBootstrap(JSON.parse(process.argv[1])));",JSON.stringify(input)],{cwd:join(import.meta.dir,'..')});
test('bootstrap fixa hashes, recusa metadados inconsistentes e produz Bash válido',()=>{
 const result=render(manifest);expect(result.exitCode).toBe(0);expect(result.stdout.toString()).toContain("expected='"+'a'.repeat(64)+"'");expect(result.stdout.toString()).not.toMatch(/@[A-Z0-9_]+@/);
 expect(Bun.spawnSync(['bash','-n'],{stdin:result.stdout}).exitCode).toBe(0);
 for(const input of [{...manifest,version:'latest'},{...manifest,artifacts:[manifest.artifacts[0],manifest.artifacts[0]]},{...manifest,artifacts:[{...manifest.artifacts[0],url:'http://example.test/file'}]},{...manifest,artifacts:[{...manifest.artifacts[0],sha256:'invalid'}]}])expect(render(input).exitCode).not.toBe(0);
});
test.skipIf(process.platform!=='linux'||process.arch!=='x64')('prévia do bootstrap não cria destino nem chama download',()=>{
 const directory=mkdtempSync(join(homedir(),'setupvibe-bootstrap-preview-')),prefix=join(directory,'installation');
 try{
  const result=Bun.spawnSync(['bash','-s','--','--prefix',prefix,'--bin-directory',join(directory,'bin')],{stdin:render(manifest).stdout});
  expect(result.exitCode).toBe(0);expect(result.stdout.toString()).toContain('No changes made');expect(existsSync(prefix)).toBe(false);
 }finally{rmSync(directory,{recursive:true,force:true});}
});
