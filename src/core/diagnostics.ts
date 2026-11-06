/** Reúne consultas independentes sem instalar ferramentas ou criar estado. */
import{discoverTailscale}from'../adapters/tailscale';
import{detectMacVersion}from'./macos';
import{detectLinuxRelease}from'./os-release';
import{discoverMise}from'../adapters/mise';
import{discoverContainers}from'./docker';
import{validateTarget,type Target}from'./platform';
/** Server não consulta runtimes Desktop; a matriz ainda não representa homologação. */
export async function diagnose(target:Target){
 validateTarget(target);
 const [docker,mise,linux,macos,tailscale]=await Promise.all([discoverContainers(),target.edition==='desktop'?discoverMise():Promise.resolve(null),target.system==='linux'?detectLinuxRelease():Promise.resolve(null),target.system==='darwin'?detectMacVersion():Promise.resolve(null),discoverTailscale()]);
 return{target,homologated:false,linux,macos,docker,mise,tailscale};
}
