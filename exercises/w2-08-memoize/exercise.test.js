import { test } from 'node:test';
import assert from 'node:assert/strict';
import { memoize, createPriceCache } from './exercise.js';

// Hàm giả có đếm số lần gọi.
function createCountingTotal() {
  const calls = [];
  const total = (items, discount = 0) => {
    calls.push(items);
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0) - discount;
  };
  return { total, calls };
}

function createFakePriceApi(prices) {
  const calls = [];
  const fetchPrice = (sku) => {
    calls.push(sku);
    return prices[sku];
  };
  return { fetchPrice, calls };
}

test('memoize: trả đúng kết quả và chỉ gọi hàm gốc một lần cho cùng tham số', () => {
  const { total, calls } = createCountingTotal();
  const fastTotal = memoize(total);
  const items = [{ price: 100000, quantity: 2 }];

  assert.equal(fastTotal(items), 200000);
  assert.equal(fastTotal(items), 200000);
  assert.equal(calls.length, 1, 'lần gọi thứ hai phải lấy từ cache');
});

test('memoize: object khác tham chiếu nhưng cùng nội dung vẫn dùng cache', () => {
  const { total, calls } = createCountingTotal();
  const fastTotal = memoize(total);

  assert.equal(fastTotal([{ price: 50000, quantity: 1 }]), 50000);
  assert.equal(fastTotal([{ price: 50000, quantity: 1 }]), 50000);
  assert.equal(calls.length, 1, 'khóa cache là JSON.stringify(args), không phải tham chiếu');
});

test('memoize: tham số khác thì gọi hàm gốc, kể cả khác ở tham số thứ hai', () => {
  const { total, calls } = createCountingTotal();
  const fastTotal = memoize(total);
  const items = [{ price: 100000, quantity: 1 }];

  assert.equal(fastTotal(items), 100000);
  assert.equal(fastTotal(items, 20000), 80000, 'tham số thứ hai cũng phải nằm trong khóa cache');
  assert.equal(fastTotal([{ price: 1000, quantity: 3 }]), 3000);
  assert.equal(calls.length, 3);
});

test('memoize: clear() xoá cache', () => {
  const { total, calls } = createCountingTotal();
  const fastTotal = memoize(total);
  const items = [{ price: 100000, quantity: 1 }];

  fastTotal(items);
  assert.equal(typeof fastTotal.clear, 'function', 'hàm trả về phải có method clear()');
  fastTotal.clear();
  assert.equal(fastTotal(items), 100000);
  assert.equal(calls.length, 2, 'sau clear() phải gọi lại hàm gốc');
});

test('memoize: hai hàm memoize khác nhau có cache riêng', () => {
  const a = createCountingTotal();
  const b = createCountingTotal();
  const fastA = memoize(a.total);
  const fastB = memoize(b.total);
  const items = [{ price: 1000, quantity: 1 }];

  assert.equal(fastA(items), 1000);
  assert.equal(fastB(items), 1000);
  assert.equal(b.calls.length, 1, 'cache của fastA không được dùng chung cho fastB');
});

test('createPriceCache: lấy từ cache khi chưa hết hạn', () => {
  let fakeTime = 0;
  const api = createFakePriceApi({ CAP: 90000 });
  const cache = createPriceCache(api.fetchPrice, 1000, () => fakeTime);

  assert.equal(cache.get('CAP'), 90000);
  fakeTime = 999;
  assert.equal(cache.get('CAP'), 90000);
  assert.deepEqual(api.calls, ['CAP'], 'chưa hết hạn thì không gọi fetchPrice lần hai');
});

test('createPriceCache: gọi lại fetchPrice khi đúng hoặc quá thời hạn', () => {
  let fakeTime = 0;
  const prices = { CAP: 90000 };
  const api = createFakePriceApi(prices);
  const cache = createPriceCache(api.fetchPrice, 1000, () => fakeTime);

  cache.get('CAP');
  prices.CAP = 95000;
  fakeTime = 1000;
  assert.equal(cache.get('CAP'), 95000, 'now() - savedAt >= ttlMs là hết hạn');
  assert.equal(api.calls.length, 2);

  fakeTime = 1500;
  assert.equal(cache.get('CAP'), 95000, 'thời điểm lưu phải được cập nhật sau khi fetch lại');
  assert.equal(api.calls.length, 2);
});

test('createPriceCache: mỗi sku được cache riêng', () => {
  const api = createFakePriceApi({ CAP: 90000, SOCK: 30000 });
  const cache = createPriceCache(api.fetchPrice, 1000, () => 0);

  assert.equal(cache.get('CAP'), 90000);
  assert.equal(cache.get('SOCK'), 30000);
  assert.equal(cache.get('CAP'), 90000);
  assert.deepEqual(api.calls, ['CAP', 'SOCK']);
});

test('createPriceCache: invalidate(sku) buộc lấy giá mới', () => {
  const prices = { CAP: 90000, SOCK: 30000 };
  const api = createFakePriceApi(prices);
  const cache = createPriceCache(api.fetchPrice, 60000, () => 0);

  cache.get('CAP');
  cache.get('SOCK');
  prices.CAP = 85000;
  cache.invalidate('CAP');

  assert.equal(cache.get('CAP'), 85000);
  assert.equal(cache.get('SOCK'), 30000);
  assert.deepEqual(api.calls, ['CAP', 'SOCK', 'CAP'], 'chỉ sku bị invalidate mới phải fetch lại');
});
