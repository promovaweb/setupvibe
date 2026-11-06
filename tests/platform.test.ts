/** Verifica recusas da matriz inicial sem executar instaladores no host. */
import { expect, test } from 'bun:test';
import { validateTarget } from '../src/core/platform';
test('Server recusa macOS e Desktop recusa Windows', () => {
  expect(() => validateTarget({ edition: 'server', system: 'darwin', arch: 'arm64' })).toThrow(new RegExp("Linux","i"));
  expect(() => validateTarget({ edition: 'desktop', system: 'win32', arch: 'x64' })).toThrow(new RegExp("system","i"));
});
test("matrix aceita Linux nas duas arquiteturas", () => {
  for (const arch of ['x64', 'arm64']) expect(() => validateTarget({ edition: 'server', system: 'linux', arch })).not.toThrow();
});
test("edição invalid em dados externals é recusada em runtime",()=>{
 expect(()=>validateTarget({edition:'unknown',system:'linux',arch:'x64'} as unknown as Parameters<typeof validateTarget>[0])).toThrow(new RegExp("edition","i"));
 expect(()=>validateTarget(null as unknown as Parameters<typeof validateTarget>[0])).toThrow(new RegExp("edition","i"));
});
