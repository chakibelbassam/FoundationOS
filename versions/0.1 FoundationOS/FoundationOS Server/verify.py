"""Run the version launcher against an isolated operator-owned directory."""
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


@contextmanager
def running(env):
    process = subprocess.Popen([LAUNCH], cwd=VERSION, env=env, stdout=subprocess.PIPE,
                               stderr=subprocess.DEVNULL, text=True)
    try:
        banner = process.stdout.readline()
        address = re.search(r'(http://127\.0\.0\.1:\d+)/status', banner)
        assert address, banner
        yield address[1]
    finally:
        subprocess.run(['taskkill', '/PID', str(process.pid), '/T', '/F'],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        process.wait(timeout=10)
        process.stdout.close()


def request(base, route, user=None, text=None):
    headers = {'Authorization': 'Bearer ' + user['token']} if user else {}
    req = Request(base + route, data=text.encode() if text is not None else None,
                  headers=headers, method='PUT' if text is not None else 'GET')
    try:
        with urlopen(req, timeout=5) as response:
            return response.status, json.load(response)
    except HTTPError as error:
        return error.code, None


with tempfile.TemporaryDirectory(prefix='foundationos-pi01-') as temp:
    env = {**os.environ, 'FOUNDATIONOS_DATA': temp, 'FOUNDATIONOS_PORT': '0'}
    users = [json.loads(subprocess.check_output([LAUNCH, 'create-user', name], cwd=VERSION,
             env=env, stderr=subprocess.DEVNULL)) for name in ('alice', 'blair')]
    alice, blair = users
    for user in users:
        profile = Path(temp, 'homes', user['id'], 'profile.json')
        assert json.loads(profile.read_text()) == {'id': user['id'], 'name': user['name']}
    with running(env) as base:
        assert request(base, '/status')[1]['version'] == '0.1'
        assert request(base, '/files')[0] == 401
        assert request(base, '/files/weather.txt', alice, 'rain')[0] == 200
        assert request(base, '/files/weather.txt', blair)[0] == 404
        assert request(base, '/files/weather.txt', blair, 'sun')[0] == 200
        assert request(base, '/files/../profile.json', alice)[0] == 404
        assert request(base, '/files/%2e%2e%2fprofile.json', alice, 'change')[0] == 404
        a = Path(temp,'homes',alice['id'],'files')
        b = Path(temp,'homes',blair['id'],'files')
        os.link(b/'weather.txt', a/'linked.txt')
        assert request(base, '/files/linked.txt', alice)[0] == 404
        assert request(base, '/files/linked.txt', alice, 'change')[0] == 404
        (a/'linked.txt').unlink()
        # Windows junctions can be created without enabling developer mode.
        a.rename(a.with_name('original'))
        command = ['cmd', '/d', '/c', 'mklink', '/J', str(a), str(b)]
        subprocess.run(command,check=True,stdout=subprocess.DEVNULL)
        try:
            assert request(base, '/files/weather.txt',alice)[0] >= 400
            assert request(base, '/files/weather.txt',alice,'change')[0] >= 400
        finally:
            a.rmdir()
            a.with_name('original').rename(a)
    with running(env) as base:
        for user, expected in zip(users, ('rain','sun')):
            assert request(base, '/profile',user)[1]['id'] == user['id']
            assert request(base, '/files/weather.txt',user)[1] == {'text':expected}
    print('Passed: version launcher, two profiles, scoped reads and writes, links, restart.')
