import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, PRODUCTS } from './exercise.js';

let server;
let baseUrl;

beforeEach(async () => {
  server = createServer();
  assert.ok(
    server && typeof server.listen === 'function',
    'createServer() phải trả về một http.Server (kết quả của http.createServer)',
  );
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterEach(() => {
  if (server?.listening) {
    server.closeAllConnections();
    server.close();
  }
});

async function request(method, path) {
  const res = await fetch(`${baseUrl}${path}`, { method, signal: AbortSignal.timeout(2000) });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, headers: res.headers, body };
}

test('GET /health trả 200 { status: "ok" }', { timeout: 5000 }, async () => {
  const res = await request('GET', '/health');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { status: 'ok' }, 'body phải là JSON { "status": "ok" }');
});

test('GET /products trả mảng sản phẩm', { timeout: 5000 }, async () => {
  const res = await request('GET', '/products');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, PRODUCTS);
});

test('Mọi response đều có Content-Type application/json', { timeout: 5000 }, async () => {
  for (const [method, path] of [['GET', '/health'], ['GET', '/nope'], ['POST', '/health']]) {
    const res = await request(method, path);
    assert.match(
      res.headers.get('content-type') ?? '',
      /^application\/json/,
      `${method} ${path}: thiếu header Content-Type: application/json`,
    );
  }
});

test('Route không tồn tại trả 404 JSON', { timeout: 5000 }, async () => {
  const res = await request('GET', '/abc');
  assert.equal(res.status, 404);
  assert.deepEqual(res.body, { error: 'Not Found' });
});

test('Route có nhưng sai method trả 405 kèm header Allow', { timeout: 5000 }, async () => {
  const res = await request('POST', '/health');
  assert.equal(res.status, 405, 'POST /health: route có tồn tại nên là 405, không phải 404');
  assert.deepEqual(res.body, { error: 'Method Not Allowed' });
  assert.equal(res.headers.get('allow'), 'GET', 'response 405 phải có header Allow: GET');

  const del = await request('DELETE', '/products');
  assert.equal(del.status, 405);
});

test('Query string không làm hỏng routing', { timeout: 5000 }, async () => {
  const res = await request('GET', '/products?page=2');
  assert.equal(res.status, 200, '/products?page=2 vẫn là route /products');
  assert.deepEqual(res.body, PRODUCTS);
});
