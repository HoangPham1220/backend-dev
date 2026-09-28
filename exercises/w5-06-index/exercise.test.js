import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { indexSql } from './exercise.js';

const SEED = readFileSync(new URL('./seed.sql', import.meta.url), 'utf8');

const QUERIES = {
  Q1: { sql: 'SELECT id, status, created_at FROM orders WHERE customer_id = ? ORDER BY created_at DESC', table: 'orders' },
  Q2: { sql: 'SELECT order_id, quantity FROM order_items WHERE product_id = ?', table: 'order_items' },
  Q3: { sql: 'SELECT id, name FROM customers WHERE city = ?', table: 'customers' },
};

function dbWithIndexes() {
  const db = new DatabaseSync(':memory:');
  db.exec(SEED);
  db.exec(indexSql ?? '');
  return db;
}

// Danh sách bước trong plan, ví dụ ['SEARCH orders USING INDEX idx (customer_id=?)'].
function plan(db, sql) {
  return db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all(1).map((row) => row.detail);
}

function userIndexes(db) {
  // Index tự động (từ UNIQUE/PRIMARY KEY) có sql = NULL.
  return db.prepare("SELECT name, tbl_name FROM sqlite_master WHERE type = 'index' AND sql IS NOT NULL").all();
}

for (const [name, { sql, table }] of Object.entries(QUERIES)) {
  test(`${name} dùng index, không quét cả bảng ${table}`, () => {
    const steps = plan(dbWithIndexes(), sql);
    const shown = `plan thực tế: ${JSON.stringify(steps)}`;
    assert.ok(!steps.some((step) => step === `SCAN ${table}`), `vẫn đang SCAN cả bảng ${table}. ${shown}`);
    assert.ok(steps.some((step) => /USING (COVERING )?INDEX/.test(step)), `chưa dùng index. ${shown}`);
  });
}

test('Q1: index phục vụ cả ORDER BY, không cần sắp xếp tạm', () => {
  const steps = plan(dbWithIndexes(), QUERIES.Q1.sql);
  assert.ok(steps.some((step) => /USING (COVERING )?INDEX/.test(step)), `Q1 chưa dùng index. plan: ${JSON.stringify(steps)}`);
  assert.ok(
    !steps.some((step) => step.includes('TEMP B-TREE')),
    `Q1 vẫn phải sắp xếp tạm (TEMP B-TREE): index cần gồm cả cột dùng để sắp xếp. plan: ${JSON.stringify(steps)}`,
  );
});

test('không tạo index thừa', () => {
  const indexes = userIndexes(dbWithIndexes());
  assert.ok(indexes.length > 0, 'chưa tạo index nào');
  assert.ok(indexes.length <= 3, `tối đa 3 index, đang có ${indexes.length}: ${indexes.map((i) => i.name).join(', ')}`);
  assert.ok(
    !indexes.some((index) => index.tbl_name === 'products'),
    'không cần index trên products: sku UNIQUE đã có index tự động',
  );
});

test('index không làm sai kết quả truy vấn', () => {
  const db = dbWithIndexes();
  assert.ok(userIndexes(db).length > 0, 'chưa tạo index nào');
  const rows = db.prepare(QUERIES.Q1.sql).all(1).map((row) => row.id);
  assert.deepEqual(rows, [11, 4, 1], 'khách #1: đơn mới nhất trước');
});
