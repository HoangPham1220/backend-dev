import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify, readJsonCallback, loadConfig } from './exercise.js';

let dir;
before(() => {
  dir = mkdtempSync(join(tmpdir(), 'w3-09-'));
  writeFileSync(join(dir, 'products.json'), JSON.stringify([{ sku: 'CAP', price: 80000 }]));
  writeFileSync(join(dir, 'broken.json'), '{ "sku": "CAP", ');
  writeFileSync(join(dir, 'config.json'), JSON.stringify({ pageSize: 50, shopName: 'Demo' }));
});
after(() => rmSync(dir, { recursive: true, force: true }));

// Hàm callback kiểu Node giả: cộng tồn kho sau 10ms, qty âm thì báo lỗi.
function addStockCallback(stock, qty, callback) {
  setTimeout(() => {
    if (qty < 0) callback(new RangeError('qty âm'));
    else callback(null, stock + qty);
  }, 10);
}

// Gọi readJsonCallback, thu lại mọi lần callback được gọi.
// Chờ thêm 50ms sau lần gọi đầu để bắt lần gọi thừa; quá 500ms không gọi thì trả mảng rỗng.
function callReadJson(filePath) {
  return new Promise((resolve) => {
    const calls = [];
    const giveUp = setTimeout(() => resolve(calls), 500);
    readJsonCallback(filePath, (...args) => {
      calls.push(args);
      clearTimeout(giveUp);
      setTimeout(() => resolve(calls), 50);
    });
  });
}

test('promisify: trả về hàm, gọi xong resolve với kết quả', { timeout: 2000 }, async () => {
  const addStock = promisify(addStockCallback);
  assert.equal(typeof addStock, 'function', 'promisify phải trả về một hàm');
  const result = addStock(10, 5);
  assert.ok(result instanceof Promise, 'hàm mới phải trả về Promise');
  assert.equal(await result, 15, 'phải truyền đúng các tham số rồi mới tới callback');
});

test('promisify: callback có lỗi thì reject đúng lỗi đó', { timeout: 2000 }, async () => {
  const addStock = promisify(addStockCallback);
  await assert.rejects(() => addStock(10, -1), RangeError);
});

test('readJsonCallback: đọc và parse JSON, callback(null, data) đúng một lần', { timeout: 2000 }, async () => {
  const calls = await callReadJson(join(dir, 'products.json'));
  assert.equal(calls.length, 1, 'callback phải được gọi đúng một lần (0 lần nghĩa là chưa gọi callback)');
  assert.equal(calls[0][0], null, 'không lỗi thì tham số đầu là null');
  assert.deepEqual(calls[0][1], [{ sku: 'CAP', price: 80000 }]);
});

test('readJsonCallback: file không tồn tại -> callback(err) với err.code ENOENT', { timeout: 2000 }, async () => {
  const calls = await callReadJson(join(dir, 'missing.json'));
  assert.equal(calls.length, 1, 'callback phải được gọi đúng một lần (0 lần nghĩa là chưa gọi callback)');
  assert.equal(calls[0][0]?.code, 'ENOENT', 'giữ nguyên lỗi gốc của fs');
});

test('readJsonCallback: JSON hỏng -> callback(SyntaxError) đúng một lần', { timeout: 2000 }, async () => {
  const calls = await callReadJson(join(dir, 'broken.json'));
  assert.equal(calls.length, 1, 'callback phải được gọi đúng một lần (0 lần nghĩa là chưa gọi callback)');
  assert.ok(calls[0][0] instanceof SyntaxError, 'lỗi parse JSON là SyntaxError');
});

test('loadConfig: gộp cấu hình trong file với giá trị mặc định', { timeout: 2000 }, async () => {
  assert.deepEqual(await loadConfig(join(dir, 'config.json')), {
    currency: 'VND',
    pageSize: 50,
    shopName: 'Demo',
  });
});

test('loadConfig: file lỗi thì reject', { timeout: 2000 }, async () => {
  await assert.rejects(() => loadConfig(join(dir, 'missing.json')), { code: 'ENOENT' });
});
