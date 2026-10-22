#!/usr/bin/env node
// Real API contracts; create/delete only unique disposable accounts.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readEnv } from '../tools/lib.mjs';

const env = readEnv(process.argv[2]);
const origin = env.CLIENT_API_URL.replace(/\/$/, '');
const basic = 'Basic ' + Buffer.from(env.NAKAMA_SERVER_KEY + ':').toString('base64');
const accounts = [];
async function request(route, data, auth = basic, method = 'POST') {
  const response = await fetch(origin + route, {
    method, headers: { 'Content-Type': 'application/json', Authorization: auth },
    body: data === undefined ? undefined : JSON.stringify(data), signal: AbortSignal.timeout(20000),
  });
  return { status: response.status, body: await response.json() };
}
async function rpc(name, payload, token, expected = 200) {
  const response = await request('/v2/rpc/' + name, JSON.stringify(payload), 'Bearer ' + token);
  assert.equal(response.status, expected, `${name} returned unexpected status`);
  return response.status === 200 ? JSON.parse(response.body.payload) : response.body;
}
try {
  assert.equal((await request('/healthcheck', undefined, basic, 'GET')).status, 200);
  const guest = await request('/v2/account/authenticate/device?create=true', { id: randomUUID().replaceAll('-', '') });
  assert.equal(guest.status, 200, 'Guest authentication');
  const token = guest.body.token; accounts.push(token);
  const original = (await rpc('get_state', {}, token)).state;
  assert.equal(original.coins, 0); assert.equal(original.schema_version, 1);
  assert.equal((await rpc('update_profile', { display_name: 'Test Pilot' }, token)).state.display_name, 'Test Pilot');
  await rpc('update_profile', { display_name: 'Invalid\nName' }, token, 400);
  await rpc('complete_tutorial', { coins: 9999 }, token, 400);
  await rpc('get_state', [], token, 400); await rpc('get_state', {}, '', 401);
  const statuses = await Promise.all(Array.from({ length: 8 }, async () =>
    (await request('/v2/rpc/complete_tutorial', '{}', 'Bearer ' + token)).status));
  assert.ok(statuses.every(status => [200, 409].includes(status)), 'Concurrent completion status');
  const state = (await rpc('get_state', {}, token)).state;
  assert.equal(state.coins, 10); assert.equal(state.tutorial_completed, true);
  assert.equal((await rpc('complete_tutorial', {}, token)).state.coins, 10);
  const other = await request('/v2/account/authenticate/device?create=true', { id: randomUUID().replaceAll('-', '') });
  assert.equal(other.status, 200); accounts.push(other.body.token);
  assert.equal((await rpc('get_state', {}, other.body.token)).state.coins, 0);
  const account = await request('/v2/account', undefined, 'Bearer ' + token, 'GET');
  assert.equal(account.status, 200);
  const write = await request('/v2/storage', { objects: [{ collection: 'player', key: 'state', value: '{"coins":999}', user_id: account.body.user.id }] }, 'Bearer ' + token, 'PUT');
  assert.ok([400, 403].includes(write.status), 'Client storage write must be denied');
  const email = `starter-${randomUUID()}@example.com`, password = randomUUID();
  assert.equal((await request('/v2/account/link/email', { email, password }, 'Bearer ' + token)).status, 200);
  const login = await request('/v2/account/authenticate/email?create=false', { email, password });
  assert.equal(login.status, 200, 'Email login');
  assert.equal((await rpc('get_state', {}, login.body.token)).state.coins, 10);
  const restored = await request('/v2/account/session/refresh', { token: login.body.refresh_token });
  assert.equal(restored.status, 200, 'Session refresh');
  assert.equal((await rpc('get_state', {}, restored.body.token)).state.display_name, 'Test Pilot');
  assert.equal((await request('/v2/session/logout', { token: restored.body.token, refresh_token: restored.body.refresh_token }, 'Bearer ' + restored.body.token)).status, 200);
  assert.ok([401, 403].includes((await request('/v2/account/session/refresh', { token: restored.body.refresh_token })).status));
  console.log('PASS: guest, profile, intent validation, isolation, OCC/replay, storage permissions, email linking/login, refresh/logout');
} catch (error) {
  console.error(error.message); process.exitCode = 1;
} finally {
  for (const token of accounts) {
    try {
      const { status } = await request('/v2/account', undefined, 'Bearer ' + token, 'DELETE');
      if (status !== 200) throw new Error(`status ${status}`);
    } catch {
      console.error('Disposable test account cleanup failed'); process.exitCode = 1;
    }
  }
}
