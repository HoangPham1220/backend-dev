import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateShipping, isValidQuantity } from './exercise.js';

test('calculateShipping: đơn từ 500000 trở lên được miễn ship', () => {
  assert.equal(calculateShipping(600000, 'danang'), 0);
  assert.equal(calculateShipping(500000, 'hue'), 0, 'đúng 500000 cũng được miễn ship (>=)');
});

test('calculateShipping: hanoi và hcm tính 20000', () => {
  assert.equal(calculateShipping(200000, 'hcm'), 20000);
  assert.equal(calculateShipping(0, 'hanoi'), 20000, 'orderTotal = 0 vẫn hợp lệ');
});

test('calculateShipping: tỉnh khác tính 35000', () => {
  assert.equal(calculateShipping(200000, 'hue'), 35000);
  assert.equal(calculateShipping(499999, 'danang'), 35000);
});

test('calculateShipping: đầu vào không hợp lệ trả về null', () => {
  assert.equal(calculateShipping('200000', 'hcm'), null, 'chuỗi "200000" không phải số');
  assert.equal(calculateShipping(-1, 'hanoi'), null, 'số âm không hợp lệ');
  assert.equal(calculateShipping(NaN, 'hcm'), null, 'typeof NaN là "number" nhưng vẫn không hợp lệ');
  assert.equal(calculateShipping(undefined, 'hcm'), null, 'quên truyền tham số');
});

test('isValidQuantity: số nguyên dương là hợp lệ', () => {
  assert.equal(isValidQuantity(1), true);
  assert.equal(isValidQuantity(3), true);
});

test('isValidQuantity: các giá trị không hợp lệ', () => {
  assert.equal(isValidQuantity(0), false, '0 không phải số dương');
  assert.equal(isValidQuantity(-2), false);
  assert.equal(isValidQuantity(2.5), false, 'số lượng phải là số nguyên');
  assert.equal(isValidQuantity('2'), false, 'chuỗi "2" không phải số');
  assert.equal(isValidQuantity(NaN), false);
});
