import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createHmac } from 'node:crypto';
import { verifyWebhook, createWebhookHandler } from './exercise.js';

const SECRET = 'shpss_bi_mat';
const sig = (body, secret = SECRET) => createHmac('sha256', secret).update(body).digest('base64');

test('verifyWebhook: chữ ký đúng trả true (Buffer và chuỗi)', () => {
  const body = '{"id":1001,"total":450000}';
  assert.equal(verifyWebhook(Buffer.from(body), sig(body), SECRET), true);
  assert.equal(verifyWebhook(body, sig(body), SECRET), true);
});

test('verifyWebhook: chữ ký sai, thiếu hoặc lệch độ dài trả false, không throw', () => {
  const body = '{"id":1001}';
  assert.equal(verifyWebhook(body, sig(body, 'secret-khac'), SECRET), false, 'sai secret');
  assert.equal(verifyWebhook('{"id":1002}', sig(body), SECRET), false, 'body bị sửa');
  assert.equal(verifyWebhook(body, undefined, SECRET), false, 'thiếu header');
  assert.equal(verifyWebhook(body, 'abc', SECRET), false, 'độ dài khác: timingSafeEqual sẽ throw nếu không kiểm tra trước');
  assert.equal(verifyWebhook(body, ['x'], SECRET), false, 'header không phải chuỗi');
});

test('verifyWebhook: phải tính trên raw body, JSON định dạng khác là chữ ký khác', () => {
  const raw = '{ "id": 1001, "name": "\\u00c1o thun" }';
  assert.equal(verifyWebhook(raw, sig(raw), SECRET), true);
  const reserialized = JSON.stringify(JSON.parse(raw));
  assert.equal(verifyWebhook(reserialized, sig(raw), SECRET), false, 'parse rồi stringify lại làm đổi byte');
});

// --- Test tích hợp với server thật ---
let server;
let baseUrl;
const store = new Set();
let received;
let failNext;

before(async () => {
  const handler = createWebhookHandler({
    secret: SECRET,
    store,
    onOrder: async (order) => {
      if (failNext) {
        failNext = false;
        throw new Error('DB tạm thời lỗi');
      }
      received.push(order);
    },
  });
  server = http.createServer((req, res) => {
    if (typeof handler !== 'function') {
      res.statusCode = 599;
      res.end('createWebhookHandler chưa trả về hàm');
      return;
    }
    Promise.resolve(handler(req, res)).catch(() => {
      res.statusCode = 598;
      res.end('handler throw ra ngoài');
    });
  });
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.closeAllConnections();
  server.close();
});

function reset() {
  store.clear();
  received = [];
  failNext = false;
}

function send(body, { id = 'wh-1', hmac = sig(body) } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (id !== null) headers['x-shopify-webhook-id'] = id;
  if (hmac !== null) headers['x-shopify-hmac-sha256'] = hmac;
  return fetch(`${baseUrl}/webhooks/orders`, { method: 'POST', headers, body });
}

test('handler: webhook hợp lệ → 200, gọi onOrder với object đơn hàng', { timeout: 5000 }, async () => {
  reset();
  const body = '{"id":1001,"total":450000}';
  const res = await send(body);
  assert.equal(res.status, 200);
  assert.deepEqual(received, [{ id: 1001, total: 450000 }]);
  assert.ok(store.has('wh-1'), 'xử lý xong phải lưu id vào store');
});

test('handler: sai chữ ký hoặc thiếu chữ ký → 401, không gọi onOrder', { timeout: 5000 }, async () => {
  reset();
  const body = '{"id":1001}';
  assert.equal((await send(body, { hmac: sig(body, 'sai') })).status, 401);
  assert.equal((await send(body, { hmac: null })).status, 401);
  assert.equal(received.length, 0);
});

test('handler: thiếu webhook id → 400', { timeout: 5000 }, async () => {
  reset();
  const body = '{"id":1001}';
  assert.equal((await send(body, { id: null })).status, 400);
  assert.equal(received.length, 0);
});

test('handler: gửi lại cùng id → 200 nhưng chỉ xử lý một lần', { timeout: 5000 }, async () => {
  reset();
  const body = '{"id":1001}';
  assert.equal((await send(body, { id: 'wh-dup' })).status, 200);
  assert.equal((await send(body, { id: 'wh-dup' })).status, 200, 'lần gửi lại vẫn phải 200 để Shopify ngừng gửi');
  assert.equal(received.length, 1, 'onOrder chỉ được gọi một lần');
  assert.equal((await send(body, { id: 'wh-khac' })).status, 200);
  assert.equal(received.length, 2, 'id khác thì vẫn xử lý');
});

test('handler: chữ ký đúng nhưng body không phải JSON → 400', { timeout: 5000 }, async () => {
  reset();
  const body = 'day-khong-phai-json';
  assert.equal((await send(body)).status, 400);
  assert.equal(received.length, 0);
});

test('handler: onOrder lỗi → 500, không lưu id, lần gửi lại được xử lý', { timeout: 5000 }, async () => {
  reset();
  failNext = true;
  const body = '{"id":2002}';
  assert.equal((await send(body, { id: 'wh-retry' })).status, 500);
  assert.equal(store.has('wh-retry'), false, 'lỗi thì chưa được đánh dấu đã xử lý');
  assert.equal((await send(body, { id: 'wh-retry' })).status, 200, 'Shopify gửi lại thì phải xử lý được');
  assert.deepEqual(received, [{ id: 2002 }]);
});

test('handler: body lớn đến nhiều chunk vẫn xác thực đúng', { timeout: 5000 }, async () => {
  reset();
  const items = Array.from({ length: 3000 }, (_, i) => ({ sku: `SKU-${i}`, quantity: 1 }));
  const body = JSON.stringify({ id: 3003, items });
  assert.equal((await send(body, { id: 'wh-big' })).status, 200);
  assert.equal(received[0]?.items?.length, 3000);
});
