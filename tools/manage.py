#!/usr/bin/env python3
"""Small stdlib-only entry point. Run from any working directory."""
import argparse
import json
import os
from pathlib import Path
import re
import secrets
import shlex
import shutil
import subprocess
import sys
import tarfile
import tempfile
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
SECRETS = ('POSTGRES_PASSWORD', 'NAKAMA_SERVER_KEY', 'NAKAMA_SESSION_KEY',
           'NAKAMA_REFRESH_KEY', 'NAKAMA_RUNTIME_KEY', 'NAKAMA_CONSOLE_PASSWORD',
           'NAKAMA_CONSOLE_SIGNING_KEY')


# Public export metadata only; signing credentials are passed to Godot separately.
EXPORT_OPTIONS = {
    'APP_VERSION': ('version/name', '0.1.0'),
    'APP_BUILD_NUMBER': ('version/code', '1'),
    'APP_ICON': ('', ''), 'BOOT_SPLASH_IMAGE': ('', ''),
    'ANDROID_ICON': ('launcher_icons/main_192x192', ''),
    'ANDROID_ADAPTIVE_FOREGROUND': ('launcher_icons/adaptive_foreground_432x432', ''),
    'ANDROID_ADAPTIVE_BACKGROUND': ('launcher_icons/adaptive_background_432x432', ''),
    'ANDROID_ADAPTIVE_MONOCHROME': ('launcher_icons/adaptive_monochrome_432x432', ''),
    'IOS_TEAM_ID': ('application/app_store_team_id', ''),
    'IOS_ICON': ('icons/app_store_1024x1024', ''),
    'IOS_LAUNCH_IMAGE_2X': ('storyboard/custom_image@2x', ''),
    'IOS_LAUNCH_IMAGE_3X': ('storyboard/custom_image@3x', ''),
}


def read_env(path):
    result = {}
    for number, line in enumerate(Path(path).read_text().splitlines(), 1):
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        key, sep, value = line.partition('=')
        if not sep or not re.fullmatch(r'[A-Z][A-Z0-9_]*', key) or key in result:
            raise ValueError(f'Invalid or duplicate env key on line {number}')
        if any(c in value for c in '\r\n\x00$`') or value.startswith(('"', "'")):
            raise ValueError(f'{key}: use literal unquoted values without expansion')
        result[key] = value
    return result


