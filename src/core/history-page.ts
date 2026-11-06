/** Codifica cursores de histórico e valida entradas antes de consultar SQLite. */
export interface HistoryCursor {startedAt:string;id:string;}
export function encodeHistoryCursor(cursor:HistoryCursor):string{return Buffer.from(JSON.stringify(cursor)).toString('base64url');}
/** Cursor não concede acesso; apenas posiciona a consulta ordenada de histórico. */
export function decodeHistoryCursor(value:string):HistoryCursor{
 if(value.length>2048||!/^[A-Za-z0-9_-]+$/.test(value))throw new Error("Invalid history cursor.");
 try{const data=JSON.parse(Buffer.from(value,'base64url').toString());if(!data||typeof data.startedAt!=='string'||!Number.isFinite(Date.parse(data.startedAt))||typeof data.id!=='string'||!data.id.trim())throw new Error();return{startedAt:data.startedAt,id:data.id};}
 catch{throw new Error("Invalid history cursor.");}
}
