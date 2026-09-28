import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAsyncCache } from './exercise.js';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// loader giả: đếm số lần gọi theo key, chờ 30ms rồi trả sản phẩm. sku trong failOnce lỗi ở lần gọi đầu.
function createLoader({ failOnce = [] } = {}) {
  const loader = async (sku) => {
    loader.calls[sku] = (loader.calls[sku] ?? 0) + 1;
    await delay(30);
    if (failOnce.includes(sku) && loader.calls[sku] === 1) {
      throw new Error(`DB timeout khi lấy ${sku}`);
    }
    return { sku, price: 80000 };
  };
  loader.calls = {};
  return loader;
}

test('get: trả Promise kết quả của loader', { timeout: 5000 }, async () => {
  const cache = createAsyncCache(createLoader());
  const result = cache.get('CAP');
  assert.ok(result instanceof Promise, 'get phải luôn trả Promise');
  assert.deepEqual(await result, { sku: 'CAP', price: 80000 });
});

test('nhiều get đồng thời cùng key chỉ gọi loader 1 lần', { timeout: 5000 }, async () => {
  const loader = createLoader();
  const cache = createAsyncCache(loader);
  const results = await Promise.all([cache.get('CAP'), cache.get('CAP'), cache.get('CAP')]);
  assert.equal(loader.calls.CAP, 1, 'cache stampede: loader bị gọi nhiều lần khi các get chạy đồng thời');
  assert.deepEqual(results[2], { sku: 'CAP', price: 80000 });
});

test('get lần sau (tuần tự) dùng cache, key khác gọi loader riêng', { timeout: 5000 }, async () => {
  const loader = createLoader();
  const cache = createAsyncCache(loader);
  await cache.get('CAP');
  await cache.get('CAP');
  await cache.get('TSHIRT-M');
  assert.deepEqual(loader.calls, { CAP: 1, 'TSHIRT-M': 1 });
  assert.equal(cache.size, 2);
});

test('loader lỗi: reject đúng lỗi, không cache lỗi', { timeout: 5000 }, async () => {
  const loader = createLoader({ failOnce: ['CAP'] });
  const cache = createAsyncCache(loader);
  const [first, second] = await Promise.allSettled([cache.get('CAP'), cache.get('CAP')]);
  assert.equal(first.status, 'rejected', 'get phải reject khi loader lỗi');
  assert.equal(first.reason.message, 'DB timeout khi lấy CAP');
  assert.equal(second.status, 'rejected', 'get đồng thời dùng chung lần gọi lỗi đó');
  assert.equal(loader.calls.CAP, 1);
  assert.equal(cache.size, 0, 'lỗi không được nằm lại trong cache');
  assert.deepEqual(await cache.get('CAP'), { sku: 'CAP', price: 80000 }, 'lần sau phải gọi loader lại');
  assert.equal(loader.calls.CAP, 2);
});

test('delete: xoá key, lần get sau gọi loader lại', { timeout: 5000 }, async () => {
  const loader = createLoader();
  const cache = createAsyncCache(loader);
  await cache.get('CAP');
  cache.delete('CAP');
  assert.equal(cache.size, 0);
  await cache.get('CAP');
  assert.equal(loader.calls.CAP, 2);
});
