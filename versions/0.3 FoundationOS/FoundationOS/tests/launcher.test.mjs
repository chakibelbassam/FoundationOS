// Windows-only launcher test: Start.cmd <server-url> must reach the host with --server.
// The host and a stub server are started by the test; everything is stopped in finally.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const versionRoot = path.resolve(here, '..', '..');
const isWindows = process.platform === 'win32';

test('Start.cmd passes a positional server URL to the host', { skip: !isWindows }, async () => {
  const stub = createServer((request, response) => {
    if (request.url === '/status') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ version: '0.3', status: 'ready', schema: 3, setup: 'ready' }));
      return;
    }
    response.writeHead(404, { 'content-type': 'application/json' });
    response.end('{"error":"not found"}');
  });
  await new Promise((resolve) => stub.listen(0, '127.0.0.1', resolve));
  const port = stub.address().port;
  const child = spawn('cmd.exe', ['/c', path.join(versionRoot, 'Start Client.cmd'), `http://127.0.0.1:${port}`, '--no-open', '--port', '0'], {
    cwd: versionRoot,
    windowsHide: true,
  });
  try {
    const output = await new Promise((resolve, reject) => {
      let text = '';
      const timer = setTimeout(() => reject(new Error(`launcher did not become ready. Output:\n${text}`)), 20000);
      child.stdout.on('data', (chunk) => {
        text += chunk;
        if (text.includes('client ready at http://127.0.0.1:')) {
          clearTimeout(timer);
          resolve(text);
        }
      });
      child.stderr.on('data', (chunk) => { text += chunk; });
      child.on('exit', (code) => {
        clearTimeout(timer);
        reject(new Error(`launcher exited with ${code}. Output:\n${text}`));
      });
    });
    assert.match(output, /FoundationOS 0\.2 client ready at http:\/\/127\.0\.0\.1:\d+\//);
    assert.doesNotMatch(output, /Unknown argument/);
  } finally {
    if (child.pid) {
      spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { windowsHide: true });
    }
    await new Promise((resolve) => stub.close(resolve));
  }
});

