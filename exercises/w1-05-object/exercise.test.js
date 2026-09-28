import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupOrdersByStatus, countByStatus, getCustomerEmails } from './exercise.js';

const makeOrders = () => [
  { id: 1, status: 'pending', email: 'an@example.com' },
  { id: 2, status: 'paid', email: 'binh@example.com' },
  { id: 3, status: 'pending', email: 'an@example.com' },
  { id: 4, status: 'shipped', email: 'chi@example.com' },
];

test('groupOrdersByStatus: nhóm đúng theo status, giữ thứ tự đơn', () => {
  const orders = makeOrders();
  assert.deepEqual(groupOrdersByStatus(orders), {
    pending: [orders[0], orders[2]],
    paid: [orders[1]],
    shipped: [orders[3]],
  });
});

test('groupOrdersByStatus: chỉ có key của status thực sự xuất hiện', () => {
  const result = groupOrdersByStatus([{ id: 9, status: 'paid', email: 'x@example.com' }]);
  assert.deepEqual(Object.keys(result), ['paid'], 'không tạo sẵn key cho status không có đơn nào');
});

test('groupOrdersByStatus: không có đơn trả về object rỗng', () => {
  assert.deepEqual(groupOrdersByStatus([]), {});
});

test('countByStatus: đếm số đơn theo status', () => {
  assert.deepEqual(countByStatus(makeOrders()), { pending: 2, paid: 1, shipped: 1 });
});

test('countByStatus: không có đơn trả về object rỗng', () => {
  assert.deepEqual(countByStatus([]), {});
});

test('getCustomerEmails: loại trùng, giữ thứ tự xuất hiện đầu tiên', () => {
  assert.deepEqual(getCustomerEmails(makeOrders()), ['an@example.com', 'binh@example.com', 'chi@example.com']);
});

test('getCustomerEmails: kết quả là array, không phải Set', () => {
  assert.ok(Array.isArray(getCustomerEmails(makeOrders())), 'nếu dùng Set, nhớ đổi lại thành array');
  assert.deepEqual(getCustomerEmails([]), []);
});
