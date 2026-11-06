/** Garante recusa antes de acessar Docker ou criar estado em fluxos incompletos. */
import{expect,test}from'bun:test';
import{installService}from'../src/core/install-service';
const target={edition:'desktop' as const,system:'linux',arch:'x64'};
test("criação exige confirmação e imagem do catalog",async()=>{const request={id:'mailpit' as const,image:'axllent/mailpit@sha256:'+'a'.repeat(64),port:8025};await expect(installService(request,target,{confirmed:false})).rejects.toThrow(new RegExp("confirmation","i"));await expect(installService({...request,image:'other/image@sha256:'+'a'.repeat(64)},target,{confirmed:true})).rejects.toThrow(new RegExp("catalog","i"));});
test("PostgreSQL aguarda credentials",async()=>{await expect(installService({id:'postgresql',image:'postgres@sha256:'+'a'.repeat(64),port:6379,volume:'setupvibe-redis'},target,{confirmed:true})).rejects.toThrow(new RegExp("credentials","i"));});
