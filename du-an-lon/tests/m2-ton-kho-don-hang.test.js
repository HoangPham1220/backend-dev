// M2 · Tồn kho & đơn hàng (tuần 5–6). Chạy: npm run du-an m2
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useApp, assertError, createProduct, adjustStock, getStock, TEST_TIMEOUT } from './helpers.js';

const placeOrder = (ctx, items) => ctx.request('POST', '/orders', { body: { items }, token: ctx.customerToken });
const action = (ctx, orderId, name, token = ctx.adminToken) =>
  ctx.request('POST', `/orders/${orderId}/${name}`, { token });

async function setup(t) {
  const ctx = await useApp(t);
  const shirt = await createProduct(ctx, { sku: 'TSHIRT-M', name: 'Áo thun M', price: 150000 });
  const jean = await createProduct(ctx, { sku: 'JEAN-32', name: 'Quần jean 32', price: 400000 });
  await adjustStock(ctx, shirt.id, 10);
  await adjustStock(ctx, jean.id, 3);
  return { ctx, shirt, jean };
}

test('POST /inventory/adjustments nhập kho, trả stockAfter và cập nhật sản phẩm', TEST_TIMEOUT, async (t) => {
  const ctx = await useApp(t);
  const product = await createProduct(ctx, { stock: 2 });
  const res = await ctx.request('POST', '/inventory/adjustments', {
    body: { productId: product.id, quantity: 10, reason: 'Nhập hàng từ NCC' },
    token: ctx.adminToken,
  });
  assert.equal(res.status, 201, res.text);
  assert.equal(res.body.data.quantity, 10);
  assert.equal(res.body.data.stockAfter, 12, 'stockAfter = tồn cũ + quantity');
  assert.equal(await getStock(ctx, product.id), 12);

  const out = await adjustStock(ctx, product.id, -4, 'Hàng lỗi');
  assert.equal(out.stockAfter, 8, 'quantity âm là xuất kho');
});

test('POST /inventory/adjustments không cho tồn kho âm', TEST_TIMEOUT, async (t) => {
  const ctx = await useApp(t);
  const product = await createProduct(ctx, { stock: 3 });
  const res = await ctx.request('POST', '/inventory/adjustments', {
    body: { productId: product.id, quantity: -5, reason: 'Xuất quá tay' },
    token: ctx.adminToken,
  });
  assertError(res, 409, 'INSUFFICIENT_STOCK');
  assert.equal(await getStock(ctx, product.id), 3, 'thất bại thì tồn kho giữ nguyên');
});

test('POST /inventory/adjustments: validate dữ liệu và sản phẩm không tồn tại', TEST_TIMEOUT, async (t) => {
  const ctx = await useApp(t);
  const product = await createProduct(ctx);
  const send = (body) => ctx.request('POST', '/inventory/adjustments', { body, token: ctx.adminToken });
  assertError(await send({ productId: product.id, quantity: 0, reason: 'x' }), 422, 'VALIDATION_ERROR', 'quantity = 0 vô nghĩa');
  assertError(await send({ productId: product.id, quantity: 1.5, reason: 'x' }), 422, 'VALIDATION_ERROR', 'quantity lẻ');
  assertError(await send({ productId: product.id, quantity: 5 }), 422, 'VALIDATION_ERROR', 'thiếu reason');
  assertError(await send({ productId: '999999', quantity: 5, reason: 'x' }), 404, 'NOT_FOUND', 'sản phẩm không tồn tại');
});

test('POST /orders tạo đơn pending, chụp giá tại thời điểm đặt, trừ tồn kho', TEST_TIMEOUT, async (t) => {
  const { ctx, shirt, jean } = await setup(t);
  const res = await placeOrder(ctx, [
    { productId: shirt.id, quantity: 2 },
    { productId: jean.id, quantity: 1 },
  ]);
  assert.equal(res.status, 201, res.text);
  const order = res.body.data;
  assert.ok(order.id !== undefined && order.id !== null, 'đơn phải có id');
  assert.equal(order.status, 'pending');
  assert.deepEqual(
    order.items.map(({ productId, sku, name, price, quantity, lineTotal }) => ({ productId, sku, name, price, quantity, lineTotal })),
    [
      { productId: shirt.id, sku: 'TSHIRT-M', name: 'Áo thun M', price: 150000, quantity: 2, lineTotal: 300000 },
      { productId: jean.id, sku: 'JEAN-32', name: 'Quần jean 32', price: 400000, quantity: 1, lineTotal: 400000 },
    ],
  );
  assert.equal(order.total, 700000);
  assert.equal(await getStock(ctx, shirt.id), 8);
  assert.equal(await getStock(ctx, jean.id), 2);
});

