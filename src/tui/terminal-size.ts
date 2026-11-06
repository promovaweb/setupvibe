/** Suspende interação oculta abaixo do tamanho mínimo e preserva o foco ao redimensionar. */
import {BoxRenderable,TextRenderable,type CliRenderer} from '@opentui/core';
interface FocusTarget {focused:boolean;focus():void;blur():void;}
/** A operação em andamento continua no núcleo; o chamador mantém o atalho de cancelamento. */
export function mountTerminalSizeGuard(renderer:CliRenderer,shell:BoxRenderable,focusables:FocusTarget[],colors:{background:string;text:string}){
  let small=false,previousFocus:FocusTarget|undefined;
  const overlay=new BoxRenderable(renderer,{width:'100%',height:'100%',flexDirection:'column',justifyContent:'center',visible:false,backgroundColor:colors.background});
  const message=new TextRenderable(renderer,{content:'',width:'100%',fg:colors.text});overlay.add(message);renderer.root.add(overlay);
  const refresh=()=>{
    const next=renderer.width<80||renderer.height<24;
    message.content=`Terminal too small: ${renderer.width}×${renderer.height}\n\nResize to at least 80×24.\n\nCtrl+Q: quit or cancel the operation.`;
    if(next===small)return;
    small=next;shell.visible=!small;overlay.visible=small;
    if(small){previousFocus=focusables.find(item=>item.focused);for(const item of focusables)item.blur();}
    else{previousFocus?.focus();previousFocus=undefined;}
  };
  renderer.on('resize',refresh);renderer.once('destroy',()=>renderer.off('resize',refresh));refresh();
  return{isSmall:()=>small};
}
