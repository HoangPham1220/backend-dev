import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { OrderEvents, wireOrderNotifications } from './exercise.js';

function createFakeNotifier() {
  const sent = [];
  return { sent, send: (to, message) => sent.push({ to, message }) };
}

const ORDER = { id: 12, customerEmail: 'an@example.com' };

test('OrderEvents: on + emit gọi handler với đúng tham số', () => {
  const events = new OrderEvents();
  const received = [];
  events.on('order.paid', (order, source) => received.push([order.id, source]));

  assert.equal(events.emit('order.paid', ORDER, 'vnpay'), true, 'emit có handler phải trả về true');
  assert.deepEqual(received, [[12, 'vnpay']]);
});

test('OrderEvents: gọi handler theo thứ tự đăng ký, chỉ đúng event', () => {
  const events = new OrderEvents();
  const calls = [];
  events.on('order.paid', () => calls.push('A'));
  events.on('order.paid', () => calls.push('B'));
  events.on('order.cancelled', () => calls.push('C'));

  events.emit('order.paid', ORDER);
  assert.deepEqual(calls, ['A', 'B']);
});

test('OrderEvents: emit không có handler trả về false', () => {
  const events = new OrderEvents();
  assert.equal(events.emit('order.paid', ORDER), false);
  events.on('order.cancelled', () => {});
  assert.equal(events.emit('order.paid', ORDER), false, 'handler của event khác không tính');
});

test('OrderEvents: on/off/once trả về this để gọi nối tiếp', () => {
  const events = new OrderEvents();
  const handler = () => {};
  assert.equal(events.on('x', handler), events);
  assert.equal(events.once('x', handler), events);
  assert.equal(events.off('x', handler), events);
});

test('OrderEvents: off huỷ đúng handler được truyền vào', () => {
  const events = new OrderEvents();
  const calls = [];
  const logA = () => calls.push('A');
  const logB = () => calls.push('B');
  events.on('order.paid', logA).on('order.paid', logB);
  events.off('order.paid', logA);

  events.emit('order.paid', ORDER);
  assert.deepEqual(calls, ['B']);
  assert.equal(events.listenerCount('order.paid'), 1);
});

test('OrderEvents: once chỉ chạy một lần', () => {
  const events = new OrderEvents();
  const calls = [];
  events.once('order.paid', (order) => calls.push(`once-${order.id}`));
  events.on('order.paid', (order) => calls.push(`on-${order.id}`));

  events.emit('order.paid', { id: 1 });
  events.emit('order.paid', { id: 2 });
  assert.deepEqual(calls, ['once-1', 'on-1', 'on-2'], 'handler once bị huỷ không được làm lỡ handler đứng sau');
  assert.equal(events.listenerCount('order.paid'), 1);
});

test('OrderEvents: mỗi instance có danh sách handler riêng', () => {
  const a = new OrderEvents();
  const b = new OrderEvents();
  a.on('order.paid', () => {});
  assert.equal(a.listenerCount('order.paid'), 1);
  assert.equal(b.listenerCount('order.paid'), 0);
});

test('wireOrderNotifications: gửi thông báo khi đơn thanh toán và bị huỷ', () => {
  const events = new OrderEvents();
  const notifier = createFakeNotifier();
  wireOrderNotifications(events, notifier);

  events.emit('order.paid', ORDER);
  events.emit('order.cancelled', { id: 13, customerEmail: 'binh@example.com' });
  assert.deepEqual(notifier.sent, [
    { to: 'an@example.com', message: 'Đơn #12 đã thanh toán' },
    { to: 'binh@example.com', message: 'Đơn #13 đã bị huỷ' },
  ]);
});

test('wireOrderNotifications: unsubscribe huỷ cả hai handler', () => {
  const events = new OrderEvents();
  const notifier = createFakeNotifier();
  const unsubscribe = wireOrderNotifications(events, notifier);

  assert.equal(typeof unsubscribe, 'function', 'phải trả về hàm unsubscribe');
  unsubscribe();
  events.emit('order.paid', ORDER);
  events.emit('order.cancelled', ORDER);
  assert.deepEqual(notifier.sent, []);
});

test('wireOrderNotifications: chạy được với EventEmitter có sẵn của Node', () => {
  const events = new EventEmitter();
  const notifier = createFakeNotifier();
  const unsubscribe = wireOrderNotifications(events, notifier);

  events.emit('order.paid', ORDER);
  assert.deepEqual(notifier.sent, [{ to: 'an@example.com', message: 'Đơn #12 đã thanh toán' }]);
  unsubscribe();
  assert.equal(events.listenerCount('order.paid'), 0);
  assert.equal(events.listenerCount('order.cancelled'), 0);
});
