/** Exclusão entre coletores por transação SQLite em arquivo auxiliar privado. */
import { Database } from 'bun:sqlite';
import { chmodSync, existsSync, lstatSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
/** Mantém a conexão aberta; o sistema libera o lock mesmo após término abrupto. */
export function acquireCollectorLock(path: string, owner = "collector"): () => void {
  mkdirSync(dirname(path),{recursive:true,mode:0o700});
  if(existsSync(path)&&(!lstatSync(path).isFile()||lstatSync(path).isSymbolicLink()))throw new Error("Invalid lock file.");
  const db=new Database(path,{create:true});
  try {
    chmodSync(path,0o600);
    db.exec('PRAGMA busy_timeout=0');
    db.exec('BEGIN IMMEDIATE');
  } catch {db.close();throw new Error(`Another ${owner} is active or the lock could not be acquired.`);}
  let closed=false;
  return ()=>{if(!closed){closed=true;try{db.exec('ROLLBACK');}finally{db.close();}}};
}
