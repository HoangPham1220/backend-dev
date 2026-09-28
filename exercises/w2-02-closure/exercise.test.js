import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createIdGenerator, createCart } from './exercise.js';

test('createIdGenerator: trả về một hàm', () => {
  assert.equal(typeof createIdGenerator('ORD'), 'function', 'createIdGenerator phải return một function');
});

test('createIdGenerator: sinh mã tăng dần, 4 chữ số', () => {
  const nextOrderId = createIdGenerator('ORD');
  assert.equal(nextOrderId(), 'ORD-0001');
  assert.equal(nextOrderId(), 'ORD-0002');
  assert.equal(nextOrderId(), 'ORD-0003');
});

test('createIdGenerator: đủ 4 chữ số khi số lớn hơn 9', () => {
  const next = createIdGenerator('SKU');
  let last;
  for (let i = 0; i < 12; i += 1) last = next();
  assert.equal(last, 'SKU-0012');
});

test('createIdGenerator: mỗi generator đếm riêng', () => {
  const nextOrderId = createIdGenerator('ORD');
  const nextInvoiceId = createIdGenerator('INV');
  nextOrderId();
  nextOrderId();
  assert.equal(nextInvoiceId(), 'INV-0001', 'generator INV không được dùng chung bộ đếm với ORD');
  assert.equal(nextOrderId(), 'ORD-0003');
});

test('createCart: add, total, count', () => {
  const cart = createCart();
  cart.add('TSHIRT', 150000, 2);
  cart.add('CAP', 90000, 1);
  assert.equal(cart.total(), 390000);
  assert.equal(cart.count(), 3);
});

test('createCart: giỏ rỗng có total và count bằng 0', () => {
  const cart = createCart();
  assert.equal(cart.total(), 0);
  assert.equal(cart.count(), 0);
});

test('createCart: add sku đã có thì cộng dồn quantity', () => {
  const cart = createCart();
  cart.add('TSHIRT', 150000, 2);
  cart.add('TSHIRT', 150000, 3);
  assert.equal(cart.count(), 5);
  assert.equal(cart.total(), 750000);
});

test('createCart: remove xoá item, sku không có thì bỏ qua', () => {
  const cart = createCart();
  cart.add('TSHIRT', 150000, 2);
  cart.add('CAP', 90000, 1);
  cart.remove('TSHIRT');
  cart.remove('KHONG_CO');
  assert.equal(cart.total(), 90000);
  assert.equal(cart.count(), 1);
});

test('createCart: danh sách item là riêng tư', () => {
  const cart = createCart();
  cart.add('TSHIRT', 150000, 2);
  assert.deepEqual(
    Object.keys(cart).sort(),
    ['add', 'count', 'remove', 'total'],
    'object trả về chỉ được có 4 phương thức, không để lộ dữ liệu item',
  );
});

test('createCart: hai giỏ không dùng chung dữ liệu', () => {
  const cartA = createCart();
  const cartB = createCart();
  cartA.add('TSHIRT', 150000, 1);
  assert.equal(cartB.count(), 0, 'thêm vào giỏ A không được ảnh hưởng giỏ B');
});
