/** Fornece consulta incremental de métricas sem criar banco ou executar coletor. */
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { statePath } from './history';
import { MetricsStore } from './metrics-store';
export const metricsPath = () => join(dirname(statePath()), 'metrics.db');
/** Expõe cursor da última amostra e ausência explícita, sem transformar ausência em zero. */
export function readMetrics(after=0,limit=100,path=metricsPath()) {
  if(!Number.isSafeInteger(after)||after<0||!Number.isInteger(limit)||limit<1||limit>1000)throw new Error("Invalid metrics query.");
  if(!existsSync(path))return {samples:[],nextCursor:after};
  const store=new MetricsStore(path);
  try {const samples=store.list(after,limit);return {samples,nextCursor:samples.at(-1)?.id??after};}
  finally {store.close();}
}

/** Classifica a última leitura sem presumir que o coletor esteja ativo. */
export function latestMetrics(path=metricsPath(),now=Date.now(),staleAfterMs=15000) {
  if(!Number.isFinite(now)||!Number.isFinite(staleAfterMs)||staleAfterMs<0)throw new Error("Invalid clock or freshness limit.");
  if(!existsSync(path))return null;
  const store=new MetricsStore(path);
  try {const row=store.latest(now);return row?{...row,stale:now-Date.parse(row.sample.timestamp)>staleAfterMs}:null;}
  finally {store.close();}
}
