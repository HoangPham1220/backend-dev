import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRetry } from './exercise.js';

// Hàm async giả: lỗi `failTimes` lần đầu, sau đó trả 'ok'. Đếm số lần được gọi.
function createFlakyApi(failTimes) {
  const api = {
    calls: 0,
    async call() {
      api.calls += 1;
      if (api.calls <= failTimes) {
        throw new Error(`lỗi lần ${api.calls}`);
      }
      return 'ok';
    },
  };
  return api;
}

test('thành công ngay lần đầu: gọi 1 lần, trả kết quả', { timeout: 5000 }, async () => {
  const api = createFlakyApi(0);
  assert.equal(await withRetry(api.call), 'ok');
  assert.equal(api.calls, 1, 'thành công rồi thì không gọi thêm');
});

test('lỗi 2 lần rồi thành công: gọi 3 lần, trả kết quả', { timeout: 5000 }, async () => {
  const api = createFlakyApi(2);
  assert.equal(await withRetry(api.call, { retries: 3 }), 'ok');
  assert.equal(api.calls, 3);
});

test('luôn lỗi: gọi 1 + retries lần rồi throw lỗi của lần cuối', { timeout: 5000 }, async () => {
  const api = createFlakyApi(Infinity);
  await assert.rejects(
    () => withRetry(api.call, { retries: 2 }),
    { message: 'lỗi lần 3' },
    'phải throw đúng lỗi của lần gọi cuối cùng (lần 3)',
  );
  assert.equal(api.calls, 3, 'retries: 2 nghĩa là 1 lần đầu + 2 lần thử lại');
});

test('không truyền options: mặc định retries = 3', { timeout: 5000 }, async () => {
  const api = createFlakyApi(Infinity);
  await assert.rejects(() => withRetry(api.call), { message: 'lỗi lần 4' });
  assert.equal(api.calls, 4);
});

test('retries: 0 thì chỉ gọi 1 lần', { timeout: 5000 }, async () => {
  const api = createFlakyApi(Infinity);
  await assert.rejects(() => withRetry(api.call, { retries: 0 }), { message: 'lỗi lần 1' });
  assert.equal(api.calls, 1);
});

test('delayMs: chờ giữa các lần thử', { timeout: 5000 }, async () => {
  const api = createFlakyApi(2);
  const start = performance.now();
  await withRetry(api.call, { retries: 3, delayMs: 100 });
  const elapsed = performance.now() - start;
  assert.ok(
    elapsed >= 180,
    `lỗi 2 lần với delayMs: 100 phải chờ ~200ms, của bạn chỉ ${Math.round(elapsed)}ms`,
  );
  assert.ok(elapsed < 600, `chờ tới ${Math.round(elapsed)}ms, quá lâu. Có chờ cả sau lần thành công không?`);
});
