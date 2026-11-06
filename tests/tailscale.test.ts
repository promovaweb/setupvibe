/** Verifica versão sem consultar autenticação, peers ou configuração de rede. */
import{expect,test}from'bun:test';
import{parseTailscaleVersion,discoverTailscale}from'../src/adapters/tailscale';
test("version usa primeira linha e recusa resposta inesperada",()=>{expect(parseTailscaleVersion('1.80.0\n  commit: abc\n')).toBe('1.80.0');expect(()=>parseTailscaleVersion('not installed')).toThrow(new RegExp("invalid","i"));});
test("cliente missing permanece unavailable",async()=>{expect(await discoverTailscale('/missing/tailscale')).toEqual({available:false,version:null});});
