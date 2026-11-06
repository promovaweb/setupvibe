/** Verifica identidade sem acessar volumes reais do host. */
import{expect,test}from'bun:test';
import{parseVolumeIdentity,assertManagedVolume,inspectVolume}from'../src/core/docker-volume';
test('volume exige label e nome exatos',()=>{const volume=parseVolumeIdentity(JSON.stringify([{Name:'setupvibe-redis',Driver:'local',Labels:{'dev.setupvibe.managed':'true'}}]));expect(()=>assertManagedVolume(volume,'setupvibe-redis')).not.toThrow();expect(()=>assertManagedVolume({...volume,managed:false},'setupvibe-redis')).toThrow(new RegExp("external","i"));expect(()=>assertManagedVolume(volume,'setupvibe-other')).toThrow(new RegExp("mismatch","i"));});
test("inspeção invalid não vira volume missing",async()=>{expect(()=>parseVolumeIdentity('[]')).toThrow(new RegExp("invalid","i"));await expect(inspectVolume('setupvibe-redis','/missing/docker')).rejects.toThrow(new RegExp("inspect","i"));await expect(inspectVolume('--help')).rejects.toThrow(new RegExp("name","i"));});
test("volume criado precisa corresponder à current operation",async()=>{
 const{volumeCreateStep,assertCreatedVolume}=await import('../src/core/docker-volume');const volume={name:'setupvibe-redis',driver:'local',managed:true,operationId:'operation-a'};expect(volumeCreateStep(volume.name,'operation-a').args).toContain('dev.setupvibe.operation=operation-a');expect(()=>assertCreatedVolume(volume,volume.name,'operation-a')).not.toThrow();expect(()=>assertCreatedVolume(volume,volume.name,'operation-b')).toThrow(new RegExp("current operation","i"));
});
