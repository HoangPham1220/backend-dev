import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs, getNumberOption } from './exercise.js';

test('parseArgs: ví dụ đầy đủ trong đề', () => {
  assert.deepEqual(parseArgs(['add', '--sku=A1', '--qty', '3', '--dry-run']), {
    command: 'add',
    options: { sku: 'A1', qty: '3', 'dry-run': true },
  });
});

test('parseArgs: chỉ có command', () => {
  assert.deepEqual(parseArgs(['list']), { command: 'list', options: {} });
});

test('parseArgs: --key=value tách ở dấu = đầu tiên, cho phép giá trị rỗng', () => {
  const { options } = parseArgs(['export', '--url=https://shop.vn/?a=1', '--note=']);
  assert.equal(options.url, 'https://shop.vn/?a=1');
  assert.equal(options.note, '', '--note= là chuỗi rỗng, không phải true');
});

test('parseArgs: cờ boolean đứng trước option khác', () => {
  const { options } = parseArgs(['remove', '--force', '--sku', 'B2']);
  assert.deepEqual(options, { force: true, sku: 'B2' });
});

test('parseArgs: option lặp lại thì lấy giá trị sau cùng, giá trị luôn là chuỗi', () => {
  const { options } = parseArgs(['add', '--qty=1', '--qty', '5']);
  assert.strictEqual(options.qty, '5');
});

test('parseArgs: thiếu command', () => {
  assert.throws(() => parseArgs([]), { message: 'Thiếu command' });
  assert.throws(() => parseArgs(['--sku=A1', 'add']), { message: 'Thiếu command' }, 'argv[0] phải là command');
});

test('parseArgs: tham số thừa', () => {
  assert.throws(() => parseArgs(['add', 'A1']), { message: 'Tham số thừa: A1' });
  assert.throws(() => parseArgs(['add', '--sku=A1', 'B2']), { message: 'Tham số thừa: B2' });
});

test('getNumberOption: đổi chuỗi sang số', () => {
  assert.strictEqual(getNumberOption({ qty: '3' }, 'qty'), 3);
  assert.strictEqual(getNumberOption({ price: '2.5' }, 'price'), 2.5);
});

test('getNumberOption: dùng giá trị mặc định khi không có option', () => {
  assert.strictEqual(getNumberOption({}, 'limit', 20), 20);
  assert.strictEqual(getNumberOption({}, 'offset', 0), 0, 'mặc định 0 vẫn hợp lệ');
});

test('getNumberOption: báo lỗi khi thiếu hoặc sai kiểu', () => {
  assert.throws(() => getNumberOption({}, 'qty'), { message: 'Thiếu --qty' });
  assert.throws(() => getNumberOption({ qty: 'abc' }, 'qty'), { message: '--qty phải là số' });
  assert.throws(() => getNumberOption({ qty: '' }, 'qty'), { message: '--qty phải là số' }, 'Number("") là 0, cẩn thận');
  assert.throws(() => getNumberOption({ qty: true }, 'qty'), { message: '--qty phải là số' }, 'quên giá trị: --qty đứng cuối');
});
