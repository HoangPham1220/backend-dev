import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseQuantity, safeParseJson } from './exercise.js';

test('parseQuantity: chuỗi số nguyên dương trả về số', () => {
  assert.equal(parseQuantity('3'), 3);
  assert.equal(parseQuantity('120'), 120);
  assert.equal(parseQuantity(' 3 '), 3, 'khoảng trắng hai đầu được chấp nhận');
});

test('parseQuantity: chuỗi không phải số ném TypeError, message chứa input', () => {
  assert.throws(() => parseQuantity('abc'), { name: 'TypeError', message: /abc/ });
  assert.throws(() => parseQuantity('12abc'), { name: 'TypeError', message: /12abc/ }, 'khác PHP intval: "12abc" không hợp lệ');
});

test('parseQuantity: chuỗi rỗng ném TypeError', () => {
  assert.throws(() => parseQuantity(''), { name: 'TypeError' }, 'Number("") là 0, cần chặn riêng chuỗi rỗng');
  assert.throws(() => parseQuantity('   '), { name: 'TypeError' }, 'chỉ có khoảng trắng cũng là rỗng');
});

test('parseQuantity: đầu vào không phải chuỗi ném TypeError', () => {
  assert.throws(() => parseQuantity(3), { name: 'TypeError', message: /3/ });
  assert.throws(() => parseQuantity(null), { name: 'TypeError' });
  assert.throws(() => parseQuantity(undefined), { name: 'TypeError' });
});

test('parseQuantity: số không nguyên hoặc <= 0 ném RangeError, message chứa input', () => {
  assert.throws(() => parseQuantity('2.5'), { name: 'RangeError', message: /2\.5/ });
  assert.throws(() => parseQuantity('0'), { name: 'RangeError', message: /0/ });
  assert.throws(() => parseQuantity('-3'), { name: 'RangeError', message: /-3/ });
});

test('safeParseJson: JSON hợp lệ trả về ok true và data', () => {
  assert.deepEqual(safeParseJson('{"sku":"A","qty":2}'), { ok: true, data: { sku: 'A', qty: 2 } });
  assert.deepEqual(safeParseJson('[1,2,3]'), { ok: true, data: [1, 2, 3] });
});

test('safeParseJson: JSON "null" hợp lệ, phân biệt được với JSON lỗi', () => {
  assert.deepEqual(safeParseJson('null'), { ok: true, data: null });
});

test('safeParseJson: JSON lỗi trả về ok false và error là chuỗi', () => {
  const result = safeParseJson('{sai');
  assert.equal(result?.ok, false);
  assert.equal(typeof result.error, 'string', 'error nên là err.message (chuỗi), không phải object lỗi');
  assert.ok(result.error.length > 0, 'error không được rỗng');
});

test('safeParseJson: không bao giờ ném lỗi, kể cả khi đầu vào không phải chuỗi JSON', () => {
  let result;
  assert.doesNotThrow(() => {
    result = safeParseJson(undefined);
  });
  assert.equal(result?.ok, false);
  assert.equal(safeParseJson('')?.ok, false, 'chuỗi rỗng không phải JSON hợp lệ');
});
