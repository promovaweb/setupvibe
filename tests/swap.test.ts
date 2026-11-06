/** Diferencia swap desabilitado de contadores ausentes ou inconsistentes. */
import{expect,test}from'bun:test';
import{parseSwap}from'../src/core/swap';
test('swap usa kB convertidos para bytes',()=>{expect(parseSwap('SwapTotal:  1024 kB\nSwapFree:  512 kB\n')).toEqual({total:1048576,used:524288});expect(parseSwap('SwapTotal: 0 kB\nSwapFree: 0 kB')).toEqual({total:0,used:0});});
test("contadores missings, unidades erradas e livre acima do total são indisponíveis",()=>{for(const text of ['', 'SwapTotal: 1 MB\nSwapFree: 0 kB','SwapTotal: 1 kB\nSwapFree: 2 kB'])expect(parseSwap(text)).toBeNull();});
