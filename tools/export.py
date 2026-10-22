#!/usr/bin/env python3
"""Export via the selected env file without placing signing secrets in presets."""
import argparse
import os
from pathlib import Path
import subprocess
import sys
from urllib.parse import urlparse
from manage import ROOT, read_env, validate, configure


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--env-file', default='.env')
    parser.add_argument('target', choices=['android-debug', 'android-release', 'ios-project'])
    args = parser.parse_args()
    env = read_env((ROOT / args.env_file).resolve())
    validate(env)
    if args.target == 'android-release':
        if urlparse(env['CLIENT_API_URL']).scheme != 'https':
            raise ValueError('Release builds require a verified HTTPS backend')
        for suffix in ('PATH', 'USER', 'PASSWORD'):
            key = 'GODOT_ANDROID_KEYSTORE_RELEASE_' + suffix
            if not env.get(key):
                raise ValueError(f'Set {key} privately in the selected env file')
        if not Path(env['GODOT_ANDROID_KEYSTORE_RELEASE_PATH']).is_file():
            raise ValueError('Release keystore not found')
    if args.target == 'ios-project':
        if sys.platform != 'darwin':
            raise ValueError('iOS export requires macOS and Xcode')
        if not env.get('IOS_TEAM_ID'):
            raise ValueError('Set IOS_TEAM_ID in the selected env file')
    configure(env)
    child_env = os.environ.copy()
    # Do not pass the whole server environment to the game exporter.
    for key in read_env(ROOT / '.env.example'):
        child_env.pop(key, None)
    signing_prefix = 'GODOT_ANDROID_KEYSTORE_' + ('RELEASE_' if args.target == 'android-release' else 'DEBUG_')
    if args.target.startswith('android-'):
        for suffix in ('PATH', 'USER', 'PASSWORD'):
            key = signing_prefix + suffix
            if env.get(key):
                child_env[key] = env[key]
    target = ROOT / 'exports' / ('ios' if args.target == 'ios-project' else 'android')
    target.mkdir(parents=True, exist_ok=True)
    release = args.target == 'android-release'
    preset = 'iOS' if args.target == 'ios-project' else 'Android'
    filename = 'prototype.zip' if preset == 'iOS' else ('prototype-release.apk' if release else 'prototype-debug.apk')
    result = subprocess.run([env['GODOT_BIN'], '--headless', '--path', ROOT,
         '--export-release' if release else '--export-debug', preset, str(target / filename)], cwd=ROOT, env=child_env, capture_output=True, text=True)
    output = result.stdout + result.stderr
    for key, value in env.items():
        if value and ('PASSWORD' in key or key.endswith('_KEY')):
            output = output.replace(value, '[redacted]')
    print(output)
    if result.returncode != 0 or 'ERROR:' in output or not (target / filename).is_file():
        raise ValueError('Godot did not produce a verified export; inspect the redacted diagnostics')
    print('Export finished: ' + str(target / filename))


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        sys.exit(str(error))
