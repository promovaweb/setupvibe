/** Valida proteção de credenciais sem consultar o daemon Docker. */
import {expect,test} from 'bun:test';
import {mkdtempSync,writeFileSync,chmodSync,symlinkSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {validateCredentialFile} from '../src/core/credential-file';
import {planDockerService} from '../src/adapters/docker-service';
test("arquivo privado é aceito; mode aberta, empty e link são recusados",()=>{
  const dir=mkdtempSync(join(tmpdir(),'setupvibe-secret-')),path=join(dir,'password');
  try{
    writeFileSync(path,'senha-de-teste',{mode:0o600});expect(()=>validateCredentialFile(path)).not.toThrow();
    chmodSync(path,0o644);expect(()=>validateCredentialFile(path)).toThrow(new RegExp("mode","i"));chmodSync(path,0o600);
    symlinkSync(path,join(dir,'link'));expect(()=>validateCredentialFile(join(dir,'link'))).toThrow(new RegExp("symlinks","i"));
    writeFileSync(path,'');expect(()=>validateCredentialFile(path)).toThrow(new RegExp("empty","i"));
  }finally{rmSync(dir,{recursive:true,force:true});}
});
test('plano PostgreSQL usa arquivo somente leitura e PGDATA explícito',()=>{
  const step=planDockerService({id:'postgresql',image:'postgres@sha256:'+'a'.repeat(64),port:5432,volume:'setupvibe-postgresql',postgres:{passwordFile:'/home/teste/password',user:'dev',database:'app'}},{edition:'desktop',system:'linux',arch:'x64'},[],[]);
  expect(step.args).toContain('POSTGRES_PASSWORD_FILE=/run/secrets/postgres-password');
  expect(step.args).toContain('type=bind,source=/home/teste/password,target=/run/secrets/postgres-password,readonly');
  expect(step.args).toContain('type=volume,source=setupvibe-postgresql,target=/var/lib/postgresql');
  expect(step.args).toContain('PGDATA=/var/lib/postgresql/setupvibe');
  expect(step.args.some(arg=>arg.startsWith('POSTGRES_PASSWORD='))).toBe(false);
});
