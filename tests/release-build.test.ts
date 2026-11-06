/** Exercita o empacotador Node sem permitir build inválido ou sobrescrita de artefatos existentes. */
import {expect,test} from 'bun:test';
import {mkdtempSync,rmSync,writeFileSync,mkdirSync,readFileSync,existsSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
const cli=(args:string[])=>Bun.spawnSync(['node','scripts/build-release.mjs',...args],{cwd:join(import.meta.dir,'..')});
test('empacotador recusa alvo inválido e mantém diretório de saída existente',()=>{
 const dir=mkdtempSync(join(homedir(),'setupvibe-release-build-')),output=join(dir,'release');
 try{
  expect(cli(['--target','windows-x64','--output',output]).exitCode).toBe(1);expect(existsSync(output)).toBe(false);
  mkdirSync(output);writeFileSync(join(output,'external'),'preserved');
  expect(cli(['--target','linux-x64','--output',output]).exitCode).toBe(1);expect(readFileSync(join(output,'external'),'utf8')).toBe('preserved');
  expect(cli(['--all','--target','linux-x64']).exitCode).toBe(1);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
