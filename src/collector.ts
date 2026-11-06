/** Entrada dedicada; compartilha validação e encerramento com setupvibe --collector. */
import {runCollector} from './core/run-collector';
try{await runCollector(process.argv.slice(2));}
catch(error){console.error(error instanceof Error?error.message:String(error));process.exitCode=1;}
