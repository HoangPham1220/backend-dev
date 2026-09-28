// M1 · Sản phẩm (tuần 4). Chạy: npm run du-an m1
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useApp, assertError, errorFields, createProduct, TEST_TIMEOUT } from './helpers.js';

const aoThun = { sku: 'TSHIRT-M', name: 'Áo thun cotton size M', price: 150000 };

test('POST /products tạo sản phẩm, trả 201 và dữ liệu đầy đủ', TEST_TIMEOUT, async (t) => {
  const ctx = await useApp(t);
  const res = await ctx.request('POST', '/products', { body: aoThun, token: ctx.adminToken });

  assert.equal(res.status, 201, `phải 201 Created, nhận ${res.status}: ${res.text}`);
  assert.match(res.headers.get('content-type') ?? '', /application\/json/, 'response phải có Content-Type application/json');
  const product = res.body?.data;
  assert.ok(product, 'response thành công bọc trong { data: ... }');
  assert.ok(product.id !== undefined && product.id !== null, 'server phải sinh id');
  assert.equal(product.sku, 'TSHIRT-M');
  assert.equal(product.name, 'Áo thun cotton size M');
  assert.equal(product.price, 150000);
  assert.equal(product.stock, 0, 'không gửi stock thì tồn kho mặc định 0');
  assert.equal(product.status, 'active', 'status mặc định là active');
});

test('POST /products nhận stock ban đầu', TEST_TIMEOUT, async (t) => {
  const ctx = await useApp(t);
  const product = await createProduct(ctx, { stock: 7 });
  assert.equal(product.stock, 7);
});

test('POST /products: body rỗng báo lỗi cho mọi trường bắt buộc cùng lúc', TEST_TIMEOUT, async (t) => {
  const ctx = await useApp(t);
  const res = await ctx.request('POST', '/products', { body: {}, token: ctx.adminToken });
  assertError(res, 422, 'VALIDATION_ERROR');
  const fields = errorFields(res);
  for (const field of ['sku', 'name', 'price']) {
    assert.ok(fields.includes(field), `details phải có lỗi cho "${field}" (người gọi API cần biết hết lỗi trong một lần). Có: ${fields}`);
  }
});

test('POST /products: price phải là số nguyên >= 0', TEST_TIMEOUT, async (t) => {
  const ctx = await useApp(t);
  const cases = [
    [-1, 'giá âm'],
    [1.5, 'giá lẻ (VND là số nguyên)'],
    ['150000', 'giá là chuỗi'],
  ];
  for (const [price, why] of cases) {
    const res = await ctx.request('POST', '/products', { body: { ...aoThun, price }, token: ctx.adminToken });
    assertError(res, 422, 'VALIDATION_ERROR', why);
    assert.ok(errorFields(res).includes('price'), `details phải chỉ ra field "price" (${why})`);
  }
});

test('POST /products: sku rỗng, stock âm, status lạ đều bị từ chối', TEST_TIMEOUT, async (t) => {
  const ctx = await useApp(t);
  const cases = [
    [{ ...aoThun, sku: '   ' }, 'sku', 'sku chỉ có khoảng trắng'],
    [{ ...aoThun, stock: -2 }, 'stock', 'stock âm'],
    [{ ...aoThun, status: 'deleted' }, 'status', 'status ngoài active/inactive'],
  ];
  for (const [body, field, why] of cases) {
    const res = await ctx.request('POST', '/products', { body, token: ctx.adminToken });
    assertError(res, 422, 'VALIDATION_ERROR', why);
    assert.ok(errorFields(res).includes(field), `details phải chỉ ra field "${field}" (${why})`);
  }
});

test('POST /products: trùng sku trả 409 CONFLICT', TEST_TIMEOUT, async (t) => {
  const ctx = await useApp(t);
  await createProduct(ctx, aoThun);
  const res = await ctx.request('POST', '/products', { body: { ...aoThun, name: 'Tên khác' }, token: ctx.adminToken });
  assertError(res, 409, 'CONFLICT', 'sku là duy nhất');
});

test('GET /products/:id trả sản phẩm, id không tồn tại trả 404', TEST_TIMEOUT, async (t) => {
  const ctx = await useApp(t);
  const created = await createProduct(ctx, aoThun);

  const found = await ctx.request('GET', `/products/${created.id}`);
  assert.equal(found.status, 200);
  assert.deepEqual(found.body.data, created, 'GET phải trả đúng dữ liệu vừa tạo');

  assertError(await ctx.request('GET', '/products/999999'), 404, 'NOT_FOUND', 'id không tồn tại');
  assertError(await ctx.request('GET', '/products/abc'), 404, 'NOT_FOUND', 'id sai định dạng vẫn là 404, không phải 500');
});

test('GET /products trả danh sách theo thứ tự tạo, có meta phân trang', TEST_TIMEOUT, async (t) => {
  const ctx = await useApp(t);
  const empty = await ctx.request('GET', '/products');
  assert.equal(empty.status, 200);
  assert.deepEqual(empty.body.data, [], 'app mới phải chưa có sản phẩm nào');
  assert.deepEqual(empty.body.meta, { page: 1, perPage: 20, total: 0 }, 'meta mặc định page 1, perPage 20');

  await createProduct(ctx, { sku: 'A-1', name: 'Một' });
  await createProduct(ctx, { sku: 'A-2', name: 'Hai' });
  const res = await ctx.request('GET', '/products');
  assert.deepEqual(res.body.data.map((p) => p.sku), ['A-1', 'A-2'], 'sắp theo thứ tự tạo, cũ trước');
  assert.equal(res.body.meta.total, 2);
});

