#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, readEnv, validate, configure, cleanEnvironment, run, parseArgs, redact, isFile } from './lib.mjs';

export function exportGame(env, target, { root = ROOT, execute = run, platform = process.platform } = {}) {
  validate(env, { root });
  if (target === 'android-release') {
    if (new URL(env.CLIENT_API_URL).protocol !== 'https:') throw new Error('Release builds require a verified HTTPS backend');
    for (const suffix of ['PATH', 'USER', 'PASSWORD']) {
      const key = `GODOT_ANDROID_KEYSTORE_RELEASE_${suffix}`;
      if (!env[key]) throw new Error(`Set ${key} privately in the selected env file`);
    }
    if (!isFile(env.GODOT_ANDROID_KEYSTORE_RELEASE_PATH)) throw new Error('Release keystore not found');
  }
  if (target === 'ios-project') {
    if (platform !== 'darwin') throw new Error('iOS export requires macOS and Xcode');
    if (!env.IOS_TEAM_ID) throw new Error('Set IOS_TEAM_ID in the selected env file');
  }
  configure(env, root);
  const childEnv = cleanEnvironment(root);
  const release = target === 'android-release';
  if (target.startsWith('android-')) {
    for (const suffix of ['PATH', 'USER', 'PASSWORD']) {
      const key = `GODOT_ANDROID_KEYSTORE_${release ? 'RELEASE' : 'DEBUG'}_${suffix}`;
      if (env[key]) childEnv[key] = env[key];
    }
  }
  const folder = path.join(root, 'exports', target === 'ios-project' ? 'ios' : 'android');
  fs.mkdirSync(folder, { recursive: true });
  const artifact = path.join(folder, target === 'ios-project' ? 'prototype.zip' : `prototype-${release ? 'release' : 'debug'}.apk`);
  const before = fs.existsSync(artifact) ? fs.statSync(artifact).mtimeMs : null;
  const result = execute(env.GODOT_BIN, ['--headless', '--path', root, release ? '--export-release' : '--export-debug', target === 'ios-project' ? 'iOS' : 'Android', artifact], { cwd: root, env: childEnv, capture: true, check: false });
  const output = redact(result.stdout + result.stderr, env); console.log(output);
  if (result.status !== 0 || output.includes('ERROR:') || !isFile(artifact) || fs.statSync(artifact).mtimeMs === before) {
    throw new Error('Godot did not produce a verified export; inspect the redacted diagnostics');
  }
  console.log(`Export finished: ${artifact}`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const parsed = parseArgs(process.argv.slice(2), ['android-debug', 'android-release', 'ios-project']);
    if (parsed.help) process.exit(0);
    const { envFile, command } = parsed;
    exportGame(readEnv(envFile), command);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
