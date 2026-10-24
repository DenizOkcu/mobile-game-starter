import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

function fixture(state = null, displayName = '') {
  const clone = value => JSON.parse(JSON.stringify(value));
  let stored = state && clone(state), version = 1;
  const user = { displayName, username: 'unique-user' };
  const rpcs = {};
  const nk = {
    conflict: false,
    accountGetId: () => ({ user: clone(user) }),
    accountUpdateId: (_id, username, name) => {
      assert.equal(username, null); user.displayName = name;
    },
    storageRead: () => stored ? [{ value: clone(stored), version: String(version) }] : [],
    storageWrite: writes => {
      const write = writes[0];
      assert.equal(write.permissionRead, 0); assert.equal(write.permissionWrite, 0);
      assert.equal(write.version, stored ? String(version) : '*');
      if (nk.conflict) throw new Error('conflict');
      stored = clone(write.value); version++;
    },
    multiUpdate: (accounts, writes, deletes, wallets) => {
      assert.equal(deletes, null); assert.equal(wallets, null);
      nk.storageWrite(writes);
      if (accounts) user.displayName = accounts[0].displayName;
    },
  };
  const context = vm.createContext({});
  vm.runInContext(readFileSync(new URL('../server/modules/main.js', import.meta.url), 'utf8'), context);
  context.InitModule({}, {}, nk, { registerRpc: (id, fn) => { rpcs[id] = fn; } });
  return { nk, user, stored: () => clone(stored), call: (id, data = {}) =>
    JSON.parse(rpcs[id]({ userId: 'disposable' }, {}, nk, JSON.stringify(data))) };
}
const legacy = { schema_version: 1, display_name: 'Legacy Pilot', coins: 37,
  tutorial_completed: true, created_at: 123, updated_at: 456 };

test('new state separates native name; profile updates leave progression and username unchanged', () => {
  const f = fixture();
  const initial = f.call('get_state');
  assert.equal(initial.state.schema_version, 2);
  assert.equal('display_name' in initial.state, false);
  assert.equal(initial.account.display_name, '');
  const stored = f.stored();
  assert.equal(f.call('update_profile', { display_name: 'Test Pilot' }).account.display_name, 'Test Pilot');
  assert.deepEqual(f.stored(), stored);
  assert.equal(f.user.username, 'unique-user');
  f.user.displayName = 'Native Change';
  assert.equal(f.call('get_state').account.display_name, 'Native Change');
  assert.throws(() => f.call('update_profile', { display_name: 'Bad\nName' }), /./);
  assert.equal(f.user.displayName, 'Native Change');
  const other = fixture();
  assert.equal(other.call('update_profile', { display_name: 'Native Change' }).account.display_name, 'Native Change');
});

test('legacy name migration preserves all progress and is idempotent', () => {
  const f = fixture(legacy);
  const migrated = f.call('get_state');
  const { display_name, ...progress } = legacy;
  assert.deepEqual(migrated.state, { ...progress, schema_version: 2 });
  assert.equal(migrated.account.display_name, display_name);
  f.user.displayName = 'New Name';
  assert.equal(f.call('get_state').account.display_name, 'New Name');
  assert.equal(f.call('complete_tutorial').state.coins, 37);
});

test('existing native account name wins over the legacy name', () => {
  const f = fixture(legacy, 'Native Pilot');
  assert.equal(f.call('get_state').account.display_name, 'Native Pilot');
  assert.equal('display_name' in f.stored(), false);
});

test('failed migration leaves both authorities unchanged for later reconciliation', () => {
  const f = fixture(legacy);
  f.nk.conflict = true;
  assert.throws(() => f.call('get_state'), error => error.code === 10);
  assert.deepEqual(f.stored(), legacy);
  assert.equal(f.user.displayName, '');
  f.nk.conflict = false;
  assert.equal(f.call('get_state').account.display_name, 'Legacy Pilot');
});

test('unknown schema is rejected without resetting progress', () => {
  const f = fixture({ ...legacy, schema_version: 99 });
  assert.throws(() => f.call('get_state'), error => error.code === 9);
  assert.equal(f.stored().coins, 37);
});
