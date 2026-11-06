/** Persiste operações SQLite; consultas usam abertura somente leitura, sem criação. */
import { decodeHistoryCursor, encodeHistoryCursor } from './history-page';
import { Database } from 'bun:sqlite';
import { chmodSync, existsSync, lstatSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
export type OperationStatus = 'running' | 'succeeded' | 'failed' | 'cancelled' | 'interrupted';
export interface Operation { id: string; status: OperationStatus; started_at: string; finished_at: string | null; }
/** Abre estado explicitamente para escrita ou consulta; recusa links e schema futuro. */
export class StateStore {
  private db: Database;
  constructor(readonly path: string, private writable = false) {
    if (!existsSync(path) && !writable) throw new Error("State does not exist yet.");
    if (existsSync(path) && (!lstatSync(path).isFile() || lstatSync(path).isSymbolicLink())) throw new Error("Invalid state file.");
    if (writable) mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.db = new Database(path, writable ? { create: true } : { readonly: true });
    try {
      this.db.exec('PRAGMA busy_timeout = 3000');
      this.db.exec('PRAGMA foreign_keys = ON');
      const version = (this.db.query('PRAGMA user_version').get() as { user_version: number }).user_version;
      if (version > 3) throw new Error("State schema is newer than this application.");
      if (version === 0 && !writable) throw new Error("State schema is not initialized.");
      if (writable) {
        chmodSync(path, 0o600);
        this.db.exec('PRAGMA journal_mode = WAL');
        if (version === 0) this.db.transaction(() => {
          this.db.exec(`CREATE TABLE operations (id TEXT PRIMARY KEY, status TEXT NOT NULL CHECK(status IN ('running','succeeded','failed','cancelled','interrupted')), started_at TEXT NOT NULL, finished_at TEXT); CREATE UNIQUE INDEX single_running ON operations(status) WHERE status = 'running'; PRAGMA user_version = 1`);
        })();
        if (version < 2) this.db.transaction(() => {
          this.db.exec(`CREATE TABLE operation_steps (operation_id TEXT NOT NULL REFERENCES operations(id), id TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('running','succeeded','failed','cancelled','interrupted')), exit_code INTEGER, started_at TEXT NOT NULL, finished_at TEXT, PRIMARY KEY(operation_id,id)); PRAGMA user_version = 2`);
        })();
        if (version < 3) this.db.transaction(() => {
          this.db.exec('CREATE TABLE managed_components (id TEXT PRIMARY KEY, version TEXT NOT NULL, location TEXT NOT NULL, operation_id TEXT NOT NULL REFERENCES operations(id)); PRAGMA user_version=3');
        })();
      }
    } catch (error) { this.db.close(); throw error; }
  }
  /** Usado pelo executor somente após adquirir seu lock exclusivo de processo. */
  reconcileInterrupted():number{
    this.requireWrite();
    return this.db.transaction(()=>{
      const timestamp=new Date().toISOString();
      this.db.query("UPDATE operation_steps SET status='interrupted',finished_at=? WHERE status='running' AND operation_id IN (SELECT id FROM operations WHERE status='running')").run(timestamp);
      return this.db.query("UPDATE operations SET status='interrupted',finished_at=? WHERE status='running'").run(timestamp).changes;
    })();
  }
  /** Inicia uma operação; o índice parcial impede duas execuções simultâneas. */
  start(id: string): void {
    this.requireWrite();
    if (!id.trim()) throw new Error("Empty operation ID.");
    this.db.query("INSERT INTO operations VALUES (?, 'running', ?, NULL)").run(id, new Date().toISOString());
  }
  /** Finaliza apenas operações ainda em execução, sem sobrescrever resultados anteriores. */
  finish(id: string, status: Exclude<OperationStatus, 'running'>): void {
    this.requireWrite();
    this.db.transaction(() => {
      const pending = this.db.query("SELECT id FROM operation_steps WHERE operation_id=? AND status='running' LIMIT 1").get(id);
      if (status === 'succeeded' && pending) throw new Error("Some steps are still running.");
      const timestamp = new Date().toISOString();
      const result = this.db.query("UPDATE operations SET status = ?, finished_at = ? WHERE id = ? AND status = 'running'").run(status, timestamp, id);
      if (result.changes !== 1) throw new Error("Operation is missing or already finished.");
      if (pending) this.db.query("UPDATE operation_steps SET status=?, finished_at=? WHERE operation_id=? AND status='running'").run(status,timestamp,id);
    })();
  }
  /** Retorna histórico limitado e ordenado; não altera schema ou arquivos. */
  list(limit = 100): Operation[] {
    if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new Error("Invalid limit.");
    return this.db.query('SELECT * FROM operations ORDER BY started_at DESC, id LIMIT ?').all(limit) as Operation[];
  }
  /** Pagina por horário e ID em ordem decrescente; o cursor exclui a última linha anterior. */
  page(limit=100,cursor?:string):{operations:Operation[];nextCursor:string|null}{
    if(!Number.isInteger(limit)||limit<1||limit>1000)throw new Error("Invalid limit.");
    const position=cursor?decodeHistoryCursor(cursor):null;
    const rows=(position?this.db.query('SELECT * FROM operations WHERE started_at<? OR (started_at=? AND id<?) ORDER BY started_at DESC,id DESC LIMIT ?').all(position.startedAt,position.startedAt,position.id,limit+1):this.db.query('SELECT * FROM operations ORDER BY started_at DESC,id DESC LIMIT ?').all(limit+1)) as Operation[];
    const more=rows.length>limit;const operations=rows.slice(0,limit);const last=operations.at(-1);
    return{operations,nextCursor:more&&last?encodeHistoryCursor({startedAt:last.started_at,id:last.id}):null};
  }
  /** Registra início sem armazenar comandos ou argumentos potencialmente sensíveis. */
  startStep(operationId: string, id: string): void {
    this.requireWrite();
    const operation = this.db.query("SELECT id FROM operations WHERE id = ? AND status = 'running'").get(operationId);
    if (!operation) throw new Error("Operation is not running.");
    this.db.query("INSERT INTO operation_steps VALUES (?, ?, 'running', NULL, ?, NULL)").run(operationId,id,new Date().toISOString());
  }
  /** Finaliza uma etapa uma única vez e preserva o código de saída observado. */
  finishStep(operationId: string, id: string, status: Exclude<OperationStatus,'running'>, exitCode: number | null): void {
    this.requireWrite();
    const result=this.db.query("UPDATE operation_steps SET status=?, exit_code=?, finished_at=? WHERE operation_id=? AND id=? AND status='running'").run(status,exitCode,new Date().toISOString(),operationId,id);
    if(result.changes !== 1) throw new Error("Step is missing or already finished.");
  }
  /** Consulta uma operação por ID sem limitar a busca à página mais recente. */
  get(id: string): Operation | null {
    return this.db.query('SELECT * FROM operations WHERE id=?').get(id) as Operation | null;
  }
  /** Retorna etapas na ordem de início sem alterar o banco. */
  steps(operationId: string): {id:string;status:OperationStatus;exit_code:number|null}[] {
    if (!(this.db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='operation_steps'").get())) return [];
    return this.db.query('SELECT id,status,exit_code FROM operation_steps WHERE operation_id=? ORDER BY rowid').all(operationId) as {id:string;status:OperationStatus;exit_code:number|null}[];
  }
  /** Registra propriedade somente após uma operação de instalação concluída. */
  registerManaged(component:{id:string;version:string;location:string;operationId:string}):void{
    this.requireWrite();
    if(!/^[a-z][a-z0-9-]*$/.test(component.id)||!component.version.trim()||!component.location.startsWith('/')||component.location.includes('\0'))throw new Error("Invalid ownership record.");
    const operation=this.get(component.operationId);
    if(operation?.status!=='succeeded')throw new Error("Ownership requires a successful operation.");
    this.db.query('INSERT INTO managed_components VALUES (?,?,?,?)').run(component.id,component.version,component.location,component.operationId);
  }
  /** Registra recursos da mesma entrega em uma transação, sem propriedade parcial. */
  registerManagedMany(components:{id:string;version:string;location:string;operationId:string}[]):void{
    this.requireWrite();
    if(!components.length)throw new Error("Empty ownership list.");
    this.db.transaction(()=>{for(const component of components)this.registerManaged(component);})();
  }
  /** Atualiza propriedade apenas se versão e localização anteriores ainda correspondem. */
  updateManaged(component:{id:string;version:string;location:string;operationId:string},previous:{version:string;location:string}):void{
    this.requireWrite();
    if(!/^[a-z][a-z0-9-]*$/.test(component.id)||!component.version.trim()||!component.location.startsWith('/')||component.location.includes('\0'))throw new Error("Invalid ownership record.");
    this.db.transaction(()=>{
      if(this.get(component.operationId)?.status!=='succeeded')throw new Error("Ownership requires a successful operation.");
      const result=this.db.query('UPDATE managed_components SET version=?,location=?,operation_id=? WHERE id=? AND version=? AND location=?').run(component.version,component.location,component.operationId,component.id,previous.version,previous.location);
      if(result.changes!==1)throw new Error("Ownership changed during the operation.");
    })();
  }
  /** Ausência significa propriedade não comprovada, independentemente da descoberta no host. */
  /** Remove somente o vínculo exato após uma operação de desinstalação bem-sucedida. */
  forgetManaged(id:string,operationId:string,previous:{version:string;location:string}):void{
    this.requireWrite();
    this.db.transaction(()=>{
      if(this.get(operationId)?.status!=='succeeded')throw new Error('Ownership removal requires a successful operation.');
      const result=this.db.query('DELETE FROM managed_components WHERE id=? AND version=? AND location=?').run(id,previous.version,previous.location);
      if(result.changes!==1)throw new Error('Ownership changed during uninstallation.');
    })();
  }
  /** Consulta propriedade por localização exata sem adotar recursos encontrados no host. */
  managedAt(location:string):{id:string;version:string;location:string;operation_id:string}|null{
    const table=this.db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='managed_components'").get();
    if(!table)return null;
    return this.db.query('SELECT * FROM managed_components WHERE location=?').get(location) as {id:string;version:string;location:string;operation_id:string}|null;
  }
  managed(id:string):{id:string;version:string;location:string;operation_id:string}|null{
    const table=this.db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='managed_components'").get();
    if(!table)return null;
    return this.db.query('SELECT * FROM managed_components WHERE id=?').get(id) as {id:string;version:string;location:string;operation_id:string}|null;
  }
  /** Exporta snapshot SQLite consistente; destino existente é recusado sem sobrescrita. */
  backup(destination: string): void {
    const snapshot = this.db.serialize();
    writeFileSync(destination, snapshot, { flag: 'wx', mode: 0o600 });
  }
  close(): void { this.db.close(); }
  private requireWrite(): void { if (!this.writable) throw new Error("State is read only."); }
}
