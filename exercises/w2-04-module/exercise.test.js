import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyVat, cartTotalWithVat } from './exercise.js';

const cartSource = readFileSync(new URL('./lib/cart.js', import.meta.url), 'utf8');

test('applyVat: mặc định VAT 10%', () => {
  assert.equal(applyVat(100000), 110000);
  assert.equal(applyVat(0), 0);
});

test('applyVat: làm tròn về số nguyên', () => {
  assert.equal(applyVat(99999), 109999, '99999 * 1.1 = 109998.9 → làm tròn 109999');
  assert.equal(applyVat(150000), 165000, '150000 * 1.1 trong JS ra 165000.00000000003, phải làm tròn');
  assert.ok(Number.isInteger(applyVat(12345)), 'kết quả phải là số nguyên');
});

test('applyVat: nhận mức VAT khác', () => {
  assert.equal(applyVat(100000, 0.08), 108000);
  assert.equal(applyVat(100000, 0), 100000);
});

test('cartTotalWithVat: tổng tiền giỏ hàng đã có VAT', () => {
  const items = [
    { sku: 'TSHIRT', price: 150000, quantity: 2 },
    { sku: 'CAP', price: 90000, quantity: 1 },
  ];
  assert.equal(cartTotalWithVat(items), 429000);
});

test('cartTotalWithVat: giỏ rỗng là 0', () => {
  assert.equal(cartTotalWithVat([]), 0);
});

test('cartTotalWithVat: áp VAT một lần trên tổng, không làm tròn từng dòng', () => {
  const items = [
    { sku: 'A', price: 5, quantity: 1 },
    { sku: 'B', price: 5, quantity: 1 },
  ];
  // Từng dòng: round(5.5) + round(5.5) = 12. Trên tổng: round(11) = 11.
  assert.equal(cartTotalWithVat(items), 11);
});

test('lib/cart.js import applyVat từ ./price.js', () => {
  assert.match(
    cartSource,
    /import\s*\{[^}]*\bapplyVat\b[^}]*\}\s*from\s*['"]\.\/price\.js['"]/,
    "lib/cart.js phải có dòng: import { applyVat } from './price.js';",
  );
});

test('lib/cart.js không tự viết lại công thức VAT', () => {
  assert.match(cartSource, /from ['"]\.\/price\.js['"]/, 'cart.js phải import applyVat từ ./price.js');
  assert.doesNotMatch(cartSource, /Math\.round/, 'làm tròn đã có trong applyVat, cart.js không cần Math.round');
  assert.doesNotMatch(cartSource, /1\.1\b|0\.1\b/, 'mức VAT nằm ở price.js, cart.js không nên có 1.1 hoặc 0.1');
});
