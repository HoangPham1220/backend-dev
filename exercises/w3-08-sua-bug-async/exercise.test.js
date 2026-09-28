import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  saveAllOrders,
  getProductPrice,
  getStockOrZero,
  fetchPrices,
  getOrderTotal,
} from './exercise.js';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const products = {
  1: { id: 1, price: 150000 },
  2: { id: 2, price: 250000 },
  3: { id: 3, price: 90000 },
};

// fetchProduct giả: chờ một chút rồi trả sản phẩm, id nằm trong failIds thì reject.
function createFetchProduct(failIds = []) {
  return async (id) => {
    await delay(10);
    if (failIds.includes(id)) throw new Error(`Không lấy được sản phẩm ${id}`);
    return products[id];
  };
}

test('saveAllOrders: resolve khi mọi đơn đã lưu xong, trả số đơn', { timeout: 5000 }, async () => {
  const saved = [];
  const saveOrder = async (order) => {
    await delay(20);
    saved.push(order.id);
  };
  const count = await saveAllOrders([{ id: 1 }, { id: 2 }, { id: 3 }], saveOrder);
  assert.equal(saved.length, 3, 'lúc saveAllOrders resolve, cả 3 đơn phải được lưu xong rồi');
  assert.equal(count, 3, 'phải trả về số đơn đã lưu');
});

test('getProductPrice: trả giá của sản phẩm', { timeout: 5000 }, async () => {
  assert.equal(await getProductPrice(1, createFetchProduct()), 150000);
  assert.equal(await getProductPrice(3, createFetchProduct()), 90000);
});

test('getStockOrZero: trả tồn kho khi lấy được, trả 0 khi fetchStock reject', { timeout: 5000 }, async () => {
  const okStock = async () => {
    await delay(10);
    return 12;
  };
  const brokenStock = async () => {
    await delay(10);
    throw new Error('Kho không phản hồi');
  };
  assert.equal(await getStockOrZero('TSHIRT-M', okStock), 12);
  assert.equal(await getStockOrZero('TSHIRT-M', brokenStock), 0, 'fetchStock lỗi thì trả 0, không được reject');
});

test('fetchPrices: sản phẩm lỗi là null, sản phẩm khác vẫn có giá đúng thứ tự', { timeout: 5000 }, async () => {
  assert.deepEqual(await fetchPrices([3, 1], createFetchProduct()), [90000, 150000], 'không lỗi: đủ giá, đúng thứ tự');
  assert.deepEqual(
    await fetchPrices([1, 2, 3], createFetchProduct([2])),
    [150000, null, 90000],
    'một sản phẩm lỗi không được làm mất giá của các sản phẩm khác',
  );
});

test('fetchPrices: vẫn chạy song song khi có sản phẩm lỗi', { timeout: 5000 }, async () => {
  const slowFetch = async (id) => {
    await delay(100);
    if (id === 2) throw new Error('Không lấy được sản phẩm 2');
    return products[id];
  };
  const start = performance.now();
  const prices = await fetchPrices([1, 2, 3], slowFetch);
  const elapsed = performance.now() - start;
  assert.deepEqual(prices, [150000, null, 90000]);
  assert.ok(elapsed < 250, `3 sản phẩm × 100ms chạy song song phải ~100ms, của bạn ${Math.round(elapsed)}ms`);
});

test('getOrderTotal: trả tổng price * quantity', { timeout: 5000 }, async () => {
  const fetchOrder = async (id) => {
    await delay(10);
    return {
      id,
      items: [
        { sku: 'TSHIRT-M', price: 150000, quantity: 2 },
        { sku: 'CAP', price: 80000, quantity: 1 },
      ],
    };
  };
  assert.equal(await getOrderTotal(7, fetchOrder), 380000);
});
