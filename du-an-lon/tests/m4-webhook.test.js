// M4 · Webhook đơn hàng kiểu Shopify (tuần 10). Chạy: npm run du-an m4
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useApp, assertError, createProduct, adjustStock, getStock, signWebhook, TEST_TIMEOUT } from './helpers.js';

function payload(overrides = {}) {
  return {
    id: 'SHOP-1001',
    email: 'buyer@example.com',
    line_items: [{ sku: 'TSHIRT-M', quantity: 2 }],
    ...overrides,
  };
}

// Gửi webhook với raw body. Mặc định ký đúng bằng WEBHOOK_SECRET.
function sendWebhook(ctx, rawBody, { webhookId = 'wh-1', signature = signWebhook(rawBody), omit = [] } = {}) {
  const headers = { 'x-shopify-webhook-id': webhookId, 'x-shopify-hmac-sha256': signature };
  for (const name of omit) delete headers[name];
  return ctx.request('POST', '/webhooks/orders', { raw: rawBody, headers });
}

async function setup(t, stock = 5) {
  const ctx = await useApp(t);
  const product = await createProduct(ctx, { sku: 'TSHIRT-M', name: 'Áo thun M', price: 150000 });
  if (stock > 0) await adjustStock(ctx, product.id, stock);
  return { ctx, product };
}

test('Webhook hợp lệ tạo đơn nguồn webhook và trừ kho', TEST_TIMEOUT, async (t) => {
  const { ctx, product } = await setup(t);
  const res = await sendWebhook(ctx, JSON.stringify(payload()));
  assert.equal(res.status, 200, `webhook thành công trả 200 (Shopify coi mọi mã khác 2xx là lỗi và gửi lại). Nhận ${res.status}: ${res.text}`);
  assert.equal(res.body.data.duplicate, false);
  assert.ok(res.body.data.orderId !== undefined && res.body.data.orderId !== null, 'trả orderId của đơn vừa tạo');

  const order = await ctx.request('GET', `/orders/${res.body.data.orderId}`, { token: ctx.adminToken });
  assert.equal(order.status, 200, order.text);
  assert.equal(order.body.data.source, 'webhook');
  assert.equal(order.body.data.externalId, 'SHOP-1001');
  assert.equal(order.body.data.total, 300000, 'giá lấy từ sản phẩm trong hệ thống');
  assert.equal(await getStock(ctx, product.id), 3);
});

test('Chữ ký phải tính trên raw body, không phải JSON đã parse lại', TEST_TIMEOUT, async (t) => {
  const { ctx } = await setup(t);
  // Khoảng trắng, xuống dòng, tiếng Việt: parse rồi stringify lại sẽ ra chuỗi khác, chữ ký sẽ lệch.
  const raw = '{\n  "id" : "SHOP-2002",\n  "note": "Giao giờ hành chính",\n  "line_items": [ { "sku": "TSHIRT-M", "quantity": 1 } ]\n}';
  const res = await sendWebhook(ctx, raw, { webhookId: 'wh-raw' });
  assert.equal(res.status, 200, `nhận ${res.status}: ${res.text}. Gợi ý: đọc body dạng Buffer/chuỗi gốc để tính HMAC, sau đó mới JSON.parse`);
});

test('Sai hoặc thiếu chữ ký trả 401, không tạo đơn, không trừ kho', TEST_TIMEOUT, async (t) => {
  const { ctx, product } = await setup(t);
  const raw = JSON.stringify(payload());
  const cases = [
    [{ signature: signWebhook(raw, 'secret-cua-ke-gia-mao') }, 'ký bằng secret khác'],
    [{ signature: signWebhook(`${raw} `) }, 'chữ ký của body khác'],
    [{ signature: 'khong-phai-base64!!' }, 'chữ ký rác'],
    [{ omit: ['x-shopify-hmac-sha256'] }, 'thiếu header chữ ký'],
  ];
  for (const [i, [options, why]] of cases.entries()) {
    assertError(await sendWebhook(ctx, raw, { webhookId: `wh-bad-${i}`, ...options }), 401, 'INVALID_SIGNATURE', why);
  }
  assert.equal(await getStock(ctx, product.id), 5, 'webhook giả mạo không được trừ kho');
  const orders = await ctx.request('GET', '/orders', { token: ctx.adminToken });
  assert.equal(orders.body.meta.total, 0, 'không đơn nào được tạo');
});

