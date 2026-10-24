#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, run, cleanEnvironment } from './lib.mjs';

const tooling = path.join(ROOT, 'tools/openspec');
const packageRoot = path.join(tooling, 'node_modules/@fission-ai/openspec');
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const toolEnv = () => ({ ...cleanEnvironment(), OPENSPEC_TELEMETRY: '0', DO_NOT_TRACK: '1', OPENSPEC_NO_UPDATE_CHECK: '1' });

function requireNode() {
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (!(major === 22 && minor >= 13 || major >= 24)) throw new Error('OpenSpec tooling requires Node.js 22.13+ or a newer LTS (24+).');
}

export function setupSpecs({ execute = run } = {}) {
  requireNode();
  return execute('npm', ['--prefix', tooling, 'ci', '--ignore-scripts', '--no-audit', '--no-fund'], {
    env: toolEnv(), timeout: 120_000, killSignal: 'SIGKILL',
  });
}

export function runSpec(args, { root = ROOT, execute = run } = {}) {
  requireNode();
  const expected = json(path.join(tooling, 'package.json')).devDependencies['@fission-ai/openspec'];
  if (!fs.existsSync(path.join(packageRoot, 'package.json')) || json(path.join(packageRoot, 'package.json')).version !== expected) {
    throw new Error(`Install pinned OpenSpec ${expected} with: node tools/spec.mjs setup`);
  }
  return execute(process.execPath, [path.join(packageRoot, 'bin/openspec.js'), ...args], {
    cwd: root, env: toolEnv(), timeout: 120_000, killSignal: 'SIGKILL',
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    if (args.length === 1 && args[0] === 'setup') setupSpecs();
    else runSpec(args.length ? args : ['--help']);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
