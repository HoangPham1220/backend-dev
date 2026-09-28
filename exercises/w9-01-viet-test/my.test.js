// Bạn viết test cho lib/discount.js ở file này. Đặc tả: README.md.
// Chạy nhanh: node --test exercises/w9-01-viet-test/my.test.js
// Chấm (chạy với bản đúng + 5 mutant): npm run check w9-01
import { test } from 'node:test';
import assert from 'node:assert/strict';

// Dòng này cho phép bộ chấm thay bản cài đặt bằng các mutant. Giữ nguyên.
const { calculateDiscount } = await import(process.env.DISCOUNT_IMPL ?? './lib/discount.js');

test('không có coupon thì giảm 0', () => {
  assert.equal(calculateDiscount(100000, null), 0);
});

// TODO: viết thêm test cho từng luật trong đặc tả, chú ý giá trị biên.
