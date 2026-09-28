import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { fetchOrders, fetchOrderTotal } from './exercise.js';

const orders = {
  1: {
    id: 1,
    items: [
      { sku: 'TSHIRT-M', price: 150000, quantity: 2 },
      { sku: 'CAP', price: 80000, quantity: 1 },
    ],
  },
  2: {
    id: 2,
    items: [{ sku: 'SHOES-42', price: 900000, quantity: 1 }],
  },
  3: { id: 3, items: [] },
};

// Server giả chạy trên máy. /broken/... luôn trả 500 để giả lập API bị lỗi.
let server;
let baseUrl;
const requests = [];

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

before(async () => {
  server = createServer((req, res) => {
    requests.push(`${req.method} ${req.url}`);
    if (req.url.startsWith('/broken/')) {
      return sendJson(res, 500, { error: 'Internal Server Error' });
    }
    if (req.method === 'GET' && req.url === '/orders') {
      return sendJson(res, 200, Object.values(orders));
    }
    const match = req.url.match(/^\/orders\/(\d+)$/);
    if (req.method === 'GET' && match && orders[match[1]]) {
      return sendJson(res, 200, orders[match[1]]);
    }
    return sendJson(res, 404, { error: 'Not Found' });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.closeAllConnections();
  server.close();
});

test('fetchOrders: trả mảng đơn hàng từ GET /orders', { timeout: 5000 }, async () => {
  requests.length = 0;
  const result = await fetchOrders(baseUrl);
  assert.deepEqual(requests, ['GET /orders'], 'phải gọi đúng GET ${baseUrl}/orders');
  assert.deepEqual(result, Object.values(orders), 'phải trả dữ liệu JSON đã parse, không phải Response');
});

test('fetchOrders: status 500 thì throw Error có status code', { timeout: 5000 }, async () => {
  await assert.rejects(
    () => fetchOrders(`${baseUrl}/broken`),
    (error) => {
      assert.ok(error instanceof Error, 'phải throw một đối tượng Error');
      assert.match(error.message, /500/, 'message lỗi phải chứa status code 500');
      return true;
    },
    'fetch không tự throw khi status 500, bạn phải tự kiểm tra response.ok',
  );
});

test('fetchOrderTotal: tính tổng price * quantity', { timeout: 5000 }, async () => {
  assert.equal(await fetchOrderTotal(baseUrl, 1), 380000);
  assert.equal(await fetchOrderTotal(baseUrl, 2), 900000);
});

test('fetchOrderTotal: đơn không có item thì tổng là 0', { timeout: 5000 }, async () => {
  assert.equal(await fetchOrderTotal(baseUrl, 3), 0);
});

test('fetchOrderTotal: đơn không tồn tại (404) thì throw Error có status code', { timeout: 5000 }, async () => {
  await assert.rejects(
    () => fetchOrderTotal(baseUrl, 999),
    (error) => {
      assert.ok(error instanceof Error, 'phải throw một đối tượng Error');
      assert.match(error.message, /404/, 'message lỗi phải chứa status code 404');
      return true;
    },
  );
});
