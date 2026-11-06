/** Exercita corrupção de catálogo, resolução transitiva e restrições de edição. */
import { expect, test } from 'bun:test';
import { createPlan, validateCatalog, type Component } from '../src/core/catalog';
const component = (id: string, dependencies: string[] = []): Component => ({ id, name: id, category: 'base', editions: ['desktop'], systems: ['linux'], dependencies, manager: 'mise', package: id });
const target = { edition: 'desktop' as const, system: 'linux', arch: 'x64' };
test('dependências transitivas aparecem antes dos consumidores, sem duplicação', () => {
  const catalog = [component('app', ['runtime']), component('runtime', ['base']), component('base')];
  expect(createPlan(catalog, ['app', 'runtime'], target).components.map(item => item.id)).toEqual(['base', 'runtime', 'app']);
  expect(createPlan(catalog, ['runtime', 'app'], target)).toEqual(createPlan(catalog, ['app', 'runtime'], target));
});
test("recusa ciclos, referências missings, duplicates e campos unknowns", () => {
  expect(() => validateCatalog([component('a', ['b']), component('b', ['a'])])).toThrow(new RegExp("cycle","i"));
  expect(() => validateCatalog([component('a', ['b'])])).toThrow(new RegExp("missing","i"));
  expect(() => validateCatalog([component('a'), component('a')])).toThrow(new RegExp("duplicate","i"));
  expect(() => validateCatalog([{ ...component('a'), typo: true }])).toThrow(new RegExp("unknown","i"));
});
test("dependência incompatible impede o plano inteiro", () => {
  expect(() => createPlan([component('app')], ['app'], { ...target, edition: 'server' })).toThrow(new RegExp("incompatible","i"));
  expect(() => createPlan([], ["missing"], target)).toThrow(new RegExp("unknown","i"));
  expect(() => createPlan([], [], target)).toThrow(new RegExp("select","i"));
});
test("catalog recusa campos obrigatórios missings e listas invalid",()=>{
 for(const field of ['name','category','manager','package','editions','systems','dependencies']){const row:Record<string,unknown>={...component('a')};delete row[field];expect(()=>validateCatalog([row])).toThrow();}
 expect(()=>validateCatalog([{...component('a'),editions:['desktop','desktop']}])).toThrow(new RegExp("duplicate","i"));
 expect(()=>validateCatalog([{...component('a'),systems:['windows']}])).toThrow(new RegExp("system","i"));
 expect(()=>validateCatalog([{...component('a'),dependencies:[1]}])).toThrow(new RegExp("list","i"));
});
