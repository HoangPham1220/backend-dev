import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sumRevenueFromJsonl } from './exercise.js';

let dir;
before(() => {
  dir = mkdtempSync(join(tmpdir(), 'w3-13-'));
});
after(() => rmSync(dir, { recursive: true, force: true }));

function writeLines(name, lines) {
  const filePath = join(dir, name);
  writeFileSync(filePath, lines.join('\n'));
  return filePath;
}

test('dùng stream: createReadStream + readline', () => {
  const source = readFileSync(new URL('./exercise.js', import.meta.url), 'utf8');
  assert.ok(source.includes('createReadStream'), 'phải đọc bằng fs.createReadStream');
  assert.ok(source.includes('createInterface'), 'phải dùng readline.createInterface để đọc từng dòng');
  assert.ok(!/readFileSync|readFile\(/.test(source), 'không dùng readFile/readFileSync: bài này tập stream');
});

test('ví dụ trong đề: bỏ qua dòng hỏng và total không phải số', { timeout: 5000 }, async () => {
  const filePath = writeLines('sample.jsonl', [
    '{"id":1,"status":"paid","total":350000}',
    '{"id":2,"status":"paid","total":120000}',
    'dòng hỏng do export lỗi',
    '{"id":3,"status":"paid","total":"abc"}',
  ]);
  assert.deepEqual(await sumRevenueFromJsonl(filePath), { revenue: 470000, orderCount: 2, badLines: 2 });
});

test('dòng trống không tính là dòng hỏng; file rỗng trả toàn 0', { timeout: 5000 }, async () => {
  const withBlank = writeLines('blank.jsonl', ['{"id":1,"total":100}', '', '   ', '{"id":2,"total":200}', '']);
  assert.deepEqual(await sumRevenueFromJsonl(withBlank), { revenue: 300, orderCount: 2, badLines: 0 });
  const empty = writeLines('empty.jsonl', []);
  assert.deepEqual(await sumRevenueFromJsonl(empty), { revenue: 0, orderCount: 0, badLines: 0 });
});

test('thiếu total, total null hoặc JSON không phải object đều là dòng hỏng', { timeout: 5000 }, async () => {
  const filePath = writeLines('edge.jsonl', ['{"id":1}', '{"id":2,"total":null}', '42', 'null', '{"id":3,"total":500}']);
  assert.deepEqual(await sumRevenueFromJsonl(filePath), { revenue: 500, orderCount: 1, badLines: 4 });
});

test('file lớn vài nghìn dòng (xuống dòng kiểu Windows \\r\\n)', { timeout: 5000 }, async () => {
  const lines = [];
  let expected = 0;
  for (let i = 1; i <= 5000; i += 1) {
    if (i % 100 === 0) {
      lines.push(`{"id":${i},"total":`); // dòng bị cắt ngang
    } else {
      lines.push(JSON.stringify({ id: i, status: 'paid', total: i * 1000 }));
      expected += i * 1000;
    }
  }
  const filePath = join(dir, 'big.jsonl');
  writeFileSync(filePath, lines.join('\r\n'));
  assert.deepEqual(await sumRevenueFromJsonl(filePath), { revenue: expected, orderCount: 4950, badLines: 50 });
});

test('file không tồn tại thì reject ENOENT', { timeout: 5000 }, async () => {
  await assert.rejects(() => sumRevenueFromJsonl(join(dir, 'missing.jsonl')), { code: 'ENOENT' });
});
