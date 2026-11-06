/** Confere xattrs em perfis descartáveis e comandos nativos sem modificar configurações do host. */
import {expect,test} from 'bun:test';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,existsSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {changePathIntegration} from '../src/core/shell-path';
import {profileCopyCommand,preserveProfileMetadata} from '../src/core/profile-metadata';
test('preservação usa lista explícita no Linux e cp nativo no macOS',()=>{
 expect(profileCopyCommand('/source','/destination','linux').args).toContain('--preserve=mode,ownership,xattr');expect(profileCopyCommand('/source','/destination','darwin')).toEqual({command:'/bin/cp',args:['-pP','/source','/destination']});expect(()=>profileCopyCommand('/a','/b','win32')).toThrow();
});
test.skipIf(process.platform!=='linux'||!existsSync('/usr/bin/setfattr')||!existsSync('/usr/bin/getfattr'))('remoção de PATH preserva xattr e texto externo',async()=>{
 const root=mkdtempSync(join(homedir(),'setupvibe-profile-metadata-')),home=join(root,'home'),bin=join(root,'bin'),path=join(root,'state.db');mkdirSync(home,{mode:0o700});mkdirSync(bin,{mode:0o700});const profile=join(home,'.profile'),original='# preserved profile\n';writeFileSync(profile,original,{mode:0o600});
 try{
  execFileSync('/usr/bin/setfattr',['--name','user.setupvibe_test','--value','opaque-metadata',profile]);
  expect((await changePathIntegration(bin,'bash',{home,path,confirmed:true})).status).toBe('succeeded');expect((await changePathIntegration(bin,'bash',{home,path,confirmed:true,remove:true})).status).toBe('succeeded');
  expect(readFileSync(profile,'utf8')).toBe(original);expect(execFileSync('/usr/bin/getfattr',['--only-values','--name','user.setupvibe_test',profile],{encoding:'utf8',stdio:['ignore','pipe','ignore']})).toBe('opaque-metadata');
  await expect(preserveProfileMetadata(join(root,'missing'),profile)).rejects.toThrow('original profile retained');expect(readFileSync(profile,'utf8')).toBe(original);
 }finally{rmSync(root,{recursive:true,force:true});}
});
