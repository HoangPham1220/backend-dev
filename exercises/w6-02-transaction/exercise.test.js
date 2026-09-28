import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { placeOrder } from './exercise.js';

const SEED = readFileSync(new URL('./seed.sql', import.meta.url), 'utf8');

function freshDb() {
  const db = new DatabaseSync(':memory:');
  db.exec(SEED);
  return db;
}

const stockOf = (db, sku) => db.prepare('SELECT stock FROM products WHERE sku = ?').get(sku).stock;
const count = (db, table) => db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;

// Chụp trạng thái để so sánh "không có gì thay đổi" sau khi lỗi.
function snapshot(db) {
  return {
    stock: db.prepare('SELECT sku, stock FROM products ORDER BY sku').all().map((row) => ({ ...row })),
    orders: count(db, 'orders'),
    orderItems: count(db, 'order_items'),
  };
}

test('đặt hàng thành công: trừ tồn kho, tạo order và order_items', () => {
  const db = freshDb();
  const result = placeOrder(db, {
    customerId: 7,
    items: [{ sku: 'AO-001', quantity: 2 }, { sku: 'PK-003', quantity: 5 }],
  });

  assert.deepEqual(result, { orderId: 16, total: 750000 }, 'total = 150000×2 + 90000×5');
  assert.equal(stockOf(db, 'AO-001'), 38);
  assert.equal(stockOf(db, 'PK-003'), 55);

  const order = db.prepare('SELECT customer_id, status, created_at FROM orders WHERE id = 16').get();
  assert.equal(order.customer_id, 7);
  assert.equal(order.status, 'pending');
  assert.ok(order.created_at, 'created_at phải có giá trị');

  const items = db
    .prepare('SELECT product_id, price, quantity FROM order_items WHERE order_id = 16 ORDER BY id')
    .all()
    .map((row) => ({ ...row }));
  assert.deepEqual(items, [
    { product_id: 1, price: 150000, quantity: 2 },
    { product_id: 16, price: 90000, quantity: 5 },
  ]);
});

test('lấy đúng hết tồn kho còn lại (stock >= quantity)', () => {
  const db = freshDb();
  placeOrder(db, { customerId: 1, items: [{ sku: 'GI-002', quantity: 4 }] });
  assert.equal(stockOf(db, 'GI-002'), 0, 'GI-002 có 4, mua 4 phải được');
});

test('item thứ hai thiếu hàng: rollback toàn bộ, item đầu không bị trừ', () => {
  const db = freshDb();
  const before = snapshot(db);
  assert.throws(
    () => placeOrder(db, { customerId: 1, items: [{ sku: 'AO-001', quantity: 2 }, { sku: 'GI-002', quantity: 5 }] }),
    { message: 'Không đủ hàng: GI-002' },
  );
  assert.deepEqual(snapshot(db), before, 'tồn kho AO-001, số order, số order_items phải y như trước');
  assert.equal(db.isTransaction, false, 'sau lỗi không được kẹt trong transaction (quên ROLLBACK?)');
});

test('sản phẩm hết hàng', () => {
  const db = freshDb();
  assert.throws(() => placeOrder(db, { customerId: 1, items: [{ sku: 'AO-002', quantity: 1 }] }), { message: 'Không đủ hàng: AO-002' });
});

test('sku không tồn tại hoặc sản phẩm disabled', () => {
  const db = freshDb();
  const before = snapshot(db);
  assert.throws(
    () => placeOrder(db, { customerId: 1, items: [{ sku: 'AO-001', quantity: 1 }, { sku: 'XX-999', quantity: 1 }] }),
    { message: 'Không tìm thấy sản phẩm: XX-999' },
  );
  assert.throws(() => placeOrder(db, { customerId: 1, items: [{ sku: 'AO-005', quantity: 1 }] }), { message: 'Không tìm thấy sản phẩm: AO-005' }, 'AO-005 đang disabled');
  assert.deepEqual(snapshot(db), before);
  assert.equal(db.isTransaction, false);
});

test('khách không tồn tại: lỗi khoá ngoại cũng phải rollback', () => {
  const db = freshDb();
  const before = snapshot(db);
  assert.throws(() => placeOrder(db, { customerId: 999, items: [{ sku: 'AO-001', quantity: 1 }] }), /FOREIGN KEY/);
  assert.deepEqual(snapshot(db), before, 'tồn kho không được bị trừ');
  assert.equal(db.isTransaction, false);
});

test('đầu vào sai bị chặn trước khi đụng DB', () => {
  const db = freshDb();
  const before = snapshot(db);
  assert.throws(() => placeOrder(db, { customerId: 1, items: [] }), /ít nhất một sản phẩm/);
  for (const quantity of [0, -1, 1.5, '2']) {
    assert.throws(
      () => placeOrder(db, { customerId: 1, items: [{ sku: 'AO-001', quantity }] }),
      { message: 'Số lượng không hợp lệ: AO-001' },
      `quantity = ${JSON.stringify(quantity)} phải bị chặn`,
    );
  }
  assert.deepEqual(snapshot(db), before);
});

test('sau một lần lỗi, lần đặt tiếp theo vẫn chạy bình thường', () => {
  const db = freshDb();
  placeOrder(db, { customerId: 2, items: [{ sku: 'GI-002', quantity: 3 }] });
  assert.throws(() => placeOrder(db, { customerId: 3, items: [{ sku: 'GI-002', quantity: 2 }] }), { message: 'Không đủ hàng: GI-002' }, 'chỉ còn 1');
  const result = placeOrder(db, { customerId: 3, items: [{ sku: 'GI-002', quantity: 1 }] });
  assert.ok(result.orderId > 16, 'phải tạo được đơn mới');
  assert.equal(stockOf(db, 'GI-002'), 0);
});