def validate(env, production=False):
    # Mobile export fields are optional for existing/local environments.
    missing = {k for k in read_env(ROOT / '.env.example') if k not in EXPORT_OPTIONS and not k.startswith('GODOT_ANDROID_KEYSTORE_')} - set(env)
    if missing:
        raise ValueError('Missing env keys: ' + ', '.join(sorted(missing)))
    for key in SECRETS:
        if not re.fullmatch(r'[A-Za-z0-9_-]{32,}', env[key]) or env[key].startswith('change_me'):
            raise ValueError(f'{key}: use at least 32 URL-safe characters; run init')
    if len({env[k] for k in SECRETS}) != len(SECRETS):
        raise ValueError('Use different values for every secret')
    if not re.fullmatch(r'[a-z0-9][a-z0-9_-]*', env['COMPOSE_PROJECT_NAME']):
        raise ValueError('Invalid COMPOSE_PROJECT_NAME')
    if not re.fullmatch(r'[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){2,}', env['BUNDLE_ID']):
        raise ValueError('BUNDLE_ID must be a reverse-domain identifier')
    url = urlparse(env['CLIENT_API_URL'])
    if url.scheme not in ('http', 'https') or not url.hostname or url.path not in ('', '/') or url.query or url.fragment or url.username:
        raise ValueError('CLIENT_API_URL must be an HTTP(S) origin')
    for key in ('LOCAL_API_PORT', 'LOCAL_CONSOLE_PORT', 'SSH_PORT'):
        if not env[key].isdigit() or not 1 <= int(env[key]) <= 65535:
            raise ValueError(f'Invalid {key}')
    if env['LOCAL_API_PORT'] == env['LOCAL_CONSOLE_PORT']:
        raise ValueError('Local API and console ports must differ')
    if env['LOCAL_BIND_IP'] not in ('127.0.0.1', '0.0.0.0'):
        raise ValueError('LOCAL_BIND_IP must be 127.0.0.1 or 0.0.0.0')
    for key in ('NAKAMA_IMAGE', 'POSTGRES_IMAGE', 'CADDY_IMAGE'):
        if not re.fullmatch(r'[a-zA-Z0-9./_-]+:[a-zA-Z0-9._-]+', env[key]) or env[key].endswith(':latest'):
            raise ValueError(f'{key}: use a pinned image tag')
    if production:
        if env['SSH_USER'] == 'root':
            raise ValueError('Use a dedicated non-root production SSH_USER')
        domain = env['API_DOMAIN']
        if not re.fullmatch(r'[a-z0-9]+(?:[.-][a-z0-9]+)+', domain) or domain.endswith('example.com'):
            raise ValueError('Set a real API_DOMAIN')
        if env['CLIENT_API_URL'] != f'https://{domain}':
            raise ValueError('Production CLIENT_API_URL must equal https://API_DOMAIN')
        if env['LOCAL_BIND_IP'] != '127.0.0.1':
            raise ValueError('Production API must bind to 127.0.0.1')
        if '@' not in env['TLS_EMAIL'] or env['TLS_EMAIL'].endswith('example.com'):
            raise ValueError('Set TLS_EMAIL')
        for key in ('SSH_USER', 'SSH_HOST'):
            if not re.fullmatch(r'[a-zA-Z0-9][a-zA-Z0-9._-]*', env[key]) or env[key] == 'your-vps':
                raise ValueError(f'Set {key}; IPv6 hosts can use an SSH config alias')
        if not re.fullmatch(r'/[a-zA-Z0-9_/-]+', env['DEPLOY_PATH']) or env['DEPLOY_PATH'] in ('/', '/opt', '/home'):
            raise ValueError('Use a dedicated absolute DEPLOY_PATH without spaces')


def run(args, **kwargs):
    return subprocess.run([str(x) for x in args], cwd=ROOT, check=True, **kwargs)


def compose(env_file, *args, production=False, **kwargs):
    cmd = ['docker', 'compose', '--env-file', env_file, '-f', ROOT / 'compose.yml']
    if production:
        cmd += ['-f', ROOT / 'compose.production.yml']
    # Configuration comes from the selected file, not ambient shell variables.
    clean = {k: v for k, v in os.environ.items() if k not in read_env(ROOT / '.env.example')}
    return run(cmd + list(args), env=clean, **kwargs)


def init(path):
    if path.exists():
        raise ValueError(f'{path.name} exists; refusing to overwrite')
    text = (ROOT / '.env.example').read_text()
    for key in SECRETS:
        text = text.replace(f'{key}=change_me', f'{key}={secrets.token_hex(24)}')
    godot = Path('/Applications/Godot.app/Contents/MacOS/Godot')
    if godot.exists():
        text = text.replace('GODOT_BIN=godot', f'GODOT_BIN={godot}')
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'w') as stream:
        stream.write(text)
    print(f'Created {path.name} with independent random secrets.')


