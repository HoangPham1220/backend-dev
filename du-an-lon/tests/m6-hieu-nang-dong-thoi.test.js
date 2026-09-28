// M6 · Hiệu năng và đồng thời (nâng cao, tùy chọn). Chạy: npm run du-an m6
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useApp, assertError, errorFields, createProduct, adjustStock, TEST_TIMEOUT } from './helpers.js';

async function seedProducts(ctx, count, prefix = 'P') {
  const products = [];
  for (let i = 1; i <= count; i++) {
    products.push(await createProduct(ctx, { sku: `${prefix}-${i}`, name: `Sản phẩm ${prefix} ${i}` }));
  }
  return products;
}

async function listCursor(ctx, query) {
  const res = await ctx.request('GET', `/products?${query}`);
  assert.equal(res.status, 200, `GET /products?${query} phải 200, nhận ${res.status}: ${res.text}`);
  assert.ok(Array.isArray(res.body?.data), 'data phải là mảng');
  assert.ok(res.body.meta && 'nextCursor' in res.body.meta, 'chế độ cursor: meta phải có nextCursor (null khi hết dữ liệu)');
  return res.body;
}

// Đọc hết mọi trang bằng cursor, trả danh sách sku theo thứ tự nhận được.
async function readAllPages(ctx, baseQuery, limit) {
  const skus = [];
  let cursor = null;
  let pages = 0;
  do {
    const query = `${baseQuery}limit=${limit}${cursor ? `&after=${encodeURIComponent(cursor)}` : ''}`;
    const page = await listCursor(ctx, query);
    assert.ok(page.data.length <= limit, `mỗi trang tối đa ${limit} phần tử, nhận ${page.data.length}`);
    skus.push(...page.data.map((p) => p.sku));
    cursor = page.meta.nextCursor;
    pages += 1;
    assert.ok(pages <= 10, 'nextCursor phải về null khi hết dữ liệu (đang lặp vô hạn?)');
  } while (cursor);
  return { skus, pages };
}

async function getWithEtag(ctx, productId) {
  const res = await ctx.request('GET', `/products/${productId}`);
  assert.equal(res.status, 200, res.text);
  const etag = res.headers.get('etag');
  assert.ok(etag, 'GET /products/:id phải có header ETag');
  return { res, etag };
}

test('Cursor: duyệt hết danh sách bằng limit + after, đúng thứ tự, không trùng, không sót', TEST_TIMEOUT, async (t) => {
  const ctx = await useApp(t);
  const products = await seedProducts(ctx, 5);
  const { skus, pages } = await readAllPages(ctx, '', 2);
  assert.deepEqual(skus, products.map((p) => p.sku), 'ghép các trang phải ra đúng danh sách, sắp theo thứ tự tạo');
  assert.equal(pages, 3, '5 sản phẩm, limit 2 → 3 trang');
});

test('Cursor ổn định khi dữ liệu thay đổi giữa các trang (offset thì bị trượt)', TEST_TIMEOUT, async (t) => {
  const ctx = await useApp(t);
  const products = await seedProducts(ctx, 5);
  const first = await listCursor(ctx, 'limit=2');
  assert.deepEqual(first.data.map((p) => p.sku), ['P-1', 'P-2']);
  assert.ok(first.meta.nextCursor, 'còn dữ liệu thì nextCursor khác null');

  // Xoá một sản phẩm ở trang đã đọc: với ?page=2 kiểu offset, P-3 sẽ bị bỏ sót.
  const del = await ctx.request('DELETE', `/products/${products[0].id}`, { token: ctx.adminToken });
  assert.equal(del.status, 204, del.text);
  const second = await listCursor(ctx, `limit=2&after=${encodeURIComponent(first.meta.nextCursor)}`);
  assert.deepEqual(second.data.map((p) => p.sku), ['P-3', 'P-4'], 'trang sau tiếp tục từ sau phần tử cuối đã thấy, không bị trượt');

  // Sản phẩm mới tạo nằm ở cuối, không chen vào giữa.
  await createProduct(ctx, { sku: 'P-NEW', name: 'Sản phẩm mới' });
  const third = await listCursor(ctx, `limit=2&after=${encodeURIComponent(second.meta.nextCursor)}`);
  assert.deepEqual(third.data.map((p) => p.sku), ['P-5', 'P-NEW']);
});

test('Cursor kết hợp với tìm kiếm ?q', TEST_TIMEOUT, async (t) => {
  const ctx = await useApp(t);
  await seedProducts(ctx, 3, 'AO');
  await seedProducts(ctx, 2, 'QUAN');
  const { skus } = await readAllPages(ctx, 'q=ao&', 2);
  assert.deepEqual(skus, ['AO-1', 'AO-2', 'AO-3'], 'chỉ các sản phẩm khớp q, qua nhiều trang');
});

