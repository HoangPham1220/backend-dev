import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getActiveProductNames, cartTotal, findOrderById, hasOutOfStock } from './exercise.js';

const orders = [
  { id: 101, customer: 'An', total: 300000 },
  { id: 102, customer: 'Bình', total: 150000 },
];

test('getActiveProductNames: lấy tên sản phẩm active, giữ thứ tự', () => {
  const products = [
    { name: 'Áo thun', active: true },
    { name: 'Mũ', active: false },
    { name: 'Túi', active: true },
  ];
  assert.deepEqual(getActiveProductNames(products), ['Áo thun', 'Túi']);
});

test('getActiveProductNames: không có sản phẩm active trả về array rỗng', () => {
  assert.deepEqual(getActiveProductNames([{ name: 'Mũ', active: false }]), []);
  assert.deepEqual(getActiveProductNames([]), []);
});

test('getActiveProductNames: không làm thay đổi array đầu vào', () => {
  const products = [{ name: 'Áo', active: true }, { name: 'Mũ', active: false }];
  assert.deepEqual(getActiveProductNames(products), ['Áo']);
  assert.equal(products.length, 2, 'filter/map tạo array mới, không sửa array gốc');
});

test('cartTotal: tổng price * quantity', () => {
  const items = [
    { sku: 'A', price: 100000, quantity: 2 },
    { sku: 'B', price: 50000, quantity: 1 },
  ];
  assert.equal(cartTotal(items), 250000);
});

test('cartTotal: giỏ rỗng trả về 0', () => {
  assert.equal(cartTotal([]), 0, 'reduce trên array rỗng cần giá trị khởi tạo');
});

test('findOrderById: tìm thấy trả về đơn hàng', () => {
  assert.equal(findOrderById(orders, 102), orders[1]);
});

test('findOrderById: không tìm thấy trả về null', () => {
  assert.equal(findOrderById(orders, 999), null, 'find trả về undefined khi không thấy, đề yêu cầu null');
});

test('findOrderById: id "101" (chuỗi) không khớp với 101 (số)', () => {
  assert.equal(findOrderById(orders, '101'), null, 'dùng === để so sánh, không dùng ==');
});

test('hasOutOfStock: có sản phẩm hết hàng', () => {
  assert.equal(hasOutOfStock([{ stock: 5 }, { stock: 0 }]), true);
});

test('hasOutOfStock: không có sản phẩm hết hàng hoặc array rỗng', () => {
  assert.equal(hasOutOfStock([{ stock: 5 }, { stock: 1 }]), false);
  assert.equal(hasOutOfStock([]), false);
});

test('không dùng vòng lặp for/while', () => {
  const raw = readFileSync(new URL('./exercise.js', import.meta.url), 'utf8');
  assert.ok(!raw.includes('TODO'), 'làm xong cả 4 hàm (xóa các dòng TODO) trước đã');
  const source = raw.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(source, /\bfor\s*\(|\bwhile\s*\(/, 'bài này yêu cầu dùng filter/map/reduce/find/some');
});
