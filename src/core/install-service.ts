/** Cria serviço após prévia e registra container e volume inspecionados. */
import{validateCredentialFile}from'./credential-file';
import{volumeCreateStep,inspectVolume,assertCreatedVolume}from'./docker-volume';
import{previewDockerService,type ServiceRequest}from'../adapters/docker-service';
import{discoverContainers,inspectContainer}from'./docker';
import{installationPreflight}from'./preflight';
import{executeSteps}from'./executor';
import{StateStore}from'./state';
import{statePath}from'./history';
import type{Target}from'./platform';
/** Credenciais PostgreSQL usam arquivo privado persistente; volumes exigem propriedade própria. */
export async function installService(request:ServiceRequest,target:Target,options:{confirmed:boolean;path?:string;signal?:AbortSignal}){
 if(!options.confirmed)throw new Error("Explicit confirmation required.");
 if(request.id==='postgresql'){if(!request.postgres)throw new Error("PostgreSQL requires protected credentials.");validateCredentialFile(request.postgres.passwordFile);}
 const repository=request.id==='portainer'?'portainer/portainer-ce':request.id==='postgresql'?'postgres':request.id==='redis'?'redis':'axllent/mailpit';
 if(!request.image.startsWith(repository+'@sha256:'))throw new Error("Service image is outside the catalog.");
 await installationPreflight(target);const preview=await previewDockerService(request,target);
 const store=new StateStore(options.path??statePath(),true);let containerId:string|null=null;
 try{
  if(store.managed(request.id))throw new Error("Service already registered; use a managed update.");
  const existingVolume=store.managed(request.id+'-volume');
  if(existingVolume&&existingVolume.location!=='/docker-volume/'+request.volume)throw new Error('Use the previously managed volume to reinstall this service.');
  if(existingVolume)assertCreatedVolume(await inspectVolume(request.volume!),request.volume!,existingVolume.operation_id);
  const operationId=crypto.randomUUID();
  const volume=request.id!=='mailpit'?request.volume!:null;
  const steps=[{id:'pull-'+request.id,command:'docker',args:['pull',request.image]},...(volume&&!existingVolume?[volumeCreateStep(volume,operationId)]:[]),preview.step];
  const result=await executeSteps(store,steps,{id:operationId,confirmed:true,signal:options.signal,beforeStep:async step=>{if(step.id===preview.step.id){if(volume)assertCreatedVolume(await inspectVolume(volume),volume,existingVolume?.operation_id??operationId);if(request.id==='postgresql')validateCredentialFile(request.postgres!.passwordFile);}},verify:async()=>{
   const discovered=await discoverContainers();if(!discovered.available)throw new Error("Docker unavailable after creation.");
   const container=discovered.containers.find(item=>item.name==='setupvibe-'+request.id);if(!container)throw new Error("Created container not found.");
   const identity=await inspectContainer(container.id);
   if(!identity.managed||identity.image!==request.image)throw new Error("Created container identity mismatch.");
   containerId=identity.id;
  }});
  if(result.status==='succeeded'&&containerId){
   const components:{id:string;version:string;location:string;operationId:string}[]=[{id:request.id,version:request.image,location:'/docker/'+containerId,operationId:result.id}];
   if(volume&&!existingVolume)components.push({id:request.id+'-volume',version:'1',location:'/docker-volume/'+volume,operationId:result.id});
   store.registerManagedMany(components);
  }
  return result;
 }finally{store.close();}
}
