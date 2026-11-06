/** Mantém amostras em banco independente, com retenção aplicada durante a gravação. */
import { Database } from 'bun:sqlite';
import { existsSync, mkdirSync, lstatSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';
import type { HostSample } from './metrics';
import {validateContainerMetrics} from './container-metrics';
const retention = 7 * 24 * 60 * 60 * 1000;
/** Consultas não criam banco; escrita precisa ser explicitamente habilitada. */
export class MetricsStore {
  private db: Database;
  constructor(path: string, private writable = false) {
    if (!writable && !existsSync(path)) throw new Error("Metrics database is missing.");
    if (existsSync(path) && (!lstatSync(path).isFile() || lstatSync(path).isSymbolicLink())) throw new Error("Invalid metrics file.");
    if (writable) mkdirSync(dirname(path),{recursive:true,mode:0o700});
    this.db=new Database(path,writable?{create:true}:{readonly:true});
    try {
      this.db.exec('PRAGMA busy_timeout=3000');
      const version=(this.db.query('PRAGMA user_version').get() as {user_version:number}).user_version;
      if (version>1) throw new Error("Metrics schema is newer than this application.");
      if (!version && !writable) throw new Error("Metrics schema is missing.");
      if(writable){
        chmodSync(path,0o600);this.db.exec('PRAGMA journal_mode=WAL');
        if(!version)this.db.transaction(()=>this.db.exec('CREATE TABLE host_samples (id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp_ms INTEGER NOT NULL, payload TEXT NOT NULL); CREATE INDEX sample_time ON host_samples(timestamp_ms); PRAGMA user_version=1'))();
      }
    }catch(error){this.db.close();throw error;}
  }
  /** Grava somente valores válidos; limpeza e inserção compartilham a transação. */
  append(sample: HostSample, now=Date.now()): void {
    if(!this.writable)throw new Error("Metrics are read only.");
    const time=Date.parse(sample.timestamp);
    if(!Number.isFinite(now)||!Number.isFinite(time)||time>now||time<now-retention)throw new Error("Invalid sample timestamp.");
    if(sample.cpuPercent!==null&&(!Number.isFinite(sample.cpuPercent)||sample.cpuPercent<0||sample.cpuPercent>100))throw new Error("Invalid CPU value.");
    if(sample.docker)validateContainerMetrics(sample.docker,now);
    if(![sample.memoryTotal,sample.memoryUsed,sample.uptimeSeconds].every(value=>Number.isFinite(value)&&value>=0)||sample.memoryUsed>sample.memoryTotal)throw new Error("Invalid metric.");
    if(sample.swap && (![sample.swap.total,sample.swap.used].every(value=>Number.isSafeInteger(value)&&value>=0)||sample.swap.used>sample.swap.total))throw new Error("Invalid swap values.");
    if(sample.disk && (typeof sample.disk.path!=='string'||!sample.disk.path.trim()||![sample.disk.total,sample.disk.available,sample.disk.used].every(value=>Number.isSafeInteger(value)&&value>=0)||sample.disk.used>sample.disk.total||sample.disk.available>sample.disk.total))throw new Error("Invalid disk values.");
    this.db.transaction(()=>{
      this.db.query('INSERT INTO host_samples(timestamp_ms,payload) VALUES (?,?)').run(time,JSON.stringify(sample));
      this.db.query('DELETE FROM host_samples WHERE timestamp_ms < ?').run(now-retention);
    })();
  }
  /** Cursor monotônico evita repetir amostras em consultas incrementais. */
  list(after=0,limit=100,now=Date.now()): {id:number;sample:HostSample}[] {
    if(!Number.isSafeInteger(after)||after<0||!Number.isInteger(limit)||limit<1||limit>1000||!Number.isFinite(now))throw new Error("Invalid metrics query.");
    const rows=this.db.query('SELECT id,payload FROM host_samples WHERE id>? AND timestamp_ms>=? AND timestamp_ms<=? ORDER BY id LIMIT ?').all(after,now-retention,now,limit) as {id:number;payload:string}[];
    return rows.map(row=>({id:row.id,sample:JSON.parse(row.payload)}));
  }
  /** Retorna a última amostra dentro da retenção sem percorrer todas as páginas. */
  latest(now=Date.now()): {id:number;sample:HostSample}|null {
    if(!Number.isFinite(now))throw new Error("Invalid clock.");
    const row=this.db.query('SELECT id,payload FROM host_samples WHERE timestamp_ms>=? AND timestamp_ms<=? ORDER BY timestamp_ms DESC,id DESC LIMIT 1').get(now-retention,now) as {id:number;payload:string}|null;
    return row?{id:row.id,sample:JSON.parse(row.payload)}:null;
  }
  close():void {this.db.close();}
}
