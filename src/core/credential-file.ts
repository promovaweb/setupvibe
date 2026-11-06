/** Confere arquivo persistente de credenciais sem carregar seu conteúdo em logs. */
import {lstatSync,realpathSync} from 'node:fs';
import {isAbsolute} from 'node:path';
/** O arquivo deve continuar disponível enquanto o container usar o bind mount. */
export function validateCredentialFile(path:string):void {
  if(!isAbsolute(path)||/[\x00-\x1f,]/.test(path))throw new Error("Invalid credentials path.");
  const stat=lstatSync(path);
  if(!stat.isFile()||stat.isSymbolicLink()||realpathSync(path)!==path)throw new Error("Credentials require a regular file without symlinks.");
  if(![0o600,0o400].includes(stat.mode&0o777))throw new Error("Credentials file must have mode 0600 or 0400.");
  if(typeof process.getuid==='function'&&stat.uid!==process.getuid())throw new Error("Credentials file must belong to the current user.");
  if(!(stat.mode&0o400)||stat.size<1||stat.size>4096)throw new Error("Credentials file is empty, unreadable or larger than 4096 bytes.");
}
