import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProduct, normalizeAll } from './exercise.js';

test('normalizeProduct: chuẩn hóa sku, tên, giá có dấu chấm, tồn kho chuỗi', () => {
  assert.deepEqual(normalizeProduct({ sku: ' ts-01 ', name: ' Áo thun ', price: '1.250.000', stock: '5' }), {
    sku: 'TS-01',
    name: 'Áo thun',
    price: 1250000,
    stock: 5,
  });
});

test('normalizeProduct: giá và tồn kho dạng số giữ nguyên, thiếu stock thành 0', () => {
  assert.deepEqual(normalizeProduct({ sku: 'A', name: 'Mũ', price: 99000 }), {
    sku: 'A',
    name: 'Mũ',
    price: 99000,
    stock: 0,
  });
  assert.equal(normalizeProduct({ sku: 'A', name: 'Mũ', price: ' 150000 ', stock: '' }).stock, 0, 'stock rỗng là 0');
  assert.equal(normalizeProduct({ sku: 'A', name: 'Mũ', price: ' 150000 ', stock: 7 }).price, 150000);
});

test('normalizeProduct: không sửa object đầu vào', () => {
  const raw = { sku: ' a ', name: ' Mũ ', price: '1.000' };
  const result = normalizeProduct(raw);
  assert.equal(result.sku, 'A');
  assert.deepEqual(raw, { sku: ' a ', name: ' Mũ ', price: '1.000' }, 'phải trả object mới');
});

test('normalizeProduct: thiếu sku hoặc tên', () => {
  assert.throws(() => normalizeProduct({ sku: '   ', name: 'Mũ', price: '1000' }), { message: 'Thiếu sku' });
  assert.throws(() => normalizeProduct({ name: 'Mũ', price: '1000' }), { message: 'Thiếu sku' });
  assert.throws(() => normalizeProduct({ sku: 'A', name: '', price: '1000' }), { message: 'Thiếu tên sản phẩm' });
  assert.throws(
    () => normalizeProduct({ sku: '', name: '', price: 'x' }),
    { message: 'Thiếu sku' },
    'kiểm tra sku trước tiên',
  );
});

test('normalizeProduct: giá không hợp lệ', () => {
  assert.throws(() => normalizeProduct({ sku: 'A', name: 'Mũ', price: 'abc' }), { message: 'Giá không hợp lệ: abc' });
  assert.throws(() => normalizeProduct({ sku: 'A', name: 'Mũ', price: '' }), {
    message: 'Giá không hợp lệ: ',
  }, 'Number("") là 0, nhưng giá rỗng phải là lỗi');
  assert.throws(() => normalizeProduct({ sku: 'A', name: 'Mũ', price: '-5000' }), {
    message: 'Giá không hợp lệ: -5000',
  });
  assert.throws(() => normalizeProduct({ sku: 'A', name: 'Mũ', price: '12,5' }), { message: 'Giá không hợp lệ: 12,5' });
  assert.throws(() => normalizeProduct({ sku: 'A', name: 'Mũ' }), { message: 'Giá không hợp lệ: undefined' });
});

test('normalizeProduct: tồn kho không hợp lệ', () => {
  assert.throws(() => normalizeProduct({ sku: 'A', name: 'Mũ', price: '1000', stock: 'nhiều' }), {
    message: 'Tồn kho không hợp lệ: nhiều',
  });
  assert.throws(() => normalizeProduct({ sku: 'A', name: 'Mũ', price: '1000', stock: -1 }), {
    message: 'Tồn kho không hợp lệ: -1',
  });
});

test('normalizeAll: gom mọi lỗi theo số dòng, không dừng ở lỗi đầu', () => {
  const rows = [
    { sku: 'a1', name: 'Áo', price: '100.000', stock: '3' },
    { sku: 'a2', name: '  ', price: '50000' },
    { sku: 'a3', name: 'Quần', price: 'free' },
    { sku: 'a4', name: 'Túi', price: 200000, stock: 1 },
  ];
  assert.deepEqual(normalizeAll(rows), {
    valid: [
      { sku: 'A1', name: 'Áo', price: 100000, stock: 3 },
      { sku: 'A4', name: 'Túi', price: 200000, stock: 1 },
    ],
    errors: [
      { row: 2, message: 'Thiếu tên sản phẩm' },
      { row: 3, message: 'Giá không hợp lệ: free' },
    ],
  });
});

test('normalizeAll: sku trùng (sau khi chuẩn hóa) là lỗi từ lần thứ hai', () => {
  const rows = [
    { sku: 'ts-01', name: 'Áo', price: '1000' },
    { sku: ' TS-01 ', name: 'Áo bản 2', price: '2000' },
    { sku: 'ts-02', name: 'Mũ', price: '3000' },
  ];
  const result = normalizeAll(rows);
  assert.deepEqual(result.valid.map((p) => p.sku), ['TS-01', 'TS-02']);
  assert.deepEqual(result.errors, [{ row: 2, message: 'Trùng sku: TS-01' }]);
});

test('normalizeAll: danh sách rỗng', () => {
  assert.deepEqual(normalizeAll([]), { valid: [], errors: [] });
});
