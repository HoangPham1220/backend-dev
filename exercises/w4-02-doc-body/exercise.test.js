import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readJsonBody } from './exercise.js';

const LIMIT = 100;
let server;
let port;
let lastReturnValue;

before(async () => {
  server = http.createServer(async (req, res) => {
    const send = (status, body) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    try {
      lastReturnValue = readJsonBody(req, { limit: LIMIT });
      const body = await lastReturnValue;
      send(200, { received: body === undefined ? '__undefined__' : body });
    } catch (err) {
      send(err?.status ?? 500, { error: String(err?.message ?? err) });
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  port = server.address().port;
});

after(() => {
  server.closeAllConnections();
  server.close();
});

// Gửi body thành nhiều chunk, có nghỉ giữa các chunk, để mô phỏng mạng chậm.
function post(chunks) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port, method: 'POST', path: '/', headers: { 'Content-Type': 'application/json' } },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
      },
    );
    req.on('error', reject);
    req.setTimeout(2000, () => req.destroy(new Error('Server không trả lời: Promise có resolve/reject chưa?')));
    const list = Array.isArray(chunks) ? chunks : [chunks];
    let i = 0;
    const writeNext = () => {
      if (i >= list.length) return req.end();
      req.write(list[i++]);
      setTimeout(writeNext, 20);
    };
    writeNext();
  });
}

test('readJsonBody trả về một Promise', { timeout: 5000 }, async () => {
  await post('{}');
  assert.ok(lastReturnValue instanceof Promise, 'readJsonBody phải trả về Promise (return new Promise(...))');
});

test('JSON hợp lệ được parse thành object', { timeout: 5000 }, async () => {
  const res = await post('{"sku":"CAP","quantity":2}');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.received, { sku: 'CAP', quantity: 2 });
});

test('Body rỗng trả về {}', { timeout: 5000 }, async () => {
  const res = await post('');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.received, {}, 'body rỗng phải resolve {}, không phải lỗi JSON');
});

test('Body đến thành nhiều chunk vẫn được gom đủ', { timeout: 5000 }, async () => {
  const res = await post(['{"sku":', '"TSHIRT-M",', '"quantity":', '3}']);
  assert.equal(res.status, 200, 'chỉ parse khi đã nhận sự kiện "end", không parse từng chunk');
  assert.deepEqual(res.body.received, { sku: 'TSHIRT-M', quantity: 3 });
});

test('JSON hỏng: lỗi có status 400', { timeout: 5000 }, async () => {
  const res = await post('{"sku": CAP}');
  assert.equal(res.status, 400, 'lỗi JSON.parse phải được bọc thành Error có err.status = 400');
});

test('Vượt giới hạn byte: lỗi có status 413', { timeout: 5000 }, async () => {
  const res = await post(JSON.stringify({ note: 'x'.repeat(200) }));
  assert.equal(res.status, 413);
});

test('Giới hạn tính theo byte, không theo số ký tự', { timeout: 5000 }, async () => {
  // 40 ký tự 'ệ' = 120 byte UTF-8 (+ dấu ngoặc) > 100, dù chỉ ~50 ký tự.
  const body = JSON.stringify({ n: 'ệ'.repeat(40) });
  assert.ok(body.length < LIMIT && Buffer.byteLength(body) > LIMIT);
  const res = await post(body);
  assert.equal(res.status, 413, 'đếm byte bằng chunk.length (Buffer), không dùng string.length');
});

test('Đúng bằng giới hạn vẫn hợp lệ', { timeout: 5000 }, async () => {
  const body = JSON.stringify({ n: 'x'.repeat(LIMIT - 8) });
  assert.equal(Buffer.byteLength(body), LIMIT);
  const res = await post(body);
  assert.equal(res.status, 200, 'chỉ lỗi khi VƯỢT limit (>), bằng limit vẫn OK');
  assert.deepEqual(res.body.received, JSON.parse(body));
});
