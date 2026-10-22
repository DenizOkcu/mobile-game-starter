#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ROOT, readEnv, validate, init, configure, run, compose, serverEnvironment, parseArgs, redact } from './lib.mjs';

function buildServer() {
  for (const args of [['ci', '--ignore-scripts'], ['run', 'type-check'], ['run', 'build']]) run('npm', ['--prefix', path.join(ROOT, 'server'), ...args]);
}
function godotCheck(env) {
  for (const args of [['--editor', '--import'], ['--script', 'res://tests/client_test.gd', '--', '--test']]) {
    const result = run(env.GODOT_BIN, ['--headless', '--path', ROOT, ...args], { capture: true, check: false });
    const output = redact(result.stdout + result.stderr, env);
    console.log(output);
    if (result.status !== 0 || output.includes('ERROR:')) throw new Error('Godot validation failed');
  }
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
  const parsed = parseArgs(process.argv.slice(2), ['init', 'configure', 'build', 'up', 'down', 'logs', 'status', 'check', 'smoke', 'deploy', 'backup']);
  if (parsed.help) process.exit(0);
  const { envFile, command } = parsed;
  if (command === 'init') { init(envFile); configure(readEnv(envFile)); }
  else {
    if (!fs.existsSync(envFile)) throw new Error('Run node tools/manage.mjs init first');
    const env = readEnv(envFile); validate(env);
    switch (command) {
      case 'configure': configure(env); break;
      case 'build': buildServer(); break;
      case 'up': buildServer(); configure(env); compose(envFile, ['up', '-d', '--wait', '--force-recreate', 'nakama']); break;
      case 'down': compose(envFile, ['down']); break;
      case 'logs': compose(envFile, ['logs', '-f', '--tail', '100']); break;
      case 'status': compose(envFile, ['ps']); break;
      case 'check':
        buildServer(); configure(env);
        run(process.execPath, ['--test', path.join(ROOT, 'tests/tooling.test.mjs')]);
        compose(envFile, ['config', '--quiet']); compose(envFile, ['config', '--quiet'], { production: true });
        run('bash', ['-n', path.join(ROOT, 'infra/deploy-remote.sh')]); godotCheck(env); break;
      case 'smoke': {
        configure(env); run(process.execPath, [path.join(ROOT, 'tests/integration.mjs'), envFile]);
        const result = run(env.GODOT_BIN, ['--headless', '--path', ROOT, '--script', 'res://tests/live_client.gd'], { capture: true, check: false });
        const output = redact(result.stdout + result.stderr, env); console.log(output);
        if (result.status !== 0 || output.includes('ERROR:')) throw new Error('Live Godot transport check failed');
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
} catch (error) { console.error(error.message); process.exitCode = 1; }
