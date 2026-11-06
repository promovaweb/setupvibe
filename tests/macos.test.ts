/** Verifica parsing e limite da matriz sem declarar homologação macOS no Linux. */
import{expect,test}from'bun:test';
import{parseMacVersion}from'../src/core/macos';
test("matrix pretendida começa em macOS 14",()=>{expect(parseMacVersion('14.0\n')).toEqual({version:'14.0',supported:true});expect(parseMacVersion('13.6.1').supported).toBe(false);expect(parseMacVersion('15.1').supported).toBe(true);});
test('recusa kernel Darwin e saídas malformadas',()=>{for(const value of ['Darwin 24.0','14','14.0 extra',''])expect(()=>parseMacVersion(value)).toThrow(new RegExp("invalid","i"));});
