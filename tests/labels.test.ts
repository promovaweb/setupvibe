/** Confere mensagens de estado sem modificar os valores usados por automação. */
import{expect,test}from'bun:test';
import{stateLabel}from'../src/tui/labels';
test("estados conhecidos usam inglês e valores desconhecidos permanecem legíveis",()=>{expect(stateLabel('succeeded')).toBe("Completed");expect(stateLabel('interrupted')).toBe("Interrupted");expect(stateLabel('step-started')).toBe("Step started");expect(stateLabel('future-state')).toBe('future-state');});
