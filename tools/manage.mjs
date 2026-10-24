#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { setupSpecs, runSpec } from './spec.mjs';
import { godotTests } from './godot-tests.mjs';
import { frameworkUpdate, recordFrameworkBaseline } from './framework-update.mjs';
import { ROOT, readEnv, validate, init, configure, run, compose, serverEnvironment, parseArgs } from './lib.mjs';

function buildServer() {
  for (const args of [['ci', '--ignore-scripts'], ['run', 'type-check'], ['run', 'build']]) run('npm', ['--prefix', path.join(ROOT, 'server'), ...args]);
}
function godotCheck(env) {
  godotTests(env, ['client_test.gd']);
}
function importProject(env) {
  // A fresh clone has no .godot cache; launching the game before the editor
  // ever ran leaves the vendored SDK classes unregistered.
  run(env.GODOT_BIN, ['--headless', '--import', '--path', ROOT], { timeout: 120_000, killSignal: 'SIGKILL' });
}

function deploy(env, envFile) {
  validate(env, { production: true });
  buildServer(); configure(env);
  compose(envFile, ['config', '--quiet'], { production: true });
  godotCheck(env);
  const target = `${env.SSH_USER}@${env.SSH_HOST}`;
  const ssh = ['-p', env.SSH_PORT, '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', target];
  // DEPLOY_PATH is restricted to a dedicated absolute path by validate().
  run('ssh', [...ssh, `test -d '${env.DEPLOY_PATH}' && test -w '${env.DEPLOY_PATH}' && docker compose version >/dev/null`]);
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'mobile-game-starter-deploy-'));
  try {
    const stage = path.join(folder, 'stage');
    fs.mkdirSync(stage, { mode: 0o700 });
    const files = ['compose.yml', 'compose.production.yml', 'infra', 'server/modules'];
    for (const file of files) fs.cpSync(path.join(ROOT, file), path.join(stage, file), { recursive: true });
    fs.writeFileSync(path.join(stage, '.env'), serverEnvironment(env), { mode: 0o600 });
    const archive = path.join(folder, 'backend.tar.gz');
    run('tar', ['-czf', archive, '-C', stage, ...files, '.env']);
    fs.chmodSync(archive, 0o600);
    run('scp', ['-P', env.SSH_PORT, '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', archive, `${target}:${env.DEPLOY_PATH}/backend.tar.gz`]);
    run('ssh', [...ssh, `bash -s -- '${env.DEPLOY_PATH}'`], { input: fs.readFileSync(path.join(ROOT, 'infra/deploy-remote.sh'), 'utf8') });
  } finally { fs.rmSync(folder, { recursive: true, force: true }); }
  console.log(`Deployed. Verify DNS/TLS with: ${env.CLIENT_API_URL}/healthcheck`);
}

try {
  if (process.argv[2] === 'framework-update') {
    frameworkUpdate(process.argv.slice(3));
  } else {
    const parsed = parseArgs(process.argv.slice(2), ['init', 'configure', 'build', 'up', 'down', 'logs', 'status', 'check', 'smoke', 'deploy', 'backup', 'framework-update']);
    if (parsed.help) process.exit(0);
    const { envFile, command } = parsed;
    if (command === 'framework-update') throw new Error('Place framework-update immediately after manage.mjs; validation uses local .env.');
    if (command === 'init') { init(envFile); recordFrameworkBaseline(); configure(readEnv(envFile)); }
    else {
      if (!fs.existsSync(envFile)) throw new Error('Run node tools/manage.mjs init first');
      const env = readEnv(envFile); validate(env);
      switch (command) {
        case 'configure': configure(env); break;
        case 'build': buildServer(); break;
        case 'up': buildServer(); configure(env); importProject(env); compose(envFile, ['up', '-d', '--wait', '--force-recreate', 'nakama']); break;
        case 'down': compose(envFile, ['down']); break;
        case 'logs': compose(envFile, ['logs', '-f', '--tail', '100']); break;
        case 'status': compose(envFile, ['ps']); break;
        case 'check':
          setupSpecs(); runSpec(['validate', '--all', '--strict', '--no-interactive']);
          runSpec(['validate', '--archived', '--no-interactive']);
          buildServer(); configure(env);
          run(process.execPath, [path.join(ROOT, 'tools/nakama-reference.mjs'), '--check']);
          run(process.execPath, ['--test', path.join(ROOT, 'tests/tooling.test.mjs'), path.join(ROOT, 'tests/framework-update.test.mjs'), path.join(ROOT, 'tests/nakama-reference.test.mjs'), path.join(ROOT, 'tests/godot-tests.test.mjs'), path.join(ROOT, 'tests/spec.test.mjs')]);
          compose(envFile, ['config', '--quiet']); compose(envFile, ['config', '--quiet'], { production: true });
          run('bash', ['-n', path.join(ROOT, 'infra/deploy-remote.sh')]); godotCheck(env); break;
        case 'smoke': {
          configure(env); run(process.execPath, [path.join(ROOT, 'tests/integration.mjs'), envFile]);
          godotTests(env, ['live_client.gd']);
          break;
        }
        case 'deploy': deploy(env, envFile); break;
        case 'backup': {
          const folder = path.join(ROOT, 'backups'); fs.mkdirSync(folder, { recursive: true });
          const backup = path.join(folder, `${new Date().toISOString().replace(/[:.]/g, '-')}.sql`);
          const fd = fs.openSync(backup, 'wx', 0o600);
          try { compose(envFile, ['exec', '-T', 'postgres', 'pg_dump', '-U', 'nakama', '-d', 'nakama'], { stdio: ['ignore', fd, 'inherit'] }); }
          catch (error) { fs.unlinkSync(backup); throw error; }
          finally { fs.closeSync(fd); }
          console.log(`Saved ${backup}`); break;
        }
      }
    }
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
