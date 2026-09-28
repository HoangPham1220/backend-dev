import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TaskQueue } from './exercise.js';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Tạo các task giả ghi lại lúc bắt đầu/kết thúc và số task chạy đồng thời tối đa.
function createTracker() {
  const tracker = { log: [], running: 0, maxRunning: 0 };
  tracker.task = (name, ms, { fail = false } = {}) => async () => {
    tracker.running += 1;
    tracker.maxRunning = Math.max(tracker.maxRunning, tracker.running);
    tracker.log.push(`start ${name}`);
    await delay(ms);
    tracker.running -= 1;
    tracker.log.push(`end ${name}`);
    if (fail) throw new Error(`task ${name} lỗi`);
    return `kết quả ${name}`;
  };
  return tracker;
}

test('add: trả Promise kết quả của đúng task đó', { timeout: 5000 }, async () => {
  const queue = new TaskQueue();
  const tracker = createTracker();
  const a = queue.add(tracker.task('A', 20));
  const b = queue.add(tracker.task('B', 10));
  assert.ok(a instanceof Promise, 'add phải trả về Promise');
  assert.equal(await b, 'kết quả B');
  assert.equal(await a, 'kết quả A');
});

test('chạy tuần tự theo thứ tự add, không bao giờ chạy 2 task cùng lúc', { timeout: 5000 }, async () => {
  const queue = new TaskQueue();
  const tracker = createTracker();
  const results = await Promise.all([
    queue.add(tracker.task('A', 30)),
    queue.add(tracker.task('B', 10)),
    queue.add(tracker.task('C', 20)),
  ]);
  assert.deepEqual(results, ['kết quả A', 'kết quả B', 'kết quả C']);
  assert.equal(tracker.maxRunning, 1, 'có lúc nhiều task chạy cùng lúc');
  assert.deepEqual(tracker.log, ['start A', 'end A', 'start B', 'end B', 'start C', 'end C']);
});

test('task lỗi: Promise của nó reject, hàng đợi vẫn chạy tiếp', { timeout: 5000 }, async () => {
  const queue = new TaskQueue();
  const tracker = createTracker();
  const a = queue.add(tracker.task('A', 10, { fail: true }));
  const b = queue.add(tracker.task('B', 10));
  await assert.rejects(a, { message: 'task A lỗi' });
  assert.equal(await b, 'kết quả B', 'task B vẫn phải chạy sau khi A lỗi');
});

test('onIdle: resolve khi mọi task đã xong', { timeout: 5000 }, async () => {
  const queue = new TaskQueue();
  const tracker = createTracker();
  queue.add(tracker.task('A', 20));
  queue.add(tracker.task('B', 20)).catch(() => {});
  const idle = queue.onIdle();
  assert.ok(idle instanceof Promise, 'onIdle phải trả về Promise');
  await idle;
  assert.deepEqual(tracker.log, ['start A', 'end A', 'start B', 'end B'], 'onIdle resolve trước khi các task xong');
});

test('onIdle: đang rảnh thì resolve ngay; add tiếp sau khi rảnh vẫn chạy', { timeout: 5000 }, async () => {
  const queue = new TaskQueue();
  const tracker = createTracker();
  const idle = queue.onIdle();
  assert.ok(idle instanceof Promise, 'onIdle phải trả về Promise');
  const start = performance.now();
  await idle;
  assert.ok(performance.now() - start < 50, 'hàng đợi rỗng thì onIdle phải resolve ngay');
  assert.equal(await queue.add(tracker.task('X', 10)), 'kết quả X');
  await queue.onIdle();
  assert.equal(await queue.add(tracker.task('Y', 10)), 'kết quả Y', 'hàng đợi phải dùng lại được sau khi rảnh');
});

test('size: số task đang chờ, không tính task đang chạy', { timeout: 5000 }, async () => {
  const queue = new TaskQueue();
  const tracker = createTracker();
  assert.equal(queue.size, 0);
  queue.add(tracker.task('A', 30));
  queue.add(tracker.task('B', 30));
  queue.add(tracker.task('C', 30));
  await delay(5);
  assert.equal(queue.size, 2, 'A đang chạy, B và C đang chờ');
  await queue.onIdle();
  assert.equal(queue.size, 0);
});
