import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import * as answers from './exercise.js';

const SEED = readFileSync(new URL('./seed.sql', import.meta.url), 'utf8');

function query(name, extraSql = '') {
  const sql = answers[name];
  const body = (sql ?? '').replace(/--.*$/gm, '').trim();
  assert.ok(body !== '', `chưa viết câu SQL cho ${name}`);
  const db = new DatabaseSync(':memory:');
  db.exec(SEED);
  if (extraSql) db.exec(extraSql);
  return db.prepare(sql).all().map((row) => ({ ...row }));
}

test('neverSoldSql: sản phẩm chưa từng bán, dùng NOT EXISTS', () => {
  assert.match(answers.neverSoldSql ?? '', /NOT\s+EXISTS/i, 'bài này yêu cầu dùng NOT EXISTS');
  assert.deepEqual(query('neverSoldSql'), [
    { sku: 'AO-002', name: 'Áo thun basic đen' },
    { sku: 'AO-005', name: 'Áo len cổ lọ' },
    { sku: 'GI-004', name: 'Giày da công sở' },
    { sku: 'PK-004', name: 'Balo laptop' },
    { sku: 'PK-005', name: 'Ví da nam' },
    { sku: 'QU-002', name: 'Quần kaki' },
  ], 'AO-004 và QU-004 chỉ nằm trong đơn huỷ/pending nhưng vẫn là "đã xuất hiện" nên không được có');
});

test('aboveAveragePriceSql: giá cao hơn trung bình, không viết cứng con số', () => {
  const expected = [
    { sku: 'GI-002', price: 1250000 },
    { sku: 'GI-001', price: 890000 },
    { sku: 'PK-004', price: 650000 },
    { sku: 'AO-004', price: 550000 },
    { sku: 'QU-004', price: 520000 },
    { sku: 'QU-001', price: 450000 },
  ];
  assert.deepEqual(query('aboveAveragePriceSql'), expected);
  // Thêm một sản phẩm rất đắt: trung bình tăng vọt. Câu SQL đúng phải tự thích nghi.
  const rows = query(
    'aboveAveragePriceSql',
    "INSERT INTO products (sku, name, category_id, price, stock, status) VALUES ('GI-999', 'Giày limited', 3, 20000000, 1, 'active')",
  );
  assert.deepEqual(rows, [{ sku: 'GI-999', price: 20000000 }], 'trung bình phải tính lại từ dữ liệu, không viết cứng');
});

test('topProductsPerCategorySql: top 3 mỗi danh mục bằng ROW_NUMBER()', () => {
  assert.match(answers.topProductsPerCategorySql ?? '', /ROW_NUMBER\s*\(\s*\)\s*OVER/i, 'bài này yêu cầu dùng ROW_NUMBER() OVER (...)');
  assert.deepEqual(query('topProductsPerCategorySql'), [
    { category_name: 'Áo', sku: 'AO-001', units_sold: 6, rank: 1 },
    { category_name: 'Áo', sku: 'AO-003', units_sold: 3, rank: 2 },
    { category_name: 'Áo', sku: 'AO-004', units_sold: 1, rank: 3 },
    { category_name: 'Quần', sku: 'QU-001', units_sold: 4, rank: 1 },
    { category_name: 'Quần', sku: 'QU-003', units_sold: 3, rank: 2 },
    { category_name: 'Giày', sku: 'GI-001', units_sold: 2, rank: 1 },
    { category_name: 'Giày', sku: 'GI-002', units_sold: 2, rank: 2 },
    { category_name: 'Giày', sku: 'GI-003', units_sold: 1, rank: 3 },
    { category_name: 'Phụ kiện', sku: 'PK-003', units_sold: 6, rank: 1 },
    { category_name: 'Phụ kiện', sku: 'PK-001', units_sold: 3, rank: 2 },
    { category_name: 'Phụ kiện', sku: 'PK-002', units_sold: 1, rank: 3 },
  ], 'Quần chỉ có 2 sản phẩm bán được trong đơn hợp lệ (QU-004 chỉ nằm trong đơn pending); Giày: GI-001 và GI-002 cùng 2, sku nhỏ xếp trước');
});

test('repeatCustomersSql: khách từ 2 đơn hợp lệ, viết bằng CTE', () => {
  assert.match(answers.repeatCustomersSql ?? '', /^\s*(--.*\n\s*)*WITH\b/i, 'bài này yêu cầu viết bằng CTE: bắt đầu bằng WITH ...');
  assert.deepEqual(query('repeatCustomersSql'), [
    { customer_id: 2, name: 'Trần Thị Bình', order_count: 3 },
    { customer_id: 1, name: 'Nguyễn Văn An', order_count: 2 },
    { customer_id: 3, name: 'Lê Minh Châu', order_count: 2 },
  ], 'khách #1 có 3 đơn nhưng 1 đơn pending, khách #5 có 2 đơn nhưng 1 đơn huỷ');
});
