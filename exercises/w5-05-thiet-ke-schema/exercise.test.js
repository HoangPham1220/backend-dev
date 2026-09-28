import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { schemaSql } from './exercise.js';

// DB mới: bật khoá ngoại, tạo sẵn customers, chạy schema của người học, kiểm tra đủ 3 bảng.
function freshDb() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(`
    CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE);
    INSERT INTO customers (id, name, email) VALUES (1, 'Nguyễn Văn An', 'an@example.com');
  `);
  db.exec(schemaSql ?? '');
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all()
    .map((row) => row.name);
  for (const table of ['products', 'orders', 'order_items']) {
    assert.ok(tables.includes(table), `chưa có bảng ${table}`);
  }
  return db;
}

// Dữ liệu hợp lệ tối thiểu: product #1, order #1.
function seededDb() {
  const db = freshDb();
  db.exec("INSERT INTO products (id, sku, name, price, stock) VALUES (1, 'AO-001', 'Áo thun', 150000, 10)");
  db.exec('INSERT INTO orders (id, customer_id) VALUES (1, 1)');
  return db;
}

const run = (db, sql) => () => db.exec(sql);

test('dữ liệu hợp lệ được chèn thành công, giá trị mặc định đúng', () => {
  const db = seededDb();
  db.exec("INSERT INTO products (sku, name, price) VALUES ('QU-001', 'Quần jean', 450000)");
  db.exec('INSERT INTO order_items (order_id, product_id, price, quantity) VALUES (1, 1, 150000, 2)');

  const product = db.prepare("SELECT stock FROM products WHERE sku = 'QU-001'").get();
  assert.equal(product.stock, 0, 'stock mặc định là 0');

  const order = db.prepare('SELECT status, created_at FROM orders WHERE id = 1').get();
  assert.equal(order.status, 'pending', "status mặc định là 'pending'");
  assert.ok(order.created_at, 'created_at phải tự có giá trị (DEFAULT CURRENT_TIMESTAMP)');

  const inserted = db.prepare("INSERT INTO products (sku, name, price) VALUES ('QU-002', 'Quần kaki', 380000)").run();
  assert.ok(inserted.lastInsertRowid > 2, 'id phải tự tăng');
});

test('products: sku bắt buộc và không trùng', () => {
  const db = seededDb();
  assert.throws(run(db, "INSERT INTO products (sku, name, price) VALUES ('AO-001', 'Trùng sku', 1000)"), /UNIQUE/, 'sku trùng phải bị chặn');
  assert.throws(run(db, "INSERT INTO products (sku, name, price) VALUES (NULL, 'Không sku', 1000)"), /NOT NULL/, 'sku NULL phải bị chặn');
  assert.throws(run(db, "INSERT INTO products (sku, name, price) VALUES ('X-1', NULL, 1000)"), /NOT NULL/, 'name NULL phải bị chặn');
});

test('products: giá và tồn kho không âm', () => {
  const db = seededDb();
  assert.throws(run(db, "INSERT INTO products (sku, name, price) VALUES ('X-1', 'Giá âm', -1)"), /CHECK/, 'price < 0 phải bị chặn');
  assert.throws(run(db, "INSERT INTO products (sku, name, price) VALUES ('X-2', 'Thiếu giá', NULL)"), /NOT NULL/, 'price NULL phải bị chặn');
  assert.throws(run(db, 'UPDATE products SET stock = -1 WHERE id = 1'), /CHECK/, 'stock < 0 phải bị chặn, kể cả khi UPDATE');
  db.exec("INSERT INTO products (sku, name, price) VALUES ('X-3', 'Quà tặng', 0)");
});

test('orders: khoá ngoại tới customers', () => {
  const db = seededDb();
  assert.throws(run(db, 'INSERT INTO orders (customer_id) VALUES (999)'), /FOREIGN KEY/, 'khách #999 không tồn tại: phải bị chặn');
  assert.throws(run(db, 'INSERT INTO orders (customer_id) VALUES (NULL)'), /NOT NULL/, 'đơn phải có khách');
});

test('orders: status chỉ nhận 4 giá trị', () => {
  const db = seededDb();
  for (const status of ['paid', 'shipped', 'cancelled']) {
    db.exec(`INSERT INTO orders (customer_id, status) VALUES (1, '${status}')`);
  }
  assert.throws(run(db, "INSERT INTO orders (customer_id, status) VALUES (1, 'refunded')"), /CHECK/, "status 'refunded' không hợp lệ");
  assert.throws(run(db, "INSERT INTO orders (customer_id, status) VALUES (1, 'PAID')"), /CHECK/, 'phân biệt hoa thường');
});

test('order_items: khoá ngoại tới orders và products', () => {
  const db = seededDb();
  assert.throws(run(db, 'INSERT INTO order_items (order_id, product_id, price, quantity) VALUES (999, 1, 1000, 1)'), /FOREIGN KEY/, 'đơn #999 không tồn tại');
  assert.throws(run(db, 'INSERT INTO order_items (order_id, product_id, price, quantity) VALUES (1, 999, 1000, 1)'), /FOREIGN KEY/, 'sản phẩm #999 không tồn tại');
});

test('order_items: quantity > 0, price >= 0, không trùng sản phẩm trong một đơn', () => {
  const db = seededDb();
  assert.throws(run(db, 'INSERT INTO order_items (order_id, product_id, price, quantity) VALUES (1, 1, 150000, 0)'), /CHECK/, 'quantity = 0 phải bị chặn');
  assert.throws(run(db, 'INSERT INTO order_items (order_id, product_id, price, quantity) VALUES (1, 1, -5, 1)'), /CHECK/, 'price < 0 phải bị chặn');
  db.exec('INSERT INTO order_items (order_id, product_id, price, quantity) VALUES (1, 1, 150000, 1)');
  assert.throws(run(db, 'INSERT INTO order_items (order_id, product_id, price, quantity) VALUES (1, 1, 150000, 3)'), /UNIQUE/, 'cùng sản phẩm hai lần trong một đơn: phải cộng quantity chứ không thêm dòng');
});

test('không xoá được sản phẩm đang nằm trong đơn hàng', () => {
  const db = seededDb();
  db.exec('INSERT INTO order_items (order_id, product_id, price, quantity) VALUES (1, 1, 150000, 1)');
  assert.throws(run(db, 'DELETE FROM products WHERE id = 1'), /FOREIGN KEY/, 'khoá ngoại phải chặn xoá bảng cha khi bảng con còn tham chiếu');
});
