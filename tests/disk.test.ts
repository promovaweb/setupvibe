/** Confere leitura real e ausência sem criar caminhos no filesystem. */
import{expect,test}from'bun:test';
import{readDisk}from'../src/core/disk';
test('filesystem existente tem capacidade coerente',()=>{const sample=readDisk('/');expect(sample).not.toBeNull();expect(sample!.total).toBeGreaterThan(0);expect(sample!.available).toBeGreaterThanOrEqual(0);expect(sample!.used).toBeLessThanOrEqual(sample!.total);});
test("caminho inexistente é unavailable",()=>{expect(readDisk('/nonexistent/setupvibe/disk')).toBeNull();});
