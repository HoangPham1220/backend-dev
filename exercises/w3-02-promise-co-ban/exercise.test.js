import { test } from 'node:test';
import assert from 'node:assert/strict';
import { delay, getProductsSequential, getProductsParallel } from './exercise.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// fetchProduct giả: mất 100ms mỗi lần (hoặc theo bảng delays), ghi lại thứ tự gọi.
function createFetcher(delays = {}) {
  const calls = [];
  const fetchProduct = async (id) => {
    calls.push(id);
    await wait(delays[id] ?? 100);
    return { id, name: `Sản phẩm ${id}` };
  };
  return { fetchProduct, calls };
}

async function measure(fn) {
  const start = performance.now();
  const result = await fn();
  return { result, elapsed: performance.now() - start };
}

test('delay: trả về Promise và chờ đúng khoảng thời gian', { timeout: 5000 }, async () => {
  const promise = delay(100);
  assert.ok(promise instanceof Promise, 'delay(ms) phải trả về một Promise');
  const { elapsed } = await measure(() => promise);
  assert.ok(elapsed >= 90, `delay(100) chỉ chờ ${Math.round(elapsed)}ms, cần khoảng 100ms`);
  assert.ok(elapsed < 300, `delay(100) chờ tới ${Math.round(elapsed)}ms, quá lâu`);
});

test('getProductsSequential: trả sản phẩm đúng thứ tự ids', { timeout: 5000 }, async () => {
  const { fetchProduct } = createFetcher();
  const products = await getProductsSequential([3, 1, 2], fetchProduct);
  assert.deepEqual(
    products?.map((p) => p.id),
    [3, 1, 2],
    'kết quả phải là mảng sản phẩm theo đúng thứ tự ids',
  );
});

test('getProductsSequential: chạy lần lượt, tổng thời gian cộng dồn', { timeout: 5000 }, async () => {
  const { fetchProduct } = createFetcher();
  const { elapsed } = await measure(() => getProductsSequential([1, 2, 3], fetchProduct));
  assert.ok(
    elapsed >= 280,
    `3 việc x 100ms chạy tuần tự phải mất ~300ms, của bạn chỉ ${Math.round(elapsed)}ms. Có đang chạy song song không?`,
  );
});

test('getProductsParallel: chạy cùng lúc, tổng thời gian ~ việc chậm nhất', { timeout: 5000 }, async () => {
  const { fetchProduct } = createFetcher();
  const { result, elapsed } = await measure(() => getProductsParallel([1, 2, 3], fetchProduct));
  assert.deepEqual(result?.map((p) => p.id), [1, 2, 3]);
  assert.ok(
    elapsed < 200,
    `3 việc x 100ms chạy song song phải mất ~100ms, của bạn mất ${Math.round(elapsed)}ms. Có đang await từng cái không?`,
  );
});

test('getProductsParallel: giữ thứ tự ids dù việc sau xong trước', { timeout: 5000 }, async () => {
  // id 1 chậm nhất, id 3 nhanh nhất
  const { fetchProduct } = createFetcher({ 1: 150, 2: 80, 3: 10 });
  const products = await getProductsParallel([1, 2, 3], fetchProduct);
  assert.deepEqual(
    products?.map((p) => p.id),
    [1, 2, 3],
    'kết quả phải theo thứ tự ids, không theo thứ tự việc nào xong trước',
  );
});

test('cả hai hàm: mảng ids rỗng trả mảng rỗng', { timeout: 5000 }, async () => {
  const { fetchProduct } = createFetcher();
  assert.deepEqual(await getProductsSequential([], fetchProduct), []);
  assert.deepEqual(await getProductsParallel([], fetchProduct), []);
});
