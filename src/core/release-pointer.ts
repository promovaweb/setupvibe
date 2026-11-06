/** Alterna ponteiro de release sem substituir arquivos executáveis em uso. */
import{lstat,readlink,symlink,rename,unlink,realpath}from'node:fs/promises';
import{join,relative,isAbsolute}from'node:path';
/** Exige releases dentro do diretório gerenciado e ponteiro existente também gerenciado. */
export async function activateRelease(directory:string,releasePath:string,confirmed:boolean):Promise<{previous:string|null;current:string}>{
 if(!confirmed)throw new Error("Explicit confirmation required.");
 const base=await realpath(directory),target=await realpath(releasePath),rel=relative(base,target);
 if(!rel||rel==='..'||rel.startsWith('../')||isAbsolute(rel))throw new Error("Release is outside the managed directory.");
 if(!(await lstat(target)).isFile())throw new Error("Release must be a regular file.");
 const current=join(base,'current');let previous:string|null=null;
 try{const stat=await lstat(current);if(!stat.isSymbolicLink())throw new Error("Current pointer belongs to an external file.");previous=await readlink(current);const resolvedPrevious=relative(base,await realpath(current));if(resolvedPrevious==='..'||resolvedPrevious.startsWith('../')||isAbsolute(resolvedPrevious))throw new Error("Current pointer is outside the managed directory.");if(isAbsolute(previous)||previous==='..'||previous.startsWith('../'))throw new Error("Current pointer is outside the managed directory.");}
 catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
 const temporary=join(base,'.current-'+crypto.randomUUID());
 try{await symlink(rel,temporary);await rename(temporary,current);}finally{await unlink(temporary).catch(error=>{if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;});}
 return{previous,current:rel};
}