test('Đổi giá sản phẩm sau khi đặt không làm đổi đơn cũ', TEST_TIMEOUT, async (t) => {
  const { ctx, shirt } = await setup(t);
  const order = (await placeOrder(ctx, [{ productId: shirt.id, quantity: 1 }])).body.data;
  await ctx.request('PATCH', `/products/${shirt.id}`, { body: { price: 999000 }, token: ctx.adminToken });
  const again = await ctx.request('GET', `/orders/${order.id}`, { token: ctx.adminToken });
  assert.equal(again.status, 200, again.text);
  assert.equal(again.body.data.total, 150000, 'đơn lưu giá lúc đặt (snapshot), giống sales_order_item trong Magento');
});

test('POST /orders thiếu hàng một item: 409, không trừ kho item nào', TEST_TIMEOUT, async (t) => {
  const { ctx, shirt, jean } = await setup(t);
  const res = await placeOrder(ctx, [
    { productId: shirt.id, quantity: 2 },
    { productId: jean.id, quantity: 5 },
  ]);
  assertError(res, 409, 'INSUFFICIENT_STOCK');
  const detail = res.body.error.details?.find((d) => String(d.productId) === String(jean.id));
  assert.ok(detail, 'details phải chỉ ra sản phẩm thiếu hàng');
  assert.equal(detail.requested, 5);
  assert.equal(detail.available, 3);
  assert.equal(await getStock(ctx, shirt.id), 10, 'đơn thất bại thì áo thun không được bị trừ (tính nguyên tử)');
  assert.equal(await getStock(ctx, jean.id), 3);
});

test('POST /orders: validate items', TEST_TIMEOUT, async (t) => {
  const { ctx, shirt } = await setup(t);
  const inactive = await createProduct(ctx, { sku: 'OLD-1', status: 'inactive', stock: 5 });
  const cases = [
    [[], 'items rỗng'],
    [[{ productId: shirt.id, quantity: 0 }], 'quantity = 0'],
    [[{ productId: shirt.id, quantity: 2.5 }], 'quantity lẻ'],
    [[{ productId: '999999', quantity: 1 }], 'sản phẩm không tồn tại'],
    [[{ productId: shirt.id, quantity: 1 }, { productId: shirt.id, quantity: 2 }], 'trùng productId trong một đơn'],
    [[{ productId: inactive.id, quantity: 1 }], 'sản phẩm inactive không bán'],
  ];
  for (const [items, why] of cases) {
    assertError(await placeOrder(ctx, items), 422, 'VALIDATION_ERROR', why);
  }
  assertError(await ctx.request('POST', '/orders', { body: {}, token: ctx.customerToken }), 422, 'VALIDATION_ERROR', 'thiếu items');
  assert.equal(await getStock(ctx, shirt.id), 10, 'đơn lỗi không được trừ kho');
});

test('GET /orders/:id và GET /orders', TEST_TIMEOUT, async (t) => {
  const { ctx, shirt, jean } = await setup(t);
  const first = (await placeOrder(ctx, [{ productId: shirt.id, quantity: 1 }])).body.data;
  const second = (await placeOrder(ctx, [{ productId: jean.id, quantity: 1 }])).body.data;

  const one = await ctx.request('GET', `/orders/${first.id}`, { token: ctx.adminToken });
  assert.equal(one.status, 200);
  assert.deepEqual(one.body.data, first, 'GET trả đúng đơn đã tạo');
  assertError(await ctx.request('GET', '/orders/999999', { token: ctx.adminToken }), 404, 'NOT_FOUND');

  const list = await ctx.request('GET', '/orders', { token: ctx.adminToken });
  assert.equal(list.status, 200);
  assert.deepEqual(list.body.data.map((o) => o.id), [first.id, second.id], 'sắp theo thứ tự tạo');
  assert.deepEqual(list.body.meta, { page: 1, perPage: 20, total: 2 });
});

