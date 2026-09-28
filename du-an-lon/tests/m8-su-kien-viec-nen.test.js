// M8 · Sự kiện, việc nền, audit log (nâng cao, tùy chọn, cần M3). Chạy: npm run du-an m8
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import {
  useAuthApp, assertError, errorFields, createProduct, adjustStock,
  startReceiver, waitFor, sleep, TEST_ENV, TEST_TIMEOUT,
} from './helpers.js';

async function setup(t, stock = 10) {
  const ctx = await useAuthApp(t, 'M8');
  const product = await createProduct(ctx, { sku: 'TSHIRT-M', name: 'Áo thun M', price: 150000 });
  if (stock > 0) await adjustStock(ctx, product.id, stock);
  return { ctx, product };
}

async function placeOrder(ctx, productId, quantity) {
  const res = await ctx.request('POST', '/orders', { body: { items: [{ productId, quantity }] }, token: ctx.customerToken });
  assert.equal(res.status, 201, `đặt hàng phải 201, nhận ${res.status}: ${res.text}`);
  return res.body.data;
}

const orderAction = (ctx, orderId, name) => ctx.request('POST', `/orders/${orderId}/${name}`, { token: ctx.adminToken });

async function listEvents(ctx, after) {
  const res = await ctx.request('GET', `/admin/events${after === undefined ? '' : `?after=${after}`}`, { token: ctx.adminToken });
  assert.equal(res.status, 200, `GET /admin/events phải 200, nhận ${res.status}: ${res.text}`);
  assert.ok(Array.isArray(res.body?.data), 'data phải là mảng sự kiện');
  return res.body.data;
}

async function subscribe(ctx, body) {
  const res = await ctx.request('POST', '/admin/webhook-subscriptions', { body, token: ctx.adminToken });
  assert.equal(res.status, 201, `đăng ký webhook phải 201, nhận ${res.status}: ${res.text}`);
  assert.equal(typeof res.body.data.secret, 'string', 'response tạo đăng ký phải trả secret để bên nhận kiểm tra chữ ký');
  return res.body.data;
}

test('Vòng đời đơn sinh sự kiện đúng thứ tự, đọc tiếp được bằng ?after', TEST_TIMEOUT, async (t) => {
  const { ctx, product } = await setup(t);
  const a = await placeOrder(ctx, product.id, 2);
  assert.equal((await orderAction(ctx, a.id, 'pay')).status, 200);
  assert.equal((await orderAction(ctx, a.id, 'ship')).status, 200);
  const b = await placeOrder(ctx, product.id, 1);
  assert.equal((await orderAction(ctx, b.id, 'cancel')).status, 200);

  const events = (await listEvents(ctx)).filter((e) => e.type.startsWith('order.'));
  assert.deepEqual(
    events.map((e) => [e.type, String(e.data?.orderId)]),
    [
      ['order.created', String(a.id)],
      ['order.paid', String(a.id)],
      ['order.shipped', String(a.id)],
      ['order.created', String(b.id)],
      ['order.cancelled', String(b.id)],
    ],
    'mỗi thay đổi trạng thái đơn là một sự kiện { id, type, data: { orderId, ... }, createdAt }, sắp theo thứ tự xảy ra',
  );
  const ids = events.map((e) => e.id);
  assert.ok(ids.every((id, i) => i === 0 || id > ids[i - 1]), `id sự kiện phải tăng dần, nhận ${ids}`);
  assert.ok(events.every((e) => typeof e.createdAt === 'string'), 'mỗi sự kiện có createdAt');

  const rest = (await listEvents(ctx, events[1].id)).filter((e) => e.type.startsWith('order.'));
  assert.deepEqual(rest.map((e) => e.id), ids.slice(2), '?after=<id> chỉ trả các sự kiện sau id đó, không trùng');
});

test('Thao tác thất bại không sinh sự kiện', TEST_TIMEOUT, async (t) => {
  const { ctx, product } = await setup(t);
  const tooMany = await ctx.request('POST', '/orders', { body: { items: [{ productId: product.id, quantity: 50 }] }, token: ctx.customerToken });
  assertError(tooMany, 409, 'INSUFFICIENT_STOCK');
  const order = await placeOrder(ctx, product.id, 1);
  assert.equal((await orderAction(ctx, order.id, 'pay')).status, 200);
  assertError(await orderAction(ctx, order.id, 'pay'), 409, 'INVALID_STATE', 'thanh toán lần hai');

  const types = (await listEvents(ctx)).filter((e) => e.type.startsWith('order.')).map((e) => e.type);
  assert.deepEqual(types, ['order.created', 'order.paid'], 'sự kiện ghi cùng thao tác: thao tác lỗi thì không có sự kiện');
});

