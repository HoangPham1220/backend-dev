import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createOrder, getTopProducts, duplicateOrder, createSkuPrinters } from './exercise.js';

const makeProducts = () => [
  { sku: 'CAP', price: 90000 },
  { sku: 'JACKET', price: 450000 },
  { sku: 'TSHIRT', price: 150000 },
  { sku: 'SOCK', price: 30000 },
];

const makeOrder = () => ({
  id: 100,
  status: 'paid',
  shipping: { city: 'Hà Nội', street: '1 Tràng Tiền' },
  items: [
    { sku: 'TSHIRT', price: 150000, quantity: 2 },
    { sku: 'CAP', price: 90000, quantity: 1 },
  ],
});

test('createOrder: đơn tạo liên tiếp không dùng chung mảng tags', () => {
  const first = createOrder(1);
  const second = createOrder(2);
  assert.deepEqual(second.tags, ['new'], 'đơn thứ hai chỉ được có một tag "new"');
  assert.deepEqual(first.tags, ['new'], 'tạo đơn thứ hai không được làm đổi tags của đơn thứ nhất');
  assert.notEqual(first.tags, second.tags, 'mỗi đơn phải có mảng tags riêng');
});

test('createOrder: không sửa mảng tags truyền vào', () => {
  const vipTags = ['vip'];
  const order = createOrder(3, vipTags);
  assert.deepEqual(order.tags, ['vip', 'new']);
  assert.deepEqual(vipTags, ['vip'], 'mảng tags của người gọi phải giữ nguyên');
});

test('getTopProducts: trả top n theo giá giảm dần, mảng gốc giữ nguyên thứ tự', () => {
  const products = makeProducts();
  const top = getTopProducts(products, 2);
  assert.deepEqual(top.map((p) => p.sku), ['JACKET', 'TSHIRT']);
  assert.deepEqual(
    products.map((p) => p.sku),
    ['CAP', 'JACKET', 'TSHIRT', 'SOCK'],
    'thứ tự mảng products gốc không được thay đổi',
  );
});

test('duplicateOrder: bản nháp có id mới và status draft, đơn gốc giữ nguyên', () => {
  const order = makeOrder();
  const draft = duplicateOrder(order, 200);
  assert.equal(draft.id, 200);
  assert.equal(draft.status, 'draft');
  assert.equal(order.id, 100);
  assert.equal(order.status, 'paid');
  assert.deepEqual(draft.items, order.items, 'bản nháp phải có đủ item như đơn gốc');
  assert.notEqual(draft.items, order.items, 'bản nháp phải có mảng items riêng');
});

test('duplicateOrder: sửa items và địa chỉ của bản nháp không ảnh hưởng đơn gốc', () => {
  const order = makeOrder();
  const snapshot = structuredClone(order);
  const draft = duplicateOrder(order, 200);

  draft.items.push({ sku: 'SOCK', price: 30000, quantity: 5 });
  draft.items[0].quantity = 10;
  draft.shipping.city = 'Đà Nẵng';

  assert.deepEqual(order, snapshot, 'đơn gốc bị thay đổi khi sửa bản nháp');
});

test('createSkuPrinters: mỗi hàm trả về đúng sku của nó', () => {
  const printers = createSkuPrinters(['A1', 'B2', 'C3']);
  assert.equal(printers.length, 3);
  assert.equal(printers[0](), 'A1');
  assert.equal(printers[1](), 'B2');
  assert.equal(printers[2](), 'C3');
});
