"""Run the 0.2 version launcher against an isolated operator-owned directory."""
import json
import os
import re
import subprocess
import tempfile
from contextlib import contextmanager
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

VERSION = Path(__file__).resolve().parent.parent
LAUNCH = str(VERSION / 'Start.cmd')
EVENTS = ('sign-in', 'sign-out', 'revoked', 'invitation', 'account-created',
          'write', 'delete', 'folder', 'refusal')


@contextmanager
def running(env, complete):
    process = subprocess.Popen([LAUNCH], cwd=VERSION, env=env, stdout=subprocess.PIPE,
                               stderr=subprocess.DEVNULL, text=True)
    try:
        first = process.stdout.readline()
        try:
            admin = json.loads(first)
            assert admin['event'] == 'admin-created', first
        except (ValueError, AssertionError, KeyError):
            admin = None
            banner = first
        else:
            banner = process.stdout.readline()
        address = re.search(r'(http://127\.0\.0\.1:\d+)/status', banner)
        assert address, banner
        yield address[1], admin
    finally:
        subprocess.run(['taskkill', '/PID', str(process.pid), '/T', '/F'],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        process.wait(timeout=10)
        rest = process.stdout.read()
        process.stdout.close()
        if complete:
            missing = [event for event in EVENTS if '"event":"%s"' % event not in rest]
            assert not missing, 'missing log lines for %s' % ', '.join(missing)


def request(base, route, method='GET', token=None, json_body=None, text=None):
    headers = {}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    data = None
    if json_body is not None:
        data = json.dumps(json_body).encode()
        headers['Content-Type'] = 'application/json'
    elif text is not None:
        data = text.encode()
        headers['Content-Type'] = 'text/plain'
    req = Request(base + route, data=data, headers=headers, method=method)
    try:
        with urlopen(req, timeout=5) as response:
            assert response.headers['Cache-Control'] == 'no-store'
            return response.status, json.load(response)
    except HTTPError as error:
        return error.code, None


def sign_in(base, key):
    status, body = request(base, '/sessions', 'POST', token=key)
    assert status == 200, (status, body)
    return body


def show(title, value):
    print('%-28s %s' % (title, value))


with tempfile.TemporaryDirectory(prefix='foundationos-02-') as temp:
    env = {**os.environ, 'FOUNDATIONOS_DATA': temp, 'FOUNDATIONOS_PORT': '0'}
    with running(env, complete=True) as (base, admin):
        assert admin and admin['key'], 'first run must print the admin key'
        show('admin id', admin['id'])
        assert request(base, '/status')[1] == {'version': '0.2', 'status': 'ready', 'schema': 2}
        admin_session = sign_in(base, admin['key'])
        assert request(base, '/profile', token=admin['key'])[0] == 401
        assert request(base, '/profile', token=admin_session['token'])[1]['role'] == 'admin'
        members = []
        for name in ('alice', 'blair'):
            status, invitation = request(base, '/invitations', 'POST', token=admin_session['token'])
            assert status == 200, (status, invitation)
            show(name + ' invitation', invitation['id'])
            status, created = request(base, '/accounts', 'POST', token=invitation['token'],
                                      json_body={'name': name})
            assert status == 200, (status, created)
            assert request(base, '/accounts', 'POST', token=invitation['token'],
                           json_body={'name': name})[0] == 403
            show(name + ' id', created['id'])
            members.append({**created, 'session': sign_in(base, created['key'])})
        alice, blair = members
        assert request(base, '/accounts', token=alice['session']['token'])[0] == 403
        assert request(base, '/invitations', 'POST', token=alice['session']['token'])[0] == 403
        listed = request(base, '/accounts', token=admin_session['token'])[1]
        assert sorted(user['name'] for user in listed) == ['admin', 'alice', 'blair']
        assert all('key' not in user and 'digest' not in json.dumps(user) for user in listed)
        assert request(base, '/folder', 'POST', token=alice['session']['token'],
                       json_body={'path': 'docs'})[0] == 200
        assert request(base, '/files/docs/notes.txt', 'PUT', token=alice['session']['token'],
                       text='rain')[0] == 200
        assert request(base, '/files/docs/notes.txt', token=alice['session']['token'])[1] == {'text': 'rain'}
        assert request(base, '/files/docs/notes.txt', token=blair['session']['token'])[0] == 404
        assert request(base, '/folder', 'POST', token=blair['session']['token'],
                       json_body={'path': 'docs'})[0] == 200
        assert request(base, '/files/docs/notes.txt', 'PUT', token=blair['session']['token'],
                       text='sun')[0] == 200
        assert request(base, '/files/docs/notes.txt', token=alice['session']['token'])[1] == {'text': 'rain'}
        assert request(base, '/files/docs/notes.txt', token=blair['session']['token'])[1] == {'text': 'sun'}
        assert request(base, '/files/../profile.json', token=alice['session']['token'])[0] == 404
        assert request(base, '/files/%2e%2e%2fprofile.json', token=alice['session']['token'],
                       text='change')[0] == 404
        a = Path(temp, 'homes', alice['id'], 'files')
        b = Path(temp, 'homes', blair['id'], 'files')
        os.link(b / 'docs' / 'notes.txt', a / 'linked.txt')
        assert request(base, '/files/linked.txt', token=alice['session']['token'])[0] == 404
        assert request(base, '/files/linked.txt', 'PUT', token=alice['session']['token'],
                       text='change')[0] == 404
        (a / 'linked.txt').unlink()
        # Windows junctions can be created without enabling developer mode.
        a.rename(a.with_name('original'))
        command = ['cmd', '/d', '/c', 'mklink', '/J', str(a), str(b)]
        subprocess.run(command, check=True, stdout=subprocess.DEVNULL)
        try:
            assert request(base, '/files/docs/notes.txt', token=alice['session']['token'])[0] >= 400
            assert request(base, '/files/docs/notes.txt', 'PUT', token=alice['session']['token'],
                           text='change')[0] >= 400
        finally:
            a.rmdir()
            a.with_name('original').rename(a)
        status, _ = request(base, '/sessions/' + alice['session']['id'], 'DELETE',
                            token=admin_session['token'])
        assert status == 200, status
        assert request(base, '/profile', token=alice['session']['token'])[0] == 401
        status, _ = request(base, '/sessions/' + blair['session']['id'], 'DELETE',
                            token=blair['session']['token'])
        assert status == 200, status
        assert request(base, '/profile', token=blair['session']['token'])[0] == 401
        blair['session'] = sign_in(base, blair['key'])
        assert request(base, '/files/docs/scratch.txt', 'PUT', token=blair['session']['token'],
                       text='bye')[0] == 200
        assert request(base, '/files/docs/scratch.txt', 'DELETE', token=blair['session']['token'])[0] == 200
    with running(env, complete=False) as (base, second_admin):
        assert second_admin is None, 'restart must not print a second admin key'
        assert request(base, '/status')[1]['schema'] == 2
        again = sign_in(base, blair['key'])
        assert request(base, '/files/docs/notes.txt', token=again['token'])[1] == {'text': 'sun'}
        assert request(base, '/files/docs', token=again['token'])[1] == [{'name': 'notes.txt', 'type': 'file'}]
        assert request(base, '/profile', token=alice['session']['token'])[0] == 401
        assert request(base, '/profile', token=admin_session['token'])[1]['role'] == 'admin'
        fresh = sign_in(base, admin['key'])
        assert request(base, '/accounts', token=fresh['token'])[1][0]['role'] in ('admin', 'member')
    print('Passed: version launcher, first-run admin, invitations, sessions, folders, isolation, links, revocation, restart.')
