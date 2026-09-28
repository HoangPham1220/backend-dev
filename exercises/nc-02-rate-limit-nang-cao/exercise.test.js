import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTokenBucket, createSlidingWindowLog } from './exercise.js';

function clock() {
  const c = { t: 0 };
  c.now = () => c.t;
  return c;
}

test('token bucket: cho burst tới capacity rồi chặn, báo đúng thời gian chờ', () => {
  const c = clock();
  const bucket = createTokenBucket({ capacity: 5, refillPerSec: 2, now: c.now });
  const remaining = [];
  for (let i = 0; i < 5; i += 1) {
    const r = bucket.take('ip1');
    assert.equal(r.allowed, true, `lần ${i + 1} phải được phép`);
    remaining.push(r.remaining);
  }
  assert.deepEqual(remaining, [4, 3, 2, 1, 0]);
  assert.deepEqual(bucket.take('ip1'), { allowed: false, remaining: 0, retryAfterMs: 500 });
});

test('token bucket: nạp lại theo thời gian, tính cả phần lẻ', () => {
  const c = clock();
  const bucket = createTokenBucket({ capacity: 5, refillPerSec: 2, now: c.now });
  for (let i = 0; i < 5; i += 1) bucket.take('ip1');
  c.t = 250;
  assert.deepEqual(bucket.take('ip1'), { allowed: false, remaining: 0, retryAfterMs: 250 }, 'mới có 0.5 token, còn thiếu 250ms');
  c.t = 500;
  assert.deepEqual(bucket.take('ip1'), { allowed: true, remaining: 0, retryAfterMs: 0 });
});

test('token bucket: nghỉ lâu cũng không nạp quá capacity', () => {
  const c = clock();
  const bucket = createTokenBucket({ capacity: 5, refillPerSec: 2, now: c.now });
  bucket.take('ip1');
  c.t = 100_000;
  assert.equal(bucket.take('ip1').remaining, 4, 'xô tối đa 5 token, lấy 1 còn 4');
});

test('token bucket: mỗi key một xô riêng', () => {
  const c = clock();
  const bucket = createTokenBucket({ capacity: 2, refillPerSec: 1, now: c.now });
  bucket.take('a');
  bucket.take('a');
  assert.equal(bucket.take('a').allowed, false);
  assert.deepEqual(bucket.take('b'), { allowed: true, remaining: 1, retryAfterMs: 0 });
});

test('token bucket: cost lớn hơn 1, và cost vượt capacity là lỗi', () => {
  const c = clock();
  const bucket = createTokenBucket({ capacity: 5, refillPerSec: 2, now: c.now });
  assert.deepEqual(bucket.take('api', 3), { allowed: true, remaining: 2, retryAfterMs: 0 });
  assert.deepEqual(bucket.take('api', 3), { allowed: false, remaining: 2, retryAfterMs: 500 }, 'thiếu 1 token → chờ 500ms, không trừ gì');
  c.t = 500;
  assert.deepEqual(bucket.take('api', 3), { allowed: true, remaining: 0, retryAfterMs: 0 });
  assert.throws(() => bucket.take('api', 6), RangeError);
});

test('sliding window: tối đa max request trong cửa sổ, báo lúc được gọi lại', () => {
  const c = clock();
  const limiter = createSlidingWindowLog({ windowMs: 1000, max: 3, now: c.now });
  const results = [0, 100, 200].map((t) => {
    c.t = t;
    return limiter.hit('u1');
  });
  assert.deepEqual(results.map((r) => r.remaining), [2, 1, 0]);
  assert.ok(results.every((r) => r.allowed && r.retryAfterMs === 0));
  c.t = 300;
  assert.deepEqual(limiter.hit('u1'), { allowed: false, remaining: 0, retryAfterMs: 700 });
});

test('sliding window: cửa sổ trượt theo thời gian', () => {
  const c = clock();
  const limiter = createSlidingWindowLog({ windowMs: 1000, max: 3, now: c.now });
  for (const t of [0, 100, 200]) {
    c.t = t;
    limiter.hit('u1');
  }
  c.t = 1000;
  assert.equal(limiter.hit('u1').allowed, true, 'request lúc 0 đã ra khỏi cửa sổ (0 > 1000 - 1000 là sai)');
  c.t = 1050;
  assert.deepEqual(limiter.hit('u1'), { allowed: false, remaining: 0, retryAfterMs: 50 }, 'còn 100, 200, 1000 trong cửa sổ; 100 hết tác dụng lúc 1100');
});

test('sliding window: không cho burst gấp đôi ở ranh giới như fixed window', () => {
  const c = clock();
  const limiter = createSlidingWindowLog({ windowMs: 1000, max: 3, now: c.now });
  for (const t of [900, 950, 999]) {
    c.t = t;
    assert.equal(limiter.hit('u1').allowed, true);
  }
  c.t = 1001;
  assert.equal(limiter.hit('u1').allowed, false, 'fixed window sẽ cho qua vì đã sang khung mới; sliding window thì không');
});

test('sliding window: request bị từ chối không bị tính, mỗi key riêng', () => {
  const c = clock();
  const limiter = createSlidingWindowLog({ windowMs: 1000, max: 2, now: c.now });
  c.t = 0;
  limiter.hit('spam');
  limiter.hit('spam');
  for (let t = 100; t < 1000; t += 50) {
    c.t = t;
    assert.equal(limiter.hit('spam').allowed, false);
  }
  c.t = 1000;
  assert.equal(limiter.hit('spam').allowed, true, 'nếu ghi cả request bị từ chối, client spam sẽ bị khóa mãi');
  assert.equal(limiter.hit('other').remaining, 1);
});
