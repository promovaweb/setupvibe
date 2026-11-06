/** Renderiza o bootstrap por release, fixando versão, origem HTTPS e hashes dos alvos presentes. */
import {readFileSync} from 'node:fs';
const targets=['linux-x64','linux-arm64','darwin-x64','darwin-arm64'];
/** Não resolve latest nem baixa um segundo manifesto; o arquivo gerado contém os hashes aprovados pelo build. */
export function renderBootstrap(manifest){
 if(!/^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/.test(manifest.version)||!Array.isArray(manifest.artifacts)||!manifest.artifacts.length)throw Error('Invalid bootstrap manifest.');
 const hashes=new Map();let origin;
 for(const artifact of manifest.artifacts){
  const target=artifact.system+'-'+artifact.arch,url=new URL(artifact.url),filename='setupvibe-'+manifest.version+'-'+target;
  if(!targets.includes(target)||hashes.has(target)||!/^[a-f0-9]{64}$/.test(artifact.sha256)||url.protocol!=='https:'||url.username||url.password||url.search||url.hash||!url.pathname.endsWith('/'+filename))throw Error('Invalid bootstrap artifact.');
  const base=url.href.slice(0,-filename.length-1);
  if(origin&&origin!==base)throw Error('Bootstrap artifacts must share a download directory.');
  origin=base;hashes.set(target,artifact.sha256);
 }
 const values={VERSION:manifest.version,DOWNLOAD_BASE:origin};
 for(const target of targets)values[target.toUpperCase().replace('-','_')+'_SHA256']=hashes.get(target)??'';
 // Valores interpolados precisam ser literais seguros dentro das aspas simples do template Bash.
 if(Object.values(values).some(value=>typeof value!=='string'||/[\n\r']/.test(value)))throw Error('Invalid bootstrap template value.');
 return readFileSync(new URL('./bootstrap-template.sh',import.meta.url),'utf8').replace(/@([A-Z0-9_]+)@/g,(_match,key)=>{if(!Object.hasOwn(values,key))throw Error('Unknown bootstrap template field.');return values[key];});
}
