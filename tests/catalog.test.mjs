/** Verifica catálogo e planejamento pelo executável real, sem instalar pacotes. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const binary = join(root, 'target/debug/setupvibe');
const original = JSON.parse(readFileSync(join(root, 'catalog/components.json'), 'utf8'));

/** Executa uma consulta com ambiente doméstico descartável e timeout finito. */
function run(args, home) {
  const result = spawnSync(binary, ['--output', 'json', ...args], {
    encoding: 'utf8', timeout: 10000,
    env: { ...process.env, ...(home ? { HOME: home, XDG_DATA_HOME: home } : {}) },
  });
  assert.equal(result.error, undefined);
  return { code: result.status, body: JSON.parse(result.stdout) };
}

/** Modifica uma cópia isolada para testar rejeição antes da execução. */
function invalidCatalog(change) {
  const dir = mkdtempSync(join(tmpdir(), 'setupvibe-catalog-'));
  try {
    const catalog = structuredClone(original);
    change(catalog);
    const file = join(dir, 'catalog.json');
    writeFileSync(file, JSON.stringify(catalog));
    const result = run(['catalog', 'validate', '--file', file]);
    assert.equal(result.code, 2);
    assert.equal(result.body.success, false);
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

test('catálogo embarcado completo é válido', () => {
  const result = run(['catalog', 'validate']);
  assert.equal(result.code, 0);
  assert.equal(result.body.data.components, original.components.length);
});

test('Server lista somente os seis componentes autorizados', () => {
  const result = run(['--edition', 'server', 'catalog', 'list']);
  assert.deepEqual(result.body.data.components.map(c => c.id).sort(),
    ['collector', 'docker', 'gh', 'git', 'portainer', 'tailscale']);
});

for (const id of ['redis', 'codex', 'ansible', 'herdr', 'postgresql']) {
  test(`Server recusa ${id} antes de instalar dependências`, () => {
    const result = run(['--edition', 'server', 'component', 'install', id, '--dry-run']);
    assert.equal(result.code, 3);
    assert.match(result.body.error.message, /indisponível/);
  });
}

for (const [name, change] of [
  ['schema desconhecido', c => { c.schema_version = 999; }],
  ['campo inesperado', c => { c.shell = 'echo proibido'; }],
  ['ID duplicado', c => { c.components.push(c.components[0]); }],
  ['dependência ausente', c => { c.components[0].dependencies = ['ausente']; }],
  ['ciclo', c => { c.components[0].dependencies = ['gh']; c.components[1].dependencies = ['git']; }],
  ['operação desconhecida', c => { c.components[0].operations.push('remove'); }],
  ['padrão fora da faixa', c => { c.components.find(x => x.id === 'redis').options.port.default = 99999; }],
  ['componente Server proibido', c => { c.components.find(x => x.id === 'codex').editions.push('server'); }],
  ['arquiteturas vazias', c => { c.components[0].platforms[0].architectures = []; }],
  ['template inexistente', c => { c.components[0].template_refs = ['ausente']; }],
]) test(`recusa ${name}`, () => invalidCatalog(change));

test('plano é determinístico, inclui Docker uma vez e não grava estado', () => {
  const home = mkdtempSync(join(tmpdir(), 'setupvibe-preview-'));
  try {
    const args = ['component', 'install', 'redis', 'postgresql', '--dry-run'];
    const a = run(args, home);
    const b = run(['component', 'install', 'postgresql', 'redis', '--dry-run'], home);
    assert.equal(a.code, 0);
    // Observações têm horários próprios; somente o plano é determinístico.
    assert.deepEqual(a.body.data.plan, b.body.data.plan);
    assert.deepEqual(a.body.data.plan.steps.map(s => s.component), ['docker', 'postgresql', 'redis']);
    assert.deepEqual(readdirSync(home), []);
  } finally { rmSync(home, { recursive: true, force: true }); }
});

test('opções validadas por componente e tipo', () => {
  assert.equal(run(['component', 'install', 'redis', '--dry-run', '--option', 'port=7000']).body.data.plan.steps.at(-1).options.port, 7000);
  for (const option of ['port=0', 'port=texto', 'inexistente=2']) {
    assert.equal(run(['component', 'install', 'redis', '--dry-run', '--option', option]).code, 2);
  }
});

test('Tailscale expõe somente install, verify e update', () => {
  assert.deepEqual(run(['catalog', 'show', 'tailscale']).body.data.operations, ['install', 'verify', 'update']);
});
