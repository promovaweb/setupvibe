/** Verifica a matriz antes de alterações persistentes, sem instalar componentes. */
import{validateTarget,type Target}from'./platform';
import{detectLinuxRelease}from'./os-release';
import{detectMacVersion}from'./macos';
export interface SystemEvidence {supported:boolean;description:string;}
/** Evidência injetável permite testar a matriz sem simular o sistema do host inteiro. */
export async function installationPreflight(target:Target,inspect?:()=>Promise<SystemEvidence>):Promise<SystemEvidence>{
 validateTarget(target);
 const evidence=inspect?await inspect():target.system==='linux'?await detectLinuxRelease().then(result=>({supported:result.supported,description:result.release?`${result.release.id} ${result.release.version}`:result.error??"Linux unknown"})):await detectMacVersion().then(result=>({supported:result.supported,description:result.version?`macOS ${result.version}`:result.error??"macOS unknown"}));
 if(!evidence.supported)throw new Error("Installation refused outside the supported matrix: "+evidence.description);
 return evidence;
}
