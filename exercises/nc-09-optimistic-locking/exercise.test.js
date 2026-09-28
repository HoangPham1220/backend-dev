import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { ConflictError, getProduct, updateProductPrice, withRetryOnConflict } from './exercise.js';

function freshDb() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE products (
      id      INTEGER PRIMARY KEY,
      sku     TEXT NOT NULL UNIQUE,
      price   INTEGER NOT NULL CHECK (price >= 0),
      version INTEGER NOT NULL DEFAULT 1
    );
    INSERT INTO products (id, sku, price) VALUES (1, 'AO-001', 100000), (2, 'QU-002', 250000);
  `);
  return db;
}

const raw = (db, id) => ({ ...db.prepare('SELECT * FROM products WHERE id = ?').get(id) });

test('getProduct: trả object thường, không có thì null', () => {
  const db = freshDb();
  const product = getProduct(db, 1);
  assert.deepEqual(product, { id: 1, sku: 'AO-001', price: 100000, version: 1 });
  assert.equal(Object.getPrototypeOf(product), Object.prototype, 'trả object thường, không phải row prototype null');
  assert.equal(getProduct(db, 999), null);
});

test('updateProductPrice: đúng version thì cập nhật và tăng version', () => {
  const db = freshDb();
  const updated = updateProductPrice(db, { id: 1, price: 120000, expectedVersion: 1 });
  assert.deepEqual(updated, { id: 1, sku: 'AO-001', price: 120000, version: 2 });
  assert.deepEqual(raw(db, 1), { id: 1, sku: 'AO-001', price: 120000, version: 2 });
  assert.deepEqual(raw(db, 2).version, 1, 'không được đụng tới sản phẩm khác');
});

test('updateProductPrice: version lệch → ConflictError kèm currentVersion, DB không đổi', () => {
  const db = freshDb();
  updateProductPrice(db, { id: 1, price: 120000, expectedVersion: 1 }); // admin A lưu trước
  assert.throws(
    () => updateProductPrice(db, { id: 1, price: 90000, expectedVersion: 1 }), // admin B dùng version cũ
    (error) => error instanceof ConflictError && error.currentVersion === 2,
    'admin B phải nhận ConflictError với currentVersion = 2',
  );
  assert.deepEqual(raw(db, 1), { id: 1, sku: 'AO-001', price: 120000, version: 2 }, 'giá của admin A phải còn nguyên');
});

test('updateProductPrice: sản phẩm không tồn tại → Error thường, không phải ConflictError', () => {
  const db = freshDb();
  assert.throws(
    () => updateProductPrice(db, { id: 404, price: 1000, expectedVersion: 1 }),
    (error) => error instanceof Error && !(error instanceof ConflictError) && error.message.includes('404'),
    'phải phân biệt "không tồn tại" với "xung đột", message chứa id',
  );
});

test('updateProductPrice: giá không hợp lệ → RangeError, không đụng DB', () => {
  const db = freshDb();
  for (const price of [-1, 10.5, '1000', NaN]) {
    assert.throws(() => updateProductPrice(db, { id: 1, price, expectedVersion: 1 }), RangeError, `price = ${price}`);
  }
  assert.deepEqual(raw(db, 1), { id: 1, sku: 'AO-001', price: 100000, version: 1 });
});

test('updateProductPrice: dùng một câu UPDATE có điều kiện version (chạy được khi version đổi giữa chừng)', () => {
  const db = freshDb();
  // Mô phỏng một tiến trình khác vừa ghi: version trong DB đã là 5.
  db.exec('UPDATE products SET version = 5 WHERE id = 1');
  assert.throws(
    () => updateProductPrice(db, { id: 1, price: 1, expectedVersion: 4 }),
    (error) => error instanceof ConflictError && error.currentVersion === 5,
  );
  assert.equal(updateProductPrice(db, { id: 1, price: 1, expectedVersion: 5 }).version, 6);
});

test('withRetryOnConflict: xung đột thì đọc lại và thử lại, không mất cập nhật', async () => {
  const db = freshDb();
  let attempts = 0;
  const result = await withRetryOnConflict((attempt) => {
    attempts += 1;
    assert.equal(attempt, attempts, 'attempt truyền vào bắt đầu từ 1 và tăng dần');
    const product = getProduct(db, 1);
    if (attempt === 1) {
      // Người khác chen vào giữa lúc "đọc" và "ghi": tăng giá thêm 5000.
      db.exec('UPDATE products SET price = price + 5000, version = version + 1 WHERE id = 1');
    }
    return updateProductPrice(db, { id: 1, price: product.price + 1000, expectedVersion: product.version });
  });
  assert.equal(attempts, 2, 'lần 1 xung đột, lần 2 thành công');
  assert.equal(result.price, 106000, 'phải tính trên giá mới (105000) chứ không phải giá cũ, không mất 5000 của người kia');
  assert.equal(result.version, 3);
});

test('withRetryOnConflict: hết lượt thì throw ConflictError, gọi đúng 1 + retries lần', async () => {
  let calls = 0;
  const promise = withRetryOnConflict(
    () => {
      calls += 1;
      throw new ConflictError('luôn xung đột', calls);
    },
    { retries: 2 },
  );
  assert.ok(promise instanceof Promise, 'withRetryOnConflict phải là hàm async');
  await assert.rejects(promise, (error) => error instanceof ConflictError && error.currentVersion === 3, 'throw lỗi của lần cuối');
  assert.equal(calls, 3);
});

test('withRetryOnConflict: lỗi khác thì throw ngay, không thử lại; fn async cũng chạy được', async () => {
  let calls = 0;
  const promise = withRetryOnConflict(async () => {
    calls += 1;
    throw new TypeError('lỗi dữ liệu');
  });
  assert.ok(promise instanceof Promise, 'withRetryOnConflict phải là hàm async');
  await assert.rejects(promise, TypeError);
  assert.equal(calls, 1, 'lỗi không phải xung đột thì thử lại cũng vô ích');

  const value = await withRetryOnConflict(async () => 'ok');
  assert.equal(value, 'ok');
});
