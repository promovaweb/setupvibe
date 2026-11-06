/** Formata medidores textuais sem transformar amostras ausentes em consumo zero. */
export function meter(used:number|null,total:number|null,width=16):string{
 if(!Number.isInteger(width)||width<1||width>80)throw new Error("Invalid meter width.");
 if(used===null||total===null||!Number.isFinite(used)||!Number.isFinite(total)||used<0||total<=0||used>total)return "unavailable";
 const ratio=used/total,filled=Math.round(ratio*width);
 return '▰'.repeat(filled)+'▱'.repeat(width-filled)+' '+Math.round(ratio*100)+'%';
}
