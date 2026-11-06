/** Consulta histórico sem criar diretórios; erros de bancos existentes são preservados. */
import { decodeHistoryCursor } from './history-page';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, isAbsolute } from 'node:path';
import { StateStore, type Operation } from './state';
/** Usa diretório explícito ou XDG absoluto; ignora XDG relativo conforme a especificação. */
export function statePath(): string {
  const override = process.env.SETUPVIBE_STATE_DIR;
  if (override && !isAbsolute(override)) throw new Error('SETUPVIBE_STATE_DIR must be absolute.');
  const xdg = process.env.XDG_STATE_HOME;
  return join(override ?? join(xdg && isAbsolute(xdg) ? xdg : join(homedir(), '.local', 'state'), 'setupvibe'), 'state.db');
}
/** Banco ausente representa histórico vazio; banco corrompido continua sendo erro. */
export function readHistory(path = statePath(), limit = 100): Operation[] {
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new Error("Invalid limit.");
  if (!existsSync(path)) return [];
  const store = new StateStore(path);
  try { return store.list(limit); } finally { store.close(); }
}

/** Consulta uma operação específica e suas etapas sem criar banco ausente. */
export function readOperation(id: string, path = statePath()) {
  if (!id.trim()) throw new Error("Empty operation ID.");
  if (!existsSync(path)) return null;
  const store = new StateStore(path);
  try {
    const operation = store.get(id);
    return operation ? { ...operation, steps: store.steps(id) } : null;
  } finally { store.close(); }
}

/** Lê uma página sem criar banco; valida cursor mesmo quando ainda não existe histórico. */
export function readHistoryPage(cursor?:string,path=statePath(),limit=100) {
  if(cursor)decodeHistoryCursor(cursor);
  if(!Number.isInteger(limit)||limit<1||limit>1000)throw new Error("Invalid limit.");
  if(!existsSync(path))return{operations:[],nextCursor:null};
  const store=new StateStore(path);
  try{return store.page(limit,cursor);}finally{store.close();}
}
