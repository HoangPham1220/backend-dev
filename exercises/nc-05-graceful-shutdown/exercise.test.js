import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGracefulServer } from './exercise.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Handler mẫu: /slow?ms=300 trả lời sau 300ms, /hang không bao giờ trả lời, còn lại trả ngay.
function handler(req, res) {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/slow') {
    setTimeout(() => res.end('done'), Number(url.searchParams.get('ms') ?? 300));
  } else if (url.pathname === '/hang') {
    // cố ý không trả lời
  } else {
    res.end('ok');
  }
}

async function start(t, options) {
  const app = createGracefulServer(handler, options);
  await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve));
  t.after(() => {
    app.server.closeAllConnections?.();
    app.server.close();
  });
  return { app, base: `http://127.0.0.1:${app.server.address().port}` };
}

test('bình thường: chuyển request cho handler, /ready trả 200', { timeout: 5000 }, async (t) => {
  const { app, base } = await start(t);
  assert.equal(app.isShuttingDown, false);
  const res = await fetch(`${base}/products`);
  assert.equal(await res.text(), 'ok');
  const ready = await fetch(`${base}/ready`);
  assert.equal(ready.status, 200);
  assert.deepEqual(await ready.json(), { ready: true });
});

test('shutdown chờ request đang chạy xong rồi mới resolve', { timeout: 5000 }, async (t) => {
  const { app, base } = await start(t, { shutdownTimeoutMs: 3000 });
  const slow = fetch(`${base}/slow?ms=300`).then((res) => res.text());
  await sleep(50);
  const startedAt = performance.now();
  const result = await app.shutdown();
  const waited = performance.now() - startedAt;
  assert.deepEqual(result, { drained: true });
  assert.equal(await slow, 'done', 'request đang chạy phải được trả lời trọn vẹn');
  assert.ok(waited >= 200, `shutdown resolve sau ${Math.round(waited)}ms, phải chờ request chậm (~250ms)`);
});

test('sau khi tắt xong thì không nhận kết nối mới', { timeout: 5000 }, async (t) => {
  const { app, base } = await start(t);
  await fetch(`${base}/products`);
  await app.shutdown();
  await assert.rejects(fetch(`${base}/products`), 'server đã đóng thì fetch phải lỗi kết nối');
});

test('quá shutdownTimeoutMs thì đóng cưỡng bức, drained = false', { timeout: 5000 }, async (t) => {
  const { app, base } = await start(t, { shutdownTimeoutMs: 200 });
  const hanging = fetch(`${base}/hang`).then(
    () => 'trả lời',
    () => 'bị cắt',
  );
  await sleep(50);
  const startedAt = performance.now();
  const result = await app.shutdown();
  const waited = performance.now() - startedAt;
  assert.deepEqual(result, { drained: false });
  assert.ok(waited >= 150 && waited < 1500, `phải chờ khoảng 200ms rồi cắt, thực tế ${Math.round(waited)}ms`);
  assert.equal(await hanging, 'bị cắt');
});

test('readinessDelayMs: /ready trả 503 nhưng vẫn phục vụ request trong lúc chờ', { timeout: 5000 }, async (t) => {
  const { app, base } = await start(t, { readinessDelayMs: 300 });
  const done = app.shutdown();
  assert.equal(app.isShuttingDown, true);
  const ready = await fetch(`${base}/ready`);
  assert.equal(ready.status, 503);
  assert.deepEqual(await ready.json(), { ready: false });
  const res = await fetch(`${base}/products`);
  assert.equal(await res.text(), 'ok', 'trong lúc chờ load balancer cập nhật, request vẫn phải được phục vụ');
  assert.equal(res.headers.get('connection'), 'close', 'đang tắt thì báo client đóng kết nối');
  assert.deepEqual(await done, { drained: true });
});

test('không có request nào: tắt ngay; gọi shutdown nhiều lần trả cùng một Promise', { timeout: 5000 }, async (t) => {
  const { app, base } = await start(t);
  await fetch(`${base}/products`);
  const startedAt = performance.now();
  const first = app.shutdown();
  const second = app.shutdown();
  assert.equal(first, second, 'gọi lần hai phải trả về cùng Promise');
  assert.deepEqual(await first, { drained: true });
  assert.ok(performance.now() - startedAt < 500, 'không có request đang chạy thì không phải chờ');
});
