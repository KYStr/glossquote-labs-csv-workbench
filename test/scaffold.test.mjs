import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { check, projectRoot } from '../scripts/check.mjs';
import { startServer } from '../scripts/serve.mjs';

test('scaffold really validates the assets', async () => { assert.ok((await check()).length >= 4); });
test('loopback server: MIME, noindex, methods, traversal, dotfiles, symlink escape', async t => {
  const temporary = resolve(projectRoot, 'test/.tmp/scaffold');
  await mkdir(resolve(temporary, 'public'), { recursive: true });
  await writeFile(resolve(temporary, 'public/index.html'), '<h1>synthetic</h1>');
  await writeFile(resolve(temporary, 'outside.html'), 'synthetic outside');
  await symlink(resolve(temporary), resolve(temporary, 'public/escape'), 'junction');
  const server = await startServer({ root: resolve(temporary, 'public'), port: 0 });
  t.after(async () => { await new Promise(done => server.close(done)); await rm(temporary, { recursive: true }); });
  assert.equal(server.address().address, '127.0.0.1');
  const request = (path, method = 'GET') => new Promise((done, reject) => {
    const req = http.request({ host: '127.0.0.1', port: server.address().port, path, method }, response => {
      let body = ''; response.on('data', chunk => { body += chunk; }); response.on('end', () => done({ status: response.statusCode, headers: response.headers, body }));
    }); req.on('error', reject); req.end();
  });
  const page = await request('/');
  assert.equal(page.status, 200); assert.match(page.headers['content-type'], /text\/html/u);
  assert.equal(page.headers['x-content-type-options'], 'nosniff'); assert.match(page.headers['x-robots-tag'], /noindex/u);
  assert.equal((await request('/', 'HEAD')).body, '');
  for (const [path, code] of [['/%2e%2e/outside.html', 403], ['/.env', 403], ['/escape/outside.html', 403], ['/%00', 400], ['/%xx', 400], ['/package.json', 404], ['/missing', 404], ['/bad%5cpath', 400]]) assert.equal((await request(path)).status, code, path);
  assert.equal((await request('/', 'POST')).status, 405);
});
