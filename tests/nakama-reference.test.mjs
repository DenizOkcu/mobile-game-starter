import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT } from '../tools/lib.mjs';
import { parseGodot, parseRuntime } from '../tools/nakama-reference.mjs';

test('SDK inventory retains multiline signatures and public signals without exposing nested/private helpers', () => {
  const source = `extends Node
signal received_data(packet)
var connected: bool = false
func _private(): pass
func fetch_async(
  filter: String = "):",
  limit: int = 20
) -> Array[String]:
  return []
class Model:
  func internal(): pass
static func restore(token: String):
  return token
`;
  const entries = parseGodot(source);
  assert.deepEqual(entries.map(entry => entry.name), ['received_data', 'connected', 'fetch_async', 'restore']);
  assert.equal(entries[2].signature, 'func fetch_async( filter: String = "):", limit: int = 20 ) -> Array[String]');
  assert.equal(entries[2].line, 5);
});

test('runtime inventory retains overloads, callback contracts, generic members and named constants', () => {
  const entries = parseRuntime(`declare namespace nkruntime {
    const SystemUserId = "system";
    export interface Nakama {
      read<T>(key: string): T;
      read(key: string, version: string): string | null;
    }
    export interface MatchLoopFunction<State> {
      (ctx: Context, state: State): { state: State } | null;
    }
    export type Context = { userId?: string };
  }`);
  assert.deepEqual(entries.map(entry => entry.name), ['SystemUserId', 'Nakama', 'MatchLoopFunction', 'Context']);
  assert.deepEqual(entries[1].members.map(member => member.name), ['read', 'read']);
  assert.match(entries[1].members[0].signature, /read<T>/);
  assert.match(entries[2].members[0].signature, /state: State.*null/);
});

test('offline freshness check catches stale references and requires a reviewed server-version refresh', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nakama-reference-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const files = ['tools/lib.mjs', 'tools/nakama-reference.mjs', '.env.example', 'server/package.json', 'server/package-lock.json',
    'server/node_modules/nakama-runtime/index.d.ts', 'server/node_modules/nakama-runtime/package.json',
    'server/node_modules/typescript/lib/typescript.js', 'server/node_modules/typescript/package.json'];
  for (const file of files) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.copyFileSync(path.join(ROOT, file), path.join(root, file));
  }
  for (const folder of ['addons/com.heroiclabs.nakama', 'docs/nakama']) fs.cpSync(path.join(ROOT, folder), path.join(root, folder), { recursive: true });
  const run = (...args) => spawnSync(process.execPath, ['tools/nakama-reference.mjs', ...args], { cwd: root, encoding: 'utf8', timeout: 15000 });
  assert.equal(run('--check').status, 0);
  fs.appendFileSync(path.join(root, 'docs/nakama/sdk-reference.md'), 'stale edit');
  const stale = run('--check');
  assert.equal(stale.status, 1); assert.match(stale.stderr, /is stale/);
  assert.equal(run().status, 0); assert.equal(run('--check').status, 0);
  const env = path.join(root, '.env.example');
  fs.writeFileSync(env, fs.readFileSync(env, 'utf8').replace(/nakama:\d+\.\d+\.\d+/, 'nakama:0.0.0'));
  const changed = run('--check');
  assert.equal(changed.status, 1); assert.match(changed.stderr, /Server version changed/);
});
