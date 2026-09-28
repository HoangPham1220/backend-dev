import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { available, reserve, confirm, release, expireReservations } from './exercise.js';

const MIN = 60_000;

function freshDb() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE products (sku TEXT PRIMARY KEY, stock INTEGER NOT NULL CHECK (stock >= 0));
    CREATE TABLE reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT, sku TEXT NOT NULL REFERENCES products (sku),
      cart_id TEXT NOT NULL, qty INTEGER NOT NULL CHECK (qty > 0), expires_at INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'confirmed', 'released', 'expired'))
    );
    INSERT INTO products VALUES ('AO-001', 10), ('LAST-1', 1);
  `);
  return db;
}

const stockOf = (db, sku) => db.prepare('SELECT stock FROM products WHERE sku = ?').get(sku).stock;
const statusOf = (db, id) => db.prepare('SELECT status FROM reservations WHERE id = ?').get(id).status;

test('reserve: giữ hàng, available giảm, stock thật chưa đổi', () => {
  const db = freshDb();
  const r = reserve(db, { sku: 'AO-001', qty: 3, cartId: 'cart-A', now: 0, ttlMs: 15 * MIN });
  assert.deepEqual(r, { id: 1, sku: 'AO-001', qty: 3, expiresAt: 15 * MIN });
  assert.equal(available(db, 'AO-001', 0), 7);
  assert.equal(stockOf(db, 'AO-001'), 10, 'chưa thanh toán thì chưa trừ kho thật');
  assert.equal(available(db, 'KHONG-CO', 0), 0);
  assert.equal(reserve(db, { sku: 'AO-001', qty: 1, cartId: 'cart-B', now: 0 }).expiresAt, 900_000, 'ttl mặc định 15 phút');
});

test('hai giỏ tranh sản phẩm cuối cùng: chỉ một giỏ giữ được', () => {
  const db = freshDb();
  reserve(db, { sku: 'LAST-1', qty: 1, cartId: 'cart-A', now: 0 });
  assert.throws(() => reserve(db, { sku: 'LAST-1', qty: 1, cartId: 'cart-B', now: 1000 }), { message: 'Không đủ hàng: LAST-1' });
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM reservations').get().n, 1);
  assert.equal(db.isTransaction, false);
});

test('reservation hết hạn được coi như không tồn tại ngay, không cần chờ job dọn', () => {
  const db = freshDb();
  reserve(db, { sku: 'LAST-1', qty: 1, cartId: 'cart-A', now: 0, ttlMs: 10 * MIN });
  assert.equal(available(db, 'LAST-1', 10 * MIN - 1), 0);
  assert.equal(available(db, 'LAST-1', 10 * MIN), 1, 'đúng mốc expires_at là hết hạn');
  const b = reserve(db, { sku: 'LAST-1', qty: 1, cartId: 'cart-B', now: 10 * MIN });
  assert.equal(b.id, 2, 'giỏ B giữ được dù reservation của A vẫn đang status active trong DB');
});

test('confirm: trừ kho thật; confirm reservation quá hạn bị từ chối', () => {
  const db = freshDb();
  const a = reserve(db, { sku: 'AO-001', qty: 4, cartId: 'cart-A', now: 0, ttlMs: 5 * MIN });
  assert.equal(confirm(db, a.id, 4 * MIN), true);
  assert.equal(stockOf(db, 'AO-001'), 6);
  assert.equal(statusOf(db, a.id), 'confirmed');
  assert.equal(available(db, 'AO-001', 4 * MIN), 6, 'đã confirm thì không còn tính là đang giữ');

  const late = reserve(db, { sku: 'LAST-1', qty: 1, cartId: 'cart-B', now: 0, ttlMs: 5 * MIN });
  assert.throws(() => confirm(db, late.id, 5 * MIN), /không còn hiệu lực/);
  assert.equal(stockOf(db, 'LAST-1'), 1, 'quá hạn thì không được trừ kho');
  assert.throws(() => confirm(db, a.id, 4 * MIN), /không còn hiệu lực/, 'confirm lần hai bị từ chối');
  assert.throws(() => confirm(db, 999, 0), /không còn hiệu lực/);
  assert.equal(stockOf(db, 'AO-001'), 6);
});

test('cùng giỏ giữ lại cùng sku: cập nhật reservation cũ, không tính phần của chính mình', () => {
  const db = freshDb();
  const first = reserve(db, { sku: 'AO-001', qty: 6, cartId: 'cart-A', now: 0, ttlMs: 10 * MIN });
  reserve(db, { sku: 'AO-001', qty: 2, cartId: 'cart-B', now: 0 });
  // Giỏ A đổi số lượng 6 → 8: khả dụng cho A là 10 − 2 (của B) = 8, đủ.
  const updated = reserve(db, { sku: 'AO-001', qty: 8, cartId: 'cart-A', now: 3 * MIN, ttlMs: 10 * MIN });
  assert.deepEqual(updated, { id: first.id, sku: 'AO-001', qty: 8, expiresAt: 13 * MIN });
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM reservations WHERE cart_id = 'cart-A'").get().n, 1);
  assert.equal(available(db, 'AO-001', 3 * MIN), 0);
  assert.throws(() => reserve(db, { sku: 'AO-001', qty: 9, cartId: 'cart-A', now: 3 * MIN }), /Không đủ hàng/);
  assert.equal(available(db, 'AO-001', 3 * MIN), 0, 'thất bại thì giữ nguyên reservation cũ (qty 8)');
});

test('dữ liệu sai: qty không hợp lệ → RangeError; sku không có → Error', () => {
  const db = freshDb();
  for (const qty of [0, -1, 1.5, '2']) {
    assert.throws(() => reserve(db, { sku: 'AO-001', qty, cartId: 'c', now: 0 }), RangeError, `qty = ${qty}`);
  }
  assert.throws(() => reserve(db, { sku: 'MA-LA', qty: 1, cartId: 'c', now: 0 }), /MA-LA/);
});

test('release và expireReservations', () => {
  const db = freshDb();
  const a = reserve(db, { sku: 'AO-001', qty: 2, cartId: 'A', now: 0, ttlMs: 1 * MIN });
  const b = reserve(db, { sku: 'AO-001', qty: 2, cartId: 'B', now: 0, ttlMs: 2 * MIN });
  const c = reserve(db, { sku: 'AO-001', qty: 2, cartId: 'C', now: 0, ttlMs: 5 * MIN });
  assert.equal(release(db, c.id), true);
  assert.equal(release(db, c.id), false, 'release lần hai không làm gì');
  assert.equal(statusOf(db, c.id), 'released');
  assert.equal(expireReservations(db, 2 * MIN), 2);
  assert.equal(statusOf(db, a.id), 'expired');
  assert.equal(statusOf(db, b.id), 'expired');
  assert.equal(statusOf(db, c.id), 'released', 'đã release thì không bị đổi thành expired');
  assert.equal(expireReservations(db, 2 * MIN), 0);
  assert.equal(release(db, a.id), false, 'expired thì không release được');
  assert.equal(available(db, 'AO-001', 2 * MIN), 10);
});
