/** Valida o catálogo embarcado e resolve dependências sem efeitos persistentes. */
import { validateTarget, type Edition, type Target } from './platform';
export interface Component {
  id: string;
  name: string;
  category: string;
  editions: Edition[];
  systems: string[];
  dependencies: string[];
  manager: string;
  package: string;
}
/** Aceita dados externos somente após verificar campos, referências e ciclos. */
export function validateCatalog(input: unknown): Component[] {
  if (!Array.isArray(input)) throw new Error("Catalog must be a list.");
  const fields = ['id', 'name', 'category', 'editions', 'systems', 'dependencies', 'manager', 'package'];
  const ids = new Set<string>();
  for (const raw of input) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error("Invalid component.");
    const row = raw as Record<string, unknown>;
    if (Object.keys(row).some(key => !fields.includes(key))) throw new Error("Unknown catalog field.");
    for (const key of ['id', 'name', 'category', 'manager', 'package']) {
      if (typeof row[key] !== 'string' || !(row[key] as string).trim()) throw new Error(`Invalid field: ${key}.`);
    }
    if (!/^[a-z][a-z0-9-]*$/.test(row.id as string)) throw new Error("Invalid ID.");
    if (ids.has(row.id as string)) throw new Error("Duplicate ID.");
    ids.add(row.id as string);
    for (const key of ['editions', 'systems', 'dependencies']) {
      if (!Array.isArray(row[key]) || (row[key] as unknown[]).some(value => typeof value !== 'string')) throw new Error(`Invalid list: ${key}.`);
      if (new Set(row[key] as string[]).size !== (row[key] as string[]).length) throw new Error(`Duplicate value: ${key}.`);
    }
    if (!(row.editions as string[]).length || (row.editions as string[]).some(value => !['desktop', 'server'].includes(value))) throw new Error("Invalid edition.");
    if (!(row.systems as string[]).length || (row.systems as string[]).some(value => !['linux', 'darwin'].includes(value))) throw new Error("Invalid operating system.");
  }
  const catalog = structuredClone(input) as Component[];
  const visiting = new Set<string>(), visited = new Set<string>();
  const visit = (id: string): void => {
    if (visiting.has(id)) throw new Error(`Dependency cycle: ${id}.`);
    if (visited.has(id)) return;
    const item = catalog.find(component => component.id === id);
    if (!item) throw new Error(`Missing dependency: ${id}.`);
    visiting.add(id);
    item.dependencies.forEach(visit);
    visiting.delete(id); visited.add(id);
  };
  catalog.forEach(item => visit(item.id));
  return catalog;
}
export interface Plan { requested: string[]; target: Target; components: Component[]; }
/** Ordena IDs e dependências para produzir a mesma prévia para seleções equivalentes. */
export function createPlan(input: unknown, requested: string[], target: Target): Plan {
  validateTarget(target);
  const catalog = validateCatalog(input);
  if (!requested.length) throw new Error("Select at least one resource.");
  const components: Component[] = [], seen = new Set<string>();
  const visit = (id: string): void => {
    if (seen.has(id)) return;
    const item = catalog.find(component => component.id === id);
    if (!item) throw new Error(`Unknown component: ${id}.`);
    if (!item.editions.includes(target.edition) || !item.systems.includes(target.system)) throw new Error(`Incompatible component: ${id}.`);
    [...item.dependencies].sort().forEach(visit);
    seen.add(id); components.push(item);
  };
  const selection = [...new Set(requested)].sort();
  selection.forEach(visit);
  return { requested: selection, target: { ...target }, components };
}