test('stock.low phát một lần khi tồn kho vừa xuống dưới ngưỡng (LOW_STOCK_THRESHOLD)', TEST_TIMEOUT, async (t) => {
  const { ctx, product } = await setup(t, 10);
  const lowEvents = async () => (await listEvents(ctx)).filter((e) => e.type === 'stock.low');

  await placeOrder(ctx, product.id, 5);
  assert.equal((await lowEvents()).length, 0, 'tồn 5 chưa dưới ngưỡng 5');
  await placeOrder(ctx, product.id, 1);
  const [event] = await lowEvents();
  assert.ok(event, 'tồn từ 5 xuống 4 (dưới ngưỡng) phải sinh stock.low');
  assert.equal(String(event.data.productId), String(product.id));
  assert.equal(event.data.stock, 4);
  assert.equal(event.data.threshold, Number(TEST_ENV.LOW_STOCK_THRESHOLD));

  await placeOrder(ctx, product.id, 1);
  assert.equal((await lowEvents()).length, 1, 'đã dưới ngưỡng rồi thì giảm tiếp không phát lại');

  await adjustStock(ctx, product.id, 10);
  await placeOrder(ctx, product.id, 9);
  assert.equal((await lowEvents()).length, 2, 'nhập lại hàng rồi tụt xuống dưới ngưỡng lần nữa thì phát lần nữa');
});

test('Chỉ admin xem được sự kiện và đăng ký webhook', TEST_TIMEOUT, async (t) => {
  const { ctx } = await setup(t, 0);
  assertError(await ctx.request('GET', '/admin/events'), 401, 'UNAUTHORIZED', 'không token');
  assertError(await ctx.request('GET', '/admin/events', { token: ctx.customerToken }), 403, 'FORBIDDEN', 'khách hàng');
  assertError(
    await ctx.request('POST', '/admin/webhook-subscriptions', { body: { url: 'http://127.0.0.1:9/x' }, token: ctx.customerToken }),
    403,
    'FORBIDDEN',
    'khách hàng đăng ký webhook',
  );

  const bad = await ctx.request('POST', '/admin/webhook-subscriptions', {
    body: { url: 'khong-phai-url', events: ['order.teleported'] },
    token: ctx.adminToken,
  });
  assertError(bad, 422, 'VALIDATION_ERROR', 'url sai và loại sự kiện không tồn tại');
  const fields = errorFields(bad);
  assert.ok(fields.includes('url') && fields.includes('events'), `details phải chỉ ra cả url và events, có: ${fields}`);
});

test('Webhook đi: app gửi sự kiện tới URL đã đăng ký, có chữ ký HMAC', TEST_TIMEOUT, async (t) => {
  const { ctx, product } = await setup(t);
  const receiver = await startReceiver(t);
  const sub = await subscribe(ctx, { url: receiver.url });

  await placeOrder(ctx, product.id, 1);
  await waitFor(() => receiver.received.length >= 1, { message: 'bên nhận chưa nhận được sự kiện order.created' });

  const [delivery] = receiver.received;
  assert.equal(delivery.method, 'POST');
  assert.equal(delivery.body?.type, 'order.created', 'body là JSON của sự kiện');
  assert.equal(delivery.headers['x-event-type'], 'order.created');
  assert.equal(delivery.headers['x-event-id'], String(delivery.body.id), 'x-event-id là id sự kiện, bên nhận dùng để chống xử lý trùng');
  const expected = createHmac('sha256', sub.secret).update(delivery.rawBody).digest('hex');
  assert.equal(delivery.headers['x-signature'], expected, 'x-signature = hex HMAC-SHA256(raw body, secret của đăng ký)');
});

