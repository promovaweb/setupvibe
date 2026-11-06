/** Testa perfis em HOME descartável, sem editar configurações do usuário real. */
import {expect,test} from 'bun:test';
import {mkdtempSync,mkdirSync,rmSync,writeFileSync,readFileSync,existsSync,statSync,appendFileSync,symlinkSync,linkSync,chmodSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {changePathIntegration,previewPathIntegration} from '../src/core/shell-path';
function fixture(){const root=mkdtempSync(join(homedir(),'setupvibe-path-test-')),home=join(root,'home'),bin=join(root,"commands '$(echo bad)'"),path=join(root,'state','state.db');mkdirSync(home,{mode:0o700});mkdirSync(bin,{mode:0o700});return{root,home,bin,path,options:{home,path},cleanup:()=>rmSync(root,{recursive:true,force:true})};}
test('prévia e recusa sem confirmação não criam estado ou perfis',async()=>{
 const f=fixture();try{expect((await previewPathIntegration(f.bin,'bash',f.options)).profiles).toEqual([join(f.home,'.profile'),join(f.home,'.bashrc')]);expect(existsSync(f.path)).toBe(false);expect(existsSync(join(f.home,'.profile'))).toBe(false);await expect(changePathIntegration(f.bin,'bash',{...f.options,confirmed:false})).rejects.toThrow('confirmation');expect(existsSync(f.path)).toBe(false);}finally{f.cleanup();}
});
test('Bash preserva bytes e modo, usa perfil de login prioritário e não duplica o PATH',async()=>{
 const f=fixture(),login=join(f.home,'.bash_profile'),rc=join(f.home,'.bashrc'),original=Buffer.from('# preserved\r\nexport ORIGINAL=present');writeFileSync(login,original,{mode:0o644});writeFileSync(rc,'export RC_ORIGINAL=present\n',{mode:0o600});
 try{
  const result=await changePathIntegration(f.bin,'bash',{...f.options,confirmed:true});expect(result.status).toBe('succeeded');expect(readFileSync(login).subarray(0,original.length)).toEqual(original);expect(statSync(login).mode&0o777).toBe(0o644);expect(existsSync(join(f.home,'.profile'))).toBe(false);expect(readFileSync(join(result.backupDirectory!,'0.original'))).toEqual(original);
  expect((await changePathIntegration(f.bin,'bash',{...f.options,confirmed:true})).status).toBe('current');
  const run=Bun.spawnSync(['bash','--noprofile','--rcfile',rc,'-i','-c','source "$1"; printf "%s" "$PATH"','test',rc],{env:{...process.env,HOME:f.home,PATH:'/usr/bin:/bin'}});expect(run.exitCode).toBe(0);expect(run.stdout.toString()).toBe(f.bin+':/usr/bin:/bin');
  expect((await changePathIntegration(f.bin,'bash',{...f.options,confirmed:true,remove:true})).status).toBe('succeeded');expect(readFileSync(login)).toEqual(original);expect(readFileSync(rc,'utf8')).toBe('export RC_ORIGINAL=present\n');expect(statSync(login).mode&0o777).toBe(0o644);expect((await changePathIntegration(f.bin,'bash',{...f.options,confirmed:true,remove:true})).status).toBe('current');
 }finally{f.cleanup();}
});
test('remoção preserva texto acrescentado pelo usuário e recusa bloco alterado',async()=>{
 const f=fixture(),profile=join(f.home,'.profile');writeFileSync(profile,'export USER_VALUE=before',{mode:0o600});
 try{
  await changePathIntegration(f.bin,'bash',{...f.options,confirmed:true});appendFileSync(profile,'export USER_ADDED=after\n');
  expect((await changePathIntegration(f.bin,'bash',{...f.options,confirmed:true,remove:true})).status).toBe('succeeded');expect(readFileSync(profile,'utf8')).toBe('export USER_VALUE=before\nexport USER_ADDED=after\n');expect(existsSync(join(f.home,'.bashrc'))).toBe(false);
  await changePathIntegration(f.bin,'bash',{...f.options,confirmed:true});writeFileSync(profile,readFileSync(profile,'utf8').replace('case ":${PATH-}:"','case ":modified:"'));const modified=readFileSync(profile);
  await expect(changePathIntegration(f.bin,'bash',{...f.options,confirmed:true,remove:true})).rejects.toThrow('changed or duplicated');expect(readFileSync(profile)).toEqual(modified);
 }finally{f.cleanup();}
});
test('instalação e remoção parciais retomam sem duplicar blocos nem apagar texto externo',async()=>{
 const f=fixture(),controller=new AbortController();
 try{
  expect((await changePathIntegration(f.bin,'bash',{...f.options,confirmed:true,signal:controller.signal,beforeWrite:async(_path,index)=>{if(index===1)controller.abort();}})).status).toBe('cancelled');const partial=readFileSync(join(f.home,'.profile'));
  expect((await changePathIntegration(f.bin,'bash',{...f.options,confirmed:true})).status).toBe('succeeded');expect(readFileSync(join(f.home,'.profile'))).toEqual(partial);
  const cancellation=new AbortController();expect((await changePathIntegration(f.bin,'bash',{...f.options,confirmed:true,remove:true,signal:cancellation.signal,beforeWrite:async(_path,index)=>{if(index===1)cancellation.abort();}})).status).toBe('cancelled');
  expect((await changePathIntegration(f.bin,'bash',{...f.options,confirmed:true,remove:true})).status).toBe('succeeded');expect(existsSync(join(f.home,'.profile'))).toBe(false);expect(existsSync(join(f.home,'.bashrc'))).toBe(false);
 }finally{f.cleanup();}
});
test('mudança concorrente após revisão preserva perfil e pode cancelar o recibo sem sobrescrever',async()=>{
 const f=fixture(),profile=join(f.home,'.profile');writeFileSync(profile,'original\n',{mode:0o600});
 try{
  const result=await changePathIntegration(f.bin,'bash',{...f.options,confirmed:true,beforeWrite:async(_path,index)=>{if(index===0)writeFileSync(profile,'concurrent\n');}});expect(result.status).toBe('failed');expect(result.error).toContain('changed after review');expect(readFileSync(profile,'utf8')).toBe('concurrent\n');expect(existsSync(join(f.home,'.bashrc'))).toBe(false);
  await expect(changePathIntegration(f.bin,'bash',{...f.options,confirmed:true})).rejects.toThrow('changed before');expect((await changePathIntegration(f.bin,'bash',{...f.options,confirmed:true,remove:true})).status).toBe('succeeded');expect(readFileSync(profile,'utf8')).toBe('concurrent\n');
 }finally{f.cleanup();}
});
test('links, permissões externas e marcadores sem recibo são recusados',async()=>{
 const f=fixture(),profile=join(f.home,'.profile'),foreign=join(f.root,'foreign');writeFileSync(foreign,'preserved');
 try{
  symlinkSync(foreign,profile);await expect(previewPathIntegration(f.bin,'bash',f.options)).rejects.toThrow('without symlinks');rmSync(profile);linkSync(foreign,profile);await expect(previewPathIntegration(f.bin,'bash',f.options)).rejects.toThrow('links or size');rmSync(profile);writeFileSync(profile,'preserved',{mode:0o666});chmodSync(profile,0o666);await expect(previewPathIntegration(f.bin,'bash',f.options)).rejects.toThrow('permissions');expect(readFileSync(foreign,'utf8')).toBe('preserved');expect(existsSync(f.path)).toBe(false);
 }finally{f.cleanup();}
});
test('Zsh respeita ZDOTDIR e mudança de prioridade Bash exige remover a integração anterior',async()=>{
 const f=fixture(),zdotdir=join(f.home,'zsh');mkdirSync(zdotdir,{mode:0o700});
 try{
  const result=await changePathIntegration(f.bin,'zsh',{...f.options,zdotdir,confirmed:true});expect(result.status).toBe('succeeded');expect(result.profiles).toEqual([join(zdotdir,'.zprofile'),join(zdotdir,'.zshrc')]);expect(existsSync(join(f.home,'.zshrc'))).toBe(false);
  const zsh=Bun.which('zsh');if(zsh)for(const mode of ['-l','-i']){const child=Bun.spawnSync([zsh,mode,'-c','printf "%s" "$PATH"'],{env:{...process.env,HOME:f.home,ZDOTDIR:zdotdir,PATH:'/usr/bin:/bin'}});expect(child.exitCode).toBe(0);expect(child.stdout.toString()).toBe(f.bin+':/usr/bin:/bin');}
  await changePathIntegration(f.bin,'bash',{...f.options,confirmed:true});writeFileSync(join(f.home,'.bash_profile'),'# new login preference\n',{mode:0o600});await expect(previewPathIntegration(f.bin,'bash',f.options)).rejects.toThrow('selection changed');expect((await changePathIntegration(f.bin,'bash',{...f.options,confirmed:true,remove:true})).status).toBe('succeeded');expect(readFileSync(join(f.home,'.bash_profile'),'utf8')).toBe('# new login preference\n');
 }finally{f.cleanup();}
});
test('remoção limpa a integração mesmo depois de apagar o diretório de comandos',async()=>{
 const f=fixture();try{await changePathIntegration(f.bin,'bash',{...f.options,confirmed:true});rmSync(f.bin,{recursive:true});expect((await changePathIntegration(f.bin,'bash',{...f.options,confirmed:true,remove:true})).status).toBe('succeeded');expect(existsSync(join(f.home,'.profile'))).toBe(false);}finally{f.cleanup();}
});
test('bloco duplicado ou sem recibo não autoriza edição automática',async()=>{
 const f=fixture(),profile=join(f.home,'.profile');
 try{
  await changePathIntegration(f.bin,'bash',{...f.options,confirmed:true});const bytes=readFileSync(profile);appendFileSync(profile,bytes);await expect(previewPathIntegration(f.bin,'bash',f.options)).rejects.toThrow('duplicated');writeFileSync(profile,bytes);
  rmSync(join(f.root,'state','path-integrations'),{recursive:true,force:true});await expect(previewPathIntegration(f.bin,'bash',f.options)).rejects.toThrow('no ownership receipt');expect(readFileSync(profile)).toEqual(bytes);
 }finally{f.cleanup();}
});
test('duas instalações não escrevem os mesmos perfis simultaneamente',async()=>{
 const f=fixture();let entered!:()=>void,proceed!:()=>void;const ready=new Promise<void>(resolve=>{entered=resolve;}),gate=new Promise<void>(resolve=>{proceed=resolve;});
 const first=changePathIntegration(f.bin,'bash',{...f.options,confirmed:true,beforeWrite:async(_path,index)=>{if(index===0){entered();await gate;}}});
 try{await ready;await expect(changePathIntegration(f.bin,'bash',{...f.options,confirmed:true})).rejects.toThrow('Another PATH integration');proceed();expect((await first).status).toBe('succeeded');expect((await previewPathIntegration(f.bin,'bash',f.options)).action).toBe('current');}finally{proceed();await first;f.cleanup();}
});
