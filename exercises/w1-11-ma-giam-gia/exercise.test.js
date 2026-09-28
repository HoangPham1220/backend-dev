import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyCoupon, pickBestCoupon } from './exercise.js';

const now = '2026-10-05T10:00:00Z';
const cart = { subtotal: 400000, shippingFee: 30000 };

test('applyCoupon: mã percent giảm theo phần trăm tiền hàng', () => {
  assert.deepEqual(applyCoupon(cart, { code: 'SALE10', type: 'percent', value: 10 }, now), {
    discount: 40000,
    total: 390000,
    reason: null,
  });
});

test('applyCoupon: mã percent làm tròn số tiền giảm', () => {
  const result = applyCoupon({ subtotal: 99999, shippingFee: 0 }, { code: 'S15', type: 'percent', value: 15 }, now);
  assert.equal(result.discount, 15000, '99999 * 15% = 14999.85, làm tròn thành 15000');
  assert.equal(result.total, 84999);
});

test('applyCoupon: mã fixed không giảm quá tiền hàng', () => {
  assert.deepEqual(applyCoupon(cart, { code: 'GIAM50K', type: 'fixed', value: 50000 }, now), {
    discount: 50000,
    total: 380000,
    reason: null,
  });
  assert.deepEqual(
    applyCoupon({ subtotal: 50000, shippingFee: 30000 }, { code: 'GIAM100K', type: 'fixed', value: 100000 }, now),
    { discount: 50000, total: 30000, reason: null },
    'giảm tối đa bằng subtotal, phí ship vẫn phải trả',
  );
});

test('applyCoupon: mã freeship giảm đúng phí ship', () => {
  assert.deepEqual(applyCoupon(cart, { code: 'FREESHIP', type: 'freeship', value: 0 }, now), {
    discount: 30000,
    total: 400000,
    reason: null,
  });
});

test('applyCoupon: không có mã hoặc loại mã sai', () => {
  assert.deepEqual(applyCoupon(cart, null, now), { discount: 0, total: 430000, reason: 'Không có mã giảm giá' });
  assert.deepEqual(applyCoupon(cart, undefined, now), { discount: 0, total: 430000, reason: 'Không có mã giảm giá' });
  assert.deepEqual(applyCoupon(cart, { code: 'X', type: 'cashback', value: 10 }, now), {
    discount: 0,
    total: 430000,
    reason: 'Loại mã không hợp lệ',
  });
});

test('applyCoupon: hạn dùng so sánh theo thời gian', () => {
  const coupon = { code: 'SALE10', type: 'percent', value: 10, expiresAt: '2026-10-01T00:00:00Z' };
  assert.deepEqual(applyCoupon(cart, coupon, now), { discount: 0, total: 430000, reason: 'Mã đã hết hạn' });

  const stillValid = { ...coupon, expiresAt: '2026-12-31T23:59:59Z' };
  assert.equal(applyCoupon(cart, stillValid, now).discount, 40000);

  const exact = { ...coupon, expiresAt: now };
  assert.equal(applyCoupon(cart, exact, now).discount, 40000, 'đúng thời điểm hết hạn vẫn dùng được');
});

test('applyCoupon: chưa đạt đơn tối thiểu', () => {
  const coupon = { code: 'SALE10', type: 'percent', value: 10, minOrder: 500000 };
  assert.deepEqual(applyCoupon(cart, coupon, now), {
    discount: 0,
    total: 430000,
    reason: 'Đơn hàng chưa đạt tối thiểu 500000',
  });
  assert.equal(applyCoupon({ subtotal: 500000, shippingFee: 0 }, coupon, now).discount, 50000, 'bằng minOrder là đạt');
});

test('applyCoupon: kiểm tra hết hạn trước khi kiểm tra đơn tối thiểu', () => {
  const coupon = { code: 'OLD', type: 'fixed', value: 10000, minOrder: 900000, expiresAt: '2026-01-01T00:00:00Z' };
  assert.equal(applyCoupon(cart, coupon, now).reason, 'Mã đã hết hạn');
});

test('pickBestCoupon: chọn mã giảm nhiều nhất', () => {
  const coupons = [
    { code: 'SALE10', type: 'percent', value: 10 },
    { code: 'GIAM50K', type: 'fixed', value: 50000 },
    { code: 'FREESHIP', type: 'freeship', value: 0 },
  ];
  assert.equal(pickBestCoupon(cart, coupons, now), 'GIAM50K');
});

test('pickBestCoupon: bỏ qua mã không áp được, hoà thì lấy mã đứng trước', () => {
  const coupons = [
    { code: 'EXPIRED', type: 'fixed', value: 200000, expiresAt: '2026-01-01T00:00:00Z' },
    { code: 'A40K', type: 'fixed', value: 40000 },
    { code: 'SALE10', type: 'percent', value: 10 },
  ];
  assert.equal(pickBestCoupon(cart, coupons, now), 'A40K');
});

test('pickBestCoupon: không có mã nào dùng được trả về null', () => {
  assert.equal(pickBestCoupon(cart, [], now), null);
  assert.equal(
    pickBestCoupon(cart, [{ code: 'BIG', type: 'percent', value: 10, minOrder: 1000000 }], now),
    null,
  );
});
