import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseCsv, toCsv, importProductsCsv } from './exercise.js';

let dir;
before(() => {
  dir = mkdtempSync(join(tmpdir(), 'w2-11-'));
});
after(() => {
  rmSync(dir, { recursive: true, force: true });
});

function writeTemp(name, content) {
  const path = join(dir, name);
  writeFileSync(path, content);
  return path;
}

test('parseCsv: dòng đơn giản, giá trị là chuỗi, bỏ dòng trống cuối file', () => {
  assert.deepEqual(parseCsv('sku,price\nA1,150000\nB2,90000\n'), [
    { sku: 'A1', price: '150000' },
    { sku: 'B2', price: '90000' },
  ]);
});

test('parseCsv: ô trong ngoặc kép được chứa dấu phẩy', () => {
  assert.deepEqual(parseCsv('sku,name,price\nA1,"Áo thun, cotton",150000'), [
    { sku: 'A1', name: 'Áo thun, cotton', price: '150000' },
  ]);
});

test('parseCsv: "" trong ô là một dấu ngoặc kép, ô rỗng vẫn là một ô', () => {
  assert.deepEqual(parseCsv('sku,note,color\nB2,"Size ""L""",'), [{ sku: 'B2', note: 'Size "L"', color: '' }]);
});

test('parseCsv: đọc được file xuống dòng kiểu Windows (\\r\\n)', () => {
  assert.deepEqual(parseCsv('sku,stock\r\nA1,3\r\nB2,0\r\n'), [
    { sku: 'A1', stock: '3' },
    { sku: 'B2', stock: '0' },
  ]);
});

test('parseCsv: sai số cột thì báo đúng số dòng', () => {
  assert.throws(() => parseCsv('sku,name,price\nA1,Áo,150000\nB2,Mũ'), {
    message: 'Dòng 3 có 2 cột, cần 3',
  });
  assert.throws(() => parseCsv('sku,name\nA1,Áo thun, cotton'), {
    message: 'Dòng 2 có 3 cột, cần 2',
  }, 'dấu phẩy không nằm trong ngoặc kép là dấu tách cột');
});

test('toCsv: ghi header và các dòng theo đúng thứ tự columns', () => {
  const rows = [
    { price: 150000, sku: 'A1', stock: 3 },
    { price: 90000, sku: 'B2', stock: 0 },
  ];
  assert.equal(toCsv(rows, ['sku', 'price']), 'sku,price\nA1,150000\nB2,90000');
});

test('toCsv: escape dấu phẩy, ngoặc kép và bỏ trống null/undefined', () => {
  const rows = [{ sku: 'A1', name: 'Áo thun, cotton', note: 'Size "L"', color: null }];
  assert.equal(
    toCsv(rows, ['sku', 'name', 'note', 'color', 'size']),
    'sku,name,note,color,size\nA1,"Áo thun, cotton","Size ""L""",,',
  );
});

test('toCsv rồi parseCsv lại ra đúng dữ liệu (với giá trị chuỗi)', () => {
  const rows = [
    { sku: 'A1', name: 'Áo "polo", size M' },
    { sku: 'B2', name: 'Mũ' },
  ];
  assert.deepEqual(parseCsv(toCsv(rows, ['sku', 'name'])), rows);
});

test('importProductsCsv: đọc file, price và stock là số', () => {
  const path = writeTemp('ok.csv', 'sku,name,price,stock\nA1,"Áo thun, cotton",150000,3\nB2,Mũ,90000,0\n');
  assert.deepEqual(importProductsCsv(path), [
    { sku: 'A1', name: 'Áo thun, cotton', price: 150000, stock: 3 },
    { sku: 'B2', name: 'Mũ', price: 90000, stock: 0 },
  ]);
});

test('importProductsCsv: price hoặc stock không hợp lệ thì báo lỗi kèm sku', () => {
  const badPrice = writeTemp('bad-price.csv', 'sku,name,price,stock\nA1,Áo,abc,3\n');
  assert.throws(() => importProductsCsv(badPrice), { message: 'Sản phẩm A1: price không hợp lệ' });

  const emptyStock = writeTemp('empty-stock.csv', 'sku,name,price,stock\nB2,Mũ,90000,\n');
  assert.throws(
    () => importProductsCsv(emptyStock),
    { message: 'Sản phẩm B2: stock không hợp lệ' },
    'ô rỗng: Number("") là 0 nhưng vẫn phải coi là không hợp lệ',
  );
});