test('Bên nhận trả 5xx: gửi lại với backoff, cùng x-event-id, dừng khi thành công', TEST_TIMEOUT, async (t) => {
  const { ctx, product } = await setup(t);
  const receiver = await startReceiver(t, (_entry, attempt) => (attempt === 1 ? 500 : attempt === 2 ? 503 : 200));
  await subscribe(ctx, { url: receiver.url });

  await placeOrder(ctx, product.id, 1);
  await waitFor(() => receiver.received.length >= 3, { message: 'phải thử lại sau 500 và 503 cho tới khi nhận 200' });
  await sleep(300);
  assert.equal(receiver.received.length, 3, 'đã nhận 200 thì dừng, không gửi thêm');
  const ids = new Set(receiver.received.map((r) => r.headers['x-event-id']));
  const bodies = new Set(receiver.received.map((r) => r.rawBody));
  assert.equal(ids.size, 1, 'các lần gửi lại là cùng một sự kiện (cùng x-event-id)');
  assert.equal(bodies.size, 1, 'các lần gửi lại có cùng body');
});

test('Bên nhận trả 4xx: không gửi lại', TEST_TIMEOUT, async (t) => {
  const { ctx, product } = await setup(t);
  const receiver = await startReceiver(t, () => 400);
  await subscribe(ctx, { url: receiver.url });

  await placeOrder(ctx, product.id, 1);
  await waitFor(() => receiver.received.length >= 1, { message: 'bên nhận chưa nhận được sự kiện' });
  await sleep(300);
  assert.equal(receiver.received.length, 1, '4xx nghĩa là request sai, gửi lại cũng vô ích');
});

test('Đăng ký chỉ nhận loại sự kiện đã chọn', TEST_TIMEOUT, async (t) => {
  const { ctx, product } = await setup(t);
  const receiver = await startReceiver(t);
  const sub = await subscribe(ctx, { url: receiver.url, events: ['order.paid'] });
  assert.deepEqual(sub.events, ['order.paid']);

  const order = await placeOrder(ctx, product.id, 1);
  assert.equal((await orderAction(ctx, order.id, 'pay')).status, 200);
  await waitFor(() => receiver.received.length >= 1, { message: 'bên nhận chưa nhận được order.paid' });
  await sleep(200);
  assert.deepEqual(receiver.received.map((r) => r.body?.type), ['order.paid'], 'không gửi order.created cho đăng ký chỉ chọn order.paid');
});

test('Audit log ghi thao tác thành công của admin: ai, làm gì, trên đối tượng nào', TEST_TIMEOUT, async (t) => {
  const ctx = await useAuthApp(t, 'M8');
  const product = await createProduct(ctx, { sku: 'AUDIT-1', name: 'Sản phẩm audit' });
  const patch = await ctx.request('PATCH', `/products/${product.id}`, { body: { price: 120000 }, token: ctx.adminToken });
  assert.equal(patch.status, 200, patch.text);
  const failed = await ctx.request('PATCH', `/products/${product.id}`, { body: { price: -1 }, token: ctx.adminToken });
  assert.equal(failed.status, 422, 'thao tác lỗi (để kiểm tra không bị ghi log)');
  await adjustStock(ctx, product.id, 5);
  const order = await placeOrder(ctx, product.id, 1);
  assert.equal((await orderAction(ctx, order.id, 'pay')).status, 200);

  const res = await ctx.request('GET', '/admin/audit-log', { token: ctx.adminToken });
  assert.equal(res.status, 200, res.text);
  const entries = res.body.data;
  assert.deepEqual(
    entries.map((e) => [e.action, e.target?.type, String(e.target?.id)]),
    [
      ['product.create', 'product', String(product.id)],
      ['product.update', 'product', String(product.id)],
      ['inventory.adjust', 'product', String(product.id)],
      ['order.pay', 'order', String(order.id)],
    ],
    'chỉ ghi thao tác admin thành công, theo thứ tự; khách đặt hàng và thao tác lỗi không ghi',
  );
  assert.ok(entries.every((e) => e.actor?.email === TEST_ENV.ADMIN_EMAIL), 'actor là admin đã thực hiện');
  assert.ok(entries.every((e) => typeof e.createdAt === 'string'), 'mỗi dòng có createdAt');

  assertError(await ctx.request('GET', '/admin/audit-log', { token: ctx.customerToken }), 403, 'FORBIDDEN', 'khách xem audit log');
});
