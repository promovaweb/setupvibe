/** Exercita persistência real e recuperação usando SQLite em diretórios descartáveis. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync, readdirSync, statSync, symlinkSync, existsSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
const binary = resolve(import.meta.dirname, '../target/debug/setupvibe');

/** Isola bancos e garante a remoção mesmo após falha de asserção. */
function fixture(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'setupvibe-state-'));
  try { fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
}
function run(dir, args, env=process.env) {
  const result = spawnSync(binary, ['--data-dir', dir, '--output', 'json', ...args], { encoding: 'utf8', timeout: 15000, env });
  assert.equal(result.error, undefined);
  return { code: result.status, body: JSON.parse(result.stdout) };
}
function init(dir) { assert.equal(run(dir, ['state', 'init', '--yes']).code, 0); }

test('consulta e prévia não criam bancos', () => fixture(dir => {
  assert.equal(run(dir, ['state', 'status']).body.data.initialized, false);
  assert.deepEqual(run(dir, ['operation', 'list']).body.data.operations, []);
  assert.equal(run(dir, ['state', 'init', '--dry-run']).code, 0);
  assert.deepEqual(readdirSync(dir), []);
}));

test('inicialização exige autorização antes de escrever', () => fixture(dir => {
  assert.equal(run(dir, ['state', 'init']).code, 4);
  assert.deepEqual(readdirSync(dir), []);
}));

test('dois bancos, WAL, schema e permissões privadas', () => fixture(dir => {
  const first = run(dir, ['state', 'init', '--yes']);
  assert.equal(first.code, 0);
  assert.equal(first.body.data.state.journal_mode, 'wal');
  assert.equal(first.body.data.state.schema_version, 1);
  const [major,minor,patch] = first.body.data.state.sqlite_version.split('.').map(Number);
  assert.ok(major*1e6+minor*1000+patch >= 3051003);
  for (const file of ['setupvibe.db', 'metrics.db']) {
    assert.equal(statSync(join(dir,file)).mode & 0o777, 0o600);
    const db = new DatabaseSync(join(dir,file));
    assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
    assert.equal(db.prepare('SELECT count(*) AS n FROM schema_migrations').get().n, 1);
    db.close();
  }
  init(dir);
  assert.equal(run(dir, ['state','status']).body.data.initialized, true);
}));

test('schema futuro é recusado sem sobrescrever dados', () => fixture(dir => {
  init(dir);
  const db = new DatabaseSync(join(dir,'setupvibe.db'));
  db.exec("INSERT INTO config VALUES('preservar','valor'); PRAGMA user_version=99");
  db.close();
  assert.equal(run(dir, ['state','init','--yes']).code, 4);
  assert.equal(run(dir, ['state','status']).code, 4);
  const verify = new DatabaseSync(join(dir,'setupvibe.db'));
  assert.equal(verify.prepare('PRAGMA user_version').get().user_version, 99);
  assert.equal(verify.prepare('SELECT value FROM config').get().value,'valor');
  verify.close();
}));

test('transação de migração interrompida é revertida', () => fixture(dir => {
  const db = new DatabaseSync(join(dir,'setupvibe.db'));
  db.exec('BEGIN IMMEDIATE; CREATE TABLE incompleta(id INTEGER); PRAGMA user_version=1');
  db.close();
  init(dir);
  const verify = new DatabaseSync(join(dir,'setupvibe.db'));
  assert.equal(verify.prepare("SELECT count(*) n FROM sqlite_master WHERE name='incompleta'").get().n,0);
  verify.close();
}));

test('reconciliação não inventa sucesso nem adota instalação', () => fixture(dir => {
  init(dir);
  const db = new DatabaseSync(join(dir,'setupvibe.db'));
  db.exec("INSERT INTO operations VALUES('interrompida','2.0.0-alpha.1','running','2026-01-01T00:00:00Z',NULL,NULL,'{}'); INSERT INTO operation_steps VALUES('interrompida',0,'git','running',NULL)");
  db.prepare('INSERT INTO installations VALUES(?,?,?,?,?,?,?)').run('git','external',join(dir,'ausente'),'1.0',1,0,new Date().toISOString());
  db.close();
  const bin=join(dir,'bin');mkdirSync(bin);
  for(const [name,code] of [['git','process.stdout.write("git 2.0");'],['dpkg-query','process.exit(1);']]) {const path=join(bin,name);writeFileSync(path,'#!'+process.execPath+'\n'+code);chmodSync(path,0o700);}
  const result=run(dir,['state','reconcile','--yes'],{...process.env,HOME:dir,PATH:bin});
  assert.equal(result.code,0);
  assert.equal(result.body.data.interrupted_operations,1);
  assert.equal(result.body.data.observations[0].present,true);
  assert.equal(result.body.data.observations[0].path,join(bin,'git'));
  assert.equal(result.body.data.observations[0].managed,false);
  assert.equal(result.body.data.observations[0].owner,'external');
  const operation=run(dir,['operation','show','interrompida']).body.data.operations[0];
  assert.equal(operation.status,'unknown');
  assert.equal(operation.steps[0].status,'unknown');
}));

test('SQLite ocupado retorna código 6 com espera finita', () => fixture(dir => {
  init(dir);
  const db = new DatabaseSync(join(dir,'setupvibe.db'));
  db.exec('BEGIN IMMEDIATE');
  const before=Date.now();
  assert.equal(run(dir,['state','reconcile','--yes']).code,6);
  assert.ok(Date.now()-before < 12000);
  db.exec('ROLLBACK'); db.close();
}));

test('backup é consistente e não substitui arquivo existente', () => fixture(dir => {
  init(dir);
  const destination=join(dir,'backup','state.db');
  assert.equal(run(dir,['state','backup','--destination',destination,'--yes']).code,0);
  assert.ok(existsSync(destination));
  assert.equal(statSync(destination).mode & 0o777,0o600);
  const db=new DatabaseSync(destination);
  assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
  db.close();
  assert.notEqual(run(dir,['state','backup','--destination',destination,'--yes']).code,0);
}));

test('recusa symlink de banco', () => fixture(dir => {
  const external=join(dir,'externo.db');
  const db=new DatabaseSync(external);db.close();
  symlinkSync(external,join(dir,'setupvibe.db'));
  assert.equal(run(dir,['state','init','--yes']).code,4);
}));