test('Cursor: tham số sai trả 422, phân trang page/perPage cũ vẫn chạy', TEST_TIMEOUT, async (t) => {
  const ctx = await useApp(t);
  await seedProducts(ctx, 2);
  const cases = [
    ['limit=0', ['limit'], 'limit = 0'],
    ['limit=101', ['limit'], 'limit quá 100'],
    ['limit=abc', ['limit'], 'limit không phải số'],
    ['after=khong-phai-cursor!!', ['after'], 'cursor rác hoặc bị sửa'],
    ['limit=2&page=2', ['page', 'perPage', 'limit', 'after'], 'không trộn page với cursor'],
  ];
  for (const [query, fields, why] of cases) {
    const res = await ctx.request('GET', `/products?${query}`);
    assertError(res, 422, 'VALIDATION_ERROR', why);
    assert.ok(errorFields(res).some((f) => fields.includes(f)), `details phải chỉ ra field (${fields.join(' hoặc ')}) cho: ${why}`);
  }

  const old = await ctx.request('GET', '/products?page=2&perPage=1');
  assert.equal(old.status, 200, `phân trang offset (M1) vẫn phải chạy: ${old.text}`);
  assert.equal(old.body.meta.total, 2);
  assert.deepEqual(old.body.data.map((p) => p.sku), ['P-2']);
});

test('ETag: GET lại với If-None-Match trả 304 không body', TEST_TIMEOUT, async (t) => {
  const ctx = await useApp(t);
  const product = await createProduct(ctx);
  const { etag } = await getWithEtag(ctx, product.id);
  assert.match(etag, /^"[^"]+"$/, `ETag mạnh là chuỗi trong ngoặc kép, ví dụ "v3". Nhận: ${etag}`);

  const again = await ctx.request('GET', `/products/${product.id}`, { headers: { 'if-none-match': etag } });
  assert.equal(again.status, 304, `dữ liệu chưa đổi thì trả 304 Not Modified, nhận ${again.status}: ${again.text}`);
  assert.equal(again.text, '', '304 không có body');
  assert.equal(again.headers.get('etag'), etag, '304 vẫn gửi kèm ETag hiện tại');
});

test('ETag đổi khi sản phẩm đổi, kể cả khi chỉ tồn kho đổi', TEST_TIMEOUT, async (t) => {
  const ctx = await useApp(t);
  const product = await createProduct(ctx);
  const { etag: v1 } = await getWithEtag(ctx, product.id);

  const patch = await ctx.request('PATCH', `/products/${product.id}`, { body: { name: 'Tên mới' }, token: ctx.adminToken });
  assert.equal(patch.status, 200, patch.text);
  const { etag: v2 } = await getWithEtag(ctx, product.id);
  assert.notEqual(v2, v1, 'sửa tên thì ETag phải đổi');

  const stale = await ctx.request('GET', `/products/${product.id}`, { headers: { 'if-none-match': v1 } });
  assert.equal(stale.status, 200, 'If-None-Match với ETag cũ phải nhận 200 kèm dữ liệu mới');
  assert.equal(stale.body.data.name, 'Tên mới');

  await adjustStock(ctx, product.id, 3);
  const { etag: v3 } = await getWithEtag(ctx, product.id);
  assert.notEqual(v3, v2, 'tồn kho có trong response nên đổi tồn kho cũng phải đổi ETag');
});

test('If-Match: sửa dựa trên phiên bản cũ trả 412, không ghi đè thay đổi của người khác', TEST_TIMEOUT, async (t) => {
  const ctx = await useApp(t);
  const product = await createProduct(ctx, { name: 'Tên gốc' });
  const { etag } = await getWithEtag(ctx, product.id);

  // Hai admin cùng mở trang sửa với cùng một phiên bản.
  const first = await ctx.request('PATCH', `/products/${product.id}`, {
    body: { name: 'Tên của admin A' },
    token: ctx.adminToken,
    headers: { 'if-match': etag },
  });
  assert.equal(first.status, 200, first.text);
  assert.ok(first.headers.get('etag'), 'PATCH thành công trả ETag mới');
  assert.notEqual(first.headers.get('etag'), etag);

  const second = await ctx.request('PATCH', `/products/${product.id}`, {
    body: { name: 'Tên của admin B' },
    token: ctx.adminToken,
    headers: { 'if-match': etag },
  });
  assertError(second, 412, 'PRECONDITION_FAILED', 'If-Match là ETag đã cũ');

  const { res } = await getWithEtag(ctx, product.id);
  assert.equal(res.body.data.name, 'Tên của admin A', 'thay đổi của admin A không bị ghi đè');

  const noHeader = await ctx.request('PATCH', `/products/${product.id}`, { body: { price: 99000 }, token: ctx.adminToken });
  assert.equal(noHeader.status, 200, `không gửi If-Match thì vẫn sửa được như M1, nhận ${noHeader.status}: ${noHeader.text}`);
});

test('If-Match: 5 request sửa đồng thời cùng một phiên bản, đúng 1 request thành công', TEST_TIMEOUT, async (t) => {
  const ctx = await useApp(t);
  const product = await createProduct(ctx);
  const { etag } = await getWithEtag(ctx, product.id);

  const results = await Promise.all(
    Array.from({ length: 5 }, (_, i) =>
      ctx.request('PATCH', `/products/${product.id}`, {
        body: { name: `Tên song song ${i}` },
        token: ctx.adminToken,
        headers: { 'if-match': etag },
      }),
    ),
  );
  const statuses = results.map((r) => r.status).sort();
  assert.deepEqual(
    statuses,
    [200, 412, 412, 412, 412],
    `đúng 1 request thắng, 4 request còn lại 412. Với DB: UPDATE ... WHERE id = ? AND version = ? rồi kiểm tra số dòng bị ảnh hưởng. Nhận ${statuses}`,
  );
});
