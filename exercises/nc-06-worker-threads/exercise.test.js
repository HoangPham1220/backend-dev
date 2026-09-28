import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { runInWorker, createWorkerPool } from './exercise.js';

const WORKER = new URL('./worker.js', import.meta.url);

function hashRounds(input, rounds) {
  let hash = input;
  for (let i = 0; i < rounds; i += 1) hash = createHash('sha256').update(hash).digest('hex');
  return hash;
}

test('runInWorker: trả đúng kết quả tính trong worker', { timeout: 10000 }, async () => {
  const result = await runInWorker(WORKER, { input: 'SKU-1', rounds: 1000 });
  assert.equal(result?.hash, hashRounds('SKU-1', 1000));
  assert.equal(typeof result.threadId, 'number');
});

test('runInWorker: lỗi từ worker và worker chết đều reject', { timeout: 10000 }, async () => {
  await assert.rejects(runInWorker(WORKER, { input: 'SKU-X', fail: true }), { message: 'Không xử lý được SKU-X' });
  await assert.rejects(runInWorker(WORKER, { input: 'SKU-Y', crash: true }), /exit/i);
});

test('runInWorker: event loop vẫn chạy trong lúc worker tính nặng', { timeout: 20000 }, async () => {
  let ticks = 0;
  const interval = setInterval(() => {
    ticks += 1;
  }, 10);
  const startedAt = performance.now();
  try {
    const result = await runInWorker(WORKER, { input: 'nặng', rounds: 300_000 });
    assert.ok(result?.hash, 'phải có kết quả');
  } finally {
    clearInterval(interval);
  }
  const elapsed = performance.now() - startedAt;
  const expected = elapsed / 10;
  assert.ok(ticks >= expected * 0.3, `chỉ có ${ticks} tick trong ${Math.round(elapsed)}ms: việc nặng đang chặn luồng chính?`);
});

test('pool: kết quả đúng thứ tự gọi, dùng lại đúng số worker', { timeout: 20000 }, async (t) => {
  const pool = createWorkerPool(WORKER, 2);
  t.after(() => pool?.close?.());
  const inputs = Array.from({ length: 8 }, (_, i) => `SKU-${i}`);
  const results = await Promise.all(inputs.map((input) => pool.run({ input, rounds: 20_000 })));
  assert.deepEqual(
    results.map((r) => r.hash),
    inputs.map((input) => hashRounds(input, 20_000)),
  );
  const threads = new Set(results.map((r) => r.threadId));
  assert.equal(threads.size, 2, `pool size 2 phải dùng đúng 2 worker, thực tế ${threads.size} (có tạo worker mới cho mỗi việc không?)`);
});

test('pool: worker chết thì việc đó lỗi, pool thay worker và chạy tiếp', { timeout: 20000 }, async (t) => {
  const pool = createWorkerPool(WORKER, 2);
  t.after(() => pool?.close?.());
  const settled = await Promise.allSettled([
    pool.run({ input: 'A', rounds: 10 }),
    pool.run({ input: 'B', crash: true }),
    pool.run({ input: 'C', fail: true }),
    pool.run({ input: 'D', rounds: 10 }),
  ]);
  assert.deepEqual(settled.map((s) => s.status), ['fulfilled', 'rejected', 'rejected', 'fulfilled']);
  assert.match(settled[1].reason.message, /exit/i);
  assert.equal(settled[2].reason.message, 'Không xử lý được C');
  const after = await Promise.all(['E', 'F', 'G', 'H'].map((input) => pool.run({ input, rounds: 10 })));
  assert.deepEqual(after.map((r) => r.hash), ['E', 'F', 'G', 'H'].map((input) => hashRounds(input, 10)));
});

test('pool: close từ chối việc đang chờ và việc gọi sau đó', { timeout: 20000 }, async () => {
  const pool = createWorkerPool(WORKER, 1);
  const running = pool.run({ input: 'đang chạy', rounds: 200_000 }).catch((err) => err);
  const queued = pool.run({ input: 'đang chờ', rounds: 10 });
  const queuedResult = queued.then(
    () => 'resolve',
    (err) => err.message,
  );
  await pool.close();
  assert.match(await queuedResult, /Pool đã đóng/);
  await assert.rejects(pool.run({ input: 'sau khi đóng', rounds: 1 }), /Pool đã đóng/);
  await running;
});
