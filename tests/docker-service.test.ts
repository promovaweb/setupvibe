/** Valida argumentos sem criar containers ou volumes no host. */
import{expect,test}from'bun:test';
import{planDockerService}from'../src/adapters/docker-service';
const target={edition:'desktop' as const,system:'linux',arch:'x64'};
const request={id:'redis' as const,image:'redis@sha256:'+'a'.repeat(64),port:6379,volume:'setupvibe-redis'};
test("Portainer Server aceita Server com HTTPS local, volume e consent do socket",()=>{
 const portainer={id:'portainer' as const,image:'portainer/portainer-ce@sha256:'+'a'.repeat(64),port:9443,volume:'setupvibe-portainer',portainer:{socketPath:'/var/run/docker.sock',allowDockerSocket:true}};
 const step=planDockerService(portainer,{...target,edition:'server'},[],[]);
 expect(step.args).toContain('127.0.0.1:9443:9443');expect(step.args).toContain('type=volume,source=setupvibe-portainer,target=/data');expect(step.args).toContain('type=bind,source=/var/run/docker.sock,target=/var/run/docker.sock');
 expect(step.args).not.toContain('--privileged');expect(()=>planDockerService({...portainer,portainer:{...portainer.portainer,allowDockerSocket:false}},target,[],[])).toThrow(new RegExp("consent","i"));
 expect(()=>planDockerService({...portainer,image:'portainer/agent@sha256:'+'a'.repeat(64)},target,[],[])).toThrow(new RegExp("catalog","i"));
});
test('Redis usa loopback, volume e imagem imutável',()=>{const step=planDockerService(request,target,[],[]);expect(step.args).toContain('127.0.0.1:6379:6379');expect(step.args).toContain('type=volume,source=setupvibe-redis,target=/data');expect(step.args.at(-1)).toBe(request.image);});
test('recusa conflitos e configuração insegura',()=>{expect(()=>planDockerService(request,target,['setupvibe-redis'],[])).toThrow(new RegExp("ownership","i"));expect(()=>planDockerService(request,target,[],[6379])).toThrow(new RegExp("in use","i"));expect(()=>planDockerService({...request,image:'redis:latest'},target,[],[])).toThrow(new RegExp("digest","i"));expect(()=>planDockerService(request,{...target,edition:'server'},[],[])).toThrow(new RegExp("Desktop","i"));});
test('Mailpit publica web e SMTP em loopback e recusa conflito entre portas',()=>{
 const mailpit={id:'mailpit' as const,image:'axllent/mailpit@sha256:'+'a'.repeat(64),port:8025};const step=planDockerService(mailpit,target,[],[]);expect(step.args).toContain('127.0.0.1:8025:8025');expect(step.args).toContain('127.0.0.1:1025:1025');expect(()=>planDockerService(mailpit,target,[],[1025])).toThrow(new RegExp("SMTP port is in use","i"));expect(()=>planDockerService({...mailpit,smtpPort:8025},target,[],[])).toThrow(new RegExp("Invalid SMTP port","i"));
});
