import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LRUCache } from './exercise.js';

function clock() {
  const c = { t: 0 };
  c.now = () => c.t;
  return c;
}

test('set/get cơ bản, key không có trả undefined, set trả về chính cache', () => {
  const cache = new LRUCache({ max: 3 });
  assert.equal(cache.set('a', 1), cache, 'set phải trả về this để gọi nối tiếp');
  cache.set('b', { price: 100 });
  assert.equal(cache.get('a'), 1);
  assert.deepEqual(cache.get('b'), { price: 100 });
  assert.equal(cache.get('x'), undefined);
  assert.equal(cache.size, 2);
});

test('vượt max thì xóa key ít dùng gần đây nhất', () => {
  const cache = new LRUCache({ max: 2 });
  cache.set('a', 1).set('b', 2).set('c', 3);
  assert.equal(cache.has('a'), false, "'a' cũ nhất phải bị xóa");
  assert.equal(cache.get('b'), 2);
  assert.equal(cache.get('c'), 3);
  assert.equal(cache.size, 2);
});

test('get làm key thành mới dùng nhất', () => {
  const cache = new LRUCache({ max: 2 });
  cache.set('a', 1).set('b', 2);
  cache.get('a');
  cache.set('c', 3);
  assert.equal(cache.has('b'), false, "sau get('a'), key ít dùng nhất là 'b'");
  assert.equal(cache.get('a'), 1);
});

test('set lại key đã có: cập nhật value và thứ tự, không xóa nhầm', () => {
  const cache = new LRUCache({ max: 2 });
  cache.set('a', 1).set('b', 2).set('a', 10).set('c', 3);
  assert.equal(cache.get('a'), 10);
  assert.equal(cache.has('b'), false, "set('a') lần hai làm 'a' mới dùng nhất, nên 'b' bị xóa");
  assert.equal(cache.size, 2);
});

test('has không làm thay đổi thứ tự dùng', () => {
  const cache = new LRUCache({ max: 2 });
  cache.set('a', 1).set('b', 2);
  assert.equal(cache.has('a'), true);
  cache.set('c', 3);
  assert.equal(cache.has('a'), false, "has('a') không được tính là 'dùng', nên 'a' vẫn bị xóa");
});

test('TTL: hết hạn khi now - lúc set >= ttlMs; size không tính phần tử hết hạn', () => {
  const c = clock();
  const cache = new LRUCache({ max: 5, ttlMs: 100, now: c.now });
  cache.set('a', 1);
  c.t = 50;
  cache.set('b', 2);
  c.t = 99;
  assert.equal(cache.get('a'), 1, 'chưa tới 100ms, vẫn còn');
  c.t = 100;
  assert.equal(cache.get('a'), undefined, 'đúng 100ms là hết hạn');
  assert.equal(cache.has('a'), false);
  assert.equal(cache.size, 1, "chỉ còn 'b'");
  c.t = 150;
  assert.equal(cache.size, 0);
});

test('set lại key tính lại TTL từ đầu', () => {
  const c = clock();
  const cache = new LRUCache({ max: 5, ttlMs: 100, now: c.now });
  cache.set('a', 1);
  c.t = 80;
  cache.set('a', 2);
  c.t = 150;
  assert.equal(cache.get('a'), 2, 'set lúc 80 thì hết hạn lúc 180');
});

test('delete và max không hợp lệ', () => {
  const cache = new LRUCache({ max: 2 });
  cache.set('a', 1);
  assert.equal(cache.delete('a'), true);
  assert.equal(cache.delete('a'), false);
  assert.equal(cache.size, 0);
  assert.throws(() => new LRUCache({ max: 0 }), RangeError);
  assert.throws(() => new LRUCache({ max: 2.5 }), RangeError);
  assert.throws(() => new LRUCache({}), RangeError);
});

test('wrap: gọi đồng thời cùng key chỉ gọi loader một lần, lần sau lấy từ cache', { timeout: 5000 }, async () => {
  const cache = new LRUCache({ max: 10 });
  let calls = 0;
  const loader = async (key) => {
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, 20));
    return `giá của ${key}`;
  };
  const results = await Promise.all([cache.wrap('A1', loader), cache.wrap('A1', loader), cache.wrap('A1', loader)]);
  assert.deepEqual(results, ['giá của A1', 'giá của A1', 'giá của A1']);
  assert.equal(calls, 1, 'ba lời gọi đồng thời chỉ được gọi loader một lần');
  assert.equal(await cache.wrap('A1', loader), 'giá của A1');
  assert.equal(calls, 1, 'đã có trong cache thì không gọi loader nữa');
  assert.equal(cache.get('A1'), 'giá của A1');
});

test('wrap: loader lỗi thì mọi lời gọi đang chờ đều lỗi và không cache lỗi', { timeout: 5000 }, async () => {
  const cache = new LRUCache({ max: 10 });
  let calls = 0;
  const failing = async () => {
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, 10));
    throw new Error('DB tạm lỗi');
  };
  const settled = await Promise.allSettled([cache.wrap('k', failing), cache.wrap('k', failing)]);
  assert.deepEqual(settled.map((s) => s.status), ['rejected', 'rejected']);
  assert.equal(settled[0].reason.message, 'DB tạm lỗi');
  assert.equal(calls, 1);
  assert.equal(cache.has('k'), false, 'không được lưu lỗi vào cache');
  assert.equal(await cache.wrap('k', async () => 'ok'), 'ok', 'lần sau phải gọi lại loader');
});

test('thao tác O(1): 200.000 lần set/get với max 50.000 chạy nhanh', { timeout: 15000 }, () => {
  // Ngưỡng 5 giây rất rộng cho Map (thường < 1 giây) nhưng cách làm O(n) như mảng + indexOf
  // sẽ mất hàng chục giây. Vòng lặp tự dừng sớm khi vượt ngưỡng để test không treo lâu.
  const LIMIT_MS = 5000;
  const cache = new LRUCache({ max: 50_000 });
  const start = performance.now();
  let elapsed = 0;
  for (let i = 0; i < 100_000; i += 1) {
    cache.set(`k${i}`, i);
    cache.get(`k${i >> 1}`);
    if (i % 1000 === 0 && (elapsed = performance.now() - start) > LIMIT_MS) break;
  }
  elapsed = performance.now() - start;
  assert.ok(elapsed < LIMIT_MS, `mất hơn ${LIMIT_MS}ms: có lẽ đang dùng mảng + indexOf (O(n)), hãy dùng Map`);
  assert.equal(cache.size, 50_000);
  assert.equal(cache.get('k99999'), 99_999);
});