test('Gửi trùng x-shopify-webhook-id: trả 200 duplicate, không tạo đơn lần hai', TEST_TIMEOUT, async (t) => {
  const { ctx, product } = await setup(t);
  const raw = JSON.stringify(payload());
  const first = await sendWebhook(ctx, raw, { webhookId: 'wh-dup' });
  const second = await sendWebhook(ctx, raw, { webhookId: 'wh-dup' });
  assert.equal(second.status, 200, second.text);
  assert.equal(second.body.data.duplicate, true);
  assert.equal(second.body.data.orderId, first.body.data.orderId, 'trả lại đúng orderId đã tạo lần đầu');
  assert.equal(await getStock(ctx, product.id), 3, 'chỉ trừ kho một lần');
});

test('Hai webhook trùng id đến cùng lúc chỉ tạo một đơn', TEST_TIMEOUT, async (t) => {
  const { ctx, product } = await setup(t);
  const raw = JSON.stringify(payload({ line_items: [{ sku: 'TSHIRT-M', quantity: 1 }] }));
  const results = await Promise.all([
    sendWebhook(ctx, raw, { webhookId: 'wh-race' }),
    sendWebhook(ctx, raw, { webhookId: 'wh-race' }),
    sendWebhook(ctx, raw, { webhookId: 'wh-race' }),
  ]);
  for (const res of results) assert.equal(res.status, 200, res.text);
  assert.equal(results.filter((r) => r.body.data.duplicate === false).length, 1, 'đúng một lần xử lý thật');
  assert.equal(await getStock(ctx, product.id), 4, 'chỉ trừ kho một lần');
});

test('Webhook id khác nhau là hai lần giao khác nhau', TEST_TIMEOUT, async (t) => {
  const { ctx, product } = await setup(t);
  await sendWebhook(ctx, JSON.stringify(payload({ id: 'SHOP-1' })), { webhookId: 'wh-a' });
  await sendWebhook(ctx, JSON.stringify(payload({ id: 'SHOP-2' })), { webhookId: 'wh-b' });
  assert.equal(await getStock(ctx, product.id), 1);
});

test('Webhook: thiếu x-shopify-webhook-id, payload sai, sku lạ trả 422', TEST_TIMEOUT, async (t) => {
  const { ctx } = await setup(t);
  assertError(await sendWebhook(ctx, JSON.stringify(payload()), { omit: ['x-shopify-webhook-id'] }), 422, 'VALIDATION_ERROR', 'thiếu x-shopify-webhook-id');
  assertError(await sendWebhook(ctx, JSON.stringify(payload({ line_items: [] })), { webhookId: 'wh-empty' }), 422, 'VALIDATION_ERROR', 'line_items rỗng');
  assertError(
    await sendWebhook(ctx, JSON.stringify(payload({ line_items: [{ sku: 'KHONG-CO', quantity: 1 }] })), { webhookId: 'wh-sku' }),
    422,
    'VALIDATION_ERROR',
    'sku không có trong hệ thống',
  );
});

test('Webhook thiếu hàng trả 409; giao lại cùng id sau khi nhập kho thì xử lý được', TEST_TIMEOUT, async (t) => {
  const { ctx, product } = await setup(t, 1);
  const raw = JSON.stringify(payload());
  assertError(await sendWebhook(ctx, raw, { webhookId: 'wh-retry' }), 409, 'INSUFFICIENT_STOCK');

  await adjustStock(ctx, product.id, 5);
  const retry = await sendWebhook(ctx, raw, { webhookId: 'wh-retry' });
  assert.equal(retry.status, 200, `lần giao thất bại không được ghi nhận là "đã xử lý". Nhận ${retry.status}: ${retry.text}`);
  assert.equal(retry.body.data.duplicate, false);
  assert.equal(await getStock(ctx, product.id), 4);
});
