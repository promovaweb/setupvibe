/** Executa etapas sequenciais com argumentos isolados e estado terminal persistido. */
import { acquireCollectorLock } from './collector-lock';
import { SecretRedactor } from './redactor';
import { spawn } from 'node:child_process';
import { StateStore, type OperationStatus } from './state';
export interface CommandStep { id: string; command: string; args: string[]; cwd?: string; input?: string; }
export interface StepResult { id: string; exitCode: number | null; status: 'succeeded' | 'failed' | 'cancelled'; }
export interface ExecutionResult { id: string; status: Exclude<OperationStatus, 'running' | 'interrupted'>; steps: StepResult[]; }
export interface ExecutionEvent {type:'operation-started'|'step-started'|'step-finished'|'operation-finished';operationId:string;stepId?:string;status?:OperationStatus;exitCode?:number|null;}
/** Filtra segredos conhecidos antes de entregar saída limitada aos observadores. */
function runStep(step: CommandStep, signal: AbortSignal, timeoutMs: number, logging: {secrets:string[];onLog?:(stepId:string,stream:'stdout'|'stderr',text:string)=>void}): Promise<StepResult> {
  return new Promise(resolve => {
    if (signal.aborted) return resolve({ id: step.id, exitCode: null, status: 'cancelled' });
    const child = spawn(step.command, step.args, { cwd: step.cwd, shell: false, stdio: ['pipe','pipe','pipe'], detached: process.platform !== 'win32' });
    for (const name of ['stdout','stderr'] as const) {
      const stream=child[name],redactor=new SecretRedactor([...logging.secrets,...(step.input?[step.input]:[])]);
      let delivered=0;
      const emit=(text:string)=>{if(!logging.onLog||delivered>=65536)return;const safe=text.slice(0,65536-delivered);delivered+=safe.length;try{logging.onLog(step.id,name,safe);}catch{/* Observador não controla execução. */}};
      stream.setEncoding('utf8');stream.on('data',(text:string)=>emit(redactor.push(text)));stream.on('end',()=>emit(redactor.flush()));
    }
    // Credenciais recebidas por stdin não entram em eventos ou registros SQLite.
    child.stdin.on('error', () => { /* O consumidor pode encerrar antes de ler toda a entrada. */ });
    child.stdin.end(step.input);
    let cancelled = false, timedOut = false, escalation: ReturnType<typeof setTimeout> | undefined;
    const kill = (force = false) => {
      if (!child.pid) return;
      try { if (process.platform !== 'win32') process.kill(-child.pid, force ? 'SIGKILL' : 'SIGTERM'); else child.kill(force ? 'SIGKILL' : 'SIGTERM'); } catch { /* O processo pode já ter encerrado. */ }
    };
    let escalationDone: Promise<void> | undefined;
    const stop = () => {
      if (escalationDone) return;
      kill();
      escalationDone = new Promise<void>(done => { escalation = setTimeout(() => { kill(true); done(); }, 250); });
    };
    const abort = () => { cancelled = true; stop(); };
    signal.addEventListener('abort', abort, { once: true });
    const timeout = setTimeout(() => { timedOut = true; stop(); }, timeoutMs);
    let settled = false;
    const finish = (exitCode: number | null) => {
      if (settled) return; settled = true;
      clearTimeout(timeout);
      signal.removeEventListener('abort', abort);
      // Aguarda a limpeza do grupo mesmo se o processo principal já saiu.
      void (escalationDone ?? Promise.resolve()).then(() => resolve({ id: step.id, exitCode, status: cancelled ? 'cancelled' : !timedOut && exitCode === 0 ? 'succeeded' : 'failed' }));
    };
    child.once('error', () => finish(null));
    child.once('close', code => finish(code));
    if (signal.aborted) abort();
  });
}
/** Exige confirmação antes de criar operação; interrompe a sequência na primeira falha. */
export async function executeSteps(store: StateStore, steps: CommandStep[], options: { confirmed: boolean; signal?: AbortSignal; timeoutMs?: number; id?: string; beforeStep?:(step:CommandStep)=>Promise<void>; verify?:()=>Promise<void>; onEvent?: (event:ExecutionEvent)=>void; secrets?:string[]; onLog?:(stepId:string,stream:'stdout'|'stderr',text:string)=>void }): Promise<ExecutionResult> {
  if (!options.confirmed) throw new Error("Explicit confirmation required.");
  const timeout = options.timeoutMs ?? 300_000;
  if (!Number.isInteger(timeout) || timeout < 1 || timeout > 3_600_000) throw new Error("Invalid timeout.");
  // Operações de artefatos podem executar todo o trabalho na verificação persistida.
  if ((!steps.length && !options.verify) || new Set(steps.map(step => step.id)).size !== steps.length || steps.some(step => !step.id.trim() || step.id === '__verify' || !step.command.trim() || step.args.some(arg => arg.includes('\0')))) throw new Error("Invalid steps.");
  const id = options.id ?? crypto.randomUUID();
  const signal = options.signal ?? new AbortController().signal;
  const emit = (event:ExecutionEvent) => { try { options.onEvent?.(event); } catch { /* Falha do observador não altera o resultado persistido. */ } };
  const release = acquireCollectorLock(store.path + '.operation-lock','executor');
  try {
  store.reconcileInterrupted();
  store.start(id);
  emit({type:'operation-started',operationId:id,status:'running'});
  const result: ExecutionResult = { id, status: 'succeeded', steps: [] };
  try {
    for (const step of steps) {
      store.startStep(id, step.id);
      emit({type:'step-started',operationId:id,stepId:step.id,status:'running'});
      await options.beforeStep?.(step);
      const outcome = await runStep(step, signal, timeout, {secrets:options.secrets??[],onLog:options.onLog});
      store.finishStep(id, step.id, outcome.status, outcome.exitCode);
      result.steps.push(outcome);
      emit({type:'step-finished',operationId:id,stepId:step.id,status:outcome.status,exitCode:outcome.exitCode});
      if (outcome.status !== 'succeeded') { result.status = outcome.status; break; }
    }
    if (result.status === 'succeeded' && options.verify) {
      if (signal.aborted) result.status = 'cancelled';
      else {
        store.startStep(id,'__verify');
        emit({type:'step-started',operationId:id,stepId:'__verify',status:'running'});
        let verificationStatus:StepResult['status']='succeeded';
        try{await options.verify();if(signal.aborted)verificationStatus='cancelled';}catch{verificationStatus=signal.aborted?'cancelled':'failed';}
        store.finishStep(id,'__verify',verificationStatus,null);
        result.steps.push({id:'__verify',status:verificationStatus,exitCode:null});
        emit({type:'step-finished',operationId:id,stepId:'__verify',status:verificationStatus,exitCode:null});
        result.status=verificationStatus;
      }
    }
  } catch { result.status = 'failed'; }
  store.finish(id, result.status);
  emit({type:'operation-finished',operationId:id,status:result.status});
  return result;
  } finally { release(); }
}
