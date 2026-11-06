/** Interpreta identificação Linux como dados; nunca executa conteúdo de os-release. */
export interface LinuxRelease {id:string;version:string;}
/** Extrai apenas ID e VERSION_ID, recusando valores ambíguos ou incompletos. */
export function parseOsRelease(text:string):LinuxRelease{
 const values=new Map<string,string>();
 for(const line of text.split('\n')){
  const match=line.match(/^(ID|VERSION_ID)=(.*)$/);if(!match)continue;
  if(values.has(match[1]!))throw new Error("Duplicate Linux identification.");
  let value=match[2]!;
  if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'")))value=value.slice(1,-1);
  if(!/^[a-zA-Z0-9._-]+$/.test(value))throw new Error("Invalid Linux identification.");
  values.set(match[1]!,value);
 }
 const id=values.get('ID'),version=values.get('VERSION_ID');if(!id||!version)throw new Error("Incomplete Linux identification.");return{id,version};
}
/** Distingue suporte pretendido de homologação, que depende de execução real. */
export function validateLinuxRelease(release:LinuxRelease):void{
 const supported=release.id==='debian'&&['12','13'].includes(release.version)||release.id==='ubuntu'&&release.version==='24.04';
 if(!supported)throw new Error("Distribution or version is outside the initial matrix.");
}

/** Consulta a fonte local sem executar seu conteúdo; falha fica explícita. */
export async function detectLinuxRelease(path='/etc/os-release'):Promise<{release:LinuxRelease|null;supported:boolean;error:string|null}>{
 try{
  const {readFile}=await import('node:fs/promises');const release=parseOsRelease(await readFile(path,'utf8'));
  try{validateLinuxRelease(release);return{release,supported:true,error:null};}
  catch{return{release,supported:false,error:"Distribution or version is outside the initial matrix."};}
 }catch{return{release:null,supported:false,error:"Linux identification is unavailable or invalid."};}
}
