import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCircuitBreaker, CircuitOpenError } from './exercise.js';

function setup({ failureThreshold = 3, resetTimeoutMs = 1000 } = {}) {
  const ctx = { t: 0, calls: 0, fail: false, changes: [] };
  ctx.fn = async (...args) => {
    ctx.calls += 1;
    if (ctx.fail) throw new Error(`API lỗi lần ${ctx.calls}`);
    return { args };
  };
  ctx.breaker = createCircuitBreaker(ctx.fn, {
    failureThreshold,
    resetTimeoutMs,
    now: () => ctx.t,
    onStateChange: (from, to) => ctx.changes.push(`${from}->${to}`),
  });
  return ctx;
}

async function failTimes(ctx, n) {
  for (let i = 0; i < n; i += 1) await assert.rejects(ctx.breaker.call());
}

test('closed: chuyển tiếp tham số và kết quả', async () => {
  const ctx = setup();
  assert.equal(ctx.breaker.state, 'closed');
  assert.deepEqual(await ctx.breaker.call('SO-1', 2), { args: ['SO-1', 2] });
  assert.equal(ctx.calls, 1);
});

test('mở sau failureThreshold lỗi liên tiếp, ném lại đúng lỗi gốc', async () => {
  const ctx = setup({ failureThreshold: 3 });
  ctx.fail = true;
  await assert.rejects(ctx.breaker.call(), { message: 'API lỗi lần 1' });
  await assert.rejects(ctx.breaker.call(), { message: 'API lỗi lần 2' });
  assert.equal(ctx.breaker.state, 'closed', 'mới 2 lỗi, chưa mở');
  await assert.rejects(ctx.breaker.call(), { message: 'API lỗi lần 3' });
  assert.equal(ctx.breaker.state, 'open');
  assert.deepEqual(ctx.changes, ['closed->open']);
});

test('thành công xen giữa làm reset bộ đếm lỗi', async () => {
  const ctx = setup({ failureThreshold: 3 });
  ctx.fail = true;
  await failTimes(ctx, 2);
  ctx.fail = false;
  await ctx.breaker.call();
  ctx.fail = true;
  await failTimes(ctx, 2);
  assert.equal(ctx.breaker.state, 'closed', 'chỉ đếm lỗi liên tiếp');
});

test('open: từ chối ngay bằng CircuitOpenError, không gọi fn', async () => {
  const ctx = setup({ failureThreshold: 2 });
  ctx.fail = true;
  await failTimes(ctx, 2);
  const callsBefore = ctx.calls;
  ctx.t = 999;
  await assert.rejects(ctx.breaker.call(), (err) => err instanceof CircuitOpenError);
  assert.equal(ctx.calls, callsBefore, 'đang open thì không được gọi dịch vụ');
  assert.equal(ctx.breaker.state, 'open');
});

test('hết resetTimeoutMs: half-open, request thử thành công thì đóng lại', async () => {
  const ctx = setup({ failureThreshold: 2, resetTimeoutMs: 1000 });
  ctx.fail = true;
  await failTimes(ctx, 2);
  ctx.t = 1000;
  ctx.fail = false;
  assert.deepEqual(await ctx.breaker.call('thử'), { args: ['thử'] });
  assert.equal(ctx.breaker.state, 'closed');
  assert.deepEqual(ctx.changes, ['closed->open', 'open->half-open', 'half-open->closed']);
  ctx.fail = true;
  await assert.rejects(ctx.breaker.call(), { message: /API lỗi/ });
  assert.equal(ctx.breaker.state, 'closed', 'sau khi đóng lại, bộ đếm lỗi bắt đầu từ 0');
});

test('half-open: request thử lỗi thì mở lại và tính giờ từ lúc đó', async () => {
  const ctx = setup({ failureThreshold: 2, resetTimeoutMs: 1000 });
  ctx.fail = true;
  await failTimes(ctx, 2);
  ctx.t = 1500;
  await assert.rejects(ctx.breaker.call(), { message: /API lỗi/ }, 'request thử lỗi thì ném lỗi gốc');
  assert.equal(ctx.breaker.state, 'open');
  ctx.t = 2499;
  const callsBefore = ctx.calls;
  await assert.rejects(ctx.breaker.call(), CircuitOpenError);
  assert.equal(ctx.calls, callsBefore, 'mở lại lúc 1500 nên phải chờ tới 2500');
  ctx.t = 2500;
  ctx.fail = false;
  await ctx.breaker.call();
  assert.equal(ctx.breaker.state, 'closed');
  assert.deepEqual(ctx.changes, [
    'closed->open',
    'open->half-open',
    'half-open->open',
    'open->half-open',
    'half-open->closed',
  ]);
});

test('half-open: chỉ một request thử được chạy cùng lúc', { timeout: 5000 }, async () => {
  let t = 0;
  let calls = 0;
  let mode = 'fail';
  let releaseTrial;
  const fn = async () => {
    calls += 1;
    if (mode === 'fail') throw new Error('lỗi');
    await new Promise((resolve) => {
      releaseTrial = resolve;
    });
    return 'ok';
  };
  const breaker = createCircuitBreaker(fn, { failureThreshold: 1, resetTimeoutMs: 100, now: () => t });
  await assert.rejects(breaker.call());
  t = 100;
  mode = 'slow';
  const trial = breaker.call();
  assert.equal(breaker.state, 'half-open');
  await assert.rejects(breaker.call(), CircuitOpenError, 'đang có request thử thì từ chối request khác');
  await assert.rejects(breaker.call(), CircuitOpenError);
  assert.equal(calls, 2, 'chỉ 1 lỗi ban đầu + 1 request thử');
  releaseTrial();
  assert.equal(await trial, 'ok');
  assert.equal(breaker.state, 'closed');
});
