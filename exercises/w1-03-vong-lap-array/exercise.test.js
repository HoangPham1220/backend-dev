import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countInStock, findProductBySku, totalStockValue } from './exercise.js';

const makeProducts = () => [
  { sku: 'TSHIRT-01', name: 'Áo thun', price: 150000, stock: 10 },
  { sku: 'CAP-02', name: 'Mũ lưỡi trai', price: 90000, stock: 0 },
  { sku: 'BAG-03', name: 'Túi vải', price: 200000, stock: 3 },
];

test('countInStock: chỉ đếm sản phẩm có stock > 0', () => {
  assert.equal(countInStock(makeProducts()), 2);
});

test('countInStock: array rỗng trả về 0', () => {
  assert.equal(countInStock([]), 0, 'không có sản phẩm thì đếm được 0, không phải undefined');
});

test('countInStock: stock âm (dữ liệu lỗi) không tính là còn hàng', () => {
  assert.equal(countInStock([{ sku: 'X', price: 1, stock: -5 }]), 0);
});

test('findProductBySku: tìm thấy thì trả về đúng object trong array', () => {
  const products = makeProducts();
  const found = findProductBySku(products, 'CAP-02');
  assert.deepEqual(found, { sku: 'CAP-02', name: 'Mũ lưỡi trai', price: 90000, stock: 0 });
  assert.equal(found, products[1], 'nên trả về chính object trong array, không tạo object mới');
});

test('findProductBySku: không tìm thấy trả về null', () => {
  assert.equal(findProductBySku(makeProducts(), 'NOPE'), null, 'không tìm thấy phải là null, không phải undefined');
  assert.equal(findProductBySku([], 'CAP-02'), null);
});

test('findProductBySku: so khớp chính xác, phân biệt hoa thường', () => {
  assert.equal(findProductBySku(makeProducts(), 'cap-02'), null, '"cap-02" khác "CAP-02"');
});

test('totalStockValue: tổng price * stock', () => {
  assert.equal(totalStockValue(makeProducts()), 2100000);
});

test('totalStockValue: array rỗng trả về 0', () => {
  assert.equal(totalStockValue([]), 0);
});
