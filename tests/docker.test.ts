/** Testa respostas Docker sem iniciar daemon ou containers no host. */
import{expect,test}from'bun:test';
import{parseContainers,discoverContainers}from'../src/core/docker';
test("parser mantém estado, imagem e portas sem assumir ownership",()=>{expect(parseContainers(JSON.stringify({ID:'abc',Names:'db',Image:'postgres:17',State:'running',Status:'Up',Ports:'127.0.0.1:5432->5432/tcp'}))).toEqual([{id:'abc',name:'db',image:'postgres:17',state:'running',status:'Up',ports:'127.0.0.1:5432->5432/tcp'}]);expect(parseContainers('')).toEqual([]);expect(()=>parseContainers('{bad')).toThrow();expect(()=>parseContainers('{}')).toThrow();});
test("executável missing é indisponibilidade, sem inventar containers",async()=>{expect(await discoverContainers('/nonexistent/setupvibe-docker')).toEqual({available:false,containers:[]});});
test('controle exige label gerenciada e ID registrado correspondente',async()=>{
 const{parseContainerIdentity,containerControl}=await import('../src/core/docker');const id='a'.repeat(64);
 const identity=parseContainerIdentity(JSON.stringify([{Id:id,Name:'/setupvibe-redis',Config:{Image:'redis@sha256:abc',Labels:{'dev.setupvibe.managed':'true'}}}]));
 expect(containerControl(identity,id,'start')).toEqual({command:'docker',args:['start',id]});expect(()=>containerControl({...identity,managed:false},id,'stop')).toThrow(new RegExp("external","i"));expect(()=>containerControl(identity,'b'.repeat(64),'restart')).toThrow(new RegExp("mismatch","i"));expect(()=>parseContainerIdentity('[]')).toThrow(new RegExp("invalid","i"));
});
test("inspeção distingue container parado de estado missing",async()=>{
 const{parseContainerIdentity}=await import('../src/core/docker');const row={Id:'a'.repeat(64),Name:'/redis',Config:{Image:'redis',Labels:{}}};expect(parseContainerIdentity(JSON.stringify([{...row,State:{Running:false}}])).running).toBe(false);expect(parseContainerIdentity(JSON.stringify([row])).running).toBeNull();
});
