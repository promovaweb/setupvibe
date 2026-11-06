/** Verifica limites e ausência de dados nos medidores de terminal. */
import{expect,test}from'bun:test';
import{meter}from'../src/tui/meter';
test('medidor preserva zero, metade e capacidade cheia',()=>{expect(meter(0,100,4)).toBe('▱▱▱▱ 0%');expect(meter(50,100,4)).toBe('▰▰▱▱ 50%');expect(meter(100,100,4)).toBe('▰▰▰▰ 100%');});
test("amostras missings ou contraditórias ficam indisponíveis",()=>{for(const [used,total]of [[null,100],[0,0],[101,100],[NaN,100]] as [number|null,number|null][])expect(meter(used,total)).toBe("unavailable");expect(()=>meter(1,2,0)).toThrow(new RegExp("width","i"));});
