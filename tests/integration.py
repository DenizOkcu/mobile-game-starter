#!/usr/bin/env python3
"""Real API contract checks. Creates and deletes only unique test accounts."""
import base64
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
import sys
import uuid
from urllib.error import HTTPError
from urllib.request import Request, urlopen

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
from manage import read_env

env = read_env(sys.argv[1])
origin = env['CLIENT_API_URL'].rstrip('/')
basic = 'Basic ' + base64.b64encode((env['NAKAMA_SERVER_KEY'] + ':').encode()).decode()
accounts = []


def request(path, data=None, auth=basic, method='POST'):
    body = None if data is None else json.dumps(data).encode()
    req = Request(origin + path, body, {'Content-Type': 'application/json', 'Authorization': auth}, method=method)
    try:
        with urlopen(req, timeout=20) as response:
            return response.status, json.load(response)
    except HTTPError as error:
        return error.code, json.load(error)


def rpc(name, payload, token, expected=200):
    status, body = request('/v2/rpc/' + name, json.dumps(payload), 'Bearer ' + token)
    assert status == expected, (name, status, body)
    return json.loads(body['payload']) if status == 200 else body


try:
    status, _ = request('/healthcheck', method='GET')
    assert status == 200
    device = uuid.uuid4().hex
    status, guest = request('/v2/account/authenticate/device?create=true', {'id': device})
    assert status == 200, guest
    token = guest['token']
    accounts.append(token)
    original = rpc('get_state', {}, token)['state']
    assert original['coins'] == 0 and original['schema_version'] == 1
    assert rpc('update_profile', {'display_name': 'Test Pilot'}, token)['state']['display_name'] == 'Test Pilot'
    rpc('update_profile', {'display_name': 'Invalid\nName'}, token, 400)
    rpc('complete_tutorial', {'coins': 9999}, token, 400)
    rpc('get_state', [], token, 400)
    rpc('get_state', {}, '', 401)
    # Concurrent replay must never grant a second reward. OCC conflicts are expected.
    def activate(_):
        return request('/v2/rpc/complete_tutorial', '{}', 'Bearer ' + token)[0]
    with ThreadPoolExecutor(max_workers=8) as pool:
        statuses = list(pool.map(activate, range(8)))
    assert all(code in (200, 409) for code in statuses), statuses
    state = rpc('get_state', {}, token)['state']
    assert state['coins'] == 10 and state['tutorial_completed']
    assert rpc('complete_tutorial', {}, token)['state']['coins'] == 10
    status, other = request('/v2/account/authenticate/device?create=true', {'id': uuid.uuid4().hex})
    assert status == 200
    accounts.append(other['token'])
    assert rpc('get_state', {}, other['token'])['state']['coins'] == 0
    # Clients cannot overwrite server-owned storage, even their own.
    status, account = request('/v2/account', auth='Bearer ' + token, method='GET')
    user_id = account['user']['id']
    status, _ = request('/v2/storage', {'objects': [{'collection': 'player', 'key': 'state', 'value': '{"coins":999}', 'user_id': user_id}]}, 'Bearer ' + token, 'PUT')
    assert status in (400, 403), status
    email = 'starter-' + uuid.uuid4().hex + '@example.com'
    password = uuid.uuid4().hex
    status, body = request('/v2/account/link/email', {'email': email, 'password': password}, 'Bearer ' + token)
    assert status == 200, body
    status, login = request('/v2/account/authenticate/email?create=false', {'email': email, 'password': password})
    assert status == 200, login
    assert rpc('get_state', {}, login['token'])['state']['coins'] == 10
    status, restored = request('/v2/account/session/refresh', {'token': login['refresh_token']})
    assert status == 200, (status, restored)
    assert rpc('get_state', {}, restored['token'])['state']['display_name'] == 'Test Pilot'
    status, _ = request('/v2/session/logout', {'token': restored['token'], 'refresh_token': restored['refresh_token']}, 'Bearer ' + restored['token'])
    assert status == 200
    status, _ = request('/v2/account/session/refresh', {'token': restored['refresh_token']})
    assert status in (401, 403)
    # Original guest session remains valid and is used for cleanup.
    print('PASS: guest, profile, intent validation, isolation, OCC/replay, storage permissions, email linking/login, refresh/logout')
finally:
    for token in accounts:
        status, body = request('/v2/account', auth='Bearer ' + token, method='DELETE')
        if status != 200:
            print('Test account cleanup failed:', status, body, file=sys.stderr)
