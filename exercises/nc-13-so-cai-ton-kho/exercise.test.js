import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { recordMovement, getStock, createSnapshot, reconcile, history } from './exercise.js';

function freshDb() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT, sku TEXT NOT NULL,
      delta INTEGER NOT NULL CHECK (delta <> 0),
      reason TEXT NOT NULL CHECK (reason IN ('receive', 'sale', 'return', 'adjustment')),
      ref TEXT, created_at INTEGER NOT NULL
    );
    CREATE TABLE stock_snapshots (
      sku TEXT NOT NULL, qty INTEGER NOT NULL, at INTEGER NOT NULL,
      last_movement_id INTEGER NOT NULL, PRIMARY KEY (sku, at)
    );
  `);
  return db;
}

const countMovements = (db) => db.prepare('SELECT COUNT(*) AS n FROM stock_movements').get().n;

// AO-001: t=100 nhập 50, t=200 bán 3, t=300 trả 1, t=400 bán 10 → 38
function seed(db) {
  recordMovement(db, { sku: 'AO-001', delta: 50, reason: 'receive', ref: 'PO-1', now: 100 });
  recordMovement(db, { sku: 'AO-001', delta: -3, reason: 'sale', ref: 'ORDER-1', now: 200 });
  recordMovement(db, { sku: 'AO-001', delta: 1, reason: 'return', ref: 'RMA-1', now: 300 });
  recordMovement(db, { sku: 'AO-001', delta: -10, reason: 'sale', ref: 'ORDER-2', now: 400 });
  recordMovement(db, { sku: 'QU-002', delta: 7, reason: 'receive', ref: 'PO-1', now: 150 });
}

test('recordMovement + getStock: tồn = tổng delta, tách theo sku', () => {
  const db = freshDb();
  seed(db);
  assert.equal(getStock(db, 'AO-001'), 38);
  assert.equal(getStock(db, 'QU-002'), 7);
  assert.equal(getStock(db, 'KHONG-CO'), 0);
  assert.equal(typeof recordMovement(db, { sku: 'X', delta: 1, reason: 'receive', now: 500 }), 'number', 'trả id dạng number');
});

test('getStock tại một thời điểm trong quá khứ', () => {
  const db = freshDb();
  seed(db);
  assert.equal(getStock(db, 'AO-001', { at: 99 }), 0);
  assert.equal(getStock(db, 'AO-001', { at: 200 }), 47, 'tính cả movement đúng tại thời điểm at');
  assert.equal(getStock(db, 'AO-001', { at: 350 }), 48);
});

test('recordMovement: dữ liệu sai → RangeError; tồn âm → lỗi, không ghi gì', () => {
  const db = freshDb();
  seed(db);
  const before = countMovements(db);
  assert.throws(() => recordMovement(db, { sku: 'AO-001', delta: 0, reason: 'sale', now: 500 }), RangeError);
  assert.throws(() => recordMovement(db, { sku: 'AO-001', delta: 1.5, reason: 'receive', now: 500 }), RangeError);
  assert.throws(() => recordMovement(db, { sku: 'AO-001', delta: -1, reason: 'stolen', now: 500 }), RangeError);
  assert.throws(
    () => recordMovement(db, { sku: 'AO-001', delta: -39, reason: 'sale', ref: 'ORDER-3', now: 500 }),
    { message: 'Không đủ hàng: AO-001' },
  );
  assert.equal(countMovements(db), before);
  assert.equal(db.isTransaction, false, 'không để transaction treo khi lỗi');
  recordMovement(db, { sku: 'AO-001', delta: -38, reason: 'sale', ref: 'ORDER-3', now: 500 });
  assert.equal(getStock(db, 'AO-001'), 0, 'bán đúng hết tồn thì được');
});

test('recordMovement: cùng sku + reason + ref → không ghi trùng, trả id cũ', () => {
  const db = freshDb();
  seed(db);
  const first = recordMovement(db, { sku: 'AO-001', delta: -2, reason: 'sale', ref: 'ORDER-9', now: 500 });
  const replay = recordMovement(db, { sku: 'AO-001', delta: -2, reason: 'sale', ref: 'ORDER-9', now: 600 });
  assert.equal(replay, first);
  assert.equal(getStock(db, 'AO-001'), 36, 'webhook gửi lại không được trừ kho lần hai');
  recordMovement(db, { sku: 'AO-001', delta: 2, reason: 'return', ref: 'ORDER-9', now: 700 });
  assert.equal(getStock(db, 'AO-001'), 38, 'khác reason thì là movement khác');
  recordMovement(db, { sku: 'AO-001', delta: 1, reason: 'adjustment', now: 800 });
  recordMovement(db, { sku: 'AO-001', delta: 1, reason: 'adjustment', now: 900 });
  assert.equal(getStock(db, 'AO-001'), 40, 'ref null thì không chống trùng');
});

test('snapshot: kết quả giống tính từ đầu, và thật sự được dùng', () => {
  const db = freshDb();
  seed(db);
  const snap = createSnapshot(db, 'AO-001', 450);
  assert.deepEqual(snap, { sku: 'AO-001', qty: 38, at: 450, lastMovementId: 4 });
  recordMovement(db, { sku: 'AO-001', delta: -5, reason: 'sale', ref: 'ORDER-5', now: 500 });

  // Lưu trữ movement cũ: nếu getStock không dùng snapshot thì kết quả sẽ sai.
  db.exec("DELETE FROM stock_movements WHERE sku = 'AO-001' AND id <= 4");
  assert.equal(getStock(db, 'AO-001'), 33, 'snapshot 38 + movement sau đó −5');
  assert.equal(getStock(db, 'AO-001', { at: 460 }), 38);
  assert.equal(getStock(db, 'QU-002'), 7, 'snapshot của AO-001 không ảnh hưởng sku khác');
});

test('snapshot mới hơn thời điểm hỏi thì không được dùng', () => {
  const db = freshDb();
  // Ghi theo đúng trình tự thời gian, chụp snapshot xen giữa như một job định kỳ.
  recordMovement(db, { sku: 'AO-001', delta: 50, reason: 'receive', ref: 'PO-1', now: 100 });
  recordMovement(db, { sku: 'AO-001', delta: -3, reason: 'sale', ref: 'ORDER-1', now: 200 });
  createSnapshot(db, 'AO-001', 250); // 47
  recordMovement(db, { sku: 'AO-001', delta: 1, reason: 'return', ref: 'RMA-1', now: 300 });
  recordMovement(db, { sku: 'AO-001', delta: -10, reason: 'sale', ref: 'ORDER-2', now: 400 });
  createSnapshot(db, 'AO-001', 450); // 38
  recordMovement(db, { sku: 'AO-001', delta: -8, reason: 'sale', ref: 'ORDER-3', now: 500 });

  assert.equal(getStock(db, 'AO-001', { at: 150 }), 50, 'hỏi t=150: không dùng snapshot t=250 hay t=450');
  assert.equal(getStock(db, 'AO-001', { at: 300 }), 48, 'hỏi t=300: snapshot t=250 (47) + movement t=300 (+1)');
  assert.equal(getStock(db, 'AO-001', { at: 450 }), 38);
  assert.equal(getStock(db, 'AO-001'), 30);
});

test('reconcile: lệch thì ghi adjustment, không lệch thì không ghi', () => {
  const db = freshDb();
  seed(db);
  const adj = reconcile(db, 'AO-001', 35, { ref: 'KIEMKE-11', now: 500 });
  assert.deepEqual({ delta: adj?.delta, idType: typeof adj?.id }, { delta: -3, idType: 'number' });
  assert.equal(getStock(db, 'AO-001'), 35);
  const before = countMovements(db);
  assert.equal(reconcile(db, 'AO-001', 35, { ref: 'KIEMKE-12', now: 600 }), null);
  assert.equal(countMovements(db), before);
  assert.throws(() => reconcile(db, 'AO-001', -1, { ref: 'X', now: 700 }), RangeError);
  assert.equal(reconcile(db, 'MOI', 4, { ref: 'KIEMKE-13', now: 700 }).delta, 4, 'sku chưa có movement nào');
});

test('history: có số dư chạy theo từng dòng', () => {
  const db = freshDb();
  seed(db);
  assert.deepEqual(history(db, 'AO-001'), [
    { id: 1, delta: 50, reason: 'receive', ref: 'PO-1', balance: 50 },
    { id: 2, delta: -3, reason: 'sale', ref: 'ORDER-1', balance: 47 },
    { id: 3, delta: 1, reason: 'return', ref: 'RMA-1', balance: 48 },
    { id: 4, delta: -10, reason: 'sale', ref: 'ORDER-2', balance: 38 },
  ]);
  assert.deepEqual(history(db, 'KHONG-CO'), []);
});
