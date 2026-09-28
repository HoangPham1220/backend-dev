import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { IdempotencyError, createIdempotencyStore, handleIdempotent } from './exercise.js';

function setup({ ttlMs = 60_000 } = {}) {
  const db = new DatabaseSync(':memory:');
  const clock = { t: 1_000_000 };
  const store = createIdempotencyStore(db, { ttlMs, now: () => clock.t });
  assert.ok(store && typeof store === 'object', 'createIdempotencyStore phải trả về một object store');
  return { db, clock, store };
}

// fn giả: đếm số lần chạy, mỗi lần tạo một "đơn" mới.
function orderCreator() {
  const counter = { calls: 0 };
  counter.fn = async () => {
    counter.calls += 1;
    return { status: 201, body: { orderId: counter.calls, total: 450000 } };
  };
  return counter;
}

function deferred() {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
}

test('lần đầu: chạy fn, replayed = false', async () => {
  const { store } = setup();
  const creator = orderCreator();
  const result = await handleIdempotent(store, 'key-1', 'hash-A', creator.fn);
  assert.deepEqual(result, { response: { status: 201, body: { orderId: 1, total: 450000 } }, replayed: false });
  assert.equal(creator.calls, 1);
});

test('gửi lại cùng key + cùng nội dung: trả response cũ, không tạo đơn mới', async () => {
  const { store } = setup();
  const creator = orderCreator();
  const first = await handleIdempotent(store, 'key-1', 'hash-A', creator.fn);
  const second = await handleIdempotent(store, 'key-1', 'hash-A', creator.fn);
  assert.equal(creator.calls, 1, 'fn chỉ được chạy một lần');
  assert.deepEqual(second, { response: first.response, replayed: true });
  assert.notStrictEqual(second.response, first.response, 'trả bản sao đọc từ DB, không phải cùng object');
});

test('dữ liệu nằm trong DB: store mới trên cùng db vẫn nhận ra key cũ', async () => {
  const { db, clock, store } = setup();
  const creator = orderCreator();
  await handleIdempotent(store, 'key-1', 'hash-A', creator.fn);
  const storeAfterRestart = createIdempotencyStore(db, { ttlMs: 60_000, now: () => clock.t });
  const result = await handleIdempotent(storeAfterRestart, 'key-1', 'hash-A', creator.fn);
  assert.equal(result.replayed, true, 'server khởi động lại vẫn phải nhớ key');
  assert.equal(creator.calls, 1);
});

test('cùng key nhưng nội dung khác → 422, không chạy fn', async () => {
  const { store } = setup();
  const creator = orderCreator();
  await handleIdempotent(store, 'key-1', 'hash-A', creator.fn);
  await assert.rejects(
    handleIdempotent(store, 'key-1', 'hash-B', creator.fn),
    (error) => error instanceof IdempotencyError && error.status === 422,
  );
  assert.equal(creator.calls, 1);
});

test('request đầu đang chạy dở → request thứ hai cùng key nhận 409', async () => {
  const { store } = setup();
  const gate = deferred();
  let calls = 0;
  const slowFn = async () => {
    calls += 1;
    await gate.promise;
    return { status: 201, body: { orderId: 1 } };
  };
  const first = handleIdempotent(store, 'key-1', 'hash-A', slowFn);
  await new Promise((r) => setImmediate(r)); // để request đầu kịp ghi "đang xử lý"
  await assert.rejects(
    handleIdempotent(store, 'key-1', 'hash-A', slowFn),
    (error) => error instanceof IdempotencyError && error.status === 409,
  );
  gate.resolve();
  assert.equal((await first).replayed, false);
  assert.equal(calls, 1);
  const again = await handleIdempotent(store, 'key-1', 'hash-A', slowFn);
  assert.equal(again.replayed, true, 'sau khi request đầu xong thì gửi lại được replay bình thường');
});

test('fn thất bại: lỗi được ném tiếp, gửi lại cùng key thì chạy lại', async () => {
  const { store } = setup();
  let calls = 0;
  const flaky = async () => {
    calls += 1;
    if (calls === 1) throw new Error('cổng thanh toán timeout');
    return { status: 201, body: { orderId: 7 } };
  };
  await assert.rejects(handleIdempotent(store, 'key-1', 'hash-A', flaky), /cổng thanh toán timeout/);
  const result = await handleIdempotent(store, 'key-1', 'hash-A', flaky);
  assert.deepEqual(result, { response: { status: 201, body: { orderId: 7 } }, replayed: false });
  assert.equal(calls, 2);
});

test('hết TTL: coi như key mới; purgeExpired xoá key hết hạn', async () => {
  const { clock, store } = setup({ ttlMs: 60_000 });
  const creator = orderCreator();
  await handleIdempotent(store, 'old-1', 'h', creator.fn);
  await handleIdempotent(store, 'old-2', 'h', creator.fn);
  clock.t += 30_000;
  await handleIdempotent(store, 'fresh', 'h', creator.fn);
  clock.t += 30_000; // old-* vừa đúng 60000ms → hết hạn; fresh mới 30000ms

  const result = await handleIdempotent(store, 'old-1', 'h-khac', creator.fn);
  assert.equal(result.replayed, false, 'key hết hạn: không báo 422 dù hash khác, chạy như mới');
  assert.equal(creator.calls, 4);

  assert.equal(typeof store.purgeExpired, 'function', 'store phải có purgeExpired()');
  assert.equal(store.purgeExpired(), 1, 'chỉ còn old-2 hết hạn (old-1 vừa được ghi lại, fresh còn hạn)');
  assert.equal((await handleIdempotent(store, 'fresh', 'h', creator.fn)).replayed, true);
});

test('không có key: chạy fn mỗi lần; các key khác nhau độc lập', async () => {
  const { store } = setup();
  const creator = orderCreator();
  await handleIdempotent(store, undefined, 'h', creator.fn);
  await handleIdempotent(store, '', 'h', creator.fn);
  assert.equal(creator.calls, 2, 'không có key thì không chống trùng được');
  const a = await handleIdempotent(store, 'key-a', 'h', creator.fn);
  const b = await handleIdempotent(store, 'key-b', 'h', creator.fn);
  assert.notDeepEqual(a.response, b.response);
  assert.equal(creator.calls, 4);
});
