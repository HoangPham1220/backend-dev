import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadProducts, exportLowStock } from './exercise.js';

const PRODUCTS = [
  { sku: 'TSHIRT', name: 'Áo thun', stock: 3 },
  { sku: 'CAP', name: 'Mũ lưỡi trai', stock: 25 },
  { sku: 'SOCK', name: 'Tất', stock: 0 },
  { sku: 'BAG', name: 'Túi vải', stock: 10 },
];

let dir;
let inputPath;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'w2-05-'));
  inputPath = join(dir, 'products.json');
  writeFileSync(inputPath, JSON.stringify(PRODUCTS));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

test('loadProducts: đọc file JSON thành mảng', () => {
  assert.deepEqual(loadProducts(inputPath), PRODUCTS);
});

test('loadProducts: file không tồn tại thì throw, message chứa đường dẫn', () => {
  const missing = join(dir, 'khong-co.json');
  assert.throws(() => loadProducts(missing), (error) => {
    assert.ok(error instanceof Error, 'phải throw một Error');
    assert.ok(error.message.includes(missing), `message "${error.message}" không chứa đường dẫn file`);
    return true;
  });
});

test('loadProducts: JSON hỏng thì throw', () => {
  const broken = join(dir, 'broken.json');
  writeFileSync(broken, '[{ "sku": "A" ');
  assert.throws(() => loadProducts(broken));
});

test('exportLowStock: ghi đúng sản phẩm có stock < threshold, giữ thứ tự', () => {
  const outputPath = join(dir, 'low-stock.json');
  exportLowStock(inputPath, outputPath, 10);
  assert.ok(existsSync(outputPath), 'chưa tạo file output');
  const written = JSON.parse(readFileSync(outputPath, 'utf8'));
  assert.deepEqual(written.map((p) => p.sku), ['TSHIRT', 'SOCK'], 'stock = 10 không tính là < 10');
  assert.deepEqual(written[0], PRODUCTS[0], 'giữ nguyên đủ thông tin sản phẩm');
});

test('exportLowStock: trả về số sản phẩm đã ghi', () => {
  assert.equal(exportLowStock(inputPath, join(dir, 'a.json'), 10), 2);
  assert.equal(exportLowStock(inputPath, join(dir, 'b.json'), 100), 4);
  assert.equal(exportLowStock(inputPath, join(dir, 'c.json'), 0), 0);
});

test('exportLowStock: không có sản phẩm nào thì vẫn ghi mảng rỗng', () => {
  const outputPath = join(dir, 'empty.json');
  exportLowStock(inputPath, outputPath, 0);
  assert.deepEqual(JSON.parse(readFileSync(outputPath, 'utf8')), []);
});

test('exportLowStock: JSON thụt lề 2 dấu cách', () => {
  const outputPath = join(dir, 'pretty.json');
  exportLowStock(inputPath, outputPath, 5);
  const raw = readFileSync(outputPath, 'utf8');
  const expected = JSON.stringify([PRODUCTS[0], PRODUCTS[2]], null, 2);
  assert.equal(raw.trimEnd(), expected, 'dùng JSON.stringify(data, null, 2)');
});
