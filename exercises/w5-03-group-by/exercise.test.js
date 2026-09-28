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

test('monthlyRevenueSql: doanh thu, số đơn, số khách theo tháng', () => {
  const rows = query('monthlyRevenueSql');
  assert.deepEqual(Object.keys(rows[0] ?? {}), ['month', 'order_count', 'buyer_count', 'revenue']);
  assert.notEqual(rows[0]?.order_count, 6, 'tháng 06 có 3 đơn nhưng 6 dòng order_items: cần COUNT(DISTINCT ...)');
  assert.deepEqual(rows, [
    { month: '2026-06', order_count: 3, buyer_count: 3, revenue: 2460000 },
    { month: '2026-07', order_count: 3, buyer_count: 3, revenue: 3970000 },
    { month: '2026-08', order_count: 2, buyer_count: 2, revenue: 1640000 },
    { month: '2026-09', order_count: 3, buyer_count: 3, revenue: 2360000 },
  ], 'không tính đơn pending và cancelled (ví dụ tháng 07 có đơn #5 bị huỷ)');
});

test('categoryRevenueSql: doanh thu theo danh mục, giảm dần', () => {
  assert.deepEqual(query('categoryRevenueSql'), [
    { category_name: 'Giày', units_sold: 5, revenue: 4400000 },
    { category_name: 'Áo', units_sold: 10, revenue: 2500000 },
    { category_name: 'Quần', units_sold: 7, revenue: 2340000 },
    { category_name: 'Phụ kiện', units_sold: 10, revenue: 1190000 },
  ]);
});

test('bigSpendersSql: khách chi hơn 1.500.000, dùng HAVING', () => {
  assert.match(answers.bigSpendersSql ?? '', /\bHAVING\b/i, 'bài này yêu cầu lọc bằng HAVING');
  assert.deepEqual(query('bigSpendersSql'), [
    { customer_id: 2, name: 'Trần Thị Bình', total_spent: 2630000 },
    { customer_id: 1, name: 'Nguyễn Văn An', total_spent: 2000000 },
    { customer_id: 6, name: 'Vũ Đức Huy', total_spent: 1790000 },
  ], 'khách #1 có thêm đơn pending 520000: nếu ra 2520000 là chưa lọc status');
});
