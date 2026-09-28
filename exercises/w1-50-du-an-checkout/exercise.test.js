import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mergeLines, buildLines, calcSubtotal } from './lib/cart.js';
import { validateCart } from './lib/stock.js';
import { shippingFee, applyCoupon, calcVat } from './lib/pricing.js';
import { checkout } from './exercise.js';

const now = '2026-10-05T10:00:00Z';
const makeProducts = () => [
  { sku: 'TS-01', name: 'Áo thun', price: 150000, stock: 10 },
  { sku: 'JN-01', name: 'Quần jean', price: 450000, stock: 2 },
  { sku: 'CP-01', name: 'Mũ lưỡi trai', price: 90000, stock: 0 },
];

describe('lib/cart.js', () => {
  test('mergeLines: gộp dòng cùng sku, giữ thứ tự xuất hiện đầu tiên', () => {
    const cart = [
      { sku: 'TS-01', quantity: 2 },
      { sku: 'JN-01', quantity: 1 },
      { sku: 'TS-01', quantity: 1 },
    ];
    assert.deepEqual(mergeLines(cart), [
      { sku: 'TS-01', quantity: 3 },
      { sku: 'JN-01', quantity: 1 },
    ]);
  });

  test('mergeLines: không sửa giỏ và object dòng gốc', () => {
    const cart = [
      { sku: 'TS-01', quantity: 2 },
      { sku: 'TS-01', quantity: 1 },
    ];
    const result = mergeLines(cart);
    assert.deepEqual(result, [{ sku: 'TS-01', quantity: 3 }]);
    assert.deepEqual(cart, [
      { sku: 'TS-01', quantity: 2 },
      { sku: 'TS-01', quantity: 1 },
    ], 'dòng gốc bị cộng dồn: hãy tạo object dòng mới');
    assert.deepEqual(mergeLines([]), []);
  });

  test('buildLines + calcSubtotal: dòng chi tiết và tiền hàng', () => {
    const lines = buildLines(
      [
        { sku: 'JN-01', quantity: 2 },
        { sku: 'TS-01', quantity: 1 },
      ],
      makeProducts(),
    );
    assert.deepEqual(lines, [
      { sku: 'JN-01', name: 'Quần jean', price: 450000, quantity: 2, lineTotal: 900000 },
      { sku: 'TS-01', name: 'Áo thun', price: 150000, quantity: 1, lineTotal: 150000 },
    ]);
    assert.equal(calcSubtotal(lines), 1050000);
    assert.equal(calcSubtotal([]), 0);
  });
});

describe('lib/stock.js', () => {
  test('validateCart: giỏ hợp lệ trả array rỗng', () => {
    assert.deepEqual(validateCart([{ sku: 'JN-01', quantity: 2 }], makeProducts()), [], 'mua đúng bằng tồn kho là hợp lệ');
  });

  test('validateCart: giỏ rỗng', () => {
    assert.deepEqual(validateCart([], makeProducts()), ['Giỏ hàng trống']);
  });

  test('validateCart: gom mọi lỗi theo thứ tự dòng', () => {
    const cart = [
      { sku: 'CP-01', quantity: 1 },
      { sku: 'XX-99', quantity: 1 },
      { sku: 'TS-01', quantity: 0 },
      { sku: 'JN-01', quantity: 5 },
      { sku: 'AB-00', quantity: 1.5 },
    ];
    assert.deepEqual(validateCart(cart, makeProducts()), [
      'Không đủ hàng cho CP-01: còn 0, cần 1',
      'Không tìm thấy sản phẩm XX-99',
      'Số lượng không hợp lệ cho TS-01',
      'Không đủ hàng cho JN-01: còn 2, cần 5',
      'Số lượng không hợp lệ cho AB-00',
    ]);
  });
});

describe('lib/pricing.js', () => {
  test('shippingFee: theo tiền hàng và khu vực', () => {
    assert.equal(shippingFee(500000, 'danang'), 0);
    assert.equal(shippingFee(499999, 'hanoi'), 20000);
    assert.equal(shippingFee(100000, 'hcm'), 20000);
    assert.equal(shippingFee(100000, 'hue'), 35000);
  });

  test('applyCoupon: không có mã thì không giảm', () => {
    assert.deepEqual(applyCoupon(400000, 20000, null, now), { goodsDiscount: 0, shippingDiscount: 0, error: null });
    assert.deepEqual(applyCoupon(400000, 20000, undefined, now), { goodsDiscount: 0, shippingDiscount: 0, error: null });
  });

  test('applyCoupon: percent, fixed, freeship', () => {
    assert.deepEqual(applyCoupon(400000, 20000, { code: 'P', type: 'percent', value: 15 }, now), {
      goodsDiscount: 60000,
      shippingDiscount: 0,
      error: null,
    });
    assert.deepEqual(applyCoupon(80000, 35000, { code: 'F', type: 'fixed', value: 100000 }, now), {
      goodsDiscount: 80000,
      shippingDiscount: 0,
      error: null,
    }, 'fixed tối đa bằng tiền hàng');
    assert.deepEqual(applyCoupon(80000, 35000, { code: 'S', type: 'freeship', value: 0 }, now), {
      goodsDiscount: 0,
      shippingDiscount: 35000,
      error: null,
    });
  });

  test('applyCoupon: các lý do không áp được', () => {
    assert.equal(applyCoupon(400000, 0, { code: 'X', type: 'gift', value: 1 }, now).error, 'Loại mã không hợp lệ');
    assert.equal(
      applyCoupon(400000, 0, { code: 'X', type: 'fixed', value: 1, expiresAt: '2026-01-01T00:00:00Z' }, now).error,
      'Mã đã hết hạn',
    );
    const low = applyCoupon(100000, 0, { code: 'X', type: 'fixed', value: 1, minOrder: 300000 }, now);
    assert.deepEqual(low, { goodsDiscount: 0, shippingDiscount: 0, error: 'Đơn hàng chưa đạt tối thiểu 300000' });
  });

  test('calcVat: 10% làm tròn', () => {
    assert.equal(calcVat(405000), 40500);
    assert.equal(calcVat(99995), 10000, '9999.5 làm tròn lên 10000');
    assert.equal(calcVat(0), 0);
  });
});

