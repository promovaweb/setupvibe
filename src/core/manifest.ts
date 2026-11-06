/** Valida metadados de distribuição antes de selecionar qualquer download. */
import{artifactUrl}from'./integrity';
import{validateTarget,type Target}from'./platform';
export interface ReleaseArtifact {system:string;arch:string;url:string;sha256:string;}
export interface ReleaseManifest {version:string;artifacts:ReleaseArtifact[];}
/** O manifesto validado ainda exige transporte autenticado ou assinatura confiável. */
export function parseManifest(input:unknown):ReleaseManifest{
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error("Invalid manifest.");
 const data=input as Record<string,unknown>;
 if(Object.keys(data).some(key=>!['version','artifacts'].includes(key))||typeof data.version!=='string'||!/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(data.version)||!Array.isArray(data.artifacts)||!data.artifacts.length)throw new Error("Invalid manifest.");
 const seen=new Set<string>();const artifacts:ReleaseArtifact[]=[];
 for(const row of data.artifacts){
  if(!row||typeof row!=='object'||Object.keys(row).some(key=>!['system','arch','url','sha256'].includes(key))||!['linux','darwin'].includes(row.system)||!['x64','arm64'].includes(row.arch)||typeof row.url!=='string'||typeof row.sha256!=='string'||!/^([a-f0-9]{64})$/i.test(row.sha256))throw new Error("Invalid manifest artifact.");
  artifactUrl(row.url);const key=row.system+'/'+row.arch;if(seen.has(key))throw new Error("Duplicate artifact for this platform.");seen.add(key);artifacts.push({system:row.system,arch:row.arch,url:row.url,sha256:row.sha256.toLowerCase()});
 }
 return{version:data.version,artifacts};
}
export function selectArtifact(input:unknown,target:Target):ReleaseArtifact{
 validateTarget(target);const manifest=parseManifest(input);const artifact=manifest.artifacts.find(item=>item.system===target.system&&item.arch===target.arch);if(!artifact)throw new Error("Release has no artifact for this platform.");return artifact;
}
