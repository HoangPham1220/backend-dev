import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createValidator } from './exercise.js';

const productSchema = {
  sku: { type: 'string', required: true, pattern: /^[A-Z0-9-]+$/ },
  name: { type: 'string', required: true, minLength: 3 },
  price: { type: 'number', required: true, min: 0 },
  discountPercent: { type: 'number', min: 0, max: 100 },
  active: { type: 'boolean' },
  tags: { type: 'array' },
};

// So sánh lỗi theo field + rule, và kiểm tra message là chuỗi không rỗng.
function assertErrors(result, expected) {
  assert.equal(typeof result, 'object', 'validate phải trả về object { valid, errors }');
  assert.equal(result.valid, expected.length === 0);
  assert.deepEqual(
    result.errors.map(({ field, rule }) => ({ field, rule })),
    expected,
  );
  for (const error of result.errors) {
    assert.ok(typeof error.message === 'string' && error.message.length > 0, `lỗi ${error.field} cần message`);
  }
}

test('createValidator trả về một hàm', () => {
  assert.equal(typeof createValidator(productSchema), 'function');
});

test('dữ liệu hợp lệ', () => {
  const validate = createValidator(productSchema);
  assertErrors(validate({ sku: 'TSHIRT-01', name: 'Áo thun', price: 150000 }), []);
  assertErrors(
    validate({
      sku: 'CAP',
      name: 'Mũ lưỡi trai',
      price: 0,
      discountPercent: 100,
      active: false,
      tags: [],
      extra: 'field lạ bị bỏ qua',
    }),
    [],
  );
});

test('required: thiếu field hoặc null', () => {
  const validate = createValidator(productSchema);
  assertErrors(validate({ sku: null, price: 1000 }), [
    { field: 'sku', rule: 'required' },
    { field: 'name', rule: 'required' },
  ]);
});

test('field không bắt buộc bị thiếu thì bỏ qua mọi luật khác', () => {
  const validate = createValidator(productSchema);
  assertErrors(validate({ sku: 'A1', name: 'Áo thun', price: 1, discountPercent: undefined, tags: null }), []);
});

test('type: NaN không phải number, mảng phân biệt với object', () => {
  const validate = createValidator(productSchema);
  assertErrors(
    validate({ sku: 123, name: 'Áo thun', price: NaN, active: 'true', tags: { a: 1 } }),
    [
      { field: 'sku', rule: 'type' },
      { field: 'price', rule: 'type' },
      { field: 'active', rule: 'type' },
      { field: 'tags', rule: 'type' },
    ],
  );
});

test('min, max tính cả biên', () => {
  const validate = createValidator(productSchema);
  assertErrors(validate({ sku: 'A1', name: 'Áo thun', price: -1, discountPercent: 101 }), [
    { field: 'price', rule: 'min' },
    { field: 'discountPercent', rule: 'max' },
  ]);
  assertErrors(validate({ sku: 'A1', name: 'Áo thun', price: 0, discountPercent: 0 }), []);
});

test('minLength và pattern', () => {
  const validate = createValidator(productSchema);
  assertErrors(validate({ sku: 'áo thun', name: 'Áo', price: 1 }), [
    { field: 'sku', rule: 'pattern' },
    { field: 'name', rule: 'minLength' },
  ]);
});

test('mỗi field chỉ báo lỗi đầu tiên, lỗi theo thứ tự field trong schema', () => {
  const validate = createValidator({
    code: { type: 'string', minLength: 5, pattern: /^[0-9]+$/ },
    qty: { type: 'number', min: 1, max: 10 },
  });
  assertErrors(validate({ qty: 0, code: 'ab' }), [
    { field: 'code', rule: 'minLength' },
    { field: 'qty', rule: 'min' },
  ]);
});

test('data không phải object thì throw TypeError', () => {
  const validate = createValidator(productSchema);
  for (const bad of [null, undefined, 'sku', 42, ['A1']]) {
    assert.throws(() => validate(bad), { name: 'TypeError', message: 'data phải là object' }, `với ${JSON.stringify(bad)}`);
  }
});
