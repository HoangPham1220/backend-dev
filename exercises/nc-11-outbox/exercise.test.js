import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { placeOrderWithOutbox, createOutboxRelay } from './exercise.js';

const NOW = () => '2026-11-20T10:00:00.000Z';

function freshDb() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT, customer_email TEXT NOT NULL,
      total INTEGER NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE outbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT, event_type TEXT NOT NULL, payload TEXT NOT NULL,
      created_at TEXT NOT NULL, sent_at TEXT, attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT
    );
  `);
  return db;
}

const all = (db, table) => db.prepare(`SELECT * FROM ${table} ORDER BY id`).all().map((row) => ({ ...row }));
const order = (email, total = 300000) => ({ customerEmail: email, items: [{ sku: 'AO-001', price: total, quantity: 1 }] });

function seedOrders(db, count) {
  for (let i = 1; i <= count; i += 1) placeOrderWithOutbox(db, order(`k${i}@shop.vn`, i * 1000), { now: NOW });
}

test('placeOrderWithOutbox: ghi order và sự kiện order.created', () => {
  const db = freshDb();
  const orderId = placeOrderWithOutbox(
    db,
    { customerEmail: 'an@shop.vn', items: [{ sku: 'AO-001', price: 150000, quantity: 2 }, { sku: 'PK-003', price: 90000, quantity: 1 }] },
    { now: NOW },
  );
  assert.equal(orderId, 1);
  assert.deepEqual(all(db, 'orders'), [{ id: 1, customer_email: 'an@shop.vn', total: 390000, created_at: NOW() }]);
  const [event] = all(db, 'outbox');
  assert.equal(event.event_type, 'order.created');
  assert.deepEqual(JSON.parse(event.payload), { orderId: 1, customerEmail: 'an@shop.vn', total: 390000 });
  assert.equal(event.sent_at, null);
  assert.equal(event.attempts, 0);
});

test('ghi outbox lỗi → rollback, không còn order "mồ côi"', () => {
  const db = freshDb();
  db.exec(`CREATE TRIGGER outbox_down BEFORE INSERT ON outbox WHEN NEW.payload LIKE '%boom%'
           BEGIN SELECT RAISE(ABORT, 'outbox không ghi được'); END;`);
  placeOrderWithOutbox(db, order('ok@shop.vn'), { now: NOW });
  assert.throws(() => placeOrderWithOutbox(db, order('boom@shop.vn'), { now: NOW }), /outbox không ghi được/);
  assert.deepEqual(all(db, 'orders').map((row) => row.customer_email), ['ok@shop.vn'], 'order của boom@ phải bị rollback');
  assert.equal(all(db, 'outbox').length, 1);
  assert.equal(db.isTransaction, false, 'không được để transaction treo');
});

test('items rỗng → lỗi, không ghi gì', () => {
  const db = freshDb();
  assert.throws(() => placeOrderWithOutbox(db, { customerEmail: 'a@b.vn', items: [] }, { now: NOW }));
  assert.equal(all(db, 'orders').length, 0);
  assert.equal(all(db, 'outbox').length, 0);
});

test('relay: gửi theo thứ tự, payload đã parse, đánh dấu sent_at, không gửi lại lần sau', async () => {
  const db = freshDb();
  seedOrders(db, 3);
  const published = [];
  const relay = createOutboxRelay(db, async (event) => { published.push(event); }, { now: () => 'SENT-1' });
  assert.deepEqual(await relay.runOnce(), { sent: 3, failed: 0 });
  assert.deepEqual(published.map((e) => e.id), [1, 2, 3]);
  assert.deepEqual(published[0], { id: 1, type: 'order.created', payload: { orderId: 1, customerEmail: 'k1@shop.vn', total: 1000 } });
  assert.deepEqual(all(db, 'outbox').map((row) => row.sent_at), ['SENT-1', 'SENT-1', 'SENT-1']);
  assert.deepEqual(await relay.runOnce(), { sent: 0, failed: 0 }, 'không gửi trùng sự kiện đã gửi');
  assert.equal(published.length, 3);
});

test('relay: tôn trọng batchSize', async () => {
  const db = freshDb();
  seedOrders(db, 5);
  const published = [];
  const relay = createOutboxRelay(db, async (event) => { published.push(event.id); }, { batchSize: 2, now: NOW });
  assert.deepEqual(await relay.runOnce(), { sent: 2, failed: 0 });
  assert.deepEqual(await relay.runOnce(), { sent: 2, failed: 0 });
  assert.deepEqual(await relay.runOnce(), { sent: 1, failed: 0 });
  assert.deepEqual(published, [1, 2, 3, 4, 5]);
});

test('relay: lỗi giữa batch → dừng để giữ thứ tự, lần sau gửi tiếp, không mất sự kiện', async () => {
  const db = freshDb();
  seedOrders(db, 3);
  const published = [];
  let failNext = true;
  const relay = createOutboxRelay(db, async (event) => {
    if (event.id === 2 && failNext) {
      failNext = false;
      throw new Error('broker timeout');
    }
    published.push(event.id);
  }, { now: NOW });

  assert.deepEqual(await relay.runOnce(), { sent: 1, failed: 1 });
  assert.deepEqual(published, [1], 'sự kiện 3 không được gửi trước sự kiện 2');
  const second = all(db, 'outbox')[1];
  assert.equal(second.sent_at, null);
  assert.equal(second.attempts, 1);
  assert.equal(second.last_error, 'broker timeout');

  assert.deepEqual(await relay.runOnce(), { sent: 2, failed: 0 });
  assert.deepEqual(published, [1, 2, 3]);
});

test('relay: sự kiện lỗi quá maxAttempts thì bỏ qua để các sự kiện sau chạy tiếp', async () => {
  const db = freshDb();
  seedOrders(db, 2);
  const published = [];
  const relay = createOutboxRelay(db, async (event) => {
    if (event.id === 1) throw new Error('payload hỏng');
    published.push(event.id);
  }, { maxAttempts: 2, now: NOW });

  assert.deepEqual(await relay.runOnce(), { sent: 0, failed: 1 });
  assert.deepEqual(await relay.runOnce(), { sent: 0, failed: 1 });
  assert.deepEqual(await relay.runOnce(), { sent: 1, failed: 0 }, 'sự kiện 1 đã thử 2 lần, bỏ qua');
  assert.deepEqual(published, [2]);
  const first = all(db, 'outbox')[0];
  assert.equal(first.attempts, 2, 'không thử thêm lần nào sau khi chạm maxAttempts');
  assert.equal(first.sent_at, null, 'dead-letter vẫn chưa gửi, giữ lại để người xem');
});

test('relay: gọi runOnce chồng nhau không gửi trùng', async () => {
  const db = freshDb();
  seedOrders(db, 3);
  const published = [];
  const relay = createOutboxRelay(db, async (event) => {
    await new Promise((r) => setTimeout(r, 10));
    published.push(event.id);
  }, { now: NOW });
  const [a, b] = await Promise.all([relay.runOnce(), relay.runOnce()]);
  assert.equal(a.sent + b.sent, 3);
  assert.deepEqual(published, [1, 2, 3], 'mỗi sự kiện chỉ được gửi một lần');
});
