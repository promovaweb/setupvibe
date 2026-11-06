/** Valida manifesto e instalação nativa opt-in em diretório descartável. */
import {expect,test} from 'bun:test';
import {mkdtempSync,rmSync,writeFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {homedir} from 'node:os';
import {parseClaudeArtifact} from '../src/core/claude-artifact';
import {installClaude,claudePreview} from '../src/core/install-claude';
import {StateStore} from '../src/core/state';
const target={edition:'desktop' as const,system:'linux',arch:'x64'};
test("manifesto Claude exige version, platform, checksum e tamanho válidos",()=>{
  const manifest={version:'2.1.318',platforms:{'linux-x64':{binary:'claude',checksum:'a'.repeat(64),size:100}}};
  expect(parseClaudeArtifact(manifest,'2.1.318',target).url).toBe('https://downloads.claude.ai/claude-code-releases/2.1.318/linux-x64/claude');
  expect(()=>parseClaudeArtifact(manifest,'2.1.317',target)).toThrow(new RegExp("incompatible","i"));
  expect(()=>parseClaudeArtifact({...manifest,platforms:{}},'2.1.318',target)).toThrow(new RegExp("invalid","i"));
});
test("Claude exige confirmação antes de read onlyr manifesto",async()=>{
  await expect(installClaude('2.1.318',target,{confirmed:false})).rejects.toThrow(new RegExp("confirmation","i"));
});
test('cancelamento anterior à instalação Claude não cria estado',async()=>{
  const dir=mkdtempSync(join(homedir(),'setupvibe-claude-cancel-')),path=join(dir,'state.db'),controller=new AbortController();controller.abort();
  try{const result=await installClaude('2.1.318',target,{confirmed:true,path,signal:controller.signal});expect(result.status).toBe('cancelled');expect(existsSync(path)).toBe(false);}finally{rmSync(dir,{recursive:true,force:true});}
});
(process.env.SETUPVIBE_CLAUDE_INTEGRATION==='1'?test:test.skip)("Claude nativo confirma version e ownership após checksum",async()=>{
  const dir=mkdtempSync(join(homedir(),'setupvibe-claude-real-')),path=join(dir,'state.db');
  try{
    const result=await installClaude('2.1.318',target,{confirmed:true,path,directory:join(dir,'apps')});expect(result.status).toBe('succeeded');
    const store=new StateStore(path);try{expect(store.managed('claude')?.location).toBe(result.executable!);expect(store.steps(result.operationId!)[0]?.status).toBe('succeeded');}finally{store.close();}
    expect((await claudePreview('2.1.318',target,{path})).action).toBe('current');
    const current=await installClaude('2.1.318',target,{confirmed:true,path});expect(current.status).toBe('current');expect(current.operationId).toBeNull();
    expect((await claudePreview('2.1.317',target,{path})).action).toBe('update');
    const updated=await installClaude('2.1.317',target,{confirmed:true,path,directory:join(dir,'apps')});expect(updated.status).toBe('succeeded');expect(updated.executable).not.toBe(result.executable);
    expect(execFileSync(result.executable!,['--version'],{encoding:'utf8',timeout:10000}).trim()).toBe('2.1.318 (Claude Code)');
    const after=new StateStore(path);try{expect(after.managed('claude')?.location).toBe(updated.executable!);expect(after.list().length).toBe(2);}finally{after.close();}
    writeFileSync(updated.executable!,'alterado');
    await expect(claudePreview('2.1.318',target,{path})).rejects.toThrow(new RegExp("missing or mismatched","i"));
  }finally{rmSync(dir,{recursive:true,force:true});}
},180000);
