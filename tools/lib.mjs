import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const SECRETS = ['POSTGRES_PASSWORD', 'NAKAMA_SERVER_KEY', 'NAKAMA_SESSION_KEY',
  'NAKAMA_REFRESH_KEY', 'NAKAMA_RUNTIME_KEY', 'NAKAMA_CONSOLE_PASSWORD', 'NAKAMA_CONSOLE_SIGNING_KEY'];
export const EXPORT_OPTIONS = {
  APP_VERSION: ['version/name', '0.1.0'], APP_BUILD_NUMBER: ['version/code', '1'],
  APP_ICON: ['', ''], BOOT_SPLASH_IMAGE: ['', ''],
  ANDROID_ICON: ['launcher_icons/main_192x192', ''],
  ANDROID_ADAPTIVE_FOREGROUND: ['launcher_icons/adaptive_foreground_432x432', ''],
  ANDROID_ADAPTIVE_BACKGROUND: ['launcher_icons/adaptive_background_432x432', ''],
  ANDROID_ADAPTIVE_MONOCHROME: ['launcher_icons/adaptive_monochrome_432x432', ''],
  IOS_TEAM_ID: ['application/app_store_team_id', ''], IOS_ICON: ['icons/app_store_1024x1024', ''],
  IOS_LAUNCH_IMAGE_2X: ['storyboard/custom_image@2x', ''], IOS_LAUNCH_IMAGE_3X: ['storyboard/custom_image@3x', ''],
};