def configure(env):
    public = {'api_url': env['CLIENT_API_URL'], 'server_key': env['NAKAMA_SERVER_KEY'],
              'game_title': env['GAME_TITLE']}
    (ROOT / 'client/config.json').write_text(json.dumps(public, indent=2) + '\n')
    # Only public JSON is packaged; neither .env nor deployment files enter the game.
    title = json.dumps(env['GAME_TITLE'], ensure_ascii=False)
    project = ROOT / 'project.godot'
    project.write_text(re.sub(r'^config/name=.*$', lambda _: 'config/name=' + title, project.read_text(), flags=re.M))
    preset = (ROOT / 'tools/export_presets.template').read_text().replace('@BUNDLE_ID@', env['BUNDLE_ID'])
    options = {key: env.get(key, default) for key, (_, default) in EXPORT_OPTIONS.items()}
    if not options['APP_BUILD_NUMBER'].isdigit() or int(options['APP_BUILD_NUMBER']) < 1:
        raise ValueError('APP_BUILD_NUMBER must be a positive integer')
    if not re.fullmatch(r'[0-9]+(?:\.[0-9]+){0,2}', options['APP_VERSION']):
        raise ValueError('APP_VERSION must contain one to three numeric components')
    assets = [k for k in options if k not in ('APP_VERSION', 'APP_BUILD_NUMBER', 'IOS_TEAM_ID')]
    for key in assets:
        value = options[key]
        if not value:
            continue
        asset = (ROOT / value[6:]).resolve() if value.startswith('res://') else None
        if asset is None or not asset.is_relative_to(ROOT) or not asset.is_file():
            raise ValueError(f'{key} must reference an existing asset inside res://')
    encode = lambda value: json.dumps(value, ensure_ascii=False)
    text = project.read_text()
    for key, setting in [('APP_ICON', 'config/icon'), ('BOOT_SPLASH_IMAGE', 'boot_splash/image')]:
        line = setting + '=' + encode(options[key])
        if re.search(r'^' + re.escape(setting) + r'=', text, re.M):
            text = re.sub(r'^' + re.escape(setting) + r'=.*$', lambda _: line, text, flags=re.M)
        elif options[key]:
            text = text.replace('[application]\n', '[application]\n' + line + '\n')
    if not options['APP_ICON'] and options['IOS_ICON']:
        raise ValueError('Set APP_ICON as the shared icon fallback when using IOS_ICON')
    project.write_text(text)
    android, ios = [], []
    for key, (setting, _) in EXPORT_OPTIONS.items():
        if not setting:
            continue
        value = str(int(options[key])) if key == 'APP_BUILD_NUMBER' else encode(options[key])
        (ios if key.startswith('IOS_') else android).append(setting + '=' + value)
    ios += ['application/short_version=' + encode(options['APP_VERSION']),
            'application/version=' + encode(options['APP_BUILD_NUMBER'])]
    preset = preset.replace('@ANDROID_OPTIONS@', '\n'.join(android))
    preset = preset.replace('@IOS_OPTIONS@', '\n'.join(ios))
    (ROOT / 'export_presets.cfg').write_text(preset)
    print('Configured client and mobile export presets (public values only).')


def build_server():
    run(["npm", "--prefix", ROOT / "server", "ci", "--ignore-scripts"])
    run(["npm", "--prefix", ROOT / "server", "run", "type-check"])
    run(["npm", "--prefix", ROOT / "server", "run", "build"])


def godot_check(env):
    executable = env['GODOT_BIN']
    if not shutil.which(executable):
        raise ValueError('Godot not found; set GODOT_BIN in .env')
    for args in [('--editor', '--import'), ('--script', 'res://tests/client_test.gd', '--', '--test')]:
        result = run([executable, '--headless', '--path', ROOT, *args], capture_output=True, text=True)
        output = result.stdout + result.stderr
        print(output)
        if 'SCRIPT ERROR:' in output or 'ERROR:' in output:
            raise ValueError('Godot logged errors')


def server_environment(env):
    keys = (*SECRETS, 'COMPOSE_PROJECT_NAME', 'NAKAMA_IMAGE', 'POSTGRES_IMAGE',
            'CADDY_IMAGE', 'LOG_LEVEL', 'LOCAL_BIND_IP', 'LOCAL_API_PORT',
            'LOCAL_CONSOLE_PORT', 'API_DOMAIN', 'TLS_EMAIL')
    return ''.join(f'{key}={env[key]}\n' for key in keys)


