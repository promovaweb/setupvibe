/** Exercita recusas antes de chamar Docker, sem modificar containers do host. */
import{expect,test}from'bun:test';
import{mkdtempSync,rmSync,existsSync}from'node:fs';
import{join}from'node:path';
import{tmpdir}from'node:os';
import{controlManagedContainer}from'../src/core/container-operation';
test('controle sem confirmação não cria estado',async()=>{const dir=mkdtempSync(join(tmpdir(),'setupvibe-control-')),path=join(dir,'state.db');try{await expect(controlManagedContainer('redis','stop',{confirmed:false,path})).rejects.toThrow(new RegExp("confirmation","i"));expect(existsSync(path)).toBe(false);}finally{rmSync(dir,{recursive:true,force:true});}});
test("controle sem ownership é recusado",async()=>{const dir=mkdtempSync(join(tmpdir(),'setupvibe-control-')),path=join(dir,'state.db');try{await expect(controlManagedContainer('redis','stop',{confirmed:true,path})).rejects.toThrow(new RegExp("ownership","i"));}finally{rmSync(dir,{recursive:true,force:true});}});
test('controle integrado confirma estado posterior sem daemon real',async()=>{
 const{writeFileSync,chmodSync}=await import('node:fs');const{StateStore}=await import('../src/core/state');
 const dir=mkdtempSync(join(tmpdir(),'setupvibe-control-flow-')),path=join(dir,'state.db'),binary=join(dir,'docker'),flag=join(dir,'running'),id='a'.repeat(64);
 const source='#!'+process.execPath+'\n'+`const fs=require('node:fs'),flag=${JSON.stringify(flag)};if(process.argv[2]==='inspect')console.log(JSON.stringify([{Id:${JSON.stringify(id)},Name:'/setupvibe-redis',Config:{Image:'redis',Labels:{'dev.setupvibe.managed':'true'}},State:{Running:fs.existsSync(flag)}}]));else if(process.argv[2]==='start')fs.writeFileSync(flag,'yes');else if(process.argv[2]==='stop')fs.rmSync(flag,{force:true});`;
 try{writeFileSync(binary,source);chmodSync(binary,0o700);const store=new StateStore(path,true);store.start('install');store.finish('install','succeeded');store.registerManaged({id:'redis',version:'1',location:'/docker/'+id,operationId:'install'});store.close();const started=await controlManagedContainer('redis','start',{confirmed:true,path,executable:binary});expect(started.status).toBe('succeeded');const stopped=await controlManagedContainer('redis','stop',{confirmed:true,path,executable:binary});expect(stopped.status).toBe('succeeded');const restart=await controlManagedContainer('redis','restart',{confirmed:true,path,executable:binary});expect(restart.status).toBe('failed');}
 finally{rmSync(dir,{recursive:true,force:true});}
});
