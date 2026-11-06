/** Seleciona a supervisão nativa sem criar estado ou iniciar serviços durante a montagem. */
import {collectorUnitDirectory,systemdCollectorStatus,previewCollectorControl,activateSystemdCollector,stopSystemdCollector} from './activate-collector';
import {LaunchdCollectorController} from './launchd-collector';
/** CLI e TUI usam o mesmo provedor; sistemas fora da matriz são recusados na entrada. */
export function collectorController(){
 if(process.platform==='darwin')return new LaunchdCollectorController();
 return{directory:collectorUnitDirectory,status:systemdCollectorStatus,preview:previewCollectorControl,activate:activateSystemdCollector,stop:stopSystemdCollector};
}
