import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paginate, describePage } from './exercise.js';

const letters = ['A', 'B', 'C', 'D', 'E'];
const items45 = Array.from({ length: 45 }, (_, i) => `SKU-${i + 1}`);

test('paginate: trang giữa', () => {
  assert.deepEqual(paginate(letters, 2, 2), {
    data: ['C', 'D'],
    page: 2,
    perPage: 2,
    total: 5,
    totalPages: 3,
    hasNext: true,
  });
});

test('paginate: trang đầu và trang cuối thiếu phần tử', () => {
  assert.deepEqual(paginate(letters, 1, 2).data, ['A', 'B'], 'trang 1 bắt đầu từ index 0');
  const last = paginate(letters, 3, 2);
  assert.deepEqual(last.data, ['E']);
  assert.equal(last.hasNext, false, 'trang cuối không còn trang sau');
});

test('paginate: chia hết thì không có trang dư', () => {
  const result = paginate(['A', 'B', 'C', 'D'], 2, 2);
  assert.equal(result.totalPages, 2);
  assert.equal(result.hasNext, false);
});

test('paginate: page vượt quá số trang trả data rỗng', () => {
  assert.deepEqual(paginate(letters, 10, 2), {
    data: [],
    page: 10,
    perPage: 2,
    total: 5,
    totalPages: 3,
    hasNext: false,
  });
});

test('paginate: danh sách rỗng', () => {
  assert.deepEqual(paginate([], 1, 10), {
    data: [],
    page: 1,
    perPage: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
  });
});

test('paginate: tham số không hợp lệ ném RangeError có tên tham số', () => {
  assert.throws(() => paginate(letters, 0, 2), { name: 'RangeError', message: /page/ });
  assert.throws(() => paginate(letters, 1.5, 2), { name: 'RangeError', message: /page/ }, 'page phải là số nguyên');
  assert.throws(() => paginate(letters, '2', 2), { name: 'RangeError', message: /page/ }, 'chuỗi "2" không phải số');
  assert.throws(() => paginate(letters, 1, 0), { name: 'RangeError', message: /perPage/ });
  assert.throws(() => paginate(letters, 1, -5), { name: 'RangeError', message: /perPage/ });
});

test('paginate: không sửa array đầu vào', () => {
  const input = [...letters];
  assert.deepEqual(paginate(input, 1, 2).data, ['A', 'B']);
  assert.deepEqual(input, letters, 'dùng slice (không phải splice) để không sửa array gốc');
});

test('describePage: mô tả khoảng đang hiển thị', () => {
  assert.equal(describePage(paginate(items45, 1, 10)), 'Hiển thị 1-10 / 45 sản phẩm');
  assert.equal(describePage(paginate(items45, 2, 10)), 'Hiển thị 11-20 / 45 sản phẩm');
  assert.equal(describePage(paginate(items45, 5, 10)), 'Hiển thị 41-45 / 45 sản phẩm', 'trang cuối chỉ đến 45');
});

test('describePage: không có dữ liệu', () => {
  assert.equal(describePage(paginate([], 1, 10)), 'Không có sản phẩm nào');
  assert.equal(describePage(paginate(items45, 9, 10)), 'Không có sản phẩm nào', 'trang vượt quá cũng không có dữ liệu');
});
