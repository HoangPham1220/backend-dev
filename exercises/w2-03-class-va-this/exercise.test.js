import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Inventory } from './exercise.js';

test('getStock: đọc tồn kho ban đầu, sku chưa có trả về 0', () => {
  const inventory = new Inventory({ A: 5, B: 0 });
  assert.equal(inventory.getStock('A'), 5);
  assert.equal(inventory.getStock('B'), 0);
  assert.equal(inventory.getStock('C'), 0, 'sku chưa có phải trả về 0, không phải undefined');
});

test('constructor: không truyền gì thì kho rỗng', () => {
  const inventory = new Inventory();
  assert.equal(inventory.getStock('A'), 0);
});

test('constructor: không dùng chung object truyền vào', () => {
  const initial = { A: 5 };
  const inventory = new Inventory(initial);
  inventory.add('A', 3);
  assert.equal(inventory.getStock('A'), 8, 'kho phải cộng thêm được');
  assert.deepEqual(initial, { A: 5 }, 'object initialStock của người gọi bị sửa, hãy copy ra');
});

test('add: cộng tồn kho, sku mới bắt đầu từ 0', () => {
  const inventory = new Inventory({ A: 5 });
  inventory.add('A', 3);
  inventory.add('NEW', 2);
  assert.equal(inventory.getStock('A'), 8);
  assert.equal(inventory.getStock('NEW'), 2);
});

test('remove: trừ tồn kho khi đủ hàng', () => {
  const inventory = new Inventory({ A: 5 });
  inventory.remove('A', 5);
  assert.equal(inventory.getStock('A'), 0);
});

test('remove: không đủ hàng thì throw và giữ nguyên tồn kho', () => {
  const inventory = new Inventory({ A: 2 });
  assert.throws(() => inventory.remove('A', 3), /Không đủ hàng/);
  assert.throws(() => inventory.remove('C', 1), /Không đủ hàng/, 'sku chưa có coi như tồn 0');
  assert.equal(inventory.getStock('A'), 2, 'remove thất bại không được làm đổi tồn kho');
});

test('getStock: vẫn đúng khi tách rời làm callback', () => {
  const inventory = new Inventory({ A: 5, B: 0 });
  assert.deepEqual(
    ['A', 'B', 'C'].map(inventory.getStock),
    [5, 0, 0],
    'this bị mất khi truyền inventory.getStock vào map, xem README',
  );
  const getStock = inventory.getStock;
  inventory.add('A', 1);
  assert.equal(getStock('A'), 6, 'hàm tách rời phải thấy dữ liệu mới nhất của inventory');
});

test('hai kho khác nhau không dùng chung dữ liệu', () => {
  const hanoi = new Inventory({ A: 1 });
  const hcm = new Inventory({ A: 10 });
  hanoi.add('A', 1);
  assert.equal(hcm.getStock('A'), 10);
  assert.deepEqual(['A'].map(hcm.getStock), [10]);
});
