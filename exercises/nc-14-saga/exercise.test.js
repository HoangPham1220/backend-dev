import { test } from 'node:test';
import assert from 'node:assert/strict';
import { placeOrderSaga } from './exercise.js';

const ORDER = {
  id: 1001,
  customerId: 7,
  items: [{ sku: 'AO-001', quantity: 2 }],
  total: 300000,
  address: '12 Lê Lợi, Q1, HCM',
};

// Dựng các service giả. failOn: tên method sẽ throw.
function services(failOn = []) {
  const calls = [];
  const maybeFail = (name, value) => async (...args) => {
    calls.push([name, ...args]);
    if (failOn.includes(name)) throw new Error(`${name} lỗi`);
    return value;
  };
  return {
    calls,
    inventory: { reserve: maybeFail('reserve', 'RES-1'), release: maybeFail('release', undefined) },
    payment: { charge: maybeFail('charge', 'PAY-1'), refund: maybeFail('refund', undefined) },
    shipping: { create: maybeFail('create', 'SHIP-1') },
  };
}

async function run(failOn) {
  const s = services(failOn);
  const logs = [];
  const result = await placeOrderSaga({ order: ORDER, ...s, log: (entry) => logs.push(entry) });
  return { result, calls: s.calls, logs };
}

test('tất cả thành công → completed, gọi đúng tham số', async () => {
  const { result, calls, logs } = await run([]);
  assert.deepEqual(result, {
    status: 'completed',
    steps: [
      { name: 'reserveStock', status: 'done' },
      { name: 'chargePayment', status: 'done' },
      { name: 'createShipment', status: 'done' },
    ],
    result: { reservationId: 'RES-1', paymentId: 'PAY-1', shipmentId: 'SHIP-1' },
  });
  assert.deepEqual(calls, [
    ['reserve', ORDER.items],
    ['charge', 7, 300000],
    ['create', 1001, '12 Lê Lợi, Q1, HCM'],
  ]);
  assert.deepEqual(logs, [
    { step: 'reserveStock', action: 'run', status: 'ok' },
    { step: 'chargePayment', action: 'run', status: 'ok' },
    { step: 'createShipment', action: 'run', status: 'ok' },
  ]);
});

test('bước đầu lỗi → không có gì để bù, status compensated', async () => {
  const { result, calls } = await run(['reserve']);
  assert.deepEqual(result, {
    status: 'compensated',
    steps: [{ name: 'reserveStock', status: 'failed', error: 'reserve lỗi' }],
  });
  assert.deepEqual(calls.map((c) => c[0]), ['reserve'], 'không trừ tiền khi giữ hàng thất bại');
});

test('thanh toán lỗi → chỉ nhả hàng, không hoàn tiền', async () => {
  const { result, calls } = await run(['charge']);
  assert.equal(result.status, 'compensated');
  assert.deepEqual(result.steps, [
    { name: 'reserveStock', status: 'compensated' },
    { name: 'chargePayment', status: 'failed', error: 'charge lỗi' },
  ]);
  assert.deepEqual(calls, [['reserve', ORDER.items], ['charge', 7, 300000], ['release', 'RES-1']]);
});

test('vận chuyển lỗi → hoàn tiền trước, nhả hàng sau (thứ tự ngược)', async () => {
  const { result, calls, logs } = await run(['create']);
  assert.equal(result.status, 'compensated');
  assert.deepEqual(calls.map((c) => c.join(':')), ['reserve:' + ORDER.items, 'charge:7:300000', 'create:1001:12 Lê Lợi, Q1, HCM', 'refund:PAY-1', 'release:RES-1']);
  assert.deepEqual(result.steps, [
    { name: 'reserveStock', status: 'compensated' },
    { name: 'chargePayment', status: 'compensated' },
    { name: 'createShipment', status: 'failed', error: 'create lỗi' },
  ]);
  assert.equal(result.result, undefined, 'không completed thì không có result');
  assert.deepEqual(logs.slice(2), [
    { step: 'createShipment', action: 'run', status: 'error', error: 'create lỗi' },
    { step: 'chargePayment', action: 'compensate', status: 'ok' },
    { step: 'reserveStock', action: 'compensate', status: 'ok' },
  ]);
});

test('hoàn tiền lỗi → needs_manual_review, vẫn tiếp tục nhả hàng, không throw', async () => {
  const { result, calls, logs } = await run(['create', 'refund']);
  assert.equal(result.status, 'needs_manual_review');
  assert.deepEqual(result.steps, [
    { name: 'reserveStock', status: 'compensated' },
    { name: 'chargePayment', status: 'compensation_failed', error: 'refund lỗi' },
    { name: 'createShipment', status: 'failed', error: 'create lỗi' },
  ]);
  assert.ok(calls.some((c) => c[0] === 'release'), 'hoàn tiền lỗi vẫn phải nhả hàng');
  assert.deepEqual(
    logs.find((entry) => entry.action === 'compensate' && entry.status === 'error'),
    { step: 'chargePayment', action: 'compensate', status: 'error', error: 'refund lỗi' },
    'log phải đủ để support biết cần hoàn tay giao dịch nào',
  );
});

test('service throw đồng bộ (không phải async) cũng được xử lý như lỗi', async () => {
  const s = services();
  s.payment.charge = () => { throw new TypeError('sai tham số'); };
  const result = await placeOrderSaga({ order: ORDER, ...s });
  assert.equal(result.status, 'compensated');
  assert.deepEqual(result.steps[1], { name: 'chargePayment', status: 'failed', error: 'sai tham số' });
});

test('log là tuỳ chọn: không truyền log vẫn chạy', async () => {
  const s = services(['create']);
  const result = await placeOrderSaga({ order: ORDER, inventory: s.inventory, payment: s.payment, shipping: s.shipping });
  assert.equal(result.status, 'compensated');
});
