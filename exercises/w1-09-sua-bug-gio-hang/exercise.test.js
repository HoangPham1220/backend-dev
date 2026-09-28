import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cartSubtotal, hasSku, addItem } from './exercise.js';

const sampleCart = () => [
  { sku: 'A', price: 100000, quantity: 2 },
  { sku: 'B', price: 50000, quantity: 1 },
];

test('cartSubtotal: tính tổng price * quantity', () => {
  assert.equal(cartSubtotal(sampleCart()), 250000);
});

test('cartSubtotal: giỏ rỗng trả về 0', () => {
  assert.equal(cartSubtotal([]), 0);
});

test('cartSubtotal: kết quả phải là number, không phải chuỗi', () => {
  const result = cartSubtotal([{ sku: 'A', price: 1000, quantity: 1 }]);
  assert.equal(typeof result, 'number', `nhận được ${JSON.stringify(result)} kiểu ${typeof result}`);
  assert.equal(result, 1000);
});

test('hasSku: so khớp đúng giá trị và đúng kiểu', () => {
  const items = [{ sku: '1001' }, { sku: 'B' }];
  assert.equal(hasSku(items, '1001'), true);
  assert.equal(hasSku(items, 'C'), false);
  assert.equal(hasSku(items, 1001), false, 'sku luôn là chuỗi; số 1001 không được khớp với "1001"');
});

test('addItem: thêm sku mới, trả về array mới', () => {
  const cart = sampleCart();
  const result = addItem(cart, { sku: 'C', price: 20000, quantity: 1 });
  assert.deepEqual(result, [...sampleCart(), { sku: 'C', price: 20000, quantity: 1 }]);
  assert.notEqual(result, cart, 'phải trả về array mới, không phải array đầu vào');
});

test('addItem: sku đã có thì cộng quantity, không sửa object item cũ', () => {
  const cart = sampleCart();
  const oldItem = cart[0];
  const result = addItem(cart, { sku: 'A', price: 100000, quantity: 3 });
  assert.equal(result[0].quantity, 5);
  assert.equal(oldItem.quantity, 2, 'object item trong giỏ cũ bị sửa: phải tạo object mới');
});

test('addItem: array đầu vào giữ nguyên sau khi gọi', () => {
  const cart = sampleCart();
  addItem(cart, { sku: 'C', price: 20000, quantity: 1 });
  addItem(cart, { sku: 'B', price: 50000, quantity: 1 });
  assert.deepEqual(cart, sampleCart(), 'giỏ gốc bị thay đổi');
});
