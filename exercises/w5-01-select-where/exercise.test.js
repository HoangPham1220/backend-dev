import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import * as answers from './exercise.js';

const SEED = readFileSync(new URL('./seed.sql', import.meta.url), 'utf8');

// Chạy câu SQL trên DB mới nạp seed.sql, trả về mảng object thường để so sánh.
function query(name) {
  const sql = answers[name];
  const body = (sql ?? '').replace(/--.*$/gm, '').trim();
  assert.ok(body !== '', `chưa viết câu SQL cho ${name}`);
  const db = new DatabaseSync(':memory:');
  db.exec(SEED);
  return db.prepare(sql).all().map((row) => ({ ...row }));
}

test('activeInStockSql: sản phẩm active còn hàng, giá giảm dần, cùng giá thì sku tăng dần', () => {
  const rows = query('activeInStockSql');
  assert.deepEqual(Object.keys(rows[0] ?? {}), ['sku', 'name', 'price'], 'đúng 3 cột sku, name, price theo thứ tự');
  assert.ok(!rows.some((r) => ['AO-002', 'QU-002', 'PK-004'].includes(r.sku)), 'sản phẩm stock = 0 không được xuất hiện');
  assert.ok(!rows.some((r) => ['AO-005', 'GI-004'].includes(r.sku)), 'sản phẩm disabled không được xuất hiện');
  assert.deepEqual(rows, [
    { sku: 'GI-002', name: 'Giày chạy bộ', price: 1250000 },
    { sku: 'GI-001', name: 'Giày sneaker trắng', price: 890000 },
    { sku: 'AO-004', name: 'Áo khoác gió', price: 550000 },
    { sku: 'QU-004', name: 'Quần tây công sở', price: 520000 },
    { sku: 'QU-001', name: 'Quần jean slim', price: 450000 },
    { sku: 'AO-003', name: 'Áo sơ mi oxford', price: 350000 },
    { sku: 'PK-005', name: 'Ví da nam', price: 320000 },
    { sku: 'PK-002', name: 'Thắt lưng da', price: 290000 },
    { sku: 'QU-003', name: 'Quần short thể thao', price: 180000 },
    { sku: 'AO-001', name: 'Áo thun basic trắng', price: 150000 },
    { sku: 'GI-003', name: 'Dép quai ngang', price: 120000 },
    { sku: 'PK-001', name: 'Mũ lưỡi trai', price: 120000 },
    { sku: 'PK-003', name: 'Tất cổ ngắn (combo 5 đôi)', price: 90000 },
  ], 'GI-003 và PK-001 cùng giá 120000: sku tăng dần nên GI-003 đứng trước');
});

test('cheapestPageSql: trang 2, mỗi trang 5 sản phẩm', () => {
  const rows = query('cheapestPageSql');
  assert.equal(rows.length, 5, 'mỗi trang đúng 5 dòng');
  assert.deepEqual(rows, [
    { sku: 'QU-003', price: 180000 },
    { sku: 'PK-002', price: 290000 },
    { sku: 'PK-005', price: 320000 },
    { sku: 'AO-003', price: 350000 },
    { sku: 'QU-002', price: 380000 },
  ], 'trang 2 là dòng thứ 6 đến 10. QU-002 hết hàng nhưng vẫn active nên vẫn tính');
});

test('customersInBigCitiesSql: khách ở Hà Nội hoặc TP HCM', () => {
  assert.match(answers.customersInBigCitiesSql ?? '', /\bIN\s*\(/i, 'bài này yêu cầu dùng IN (...)');
  assert.deepEqual(query('customersInBigCitiesSql'), [
    { id: 1, name: 'Nguyễn Văn An', city: 'Hà Nội' },
    { id: 2, name: 'Trần Thị Bình', city: 'TP HCM' },
    { id: 5, name: 'Hoàng Thu Hà', city: 'Hà Nội' },
    { id: 6, name: 'Vũ Đức Huy', city: 'TP HCM' },
    { id: 9, name: 'Ngô Bảo Ngọc', city: 'Hà Nội' },
  ]);
});

test('customersMissingCitySql: khách chưa có thành phố (NULL)', () => {
  assert.deepEqual(query('customersMissingCitySql'), [
    { id: 4, name: 'Phạm Quốc Dũng' },
    { id: 7, name: 'Đỗ Ngọc Lan' },
  ], '"city = NULL" không bao giờ đúng, phải dùng IS NULL');
});

test('gmailCustomersSql: email đuôi @gmail.com', () => {
  assert.deepEqual(query('gmailCustomersSql'), [
    { id: 9, name: 'Ngô Bảo Ngọc', email: 'ngoc.ngo@gmail.com' },
    { id: 10, name: 'Đặng Hải Yến', email: 'yen.dang@gmail.com' },
  ]);
});
