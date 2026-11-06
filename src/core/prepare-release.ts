/** Prepara artefato de release sem executar binários ou substituir instalação existente. */
import{join}from'node:path';
import{parseManifest,selectArtifact}from'./manifest';
import{downloadArtifact}from'./download';
import type{Target}from'./platform';
/** O chamador fornece manifesto confiável e diretório de staging já existente. */
export async function prepareRelease(input:unknown,target:Target,directory:string,options:Parameters<typeof downloadArtifact>[3]={}){
 const manifest=parseManifest(input),artifact=selectArtifact(manifest,target);
 const filename=`setupvibe-${manifest.version}-${artifact.system}-${artifact.arch}`;
 const destination=join(directory,filename);
 await downloadArtifact(artifact.url,destination,artifact.sha256,options);
 return{version:manifest.version,path:destination,sha256:artifact.sha256,target:{...target}};
}
