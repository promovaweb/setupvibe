/** Executa controle somente sobre container com identidade e propriedade comprovadas. */
import{StateStore}from'./state';
import{statePath}from'./history';
import{inspectContainer,containerControl}from'./docker';
import{executeSteps}from'./executor';
/** A localização registrada deve ser /docker/<id completo>, criada pelo instalador de serviços. */
export async function controlManagedContainer(componentId:string,action:'start'|'stop'|'restart',options:{confirmed:boolean;path?:string;signal?:AbortSignal;executable?:string}){
 if(!options.confirmed)throw new Error("Explicit confirmation required.");
 const store=new StateStore(options.path??statePath(),true);
 try{
  const component=store.managed(componentId);
  if(!component||!component.location.startsWith('/docker/'))throw new Error("Docker ownership is not verified.");
  const id=component.location.slice('/docker/'.length),identity=await inspectContainer(id,options.executable??'docker');
  const command=containerControl(identity,id,action);command.command=options.executable??'docker';
  return await executeSteps(store,[{id:`${action}-${componentId}`,...command}],{confirmed:true,signal:options.signal,verify:async()=>{
   const after=await inspectContainer(id,options.executable??'docker');containerControl(after,id,action);
   const expected=action!=='stop';if(after.running!==expected)throw new Error("Container state does not match the operation.");
  }});
 }finally{store.close();}
}
