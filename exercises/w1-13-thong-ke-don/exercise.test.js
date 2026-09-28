import { test } from 'node:test';
import assert from 'node:assert/strict';
import { revenueByDay, topCustomers } from './exercise.js';

const orders = [
  { id: 1, customer: 'An', total: 300000, status: 'paid', createdAt: '2026-10-01T09:00:00Z' },
  { id: 2, customer: 'Bình', total: 150000, status: 'cancelled', createdAt: '2026-10-01T10:00:00Z' },
  { id: 3, customer: 'An', total: 200000, status: 'shipped', createdAt: '2026-10-02T05:00:00+07:00' },
  { id: 4, customer: 'Chi', total: 500000, status: 'paid', createdAt: '2026-10-03T08:00:00Z' },
  { id: 5, customer: 'Bình', total: 100000, status: 'paid', createdAt: '2026-10-02T12:00:00Z' },
  { id: 6, customer: 'Dũng', total: 100000, status: 'pending', createdAt: '2026-10-02T13:00:00Z' },
];

test('revenueByDay: gom theo ngày UTC, bỏ đơn cancelled, sắp tăng dần', () => {
  assert.deepEqual(revenueByDay(orders), [
    { date: '2026-10-01', revenue: 500000, orderCount: 2 },
    { date: '2026-10-02', revenue: 200000, orderCount: 2 },
    { date: '2026-10-03', revenue: 500000, orderCount: 1 },
  ]);
});

test('revenueByDay: createdAt có múi giờ phải quy về UTC', () => {
  const result = revenueByDay([
    { id: 1, customer: 'An', total: 1000, status: 'paid', createdAt: '2026-10-02T05:00:00+07:00' },
  ]);
  assert.deepEqual(result, [{ date: '2026-10-01', revenue: 1000, orderCount: 1 }], '05:00 +07:00 ngày 02 là 22:00 UTC ngày 01');
});

test('revenueByDay: đầu vào không theo thứ tự thời gian vẫn ra kết quả tăng dần', () => {
  const result = revenueByDay([
    { id: 1, customer: 'An', total: 1000, status: 'paid', createdAt: '2026-11-05T00:00:00Z' },
    { id: 2, customer: 'An', total: 2000, status: 'paid', createdAt: '2026-10-20T00:00:00Z' },
  ]);
  assert.deepEqual(result.map((r) => r.date), ['2026-10-20', '2026-11-05']);
});

test('revenueByDay: không có đơn hợp lệ trả array rỗng', () => {
  assert.deepEqual(revenueByDay([]), []);
  assert.deepEqual(revenueByDay([orders[1]]), [], 'chỉ có đơn cancelled');
});

test('topCustomers: sắp theo chi tiêu giảm dần, bằng nhau thì theo tên', () => {
  assert.deepEqual(topCustomers(orders, 3), [
    { customer: 'An', spent: 500000, orderCount: 2 },
    { customer: 'Chi', spent: 500000, orderCount: 1 },
    { customer: 'Bình', spent: 100000, orderCount: 1 },
  ]);
});

test('topCustomers: n lớn hơn số khách thì trả hết', () => {
  const result = topCustomers(orders, 10);
  assert.equal(result.length, 4, 'An, Chi, Bình, Dũng (đơn cancelled của Bình không tính)');
  assert.deepEqual(result.at(-1), { customer: 'Dũng', spent: 100000, orderCount: 1 });
});

test('topCustomers: không sửa array đầu vào', () => {
  const input = [...orders];
  assert.equal(topCustomers(input, 1).length, 1);
  assert.deepEqual(input, orders, 'sort sửa array gốc: hãy sort trên array mới');
});
