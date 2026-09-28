import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addItemToCart, updateQuantity } from './exercise.js';

function makeCart() {
  return {
    items: [
      { sku: 'TSHIRT', price: 150000, quantity: 2 },
      { sku: 'CAP', price: 90000, quantity: 1 },
    ],
    updatedBy: 'admin',
  };
}

test('addItemToCart: thêm sku mới vào cuối giỏ', () => {
  const cart = makeCart();
  const next = addItemToCart(cart, { sku: 'SOCK', price: 30000, quantity: 3 });
  assert.deepEqual(next.items.map((item) => item.sku), ['TSHIRT', 'CAP', 'SOCK']);
  assert.deepEqual(next.items[2], { sku: 'SOCK', price: 30000, quantity: 3 });
  assert.equal(next.updatedBy, 'admin', 'giữ nguyên các thuộc tính khác của cart');
});

test('addItemToCart: sku đã có thì cộng dồn quantity, giữ vị trí', () => {
  const cart = makeCart();
  const next = addItemToCart(cart, { sku: 'TSHIRT', price: 150000, quantity: 1 });
  assert.equal(next.items.length, 2, 'không được thêm dòng trùng sku');
  assert.equal(next.items[0].sku, 'TSHIRT');
  assert.equal(next.items[0].quantity, 3);
});

test('addItemToCart: không sửa cart gốc, mảng items gốc hay item gốc', () => {
  const cart = makeCart();
  const originalItems = cart.items;
  const originalFirst = cart.items[0];
  const snapshot = structuredClone(cart);

  const next = addItemToCart(cart, { sku: 'TSHIRT', price: 150000, quantity: 1 });
  addItemToCart(cart, { sku: 'SOCK', price: 30000, quantity: 3 });

  assert.deepEqual(cart, snapshot, 'cart gốc đã bị thay đổi (mutate)');
  assert.notStrictEqual(next, cart, 'phải trả về object cart mới, không phải cart cũ');
  assert.notStrictEqual(next.items, originalItems, 'phải tạo mảng items mới');
  assert.notStrictEqual(next.items[0], originalFirst, 'item được cộng dồn phải là object mới');
  assert.equal(originalFirst.quantity, 2, 'object item cũ bị sửa quantity');
});

test('updateQuantity: đặt lại quantity', () => {
  const next = updateQuantity(makeCart(), 'CAP', 5);
  assert.equal(next.items[1].quantity, 5);
  assert.equal(next.items[0].quantity, 2, 'item khác giữ nguyên');
  assert.equal(next.updatedBy, 'admin');
});

test('updateQuantity: quantity = 0 thì xoá item', () => {
  const next = updateQuantity(makeCart(), 'TSHIRT', 0);
  assert.deepEqual(next.items.map((item) => item.sku), ['CAP']);
});

test('updateQuantity: sku không có thì nội dung giữ nguyên', () => {
  const cart = makeCart();
  const next = updateQuantity(cart, 'KHONG_CO', 3);
  assert.deepEqual(next, cart);
});

test('updateQuantity: không sửa dữ liệu gốc', () => {
  const cart = makeCart();
  const originalItems = cart.items;
  const snapshot = structuredClone(cart);

  const updated = updateQuantity(cart, 'CAP', 7);
  const removed = updateQuantity(cart, 'TSHIRT', 0);

  assert.deepEqual(cart, snapshot, 'cart gốc đã bị thay đổi (mutate)');
  assert.notStrictEqual(updated, cart, 'phải trả về object cart mới');
  assert.notStrictEqual(updated.items, originalItems, 'phải tạo mảng items mới');
  assert.notStrictEqual(removed.items, originalItems, 'xoá item cũng phải tạo mảng mới');
});
