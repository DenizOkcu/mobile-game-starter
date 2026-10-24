import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ROOT, run } from '../tools/lib.mjs';
import { runSpec, setupSpecs } from '../tools/spec.mjs';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mobile-starter-spec-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'openspec/specs/accounts'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'openspec/config.yaml'), path.join(root, 'openspec/config.yaml'));
  fs.writeFileSync(path.join(root, 'openspec/specs/accounts/spec.md'), `# Accounts Specification

## Purpose
Describe recoverable account access across connectivity failures without creating replacement accounts or losing player state.

## Requirements

### Requirement: Recovery
The client SHALL recover the existing account after a connection outage.

#### Scenario: Connectivity returns
- **WHEN** the connection returns
- **THEN** the same account is restored
`);
  function command(args, success = true) {
    const result = runSpec(args, { root, execute: (bin, argv, options) => run(bin, argv, { ...options, capture: true, check: false }) });
    if (success) assert.equal(result.status, 0, result.stdout + result.stderr);
    else assert.notEqual(result.status, 0, 'Malformed specs must fail validation');
    return result.stdout;
  }
  return { root, command };
}

function put(root, file, content) {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, content);
}

test('spec tooling uses a local pin, locked setup and bounded execution without inherited game secrets', () => {
  let invoked;
  setupSpecs({ execute: (bin, args, options) => { invoked = { bin, args, options }; } });
  assert.equal(invoked.bin, 'npm'); assert.ok(invoked.args.includes('ci'));
  assert.ok(invoked.args.includes('--ignore-scripts'));
  assert.equal(invoked.args[1], path.join(ROOT, 'tools/openspec'));
  const previous = process.env.NAKAMA_SESSION_KEY;
  process.env.NAKAMA_SESSION_KEY = 'fixture-only-private-value';
  try {
    runSpec(['show', 'literal-$(not-a-shell)'], { execute: (bin, args, options) => { invoked = { bin, args, options }; } });
    assert.equal(invoked.bin, process.execPath);
    assert.equal(invoked.args[0], path.join(ROOT, 'tools/openspec/node_modules/@fission-ai/openspec/bin/openspec.js'));
    assert.equal(invoked.args.at(-1), 'literal-$(not-a-shell)');
    assert.equal(invoked.options.env.NAKAMA_SESSION_KEY, undefined);
    assert.equal(invoked.options.env.OPENSPEC_TELEMETRY, '0');
    assert.equal(invoked.options.env.OPENSPEC_NO_UPDATE_CHECK, '1');
    assert.equal(invoked.options.timeout, 120_000); assert.equal(invoked.options.killSignal, 'SIGKILL');
  } finally {
    if (previous === undefined) delete process.env.NAKAMA_SESSION_KEY;
    else process.env.NAKAMA_SESSION_KEY = previous;
  }
});

test('pinned CLI supplies project instructions, rejects invalid deltas, and archives verified changes without losing other scenarios', t => {
  const { root, command } = fixture(t);
  command(['validate', '--all', '--strict', '--no-interactive']);
  command(['new', 'change', 'improve-recovery']);
  const instructions = JSON.parse(command(['instructions', 'proposal', '--change', 'improve-recovery', '--json']));
  assert.equal(instructions.schemaName, 'spec-driven');
  assert.ok(instructions.context && instructions.rules.length);
  const base = 'openspec/changes/improve-recovery/';
  put(root, base + 'proposal.md', '## Why\nMake recovery feedback explicit.\n\n## What Changes\nExplain network failures.\n\n## Capabilities\n### Modified Capabilities\n- `accounts`: recovery feedback\n\n## Impact\nClient session errors.\n');
  put(root, base + 'design.md', '## Decisions\nPreserve credentials after transient failures.\n');
  put(root, base + 'tasks.md', '## 1. Recovery\n- [x] 1.1 Verify recovery behavior with the fixture transport test.\n\nEvidence: simulated outage and reconnect passed in this fixture.\n');
  const delta = '## MODIFIED Requirements\n\n### Requirement: Recovery\nThe client SHALL recover the existing account and report connection failures without deleting recoverable credentials.\n\n#### Scenario: Connectivity returns\n- **WHEN** the connection returns\n- **THEN** the same account is restored\n\n#### Scenario: Refresh fails transiently\n- **WHEN** a refresh request times out\n- **THEN** credentials are retained and the connection error is shown\n';
  put(root, base + 'specs/accounts/spec.md', '## MODIFIED Requirements\n### Requirement: Recovery\nThe client SHALL recover.\n');
  command(['validate', 'improve-recovery', '--strict', '--no-interactive'], false);
  put(root, base + 'specs/accounts/spec.md', delta);
  command(['validate', '--all', '--strict', '--no-interactive']);
  command(['archive', 'improve-recovery', '--yes']);
  assert.ok(!fs.existsSync(path.join(root, base)));
  const updated = fs.readFileSync(path.join(root, 'openspec/specs/accounts/spec.md'), 'utf8');
  assert.ok(updated.includes('Connectivity returns') && updated.includes('Refresh fails transiently'));
  assert.ok(updated.includes('without deleting recoverable credentials'));
  command(['validate', '--all', '--strict', '--no-interactive']);
  command(['validate', '--archived', '--no-interactive']);
});

test('archive lint rejects incomplete required tasks instead of treating format validation as completion', t => {
  const { root, command } = fixture(t);
  put(root, 'openspec/changes/archive/2026-10-24-unverified/tasks.md', '- [ ] 1.1 Verify on a physical device before declaring device support.\n');
  command(['validate', '--archived', '--no-interactive'], false);
});
