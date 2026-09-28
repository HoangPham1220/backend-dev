import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyDiscount, mergeShippingAddress, summarizeOrder } from './exercise.js';

test('applyDiscount: giảm giá theo phần trăm, giữ các thuộc tính khác', () => {
  const product = { sku: 'TSHIRT-01', name: 'Áo thun', price: 150000 };
  assert.deepEqual(applyDiscount(product, 10), { sku: 'TSHIRT-01', name: 'Áo thun', price: 135000 });
});

test('applyDiscount: làm tròn bằng Math.round', () => {
  assert.equal(applyDiscount({ sku: 'X', price: 99999 }, 15).price, 84999, '99999 * 0.85 = 84999.15 → 84999');
  assert.equal(applyDiscount({ sku: 'Y', price: 10001 }, 50).price, 5001, '10001 * 0.5 = 5000.5 → 5001');
});

test('applyDiscount: không sửa object gốc', () => {
  const product = { sku: 'TSHIRT-01', name: 'Áo thun', price: 150000 };
  const result = applyDiscount(product, 20);
  assert.equal(result?.price, 120000, 'giá sau giảm 20% phải là 120000');
  assert.equal(product.price, 150000, 'object gốc bị sửa: trong JS gán object là dùng chung tham chiếu');
  assert.notEqual(result, product, 'phải trả về object mới, không phải chính object cũ');
});

test('applyDiscount: giảm 0% vẫn trả về object mới', () => {
  const product = { sku: 'A', price: 1000 };
  const result = applyDiscount(product, 0);
  assert.deepEqual(result, { sku: 'A', price: 1000 });
  assert.notEqual(result, product);
});

test('mergeShippingAddress: key trong override thắng, giữ key còn lại', () => {
  const result = mergeShippingAddress(
    { city: 'Hà Nội', country: 'VN', phone: '0900000000' },
    { city: 'Đà Nẵng', street: '12 Bạch Đằng' },
  );
  assert.deepEqual(result, { city: 'Đà Nẵng', country: 'VN', phone: '0900000000', street: '12 Bạch Đằng' });
});

test('mergeShippingAddress: không sửa hai object đầu vào', () => {
  const defaults = { city: 'Hà Nội', country: 'VN' };
  const override = { city: 'Huế' };
  const result = mergeShippingAddress(defaults, override);
  assert.deepEqual(result, { city: 'Huế', country: 'VN' });
  assert.deepEqual(defaults, { city: 'Hà Nội', country: 'VN' }, 'defaults bị sửa');
  assert.deepEqual(override, { city: 'Huế' }, 'override bị sửa');
});

test('summarizeOrder: đúng định dạng chuỗi', () => {
  const order = {
    id: 12,
    customer: { name: 'Nguyễn Văn A', email: 'a@example.com' },
    items: [
      { sku: 'A', price: 100000, quantity: 2 },
      { sku: 'B', price: 250000, quantity: 1 },
    ],
  };
  assert.equal(summarizeOrder(order), 'Đơn #12 - Nguyễn Văn A - 3 sản phẩm - 450000đ');
});

test('summarizeOrder: đơn không có item', () => {
  const order = { id: 7, customer: { name: 'Trần B', email: 'b@example.com' }, items: [] };
  assert.equal(summarizeOrder(order), 'Đơn #7 - Trần B - 0 sản phẩm - 0đ');
});
