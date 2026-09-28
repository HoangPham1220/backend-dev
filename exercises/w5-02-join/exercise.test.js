import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import * as answers from './exercise.js';

const SEED = readFileSync(new URL('./seed.sql', import.meta.url), 'utf8');

function query(name) {
  const sql = answers[name];
  const body = (sql ?? '').replace(/--.*$/gm, '').trim();
  assert.ok(body !== '', `chưa viết câu SQL cho ${name}`);
  const db = new DatabaseSync(':memory:');
  db.exec(SEED);
  return db.prepare(sql).all().map((row) => ({ ...row }));
}

test('orderDetailsSql: chi tiết đơn #6 ghép 3 bảng', () => {
  assert.deepEqual(query('orderDetailsSql'), [
    { order_id: 6, status: 'paid', sku: 'AO-001', product_name: 'Áo thun basic trắng', quantity: 3, line_total: 450000 },
    { order_id: 6, status: 'paid', sku: 'QU-003', product_name: 'Quần short thể thao', quantity: 2, line_total: 360000 },
    { order_id: 6, status: 'paid', sku: 'PK-001', product_name: 'Mũ lưỡi trai', quantity: 1, line_total: 120000 },
  ], 'line_total dùng order_items.price (giá lúc đặt), không phải products.price');
});

test('customerOrdersSql: khách chưa có đơn vẫn xuất hiện với order_id NULL', () => {
  const rows = query('customerOrdersSql');
  assert.equal(rows.length, 17, '15 đơn + 2 khách chưa có đơn = 17 dòng. Nếu ra 15 dòng: bạn đang dùng INNER JOIN');
  assert.deepEqual(rows.slice(0, 3), [
    { customer_id: 1, name: 'Nguyễn Văn An', order_id: 1, status: 'shipped' },
    { customer_id: 1, name: 'Nguyễn Văn An', order_id: 4, status: 'shipped' },
    { customer_id: 1, name: 'Nguyễn Văn An', order_id: 11, status: 'pending' },
  ], 'sắp theo customer_id rồi order_id');
  assert.deepEqual(rows[13], { customer_id: 7, name: 'Đỗ Ngọc Lan', order_id: null, status: null });
  assert.deepEqual(rows[16], { customer_id: 10, name: 'Đặng Hải Yến', order_id: null, status: null });
});

test('customersWithoutOrdersSql: khách chưa từng đặt đơn', () => {
  assert.match(answers.customersWithoutOrdersSql ?? '', /LEFT\s+(OUTER\s+)?JOIN/i, 'bài này yêu cầu dùng LEFT JOIN');
  assert.deepEqual(query('customersWithoutOrdersSql'), [
    { id: 7, name: 'Đỗ Ngọc Lan' },
    { id: 10, name: 'Đặng Hải Yến' },
  ], 'khách #4 chỉ có đơn bị huỷ nhưng vẫn là "đã từng đặt đơn"');
});

test('productsWithCategorySql: mọi sản phẩm, kể cả chưa có danh mục', () => {
  const rows = query('productsWithCategorySql');
  assert.equal(rows.length, 18, 'có 18 sản phẩm. Nếu ra 17: INNER JOIN đã làm mất sản phẩm chưa có danh mục');
  assert.deepEqual(rows[0], { sku: 'AO-001', name: 'Áo thun basic trắng', category_name: 'Áo' });
  assert.deepEqual(rows.find((r) => r.sku === 'PK-005'), { sku: 'PK-005', name: 'Ví da nam', category_name: null });
  assert.deepEqual(rows.map((r) => r.sku), [...rows.map((r) => r.sku)].sort(), 'sắp theo sku');
});
