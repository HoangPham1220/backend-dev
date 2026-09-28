import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBatcher } from './exercise.js';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// flushFn giả: ghi lại từng lô và thời điểm flush, trả về số item đã xử lý.
function createFlush({ fail = false } = {}) {
  const start = performance.now();
  const flush = async (items) => {
    flush.batches.push({ items: [...items], at: performance.now() - start });
    await delay(5);
    if (fail) throw new Error('Shopify trả lỗi 500');
    return `đã cập nhật ${items.length}`;
  };
  flush.batches = [];
  return flush;
}

test('đủ maxSize thì flush ngay, không chờ hết giờ', { timeout: 5000 }, async () => {
  const flush = createFlush();
  const batcher = createBatcher(flush, { maxSize: 3, maxWaitMs: 1000 });
  const start = performance.now();
  const results = await Promise.all(['A', 'B', 'C'].map((sku) => batcher.add(sku)));
  assert.ok(performance.now() - start < 300, 'đủ 3 item phải flush ngay, không chờ 1000ms');
  assert.deepEqual(flush.batches.map((b) => b.items), [['A', 'B', 'C']]);
  assert.deepEqual(results, ['đã cập nhật 3', 'đã cập nhật 3', 'đã cập nhật 3'], 'mỗi add nhận kết quả của lô chứa nó');
});

test('chưa đủ maxSize thì flush sau maxWaitMs tính từ item đầu', { timeout: 5000 }, async () => {
  const flush = createFlush();
  const batcher = createBatcher(flush, { maxSize: 10, maxWaitMs: 100 });
  const first = batcher.add('A');
  await delay(40);
  const second = batcher.add('B');
  const results = await Promise.all([first, second]);
  assert.deepEqual(results, ['đã cập nhật 2', 'đã cập nhật 2']);
  assert.equal(flush.batches.length, 1);
  const at = flush.batches[0].at;
  assert.ok(at >= 80, `flush quá sớm (${Math.round(at)}ms), phải chờ ~100ms`);
  assert.ok(at < 130, `flush lúc ${Math.round(at)}ms: đồng hồ phải tính từ item đầu, không đặt lại khi thêm item`);
});

test('nhiều item hơn maxSize thì chia thành nhiều lô đúng thứ tự', { timeout: 5000 }, async () => {
  const flush = createFlush();
  const batcher = createBatcher(flush, { maxSize: 2, maxWaitMs: 50 });
  const results = await Promise.all(['A', 'B', 'C', 'D', 'E'].map((sku) => batcher.add(sku)));
  assert.deepEqual(flush.batches.map((b) => b.items), [['A', 'B'], ['C', 'D'], ['E']]);
  assert.deepEqual(results, ['đã cập nhật 2', 'đã cập nhật 2', 'đã cập nhật 2', 'đã cập nhật 2', 'đã cập nhật 1']);
});

test('sau khi flush vì đủ maxSize, lô mới có đồng hồ mới', { timeout: 5000 }, async () => {
  const flush = createFlush();
  const batcher = createBatcher(flush, { maxSize: 2, maxWaitMs: 100 });
  await Promise.all([batcher.add('A'), batcher.add('B')]);
  await delay(60);
  const lateStart = performance.now();
  await batcher.add('C');
  const waited = performance.now() - lateStart;
  assert.deepEqual(flush.batches.map((b) => b.items), [['A', 'B'], ['C']]);
  assert.ok(
    waited >= 80,
    `lô ['C'] chỉ chờ ${Math.round(waited)}ms. Có quên clearTimeout của lô trước không?`,
  );
});

test('flushFn lỗi: mọi add trong lô đó reject, lô sau vẫn chạy', { timeout: 5000 }, async () => {
  let calls = 0;
  const flush = async (items) => {
    calls += 1;
    if (calls === 1) throw new Error('Shopify trả lỗi 500');
    return `đã cập nhật ${items.length}`;
  };
  const batcher = createBatcher(flush, { maxSize: 2, maxWaitMs: 50 });
  const a = batcher.add('A');
  const b = batcher.add('B');
  assert.ok(a instanceof Promise, 'add phải trả về Promise');
  await assert.rejects(a, { message: 'Shopify trả lỗi 500' });
  await assert.rejects(b, { message: 'Shopify trả lỗi 500' });
  assert.equal(await batcher.add('C'), 'đã cập nhật 1');
});
