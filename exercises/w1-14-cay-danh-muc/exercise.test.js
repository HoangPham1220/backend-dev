import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCategoryTree, getBreadcrumb } from './exercise.js';

const categories = [
  { id: 1, parentId: null, name: 'Default', position: 1 },
  { id: 2, parentId: 1, name: 'Men', position: 2 },
  { id: 3, parentId: 1, name: 'Women', position: 1 },
  { id: 4, parentId: 2, name: 'Shoes', position: 1 },
];

test('buildCategoryTree: dựng cây lồng nhau, children sắp theo position', () => {
  assert.deepEqual(buildCategoryTree(categories), [
    {
      id: 1,
      name: 'Default',
      children: [
        { id: 3, name: 'Women', children: [] },
        { id: 2, name: 'Men', children: [{ id: 4, name: 'Shoes', children: [] }] },
      ],
    },
  ]);
});

test('buildCategoryTree: con đứng trước cha trong danh sách vẫn đúng', () => {
  const shuffled = [categories[3], categories[1], categories[0], categories[2]];
  assert.deepEqual(buildCategoryTree(shuffled), buildCategoryTree(categories), 'thứ tự đầu vào không được ảnh hưởng kết quả');
  assert.equal(buildCategoryTree(shuffled)[0].children[1].children[0].name, 'Shoes');
});

test('buildCategoryTree: nhiều gốc, sắp theo position', () => {
  const result = buildCategoryTree([
    { id: 10, parentId: null, name: 'Store B', position: 2 },
    { id: 20, parentId: null, name: 'Store A', position: 1 },
  ]);
  assert.deepEqual(result.map((node) => node.name), ['Store A', 'Store B']);
});

test('buildCategoryTree: bỏ category có cha không tồn tại cùng con cháu', () => {
  const result = buildCategoryTree([
    ...categories,
    { id: 5, parentId: 99, name: 'Mồ côi', position: 1 },
    { id: 6, parentId: 5, name: 'Con của mồ côi', position: 1 },
  ]);
  assert.equal(result.length, 1);
  assert.equal(JSON.stringify(result).includes('Mồ côi'), false, 'category có parentId 99 không tồn tại phải bị bỏ');
  assert.equal(JSON.stringify(result).includes('Con của mồ côi'), false);
});

test('buildCategoryTree: không sửa dữ liệu đầu vào, rỗng thì trả []', () => {
  const input = categories.map((c) => ({ ...c }));
  buildCategoryTree(input);
  assert.deepEqual(input, categories, 'không thêm children hay sửa object category gốc');
  assert.deepEqual(buildCategoryTree([]), []);
});

test('getBreadcrumb: đường dẫn tên từ gốc tới category', () => {
  assert.deepEqual(getBreadcrumb(categories, 4), ['Default', 'Men', 'Shoes']);
  assert.deepEqual(getBreadcrumb(categories, 3), ['Default', 'Women']);
  assert.deepEqual(getBreadcrumb(categories, 1), ['Default']);
});

test('getBreadcrumb: id không tồn tại trả []', () => {
  assert.deepEqual(getBreadcrumb(categories, 404), []);
});