test('Luồng trạng thái pending → paid → shipped, chuyển sai trả 409', TEST_TIMEOUT, async (t) => {
  const { ctx, shirt } = await setup(t);
  const order = (await placeOrder(ctx, [{ productId: shirt.id, quantity: 1 }])).body.data;

  assertError(await action(ctx, order.id, 'ship'), 409, 'INVALID_STATE', 'chưa thanh toán không được giao');
  const paid = await action(ctx, order.id, 'pay');
  assert.equal(paid.status, 200, paid.text);
  assert.equal(paid.body.data.status, 'paid');
  assertError(await action(ctx, order.id, 'pay'), 409, 'INVALID_STATE', 'thanh toán lần hai');
  const shipped = await action(ctx, order.id, 'ship');
  assert.equal(shipped.body.data.status, 'shipped');
  assertError(await action(ctx, order.id, 'cancel'), 409, 'INVALID_STATE', 'đã giao thì không huỷ được');
  assertError(await action(ctx, '999999', 'pay'), 404, 'NOT_FOUND');
});

test('Huỷ đơn hoàn lại tồn kho đúng một lần', TEST_TIMEOUT, async (t) => {
  const { ctx, shirt, jean } = await setup(t);
  const order = (await placeOrder(ctx, [
    { productId: shirt.id, quantity: 4 },
    { productId: jean.id, quantity: 2 },
  ])).body.data;
  assert.equal(await getStock(ctx, shirt.id), 6);

  const cancelled = await action(ctx, order.id, 'cancel', ctx.customerToken);
  assert.equal(cancelled.status, 200, cancelled.text);
  assert.equal(cancelled.body.data.status, 'cancelled');
  assert.equal(await getStock(ctx, shirt.id), 10, 'huỷ đơn phải hoàn tồn kho');
  assert.equal(await getStock(ctx, jean.id), 3);

  assertError(await action(ctx, order.id, 'cancel', ctx.customerToken), 409, 'INVALID_STATE', 'huỷ lần hai');
  assert.equal(await getStock(ctx, shirt.id), 10, 'huỷ lần hai không được cộng kho thêm lần nữa');
});

test('Huỷ đơn đã thanh toán cũng hoàn tồn kho', TEST_TIMEOUT, async (t) => {
  const { ctx, shirt } = await setup(t);
  const order = (await placeOrder(ctx, [{ productId: shirt.id, quantity: 3 }])).body.data;
  await action(ctx, order.id, 'pay');
  const cancelled = await action(ctx, order.id, 'cancel');
  assert.equal(cancelled.status, 200, cancelled.text);
  assert.equal(await getStock(ctx, shirt.id), 10);
});

test('10 đơn đồng thời cho sản phẩm còn 5: đúng 5 đơn thành công, không bán vượt', TEST_TIMEOUT, async (t) => {
  const ctx = await useApp(t);
  const product = await createProduct(ctx, { sku: 'HOT-SALE', stock: 5 });
  const results = await Promise.all(
    Array.from({ length: 10 }, () => placeOrder(ctx, [{ productId: product.id, quantity: 1 }])),
  );
  const statuses = results.map((r) => r.status).sort();
  assert.deepEqual(statuses, [201, 201, 201, 201, 201, 409, 409, 409, 409, 409], `kết quả: ${statuses}`);
  assert.equal(await getStock(ctx, product.id), 0, 'tồn kho không được âm hay lệch');
});

test('10 lần xuất kho đồng thời, tồn 5: đúng 5 lần thành công', TEST_TIMEOUT, async (t) => {
  const ctx = await useApp(t);
  const product = await createProduct(ctx, { stock: 5 });
  const results = await Promise.all(
    Array.from({ length: 10 }, () =>
      ctx.request('POST', '/inventory/adjustments', {
        body: { productId: product.id, quantity: -1, reason: 'xuất' },
        token: ctx.adminToken,
      }),
    ),
  );
  assert.equal(results.filter((r) => r.status === 201).length, 5);
  assert.equal(await getStock(ctx, product.id), 0);
});