test('GET /products phân trang bằng ?page và ?perPage', TEST_TIMEOUT, async (t) => {
  const ctx = await useApp(t);
  for (let i = 1; i <= 25; i += 1) {
    await createProduct(ctx, { sku: `P-${String(i).padStart(2, '0')}`, name: `Sản phẩm ${i}` });
  }
  const page2 = await ctx.request('GET', '/products?page=2&perPage=10');
  assert.equal(page2.status, 200);
  assert.deepEqual(page2.body.data.map((p) => p.sku), Array.from({ length: 10 }, (_, i) => `P-${String(i + 11).padStart(2, '0')}`));
  assert.deepEqual(page2.body.meta, { page: 2, perPage: 10, total: 25 });

  const page4 = await ctx.request('GET', '/products?page=4&perPage=10');
  assert.deepEqual(page4.body.data, [], 'trang vượt quá dữ liệu trả mảng rỗng, không phải lỗi');
  assert.equal(page4.body.meta.total, 25);
});

test('GET /products: tham số phân trang sai trả 422', TEST_TIMEOUT, async (t) => {
  const ctx = await useApp(t);
  for (const query of ['page=0', 'page=abc', 'perPage=0', 'perPage=101', 'page=1.5']) {
    assertError(await ctx.request('GET', `/products?${query}`), 422, 'VALIDATION_ERROR', `?${query}`);
  }
});

test('GET /products?q= tìm theo tên hoặc sku, không phân biệt hoa thường', TEST_TIMEOUT, async (t) => {
  const ctx = await useApp(t);
  await createProduct(ctx, { sku: 'TSHIRT-M', name: 'Áo thun cotton' });
  await createProduct(ctx, { sku: 'JEAN-32', name: 'Quần jean xanh' });
  await createProduct(ctx, { sku: 'CAP-01', name: 'Mũ lưỡi trai' });

  const byName = await ctx.request('GET', `/products?q=${encodeURIComponent('QUẦN')}`);
  assert.deepEqual(byName.body.data.map((p) => p.sku), ['JEAN-32'], 'tìm theo tên, không phân biệt hoa thường');
  assert.equal(byName.body.meta.total, 1, 'meta.total đếm theo kết quả đã lọc');

  const bySku = await ctx.request('GET', '/products?q=tshirt');
  assert.deepEqual(bySku.body.data.map((p) => p.sku), ['TSHIRT-M'], 'tìm theo sku');
});

test('PATCH /products/:id cập nhật một phần, giữ nguyên field không gửi', TEST_TIMEOUT, async (t) => {
  const ctx = await useApp(t);
  const created = await createProduct(ctx, { ...aoThun, stock: 3 });
  const res = await ctx.request('PATCH', `/products/${created.id}`, { body: { price: 120000, status: 'inactive' }, token: ctx.adminToken });
  assert.equal(res.status, 200, res.text);
  assert.equal(res.body.data.price, 120000);
  assert.equal(res.body.data.status, 'inactive');
  assert.equal(res.body.data.name, aoThun.name, 'field không gửi phải giữ nguyên');
  assert.equal(res.body.data.stock, 3);

  const again = await ctx.request('GET', `/products/${created.id}`);
  assert.equal(again.body.data.price, 120000, 'thay đổi phải được lưu lại');
});

test('PATCH /products/:id: validate, chặn sửa stock, trùng sku, không tồn tại', TEST_TIMEOUT, async (t) => {
  const ctx = await useApp(t);
  const created = await createProduct(ctx, aoThun);
  await createProduct(ctx, { sku: 'JEAN-32', name: 'Quần jean' });
  const patch = (id, body) => ctx.request('PATCH', `/products/${id}`, { body, token: ctx.adminToken });

  assertError(await patch(created.id, { price: -5 }), 422, 'VALIDATION_ERROR', 'giá âm');
  const stockRes = await patch(created.id, { stock: 100 });
  assertError(stockRes, 422, 'VALIDATION_ERROR', 'tồn kho chỉ đổi qua /inventory/adjustments để có lịch sử');
  assert.ok(errorFields(stockRes).includes('stock'));
  assertError(await patch(created.id, { sku: 'JEAN-32' }), 409, 'CONFLICT', 'đổi sang sku đã có');
  assertError(await patch('999999', { price: 1 }), 404, 'NOT_FOUND');
});

test('DELETE /products/:id trả 204, sau đó không còn tìm thấy', TEST_TIMEOUT, async (t) => {
  const ctx = await useApp(t);
  const created = await createProduct(ctx, aoThun);
  const res = await ctx.request('DELETE', `/products/${created.id}`, { token: ctx.adminToken });
  assert.equal(res.status, 204, `phải 204 No Content, nhận ${res.status}`);
  assert.equal(res.text, '', '204 không có body');
  assertError(await ctx.request('GET', `/products/${created.id}`), 404, 'NOT_FOUND', 'đã xoá');
  assertError(await ctx.request('DELETE', `/products/${created.id}`, { token: ctx.adminToken }), 404, 'NOT_FOUND', 'xoá lần hai');
});

test('Route không tồn tại trả 404 đúng định dạng lỗi JSON', TEST_TIMEOUT, async (t) => {
  const ctx = await useApp(t);
  const res = await ctx.request('GET', '/khong-co-route-nay');
  assertError(res, 404, 'NOT_FOUND');
  assert.match(res.headers.get('content-type') ?? '', /application\/json/, 'kể cả lỗi cũng trả JSON, không trả HTML');
});

test('Mỗi lần createApp() là một app với dữ liệu trống, không dùng chung', TEST_TIMEOUT, async (t) => {
  const first = await useApp(t);
  await createProduct(first, aoThun);
  const second = await useApp(t);
  const res = await second.request('GET', '/products');
  assert.equal(res.body.meta.total, 0, 'app thứ hai không được thấy dữ liệu của app thứ nhất (xem SPEC: hợp đồng createApp)');
});
