// M7 · Idempotency cho đặt hàng (nâng cao, tùy chọn, cần M3). Chạy: npm run du-an m7
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useAuthApp, assertError, errorFields, registerAndLogin, createProduct, adjustStock, getStock, TEST_TIMEOUT } from './helpers.js';

async function setup(t, stock = 10) {
  const ctx = await useAuthApp(t, 'M7');
  const product = await createProduct(ctx, { sku: 'TSHIRT-M', name: 'Áo thun M', price: 150000 });
  if (stock > 0) await adjustStock(ctx, product.id, stock);
  return { ctx, product };
}

function placeOrder(ctx, body, key, token = ctx.customerToken) {
  return ctx.request('POST', '/orders', { body, token, headers: key === undefined ? {} : { 'idempotency-key': key } });
}

async function countOrders(ctx) {
  const res = await ctx.request('GET', '/orders?perPage=100', { token: ctx.adminToken });
  assert.equal(res.status, 200, res.text);
  return res.body.meta.total;
}

test('Gửi lại cùng key, cùng body: trả đúng response cũ, không tạo đơn, không trừ kho lần hai', TEST_TIMEOUT, async (t) => {
  const { ctx, product } = await setup(t);
  const body = { items: [{ productId: product.id, quantity: 2 }] };

  const first = await placeOrder(ctx, body, 'checkout-001');
  assert.equal(first.status, 201, first.text);
  const retry = await placeOrder(ctx, body, 'checkout-001');
  assert.equal(retry.status, 201, `gửi lại phải nhận đúng status cũ (201), nhận ${retry.status}: ${retry.text}`);
  assert.deepEqual(retry.body, first.body, 'gửi lại phải nhận đúng body cũ, cùng id đơn');
  assert.equal(retry.headers.get('idempotent-replayed'), 'true', 'response phát lại có header Idempotent-Replayed: true');
  assert.equal(await countOrders(ctx), 1, 'chỉ có 1 đơn được tạo');
  assert.equal(await getStock(ctx, product.id), 8, 'chỉ trừ kho một lần');

  // Response được lưu lại, không tính lại: đơn đã đổi trạng thái thì bản phát lại vẫn là response gốc.
  const pay = await ctx.request('POST', `/orders/${first.body.data.id}/pay`, { token: ctx.adminToken });
  assert.equal(pay.status, 200, pay.text);
  const later = await placeOrder(ctx, body, 'checkout-001');
  assert.equal(later.body.data.status, 'pending', 'phát lại trả đúng response đã lưu lúc đầu, không đọc lại trạng thái hiện tại');
});

test('Cùng key nhưng khác body: 422 IDEMPOTENCY_KEY_REUSED, không tạo đơn mới', TEST_TIMEOUT, async (t) => {
  const { ctx, product } = await setup(t);
  const first = await placeOrder(ctx, { items: [{ productId: product.id, quantity: 1 }] }, 'key-A');
  assert.equal(first.status, 201, first.text);

  const other = await placeOrder(ctx, { items: [{ productId: product.id, quantity: 3 }] }, 'key-A');
  assertError(other, 422, 'IDEMPOTENCY_KEY_REUSED', 'key đã dùng cho request có body khác');
  assert.equal(await countOrders(ctx), 1);
  assert.equal(await getStock(ctx, product.id), 9);
});

test('Key tính riêng cho từng người dùng', TEST_TIMEOUT, async (t) => {
  const { ctx, product } = await setup(t);
  const other = await registerAndLogin(ctx, 'khach2@shop.test');
  const body = { items: [{ productId: product.id, quantity: 1 }] };

  const mine = await placeOrder(ctx, body, 'same-key');
  const theirs = await placeOrder(ctx, body, 'same-key', other.token);
  assert.equal(mine.status, 201, mine.text);
  assert.equal(theirs.status, 201, `người khác dùng trùng key vẫn phải tạo đơn của họ, nhận ${theirs.status}: ${theirs.text}`);
  assert.notEqual(theirs.body.data.id, mine.body.data.id, 'hai người dùng là hai đơn khác nhau');
  assert.equal(await countOrders(ctx), 2);
});

test('5 request đồng thời cùng key: đúng 1 đơn được tạo', TEST_TIMEOUT, async (t) => {
  const { ctx, product } = await setup(t);
  const body = { items: [{ productId: product.id, quantity: 2 }] };
  const results = await Promise.all(Array.from({ length: 5 }, () => placeOrder(ctx, body, 'double-click')));

  for (const res of results) {
    const ok = res.status === 201 || (res.status === 409 && res.body?.error?.code === 'REQUEST_IN_PROGRESS');
    assert.ok(ok, `mỗi request nhận 201 (tạo hoặc phát lại) hoặc 409 REQUEST_IN_PROGRESS, nhận ${res.status}: ${res.text}`);
  }
  const orderIds = new Set(results.filter((r) => r.status === 201).map((r) => String(r.body.data.id)));
  assert.equal(orderIds.size, 1, `mọi response 201 phải cùng một đơn, nhận các id: ${[...orderIds]}`);
  assert.equal(await countOrders(ctx), 1, 'bấm đặt hàng 5 lần liên tiếp chỉ tạo 1 đơn');
  assert.equal(await getStock(ctx, product.id), 8, 'chỉ trừ kho một lần');
});

test('Request lỗi không được lưu: thiếu hàng, nhập thêm rồi gửi lại cùng key thì thành công', TEST_TIMEOUT, async (t) => {
  const { ctx, product } = await setup(t, 1);
  const body = { items: [{ productId: product.id, quantity: 2 }] };

  const fail = await placeOrder(ctx, body, 'retry-after-restock');
  assertError(fail, 409, 'INSUFFICIENT_STOCK', 'tồn 1, đặt 2');

  await adjustStock(ctx, product.id, 5);
  const ok = await placeOrder(ctx, body, 'retry-after-restock');
  assert.equal(ok.status, 201, `lỗi 4xx không được lưu làm kết quả của key, lần gửi lại phải xử lý như mới. Nhận ${ok.status}: ${ok.text}`);
  assert.equal(await getStock(ctx, product.id), 4);
});

test('Không gửi key thì mỗi request là một đơn như M2; key quá 255 ký tự trả 422', TEST_TIMEOUT, async (t) => {
  const { ctx, product } = await setup(t);
  const body = { items: [{ productId: product.id, quantity: 1 }] };
  assert.equal((await placeOrder(ctx, body)).status, 201);
  assert.equal((await placeOrder(ctx, body)).status, 201);
  assert.equal(await countOrders(ctx), 2, 'không có Idempotency-Key thì không chống trùng');

  const tooLong = await placeOrder(ctx, body, 'k'.repeat(256));
  assertError(tooLong, 422, 'VALIDATION_ERROR', 'Idempotency-Key dài 256 ký tự');
  assert.ok(
    errorFields(tooLong).some((f) => f.toLowerCase() === 'idempotency-key'),
    'details chỉ ra field "Idempotency-Key"',
  );
});
