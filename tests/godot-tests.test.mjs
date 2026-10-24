import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { godotTests } from '../tools/godot-tests.mjs';
import { run } from '../tools/lib.mjs';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'godot-harness-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, 'project.godot'), '[application]\nconfig/name="Developer Game"\nconfig/use_custom_user_dir=true\nconfig/custom_user_dir_name="real-saves"\n');
  fs.writeFileSync(path.join(root, '.env'), 'PRIVATE=do-not-copy');
  const dataRoot = path.join(root, 'user-data');
  fs.mkdirSync(dataRoot);
  const saved = path.join(dataRoot, 'session.cfg');
  fs.writeFileSync(saved, 'developer session sentinel');
  return { root, dataRoot, saved };
}

for (const failure of [false, true]) test(`Godot harness isolates data and cleans up after ${failure ? 'script failure' : 'success'}`, t => {
  const options = fixture(t);
  let stage, data, calls = 0;
  options.execute = (_command, args, settings) => {
    calls++;
    stage = args[args.indexOf('--path') + 1];
    assert.match(fs.readFileSync(path.join(stage, 'project.godot'), 'utf8'), /config\/use_custom_user_dir=false/);
    assert.ok(!fs.existsSync(path.join(stage, '.env')));
    assert.equal(settings.timeout, 120_000);
    assert.equal(settings.killSignal, 'SIGKILL');
    if (args.includes('--expected-user-data')) {
      data = args.at(-1);
      assert.equal(fs.readFileSync(path.join(data, '.test-isolation'), 'utf8'), path.basename(stage));
      fs.writeFileSync(path.join(data, 'session.cfg'), 'test session');
    }
    return { status: failure && calls === 3 ? 1 : 0, stdout: '', stderr: '' };
  };
  const action = () => godotTests({ GODOT_BIN: 'fake' }, ['live_client.gd'], options);
  if (failure) assert.throws(action, /validation failed/); else action();
  assert.equal(calls, 3);
  assert.ok(!fs.existsSync(stage)); assert.ok(!fs.existsSync(data));
  assert.equal(fs.readFileSync(options.saved, 'utf8'), 'developer session sentinel');
});

test('hung Godot process is killed, diagnostics are redacted, and user data is removed', t => {
  const options = fixture(t);
  let stage;
  const logs = [];
  options.timeout = 1500;
  options.log = message => logs.push(message);
  options.execute = (_command, args, settings) => {
    stage = args[args.indexOf('--path') + 1];
    return run(process.execPath, ['-e', 'console.log("private-example-secret"); setInterval(() => {}, 1000)'], settings);
  };
  const started = Date.now();
  assert.throws(() => godotTests({ GODOT_BIN: 'fake', POSTGRES_PASSWORD: 'private-example-secret' }, ['live_client.gd'], options), /timed out/);
  assert.ok(Date.now() - started < 5000);
  assert.ok(logs.length && !logs.join('').includes('private-example-secret'));
  assert.ok(!fs.existsSync(stage));
  assert.deepEqual(fs.readdirSync(options.dataRoot), ['session.cfg']);
  assert.equal(fs.readFileSync(options.saved, 'utf8'), 'developer session sentinel');
});
