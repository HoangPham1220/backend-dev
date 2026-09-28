import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createCsvTransform, createLineCounter, exportOrdersCsv } from './exercise.js';

function collector() {
  const chunks = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(chunk.toString());
      callback();
    },
  });
  stream.text = () => chunks.join('');
  return stream;
}

test('csv transform: header, escape dấu phẩy, ngoặc kép, xuống dòng, ô rỗng', { timeout: 5000 }, async () => {
  const out = collector();
  await pipeline(
    Readable.from([
      { id: 1, customer: 'Nguyễn, Văn A', note: 'Giao "gấp"' },
      { id: 2, customer: 'Trần B', note: 'Tầng 3\nPhòng 5' },
      { id: 3, customer: null, note: undefined },
      { id: 4, customer: 'Lê C', note: 0 },
    ]),
    createCsvTransform(['id', 'customer', 'note']),
    out,
  );
  assert.equal(
    out.text(),
    'id,customer,note\n' +
      '1,"Nguyễn, Văn A","Giao ""gấp"""\n' +
      '2,Trần B,"Tầng 3\nPhòng 5"\n' +
      '3,,\n' +
      '4,Lê C,0\n',
  );
});

test('csv transform: không có dòng nào vẫn ra header', { timeout: 5000 }, async () => {
  const out = collector();
  await pipeline(Readable.from([]), createCsvTransform(['id', 'total']), out);
  assert.equal(out.text(), 'id,total\n');
});

test('line counter: cho dữ liệu đi qua nguyên vẹn và đếm đúng qua ranh giới chunk', { timeout: 5000 }, async () => {
  const counter = createLineCounter();
  const out = collector();
  await pipeline(Readable.from(['a,b\nc,', 'd\n', 'e\nf\ng', '', '\n']), counter, out);
  assert.equal(out.text(), 'a,b\nc,d\ne\nf\ng\n');
  assert.equal(counter.count, 5);
});

test('exportOrdersCsv: nội dung đúng và trả số dòng dữ liệu', { timeout: 5000 }, async () => {
  async function* orders() {
    yield { id: 1, customer: 'An', total: 150000, status: 'paid' };
    yield { id: 2, customer: 'Bình, Hà Nội', total: 99000, status: 'pending' };
    yield { id: 3, customer: 'Chi', total: 0, status: 'cancelled' };
  }
  const out = collector();
  const rows = await exportOrdersCsv(orders(), out);
  assert.equal(rows, 3);
  assert.equal(
    out.text(),
    'id,customer,total,status\n1,An,150000,paid\n2,"Bình, Hà Nội",99000,pending\n3,Chi,0,cancelled\n',
  );
});

test('exportOrdersCsv: tôn trọng backpressure khi nơi nhận chậm (50.000 đơn)', { timeout: 30000 }, async () => {
  let produced = 0;
  let written = 0;
  let maxLag = 0;
  async function* orders() {
    for (let i = 1; i <= 50_000; i += 1) {
      produced += 1;
      yield { id: i, customer: `Khách ${i}`, total: i * 1000, status: 'paid' };
    }
  }
  const slow = new Writable({
    highWaterMark: 16,
    write(chunk, _encoding, callback) {
      written += chunk.toString().split('\n').length - 1;
      maxLag = Math.max(maxLag, produced - written);
      setImmediate(callback);
    },
  });
  const rows = await exportOrdersCsv(orders(), slow);
  assert.equal(rows, 50_000);
  assert.equal(written, 50_001, 'header + 50.000 dòng');
  assert.ok(
    maxLag < 20_000,
    `có lúc ${maxLag} đơn đã đọc mà chưa ghi: dữ liệu đang dồn trong bộ nhớ, backpressure không hoạt động`,
  );
});

test('exportOrdersCsv: nguồn lỗi giữa chừng thì reject và hủy stream đích', { timeout: 5000 }, async () => {
  async function* broken() {
    yield { id: 1, customer: 'An', total: 1, status: 'paid' };
    throw new Error('Mất kết nối database');
  }
  const out = collector();
  await assert.rejects(exportOrdersCsv(broken(), out), { message: 'Mất kết nối database' });
  assert.equal(out.destroyed, true, 'stream đích phải bị hủy để không để lại file dở dang mà tưởng là xong');
});
