import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { ROOT, SECRETS, EXPORT_OPTIONS, init, readEnv, parseEnv, validate, configure, serverEnvironment, cleanEnvironment, redact, run } from '../tools/lib.mjs';
import { exportGame } from '../tools/export.mjs';
import { createDocsServer } from '../tools/serve-docs.mjs';

function fixture(t) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mobile-game-starter-test-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'client')); fs.mkdirSync(path.join(root, 'tools'));
  fs.writeFileSync(path.join(root, 'project.godot'), '[application]\nconfig/name="Test"\n');
  for (const file of ['.env.example', 'tools/export_presets.template']) fs.copyFileSync(path.join(ROOT, file), path.join(root, file));
  const file = path.join(root, '.env'); init(file, root);
  return { root, file, env: readEnv(file) };
}
test('init makes distinct private secrets and refuses overwrites', t => {
  const { root, file, env } = fixture(t);
  validate(env, { root });
  assert.equal(new Set(SECRETS.map(k => env[k])).size, SECRETS.length);
  if (process.platform !== 'win32') assert.equal(fs.statSync(file).mode & 0o777, 0o600);
  assert.throws(() => init(file, root), /EEXIST/);
});
test('env parser rejects expansion, duplicate keys and invalid lines', () => {
  for (const value of ['X=$(whoami)', 'X=`whoami`', 'X=one\nX=two', 'not an assignment', 'X="quoted"']) assert.throws(() => parseEnv(value));
  assert.equal(parseEnv('# comment\nX=literal value\n').X, 'literal value');
});
test('production requires real origin, loopback bind and non-root SSH', t => {
  const { root, env } = fixture(t);
  assert.throws(() => validate(env, { root, production: true }));
  Object.assign(env, { API_DOMAIN: 'api.my-game.net', CLIENT_API_URL: 'https://api.my-game.net', TLS_EMAIL: 'dev@my-game.net', SSH_HOST: 'game-vps' });
  validate(env, { root, production: true });
  assert.throws(() => validate({ ...env, LOCAL_BIND_IP: '0.0.0.0' }, { root, production: true }));
  assert.throws(() => validate({ ...env, SSH_USER: 'root' }, { root, production: true }), /non-root/);
});
test('configure renders public metadata without signing secrets', t => {
  const { root, env } = fixture(t);
  Object.assign(env, { APP_VERSION: '1.2.3', APP_BUILD_NUMBER: '42', IOS_TEAM_ID: 'TEAM123456', GODOT_ANDROID_KEYSTORE_RELEASE_PASSWORD: 'never-serialize-this-password' });
  configure(env, root);
  const preset = fs.readFileSync(path.join(root, 'export_presets.cfg'), 'utf8');
  assert.match(preset, /version\/code=42/); assert.match(preset, /application\/app_store_team_id="TEAM123456"/);
  assert.match(preset, /application\/export_project_only=true/); assert.ok(!preset.includes('@ANDROID_OPTIONS@'));
  for (const file of ['export_presets.cfg', 'project.godot', 'client/config.json']) assert.ok(!fs.readFileSync(path.join(root, file), 'utf8').includes('never-serialize-this-password'));
});
test('legacy env is supported and assets cannot escape root', t => {
  const { root, env } = fixture(t);
  const legacy = Object.fromEntries(Object.entries(env).filter(([k]) => !(k in EXPORT_OPTIONS) && !k.startsWith('GODOT_ANDROID_KEYSTORE_')));
  validate(legacy, { root }); configure(legacy, root);
  fs.writeFileSync(path.join(root, 'icon.png'), 'test-only asset path fixture');
  configure({ ...legacy, APP_ICON: 'res://icon.png', IOS_ICON: 'res://icon.png' }, root);
  assert.match(fs.readFileSync(path.join(root, 'project.godot'), 'utf8'), /config\/icon="res:\/\/icon.png"/);
  for (const value of ['res://missing.png', '/tmp/absolute.png', 'res://../outside.png']) assert.throws(() => configure({ ...legacy, APP_ICON: value }, root));
  if (process.platform !== 'win32') {
    fs.symlinkSync(path.join(ROOT, '.env.example'), path.join(root, 'escape.png'));
    assert.throws(() => configure({ ...legacy, APP_ICON: 'res://escape.png' }, root));
  }
});
test('server env and process environment exclude workstation credentials', t => {
  const { root, env } = fixture(t);
  Object.assign(env, { GODOT_ANDROID_KEYSTORE_RELEASE_PASSWORD: 'never-upload-this-password', GODOT_ANDROID_KEYSTORE_RELEASE_PATH: '/private/workstation/release.jks' });
  const payload = serverEnvironment(env); assert.ok(payload.includes('NAKAMA_SESSION_KEY='));
  for (const value of ['never-upload', 'KEYSTORE', 'BUNDLE_ID', 'CLIENT_API_URL', '/private/workstation']) assert.ok(!payload.includes(value));
  const clean = cleanEnvironment(root, { ...env, PATH: '/usr/bin' });
  assert.equal(clean.PATH, '/usr/bin'); assert.equal(clean.POSTGRES_PASSWORD, undefined);
});
test('export passes only selected debug signing credentials', t => {
  const { root, env } = fixture(t);
  Object.assign(env, { GODOT_ANDROID_KEYSTORE_DEBUG_PASSWORD: 'private-debug-password', GODOT_ANDROID_KEYSTORE_RELEASE_PASSWORD: 'unneeded-release-password' });
  let captured;
  exportGame(env, 'android-debug', { root, execute(command, args, options) {
    captured = options.env; fs.writeFileSync(args.at(-1), 'test artifact');
    return { status: 0, stdout: 'done', stderr: '' };
  } });
  assert.equal(captured.GODOT_ANDROID_KEYSTORE_DEBUG_PASSWORD, 'private-debug-password');
  for (const key of ['NAKAMA_SESSION_KEY', 'POSTGRES_PASSWORD', 'GODOT_ANDROID_KEYSTORE_RELEASE_PASSWORD']) assert.equal(captured[key], undefined);
});
test('export rejects failed and stale output and redacts errors', t => {
  const { root, env } = fixture(t);
  const execute = () => ({ status: 1, stdout: 'ERROR: private-debug-password', stderr: '' });
  env.GODOT_ANDROID_KEYSTORE_DEBUG_PASSWORD = 'private-debug-password';
  let output = '';
  t.mock.method(console, 'log', text => { output += text; });
  assert.throws(() => exportGame(env, 'android-debug', { root, execute }), /verified export/);
  assert.ok(!output.includes('private-debug-password')); assert.ok(output.includes('[redacted]'));
  const folder = path.join(root, 'exports/android'); fs.writeFileSync(path.join(folder, 'prototype-debug.apk'), 'old artifact');
  assert.throws(() => exportGame(env, 'android-debug', { root, execute: () => ({ status: 0, stdout: '', stderr: '' }) }), /verified export/);
  assert.equal(redact('token=secret', { NAKAMA_SESSION_KEY: 'secret' }), 'token=[redacted]');
});
test('release and iOS requirements fail before invoking exporter', t => {
  const { root, env } = fixture(t);
  const execute = () => { assert.fail('Exporter should not run'); };
  assert.throws(() => exportGame(env, 'android-release', { root, execute }), /HTTPS/);
  assert.throws(() => exportGame(env, 'ios-project', { root, execute, platform: 'linux' }), /macOS/);
  assert.throws(() => exportGame(env, 'ios-project', { root, execute, platform: 'darwin' }), /IOS_TEAM_ID/);
});
test('process runner passes literal arguments without a shell', () => {
  const literal = '$(whoami); literal spaces';
  const result = run(process.execPath, ['-e', 'process.stdout.write(process.argv[1])', literal], { capture: true });
  assert.equal(result.stdout, literal);
  assert.throws(() => run(process.execPath, ['-e', 'process.exit(2)'], { capture: true }), /exit 2/);
});
test('Bash deploy consumes env as data and preserves previous env privately', t => {
  const { root } = fixture(t);
  const bin = path.join(root, 'bin'); fs.mkdirSync(bin);
  fs.writeFileSync(path.join(root, 'old.txt'), '');
  fs.writeFileSync(path.join(root, '.env'), 'OLD_KEY=old-value\n');
  fs.writeFileSync(path.join(bin, 'tar'), '#!/bin/bash\nprintf "POSTGRES_PASSWORD=literal-value\\nLOG_LEVEL=INFO\\n" > .env\n');
  fs.writeFileSync(path.join(bin, 'docker'), '#!/bin/bash\n[[ -z ${POSTGRES_PASSWORD+x} && -z ${LOG_LEVEL+x} ]] || exit 9\necho "$*" >> calls.txt\n');
  for (const file of ['tar', 'docker']) fs.chmodSync(path.join(bin, file), 0o755);
  fs.writeFileSync(path.join(root, 'backend.tar.gz'), 'fixture');
  const result = spawnSync('bash', [path.join(ROOT, 'infra/deploy-remote.sh'), root], { env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, POSTGRES_PASSWORD: 'ambient', LOG_LEVEL: 'DEBUG' }, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(fs.readFileSync(path.join(root, '.env.previous'), 'utf8'), /OLD_KEY=old-value/);
  assert.equal(fs.statSync(path.join(root, '.env')).mode & 0o777, 0o600);
  assert.equal(fs.statSync(path.join(root, '.env.previous')).mode & 0o777, 0o600);
  assert.equal(fs.readFileSync(path.join(root, 'calls.txt'), 'utf8').trim().split('\n').length, 3);
});
test('docs preview serves files while denying traversal and external symlinks', async t => {
  const { root } = fixture(t); fs.mkdirSync(path.join(root, 'docs'));
  fs.writeFileSync(path.join(root, 'docs/index.html'), '<h1>Docs</h1>');
  fs.writeFileSync(path.join(root, 'private.txt'), 'not public');
  if (process.platform !== 'win32') fs.symlinkSync(path.join(root, 'private.txt'), path.join(root, 'docs/escape.txt'));
  const server = createDocsServer(path.join(root, 'docs'));
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}`;
  assert.equal(await (await fetch(url)).text(), '<h1>Docs</h1>');
  assert.equal((await fetch(url + '/%2e%2e%2fprivate.txt')).status, 404);
  assert.equal((await fetch(url, { method: 'POST' })).status, 405);
  if (process.platform !== 'win32') assert.equal((await fetch(url + '/escape.txt')).status, 404);
});