describe('checkout', () => {
  const coupon = { code: 'SALE10', type: 'percent', value: 10, minOrder: 300000, expiresAt: '2026-12-31T23:59:59Z' };

  test('đơn có mã percent: ví dụ trong README', () => {
    const cart = [
      { sku: 'TS-01', quantity: 2 },
      { sku: 'TS-01', quantity: 1 },
    ];
    assert.deepEqual(checkout({ cart, products: makeProducts(), coupon, region: 'hcm', now }), {
      ok: true,
      lines: [{ sku: 'TS-01', name: 'Áo thun', price: 150000, quantity: 3, lineTotal: 450000 }],
      subtotal: 450000,
      discount: 45000,
      shipping: 20000,
      vat: 40500,
      total: 465500,
    });
  });

  test('đơn không mã, được miễn ship', () => {
    const cart = [
      { sku: 'JN-01', quantity: 1 },
      { sku: 'TS-01', quantity: 1 },
    ];
    const result = checkout({ cart, products: makeProducts(), coupon: null, region: 'danang', now });
    assert.equal(result.ok, true);
    assert.equal(result.subtotal, 600000);
    assert.equal(result.shipping, 0);
    assert.equal(result.discount, 0);
    assert.equal(result.vat, 60000);
    assert.equal(result.total, 660000);
  });

  test('mã freeship: giảm phí ship, VAT không đổi', () => {
    const result = checkout({
      cart: [{ sku: 'TS-01', quantity: 1 }],
      products: makeProducts(),
      coupon: { code: 'FS', type: 'freeship', value: 0 },
      region: 'hue',
      now,
    });
    assert.equal(result.shipping, 35000);
    assert.equal(result.discount, 35000);
    assert.equal(result.vat, 15000, 'VAT tính trên tiền hàng, không bị giảm vì freeship');
    assert.equal(result.total, 165000);
  });

  test('gom tất cả lỗi giỏ hàng và khu vực, không kiểm tra mã khi giỏ lỗi', () => {
    const result = checkout({
      cart: [
        { sku: 'XX-99', quantity: 1 },
        { sku: 'JN-01', quantity: 3 },
      ],
      products: makeProducts(),
      coupon: { code: 'OLD', type: 'fixed', value: 1000, expiresAt: '2020-01-01T00:00:00Z' },
      region: '',
      now,
    });
    assert.deepEqual(result, {
      ok: false,
      errors: ['Không tìm thấy sản phẩm XX-99', 'Không đủ hàng cho JN-01: còn 2, cần 3', 'Thiếu khu vực giao hàng'],
    });
  });

  test('giỏ gộp dòng rồi mới kiểm tồn kho', () => {
    const result = checkout({
      cart: [
        { sku: 'JN-01', quantity: 1 },
        { sku: 'JN-01', quantity: 2 },
      ],
      products: makeProducts(),
      region: 'hcm',
      now,
    });
    assert.deepEqual(result, { ok: false, errors: ['Không đủ hàng cho JN-01: còn 2, cần 3'] }, 'tổng 3 cái vượt tồn kho 2');
  });

  test('mã không áp được khi giỏ hợp lệ', () => {
    const result = checkout({
      cart: [{ sku: 'TS-01', quantity: 1 }],
      products: makeProducts(),
      coupon,
      region: 'hcm',
      now,
    });
    assert.deepEqual(result, { ok: false, errors: ['Đơn hàng chưa đạt tối thiểu 300000'] });
  });

  test('giỏ rỗng và thiếu region', () => {
    assert.deepEqual(checkout({ cart: [], products: makeProducts(), region: undefined, now }), {
      ok: false,
      errors: ['Giỏ hàng trống', 'Thiếu khu vực giao hàng'],
    });
  });

  test('không sửa dữ liệu đầu vào', () => {
    const cart = [
      { sku: 'TS-01', quantity: 2 },
      { sku: 'TS-01', quantity: 1 },
    ];
    const products = makeProducts();
    const couponCopy = { ...coupon };
    const result = checkout({ cart, products, coupon: couponCopy, region: 'hcm', now });
    assert.equal(result.ok, true);
    assert.deepEqual(cart, [
      { sku: 'TS-01', quantity: 2 },
      { sku: 'TS-01', quantity: 1 },
    ]);
    assert.deepEqual(products, makeProducts(), 'checkout không được trừ tồn kho trong products');
    assert.deepEqual(couponCopy, coupon);
  });
});