def deploy(env, env_file):
    validate(env, production=True)
    build_server()
    configure(env)
    compose(env_file, 'config', '--quiet', production=True)
    godot_check(env)
    target = f"{env['SSH_USER']}@{env['SSH_HOST']}"
    ssh = ['ssh', '-p', env['SSH_PORT'], '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', target]
    dest = env['DEPLOY_PATH']
    # All interpolated remote values are validated and shell-quoted.
    qdest = shlex.quote(dest)
    run(ssh + [f'test -d {qdest} && test -w {qdest} && docker compose version >/dev/null'])
    with tempfile.TemporaryDirectory() as folder:
        archive = Path(folder) / 'backend.tar.gz'
        with tarfile.open(archive, 'w:gz') as tar:
            for name in ('compose.yml', 'compose.production.yml', 'infra', 'server/modules'):
                tar.add(ROOT / name, arcname=name)
            server_env = Path(folder) / '.env'
            server_env.write_text(server_environment(env))
            server_env.chmod(0o600)
            tar.add(server_env, arcname='.env')
        archive.chmod(0o600)
        run(['scp', '-P', env['SSH_PORT'], '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', archive, f'{target}:{dest}/backend.tar.gz'])
    script = f'''set -eu
cd {qdest}
unset {' '.join(read_env(ROOT / '.env.example'))}
umask 077
if [ -f .env ]; then cp .env .env.previous; chmod 600 .env.previous; fi
tar -xzf backend.tar.gz
rm backend.tar.gz
rm -f server/modules/main.lua
chmod 600 .env
docker compose --env-file .env -f compose.yml -f compose.production.yml pull
docker compose --env-file .env -f compose.yml -f compose.production.yml up -d --wait --force-recreate
docker compose --env-file .env -f compose.yml -f compose.production.yml ps
'''
    run(ssh + ['sh -s'], input=script, text=True)
    print('Deployed. Verify DNS/TLS with: ' + env['CLIENT_API_URL'] + '/healthcheck')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--env-file', default='.env', help='Relative to repo or absolute')
    parser.add_argument('command', choices=['init', 'configure', 'build', 'up', 'down', 'logs', 'status', 'check', 'smoke', 'deploy', 'backup'])
    args = parser.parse_args()
    path = (ROOT / args.env_file).resolve()
    if args.command == 'init':
        init(path)
        configure(read_env(path))
        return
    if not path.exists():
        raise ValueError('Run python3 tools/manage.py init first')
    env = read_env(path)
    validate(env)
    if args.command == 'configure':
        configure(env)
    elif args.command == 'build':
        build_server()
    elif args.command == 'up':
        build_server()
        configure(env)
        compose(path, 'up', '-d', '--wait', '--force-recreate', 'nakama')
    elif args.command in ('down', 'logs', 'status'):
        compose(path, *{'down': ['down'], 'logs': ['logs', '-f', '--tail', '100'], 'status': ['ps']}[args.command])
    elif args.command == 'check':
        build_server()
        configure(env)
        run([sys.executable, '-m', 'unittest', 'discover', '-s', 'tests', '-p', 'test_*.py'])
        compose(path, 'config', '--quiet')
        compose(path, 'config', '--quiet', production=True)
        godot_check(env)
    elif args.command == 'smoke':
        configure(env)
        run([sys.executable, ROOT / 'tests/integration.py', str(path)])
        result = run([env['GODOT_BIN'], '--headless', '--path', ROOT, '--script', 'res://tests/live_client.gd'], capture_output=True, text=True)
        output = result.stdout + result.stderr
        print(output)
        if 'ERROR:' in output:
            raise ValueError('Live Godot transport check logged errors')
    elif args.command == 'deploy':
        deploy(env, path)
    elif args.command == 'backup':
        from datetime import datetime, timezone
        folder = ROOT / 'backups'
        folder.mkdir(exist_ok=True)
        backup = folder / (datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '.sql')
        with backup.open('xb') as output:
            compose(path, 'exec', '-T', 'postgres', 'pg_dump', '-U', 'nakama', '-d', 'nakama', stdout=output)
        backup.chmod(0o600)
        print('Saved ' + str(backup))


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        sys.exit(str(error))
