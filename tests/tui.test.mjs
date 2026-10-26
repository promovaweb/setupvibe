/** Verifica o render real Ratatui e interação em PTY sem instalar programas no host. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync,spawn} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,chmodSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import xterm from '@xterm/headless';
const binary=resolve(import.meta.dirname,'../target/debug/setupvibe');
const script='/usr/bin/script';
const quote=s=>`'${s.replaceAll("'","'\\''")}'`;
async function fixture(fn){const dir=mkdtempSync(join(tmpdir(),'setupvibe-tui-'));try{await fn(dir);}finally{rmSync(dir,{recursive:true,force:true});}}
function snapshot(dir,width,height,tab=0,edition='desktop'){
  const r=spawnSync(binary,['--data-dir',join(dir,'data'),'--output','json','--edition',edition,'tui','--snapshot','--width',String(width),'--height',String(height),'--tab',String(tab)],{encoding:'utf8',maxBuffer:8*1024*1024});assert.equal(r.status,0,r.stdout);return JSON.parse(r.stdout).data;
}
for(const [width,height]of [[80,24],[129,44],[160,50]])test(`shell preserva faixas em ${width}x${height}`,()=>fixture(dir=>{
  for(const edition of ['desktop','server']){
    for(let tab=0;tab<6;tab++){
      const frame=snapshot(dir,width,height,tab,edition);assert.equal(frame.lines.length,height);
      assert.match(frame.lines[0],/SetupVibe/);assert.match(frame.lines[4],/Home.*Aplicativos.*Serviços.*Métricas.*Histórico.*Sobre/);
      assert.match(frame.lines[height-1],/\^Q Sair.*Esc Voltar/);assert.ok(frame.lines.every(l=>[...l].length===width));
      if(tab===0)assert.match(frame.lines.join('\n'),/Sem amostra/);
      if(tab===1&&edition==='server')assert.doesNotMatch(frame.lines.join('\n'),/Codex|PostgreSQL|Mailpit/);
    }
  }
  assert.equal(existsSync(join(dir,'data')),false);
}));

test('pares de contraste do contrato passam WCAG AA',()=>fixture(dir=>{
  const t=snapshot(dir,80,24).tokens;
  const luminance=hex=>{const v=hex.slice(1).match(/../g).map(h=>parseInt(h,16)/255).map(c=>c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4);return v[0]*0.2126+v[1]*0.7152+v[2]*0.0722;};
  for(const [fg,bg]of [['text','background'],['textMuted','surface'],['activeText','activeBackground'],['selectedText','selectedBackground'],['primaryText','primaryBackground'],['warning','surface']]){
    const a=luminance(t[fg]),b=luminance(t[bg]);assert.ok((Math.max(a,b)+0.05)/(Math.min(a,b)+0.05)>=4.5,`${fg}/${bg}`);
  }
}));

test('sem terminal ou modo não interativo exige comando explícito',()=>fixture(dir=>{
  for(const args of [[],['--non-interactive'],['--output','json','tui']]){
    const r=spawnSync(binary,['--data-dir',join(dir,'data'),...args],{encoding:'utf8'});assert.equal(r.status,4);
  }assert.equal(existsSync(join(dir,'data')),false);
}));

/** script fornece PTY real; comandos fake são somente Git instalado, sem mutação externa. */
async function interactive(dir,width,height,fn){
  const bin=join(dir,'bin');mkdirSync(bin);for(const [name,body]of [['git','console.log("git 2.0");'],['dpkg-query','process.exit(1);']]){const p=join(bin,name);writeFileSync(p,`#!${process.execPath}\n${body}`);chmodSync(p,0o700);}
  const data=join(dir,'data');
  const command=`/usr/bin/stty cols ${width} rows ${height} && exec ${quote(binary)} --data-dir ${quote(data)} --timeout 1`;
  const child=spawn(script,['--quiet','--return','--command',command,'/dev/null'],{env:{...process.env,HOME:dir,PATH:bin,TERM:'xterm-256color'},stdio:['pipe','pipe','pipe']});
  const terminal=new xterm.Terminal({cols:width,rows:height,allowProposedApi:true});
  let output='';child.stdout.on('data',c=>{output+=c;terminal.write(c.toString());});child.stderr.on('data',c=>output+=c);
  const done=new Promise((res,rej)=>{child.on('error',rej);child.on('close',res);});
  let closed=false;done.then(()=>closed=true);
  const send=keys=>child.stdin.write(keys);
  const screen=()=>Array.from({length:height},(_,i)=>terminal.buffer.active.getLine(i)?.translateToString(true)||'').join('\n');
  async function wait(text){const start=Date.now();while(!screen().includes(text)){if(closed||Date.now()-start>8000)throw new Error(`Não exibiu ${text}: ${screen()}`);await new Promise(r=>setTimeout(r,30));}}
  const guard=setTimeout(()=>child.kill('SIGKILL'),20000);
  try{await wait('SetupVibe');await fn({send,wait,data,output:()=>output});send('\x11');assert.equal(await done,0);}finally{clearTimeout(guard);terminal.dispose();if(!closed){send('\x11');child.kill('SIGTERM');await done;}}
}
for(const [width,height]of [[80,24],[129,44],[160,50]])test(`PTY ${width}x${height} navega sem criar estado`,()=>fixture(dir=>interactive(dir,width,height,async f=>{
  f.send('\x01');await f.wait('Git');f.send('\x1b[<0;33;5M');f.send('\x1b[<0;33;5m');await f.wait('Consulta concluída');f.send('\x1b');await new Promise(r=>setTimeout(r,150));f.send('e');await f.wait('Server');assert.equal(existsSync(f.data),false);
})));
test('TUI exige revisão antes de escrever e registra execução confirmada',()=>fixture(dir=>interactive(dir,129,44,async f=>{
  f.send('\x01');await f.wait('Git');f.send(' i');await f.wait('Revisão pronta');assert.equal(existsSync(f.data),false);
  f.send('\r');await f.wait('Operação concluída');assert.equal(existsSync(join(f.data,'setupvibe.db')),true);
})));

test('cancelamento interrompe consulta e mantém TUI disponível',()=>fixture(dir=>interactive(dir,129,44,async f=>{
  writeFileSync(join(dir,'bin/git'),`#!${process.execPath}\nsetInterval(()=>{},1000);`);
  f.send('\x01');await f.wait('Git');f.send('v');await f.wait('Carregando');await new Promise(r=>setTimeout(r,150));f.send('\x03');await f.wait('Operação cancelada');
  f.send('\x07');await f.wait('Ambiente');assert.equal(existsSync(f.data),false);
})));

test('encerrar TUI não encerra coletor independente',()=>fixture(async dir=>{
  const data=join(dir,'data');
  const collector=spawn(binary,['--data-dir',data,'collector','run','--interval','1','--samples','10','--yes'],{env:{...process.env,DOCKER_HOST:'unix:///tmp/setupvibe-inexistente.sock'},stdio:'ignore'});
  const ended=new Promise((res,rej)=>{collector.on('error',rej);collector.on('close',res);});
  try{
    for(let i=0;i<100&&!existsSync(join(data,'metrics.db'));i++)await new Promise(r=>setTimeout(r,30));
    await interactive(dir,80,24,async()=>{});assert.equal(collector.exitCode,null);collector.kill('SIGTERM');assert.equal(await ended,130);
  }finally{if(collector.exitCode===null)collector.kill('SIGKILL');await ended;}
}));
