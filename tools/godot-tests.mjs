import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ROOT, run, redact } from './lib.mjs';

function userDataRoot() {
  if (process.platform === 'darwin') return path.join(os.homedir(), 'Library/Application Support/Godot/app_userdata');
  if (process.platform === 'win32') return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData/Roaming'), 'Godot/app_userdata');
  return path.join(process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local/share'), 'godot/app_userdata');
}

// A unique project name isolates all user:// writes, including autoload startup.
// The scripts verify the directory and marker before authenticating or testing.
export function godotTests(env, scripts, { root = ROOT, dataRoot = userDataRoot(), execute = run, log = console.log, timeout = 120_000 } = {}) {
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'mobile-starter-godot-'));
  const name = path.basename(stage);
  const data = path.join(dataRoot, name);
  let ownsData = false;
  try {
    fs.mkdirSync(dataRoot, { recursive: true, mode: 0o700 });
    // Refuse to reuse even an empty existing directory.
    fs.mkdirSync(data, { mode: 0o700 });
    ownsData = true;
    fs.writeFileSync(path.join(data, '.test-isolation'), name, { flag: 'wx', mode: 0o600 });
    let project = fs.readFileSync(path.join(root, 'project.godot'), 'utf8');
    project = project.replace(/^config\/(?:name|use_custom_user_dir|custom_user_dir_name)=.*\r?\n/gm, '');
    project = project.replace('[application]', `[application]\nconfig/name="${name}"\nconfig/use_custom_user_dir=false`);
    fs.writeFileSync(path.join(stage, 'project.godot'), project);
    for (const folder of ['client', 'addons', 'tests', 'assets']) {
      if (fs.existsSync(path.join(root, folder))) fs.cpSync(path.join(root, folder), path.join(stage, folder), { recursive: true });
    }
    const commands = [
      ['--editor', '--import'],
      ...['test_storage.gd', ...scripts].map(script => ['--script', `res://tests/${script}`, '--', '--test', '--expected-user-data', data]),
    ];
    for (const args of commands) {
      const result = execute(env.GODOT_BIN, ['--headless', '--path', stage, ...args], {
        capture: true, check: false, timeout, killSignal: 'SIGKILL',
      });
      const output = redact((result.stdout || '') + (result.stderr || ''), env);
      if (output) log(output);
      if (result.error?.code === 'ETIMEDOUT') throw new Error(`Godot validation timed out after ${timeout}ms (${args[0] === '--editor' ? 'import' : args[1]})`);
      if (result.error || result.status !== 0 || output.includes('ERROR:')) throw new Error('Godot validation failed');
    }
  } finally {
    fs.rmSync(stage, { recursive: true, force: true });
    if (ownsData) fs.rmSync(data, { recursive: true, force: true });
  }
}
