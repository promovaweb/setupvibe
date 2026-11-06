/** Filtra valores secretos conhecidos, inclusive quando divididos entre blocos de saída. */
export class SecretRedactor {
 private pending='';
 private secrets:string[];
 private reserve:number;
 constructor(values:string[]){
  this.secrets=[...new Set(values.filter(Boolean))].sort((a,b)=>b.length-a.length);
  this.reserve=Math.max(0,...this.secrets.map(value=>value.length-1));
 }
 /** Retém o sufixo que pode conter o início de um segredo no próximo bloco. */
 push(chunk:string):string{
  this.pending+=chunk;
  return this.consume(Math.max(0,this.pending.length-this.reserve));
 }
 /** Libera o restante depois que a fonte terminou. */
 flush():string{return this.consume(this.pending.length);}
 private consume(boundary:number):string{
  let index=0,result='';
  while(index<boundary){
   const secret=this.secrets.find(value=>this.pending.startsWith(value,index));
   if(secret){result+='[SEGREDO]';index+=secret.length;}
   else{result+=this.pending[index];index++;}
  }
  this.pending=this.pending.slice(index);
  return result;
 }
}
