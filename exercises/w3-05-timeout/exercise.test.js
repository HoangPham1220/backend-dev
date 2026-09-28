import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withTimeout } from './exercise.js';

// Promise giả: resolve với `value` sau `ms` mili giây.
const resolveAfter = (ms, value) => new Promise((resolve) => setTimeout(() => resolve(value), ms));
const rejectAfter = (ms, error) => new Promise((_, reject) => setTimeout(() => reject(error), ms));

test('promise xong kịp: trả đúng kết quả', { timeout: 5000 }, async () => {
  const order = { id: 1, total: 250000 };
  assert.deepEqual(await withTimeout(resolveAfter(50, order), 300), order);
});

test('quá hạn: reject với Error "Timeout sau <ms>ms"', { timeout: 5000 }, async () => {
  await assert.rejects(
    () => withTimeout(resolveAfter(500, 'quá chậm'), 100),
    (error) => {
      assert.ok(error instanceof Error, 'phải reject bằng một đối tượng Error, không phải chuỗi');
      assert.equal(error.message, 'Timeout sau 100ms');
      return true;
    },
  );
});

test('quá hạn: reject ngay khi hết giờ, không chờ promise gốc xong', { timeout: 5000 }, async () => {
  const start = performance.now();
  await withTimeout(resolveAfter(800, 'quá chậm'), 100).catch(() => {});
  const elapsed = performance.now() - start;
  assert.ok(
    elapsed < 400,
    `timeout 100ms nhưng bạn chờ tới ${Math.round(elapsed)}ms. Có đang chờ promise gốc xong không?`,
  );
});

test('promise gốc reject trước hạn: giữ nguyên lỗi gốc', { timeout: 5000 }, async () => {
  const original = new Error('Hết hàng');
  await assert.rejects(
    () => withTimeout(rejectAfter(30, original), 300),
    (error) => {
      assert.equal(error, original, 'phải reject bằng đúng lỗi gốc, không phải lỗi Timeout');
      return true;
    },
  );
});
