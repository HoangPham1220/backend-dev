import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapWithLimit } from './exercise.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// asyncFn giả: đếm số việc đang chạy cùng lúc, ghi lại mức cao nhất.
function createTracker(delayFor = () => 50) {
  const tracker = {
    active: 0,
    maxActive: 0,
    async fn(item) {
      tracker.active += 1;
      tracker.maxActive = Math.max(tracker.maxActive, tracker.active);
      await wait(delayFor(item));
      tracker.active -= 1;
      return item * 2;
    },
  };
  return tracker;
}

test('trả kết quả đúng thứ tự items dù việc xong không theo thứ tự', { timeout: 5000 }, async () => {
  // item càng nhỏ càng chậm
  const tracker = createTracker((item) => 120 - item * 20);
  const results = await mapWithLimit([1, 2, 3, 4, 5], 2, tracker.fn);
  assert.deepEqual(results, [2, 4, 6, 8, 10]);
});

test('không bao giờ chạy quá limit việc cùng lúc, và dùng đủ limit', { timeout: 5000 }, async () => {
  const tracker = createTracker();
  await mapWithLimit([1, 2, 3, 4, 5, 6], 2, tracker.fn);
  assert.ok(tracker.maxActive <= 2, `có lúc chạy ${tracker.maxActive} việc cùng lúc, vượt limit 2`);
  assert.equal(tracker.maxActive, 2, 'phải tận dụng đủ 2 việc song song, không chạy từng cái một');
});

test('limit lớn hơn số items: chạy tất cả cùng lúc', { timeout: 5000 }, async () => {
  const tracker = createTracker();
  const results = await mapWithLimit([1, 2, 3], 10, tracker.fn);
  assert.deepEqual(results, [2, 4, 6]);
  assert.equal(tracker.maxActive, 3);
});

test('bắt đầu việc mới ngay khi có chỗ trống, không chờ cả nhóm', { timeout: 5000 }, async () => {
  // limit 2: việc 1 chạy 300ms, các việc còn lại 50ms.
  // Đúng: trong lúc việc 1 chạy, chỗ còn lại xử lý lần lượt 2, 3, 4, 5 -> tổng ~300ms.
  // Sai (chia nhóm [1,2], [3,4], [5]): 300 + 50 + 50 = ~400ms.
  const tracker = createTracker((item) => (item === 1 ? 300 : 50));
  const start = performance.now();
  const results = await mapWithLimit([1, 2, 3, 4, 5], 2, tracker.fn);
  const elapsed = performance.now() - start;
  assert.deepEqual(results, [2, 4, 6, 8, 10]);
  assert.ok(
    elapsed < 380,
    `mất ${Math.round(elapsed)}ms. Có đang chia nhóm rồi chờ cả nhóm xong không? Nên lấp chỗ trống ngay.`,
  );
});

test('mảng rỗng trả mảng rỗng', { timeout: 5000 }, async () => {
  const tracker = createTracker();
  assert.deepEqual(await mapWithLimit([], 3, tracker.fn), []);
});

test('một việc lỗi thì reject với lỗi đó', { timeout: 5000 }, async () => {
  const failing = async (item) => {
    await wait(10);
    if (item === 3) throw new Error('Đồng bộ sản phẩm 3 thất bại');
    return item;
  };
  await assert.rejects(() => mapWithLimit([1, 2, 3, 4], 2, failing), {
    message: 'Đồng bộ sản phẩm 3 thất bại',
  });
});
