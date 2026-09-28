import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { findCustomerByEmail, searchProducts, countOrdersByStatus } from './exercise.js';

const SEED = readFileSync(new URL('./seed.sql', import.meta.url), 'utf8');

function freshDb() {
  const db = new DatabaseSync(':memory:');
  db.exec(SEED);
  db.exec(`
    INSERT INTO customers (id, name, email, city, created_at)
      VALUES (11, 'Olivia O''Neil', 'o''neil@example.com', 'Đà Nẵng', '2026-07-01 10:00:00');
    INSERT INTO products (id, sku, name, category_id, price, stock, status)
      VALUES (19, 'KM-001', 'Voucher giảm 10% đơn sau', 4, 0, 100, 'active');
  `);
  return db;
}

const plain = (row) => (row == null ? row : { ...row });
const plainAll = (rows) => (Array.isArray(rows) ? rows.map((row) => ({ ...row })) : rows);
const customerCount = (db) => db.prepare('SELECT COUNT(*) AS n FROM customers').get().n;

test('findCustomerByEmail: tìm thấy và không tìm thấy', () => {
  const db = freshDb();
  assert.deepEqual(plain(findCustomerByEmail(db, 'binh.tran@example.com')), {
    id: 2, name: 'Trần Thị Bình', email: 'binh.tran@example.com', city: 'TP HCM',
  });
  assert.equal(findCustomerByEmail(db, 'khong-co@example.com'), null, 'không có thì trả null (không phải undefined)');
});

test('findCustomerByEmail: email hợp lệ có dấu nháy đơn', () => {
  const db = freshDb();
  assert.deepEqual(plain(findCustomerByEmail(db, "o'neil@example.com")), {
    id: 11, name: "Olivia O'Neil", email: "o'neil@example.com", city: 'Đà Nẵng',
  }, 'ghép chuỗi sẽ làm câu SQL lỗi cú pháp với dấu nháy này');
});

test('findCustomerByEmail: chống SQL injection', () => {
  const db = freshDb();
  for (const attack of ["' OR '1'='1", "x' OR 1=1 --", "' UNION SELECT 1, 'hacker', 'x', 'y' --"]) {
    let result;
    try {
      result = findCustomerByEmail(db, attack);
    } catch (error) {
      assert.fail(`input "${attack}" làm câu SQL lỗi (${error.message}): dấu hiệu đang ghép chuỗi`);
    }
    assert.equal(result, null, `input "${attack}" không được trả về dữ liệu`);
  }
  let dropResult;
  try {
    dropResult = findCustomerByEmail(db, "x'; DROP TABLE customers; --");
  } catch (error) {
    assert.fail(`input có "; DROP TABLE" làm lỗi (${error.message}): dấu hiệu đang ghép chuỗi`);
  }
  assert.equal(dropResult, null);
  assert.equal(customerCount(db), 11, 'bảng customers phải còn nguyên');
});

test('searchProducts: tìm theo tên, chỉ sản phẩm active, sắp theo sku', () => {
  const db = freshDb();
  assert.deepEqual(plainAll(searchProducts(db, 'jean')), [
    { sku: 'QU-001', name: 'Quần jean slim', price: 450000 },
  ]);
  assert.deepEqual(plainAll(searchProducts(db, 'Giày')), [
    { sku: 'GI-001', name: 'Giày sneaker trắng', price: 890000 },
    { sku: 'GI-002', name: 'Giày chạy bộ', price: 1250000 },
  ], 'GI-004 "Giày da công sở" đang disabled nên không được có');
  assert.deepEqual(plainAll(searchProducts(db, 'không có sản phẩm này')), []);
});

test('searchProducts: chống SQL injection', () => {
  const db = freshDb();
  let result;
  try {
    result = searchProducts(db, "' OR 1=1 --");
  } catch (error) {
    assert.fail(`keyword chứa dấu nháy làm câu SQL lỗi (${error.message}): dấu hiệu đang ghép chuỗi`);
  }
  assert.deepEqual(plainAll(result), [], 'keyword tấn công phải được hiểu là chuỗi thường, không khớp sản phẩm nào');
});

test('searchProducts (nâng cao): % và _ là ký tự thường, không phải wildcard', () => {
  const db = freshDb();
  const voucher = [{ sku: 'KM-001', name: 'Voucher giảm 10% đơn sau', price: 0 }];
  assert.deepEqual(plainAll(searchProducts(db, '%')), voucher, '"%" chỉ khớp sản phẩm có dấu % trong tên, không phải tất cả');
  assert.deepEqual(plainAll(searchProducts(db, '10%')), voucher);
  assert.deepEqual(plainAll(searchProducts(db, '_')), [], 'không tên sản phẩm nào có dấu _');
});

test('countOrdersByStatus: số lượng status bất kỳ', () => {
  const db = freshDb();
  assert.equal(countOrdersByStatus(db, ['paid']), 4);
  assert.equal(countOrdersByStatus(db, ['paid', 'shipped']), 11);
  assert.equal(countOrdersByStatus(db, ['pending', 'cancelled', 'paid']), 8);
  assert.equal(countOrdersByStatus(db, []), 0, 'mảng rỗng → 0 (IN () là cú pháp sai, phải xử lý trước)');
});

test('countOrdersByStatus: chống SQL injection', () => {
  const db = freshDb();
  let result;
  try {
    result = countOrdersByStatus(db, ["paid') OR ('1'='1"]);
  } catch (error) {
    assert.fail(`status chứa dấu nháy làm câu SQL lỗi (${error.message}): dấu hiệu đang ghép chuỗi`);
  }
  assert.equal(result, 0);
});
