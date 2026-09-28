import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createRouter } from './exercise.js';

// req/res giả: router chỉ cần req.method và req.url.
const fakeReq = (method, url) => ({ method, url });

function newRouter() {
  const router = createRouter();
  assert.ok(router && typeof router === 'object', 'createRouter() phải trả về một object');
  for (const name of ['get', 'post', 'put', 'delete', 'handle']) {
    assert.equal(typeof router[name], 'function', `router.${name} phải là một hàm`);
  }
  return router;
}

test('Route tĩnh khớp: gọi handler và trả về true', () => {
  const router = newRouter();
  const calls = [];
  router.get('/products', (req, res) => calls.push({ req, res }));
  const req = fakeReq('GET', '/products');
  const res = {};
  assert.equal(router.handle(req, res), true);
  assert.equal(calls.length, 1, 'handler phải được gọi đúng 1 lần');
  assert.equal(calls[0].req, req, 'handler nhận đúng object req');
  assert.equal(calls[0].res, res, 'handler nhận đúng object res');
});

test('Không khớp: trả về false và không gọi handler', () => {
  const router = newRouter();
  let called = false;
  router.get('/products', () => (called = true));
  assert.equal(router.handle(fakeReq('GET', '/orders'), {}), false);
  assert.equal(called, false);
});

test('Cùng path, khác method thì là route khác', () => {
  const router = newRouter();
  const log = [];
  router.get('/products', () => log.push('list'));
  router.post('/products', () => log.push('create'));
  router.put('/products/:sku', () => log.push('update'));
  router.delete('/products/:sku', () => log.push('remove'));
  router.handle(fakeReq('POST', '/products'), {});
  router.handle(fakeReq('GET', '/products'), {});
  router.handle(fakeReq('DELETE', '/products/CAP'), {});
  router.handle(fakeReq('PUT', '/products/CAP'), {});
  assert.deepEqual(log, ['create', 'list', 'remove', 'update']);
  assert.equal(router.handle(fakeReq('PATCH', '/products'), {}), false, 'PATCH chưa đăng ký thì không khớp');
});

test('Tham số :sku được gán vào req.params', () => {
  const router = newRouter();
  let params;
  router.get('/products/:sku', (req) => (params = req.params));
  assert.equal(router.handle(fakeReq('GET', '/products/TSHIRT-M'), {}), true);
  assert.deepEqual({ ...params }, { sku: 'TSHIRT-M' });
});

test('Nhiều tham số trong một path', () => {
  const router = newRouter();
  let params;
  router.get('/orders/:orderId/items/:sku', (req) => (params = req.params));
  router.handle(fakeReq('GET', '/orders/1001/items/CAP'), {});
  assert.deepEqual({ ...params }, { orderId: '1001', sku: 'CAP' }, 'tham số từ URL luôn là chuỗi');
});

test('Tham số được decode (URL mã hoá tiếng Việt)', () => {
  const router = newRouter();
  let params;
  router.get('/products/:sku', (req) => (params = req.params));
  router.handle(fakeReq('GET', `/products/${encodeURIComponent('ÁO-1')}`), {});
  assert.deepEqual({ ...params }, { sku: 'ÁO-1' }, 'dùng decodeURIComponent cho giá trị tham số');
});

test('Số đoạn phải bằng nhau', () => {
  const router = newRouter();
  router.get('/products/:sku', () => {});
  assert.equal(router.handle(fakeReq('GET', '/products'), {}), false, '/products thiếu đoạn :sku');
  assert.equal(router.handle(fakeReq('GET', '/products/CAP/extra'), {}), false, 'thừa một đoạn');
  assert.equal(router.handle(fakeReq('GET', '/orders/CAP'), {}), false, 'đoạn tĩnh "products" phải giống hệt');
});

test('Query string được parse vào req.query (giá trị là chuỗi)', () => {
  const router = newRouter();
  let seen;
  router.get('/products', (req) => (seen = req));
  router.handle(fakeReq('GET', '/products?q=%C3%A1o&page=2'), {});
  assert.deepEqual({ ...seen.query }, { q: 'áo', page: '2' }, 'page là chuỗi "2", không phải số 2');
  assert.deepEqual({ ...seen.params }, {}, 'route không có tham số thì req.params là {}');

  router.handle(fakeReq('GET', '/products'), {});
  assert.deepEqual({ ...seen.query }, {}, 'không có query string thì req.query là {}');
});

test('Route đăng ký trước được ưu tiên', () => {
  const router = newRouter();
  const log = [];
  router.get('/products/export', () => log.push('export'));
  router.get('/products/:sku', (req) => log.push(`sku:${req.params.sku}`));
  router.handle(fakeReq('GET', '/products/export'), {});
  router.handle(fakeReq('GET', '/products/CAP'), {});
  assert.deepEqual(log, ['export', 'sku:CAP'], 'mỗi request chỉ gọi đúng MỘT handler: route khớp đầu tiên');
});

test('Chạy thật trên http.Server', { timeout: 5000 }, async () => {
  const router = newRouter();
  router.get('/products/:sku', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ sku: req.params.sku, page: req.query.page }));
  });
  const server = http.createServer((req, res) => {
    if (!router.handle(req, res)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not Found' }));
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const ok = await fetch(`${base}/products/CAP?page=2`);
    assert.equal(ok.status, 200);
    assert.deepEqual(await ok.json(), { sku: 'CAP', page: '2' });
    const missing = await fetch(`${base}/nope`);
    assert.equal(missing.status, 404);
  } finally {
    server.closeAllConnections();
    server.close();
  }
});