export function parseEnv(text) {
  const env = Object.create(null);
  for (const [index, raw] of text.split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const split = line.indexOf('=');
    const key = line.slice(0, split);
    const value = line.slice(split + 1);
    if (split < 0 || !/^[A-Z][A-Z0-9_]*$/.test(key) || Object.hasOwn(env, key)) {
      throw new Error(`Invalid or duplicate env key on line ${index + 1}`);
    }
    if (/[\r\n\x00$`]/.test(value) || /^["']/.test(value)) {
      throw new Error(`${key}: use literal unquoted values without expansion`);
    }
    env[key] = value;
  }
  return env;
}
export const readEnv = file => parseEnv(fs.readFileSync(file, 'utf8'));
export const isFile = file => { try { return fs.statSync(file).isFile(); } catch { return false; } };

export function validate(env, { production = false, root = ROOT } = {}) {
  const missing = Object.keys(readEnv(path.join(root, '.env.example'))).filter(key =>
    !(key in EXPORT_OPTIONS) && !key.startsWith('GODOT_ANDROID_KEYSTORE_') && !Object.hasOwn(env, key));
  if (missing.length) throw new Error(`Missing env keys: ${missing.join(', ')}`);
  for (const key of SECRETS) {
    if (!/^[A-Za-z0-9_-]{32,}$/.test(env[key]) || env[key].startsWith('change_me')) {
      throw new Error(`${key}: use at least 32 URL-safe characters; run init`);
    }
  }
  if (new Set(SECRETS.map(key => env[key])).size !== SECRETS.length) throw new Error('Use different values for every secret');
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(env.COMPOSE_PROJECT_NAME)) throw new Error('Invalid COMPOSE_PROJECT_NAME');
  if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){2,}$/.test(env.BUNDLE_ID)) throw new Error('BUNDLE_ID must be a reverse-domain identifier');
  let url;
  try { url = new URL(env.CLIENT_API_URL); } catch { throw new Error('CLIENT_API_URL must be an HTTP(S) origin'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
    throw new Error('CLIENT_API_URL must be an HTTP(S) origin');
  }
  for (const key of ['LOCAL_API_PORT', 'LOCAL_CONSOLE_PORT', 'SSH_PORT']) {
    if (!/^\d+$/.test(env[key]) || Number(env[key]) < 1 || Number(env[key]) > 65535) throw new Error(`Invalid ${key}`);
  }
  if (Number(env.LOCAL_API_PORT) === Number(env.LOCAL_CONSOLE_PORT)) throw new Error('Local API and console ports must differ');
  if (!['127.0.0.1', '0.0.0.0'].includes(env.LOCAL_BIND_IP)) throw new Error('LOCAL_BIND_IP must be 127.0.0.1 or 0.0.0.0');
  for (const key of ['NAKAMA_IMAGE', 'POSTGRES_IMAGE', 'CADDY_IMAGE']) {
    if (!/^[a-zA-Z0-9./_-]+:[a-zA-Z0-9._-]+$/.test(env[key]) || env[key].endsWith(':latest')) throw new Error(`${key}: use a pinned image tag`);
  }
  if (!production) return;
  if (env.SSH_USER === 'root') throw new Error('Use a dedicated non-root production SSH_USER');
  if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)+$/.test(env.API_DOMAIN) || env.API_DOMAIN.endsWith('example.com')) throw new Error('Set a real API_DOMAIN');
  if (env.CLIENT_API_URL !== `https://${env.API_DOMAIN}`) throw new Error('Production CLIENT_API_URL must equal https://API_DOMAIN');
  if (env.LOCAL_BIND_IP !== '127.0.0.1') throw new Error('Production API must bind to 127.0.0.1');
  if (!env.TLS_EMAIL.includes('@') || env.TLS_EMAIL.endsWith('example.com')) throw new Error('Set TLS_EMAIL');
  for (const key of ['SSH_USER', 'SSH_HOST']) {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(env[key]) || env[key] === 'your-vps') throw new Error(`Set ${key}; IPv6 hosts can use an SSH config alias`);
  }
  if (!/^\/[a-zA-Z0-9_/-]+$/.test(env.DEPLOY_PATH) || ['/', '/opt', '/home'].includes(env.DEPLOY_PATH)) throw new Error('Use a dedicated absolute DEPLOY_PATH without spaces');
}

export function init(file, root = ROOT) {
  let text = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
  for (const key of SECRETS) text = text.replace(`${key}=change_me`, `${key}=${randomBytes(24).toString('hex')}`);
  const godot = '/Applications/Godot.app/Contents/MacOS/Godot';
  if (isFile(godot)) text = text.replace('GODOT_BIN=godot', `GODOT_BIN=${godot}`);
  fs.writeFileSync(file, text, { flag: 'wx', mode: 0o600 });
  console.log(`Created ${path.basename(file)} with independent random secrets.`);
}

export function configure(env, root = ROOT) {
  const options = Object.fromEntries(Object.entries(EXPORT_OPTIONS).map(([key, [, fallback]]) => [key, env[key] ?? fallback]));
  if (!/^\d+$/.test(options.APP_BUILD_NUMBER) || !Number.isSafeInteger(Number(options.APP_BUILD_NUMBER)) || Number(options.APP_BUILD_NUMBER) < 1) throw new Error('APP_BUILD_NUMBER must be a positive integer');
  if (!/^[0-9]+(?:\.[0-9]+){0,2}$/.test(options.APP_VERSION)) throw new Error('APP_VERSION must contain one to three numeric components');
  for (const [key, value] of Object.entries(options)) {
    if (!value || ['APP_VERSION', 'APP_BUILD_NUMBER', 'IOS_TEAM_ID'].includes(key)) continue;
    let asset;
    try { if (value.startsWith('res://')) asset = fs.realpathSync(path.resolve(root, value.slice(6))); } catch { /* Invalid asset below. */ }
    const relative = asset && path.relative(fs.realpathSync(root), asset);
    if (!asset || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative) || !isFile(asset)) {
      throw new Error(`${key} must reference an existing asset inside res://`);
    }
  }
  if (!options.APP_ICON && options.IOS_ICON) throw new Error('Set APP_ICON as the shared icon fallback when using IOS_ICON');
  const project = path.join(root, 'project.godot');
  let text = fs.readFileSync(project, 'utf8').replace(/^config\/name=.*$/m, () => `config/name=${JSON.stringify(env.GAME_TITLE)}`);
  for (const [key, setting] of [['APP_ICON', 'config/icon'], ['BOOT_SPLASH_IMAGE', 'boot_splash/image']]) {
    const line = `${setting}=${JSON.stringify(options[key])}`;
    const pattern = new RegExp(`^${setting}=.*$`, 'm');
    if (pattern.test(text)) text = text.replace(pattern, () => line);
    else if (options[key]) text = text.replace('[application]\n', `[application]\n${line}\n`);
  }
  const android = [], ios = [];
  for (const [key, [setting]] of Object.entries(EXPORT_OPTIONS)) {
    if (!setting) continue;
    const value = key === 'APP_BUILD_NUMBER' ? Number(options[key]) : JSON.stringify(options[key]);
    (key.startsWith('IOS_') ? ios : android).push(`${setting}=${value}`);
  }
  ios.push(`application/short_version=${JSON.stringify(options.APP_VERSION)}`, `application/version=${JSON.stringify(options.APP_BUILD_NUMBER)}`);
  const preset = fs.readFileSync(path.join(root, 'tools/export_presets.template'), 'utf8')
    .replaceAll('@BUNDLE_ID@', env.BUNDLE_ID).replace('@ANDROID_OPTIONS@', android.join('\n')).replace('@IOS_OPTIONS@', ios.join('\n'));
  fs.writeFileSync(project, text);
  fs.writeFileSync(path.join(root, 'export_presets.cfg'), preset);
  fs.writeFileSync(path.join(root, 'client/config.json'), JSON.stringify({ api_url: env.CLIENT_API_URL, server_key: env.NAKAMA_SERVER_KEY, game_title: env.GAME_TITLE }, null, 2) + '\n');
  console.log('Configured client and mobile export presets (public values only).');
}

export function cleanEnvironment(root = ROOT, inherited = process.env) {
  const env = { ...inherited };
  for (const key of Object.keys(readEnv(path.join(root, '.env.example')))) delete env[key];
  return env;
}
export function run(command, args = [], options = {}) {
  // npm is a .cmd launcher on Windows. Invoke its JS CLI directly, never a shell.
  if (process.platform === 'win32' && command === 'npm') {
    const cli = path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
    if (!isFile(cli)) throw new Error('npm CLI not found beside Node.js; use a standard Node installation or WSL');
    return run(process.execPath, [cli, ...args], options);
  }
  const result = spawnSync(command, args.map(String), {
    cwd: ROOT, stdio: options.capture ? 'pipe' : ['pipe', 'inherit', 'inherit'],
    encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, ...options,
  });
  if (result.error && !(options.check === false && result.error.code === 'ETIMEDOUT')) throw new Error(`Unable to run ${command}: ${result.error.code}`);
  if (result.status !== 0 && options.check !== false) throw new Error(`${command} failed (exit ${result.status ?? result.signal})`);
  return result;
}
export function compose(envFile, args, { production = false, ...options } = {}) {
  return run('docker', ['compose', '--env-file', envFile, '-f', path.join(ROOT, 'compose.yml'),
    ...(production ? ['-f', path.join(ROOT, 'compose.production.yml')] : []), ...args], { env: cleanEnvironment(), ...options });
}
export function serverEnvironment(env) {
  return [...SECRETS, 'COMPOSE_PROJECT_NAME', 'NAKAMA_IMAGE', 'POSTGRES_IMAGE', 'CADDY_IMAGE', 'LOG_LEVEL',
    'LOCAL_BIND_IP', 'LOCAL_API_PORT', 'LOCAL_CONSOLE_PORT', 'API_DOMAIN', 'TLS_EMAIL'].map(key => `${key}=${env[key]}\n`).join('');
}
export function redact(output, env) {
  for (const [key, value] of Object.entries(env)) {
    if (value && (key.includes('PASSWORD') || key.endsWith('_KEY'))) output = output.replaceAll(value, '[redacted]');
  }
  return output;
}
export function parseArgs(args, commands) {
  const usage = `Usage: node tools/${commands.includes('init') ? 'manage' : 'export'}.mjs [--env-file FILE] ${commands.join('|')}`;
  if (args.length === 1 && ['--help', '-h'].includes(args[0])) { console.log(usage); return { help: true }; }
  let envFile = '.env';
  if (args[0] === '--env-file') { envFile = args[1]; args = args.slice(2); }
  if (!envFile || args.length !== 1 || !commands.includes(args[0])) throw new Error(usage);
  return { envFile: path.resolve(ROOT, envFile), command: args[0] };
}
