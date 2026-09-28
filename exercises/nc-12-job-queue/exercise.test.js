import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { enqueue, createWorker, stats } from './exercise.js';

function setup() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'done', 'dead')),
      attempts INTEGER NOT NULL DEFAULT 0, max_attempts INTEGER NOT NULL, run_at INTEGER NOT NULL,
      locked_until INTEGER, last_error TEXT, result TEXT
    );
  `);
  const clock = { t: 10_000 };
  return { db, clock, now: () => clock.t };
}

const job = (db, id) => ({ ...db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) });

test('enqueue: tạo job pending, payload JSON, trả id', () => {
  const { db } = setup();
  const id = enqueue(db, 'email.order_confirm', { orderId: 7 }, { runAt: 500, maxAttempts: 4 });
  assert.equal(id, 1);
  assert.equal(typeof id, 'number');
  const row = job(db, 1);
  assert.equal(row.status, 'pending');
  assert.deepEqual(JSON.parse(row.payload), { orderId: 7 });
  assert.equal(row.run_at, 500);
  assert.equal(row.max_attempts, 4);
  assert.equal(enqueue(db, 'x', {}), 2);
  assert.equal(job(db, 2).max_attempts, 3, 'maxAttempts mặc định 3');
});

test('tick: chạy job đến hạn → done, lưu result; hết việc → null', async () => {
  const { db, now } = setup();
  enqueue(db, 'invoice.pdf', { orderId: 1 });
  const seen = [];
  const worker = createWorker(db, {
    'invoice.pdf': async (payload, info) => {
      seen.push({ payload, info });
      return { url: `/invoices/${payload.orderId}.pdf` };
    },
  }, { now });
  assert.deepEqual(await worker.tick(), { id: 1, status: 'done' });
  assert.deepEqual(seen, [{ payload: { orderId: 1 }, info: { id: 1, attempts: 1 } }]);
  const row = job(db, 1);
  assert.deepEqual(JSON.parse(row.result), { url: '/invoices/1.pdf' });
  assert.equal(row.locked_until, null);
  assert.equal(await worker.tick(), null);
});

test('runAt ở tương lai: chưa chạy cho tới khi đến giờ', async () => {
  const { db, clock, now } = setup();
  enqueue(db, 'reminder', {}, { runAt: 20_000 });
  const worker = createWorker(db, { reminder: async () => 'ok' }, { now });
  assert.equal(await worker.tick(), null);
  clock.t = 20_000;
  assert.deepEqual(await worker.tick(), { id: 1, status: 'done' });
});

test('handler lỗi: về pending với backoff lũy thừa, lưu last_error', async () => {
  const { db, clock, now } = setup();
  enqueue(db, 'sync.shopify', {}, { maxAttempts: 5 });
  const worker = createWorker(db, { 'sync.shopify': async () => { throw new Error('429 Too Many Requests'); } }, { now });

  assert.deepEqual(await worker.tick(), { id: 1, status: 'pending' });
  let row = job(db, 1);
  assert.equal(row.attempts, 1);
  assert.equal(row.run_at, 11_000, 'lần 1 lỗi → chờ 1000ms');
  assert.equal(row.last_error, '429 Too Many Requests');
  assert.equal(row.locked_until, null);

  assert.equal(await worker.tick(), null, 'chưa tới run_at thì không chạy lại');
  clock.t = 11_000;
  await worker.tick();
  row = job(db, 1);
  assert.equal(row.attempts, 2);
  assert.equal(row.run_at, 13_000, 'lần 2 lỗi → chờ 2000ms');
});

test('backoff tùy chỉnh và hết lượt → dead', async () => {
  const { db, clock, now } = setup();
  enqueue(db, 'fail', {}, { maxAttempts: 3 });
  const worker = createWorker(db, { fail: async () => { throw new Error('hỏng'); } }, { now, backoff: () => 5 });
  const statuses = [];
  for (let i = 0; i < 3; i += 1) {
    statuses.push((await worker.tick()).status);
    clock.t += 5;
  }
  assert.deepEqual(statuses, ['pending', 'pending', 'dead']);
  const row = job(db, 1);
  assert.equal(row.status, 'dead');
  assert.equal(row.attempts, 3);
  assert.equal(await worker.tick(), null, 'job dead không được chạy nữa');
});

test('không có handler cho type → dead ngay', async () => {
  const { db, now } = setup();
  enqueue(db, 'loai.la', {});
  const worker = createWorker(db, {}, { now });
  assert.deepEqual(await worker.tick(), { id: 1, status: 'dead' });
  assert.match(job(db, 1).last_error, /loai\.la/);
});

test('worker chết giữa chừng: job bị khoá tới hết visibility timeout, sau đó worker khác nhận lại', async () => {
  const { db, clock, now } = setup();
  enqueue(db, 'export', { n: 1 });
  let calls = 0;
  const handlers = {
    export: async () => {
      calls += 1;
      if (calls === 1) return new Promise(() => {}); // worker A treo vĩnh viễn (coi như chết)
      return 'xong';
    },
  };
  const workerA = createWorker(db, handlers, { now, visibilityTimeoutMs: 5000 });
  const workerB = createWorker(db, handlers, { now, visibilityTimeoutMs: 5000 });

  workerA.tick(); // không await: A đang "chạy" job
  await new Promise((r) => setImmediate(r));
  const locked = job(db, 1);
  assert.equal(locked.status, 'running');
  assert.equal(locked.locked_until, 15_000);

  clock.t = 14_999;
  assert.equal(await workerB.tick(), null, 'còn khoá thì worker khác không được nhận');
  clock.t = 15_000;
  assert.deepEqual(await workerB.tick(), { id: 1, status: 'done' });
  assert.equal(job(db, 1).attempts, 2, 'lần A nhận cũng tính là một lần thử');
});

test('khoá hết hạn mà đã hết lượt → dead "Worker không phản hồi", không chạy handler', async () => {
  const { db, clock, now } = setup();
  enqueue(db, 'export', {}, { maxAttempts: 1 });
  let calls = 0;
  const handlers = { export: () => { calls += 1; return new Promise(() => {}); } };
  const workerA = createWorker(db, handlers, { now, visibilityTimeoutMs: 1000 });
  workerA.tick();
  await new Promise((r) => setImmediate(r));
  clock.t += 1000;
  const workerB = createWorker(db, handlers, { now, visibilityTimeoutMs: 1000 });
  assert.deepEqual(await workerB.tick(), { id: 1, status: 'dead' });
  assert.equal(job(db, 1).last_error, 'Worker không phản hồi');
  assert.equal(calls, 1);
});

test('thứ tự: run_at nhỏ trước, cùng run_at thì id nhỏ trước; stats đếm đúng', async () => {
  const { db, now } = setup();
  enqueue(db, 't', { n: 'c' }, { runAt: 300 });
  enqueue(db, 't', { n: 'a' }, { runAt: 100 });
  enqueue(db, 't', { n: 'b' }, { runAt: 100 });
  enqueue(db, 'bad', {}, { runAt: 400, maxAttempts: 1 });
  const order = [];
  const worker = createWorker(db, {
    t: async (payload) => { order.push(payload.n); },
    bad: async () => { throw new Error('x'); },
  }, { now });
  assert.deepEqual(stats(db), { pending: 4, running: 0, done: 0, dead: 0 });
  await worker.tick();
  await worker.tick();
  assert.deepEqual(order, ['a', 'b']);
  while (await worker.tick()) { /* chạy hết */ }
  assert.deepEqual(order, ['a', 'b', 'c']);
  assert.deepEqual(stats(db), { pending: 0, running: 0, done: 3, dead: 1 });
});
