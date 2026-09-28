import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildOrderReport } from './exercise.js';

const makeOrders = () => [
  {
    id: 1,
    status: 'paid',
    items: [
      { sku: 'TSHIRT-01', price: 150000, quantity: 2 },
      { sku: 'CAP-02', price: 90000, quantity: 1 },
    ],
  },
  { id: 2, status: 'cancelled', items: [{ sku: 'BAG-03', price: 200000, quantity: 5 }] },
  { id: 3, status: 'shipped', items: [{ sku: 'CAP-02', price: 90000, quantity: 3 }] },
  { id: 4, status: 'pending', items: [{ sku: 'TSHIRT-01', price: 150000, quantity: 1 }] },
];

test('buildOrderReport: ví dụ trong đề', () => {
  assert.deepEqual(buildOrderReport(makeOrders()), {
    orderCount: 2,
    revenue: 660000,
    topSku: 'CAP-02',
    averageOrderValue: 330000,
  });
});

test('buildOrderReport: bỏ qua đơn pending và cancelled', () => {
  const report = buildOrderReport(makeOrders());
  assert.equal(report?.orderCount, 2, 'chỉ đếm đơn paid hoặc shipped');
  assert.notEqual(report.topSku, 'BAG-03', 'BAG-03 chỉ nằm trong đơn cancelled, không được tính');
});

test('buildOrderReport: không có đơn hợp lệ', () => {
  const empty = { orderCount: 0, revenue: 0, topSku: null, averageOrderValue: 0 };
  assert.deepEqual(buildOrderReport([]), empty, 'array rỗng');
  assert.deepEqual(
    buildOrderReport([{ id: 1, status: 'pending', items: [{ sku: 'A', price: 1000, quantity: 1 }] }]),
    empty,
    'chỉ có đơn pending: averageOrderValue là 0 chứ không phải NaN (0/0)',
  );
});

test('buildOrderReport: hòa quantity thì lấy SKU xuất hiện trước', () => {
  const orders = [
    { id: 1, status: 'paid', items: [{ sku: 'B', price: 1000, quantity: 2 }, { sku: 'A', price: 1000, quantity: 1 }] },
    { id: 2, status: 'paid', items: [{ sku: 'A', price: 1000, quantity: 1 }] },
  ];
  assert.equal(buildOrderReport(orders)?.topSku, 'B', 'A và B cùng tổng 2, B xuất hiện trước');
});

test('buildOrderReport: topSku theo tổng quantity, không theo doanh thu', () => {
  const orders = [
    { id: 1, status: 'shipped', items: [{ sku: 'CHEAP', price: 1000, quantity: 5 }] },
    { id: 2, status: 'paid', items: [{ sku: 'PRICEY', price: 1000000, quantity: 1 }] },
  ];
  assert.equal(buildOrderReport(orders)?.topSku, 'CHEAP');
});

test('buildOrderReport: averageOrderValue làm tròn bằng Math.round', () => {
  const orders = [
    { id: 1, status: 'paid', items: [{ sku: 'A', price: 100000, quantity: 1 }] },
    { id: 2, status: 'paid', items: [{ sku: 'B', price: 100001, quantity: 1 }] },
  ];
  const report = buildOrderReport(orders);
  assert.equal(report?.revenue, 200001);
  assert.equal(report.averageOrderValue, 100001, '200001 / 2 = 100000.5 → 100001');
});

test('buildOrderReport: không sửa dữ liệu đầu vào', () => {
  const orders = makeOrders();
  const snapshot = JSON.parse(JSON.stringify(orders));
  const report = buildOrderReport(orders);
  assert.equal(report?.orderCount, 2);
  assert.deepEqual(orders, snapshot, 'orders gốc bị thay đổi');
});
