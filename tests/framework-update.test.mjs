import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { inspectUpdate, applyUpdate, finishUpdate, recordFrameworkBaseline } from '../tools/framework-update.mjs';

function git(root, ...args) {
  const r = spawnSync('git', args, { cwd: root, encoding: 'utf8', env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_AUTHOR_NAME: 'Fixture', GIT_AUTHOR_EMAIL: 'fixture@example.invalid', GIT_COMMITTER_NAME: 'Fixture', GIT_COMMITTER_EMAIL: 'fixture@example.invalid' } });
  assert.equal(r.status, 0, r.stderr); return r.stdout.trim();
}
function put(root, file, contents) { fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); fs.writeFileSync(path.join(root, file), contents); }
function commit(root) { git(root, 'add', '.'); git(root, 'commit', '-qm', 'fixture'); return git(root, 'rev-parse', 'HEAD'); }
function fixture(t) {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'framework-update-'));
  t.after(() => fs.rmSync(folder, { recursive: true, force: true }));
  const upstream = path.join(folder, 'upstream'), root = path.join(folder, 'game');
  fs.mkdirSync(upstream); fs.mkdirSync(root); git(upstream, 'init', '-b', 'main');
  put(upstream, 'framework.json', '{"format":1,"version":"0.1.0"}\n');
  put(upstream, '.gitignore', '.env\n');
  put(upstream, 'CHANGELOG.md', '# 0.1.0\nNo migrations.\n');
  put(upstream, 'client/core/backend.gd', 'header\n\n\n\n\n\nfooter\n');
  put(upstream, 'server/src/main.ts', 'original\n');
  for (const file of ['client/game/game.gd', 'assets/icon.png', 'export_presets.cfg', '.env.example']) put(upstream, file, 'original\n');
  const baseline = commit(upstream); git(upstream, 'tag', 'v0.1.0');
  // Copy tracked files into an unrelated history, just like GitHub templates.
  for (const file of git(upstream, 'ls-files').split('\n')) put(root, file, fs.readFileSync(path.join(upstream, file)));
  git(root, 'init', '-b', 'main'); commit(root); recordFrameworkBaseline(root); commit(root);
  put(root, 'client/core/backend.gd', 'game header\n\n\n\n\n\nfooter\n');
  put(root, 'client/game/game.gd', 'my gameplay\n'); put(root, '.env', 'private-value\n');
  commit(root);
  put(upstream, 'framework.json', '{"format":1,"version":"0.1.1"}\n');
  put(upstream, 'CHANGELOG.md', '# 0.1.1\nAuth fix. No migrations.\n');
  put(upstream, 'client/core/backend.gd', 'header\n\n\n\n\n\nfixed footer\n');
  for (const file of ['client/game/game.gd', 'assets/icon.png', 'export_presets.cfg', '.env.example']) put(upstream, file, 'upstream changed\n');
  const target = commit(upstream); git(upstream, 'tag', 'v0.1.1');
  return { root, upstream, baseline, target };
}
test('template history is identified; preview is read-only and selects latest compatible release', t => {
  const f = fixture(t), before = git(f.root, 'rev-parse', 'HEAD');
  put(f.upstream, 'framework.json', '{"format":1,"version":"0.2.0"}\n'); commit(f.upstream); git(f.upstream, 'tag', 'v0.2.0');
  const plan = inspectUpdate({ root: f.root, repository: f.upstream });
  assert.equal(plan.from, f.baseline); assert.equal(plan.target, f.target); assert.equal(plan.release, 'v0.1.1');
  assert.equal(git(f.root, 'status', '--porcelain'), ''); assert.equal(git(f.root, 'rev-parse', 'HEAD'), before);
  assert.ok(plan.skipped.includes('client/game/game.gd')); assert.ok(plan.selected.includes('.env.example'));
});
test('three-way update preserves game customizations, secrets, assets and generated files', t => {
  const f = fixture(t); const plan = inspectUpdate({ root: f.root, repository: f.upstream });
  applyUpdate(plan, f);
  assert.equal(fs.readFileSync(path.join(f.root, 'client/core/backend.gd'), 'utf8'), 'game header\n\n\n\n\n\nfixed footer\n');
  for (const [file, contents] of [['client/game/game.gd', 'my gameplay\n'], ['.env', 'private-value\n'], ['assets/icon.png', 'original\n'], ['export_presets.cfg', 'original\n']]) assert.equal(fs.readFileSync(path.join(f.root, file), 'utf8'), contents);
  assert.equal(fs.readFileSync(path.join(f.root, '.env.example'), 'utf8'), 'upstream changed\n');
  const lock = path.join(f.root, 'framework.lock.json'); const before = fs.readFileSync(lock, 'utf8');
  assert.throws(() => finishUpdate({ root: f.root, validate: () => { throw new Error('failed smoke'); } }), /failed smoke/);
  assert.equal(fs.readFileSync(lock, 'utf8'), before);
  finishUpdate({ root: f.root, validate: () => {} }); assert.equal(JSON.parse(fs.readFileSync(lock)).source_revision, f.target);
  commit(f.root);
  const next = inspectUpdate({ root: f.root, repository: f.upstream }); assert.equal(next.from, next.target);
});
test('overlapping edits leave visible conflicts and cannot advance baseline', t => {
  const f = fixture(t); put(f.root, 'server/src/main.ts', 'game state\n'); commit(f.root);
  put(f.upstream, 'server/src/main.ts', 'framework state\n'); put(f.upstream, 'framework.json', '{"format":1,"version":"0.1.2"}\n'); commit(f.upstream); git(f.upstream, 'tag', 'v0.1.2');
  const plan = inspectUpdate({ root: f.root, repository: f.upstream });
  assert.throws(() => applyUpdate(plan, f), /git apply failed/);
  assert.ok(git(f.root, 'diff', '--name-only', '--diff-filter=U').includes('server/src/main.ts'));
  assert.throws(() => finishUpdate({ root: f.root, validate: () => assert.fail('validation must wait') }), /Resolve and stage/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(f.root, 'framework.lock.json'))).source_revision, null);
});
test('unknown baselines fail; explicit reviewed SHA works; dirty trees cannot apply', t => {
  const f = fixture(t); fs.unlinkSync(path.join(f.root, 'framework.lock.json')); commit(f.root);
  // Make the root snapshot unknown, as with a manually assembled starter.
  const other = path.join(f.root, 'other'); fs.mkdirSync(other); git(other, 'init', '-b', 'main'); put(other, 'README.md', 'custom'); commit(other);
  assert.throws(() => inspectUpdate({ root: other, repository: f.upstream }), /Cannot identify/);
  const plan = inspectUpdate({ root: other, repository: f.upstream, baseline: f.baseline });
  assert.equal(plan.from, f.baseline);
  put(f.root, 'uncommitted.txt', 'keep me');
  assert.throws(() => applyUpdate(plan, { root: f.root }), /Commit or stash/);
});
test('finish runs all local checks in order and keeps a failed update resumable', t => {
  const f = fixture(t), plan = inspectUpdate({ root: f.root, repository: f.upstream });
  applyUpdate(plan, f);
  put(f.root, 'tools/manage.mjs', `import fs from 'node:fs';
const command = process.argv[2];
fs.appendFileSync('calls.txt', command + '\\n');
if (command === 'smoke' && !fs.existsSync('allow-smoke')) process.exit(1);
`);
  put(f.root, '.env', 'CLIENT_API_URL=https://api.example.com\nLOCAL_API_PORT=7350\n');
  assert.throws(() => finishUpdate({ root: f.root }), /local loopback/);
  put(f.root, '.env', 'CLIENT_API_URL=http://127.0.0.1:7350\nLOCAL_API_PORT=7350\n');
  const lock = path.join(f.root, 'framework.lock.json'), before = fs.readFileSync(lock, 'utf8');
  assert.throws(() => finishUpdate({ root: f.root }), /smoke failed/);
  assert.equal(fs.readFileSync(lock, 'utf8'), before);
  assert.equal(fs.readFileSync(path.join(f.root, 'calls.txt'), 'utf8'), 'check\nup\nsmoke\n');
  put(f.root, 'allow-smoke', ''); finishUpdate({ root: f.root });
  assert.equal(JSON.parse(fs.readFileSync(lock)).source_revision, f.target);
});
test('a second release applies only its delta and rejects a downgrade', t => {
  const f = fixture(t);
  applyUpdate(inspectUpdate({ root: f.root, repository: f.upstream }), f);
  finishUpdate({ root: f.root, validate: () => {} }); commit(f.root);
  put(f.upstream, 'framework.json', '{"format":1,"version":"0.1.2"}\n');
  put(f.upstream, 'server/src/main.ts', 'new server behavior\n');
  const next = commit(f.upstream); git(f.upstream, 'tag', 'v0.1.2');
  const plan = inspectUpdate({ root: f.root, repository: f.upstream });
  assert.equal(plan.from, f.target); assert.equal(plan.target, next);
  assert.deepEqual(plan.selected, ['server/src/main.ts']);
  applyUpdate(plan, f); finishUpdate({ root: f.root, validate: () => {} }); commit(f.root);
  assert.throws(() => inspectUpdate({ root: f.root, repository: f.upstream, to: 'v0.1.0' }), /merge-base failed/);
});
test('binary updates work and renames cannot overwrite preserved game paths', t => {
  const f = fixture(t);
  put(f.upstream, 'addons/test.bin', Buffer.from([0, 2, 3, 4]));
  git(f.upstream, 'mv', 'server/src/main.ts', 'client/game/renamed.ts');
  put(f.upstream, 'framework.json', '{"format":1,"version":"0.1.2"}\n'); commit(f.upstream); git(f.upstream, 'tag', 'v0.1.2');
  const plan = inspectUpdate({ root: f.root, repository: f.upstream });
  assert.ok(plan.skipped.includes('client/game/renamed.ts'));
  applyUpdate(plan, f);
  assert.deepEqual(fs.readFileSync(path.join(f.root, 'addons/test.bin')), Buffer.from([0, 2, 3, 4]));
  assert.equal(fs.existsSync(path.join(f.root, 'client/game/renamed.ts')), false);
});
