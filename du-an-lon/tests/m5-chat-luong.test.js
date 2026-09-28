// M5 · Chất lượng vận hành (tuần 9–11). Chạy: npm run du-an m5
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useApp, assertError, TEST_TIMEOUT } from './helpers.js';

test('GET /health trả 200 { status: "ok" }, không cần đăng nhập', TEST_TIMEOUT, async (t) => {
  const ctx = await useApp(t);
  const res = await ctx.request('GET', '/health');
  assert.equal(res.status, 200, res.text);
  assert.equal(res.body?.status, 'ok');
});

test('Mọi response đều có x-request-id, mỗi request một giá trị khác nhau', TEST_TIMEOUT, async (t) => {
  const ctx = await useApp(t);
  const responses = [
    await ctx.request('GET', '/health'),
    await ctx.request('GET', '/health'),
    await ctx.request('GET', '/khong-co-route'),
    await ctx.request('POST', '/products', { body: {}, token: ctx.adminToken }),
  ];
  const ids = responses.map((res) => res.headers.get('x-request-id'));
  for (const [i, id] of ids.entries()) {
    assert.ok(id && id.length > 0, `response #${i + 1} (HTTP ${responses[i].status}) thiếu header x-request-id, kể cả response lỗi`);
  }
  assert.equal(new Set(ids).size, ids.length, 'mỗi request phải có id riêng để lần theo log');
});

test('x-request-id client gửi lên được giữ nguyên nếu hợp lệ', TEST_TIMEOUT, async (t) => {
  const ctx = await useApp(t);
  const echoed = await ctx.request('GET', '/health', { headers: { 'x-request-id': 'req-abc_123' } });
  assert.equal(echoed.headers.get('x-request-id'), 'req-abc_123', 'giữ id từ client/gateway để nối log giữa các service');

  const tooLong = 'x'.repeat(300);
  const replaced = await ctx.request('GET', '/health', { headers: { 'x-request-id': tooLong } });
  const id = replaced.headers.get('x-request-id');
  assert.ok(id && id !== tooLong, 'id quá dài (> 128 ký tự) hoặc có ký tự lạ phải bị thay bằng id mới');

  const weird = await ctx.request('GET', '/health', { headers: { 'x-request-id': 'abc<script>' } });
  assert.notEqual(weird.headers.get('x-request-id'), 'abc<script>', 'chỉ chấp nhận chữ, số, "-" và "_"');
});

test('Lỗi 500 trả định dạng chuẩn, không lộ message gốc hay stack trace', TEST_TIMEOUT, async (t) => {
  const ctx = await useApp(t);
  const res = await ctx.request('GET', '/__test/error');
  assertError(res, 500, 'INTERNAL_ERROR', 'route /__test/error chỉ bật khi NODE_ENV=test, ném Error("boom: mat khau db la 123")');
  assert.ok(!res.text.includes('boom'), 'không trả message lỗi nội bộ cho client');
  assert.ok(!res.text.includes('mat khau'), 'lỗi nội bộ có thể chứa thông tin nhạy cảm');
  assert.ok(!/\bat\s.+:\d+:\d+/.test(res.text), 'không lộ stack trace');
  assert.ok(res.headers.get('x-request-id'), 'response 500 cũng có x-request-id để tra log');
});

test('Server vẫn chạy bình thường sau lỗi 500', TEST_TIMEOUT, async (t) => {
  const ctx = await useApp(t);
  await ctx.request('GET', '/__test/error');
  const res = await ctx.request('GET', '/health');
  assert.equal(res.status, 200, 'một request lỗi không được làm sập cả process');
});

test('JSON hỏng trả 400 INVALID_JSON', TEST_TIMEOUT, async (t) => {
  const ctx = await useApp(t);
  const broken = '{"sku": "A-1", "name": ';
  assertError(await ctx.request('POST', '/products', { raw: broken, token: ctx.adminToken }), 400, 'INVALID_JSON', 'POST /products');
  assertError(await ctx.request('POST', '/orders', { raw: '{items: []}', token: ctx.customerToken }), 400, 'INVALID_JSON', 'POST /orders');
});

test('Body quá 1MB trả 413 PAYLOAD_TOO_LARGE', TEST_TIMEOUT, async (t) => {
  const ctx = await useApp(t);
  const huge = JSON.stringify({ sku: 'BIG-1', name: 'x'.repeat(1_500_000), price: 1 });
  const res = await ctx.request('POST', '/products', { raw: huge, token: ctx.adminToken });
  assertError(res, 413, 'PAYLOAD_TOO_LARGE');

  const list = await ctx.request('GET', '/products');
  assert.equal(list.body.meta.total, 0, 'không lưu gì từ request bị từ chối');
});
