import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getProductOrNull, fetchMany } from './exercise.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// fetchProduct giả: id >= 400 thì lỗi (reject) sau một khoảng chờ, giống API thật.
async function fetchProduct(id) {
  await wait(id >= 400 ? 20 : 100);
  if (id >= 400) {
    throw new Error(`Không tìm thấy sản phẩm ${id}`);
  }
  return { id, name: `Sản phẩm ${id}` };
}

test('getProductOrNull: trả sản phẩm khi lấy được', { timeout: 5000 }, async () => {
  assert.deepEqual(await getProductOrNull(1, fetchProduct), { id: 1, name: 'Sản phẩm 1' });
});

test('getProductOrNull: trả null khi fetchProduct lỗi, không để lỗi lọt ra', { timeout: 5000 }, async () => {
  let result;
  try {
    result = await getProductOrNull(404, fetchProduct);
  } catch (error) {
    assert.fail(`Lỗi lọt ra ngoài: "${error.message}". Bạn đã await bên trong try chưa?`);
  }
  assert.equal(result, null);
});

test('fetchMany: tách sản phẩm thành công và id lỗi, giữ thứ tự ids', { timeout: 5000 }, async () => {
  const result = await fetchMany([1, 404, 2, 500], fetchProduct);
  assert.deepEqual(result, {
    products: [
      { id: 1, name: 'Sản phẩm 1' },
      { id: 2, name: 'Sản phẩm 2' },
    ],
    failedIds: [404, 500],
  });
});

test('fetchMany: tất cả thành công thì failedIds rỗng', { timeout: 5000 }, async () => {
  const result = await fetchMany([3, 4], fetchProduct);
  assert.deepEqual(result?.failedIds, []);
  assert.deepEqual(result?.products.map((p) => p.id), [3, 4]);
});

test('fetchMany: gọi song song, không chờ từng cái', { timeout: 5000 }, async () => {
  const start = performance.now();
  const result = await fetchMany([1, 2, 3], fetchProduct);
  const elapsed = performance.now() - start;
  assert.deepEqual(result?.products.map((p) => p.id), [1, 2, 3]);
  assert.ok(
    elapsed < 200,
    `3 việc x 100ms chạy song song phải mất ~100ms, của bạn mất ${Math.round(elapsed)}ms`,
  );
});
