/** Consulta o vínculo local de um container sem criar banco nem alterar o Docker. */
import { existsSync } from 'node:fs';
import { statePath } from './history';
import { StateStore } from './state';
/** O executor verifica novamente o ID e a label antes de executar qualquer ação. */
export function serviceOwner(containerId:string,path=statePath()):string|null {
  if(!/^[a-f0-9]{12,64}$/.test(containerId))throw new Error("Invalid Docker ID.");
  if(!existsSync(path))return null;
  const store=new StateStore(path);
  try{return store.managedAt('/docker/'+containerId)?.id??null;}finally{store.close();}
}
