import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './exercise.js';

let server;
let base;

beforeEach(async () => {
  server = createApp();
  assert.ok(server && typeof server.listen === 'function', 'createApp() phải trả về http.Server (chưa listen)');
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

afterEach(() => {
  if (server?.listening) {
    server.closeAllConnections();
    server.close();
  }
});

async function api(method, path, body, { raw } = {}) {
  const init = { method, signal: AbortSignal.timeout(2000), headers: {} };
  if (raw !== undefined) {
    init.body = raw;
    init.headers['Content-Type'] = 'application/json';
  } else if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${base}${path}`, init);
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = text;
  }
  return { status: res.status, headers: res.headers, body: json, text };
}

const CAP = { sku: 'CAP', name: 'Mũ lưỡi trai', price: 80000, stock: 5 };
const TSHIRT = { sku: 'TSHIRT-M', name: 'Áo thun M', price: 150000, stock: 10 };

async function seed(...products) {
  for (const p of products) {
    const res = await api('POST', '/products', p);
    assert.equal(res.status, 201, `seed: tạo ${p.sku} phải trả 201`);
  }
}

function assertError(res, status, code) {
  assert.equal(res.status, status);
  assert.equal(res.body?.error?.code, code, `body phải có dạng { error: { code: '${code}', ... } }`);
  assert.equal(typeof res.body.error.message, 'string');
  assert.ok('details' in res.body.error, 'error phải có field details (null nếu không có)');
}

test('POST /products tạo sản phẩm: 201, trả sản phẩm, có header Location', { timeout: 5000 }, async () => {
  const res = await api('POST', '/products', CAP);
  assert.equal(res.status, 201, 'tạo mới trả 201 Created');
  assert.deepEqual(res.body, CAP);
  assert.equal(res.headers.get('location'), '/products/CAP');
  assert.match(res.headers.get('content-type') ?? '', /^application\/json/);
});

test('POST: trim name, stock mặc định 0, bỏ field lạ', { timeout: 5000 }, async () => {
  const res = await api('POST', '/products', { sku: 'BAG', name: '  Túi vải  ', price: 50000, isAdmin: true });
  assert.equal(res.status, 201);
  assert.deepEqual(res.body, { sku: 'BAG', name: 'Túi vải', price: 50000, stock: 0 });
});

test('GET /products/:sku trả sản phẩm, không có thì 404', { timeout: 5000 }, async () => {
  await seed(CAP);
  const ok = await api('GET', '/products/CAP');
  assert.equal(ok.status, 200);
  assert.deepEqual(ok.body, CAP);
  assertError(await api('GET', '/products/NOPE'), 404, 'NOT_FOUND');
});

test('POST trùng sku trả 409', { timeout: 5000 }, async () => {
  await seed(CAP);
  const res = await api('POST', '/products', { ...CAP, name: 'Mũ khác' });
  assertError(res, 409, 'CONFLICT');
  assert.equal((await api('GET', '/products/CAP')).body.name, 'Mũ lưỡi trai', 'sản phẩm cũ không bị ghi đè');
});

test('POST validation: 422, gom lỗi của MỌI field vào details', { timeout: 5000 }, async () => {
  const res = await api('POST', '/products', { sku: 'mu thuong', name: '   ', price: 10.5, stock: -1 });
  assertError(res, 422, 'VALIDATION_ERROR');
  assert.deepEqual(
    Object.keys(res.body.error.details ?? {}).sort(),
    ['name', 'price', 'sku', 'stock'],
    'phải kiểm tra hết các field, không dừng ở lỗi đầu tiên',
  );
});

test('POST validation: thiếu field bắt buộc, sai kiểu dữ liệu', { timeout: 5000 }, async () => {
  const missing = await api('POST', '/products', {});
  assertError(missing, 422, 'VALIDATION_ERROR');
  assert.deepEqual(Object.keys(missing.body.error.details).sort(), ['name', 'price', 'sku']);

  const wrongType = await api('POST', '/products', { sku: 'CAP', name: 'Mũ', price: '80000' });
  assertError(wrongType, 422, 'VALIDATION_ERROR');
  assert.ok('price' in wrongType.body.error.details, 'price là chuỗi "80000" → không hợp lệ');
});

test('POST body không hợp lệ: JSON hỏng hoặc không phải object → 400', { timeout: 5000 }, async () => {
  assertError(await api('POST', '/products', undefined, { raw: '{"sku": CAP' }), 400, 'BAD_REQUEST');
  assertError(await api('POST', '/products', [CAP]), 400, 'BAD_REQUEST');
});

test('PUT cập nhật sản phẩm, sku lấy từ URL', { timeout: 5000 }, async () => {
  await seed(CAP);
  const res = await api('PUT', '/products/CAP', { sku: 'HACK', name: 'Mũ mới', price: 90000, stock: 3 });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { sku: 'CAP', name: 'Mũ mới', price: 90000, stock: 3 });
  assert.deepEqual((await api('GET', '/products/CAP')).body, res.body, 'thay đổi phải được lưu');
  assertError(await api('GET', '/products/HACK'), 404, 'NOT_FOUND');
});

test('PUT: 404 khi không có, 422 khi dữ liệu sai', { timeout: 5000 }, async () => {
  await seed(CAP);
  assertError(await api('PUT', '/products/NOPE', { name: 'x', price: 1 }), 404, 'NOT_FOUND');
  const bad = await api('PUT', '/products/CAP', { name: '', price: -5 });
  assertError(bad, 422, 'VALIDATION_ERROR');
  assert.deepEqual(Object.keys(bad.body.error.details).sort(), ['name', 'price']);
});

test('DELETE: 204 body rỗng, sau đó GET là 404; xoá lần nữa là 404', { timeout: 5000 }, async () => {
  await seed(CAP);
  const res = await api('DELETE', '/products/CAP');
  assert.equal(res.status, 204);
  assert.equal(res.text, '', '204 No Content không có body');
  assertError(await api('GET', '/products/CAP'), 404, 'NOT_FOUND');
  assertError(await api('DELETE', '/products/CAP'), 404, 'NOT_FOUND');
});

test('GET /products: danh sách theo thứ tự tạo, có meta', { timeout: 5000 }, async () => {
  await seed(CAP, TSHIRT);
  const res = await api('GET', '/products');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, {
    data: [CAP, TSHIRT],
    meta: { page: 1, perPage: 10, total: 2, totalPages: 1 },
  });
  const empty = await api('GET', '/products');
  assert.ok(Array.isArray(empty.body.data));
});

test('GET /products?q= lọc theo tên, không phân biệt hoa thường', { timeout: 5000 }, async () => {
  await seed(CAP, TSHIRT, { sku: 'TSHIRT-L', name: 'ÁO THUN L', price: 160000 });
  const res = await api('GET', `/products?q=${encodeURIComponent('áo thun')}`);
  assert.equal(res.status, 200);
  assert.deepEqual(
    res.body.data.map((p) => p.sku),
    ['TSHIRT-M', 'TSHIRT-L'],
  );
  assert.equal(res.body.meta.total, 2, 'total là số sau khi lọc');
});

test('GET /products phân trang: page, perPage, totalPages', { timeout: 5000 }, async () => {
  for (let i = 1; i <= 7; i++) {
    await seed({ sku: `P-${i}`, name: `Sản phẩm ${i}`, price: i * 1000 });
  }
  const res = await api('GET', '/products?page=2&perPage=3');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.data.map((p) => p.sku), ['P-4', 'P-5', 'P-6']);
  assert.deepEqual(res.body.meta, { page: 2, perPage: 3, total: 7, totalPages: 3 }, 'page/perPage trong meta là số, không phải chuỗi');

  const last = await api('GET', '/products?page=3&perPage=3');
  assert.deepEqual(last.body.data.map((p) => p.sku), ['P-7']);

  const beyond = await api('GET', '/products?page=9&perPage=3');
  assert.equal(beyond.status, 200, 'trang vượt quá vẫn 200, data rỗng');
  assert.deepEqual(beyond.body.data, []);
});

test('GET /products: page/perPage không hợp lệ → 422', { timeout: 5000 }, async () => {
  for (const qs of ['page=0', 'page=abc', 'perPage=1.5', 'perPage=101', 'page=-1']) {
    const res = await api('GET', `/products?${qs}`);
    assertError(res, 422, 'VALIDATION_ERROR');
  }
});

test('Route không tồn tại → 404 JSON', { timeout: 5000 }, async () => {
  assertError(await api('GET', '/orders'), 404, 'NOT_FOUND');
});

test('Mỗi createApp() có kho dữ liệu riêng', { timeout: 5000 }, async () => {
  await seed(CAP);
  const other = createApp();
  await new Promise((resolve) => other.listen(0, '127.0.0.1', resolve));
  try {
    const res = await fetch(`http://127.0.0.1:${other.address().port}/products/CAP`, {
      signal: AbortSignal.timeout(2000),
    });
    assert.equal(res.status, 404, 'app thứ hai không được thấy dữ liệu của app thứ nhất (không dùng biến toàn cục)');
  } finally {
    other.closeAllConnections();
    other.close();
  }
});
