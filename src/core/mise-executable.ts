/** Resolve o mise registrado pelo SetupVibe sem alterar o PATH ou adotar fornecedores externos. */
import {existsSync} from 'node:fs';
import {StateStore} from './state';
import {statePath} from './history';
/** Sem registro próprio, mantém a descoberta convencional pelo PATH. */
export function miseExecutable(path=statePath()):string{
  if(!existsSync(path))return 'mise';
  const store=new StateStore(path);
  try{return store.managed('mise')?.location??'mise';}finally{store.close();}
}
